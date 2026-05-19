# Data Model: Supermarket Offers View

**Feature**: 002-supermarket-offers-view | **Date**: 2026-05-19

## Entities

### SupermarketProviderConfig

Grouped configuration section under `config.json -> providers.supermarket`.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `region` | `RegionContext` | Yes | Non-empty object | Configurable locality context used in source requests (not hardcoded). |
| `markets` | `MarketSourceConfig[]` | Yes | Length 1..2 | Enabled live source definitions (v1 scope). |
| `products` | `TrackedProduct[]` | Yes | May be empty; de-duplicated by canonical normalized name | Product watchlist for matching. |

**Validation rules**:
- Must reject config when `markets.length < 1` or `markets.length > 2`.
- Must reject config when any enabled market lacks required source identifier.
- Product list may be empty (renders explicit empty-configured state).

---

### RegionContext

| Field | Type | Required | Description |
|---|---|---|---|
| `countryCode` | `string` | Yes | ISO-like region root (e.g., `DE`, `PL`) used by adapters. |
| `postalCode` | `string` | No | Optional finer-grained location when supported by market source. |
| `city` | `string` | No | Optional city override for source APIs requiring city names. |

**Validation rules**:
- At least one locality discriminator must be adapter-usable (`postalCode` or `city` or source-specific fallback key).
- Invalid/unsupported region values must result in user-friendly error payload (FR-008).

---

### MarketSourceConfig

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `id` | `'market-a' \| 'market-b'` | Yes | One of supported source IDs | Identifies adapter implementation. |
| `enabled` | `boolean` | No | Defaults `true` | Allows toggling source participation without deletion. |
| `params` | `Record<string, unknown>` | No | Adapter-specific | Extra settings (store/channel/locale) passed to adapter. |

**Validation rules**:
- Only two supported IDs in v1.
- Duplicate `id` entries are invalid.

---

### TrackedProduct

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `name` | `string` | Yes | Non-empty; normalized canonical key unique | Canonical product name. |
| `aliases` | `string[]` | No | Unique normalized values | Explicit alias list for exact matching. |

**Validation rules**:
- Matching candidates are `normalize(name)` + each `normalize(alias)`.
- Empty alias strings are ignored.
- Duplicate normalized aliases collapse to one key.

---

### SourceOfferRecord (raw normalized source output)

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceId` | `string` | Yes | Source identifier (`market-a` / `market-b`). |
| `sourceOfferId` | `string` | Yes | Offer ID unique within source payload. |
| `productTitle` | `string` | Yes | Source-provided product title prior to tracked-product mapping. |
| `priceText` | `string` | Yes | Display-ready price/discount text. |
| `validFrom` | `string \| null` | No | ISO date start when available. |
| `validTo` | `string \| null` | No | ISO date end when available. |
| `details` | `string \| null` | No | Optional offer detail snippet. |

---

### OfferRecord (dashboard-facing)

| Field | Type | Required | Description |
|---|---|---|---|
| `snapshotDate` | `string` | Yes | ISO date of refresh cycle. |
| `market` | `string` | Yes | Human-readable source attribution label (FR-010). |
| `trackedProductName` | `string` | Yes | Canonical configured product name that matched. |
| `matchedBy` | `'name' \| 'alias'` | Yes | Indicates canonical or alias-based exact hit. |
| `sourceProductTitle` | `string` | Yes | Original source title for transparency. |
| `priceText` | `string` | Yes | Offer price/promo label to display. |
| `validFrom` | `string \| null` | No | Offer validity start. |
| `validTo` | `string \| null` | No | Offer validity end. |

**Validation rules**:
- Include record only when normalized `sourceProductTitle` exactly matches normalized canonical/alias key.
- No fuzzy/substr/token similarity matching permitted.
- Duplicate `product+market+price+validity` combinations are collapsed within one snapshot (FR-011).

---

### DailyOfferSnapshot

| Field | Type | Required | Description |
|---|---|---|---|
| `generatedAt` | `string` | Yes | ISO timestamp of latest refresh attempt. |
| `lastSuccessfulAt` | `string \| null` | Yes | Last successful refresh timestamp. |
| `stale` | `boolean` | Yes | `true` if latest attempt failed and prior data is served. |
| `region` | `RegionContext` | Yes | Region context used for snapshot. |
| `offers` | `OfferRecord[]` | Yes | Consolidated matched offers from successful sources. |
| `sourceStatuses` | `SourceRefreshStatus[]` | Yes | Per-source success/failure diagnostics. |
| `errors` | `string[]` | Yes | User-safe error summaries for view state messaging. |

---

### SourceRefreshStatus

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceId` | `string` | Yes | Market source identifier. |
| `ok` | `boolean` | Yes | Whether current cycle fetch succeeded. |
| `fetchedAt` | `string \| null` | Yes | Source fetch timestamp when successful. |
| `error` | `string \| null` | Yes | User-safe failure reason when failed. |

## Relationships

```text
SupermarketProviderConfig
  ├── region: RegionContext (1:1)
  ├── markets: MarketSourceConfig[] (1:N, N in [1,2])
  └── products: TrackedProduct[] (1:N)

DailyOfferSnapshot
  ├── region: RegionContext (1:1)
  ├── offers: OfferRecord[] (1:N)
  └── sourceStatuses: SourceRefreshStatus[] (1:N, mirrors enabled markets)
```

## State Transitions

### Refresh Lifecycle

```text
[BOOT]
  │
  ├── startup refresh success ─────────▶ SNAPSHOT_READY (stale=false)
  └── startup refresh fail + no cache ─▶ SNAPSHOT_ERROR (no data)
                           │
                           └── fail + prior success exists ─▶ SNAPSHOT_READY (stale=true)

SNAPSHOT_READY
  │
  ├── scheduled 24h refresh success ───▶ SNAPSHOT_READY (stale=false, data replaced)
  └── scheduled 24h refresh failure ───▶ SNAPSHOT_READY (stale=true, last success retained)

SNAPSHOT_ERROR
  └── next successful refresh ─────────▶ SNAPSHOT_READY (stale=false)
```

### View Rendering States

```text
LOADING
  ├── snapshot unavailable + error ───▶ ERROR_STATE
  ├── products empty in config ───────▶ EMPTY_CONFIG_STATE
  ├── snapshot offers empty ──────────▶ NO_MATCH_STATE
  └── snapshot offers present ────────▶ OFFERS_STATE

OFFERS_STATE
  ├── sourceStatuses include failures ─▶ PARTIAL_ERROR_BANNER
  └── snapshot.stale=true ─────────────▶ STALE_BANNER
```
