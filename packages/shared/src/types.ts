/**
 * Shared TypeScript types for Heimdall Dashboard Framework.
 * Matches data-model.md entity definitions.
 */

/** CSS display mode mapping for image component */
export type DisplayMode = 'contain' | 'cover' | 'stretch' | 'center';

/** Overlay visibility options per view */
export type OverlayMode = 'both' | 'clock' | 'weather' | 'none';

/** View cycling order */
export type ViewOrder = 'sequential' | 'random';

/** Configuration for the image component */
export interface ImageSettings {
  /** Image source — local path (relative to assets dir) or network URL */
  src: string;
  /** Display mode — defaults to "contain" */
  displayMode?: DisplayMode;
}

/** Weather API configuration */
export interface WeatherConfig {
  /** OpenWeatherMap API key */
  apiKey: string;
  /** City name for weather lookup */
  city: string;
  /** Units: "metric" (°C) or "imperial" (°F). Defaults to "metric". */
  units?: 'metric' | 'imperial';
  /** Refresh interval in minutes. Defaults to 15. */
  refreshInterval?: number;
}

/** A single view in the dashboard rotation */
export interface ViewEntry {
  /** Component type identifier (e.g., "image") */
  type: string;
  /** Component-specific configuration */
  settings?: Record<string, unknown>;
  /** Which overlay elements to show on this view. Defaults to "both". */
  overlay?: OverlayMode;
}

/** Top-level dashboard configuration */
export interface DashboardConfig {
  /** Seconds between view transitions. Defaults to 30. Must be > 0. */
  cycleInterval?: number;
  /** View cycling order. Defaults to "sequential". */
  viewOrder?: ViewOrder;
  /** Ordered list of views to display */
  views: ViewEntry[];
  /** Weather configuration (required for weather overlay) */
  weather?: WeatherConfig;
  /** Show fullscreen toggle button in overlay */
  showFullscreenButton?: boolean;
}

/** A calendar source (iCal URL) */
export interface CalendarSource {
  /** Display name for this calendar */
  name: string;
  /** iCal/ICS URL to fetch events from */
  url: string;
  /** Color for this calendar's events (CSS color) */
  color?: string;
}

/** A parsed calendar event (returned by server API) */
export interface CalendarEvent {
  /** Event unique ID */
  id: string;
  /** Event title/summary */
  title: string;
  /** Start time as ISO string */
  start: string;
  /** End time as ISO string */
  end: string;
  /** Whether this is an all-day event */
  allDay: boolean;
  /** Calendar source name */
  calendar: string;
  /** Calendar color */
  color: string;
  /** Optional location */
  location?: string;
}

/** A photo entry returned by the photos API */
export interface PhotoEntry {
  /** Unique identifier (file path hash) */
  id: string;
  /** URL to serve the photo */
  url: string;
  /** Original filename */
  filename: string;
  /** Date the photo was taken (from EXIF or file mtime), ISO string */
  dateTaken: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
}

/** Photos API response for memories */
export interface MemoriesResponse {
  /** Map of "N years ago" → photos */
  memories: Record<string, PhotoEntry[]>;
}

/** Photos API response for random */
export interface RandomPhotoResponse {
  photo: PhotoEntry | null;
}

/** Props passed to every view component */
export interface ComponentProps {
  /** Component-specific settings from config */
  settings: Record<string, unknown>;
}

// --- Type guards and defaults ---

export const DEFAULT_CYCLE_INTERVAL = 30;
export const DEFAULT_DISPLAY_MODE: DisplayMode = 'contain';
export const DEFAULT_OVERLAY_MODE: OverlayMode = 'both';
export const VALID_DISPLAY_MODES: readonly DisplayMode[] = [
  'contain',
  'cover',
  'stretch',
  'center',
] as const;
export const VALID_OVERLAY_MODES: readonly OverlayMode[] = [
  'both',
  'clock',
  'weather',
  'none',
] as const;
export const DEFAULT_VIEW_ORDER: ViewOrder = 'sequential';
export const VALID_VIEW_ORDERS: readonly ViewOrder[] = [
  'sequential',
  'random',
] as const;

/** Map display mode config value to CSS object-fit */
export const DISPLAY_MODE_CSS: Record<DisplayMode, string> = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'fill',
  center: 'none',
};

/** Check if a value is a valid DisplayMode */
export function isValidDisplayMode(value: unknown): value is DisplayMode {
  return (
    typeof value === 'string' &&
    VALID_DISPLAY_MODES.includes(value as DisplayMode)
  );
}

/** Normalize cycle interval — apply default if missing/invalid */
export function normalizeCycleInterval(value: unknown): number {
  if (typeof value === 'number' && value > 0) {
    return value;
  }
  return DEFAULT_CYCLE_INTERVAL;
}

/** Normalize display mode — apply default if missing/invalid */
export function normalizeDisplayMode(value: unknown): DisplayMode {
  if (isValidDisplayMode(value)) {
    return value;
  }
  return DEFAULT_DISPLAY_MODE;
}

/** Check if a value is a valid OverlayMode */
export function isValidOverlayMode(value: unknown): value is OverlayMode {
  return (
    typeof value === 'string' &&
    VALID_OVERLAY_MODES.includes(value as OverlayMode)
  );
}

/** Normalize overlay mode — apply default if missing/invalid */
export function normalizeOverlayMode(value: unknown): OverlayMode {
  if (isValidOverlayMode(value)) {
    return value;
  }
  return DEFAULT_OVERLAY_MODE;
}

/** Check if a value is a valid ViewOrder */
export function isValidViewOrder(value: unknown): value is ViewOrder {
  return (
    typeof value === 'string' &&
    VALID_VIEW_ORDERS.includes(value as ViewOrder)
  );
}

/** Normalize view order — apply default if missing/invalid */
export function normalizeViewOrder(value: unknown): ViewOrder {
  if (isValidViewOrder(value)) {
    return value;
  }
  return DEFAULT_VIEW_ORDER;
}

/** Check if a value looks like a valid ViewEntry */
export function isValidViewEntry(value: unknown): value is ViewEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as ViewEntry).type === 'string' &&
    (value as ViewEntry).type.length > 0
  );
}

/** Check if a value looks like a valid DashboardConfig */
export function isValidDashboardConfig(
  value: unknown
): value is DashboardConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'views' in value &&
    Array.isArray((value as DashboardConfig).views)
  );
}
