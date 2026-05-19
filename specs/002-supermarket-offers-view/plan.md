# Implementation Plan: Supermarket Offers View

**Branch**: `002-supermarket-offers-view` | **Date**: 2026-05-19 | **Spec**: `specs/002-supermarket-offers-view/spec.md`
**Input**: Feature specification from `specs/002-supermarket-offers-view/spec.md`

## Summary

Add a new `supermarket-offers` dashboard view that is strictly view-only, reads region/market/product tracking config from `config.json`, fetches live data from 1-2 configured markets once daily, and shows a consolidated offer list for exact normalized product names and explicit aliases only. The server owns daily refresh and stale-snapshot fallback; the dashboard only renders the latest snapshot and never provides search/filter/input controls.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (LTS)  
**Primary Dependencies**: React 18, Fastify 4, existing monorepo shared package (`@heimdall/shared`)  
**Storage**: In-memory daily snapshot cache + persisted JSON snapshot file under project data directory for restart continuity  
**Testing**: Vitest (unit/integration for matching + refresh logic + route behavior), Playwright (view-only rendering and stale-state UX)  
**Target Platform**: Local-network self-hosted dashboard (browser runtime + local API server)  
**Project Type**: Full-stack TypeScript monorepo feature addition (new provider + view + API route)  
**Performance Goals**: Snapshot API response <200ms on local network; render 20+ matched products without frame drops on normal kiosk hardware  
**Constraints**: 
- UI must remain view-only (no input/search/filter controls)
- Live sources limited to 1-2 configured markets for initial scope
- Region/market and tracked products must be configuration-driven (not hardcoded)
- Matching rule is exact normalized canonical name + explicit aliases only
- Refresh cadence is once per 24h with stale-data fallback on refresh failure
**Scale/Scope**: One dashboard instance, one region context at a time, 1-2 market sources, typical 10-50 tracked products

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Modular-First** | ✅ PASS | Adds one isolated view module (`supermarket-offers`) and one server route/service path without cross-view coupling. |
| **II. Configuration-Driven** | ✅ PASS | Region, enabled markets, tracked products, and aliases are all read from `config.json`; no UI editing path added. |
| **III. Dual-Mode Operation** | ✅ PASS | Uses existing API + dashboard runtime path shared by headless and future headed mode; no mode-specific logic introduced. |
| **IV. Local-Network-First** | ✅ PASS | Refresh runs locally on server; no required cloud backend introduced beyond direct market source fetches. |
| **V. Simplicity (YAGNI)** | ✅ PASS | Scope constrained to 1-2 sources, once-daily polling, exact-match rules only, no fuzzy matching/search UI. |
| **VI. Human-Maintainable Code** | ✅ PASS | Matching and normalization kept explicit and test-covered; small adapter boundary per source. |

**Technology Constraints check**:
- ✅ Node.js + TypeScript + React + Fastify + pnpm monorepo remain unchanged
- ✅ No new heavy dependencies required; normalization can use lightweight utility functions
- ✅ Test coverage planned with Vitest/Playwright

**Gate Result (pre-research)**: PASS — no constitutional violations requiring exceptions.

### Post-Phase 1 Gate Re-check

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Modular-First** | ✅ PASS | Data model and contracts keep supermarket logic in dedicated route/service/view modules. |
| **II. Configuration-Driven** | ✅ PASS | Contract + quickstart define provider config for region/markets/products in `config.json`. |
| **III. Dual-Mode Operation** | ✅ PASS | No Electron-only or browser-only feature branch; API contract is mode-agnostic. |
| **IV. Local-Network-First** | ✅ PASS | Snapshot cache + fallback operate locally and continue rendering during upstream failures. |
| **V. Simplicity (YAGNI)** | ✅ PASS | No write endpoints, no user interaction layer, no speculative multi-region fanout design. |
| **VI. Human-Maintainable Code** | ✅ PASS | Explicit entity model, refresh state model, and deterministic matching contract reduce hidden behavior. |

**Gate Result (post-design)**: PASS — design remains constitution-compliant.

## Project Structure

### Documentation (this feature)

```text
specs/002-supermarket-offers-view/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions and trade-offs
├── data-model.md        # Phase 1 output — entities + validation/state model
├── quickstart.md        # Phase 1 output — setup and verification flow
├── contracts/
│   └── api.md           # Phase 1 output — supermarket offers API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   └── src/types.ts                             # Add supermarket config + offer snapshot types
├── server/
│   ├── src/
│   │   ├── config.ts                            # Parse/validate providers.supermarket config
│   │   ├── index.ts                             # Register supermarket route + scheduler bootstrap
│   │   ├── services/supermarket/
│   │   │   ├── normalize.ts                     # Canonical normalization + alias matching helpers
│   │   │   ├── matchOffers.ts                   # Exact normalized + alias-only matcher
│   │   │   ├── refreshDailySnapshot.ts          # Daily refresh orchestration + stale fallback
│   │   │   ├── adapters/
│   │   │   │   ├── marketA.ts                   # Live source adapter 1
│   │   │   │   └── marketB.ts                   # Live source adapter 2
│   │   │   └── snapshotStore.ts                 # In-memory + persisted snapshot read/write
│   │   └── routes/supermarketOffers.ts          # GET snapshot endpoint for dashboard
│   └── tests/
│       ├── supermarketMatching.test.ts
│       ├── supermarketRefresh.test.ts
│       └── supermarketRoute.test.ts
└── dashboard/
    ├── src/components/views/supermarket/
    │   ├── SupermarketOffersView.tsx            # View-only renderer
    │   ├── useSupermarketOffers.ts              # Snapshot fetch hook + polling while view active
    │   └── SupermarketOffers.module.css         # Offer list + stale/error/empty states
    ├── src/components/registry.ts               # Register `supermarket-offers` view type
    └── tests/unit/SupermarketOffersView.test.tsx
```

**Structure Decision**: Reuse existing `shared` + `server` + `dashboard` package split. Add supermarket domain logic as a dedicated service subtree in `packages/server/src/services/supermarket` with minimal adapter surface for 1-2 live markets.

## Complexity Tracking

No violations. All scoped decisions stay within constitutional simplicity and modularity constraints.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |
