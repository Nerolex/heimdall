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

**Purpose**: Wire the new dependency and project-wide configuration so all downstream phases have a valid runtime context.

- [ ] T001 Add `marktguru` (`sydev/marktguru`) as a dependency to the server package by running `pnpm add marktguru --filter @heimdall/server` and confirming the entry appears in `packages/server/package.json`
- [ ] T002 Add `providers.supermarket` block to `config.json` using the v2 shape — top-level fields `postalCode` (string, German PLZ), `retailers` (array of 1–2 marktguru slugs e.g. `["rewe","lidl"]`), and `products` (array of `{name, aliases[]}` sample entries) — and register `{ "type": "supermarket-offers", "overlay": "clock" }` in the `views` array

**Checkpoint**: `marktguru` is resolvable in the server package; `config.json` is valid JSON and the new view type is declared in the rotation before any implementation begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, normalization primitives, snapshot persistence, and config parsing that EVERY user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Add the following TypeScript interfaces to `packages/shared/src/types.ts`, matching the data-model exactly — `SupermarketProviderConfig { postalCode: string; retailers: string[]; products: TrackedProduct[] }`, `TrackedProduct { name: string; aliases?: string[] }`, `SourceOfferRecord { sourceId: 'marktguru'; sourceOfferId: string; productTitle: string; retailer: string; retailerSlug: string; price: number; oldPrice: number | null; imageUrl: string | null; validFrom: string | null; validTo: string | null }`, `OfferRecord { snapshotDate: string; retailer: string; retailerSlug: string; trackedProductName: string; matchedBy: 'name' | 'alias'; sourceProductTitle: string; price: number; oldPrice: number | null; priceText: string; imageUrl: string | null; validFrom: string | null; validTo: string | null }`, `SourceRefreshStatus { sourceId: string; ok: boolean; fetchedAt: string | null; error: string | null }`, `DailyOfferSnapshot { generatedAt: string; lastSuccessfulAt: string | null; stale: boolean; postalCode: string; offers: OfferRecord[]; sourceStatuses: SourceRefreshStatus[]; errors: string[]; configuredProductCount: number }`
- [ ] T004 [P] Implement `normalizeProductName(raw: string): string` canonical normalization helper (lowercase, trim, collapse internal whitespace to single space) exported from `packages/server/src/services/supermarket/normalize.ts`
- [ ] T005 [P] Implement `snapshotStore.ts` exporting `getSnapshot(): DailyOfferSnapshot | null` and `setSnapshot(s: DailyOfferSnapshot): void`, with JSON persistence — on `setSnapshot` write to a snapshot file in the project data directory; on `getSnapshot` return the in-memory value or, on cold start, attempt to load and parse the persisted file (return `null` on missing/corrupt file) in `packages/server/src/services/supermarket/snapshotStore.ts`
- [ ] T006 Add `providers.supermarket` config block parsing and structural validation to `packages/server/src/config.ts`: require `postalCode` to be a non-empty string, require `retailers` to be an array of length 1–2 containing only known valid marktguru slugs (`rewe`, `lidl`, `aldi-sued`, `aldi-nord`, `penny`, `netto-marken-discount`, `edeka`, `kaufland`, `norma`), de-duplicate `products[]` by normalized canonical name (keep first occurrence), and throw a structured error matching the `supermarket_config_invalid` shape from `contracts/api.md` on violation

**Checkpoint**: Foundation complete — all shared types are importable from `@heimdall/shared`; config parsing enforces `postalCode`/`retailers[]` constraints; snapshot store is ready for use.

---

## Phase 3: User Story 1 — See Daily Offers at a Glance (Priority: P1) 🎯 MVP

**Goal**: A user opens the dashboard and the supermarket offers view renders current daily offers for configured products, without any user input.

**Independent Test**: Set `postalCode` to `"44135"`, `retailers` to `["rewe"]`, and three products in `config.json`; run `pnpm dev` and verify the `supermarket-offers` view renders matching daily offers automatically, with `retailer` attribution visible per offer card (`priceText`, `imageUrl` where available) and no interactive controls present.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Implement `marktguru.ts` adapter in `packages/server/src/services/supermarket/adapters/marktguru.ts` exporting `fetchOffers(config: SupermarketProviderConfig): Promise<SourceOfferRecord[]>`; use the `marktguru` npm library to query the marktguru API with `zipCode` set to `config.postalCode` and `allowedRetailers` set to `config.retailers`; map each raw offer to `SourceOfferRecord` by extracting: `sourceId: 'marktguru'`, `sourceOfferId: String(offer.id)`, `productTitle: offer.description`, `retailer: offer.advertisers[0].name`, `retailerSlug` resolved from `config.retailers` by matching advertiser name, `price: offer.price`, `oldPrice: offer.oldPrice ?? null`, `imageUrl: offer.id ? \`https://mg2de.b-cdn.net/api/v1/offers/${offer.id}/images/default/0/small.jpg\` : null`, `validFrom: offer.validityDates?.[0]?.from ?? null`, `validTo: offer.validityDates?.[0]?.to ?? null`; isolate per-record mapping errors so a single malformed record does not abort the full fetch
- [ ] T008 [US1] Implement `matchOffers(sources: SourceOfferRecord[], products: TrackedProduct[]): OfferRecord[]` in `packages/server/src/services/supermarket/matchOffers.ts`; build a lookup map of `normalize(product.name)` and each `normalize(alias)` → `{trackedProductName, matchedBy}`; for each `SourceOfferRecord` check if `normalizeProductName(source.productTitle)` hits the lookup map (exact match only — no fuzzy, substring, or token similarity); on match, construct an `OfferRecord` including `priceText` formatted as German locale currency (e.g. `"1,29 €"` using `price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })`); suppress duplicates by collapsing records with the same `retailer + trackedProductName + price + validTo` composite key (FR-011)
- [ ] T009 [US1] Implement `refreshDailySnapshot(config: SupermarketProviderConfig): Promise<void>` in `packages/server/src/services/supermarket/refreshDailySnapshot.ts`; call the `marktguru` adapter, capture a `SourceRefreshStatus` entry (single entry with `sourceId: 'marktguru'`), run `matchOffers` on success, build a `DailyOfferSnapshot` with `postalCode: config.postalCode`, `configuredProductCount: config.products.length`, and `stale: false`; on adapter failure retain the previous snapshot from `snapshotStore`, update `stale: true`, and append a user-safe message to `errors[]`; export a `scheduleDailyRefresh(config)` function that performs an immediate startup attempt then schedules a 24 h recurring refresh (R2/FR-005)
- [ ] T010 [US1] Implement Fastify route handlers in `packages/server/src/routes/supermarketOffers.ts`: `GET /api/supermarket-offers/snapshot` returns `200 DailyOfferSnapshot` when a snapshot exists, `404 { error: 'snapshot_unavailable', message: '...' }` when no snapshot exists, or `422 { error: 'supermarket_config_invalid', message: '...' }` when config is invalid (FR-008); `GET /api/supermarket-offers/health` returns `200 { hasSnapshot, stale, lastSuccessfulAt, nextRefreshDueAt, configuredRetailers, configuredProductCount }` (matching `contracts/api.md` health shape)
- [ ] T011 [US1] Register the supermarket Fastify plugin (importing `supermarketOffers.ts` route) and call `scheduleDailyRefresh(config.providers.supermarket)` on server startup in `packages/server/src/index.ts`
- [ ] T012 [P] [US1] Implement `useSupermarketOffers.ts` React hook in `packages/dashboard/src/components/views/supermarket/useSupermarketOffers.ts` that fetches `GET /api/supermarket-offers/snapshot` on mount and re-fetches on a polling interval while the view is active, returning `{ snapshot: DailyOfferSnapshot | null; loading: boolean; error: string | null }`; import `DailyOfferSnapshot` from `@heimdall/shared`
- [ ] T013 [P] [US1] Create `SupermarketOffers.module.css` in `packages/dashboard/src/components/views/supermarket/SupermarketOffers.module.css` with CSS modules for: `offerList` container, `offerCard` (displays `retailer` name badge, `trackedProductName`, `priceText` prominently, `oldPrice` struck-through when present, `imageUrl` thumbnail when non-null, `validFrom`/`validTo` range), `staleBanner`, `partialErrorBanner`, `emptyState`, and `errorState`
- [ ] T014 [US1] Implement `SupermarketOffersView.tsx` in `packages/dashboard/src/components/views/supermarket/SupermarketOffersView.tsx` as a view-only React component using `useSupermarketOffers`; render exactly five mutually-exclusive states driven by the snapshot: `LOADING` (spinner), `ERROR_STATE` (snapshot unavailable — 404 or fetch error), `EMPTY_CONFIG_STATE` (`snapshot.configuredProductCount === 0` — "No products configured"), `NO_MATCH_STATE` (`snapshot.offers.length === 0` but products exist — "No matching offers found"), `OFFERS_STATE` (offer card list with `retailer` attribution per FR-010, `priceText`, optional `oldPrice`, optional `imageUrl`, optional validity range); inside `OFFERS_STATE` also render `STALE_BANNER` when `snapshot.stale === true` and `PARTIAL_ERROR_BANNER` when any `sourceStatuses[].ok === false`; zero interactive controls (no search, filter, or text input per FR-002)
- [ ] T015 [US1] Import `SupermarketOffersView` and call `registerComponent('supermarket-offers', SupermarketOffersView)` in `packages/dashboard/src/components/registry.ts`

**Checkpoint**: User Story 1 is independently functional — the `supermarket-offers` view renders live matched offers (with `priceText`, `imageUrl`, `retailer` attribution), stale indicator, and all error/empty states with no user input required.

---

## Phase 4: User Story 2 — Configure Postal Code and Retailers (Priority: P1)

**Goal**: A user configures `providers.supermarket.postalCode` and up to two marktguru retailer slugs in `config.json`, and the daily refresh delivers offers scoped to that postal code from all configured retailers.

**Independent Test**: Set `postalCode` to two different German PLZ values in separate runs and confirm displayed offers differ; set `retailers` to `["rewe", "lidl"]` and confirm the consolidated view includes results from both retailers; set `retailers` to `[]` or `["unknown-slug"]` and confirm a clear `422` error state is surfaced rather than a runtime crash.

### Implementation for User Story 2

- [ ] T016 [P] [US2] Extend config validation in `packages/server/src/config.ts` to enforce the full `postalCode` constraint (non-empty string, matches `/^\d{5}$/` German PLZ format) and confirm the existing `retailers` slug allowlist check returns the structured `supermarket_config_invalid` 422 payload (matching `contracts/api.md`) — no hardcoded locality values anywhere in the validation path
- [ ] T017 [US2] Audit `packages/server/src/services/supermarket/adapters/marktguru.ts` to confirm all locality parameters (`zipCode`, `allowedRetailers`) are derived exclusively from the `SupermarketProviderConfig` argument with no hardcoded PLZ or retailer constants; add a JSDoc `@throws` annotation documenting the error path when the marktguru API rejects an unrecognised postal code or retailer slug

**Checkpoint**: Locality is fully data-driven — changing `postalCode` or `retailers` in `config.json` and triggering a refresh delivers offers for the new context with no code change required.

---

## Phase 5: User Story 3 — Manage Tracked Products via Configuration (Priority: P2)

**Goal**: A user edits `config.json` to define the monitored product list, and the view exclusively shows offers for those products; empty list and duplicate entries are handled gracefully.

**Independent Test**: Start with product set A configured; verify only set A products appear; update to product set B and trigger a refresh; verify only set B products appear; configure `products: []` and verify the explicit "No products configured" message appears instead of a blank layout; add duplicate product names and verify only one entry per canonical name is matched.

### Implementation for User Story 3

- [ ] T018 [P] [US3] Verify that the product de-duplication added in T006 (`packages/server/src/config.ts`) collapses duplicate normalized canonical names to the first occurrence and that `configuredProductCount` in `packages/server/src/services/supermarket/refreshDailySnapshot.ts` is populated from the post-deduplication `config.products.length` — add an explicit comment in `refreshDailySnapshot.ts` at the snapshot construction site documenting that `configuredProductCount` uses the deduplicated count
- [ ] T019 [US3] Confirm `EMPTY_CONFIG_STATE` in `packages/dashboard/src/components/views/supermarket/SupermarketOffersView.tsx` renders the message "No products configured — add products to `config.json`" exclusively when `snapshot.configuredProductCount === 0`, and that it is visually distinct from `NO_MATCH_STATE` ("No matching offers found for your products") — both must never render simultaneously
- [ ] T020 [US3] Confirm `PARTIAL_ERROR_BANNER` in `packages/dashboard/src/components/views/supermarket/SupermarketOffersView.tsx` renders inside `OFFERS_STATE` when `snapshot.sourceStatuses` contains any entry with `ok === false`; display the affected `sourceId` and `error` string from that entry; confirm offers from successful sources remain visible (non-blocking per FR-008/SC-006)

**Checkpoint**: User Story 3 is independently functional — the product watchlist is the sole driver of displayed offers; empty config, deduplication, and source error states all surface clear, non-breaking UI messages.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Edge-case hardening and correctness improvements identified across the spec edge cases.

- [ ] T021 [P] Add null validity-date guards in the offer-card template in `packages/dashboard/src/components/views/supermarket/SupermarketOffersView.tsx`: render "—" for an individual `validFrom` or `validTo` that is `null`; omit the validity row entirely when both are `null` (spec edge case: "Offer data is stale or missing validity dates in a source response"); confirm `imageUrl: null` renders no `<img>` element rather than a broken image
- [ ] T022 Invalidate the persisted snapshot in `packages/server/src/services/supermarket/snapshotStore.ts` when `postalCode` changes between server restarts: on boot, if a persisted snapshot exists and `snapshot.postalCode !== config.postalCode`, discard the persisted file and start with no snapshot so stale cross-PLZ data is never served (spec edge case: "Region is changed while previously cached daily data exists")

**Checkpoint**: All spec edge cases addressed; the feature is production-ready for daily kiosk operation.

---

## Dependencies (Story Completion Order)

```text
Phase 1 (T001–T002)
  └──▶ Phase 2 (T003–T006)           [Foundation: types, normalize, store, config]
         └──▶ Phase 3 US1 (T007–T015)   [MVP: marktguru adapter, matching, refresh, route, view]
               ├──▶ Phase 4 US2 (T016–T017)   [Locality hardening — builds on US1 adapter + config]
               └──▶ Phase 5 US3 (T018–T020)   [Product management — builds on US1 matching + view]
                     └──▶ Final Phase (T021–T022)  [Polish — builds on all prior phases]
```

**US2 and US3 are independent of each other** and can be implemented in parallel once Phase 3 is complete.

---

## Parallel Execution Examples

### Phase 1 Sequential (T001 before T002 — package.json must be updated before config referencing the adapter is testable)

### Phase 2 Parallel Opportunities

```text
T004 normalize.ts  ──┐
                     ├──▶ T006 config.ts (depends on T003 types)
T005 snapshotStore ──┘
T003 types.ts (start first — all others import from it)
```

### Phase 3 US1 Parallel Opportunities

```text
T007 marktguru adapter   ──┐
                           ├──▶ T008 matchOffers ──▶ T009 refreshDailySnapshot ──▶ T010 route ──▶ T011 index.ts
T012 useSupermarketOffers hook  ──┐
T013 CSS module                  ├──▶ T014 SupermarketOffersView.tsx ──▶ T015 registry.ts
```

### Phase 4 + 5 Parallel Opportunities (after Phase 3)

```text
T016 [US2] PLZ format validation  ──┐
T017 [US2] adapter locality audit ──┘  (US2 in parallel with US3)

T018 [US3] dedup count verification  ──┐
T019 [US3] EMPTY_CONFIG_STATE view   ──┤
T020 [US3] PARTIAL_ERROR_BANNER view ──┘
```

---

## Implementation Strategy

**MVP Scope**: Delivering Phase 1 + Phase 2 + Phase 3 gives a fully working `supermarket-offers` view — glanceable daily marktguru offers filtered by `postalCode` + `retailers[]`, offer cards with `priceText`/`imageUrl`/`retailer` attribution, stale fallback, and all empty/error states. US2 (locality hardening) and US3 (product management polish) are additive and do not break US1 delivery.

**Incremental Delivery Order**:
1. **T001–T002** (Setup) — installs the `marktguru` library and establishes correct config shape
2. **T003–T006** (Foundation) — non-functional but unblocks all story work
3. **T007–T011** (US1 server side) — snapshot API functional and testable with `curl /api/supermarket-offers/snapshot`
4. **T012–T015** (US1 dashboard side) — view renders in the dashboard rotation ✅ MVP
5. **T016–T017** (US2) + **T018–T020** (US3) in parallel — configuration hardening
6. **T021–T022** (Polish) — edge-case correctness

---

## Task Summary

| Phase | Story | Tasks | Count |
|---|---|---|---|
| Phase 1: Setup | — | T001–T002 | 2 |
| Phase 2: Foundational | — | T003–T006 | 4 |
| Phase 3: MVP | US1 (P1) | T007–T015 | 9 |
| Phase 4: Locality | US2 (P1) | T016–T017 | 2 |
| Phase 5: Products | US3 (P2) | T018–T020 | 3 |
| Final: Polish | — | T021–T022 | 2 |
| **Total** | | **T001–T022** | **22** |

**Parallelizable tasks**: T004, T005, T007, T012, T013, T016, T018, T019, T020, T021 (10 of 22)  
**MVP boundary**: Complete T001–T015 for a fully operational US1 delivery.
