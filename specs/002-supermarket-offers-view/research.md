# Research: Supermarket Offers View

**Feature**: 002-supermarket-offers-view | **Date**: 2026-05-19

## R0: Data Source Selection

**Decision**: Use **marktguru.de** as the single live data source via the [`sydev/marktguru`](https://github.com/sydev/marktguru) npm library.

**Rationale**: marktguru aggregates all major German retailers (REWE, Lidl, Aldi, Penny, EDEKA, Netto, Kaufland, dm, Rossmann, …) behind a single PLZ-aware JSON API. The `sydev/marktguru` library is TypeScript-native, actively maintained (Jan 2025), and dynamically fetches API keys from the marktguru homepage — no hardcoded secrets. Retailer filtering via `allowedRetailers` in the query replaces the need for a second separate adapter.

**Source investigation conducted 2026-05-19** — findings for all alternatives:
- **REWE direct** (`rewerse-engineering`): Requires extracting an mTLS client cert from the REWE Android APK on every APK version bump — unacceptable operational burden for a personal dashboard.
- **EDEKA direct** (`VinceDerPrince/Edeka-API`): Uses a hardcoded session cookie likely expired; fragile and stale (2022).
- **kaufda.de / meinprospekt.de (Bonial)**: No known reverse-engineered API or open-source scraper; would require mobile app network interception.
- **Lidl / Aldi direct**: No unofficial API found; both retailers are already covered by marktguru aggregation.

**Key marktguru API facts**:
- Endpoint: `https://api.marktguru.de/api/v1/offers/search?as=web&q={query}&zipCode={plz}&limit={n}`
- Auth: `x-apikey` + `x-clientkey` headers fetched at runtime from marktguru homepage HTML (no stored secrets)
- PLZ filtering: ✅ native `zipCode` parameter
- Retailer filtering: ✅ `allowedRetailers` array (slugs: `rewe`, `lidl`, `aldi-sued`, `aldi-nord`, `penny`, `netto-marken-discount`, …)
- Image CDN: `https://mg2de.b-cdn.net/api/v1/offers/{id}/images/default/0/small.jpg`
- Offer fields available: `description`, `price`, `oldPrice`, `referencePrice`, `validityDates`, `advertisers`, `images`

**ToS note**: Unofficial use. No public API terms. Acceptable for personal/self-hosted dashboard.

---

## R1: Offer Source Integration Pattern

**Decision**: Use a **single adapter** (`marktguru.ts`) behind the `fetchOffers(config)` contract. The adapter uses `sydev/marktguru` and applies retailer slug filtering per config. No second adapter in v1.

**Rationale**: marktguru's multi-retailer aggregation eliminates the need for separate adapters per retailer. The adapter boundary is preserved so a second source (e.g. direct REWE) can be added later without changing the refresh pipeline.

**Alternatives considered**:
- **One adapter per retailer**: Rejected because marktguru already aggregates them.
- **Unbounded plugin system now**: Rejected as over-engineering for initial single-source scope.

## R2: Daily Refresh Scheduling

**Decision**: Server-triggered refresh every 24 hours with immediate startup refresh attempt.

**Rationale**: Meets FR-005 cadence while preventing stale boot scenarios. A startup attempt ensures first meaningful data is fetched quickly when network/source is available.

**Alternatives considered**:
- **Refresh only at fixed wall-clock time**: Rejected for v1 due to additional timezone/scheduler complexity with no requirement benefit.
- **Per-view client refresh**: Rejected because refresh ownership belongs on the server and would violate consistency across clients.

## R3: Stale Snapshot Fallback Strategy

**Decision**: Persist and serve the most recent successful `DailyOfferSnapshot`; if a refresh fails, retain prior snapshot and mark it stale with failure metadata.

**Rationale**: Directly satisfies FR-012 and supports non-blocking degraded behavior (FR-008). Users still see useful recent results while being informed data may be outdated.

**Alternatives considered**:
- **Drop data on refresh failure**: Rejected because it creates avoidable blank/error-heavy UX and violates stale fallback requirement.
- **Silently keep old data without stale indicator**: Rejected because users need explicit freshness context.

## R4: Product Matching Rule Implementation

**Decision**: Deterministic matching only against normalized canonical product names and normalized explicit aliases from `config.json`.

**Rationale**: Required by clarification + FR-006. Deterministic exact matching avoids false positives and keeps behavior transparent for users editing config.

**Alternatives considered**:
- **Fuzzy or token-based matching**: Rejected because it violates explicit matching constraints and introduces ambiguous behavior.
- **Substring contains matching**: Rejected because it increases accidental matches and weakens testability.

## R5: Region/Market Configuration Shape

**Decision**: Store supermarket settings under `providers.supermarket` in grouped schema v2, including `region`, `markets[]`, and `products[]`.

**Rationale**: Aligns with current repo convention (`providers.*`), keeps configuration-driven behavior centralized, and avoids hardcoded region/city/PLZ logic.

**Alternatives considered**:
- **Hardcoded region constants in source adapters**: Rejected because FR-007 requires configurable region/market context.
- **New standalone config file**: Rejected to avoid config fragmentation and preserve single source of truth in `config.json`.

## R6: View-Only UX Contract

**Decision**: View renders only four states: `ready`, `empty`, `partial-error`, `stale`; no input elements (search, filter, text entry, toggles).

**Rationale**: Enforces FR-002 and keeps dashboard interaction model consistent with passive glanceable views.

**Alternatives considered**:
- **Inline filter chips or search box**: Rejected as explicitly out of scope and contrary to view-only requirement.
- **Hide all errors and show nothing**: Rejected because explicit user-friendly states are required by FR-008/FR-009/FR-012.

## Clarification Resolution Summary

All technical unknowns are resolved for planning scope:
- Source integration approach: resolved (adapter-per-market, max 2)
- Scheduling behavior: resolved (startup attempt + 24h cadence)
- Failure handling: resolved (stale snapshot fallback + explicit indicator)
- Matching semantics: resolved (exact normalized + explicit aliases only)
- Config shape and location: resolved (`config.json` grouped providers format)

No `NEEDS CLARIFICATION` items remain.
