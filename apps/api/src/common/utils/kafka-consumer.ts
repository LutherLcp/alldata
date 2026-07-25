/**
 * Kafka 事件消费者 — 埋点数据异步消费
 * 
 * 流程: 埋点数据 → Kafka → Consumer → 批量写入 ClickHouse
 * 配置: 1000条/5秒 批量写入
 */

interface KafkaConfig {
  brokers: string[];
  groupId: string;
  topic: string;
  batchSize: number;
  batchInterval: number;
}

const DEFAULT_CONFIG: KafkaConfig = {
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  groupId: process.env.KAFKA_GROUP_ID || 'alldata-events',
  topic: process.env.KAFKA_TOPIC || 'tracking-events',
  batchSize: 1000,
  batchInterval: 5000, // 5秒
};

export interface TrackingEvent {
  project_id: number;
  event_name: string;
  user_id?: string;
  session_id?: string;
  properties: Record<string, any>;
  timestamp: Date;
  created_at: Date;
}

/**
 * 事件批量写入器
 */
export class EventBatchWriter {
  private buffer: TrackingEvent[] = [];
  private timer: NodeJS.Timeout | null = null;
  private config: KafkaConfig;
  private clickhouse: any;

  constructor(config: Partial<KafkaConfig> = {}, clickhouse?: any) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clickhouse = clickhouse;
    this.startFlushTimer();
  }

  /**
   * 添加事件到缓冲区
   */
  addEvent(event: TrackingEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * 批量添加事件
   */
  addEvents(events: TrackingEvent[]): void {
    this.buffer.push(...events);
    if (this.buffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * 立即刷新缓冲区
   */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;

    const batch = this.buffer.splice(0, this.config.batchSize);
    
    try {
      if (this.clickhouse) {
        await this.writeToClickHouse(batch);
      } else {
        console.log(`[EventBatchWriter] Would write ${batch.length} events to ClickHouse`);
      }
      return batch.length;
    } catch (error) {
      console.error('[EventBatchWriter] Flush failed:', error);
      // 重新放回缓冲区
      this.buffer.unshift(...batch);
      return 0;
    }
  }

  /**
   * 写入 ClickHouse
   */
  private async writeToClickHouse(events: TrackingEvent[]): Promise<void> {
    if (!this.clickhouse) return;

    const values = events.map(e => [
      e.project_id,
      e.event_name,
      e.user_id || null,
      e.session_id || null,
      JSON.stringify(e.properties),
      e.timestamp,
      e.created_at,
    ]);

    await this.clickhouse.query(`
      INSERT INTO tracking_events 
      (project_id, event_name, user_id, session_id, properties, timestamp, created_at)
      VALUES
    `).write(values).exec();
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.config.batchInterval);
  }

  /**
   * 停止定时刷新
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(); // 最后一次刷新
  }

  /**
   * 获取缓冲区大小
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

/**
 * Kafka 消费者模拟器
 */
export class KafkaEventConsumer {
  private writer: EventBatchWriter;
  private running = false;

  constructor(writer: EventBatchWriter) {
    this.writer = writer;
  }

  /**
   * 启动消费者
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    console.log('[KafkaEventConsumer] Started');
    
    // 模拟从 Kafka 消费消息
    // 实际实现需要 kafka-node 或 kafkajs
  }

  /**
   * 停止消费者
   */
  async stop(): Promise<void> {
    this.running = false;
    this.writer.stop();
    console.log('[KafkaEventConsumer] Stopped');
  }

  /**
   * 模拟接收事件（测试用）
   */
  simulateEvent(event: TrackingEvent): void {
    this.writer.addEvent(event);
  }
}

// 单例导出
let batchWriter: EventBatchWriter | null = null;

export function getEventBatchWriter(clickhouse?: any): EventBatchWriter {
  if (!batchWriter) {
    batchWriter = new EventBatchWriter({}, clickhouse);
  }
  return batchWriter;
}
