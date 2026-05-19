# Data Model: Supermarket Offers View

**Feature**: 002-supermarket-offers-view | **Date**: 2026-05-19

## Entities

### SupermarketProviderConfig

Grouped configuration section under `config.json -> providers.supermarket`.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `postalCode` | `string` | Yes | Non-empty German PLZ | Locality context passed as `zipCode` to marktguru API. |
| `retailers` | `string[]` | Yes | Length 1..2; valid marktguru slugs | Retailer slugs to include (e.g. `"rewe"`, `"lidl"`, `"aldi-sued"`). |
| `products` | `TrackedProduct[]` | Yes | May be empty; de-duplicated by canonical normalized name | Product watchlist for matching. |

**Validation rules**:
- Must reject config when `retailers.length < 1` or `retailers.length > 2`.
- Must reject config when `postalCode` is missing or empty.
- Product list may be empty (renders explicit empty-configured state).

**Known valid retailer slugs**: `rewe`, `lidl`, `aldi-sued`, `aldi-nord`, `penny`, `netto-marken-discount`, `edeka`, `kaufland`, `norma`

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

### SourceOfferRecord (raw normalized marktguru output)

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceId` | `'marktguru'` | Yes | Fixed source identifier. |
| `sourceOfferId` | `string` | Yes | marktguru `offer.id` (numeric as string). |
| `productTitle` | `string` | Yes | marktguru `offer.description` — used for matching. |
| `retailer` | `string` | Yes | marktguru `offer.advertisers[0].name` (e.g. `"REWE"`). |
| `retailerSlug` | `string` | Yes | Matched against config `retailers[]`. |
| `price` | `number` | Yes | marktguru `offer.price`. |
| `oldPrice` | `number \| null` | No | marktguru `offer.oldPrice`. |
| `imageUrl` | `string \| null` | No | `https://mg2de.b-cdn.net/api/v1/offers/{id}/images/default/0/small.jpg` |
| `validFrom` | `string \| null` | No | marktguru `offer.validityDates[0].from` (ISO date). |
| `validTo` | `string \| null` | No | marktguru `offer.validityDates[0].to` (ISO date). |

---

### OfferRecord (dashboard-facing)

| Field | Type | Required | Description |
|---|---|---|---|
| `snapshotDate` | `string` | Yes | ISO date of refresh cycle. |
| `retailer` | `string` | Yes | Human-readable retailer name for source attribution (FR-010), e.g. `"REWE"`. |
| `retailerSlug` | `string` | Yes | Normalized slug matching the config entry, e.g. `"rewe"`. |
| `trackedProductName` | `string` | Yes | Canonical configured product name that matched. |
| `matchedBy` | `'name' \| 'alias'` | Yes | Indicates canonical or alias-based exact hit. |
| `sourceProductTitle` | `string` | Yes | Original marktguru title for transparency. |
| `price` | `number` | Yes | Offer price (numeric). |
| `oldPrice` | `number \| null` | No | Pre-discount price when available. |
| `priceText` | `string` | Yes | Display-ready price string (e.g. `"1,29 €"`). |
| `imageUrl` | `string \| null` | No | marktguru image CDN URL; `null` if no image available. |
| `validFrom` | `string \| null` | No | Offer validity start (ISO date). |
| `validTo` | `string \| null` | No | Offer validity end (ISO date). |

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
| `postalCode` | `string` | Yes | PLZ used for this snapshot. |
| `offers` | `OfferRecord[]` | Yes | Consolidated matched offers from successful sources. |
| `sourceStatuses` | `SourceRefreshStatus[]` | Yes | Per-source success/failure diagnostics. |
| `errors` | `string[]` | Yes | User-safe error summaries for view state messaging. |
| `configuredProductCount` | `number` | Yes | Total products in config at time of snapshot (distinguishes empty-config from no-match). |

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
  ├── postalCode: string (PLZ for marktguru)
  ├── retailers: string[] (1..2 marktguru slugs)
  └── products: TrackedProduct[] (1:N)

DailyOfferSnapshot
  ├── postalCode: string
  ├── offers: OfferRecord[] (1:N)
  └── sourceStatuses: SourceRefreshStatus[] (always 1 entry: marktguru)
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
