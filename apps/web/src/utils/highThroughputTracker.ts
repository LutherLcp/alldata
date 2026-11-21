/**
 * 前端高吞吐量埋点 SDK 适配层
 * 统一委托至基于 @alldata/tracker 的现代化埋点实现
 */
import { identifyUser, resetUser, trackEvent, tracker } from './tracker';

export interface EventData {
  event: string;
  distinct_id: string;
  timestamp?: number;
  properties?: Record<string, unknown>;
}

export class HighThroughputTracker {
  public track(eventName: string, properties: Record<string, unknown> = {}) {
    trackEvent(eventName, properties);
  }

  public identify(userId: string | number) {
    identifyUser(userId);
  }

  public reset() {
    resetUser();
  }

  public async flush() {
    await tracker.flush();
  }
}

export const highThroughputTracker = new HighThroughputTracker();
export { tracker };
export default tracker;
