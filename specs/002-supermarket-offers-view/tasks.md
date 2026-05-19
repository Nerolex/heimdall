# Tasks: Supermarket Offers View

**Input**: Design documents from `specs/002-supermarket-offers-view/`  
**Branch**: `002-supermarket-offers-view`  
**Prerequisites met**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅ quickstart.md ✅

**Tests**: Not explicitly requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no inter-task dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3 — maps to spec.md)
- Exact file paths are required in every description

---

## Phase 1: Setup

**Purpose**: Wire the new feature into project-wide configuration so all downstream phases have a valid config context to work with.

- [ ] T001 Add `providers.supermarket` block (region, markets, products sample entries) and register `supermarket-offers` view type in the `views` array of `config.json`

**Checkpoint**: `config.json` is valid and the new view type is declared in the rotation before any implementation begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, normalization primitives, snapshot persistence, and config parsing that EVERY user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add `RegionContext`, `MarketSourceConfig`, `TrackedProduct`, `SourceOfferRecord`, `OfferRecord`, `SourceRefreshStatus`, `DailyOfferSnapshot`, and `SupermarketProviderConfig` TypeScript interfaces to `packages/shared/src/types.ts`
- [ ] T003 [P] Implement `normalizeProductName(raw: string): string` canonical normalization helper (lowercase, trim, collapse whitespace) in `packages/server/src/services/supermarket/normalize.ts`
- [ ] T004 [P] Implement `snapshotStore.ts` with `getSnapshot()`, `setSnapshot()`, and JSON persistence read/write (load from / save to project data directory on disk) in `packages/server/src/services/supermarket/snapshotStore.ts`
- [ ] T005 Add `providers.supermarket` config block parsing and structural validation (markets length 1–2, non-empty markets IDs, de-duplicated market IDs) to `packages/server/src/config.ts`

**Checkpoint**: Foundation complete — all shared types are importable from `@heimdall/shared`; config parsing enforces structural constraints; snapshot store is ready for use.

---

## Phase 3: User Story 1 — See Daily Offers at a Glance (Priority: P1) 🎯 MVP

**Goal**: A user opens the dashboard and the supermarket offers view renders current daily offers for configured products, without any user input.

**Independent Test**: Configure one market (`market-a`), one region (`DE / 44135 / Dortmund`), and three products in `config.json`; start the dashboard (`pnpm dev`) and verify the `supermarket-offers` view renders matching daily offers automatically, with source attribution visible for each offer and no interactive controls present.

### Implementation for User Story 1

- [ ] T006 [P] [US1] Implement `marketA.ts` live source adapter exporting `fetchOffers(region: RegionContext): Promise<SourceOfferRecord[]>` with per-record error isolation (failed individual records do not abort the entire fetch) in `packages/server/src/services/supermarket/adapters/marketA.ts`
- [ ] T007 [P] [US1] Implement `marketB.ts` live source adapter exporting `fetchOffers(region: RegionContext): Promise<SourceOfferRecord[]>` with per-record error isolation in `packages/server/src/services/supermarket/adapters/marketB.ts`
- [ ] T008 [US1] Implement `matchOffers(sources: SourceOfferRecord[], products: TrackedProduct[]): OfferRecord[]` with exact normalized canonical-name + explicit-alias matching only (no fuzzy/substring), plus duplicate suppression by `trackedProductName + market + priceText + validFrom + validTo` key (FR-011) in `packages/server/src/services/supermarket/matchOffers.ts`
- [ ] T009 [US1] Implement `refreshDailySnapshot(config: SupermarketProviderConfig): Promise<void>` orchestrating multi-source fan-out, per-source `SourceRefreshStatus` population, stale-snapshot fallback on failure (FR-012), and 24 h scheduler with immediate startup attempt (R2) in `packages/server/src/services/supermarket/refreshDailySnapshot.ts`
- [ ] T010 [US1] Implement Fastify route handlers for `GET /api/supermarket-offers/snapshot` (200 with `DailyOfferSnapshot` / 404 when no snapshot exists / 422 for invalid config) and `GET /api/supermarket-offers/health` (200 with next-refresh metadata) in `packages/server/src/routes/supermarketOffers.ts`
- [ ] T011 [US1] Register the supermarket Fastify plugin and invoke the daily refresh scheduler bootstrap on server startup in `packages/server/src/index.ts`
- [ ] T012 [P] [US1] Implement `useSupermarketOffers.ts` React hook that fetches `/api/supermarket-offers/snapshot` on mount and re-fetches while the view is active, returning typed `DailyOfferSnapshot | null` plus loading/error state in `packages/dashboard/src/components/views/supermarket/useSupermarketOffers.ts`
- [ ] T013 [P] [US1] Create `SupermarketOffers.module.css` with styles for: offer-list container, offer-card (product name, price, validity, source attribution), stale-banner, partial-error-banner, empty-state, and error-state in `packages/dashboard/src/components/views/supermarket/SupermarketOffers.module.css`
- [ ] T014 [US1] Implement `SupermarketOffersView.tsx` view-only React component rendering exactly four states — `OFFERS_STATE` (list with source attribution per FR-010), `NO_MATCH_STATE` (no offers found), `ERROR_STATE` (snapshot unavailable), `STALE_STATE` (stale banner + last-success timestamp per FR-012) — with zero interactive controls (no search, filter, or text input per FR-002) in `packages/dashboard/src/components/views/supermarket/SupermarketOffersView.tsx`
- [ ] T015 [US1] Import `SupermarketOffersView` and call `registerComponent('supermarket-offers', SupermarketOffersView)` in `packages/dashboard/src/components/registry.ts`

**Checkpoint**: User Story 1 is independently functional — the `supermarket-offers` view renders live matched offers, source attribution, stale indicator, and error state with no user input required.

---

## Phase 4: User Story 2 — Configure Region and Markets (Priority: P1)

**Goal**: A user configures `providers.supermarket.region` and up to two enabled market sources in `config.json`, and the daily refresh delivers offers scoped to that region from all enabled sources.

**Independent Test**: Set `region.postalCode` to two different values in separate runs and confirm displayed offers differ according to region; enable both `market-a` and `market-b` and confirm the consolidated view includes results from both sources; set an empty `region` object and confirm a clear error state is surfaced.

### Implementation for User Story 2

- [ ] T016 [P] [US2] Extend config validation in `packages/server/src/config.ts` to enforce `RegionContext` constraints: non-empty `countryCode` required, and at least one of `postalCode` or `city` present; return a structured `supermarket_config_invalid` error payload on violation (matching the `422` API contract in `contracts/api.md`)
- [ ] T017 [US2] Confirm no hardcoded locality constants exist in `packages/server/src/services/supermarket/adapters/marketA.ts` or `marketB.ts` — each adapter must derive all region parameters exclusively from the `RegionContext` argument passed by `refreshDailySnapshot.ts`; add a JSDoc `@throws` annotation documenting the unsupported-region error path in both adapter files

**Checkpoint**: Region configuration is fully data-driven; changing `providers.supermarket.region` in `config.json` and triggering a refresh delivers offers for the new region with no code change required.

---

## Phase 5: User Story 3 — Manage Tracked Products via Configuration (Priority: P2)

**Goal**: A user edits `config.json` to define the monitored product list, and the view exclusively shows offers for those products; empty list and duplicate entries are handled gracefully.

**Independent Test**: Start with product set A configured; verify only set A products appear; update to product set B and trigger a refresh; verify only set B products appear; configure an empty `products: []` list and verify an explicit "no products configured" message is displayed instead of a blank layout.

### Implementation for User Story 3

- [ ] T018 [P] [US3] Implement tracked-product de-duplication by normalized canonical name during config parsing in `packages/server/src/config.ts` (collapse duplicate entries, keeping first occurrence) and add `configuredProductCount: number` field to `DailyOfferSnapshot` in `packages/shared/src/types.ts`, populated from `config.products.length` after de-duplication in `packages/server/src/services/supermarket/refreshDailySnapshot.ts`
- [ ] T019 [US3] Add `EMPTY_CONFIG_STATE` branch to `SupermarketOffersView.tsx` that renders an explicit "No products configured — add products to `config.json`" message when `snapshot.configuredProductCount === 0`, distinct from `NO_MATCH_STATE` ("No matching offers found for your products"), in `packages/dashboard/src/components/views/supermarket/SupermarketOffersView.tsx`
- [ ] T020 [US3] Add `PARTIAL_ERROR_BANNER` rendering to `SupermarketOffersView.tsx` inside `OFFERS_STATE` that displays per-source failure attribution (source ID + error message from `snapshot.sourceStatuses`) when any `SourceRefreshStatus.ok === false` while other sources still returned data in `packages/dashboard/src/components/views/supermarket/SupermarketOffersView.tsx`

**Checkpoint**: User Story 3 is independently functional — the product watchlist is the sole driver of displayed offers; empty list, deduplication, and partial-source errors all surface clear, non-breaking UI states.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Edge-case hardening and correctness improvements identified across the spec edge cases.

- [ ] T021 [P] Add null/missing validity-date guard in the offer-card template in `packages/dashboard/src/components/views/supermarket/SupermarketOffersView.tsx`: render "—" when `validFrom` or `validTo` is `null`, and omit the validity row entirely when both are null (spec edge case: "Offer data is stale or missing validity dates in a source response")
- [ ] T022 Invalidate and clear the persisted snapshot in `packages/server/src/services/supermarket/snapshotStore.ts` when `providers.supermarket.region` changes between server restarts (detected by comparing stored `snapshot.region` to current config at boot) to prevent cross-region stale data being served (spec edge case: "Region is changed while previously cached daily data exists")

**Checkpoint**: All spec edge cases addressed; the feature is production-ready for daily kiosk operation.

---

## Dependencies (Story Completion Order)

```text
Phase 1 (T001)
  └──▶ Phase 2 (T002–T005)          [Foundation: types, normalize, store, config]
         └──▶ Phase 3 US1 (T006–T015)  [MVP: adapters, matching, refresh, route, view]
               ├──▶ Phase 4 US2 (T016–T017)  [Region hardening — builds on US1 adapters]
               └──▶ Phase 5 US3 (T018–T020)  [Product management — builds on US1 matching + view]
                     └──▶ Final Phase (T021–T022)  [Polish — builds on all prior phases]
```

**US2 and US3 are independent of each other** and can be implemented in parallel once Phase 3 is complete.

---

## Parallel Execution Examples

### Phase 2 Parallel Opportunities

```text
T003 normalize.ts  ──┐
                     ├──▶ T005 config.ts (depends on T002)
T004 snapshotStore ──┘
T002 types.ts (start first — all others import from it)
```

### Phase 3 US1 Parallel Opportunities

```text
T006 marketA adapter  ──┐
T007 marketB adapter  ──┤
                        ├──▶ T008 matchOffers ──▶ T009 refreshDailySnapshot ──▶ T010 route ──▶ T011 index.ts
T012 useSupermarketOffers hook  ──┐
T013 CSS module                  ├──▶ T014 SupermarketOffersView.tsx ──▶ T015 registry.ts
```

### Phase 4 + 5 Parallel Opportunities (after Phase 3)

```text
T016 [US2] config region validation  ──┐
T017 [US2] adapter region wiring     ──┘  (US2 in parallel with US3)

T018 [US3] product dedup + count field  ──┐
T019 [US3] EMPTY_CONFIG_STATE view      ──┤
T020 [US3] PARTIAL_ERROR_BANNER view    ──┘
```

---

## Implementation Strategy

**MVP Scope (Phase 3 only)**: Delivering Phase 1 + Phase 2 + Phase 3 gives a fully working `supermarket-offers` view for the primary use case — glanceable daily offers, source attribution, stale fallback, and error states. US2 (region hardening) and US3 (product management polish + empty states) are additive and do not break US1 delivery.

**Incremental Delivery Order**:
1. **T001–T005** (Setup + Foundation) — non-functional but unblocks all story work
2. **T006–T011** (US1 server side) — snapshot API is functional and testable with `curl`
3. **T012–T015** (US1 dashboard side) — view renders in the dashboard rotation ✅ MVP
4. **T016–T017** (US2) + **T018–T020** (US3) in parallel — configuration hardening
5. **T021–T022** (Polish) — edge-case correctness

---

## Task Summary

| Phase | Story | Tasks | Count |
|---|---|---|---|
| Phase 1: Setup | — | T001 | 1 |
| Phase 2: Foundational | — | T002–T005 | 4 |
| Phase 3: MVP | US1 (P1) | T006–T015 | 10 |
| Phase 4: Region | US2 (P1) | T016–T017 | 2 |
| Phase 5: Products | US3 (P2) | T018–T020 | 3 |
| Final: Polish | — | T021–T022 | 2 |
| **Total** | | **T001–T022** | **22** |

**Parallelizable tasks**: T003, T004, T006, T007, T012, T013, T016, T018, T019, T020, T021 (11 of 22)  
**MVP boundary**: Complete T001–T015 for a fully operational US1 delivery.
