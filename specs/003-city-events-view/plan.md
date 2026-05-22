# Implementation Plan: City Events View

**Branch**: `003-city-events-view` | **Date**: 2025-07-14 | **Spec**: `specs/003-city-events-view/spec.md`
**Input**: Feature specification from `specs/003-city-events-view/spec.md`

## Summary

Add a new city events dashboard view that scrapes rausgegangen.de server-side (CSRF cookie + `POST /api/v1/search`) and presents locally filtered event lists across three view types — `events-today`, `events-weekend`, and `events-upcoming` — with a daily refresh cycle, category whitelist filtering, and `skipIfEmpty` support. The server owns all data acquisition and caching; the dashboard renders read-only event cards with title, category, date, and venue.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (LTS)
**Primary Dependencies**: React 18, Fastify 4, existing monorepo shared package (`@heimdall/shared`); `node:http`/`fetch` for CSRF cookie acquisition and rausgegangen.de search; no new heavy npm dependency required
**Storage**: In-memory daily snapshot cache keyed by `city slug + view type`; persisted JSON snapshot file under project data directory for restart continuity
**Testing**: Vitest (unit/integration for scraper logic, date-window computation, category filtering, refresh logic, route behavior), Playwright (view-only rendering and empty/error states)
**Target Platform**: Local-network self-hosted dashboard (browser runtime + local Fastify server)
**Project Type**: Full-stack TypeScript monorepo feature addition (new provider + three view types + API route)
**Performance Goals**: Snapshot API response <200ms on local network; render 50+ event cards without frame drops on kiosk hardware
**Constraints**:
- UI must remain view-only (no search/filter/input controls)
- Data source is rausgegangen.de; no alternative source for v1
- `available-anytime` category excluded by default
- No event detail page scraping (images/full description) in v1
- Refresh cadence once per 24h with stale-data fallback on refresh failure
- Pagination handled server-side via offset until time window is covered (max ~50 events cap)
- Timezone fixed to Europe/Berlin
**Scale/Scope**: One dashboard instance, one city context at a time, up to ~50 events per view type displayed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Modular-First** | ✅ PASS | Adds one isolated events provider and three view type registrations without cross-view coupling. |
| **II. Configuration-Driven** | ✅ PASS | City slug, lat, lng, and category whitelist are all read from `config.json` under `providers.events`; no hardcoded locality. |
| **III. Dual-Mode Operation** | ✅ PASS | Uses existing Fastify API + React dashboard runtime path; no mode-specific logic introduced. |
| **IV. Local-Network-First** | ✅ PASS | Scraping and caching run locally on server; no cloud backend required beyond direct rausgegangen.de fetches. |
| **V. Simplicity (YAGNI)** | ✅ PASS | Scope constrained to three view types, one source, exact category filtering, no user interaction controls, no image scraping. |
| **VI. Human-Maintainable Code** | ✅ PASS | CSRF acquisition, search pagination, date windowing, and category filtering kept as small, individually testable units. |

**Technology Constraints check**:
- ✅ Node.js + TypeScript + React + Fastify + pnpm monorepo unchanged
- ✅ No new heavy runtime dependency; native fetch (Node 20+) + cookie parsing covers scraping needs
- ✅ Test coverage planned with Vitest/Playwright

**Gate Result (pre-research)**: PASS — no constitutional violations.

### Post-Phase 1 Gate Re-check

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Modular-First** | ✅ PASS | Data model and contracts isolate events logic in dedicated service subtree and view components; no shared state with other views. |
| **II. Configuration-Driven** | ✅ PASS | Contract and quickstart show all provider and view settings resolved from `config.json`. |
| **III. Dual-Mode Operation** | ✅ PASS | No Electron-only or browser-only branch; snapshot API is mode-agnostic. |
| **IV. Local-Network-First** | ✅ PASS | Snapshot cache + stale fallback keep the view functional during upstream failures. |
| **V. Simplicity (YAGNI)** | ✅ PASS | No write endpoints, no user interaction, no multi-city fanout, no real-time event detail enrichment. |
| **VI. Human-Maintainable Code** | ✅ PASS | Explicit entity model, deterministic date-window logic, and testable scraper contract minimise hidden behaviour. |

**Gate Result (post-design)**: PASS — design remains constitution-compliant.

## Project Structure

### Documentation (this feature)

```text
specs/003-city-events-view/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions and trade-offs
├── data-model.md        # Phase 1 output — entities + validation/state model
├── quickstart.md        # Phase 1 output — setup and verification flow
├── contracts/
│   └── api.md           # Phase 1 output — events API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   └── src/types.ts                                   # Add EventsProviderConfig + EventRecord + EventsViewSnapshot types
├── server/
│   ├── src/
│   │   ├── config.ts                                  # Parse/validate providers.events config block
│   │   ├── index.ts                                   # Register events route + scheduler bootstrap
│   │   ├── services/events/
│   │   │   ├── rausgegangen.ts                        # CSRF cookie acquisition + POST /api/v1/search adapter
│   │   │   ├── dateWindows.ts                         # today / weekend / upcoming(N) date range helpers
│   │   │   ├── filterEvents.ts                        # Category whitelist + available-anytime exclusion
│   │   │   ├── paginateFetch.ts                       # Offset-based pagination loop until window covered
│   │   │   ├── refreshDailySnapshot.ts                # Daily refresh orchestration + stale fallback
│   │   │   └── snapshotStore.ts                       # In-memory + persisted snapshot read/write
│   │   └── routes/events.ts                           # GET snapshot + health endpoints
│   └── tests/
│       ├── eventsDateWindows.test.ts
│       ├── eventsFilter.test.ts
│       ├── eventsRausgegangen.test.ts
│       ├── eventsRefresh.test.ts
│       └── eventsRoute.test.ts
└── dashboard/
    ├── src/components/views/events/
    │   ├── EventsTodayView.tsx                        # events-today renderer
    │   ├── EventsWeekendView.tsx                      # events-weekend renderer
    │   ├── EventsUpcomingView.tsx                     # events-upcoming renderer
    │   ├── EventCard.tsx                              # Shared event card (title, category, date, venue)
    │   ├── useEventsSnapshot.ts                       # Snapshot fetch hook
    │   └── Events.module.css                          # Card list + empty/error/stale states
    ├── src/components/registry.ts                     # Register three view types
    └── tests/unit/EventsViews.test.tsx
```

**Structure Decision**: Reuse existing `shared` + `server` + `dashboard` package split. Add events domain logic as a dedicated service subtree in `packages/server/src/services/events` with a single scraper adapter for rausgegangen.de, mirroring the `services/supermarket` precedent set by feature 002.

## Complexity Tracking

No violations. All decisions stay within constitutional simplicity and modularity constraints.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |
