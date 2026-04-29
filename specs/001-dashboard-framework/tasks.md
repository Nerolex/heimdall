# Tasks: Dashboard Framework

**Input**: Design documents from `/specs/001-dashboard-framework/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Tests**: Required — constitution principle VI (Human-Maintainable Code) mandates tests for every module.

**Organization**: Tasks grouped by user story. US1 (Config & Launch) and US4 (Image Component) are both P1 and tightly coupled — US4 is the first concrete component that proves US1's architecture. They share a phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the pnpm monorepo with three packages, shared tooling configs, and build pipeline.

- [X] T001 Initialize pnpm monorepo with pnpm-workspace.yaml and root package.json (workspace scripts: build, dev, test, start)
- [X] T002 Create shared TypeScript base config in tsconfig.base.json (strict mode, ES2022 target, paths)
- [X] T003 [P] Scaffold packages/shared/ with package.json and tsconfig.json extending base
- [X] T004 [P] Scaffold packages/server/ with package.json and tsconfig.json extending base (deps: fastify, @fastify/static)
- [X] T005 [P] Scaffold packages/dashboard/ with package.json, tsconfig.json, vite.config.ts, and index.html (deps: react, react-dom, vite, @vitejs/plugin-react)
- [X] T006 Configure Vitest workspace in vitest.workspace.ts (covers shared, server, dashboard unit tests)
- [X] T007 [P] Configure Playwright in playwright.config.ts (baseURL: localhost:3000, webServer start command)
- [X] T008 [P] Create assets/ directory with a placeholder image (assets/placeholder.png) for testing
- [X] T009 [P] Create example config.json in project root with two image views per quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and skeleton entry points that ALL user stories depend on. No feature logic yet.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T010 Define all shared TypeScript types (DashboardConfig, ViewEntry, ImageSettings, ComponentProps) in packages/shared/src/types.ts per data-model.md
- [X] T011 [P] Create type export barrel in packages/shared/src/index.ts and configure package.json exports
- [X] T012 [P] Unit tests for shared type guards and defaults in packages/shared/tests/types.test.ts
- [X] T013 Create server entry point skeleton (Fastify instance, listen, plugin registration) in packages/server/src/index.ts
- [X] T014 Create dashboard entry point (React root render) in packages/dashboard/src/main.tsx
- [X] T015 [P] Create full-screen CSS reset (100vw × 100vh, overflow hidden, margin/padding reset, box-sizing) in packages/dashboard/src/styles/global.css

**Checkpoint**: Monorepo builds, shared types importable by both server and dashboard, skeleton apps start.

---

## Phase 3: User Story 1 — Configure and Launch a Dashboard + User Story 4 — Image Component (Priority: P1) 🎯 MVP

**Goal**: A user creates a config.json with image views, launches the server + dashboard, and sees the first view rendered correctly. Image component supports all four display modes (contain, cover, stretch, center). This is the end-to-end MVP.

**Independent Test**: Create config.json with one image view → launch → verify image displays. Change displayMode → verify each mode renders correctly. Remove config → verify empty state. Use malformed config → verify error state.

### Tests for US1 + US4 (Write FIRST — must FAIL before implementation)

- [X] T016 [P] [US1] Unit tests for config file loading, validation, defaults, and error cases in packages/server/tests/config.test.ts
- [X] T017 [P] [US1] Unit tests for GET /api/config route (200, 404, 422 responses per contract) in packages/server/tests/routes.test.ts
- [X] T018 [P] [US1] Unit tests for component registry (lookup by type, unknown type returns undefined) in packages/dashboard/tests/unit/registry.test.ts
- [X] T019 [P] [US1] Unit tests for ViewRenderer (renders registered component, renders ErrorState for unknown type) in packages/dashboard/tests/unit/ViewRenderer.test.tsx
- [X] T020 [P] [US4] Unit tests for ImageView (all four display modes map to correct CSS object-fit, missing src shows placeholder, default displayMode is contain) in packages/dashboard/tests/unit/ImageView.test.tsx

### Implementation for US1 + US4

- [X] T021 [US1] Implement config file loading and validation (read JSON, apply defaults, handle missing/malformed file) in packages/server/src/config.ts
- [X] T022 [US1] Implement GET /api/config route (200 with config, 404 no file, 422 parse error) in packages/server/src/routes/config.ts
- [X] T023 [US1] Register config route and @fastify/static plugin (serve /assets/* from assets/ dir) in packages/server/src/index.ts
- [X] T024 [P] [US1] Implement component registry (type string → React component map) in packages/dashboard/src/components/registry.ts
- [X] T025 [P] [US1] Implement EmptyState component ("No views configured" message) in packages/dashboard/src/components/EmptyState.tsx
- [X] T026 [P] [US1] Implement ErrorState component (config error / invalid view indicator) in packages/dashboard/src/components/ErrorState.tsx
- [X] T027 [US4] Implement ImageView component (img tag with object-fit mapping for contain/cover/stretch/center, error placeholder for broken src) in packages/dashboard/src/components/ImageView.tsx
- [X] T028 [US1] Register ImageView in component registry in packages/dashboard/src/components/registry.ts
- [X] T029 [US1] Implement ViewRenderer (lookup component type in registry, render component or ErrorState for unknown type) in packages/dashboard/src/components/ViewRenderer.tsx
- [X] T030 [US1] Implement App.tsx — fetch config from GET /api/config on mount, handle loading/error/empty states, render first view via ViewRenderer in packages/dashboard/src/App.tsx
- [X] T031 [US1] Configure Vite dev server proxy (/api → Fastify server) in packages/dashboard/vite.config.ts

### E2E Tests for US1 + US4

- [X] T032 [US1] E2E test: launch dashboard with valid config → first view displays; no config → empty state; malformed config → error state in packages/dashboard/tests/e2e/dashboard.spec.ts
- [X] T033 [US4] E2E test: image displays with each display mode (contain, cover, stretch, center); broken image shows placeholder in packages/dashboard/tests/e2e/image.spec.ts

**Checkpoint**: Dashboard launches, reads config, displays first image view. All four image display modes work. Empty/error states render correctly. MVP is functional and independently testable.

---

## Phase 4: User Story 2 — Dashboard Cycles Through Views Automatically (Priority: P2)

**Goal**: The dashboard automatically rotates through all configured views at a configurable interval, looping continuously.

**Independent Test**: Configure 3 image views with 5-second cycle interval → launch → verify all 3 views appear in sequence → verify loop back to first view. Single-view config → verify no cycling errors.

### Tests for US2 (Write FIRST — must FAIL before implementation)

- [X] T034 [P] [US2] Unit tests for view cycling logic (timer advances index, wraps at end, single-view no-op, default 30s interval, invalid interval defaults to 30) in packages/dashboard/tests/unit/App.test.tsx

### Implementation for US2

- [X] T035 [US2] Implement view cycling in App.tsx — setInterval with cycleInterval from config, advance activeViewIndex, wrap with modulo, cleanup on unmount; skip cycling for single-view configs in packages/dashboard/src/App.tsx

### E2E Tests for US2

- [X] T036 [US2] E2E test: 3 views cycle in order at configured interval; loops back to first; single view stays displayed without errors in packages/dashboard/tests/e2e/dashboard.spec.ts

**Checkpoint**: Dashboard cycles through all views automatically and loops. Single-view configs are stable. Default interval works.

---

## Phase 5: User Story 3 — Responsive Layout Across Different Displays (Priority: P2)

**Goal**: Dashboard and views fill the screen on any display size (800×480 to 3840×2160) without scrollbars, clipping, or overflow. Views re-render on resize.

**Independent Test**: Launch dashboard → resize viewport to 800×480, 1920×1080, 3840×2160 → verify no scrollbars, no clipping, image fills viewport at each size.

### Tests for US3

- [X] T037 [P] [US3] Unit tests for ImageView and ViewRenderer responsive behavior (100% width/height, no overflow) in packages/dashboard/tests/unit/ImageView.test.tsx (extend existing)

### Implementation for US3

- [X] T038 [US3] Audit and finalize responsive CSS — ensure root container, ViewRenderer, and ImageView all use 100vw/100vh/100% dimensions with no overflow; verify no hard-coded pixel sizes in packages/dashboard/src/styles/global.css and component styles
- [X] T039 [US3] Ensure ImageView uses width: 100% and height: 100% on both container and img element for proper scaling in packages/dashboard/src/components/ImageView.tsx

### E2E Tests for US3

- [X] T040 [US3] E2E test: verify no scrollbars and correct rendering at viewports 800×480, 1920×1080, and 3840×2160; resize mid-session and verify view adapts in packages/dashboard/tests/e2e/dashboard.spec.ts

**Checkpoint**: Dashboard renders correctly on all target display sizes. Resize is handled gracefully.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and cleanup across all stories.

- [X] T041 [P] Add root package.json scripts for start (run server + serve dashboard build), dev (concurrent server + vite dev), and build (build all packages)
- [X] T042 [P] Validate config.json example matches quickstart.md and works end-to-end
- [X] T043 Run full test suite (pnpm test) — all unit, integration, and E2E tests pass
- [X] T044 [P] Verify Vite production build (pnpm build) succeeds and server serves built dashboard
- [X] T045 Run quickstart.md validation — follow steps from scratch and verify all outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 + US4 (Phase 3)**: Depends on Phase 2 — core MVP
- **US2 (Phase 4)**: Depends on Phase 3 (needs views rendering to test cycling)
- **US3 (Phase 5)**: Depends on Phase 3 (needs views rendering to test responsiveness)
- **Polish (Phase 6)**: Depends on Phases 3, 4, 5

### User Story Dependencies

- **US1 + US4 (P1)**: Can start after Phase 2 — no other story dependencies. This IS the MVP.
- **US2 (P2)**: Depends on US1 (needs working view rendering to add cycling). Cannot parallelize with US1.
- **US3 (P2)**: Depends on US1 (needs working views to test responsiveness). Can parallelize with US2.

### Within Each User Story

- Unit tests MUST be written and FAIL before implementation
- Server-side before client-side (config endpoint → dashboard fetch)
- Registry and utilities before components that use them
- Components before App.tsx integration
- E2E tests after implementation is complete

### Parallel Opportunities

**Phase 1** (all [P] tasks in parallel):
```
T003 (shared scaffold) | T004 (server scaffold) | T005 (dashboard scaffold)
T007 (Playwright)      | T008 (assets)          | T009 (config.json)
```

**Phase 2** (after T010):
```
T011 (barrel export) | T012 (type tests) | T015 (global CSS)
```

**Phase 3 — Tests** (all in parallel):
```
T016 (config tests) | T017 (route tests) | T018 (registry tests) | T019 (ViewRenderer tests) | T020 (ImageView tests)
```

**Phase 3 — Implementation** (after server tasks):
```
T024 (registry) | T025 (EmptyState) | T026 (ErrorState)
```

**Phase 4 + Phase 5** (after Phase 3):
```
US2 cycling (T034-T036) | US3 responsive (T037-T040)
```

---

## Parallel Example: Phase 3 (US1 + US4 MVP)

```bash
# Wave 1 — All unit tests in parallel (write first, must fail):
T016: "Config loading tests in packages/server/tests/config.test.ts"
T017: "Route tests in packages/server/tests/routes.test.ts"
T018: "Registry tests in packages/dashboard/tests/unit/registry.test.ts"
T019: "ViewRenderer tests in packages/dashboard/tests/unit/ViewRenderer.test.tsx"
T020: "ImageView tests in packages/dashboard/tests/unit/ImageView.test.tsx"

# Wave 2 — Server implementation (sequential):
T021: "Config loading in packages/server/src/config.ts"
T022: "API route in packages/server/src/routes/config.ts"
T023: "Server wiring in packages/server/src/index.ts"

# Wave 3 — Dashboard components (parallel where marked):
T024: "Registry in packages/dashboard/src/components/registry.ts"
T025: "EmptyState in packages/dashboard/src/components/EmptyState.tsx"
T026: "ErrorState in packages/dashboard/src/components/ErrorState.tsx"
T027: "ImageView in packages/dashboard/src/components/ImageView.tsx"

# Wave 4 — Integration (sequential):
T028: "Register ImageView in registry"
T029: "ViewRenderer in packages/dashboard/src/components/ViewRenderer.tsx"
T030: "App.tsx config fetching and view rendering"
T031: "Vite proxy config"

# Wave 5 — E2E validation:
T032: "Dashboard E2E tests"
T033: "Image display modes E2E tests"
```

---

## Implementation Strategy

### MVP First (Phase 1 → 2 → 3)

1. Complete Phase 1: Setup — monorepo scaffolded, builds pass
2. Complete Phase 2: Foundational — shared types defined, skeletons start
3. Complete Phase 3: US1 + US4 — config-driven dashboard with image component
4. **STOP and VALIDATE**: Launch dashboard with config.json, verify image displays in all four modes, verify empty/error states
5. This is a fully working, demonstrable product

### Incremental Delivery

1. Setup + Foundational → Monorepo builds, types shared
2. US1 + US4 → Working dashboard with image views (MVP! 🎯)
3. US2 → Views cycle automatically → Demo continuous rotation
4. US3 → Verified responsive on all target displays
5. Polish → Production-ready build, validated quickstart

### Parallel Team Strategy

After Phase 2 completes:
- **Developer A**: US1 + US4 (MVP — must complete first)
- After Phase 3:
  - **Developer A**: US2 (cycling)
  - **Developer B**: US3 (responsive)
- Both converge for Phase 6 (polish)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to its user story for traceability
- US1 and US4 are combined in Phase 3 because US4 (Image Component) is the concrete proof that US1 (Config & Launch) works
- US2 and US3 can proceed in parallel after Phase 3
- Constitution requires tests for every module — all test tasks are mandatory
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
