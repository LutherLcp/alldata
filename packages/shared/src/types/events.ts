// Event tracking types
export interface BaseEvent {
  eventId: string;
  eventName: string;
  timestamp: number;
  userId?: string;
  anonymousId?: string;
  sessionId: string;
  properties: Record<string, unknown>;
  context: EventContext;
}

export interface EventContext {
  page?: PageContext;
  user?: UserContext;
  device?: DeviceContext;
  app?: AppContext;
  network?: NetworkContext;
  location?: LocationContext;
  utm?: UtmContext;
  referrer?: ReferrerContext;
}

export interface PageContext {
  url: string;
  path: string;
  title: string;
  referrer?: string;
  search?: string;
}

export interface UserContext {
  userId?: string;
  anonymousId?: string;
  traits?: Record<string, unknown>;
  groups?: Record<string, unknown>;
}

export interface DeviceContext {
  type: 'desktop' | 'mobile' | 'tablet' | 'tv' | 'other';
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  isMobile: boolean;
  isTouch: boolean;
}

export interface AppContext {
  name: string;
  version: string;
  build?: string;
  namespace?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface NetworkContext {
  ip?: string;
  carrier?: string;
  connectionType?: string;
  isProxy?: boolean;
}

export interface LocationContext {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface UtmContext {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface ReferrerContext {
  url?: string;
  medium?: string;
  source?: string;
  searchTerm?: string;
}

// Event definitions
export interface PageViewEvent extends BaseEvent {
  eventName: 'page_view';
  properties: {
    pagePath: string;
    pageTitle: string;
    pageUrl: string;
    referrer?: string;
    duration?: number;
  };
}

export interface ClickEvent extends BaseEvent {
  eventName: 'click';
  properties: {
    elementId?: string;
    elementClass?: string;
    elementTag?: string;
    elementText?: string;
    xpath?: string;
    selector?: string;
    position?: { x: number; y: number };
    href?: string;
  };
}

export interface FormSubmitEvent extends BaseEvent {
  eventName: 'form_submit';
  properties: {
    formId?: string;
    formName?: string;
    formAction?: string;
    fields: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
  };
}

export interface CustomEvent extends BaseEvent {
  eventName: string;
  properties: Record<string, unknown>;
}

export type TrackEvent = PageViewEvent | ClickEvent | FormSubmitEvent | CustomEvent;

// Event schema for validation
export interface EventSchema {
  eventName: string;
  displayName: string;
  description: string;
  category: string;
  properties: EventPropertySchema[];
  requiredProperties: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EventPropertySchema {
  name: string;
  displayName: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  required: boolean;
  enum?: string[];
  example?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Session
export interface Session {
  sessionId: string;
  userId?: string;
  anonymousId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  events: number;
  entryPage: string;
  exitPage?: string;
  referrer?: string;
  utm?: UtmContext;
  device: DeviceContext;
  location?: LocationContext;
  status: 'active' | 'ended' | 'expired';
}

// User profile
export interface UserProfile {
  userId: string;
  anonymousId?: string;
  traits: Record<string, unknown>;
  firstSeen: number;
  lastSeen: number;
  sessionCount: number;
  eventCount: number;
  totalDuration: number;
  tags: string[];
  segments: string[];
  computedTraits: Record<string, unknown>;
}