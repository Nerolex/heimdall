# Tasks: City Events View

**Feature**: `003-city-events-view` | **Branch**: `003-city-events-view`
**Input**: `specs/003-city-events-view/` — spec.md, plan.md, research.md, data-model.md, contracts/api.md, quickstart.md
**Total tasks**: 25 | **User stories**: 3 (P1 → P2 → P3)

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]** — Parallelizable (independent file, no incomplete dependency)
- **[US1/2/3]** — Maps to user story phase

---

## Phase 1: Setup

**Purpose**: Add shared types and server config parsing. Must complete before any service or component work begins.

- [ ] T001 Add `EventsProviderConfig`, `EventsViewSettings`, `RawEventRecord`, `EventRecord`, `EventsViewSnapshot`, and `RefreshStatus` interfaces to `packages/shared/src/types.ts`; extend `DashboardConfig` with `providers?: { events?: EventsProviderConfig }` (new top-level `providers` key alongside existing `weather`, `calendar`, etc.)
- [ ] T002 Parse and validate `providers.events` in `packages/server/src/config.ts`: require non-empty `city` string, validate `lat` within [-90, 90] and `lng` within [-180, 180], default `categories` to `[]`, strip `available-anytime` from `categories` at normalisation time (FR-011, data-model.md validation rules)

**Checkpoint**: Shared types compiled; server config parses and rejects invalid events provider blocks.

---

## Phase 2: Foundational

**Purpose**: Shared server-side services, snapshot infrastructure, API routes, and reusable dashboard components. All three user stories depend on this phase.

**⚠️ CRITICAL**: No user story view can be tested end-to-end until this phase is complete.

- [ ] T003 [P] Implement `dateWindows.ts`: export `getTodayWindow()`, `getWeekendWindow()`, and `getUpcomingWindow(days: number)` returning `{ windowStart: string, windowEnd: string }` in `YYYY-MM-DD` format using `Intl.DateTimeFormat` with `Europe/Berlin` timezone — today = single date; weekend = next Sat+Sun (if today is Sat: [today, tomorrow]; if Sun: [today, today]); upcoming = [today, today + (days-1)]; default days=7 (research.md R1) in `packages/server/src/services/events/dateWindows.ts`
- [ ] T004 [P] Implement `rausgegangen.ts`: export `fetchCsrfCookie(city: string): Promise<string>` (GET `https://rausgegangen.de/{city}`, extract `Set-Cookie` session/CSRF cookie value) and `searchEvents(cookie: string, csrfToken: string, city: string, lat: number, lng: number, date: string, limit: number, offset: number): Promise<RawEventRecord[]>` (POST `https://rausgegangen.de/api/v1/search` with `Cookie`, `X-CSRF-Token`, and JSON body); map response fields `id`, `title`, `category_slug → categorySlug`, `date`, `description`, `additional_infos → additionalInfos`, `slug`; throw a typed error (not crash) when city returns 404 or network fails (research.md R0, contracts/api.md Scraper Flow) in `packages/server/src/services/events/rausgegangen.ts`
- [ ] T005 [P] Implement `filterEvents.ts`: export `filterByWindow(events: RawEventRecord[], windowStart: string, windowEnd: string): RawEventRecord[]` (discard events outside window) and `filterByCategory(events: RawEventRecord[], categories: string[]): RawEventRecord[]` (empty whitelist = keep all; always exclude `available-anytime` unless explicitly listed; normalise both sides: lowercase + trim; sort ascending by `date`) in `packages/server/src/services/events/filterEvents.ts`
- [ ] T006 Implement `paginateFetch.ts`: export `paginateFetch(city: string, lat: number, lng: number, windowStart: string, windowEnd: string, cookie: string, csrfToken: string): Promise<RawEventRecord[]>` — loop `offset = 0, 10, 20…`; stop when last event on current page has `date > windowEnd` OR response is empty OR accumulated count ≥ 50; call `searchEvents` from `rausgegangen.ts` (T004) per page; return all collected events (research.md R2, FR-009) in `packages/server/src/services/events/paginateFetch.ts`
- [ ] T007 [P] Implement `snapshotStore.ts`: export `getSnapshot(viewType: string): EventsViewSnapshot | undefined`, `setSnapshot(viewType: string, snapshot: EventsViewSnapshot): void`, and `persistToDisk() / loadFromDisk()` for a JSON file at `data/events-snapshots.json` (or configurable path) — in-memory map keyed by `city+viewType`; disk write is best-effort (research.md R4, data-model.md EventsViewSnapshot) in `packages/server/src/services/events/snapshotStore.ts`
- [ ] T008 Implement `refreshDailySnapshot.ts`: export `refreshSnapshot(viewType: 'events-today' | 'events-weekend' | 'events-upcoming', config: EventsProviderConfig, days?: number): Promise<void>` — calls `fetchCsrfCookie` → `paginateFetch` → `filterByWindow` + `filterByCategory` → builds `EventRecord[]` (derive `categoryLabel`, `dateDisplay`, `venueAndTime` by splitting `description` on `" | "`, `detailUrl` from slug) → writes `EventsViewSnapshot` to store with `stale: false`; on any error, if prior snapshot exists set `stale: true` and preserve events, otherwise write error snapshot; export `bootstrapRefreshScheduler(config: EventsProviderConfig, activeViewTypes: string[], days?: number): void` that runs one immediate refresh per view type then repeats every 24 h via `setInterval` (research.md R4, data-model.md state transitions, FR-003/FR-010) in `packages/server/src/services/events/refreshDailySnapshot.ts`
- [ ] T009 Implement `routes/events.ts`: register `GET /api/events/snapshot` — validate `type` query param against allowed view types (400 for invalid, 422 for missing config, 404 when no snapshot exists, 200 with `EventsViewSnapshot` JSON otherwise); register `GET /api/events/health` — return `{ city, configuredCategories, viewTypes: RefreshStatus[] }` for all active view types (contracts/api.md) in `packages/server/src/routes/events.ts`
- [ ] T010 Bootstrap events route and refresh scheduler in `packages/server/src/index.ts`: read parsed `providers.events` config, determine active view types from `views[]` (filter for `events-today`, `events-weekend`, `events-upcoming`), call `bootstrapRefreshScheduler`, and register the events Fastify plugin from `routes/events.ts` — no-op gracefully when `providers.events` is absent (research.md R4, R5)
- [ ] T011 [P] Implement `useEventsSnapshot.ts`: React hook that fetches `GET /api/events/snapshot?type={viewType}` on mount, returns `{ snapshot: EventsViewSnapshot | null, status: 'loading' | 'ready' | 'empty' | 'error' | 'stale', error: string | null }` — derive `status` from response: 404 → `'error'`, `events.length === 0` → `'empty'`, `snapshot.stale === true` → `'stale'`, else `'ready'`; no polling (read from cache, data-model.md View Rendering States) in `packages/dashboard/src/components/views/events/useEventsSnapshot.ts`
- [ ] T012 [P] Implement `EventCard.tsx` rendering `title`, `categoryLabel` badge, `dateDisplay`, `venueAndTime` (fallback to `rawDescription` when null), and `recurrenceNote` when non-null (FR-006, FR-013); add `Events.module.css` with styles for `.eventCard`, `.cardList`, `.emptyState`, `.errorState`, `.staleBanner` (research.md R6) in `packages/dashboard/src/components/views/events/EventCard.tsx` and `packages/dashboard/src/components/views/events/Events.module.css`

**Checkpoint**: All three API endpoints work; snapshots refresh on server start; EventCard renders from fixture data.

---

## Phase 3: User Story 1 — Today's Events at a Glance (Priority: P1) 🎯 MVP

**Goal**: Deliver the `events-today` view showing filtered today's events with all four rendering states (ready / empty / error / stale) and `skipIfEmpty` support.

**Independent Test**: Configure `events-today` with a city + categories in `config.json`, run `pnpm dev`, hit `GET /api/events/snapshot?type=events-today`, confirm filtered today events appear in the dashboard. Verify empty state hides the view when `skipIfEmpty: true` (spec.md US1 Independent Test + Acceptance Scenarios 1–5).

- [ ] T013 [US1] Implement `EventsTodayView.tsx`: call `useEventsSnapshot('events-today')` → render `<EventCard>` list on `'ready'`/`'stale'` (with `<div className={styles.staleBanner}>` when stale), empty-state `<p>` with "No events today" on `'empty'` (call `settings.__onEmpty()` when `skipIfEmpty` is truthy), error-state `<p>` on `'error'`; read `skipIfEmpty` from `settings` prop (data-model.md `skipIfEmpty` integration, spec.md US1 AC3–5) in `packages/dashboard/src/components/views/events/EventsTodayView.tsx`
- [ ] T014 [US1] Register `events-today` view type in `packages/dashboard/src/components/registry.ts` by calling `registerComponent('events-today', EventsTodayView)`; ensure the import of `EventsTodayView` is added at the top of the file

**Checkpoint**: US1 fully functional — today's filtered events render correctly; `skipIfEmpty` hides the view when the event list is empty.

---

## Phase 4: User Story 2 — Weekend Events Planning (Priority: P2)

**Goal**: Deliver the `events-weekend` view showing events for the coming Saturday and Sunday, correctly handling the Saturday and Sunday edge cases.

**Independent Test**: Configure `events-weekend`, run on any weekday and confirm `windowStart`/`windowEnd` in the snapshot point to the coming Sat/Sun; run (or simulate) on a Saturday and confirm window is `[today, tomorrow]` (spec.md US2 Independent Test + AC1–4).

- [ ] T015 [P] [US2] Implement `EventsWeekendView.tsx`: identical render logic to `EventsTodayView` but calls `useEventsSnapshot('events-weekend')`; empty-state message "No weekend events"; call `settings.__onEmpty()` on empty+skipIfEmpty (spec.md US2) in `packages/dashboard/src/components/views/events/EventsWeekendView.tsx`
- [ ] T016 [US2] Register `events-weekend` view type in `packages/dashboard/src/components/registry.ts` by calling `registerComponent('events-weekend', EventsWeekendView)`

**Checkpoint**: US2 fully functional — weekend events display correctly across all days of the week; category filter respected.

---

## Phase 5: User Story 3 — Upcoming Events Over N Days (Priority: P3)

**Goal**: Deliver the `events-upcoming` view with a configurable `days` window, chronological ordering, and a sensible 7-day default.

**Independent Test**: Configure `events-upcoming` with `settings: { days: 7 }`, confirm snapshot spans exactly 7 days from today; set `days: 14` for a major city and confirm `totalFetched > 10` and pagination worked (spec.md US3 Independent Test + AC1–4, FR-008/FR-009).

- [ ] T017 [P] [US3] Implement `EventsUpcomingView.tsx`: call `useEventsSnapshot('events-upcoming')`; read `days` from `settings.days` (default `7`) and pass it to the snapshot hook as a URL parameter `?type=events-upcoming&days={days}`; update `useEventsSnapshot.ts` to accept optional `days` param and append to fetch URL when provided; empty-state message "No upcoming events"; call `settings.__onEmpty()` on empty+skipIfEmpty (spec.md US3 AC1–4, FR-008) in `packages/dashboard/src/components/views/events/EventsUpcomingView.tsx`
- [ ] T018 [US3] Register `events-upcoming` view type in `packages/dashboard/src/components/registry.ts` by calling `registerComponent('events-upcoming', EventsUpcomingView)`; also update `GET /api/events/snapshot` in `packages/server/src/routes/events.ts` to forward optional `days` query param to the snapshot lookup (so `events-upcoming` with `days=14` resolves to the correct pre-computed or on-demand window)

**Checkpoint**: US3 fully functional — rolling N-day window renders in chronological order; `days` defaults to 7; pagination collects >10 events when available.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Unit test coverage for all service modules and view components; config documentation.

- [ ] T019 [P] Write Vitest unit tests for `dateWindows.ts`: today window returns single-date pair; weekend window from Monday returns next Sat/Sun; weekend from Saturday returns `[today, tomorrow]`; weekend from Sunday returns `[today, today]`; upcoming with `days=1` returns single date; upcoming with `days=7` returns 7-day span; all dates formatted as `YYYY-MM-DD` in Europe/Berlin timezone in `packages/server/tests/eventsDateWindows.test.ts`
- [ ] T020 [P] Write Vitest unit tests for `filterEvents.ts`: window filter discards events outside range; category filter with empty whitelist keeps all except `available-anytime`; category filter with populated whitelist removes non-matching slugs; `available-anytime` always excluded unless explicitly listed; category comparison is case-insensitive; output is sorted ascending by date in `packages/server/tests/eventsFilter.test.ts`
- [ ] T021 [P] Write Vitest unit tests for `rausgegangen.ts` with mocked `fetch`: CSRF cookie correctly extracted from `Set-Cookie` header; search POST includes correct `Cookie` + `X-CSRF-Token` headers and JSON body; response fields correctly mapped to `RawEventRecord`; 404 on city GET throws typed error (does not crash); network failure throws typed error in `packages/server/tests/eventsRausgegangen.test.ts`
- [ ] T022 [P] Write Vitest unit tests for `refreshDailySnapshot.ts` with mocked scraper and store: successful refresh writes `stale: false` snapshot with correct `events` and `totalFetched`; scraper failure when prior snapshot exists sets `stale: true` and preserves prior events; scraper failure with no prior snapshot writes error snapshot; `bootstrapRefreshScheduler` calls refresh immediately then at 24 h intervals (spy on `setInterval`) in `packages/server/tests/eventsRefresh.test.ts`
- [ ] T023 [P] Write Vitest unit tests for `routes/events.ts`: `GET /api/events/snapshot?type=events-today` returns 200 with snapshot when available; returns 404 when no snapshot exists; returns 400 for invalid type; returns 422 when provider config is absent/invalid; `GET /api/events/health` returns 200 with `viewTypes` array containing `RefreshStatus` per active type in `packages/server/tests/eventsRoute.test.ts`
- [ ] T024 [P] Write Vitest unit tests for dashboard components: `EventCard` renders title, categoryLabel badge, dateDisplay, venueAndTime, recurrenceNote; omits venueAndTime and falls back to rawDescription when null; omits recurrenceNote when null; `EventsTodayView` renders card list on `'ready'` status; renders stale banner when `stale=true`; renders empty-state on `'empty'`; calls `settings.__onEmpty()` on empty when `skipIfEmpty=true`; renders error-state on `'error'` in `packages/dashboard/tests/unit/EventsViews.test.tsx`
- [ ] T025 Update `README.md` (or root docs) with an events configuration example block showing `providers.events` fields (`city`, `lat`, `lng`, `categories`) and all three view type entries with their settings (`skipIfEmpty`, `days`); document valid category slugs and where to find the city slug on rausgegangen.de (quickstart.md §1–2)

**Checkpoint**: All Vitest tests pass; config documentation covers the events provider setup end-to-end.

---

## Dependencies

```
T001 → T002 → T010
T003 ──────────────┐
T004 → T006 ───────┤
T005 ──────────────┤→ T008 → T009 → T010
T007 ──────────────┘
T011 ─┐
T012 ─┤→ T013 → T014  (US1)
      ├→ T015 → T016  (US2)
      └→ T017 → T018  (US3)
```

**User story completion order**: US1 (P1) → US2 (P2) → US3 (P3)
All three user stories share the same backend snapshot infrastructure (Phases 1–2) and dashboard hook + card component.

---

## Parallel Execution Examples

### Foundation Sprint (run all simultaneously after T001+T002)

```
Worker A: T003 (dateWindows.ts)
Worker B: T004 (rausgegangen.ts)
Worker C: T005 (filterEvents.ts)
Worker D: T007 (snapshotStore.ts)
Worker E: T011 (useEventsSnapshot.ts)
Worker F: T012 (EventCard.tsx + Events.module.css)
```

Then sequentially: T006 (paginateFetch, needs T004) → T008 (refreshDailySnapshot, needs T003/T006/T005/T007) → T009 (routes, needs T007/T008) → T010 (bootstrap, needs T002/T008/T009)

### User Story Sprint (after T010, T011, T012)

```
Worker A: T013 → T014  (US1 today view)
Worker B: T015 → T016  (US2 weekend view)
Worker C: T017 → T018  (US3 upcoming view)
```

### Polish Sprint (run all simultaneously after all story phases done)

```
Worker A: T019 (date windows tests)
Worker B: T020 (filter tests)
Worker C: T021 (scraper tests)
Worker D: T022 (refresh tests)
Worker E: T023 (route tests)
Worker F: T024 (component tests)
Worker G: T025 (README)
```

---

## Implementation Strategy

**MVP (US1 only — T001–T014)**: Delivers `events-today` with CSRF scraping, pagination, category filtering, daily refresh with stale fallback, and all four rendering states. Independently testable. Estimated 14 tasks.

**Full v1 (all phases — T001–T025)**: Adds `events-weekend` (T015–T016), `events-upcoming` (T017–T018), full test coverage (T019–T024), and documentation (T025). Additional 11 tasks.

**Suggested delivery order**: Phase 1 → Phase 2 → Phase 3 (MVP shippable) → Phase 4 → Phase 5 → Phase 6

---

## Format Validation

All 25 tasks follow the required checklist format:
- ✅ Every task starts with `- [ ]`
- ✅ Every task has a sequential ID (T001–T025)
- ✅ Parallelizable tasks are marked `[P]`
- ✅ User story phase tasks carry `[US1]`, `[US2]`, or `[US3]`
- ✅ Every task includes an exact file path from `plan.md` project structure
- ✅ Setup and Foundational phase tasks carry no story label
- ✅ Polish phase tasks carry no story label
