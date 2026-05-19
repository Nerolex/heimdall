# Research: Supermarket Offers View

**Feature**: 002-supermarket-offers-view | **Date**: 2026-05-19

## R1: Offer Source Integration Pattern

**Decision**: Use one adapter module per market source behind a shared `fetchOffers(regionContext)` contract, with initial support capped at two adapters.

**Rationale**: Keeps live-source differences isolated while preserving a single refresh pipeline. Matches the explicit scope limit (1-2 markets) without introducing a generalized plugin framework too early.

**Alternatives considered**:
- **One generic parser for all markets**: Rejected because source payloads and transport details differ; would create brittle condition-heavy code.
- **Unbounded provider plugin system now**: Rejected as over-engineering for initial 1-2 source scope.

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
