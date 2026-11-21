import type { TrackerConfig, TrackingEvent } from './types';

export class Transport {
  private queue: TrackingEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private config: TrackerConfig;

  constructor(config: TrackerConfig) {
    this.config = config;
    if (typeof window !== 'undefined') {
      // 页面卸载前自动 flush
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  public enqueue(event: TrackingEvent): void {
    this.queue.push(event);

    const batchSize = this.config.batchSize ?? 10;
    if (this.queue.length >= batchSize) {
      this.flush();
    } else if (!this.timer) {
      const interval = this.config.batchIntervalMs ?? 2000;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flush();
      }, interval);
    }
  }

  public async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.queue.length);
    const payload = JSON.stringify({
      project_id: this.config.projectId,
      events: batch,
      sent_at: Date.now(),
    });

    if (this.config.debug) {
      console.log(`[AllDataTracker] Flushing ${batch.length} events:`, batch);
    }

    // 优先使用 sendBeacon（后台静默传输，页面关闭不中断）
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const success = navigator.sendBeacon(this.config.serverUrl, blob);
        if (success) return;
      } catch {
        // 降级使用 fetch
      }
    }

    // 降级使用 fetch
    if (typeof fetch !== 'undefined') {
      try {
        await fetch(this.config.serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Project-Id': String(this.config.projectId),
            ...(this.config.headers || {}),
          },
          body: payload,
          keepalive: true,
        });
      } catch (err) {
        if (this.config.debug) {
          console.error('[AllDataTracker] Report error:', err);
        }
      }
    }
  }
}
