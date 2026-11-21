/**
 * AllData 官方 Web 埋点采集集成客户端
 * 基于 @alldata/tracker 封装，集成至 Web 平台实现平台自身的真实数据 Dogfooding
 */
import { tracker } from '@alldata/tracker';

let isInitialized = false;

export function initTracker(projectId = 1): void {
  if (isInitialized || typeof window === 'undefined') return;

  try {
    tracker.init({
      projectId,
      serverUrl: '/api/tracking/collect',
      autoTrack: true,
      debug: import.meta.env.DEV,
    });
    isInitialized = true;
  } catch (err) {
    console.warn('[AllData Web Tracker] Failed to initialize tracker:', err);
  }
}

export function identifyUser(userId: string | number): void {
  if (typeof window === 'undefined') return;
  try {
    tracker.identify(userId);
  } catch (err) {
    console.warn('[AllData Web Tracker] Failed to identify user:', err);
  }
}

export function resetUser(): void {
  if (typeof window === 'undefined') return;
  try {
    tracker.reset();
  } catch (err) {
    console.warn('[AllData Web Tracker] Failed to reset tracker:', err);
  }
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    tracker.track(name, props);
  } catch (err) {
    console.warn('[AllData Web Tracker] Failed to track event:', err);
  }
}

export { tracker };
export default tracker;
