/** Internal settings injected by the view cycle into every active view's settings object. */
export interface ViewInternalSettings {
  /** Saved component state from a previous mount at this history position (e.g. which item was shown). */
  __savedState?: ViewSavedState;
  /** Called by the view to persist component state for back-navigation restore. */
  __onStateChange?: (state: ViewSavedState) => void;
  /** Called by the view when it has no content to display; triggers an automatic skip if skipIfEmpty is set. */
  __onEmpty?: () => void;
}

// ---------------------------------------------------------------------------
// Discriminated union of per-view saved state shapes.
// Each member's `__view` tag must match the corresponding view's type string.
// ---------------------------------------------------------------------------

export type EventsShowcaseSavedState = {
  readonly __view: 'events-today' | 'events-upcoming';
  activeIndex: number;
};

export type EventsWeekendSavedState = {
  readonly __view: 'events-weekend';
  bgImageUrl: string | undefined;
};

export type PhotosMemoriesSavedState = {
  readonly __view: 'photos-memories';
  label: string;
  photo: import('@heimdall/shared').PhotoEntry;
};

export type PhotosRandomSavedState = {
  readonly __view: 'photos-random';
  photo: import('@heimdall/shared').PhotoEntry;
};

export type ClockSavedState = {
  readonly __view: 'clock';
  photo: import('@heimdall/shared').PhotoEntry;
};

export type ConcertsShowcaseSavedState = {
  readonly __view: 'concerts-upcoming';
  __lastConcertId?: string;
  __lastRotation?: number;
};

/** Discriminated union of all per-view saved states. Add a new member for each stateful view. */
export type ViewSavedState =
  | EventsShowcaseSavedState
  | EventsWeekendSavedState
  | PhotosMemoriesSavedState
  | PhotosRandomSavedState
  | ClockSavedState
  | ConcertsShowcaseSavedState;
