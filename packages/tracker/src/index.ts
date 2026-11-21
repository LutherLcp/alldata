import { Transport } from './transport';
import type { TrackerConfig, TrackingEvent } from './types';
import { generateUUID, getPresetProperties, getStorage, setStorage } from './utils';

const ANONYMOUS_ID_KEY = '__alldata_aid';
const USER_ID_KEY = '__alldata_uid';

export class AllDataTracker {
  private config: TrackerConfig | null = null;
  private transport: Transport | null = null;
  private anonymousId = '';
  private userId: string | number | undefined;
  private commonProperties: Record<string, unknown> = {};
  private isInitialized = false;

  public init(config: TrackerConfig): void {
    this.config = config;
    this.transport = new Transport(config);

    // 获取或生成持久化 anonymousId
    let aid = getStorage(ANONYMOUS_ID_KEY);
    if (!aid) {
      aid = generateUUID();
      setStorage(ANONYMOUS_ID_KEY, aid);
    }
    this.anonymousId = aid;

    // 读取缓存的 userId
    const cachedUid = getStorage(USER_ID_KEY);
    if (cachedUid) {
      this.userId = cachedUid;
    }

    this.isInitialized = true;

    if (config.autoTrack !== false) {
      this.enableAutoTracking();
    }

    if (config.debug) {
      console.log('[AllDataTracker] Initialized with config:', config);
    }
  }

  /**
   * 设置公共属性（后续发送的所有事件都会带上）
   */
  public registerCommonProperties(props: Record<string, unknown>): void {
    this.commonProperties = { ...this.commonProperties, ...props };
  }

  /**
   * 登录绑定/身份识别（ID-Mapping）
   */
  public identify(userId: string | number): void {
    this.userId = userId;
    setStorage(USER_ID_KEY, String(userId));

    // 触发内部身份绑定事件
    this.track('$identify', {
      $original_id: this.anonymousId,
      $identified_id: String(userId),
    });
  }

  /**
   * 退出登录重置身份
   */
  public reset(): void {
    this.userId = undefined;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(USER_ID_KEY);
    }
    this.anonymousId = generateUUID();
    setStorage(ANONYMOUS_ID_KEY, this.anonymousId);
  }

  /**
   * 自定义事件埋点上报
   */
  public track(eventName: string, properties: Record<string, unknown> = {}): void {
    if (!this.isInitialized || !this.config || !this.transport) {
      console.warn('[AllDataTracker] Tracker not initialized. Call init() first.');
      return;
    }

    const preset = getPresetProperties();
    const event: TrackingEvent = {
      event_name: eventName,
      project_id: this.config.projectId,
      distinct_id: this.userId !== undefined ? String(this.userId) : this.anonymousId,
      anonymous_id: this.anonymousId,
      user_id: this.userId,
      event_time: Date.now(),
      properties: {
        ...preset,
        ...this.commonProperties,
        ...properties,
      },
    };

    this.transport.enqueue(event);
  }

  /**
   * 手动上报页面浏览事件
   */
  public pageview(properties: Record<string, unknown> = {}): void {
    this.track('$pageview', properties);
  }

  /**
   * 立即刷新发送队列
   */
  public flush(): Promise<void> {
    if (this.transport) {
      return this.transport.flush();
    }
    return Promise.resolve();
  }

  public getAnonymousId(): string {
    return this.anonymousId;
  }

  public getDistinctId(): string {
    return this.userId !== undefined ? String(this.userId) : this.anonymousId;
  }

  /**
   * 开启全埋点自动监听
   */
  private enableAutoTracking(): void {
    if (typeof window === 'undefined') return;

    // 1. 首次加载上报 $pageview
    this.pageview();

    // 2. SPA 单页路由变化监听 (History API + hashchange)
    const originalPushState = window.history.pushState;
    if (originalPushState) {
      window.history.pushState = (...args) => {
        originalPushState.apply(window.history, args);
        setTimeout(() => this.pageview(), 0);
      };
    }

    const originalReplaceState = window.history.replaceState;
    if (originalReplaceState) {
      window.history.replaceState = (...args) => {
        originalReplaceState.apply(window.history, args);
        setTimeout(() => this.pageview(), 0);
      };
    }

    window.addEventListener('popstate', () => this.pageview());
    window.addEventListener('hashchange', () => this.pageview());

    // 3. 全局点击事件 ($web_click)
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // 仅采集具有交互性的元素或带有 data-track 属性的元素
        const interactiveTag = ['BUTTON', 'A', 'INPUT'].includes(target.tagName);
        const hasTrackAttr = target.getAttribute('data-track') !== null;

        if (interactiveTag || hasTrackAttr) {
          const text = (target.innerText || target.getAttribute('value') || '').trim().slice(0, 50);
          const tagName = target.tagName.toLowerCase();
          const elementId = target.id || '';
          const className = typeof target.className === 'string' ? target.className : '';

          this.track('$web_click', {
            $element_type: tagName,
            $element_id: elementId,
            $element_class_name: className,
            $element_content: text,
            $element_href: target.getAttribute('href') || undefined,
          });
        }
      },
      true,
    );
  }
}

export const tracker = new AllDataTracker();
export default tracker;
