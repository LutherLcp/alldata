import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllDataTracker } from '../src/index';

describe('AllDataTracker SDK', () => {
  let tracker: AllDataTracker;
  const mockServerUrl = 'https://analytics.example.com/api/tracking/collect';

  beforeEach(() => {
    localStorage.clear();
    document.title = 'Test Page';
    tracker = new AllDataTracker();

    // Mock fetch & sendBeacon
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    if (!navigator.sendBeacon) {
      (navigator as any).sendBeacon = vi.fn().mockReturnValue(true);
    } else {
      vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);
    }
  });

  it('init() 能够正常初始化并持久化生成 anonymousId', () => {
    tracker.init({
      projectId: 1,
      serverUrl: mockServerUrl,
      autoTrack: false,
    });

    const aid = tracker.getAnonymousId();
    expect(aid).toBeDefined();
    expect(aid.length).toBeGreaterThan(10);
    expect(tracker.getDistinctId()).toBe(aid);
  });

  it('identify() 能够绑定用户并在后续事件中使用 userId', () => {
    tracker.init({
      projectId: 1,
      serverUrl: mockServerUrl,
      autoTrack: false,
    });

    tracker.identify('user_999');
    expect(tracker.getDistinctId()).toBe('user_999');
  });

  it('reset() 能够清除当前登录用户并重置 anonymousId', () => {
    tracker.init({
      projectId: 1,
      serverUrl: mockServerUrl,
      autoTrack: false,
    });

    tracker.identify('user_999');
    const oldAid = tracker.getAnonymousId();

    tracker.reset();
    expect(tracker.getDistinctId()).not.toBe('user_999');
    expect(tracker.getAnonymousId()).not.toBe(oldAid);
  });

  it('track() 能够正确将自定义事件入队并通过 flush() 上报', async () => {
    tracker.init({
      projectId: 1,
      serverUrl: mockServerUrl,
      autoTrack: false,
    });

    tracker.track('button_click', { button_name: 'signup' });
    await tracker.flush();

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = (navigator.sendBeacon as any).mock.calls[0];
    expect(url).toBe(mockServerUrl);
    expect(blob).toBeInstanceOf(Blob);
  });
});
