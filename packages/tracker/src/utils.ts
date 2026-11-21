import type { PresetProperties } from './types';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // 忽略安全沙箱或隐私模式报错
  }
  return null;
}

export function setStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}

export function parseUTMParams(urlStr: string): Record<string, string> {
  const utms: Record<string, string> = {};
  try {
    const url = new URL(urlStr);
    const params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    for (const p of params) {
      const val = url.searchParams.get(p);
      if (val) {
        utms[`$${p}`] = val;
      }
    }
  } catch {
    // invalid url
  }
  return utms;
}

export function parseOSAndBrowser(ua: string): { os: string; browser: string } {
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/MSIE|Trident/i.test(ua)) browser = 'IE';

  return { os, browser };
}

export function getPresetProperties(): PresetProperties {
  if (typeof window === 'undefined') return {};

  const ua = navigator.userAgent || '';
  const { os, browser } = parseOSAndBrowser(ua);
  const utms = parseUTMParams(window.location.href);

  return {
    $os: os,
    $browser: browser,
    $screen_width: window.screen ? window.screen.width : 0,
    $screen_height: window.screen ? window.screen.height : 0,
    $url: window.location.href,
    $title: document.title || '',
    $referrer: document.referrer || '',
    ...utms,
  };
}
