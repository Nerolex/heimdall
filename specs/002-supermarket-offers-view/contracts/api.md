# API Contract: Supermarket Offers Snapshot

**Feature**: 002-supermarket-offers-view | **Date**: 2026-05-19  
**Updated**: 2026-05-19 — data source resolved to marktguru.de (`sydev/marktguru` npm)

The supermarket offers view is **read-only**. The API exposes only two snapshot retrieval endpoints. The single upstream data source is [marktguru.de](https://github.com/sydev/marktguru); retailer filtering is done server-side via the `retailers` config key.

---

## Configuration Shape (`config.json`)

```json
{
  "providers": {
    "supermarket": {
      "postalCode": "44135",
      "retailers": ["rewe", "lidl"],
      "products": [
        { "name": "banane",  "aliases": ["Bananen", "Banane"] },
        { "name": "butter",  "aliases": ["Markenbutter", "Deutsche Markenbutter"] },
        { "name": "milch",   "aliases": ["Vollmilch", "H-Milch"] }
      ]
    }
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `postalCode` | `string` | Yes | German PLZ used for regional offer lookup on marktguru. |
| `retailers` | `string[]` | Yes | 1–2 marktguru retailer slugs (e.g. `"rewe"`, `"lidl"`, `"aldi-sued"`, `"aldi-nord"`, `"penny"`, `"netto-marken-discount"`). |
| `products` | `TrackedProduct[]` | Yes | Product watchlist; may be empty (renders explicit empty-config state). |

---

## GET /api/supermarket-offers/snapshot

Returns the latest consolidated daily snapshot for the configured postal code, retailers, and tracked products.

### Response `200 OK`

```json
{
  "generatedAt": "2026-05-19T05:00:12.000Z",
  "lastSuccessfulAt": "2026-05-19T05:00:12.000Z",
  "stale": false,
  "postalCode": "44135",
  "offers": [
    {
      "snapshotDate": "2026-05-19",
      "retailer": "REWE",
      "retailerSlug": "rewe",
      "trackedProductName": "banane",
      "matchedBy": "alias",
      "sourceProductTitle": "Bananen",
      "price": 1.29,
      "oldPrice": 1.79,
      "priceText": "1,29 €",
      "imageUrl": "https://mg2de.b-cdn.net/api/v1/offers/12345/images/default/0/small.jpg",
      "validFrom": "2026-05-19",
      "validTo": "2026-05-25"
    }
  ],
  "sourceStatuses": [
    {
      "sourceId": "marktguru",
      "ok": true,
      "fetchedAt": "2026-05-19T05:00:10.100Z",
      "error": null
    }
  ],
  "errors": []
}
```

**Stale example** (last refresh failed, previous data served):

```json
{
  "generatedAt": "2026-05-20T05:00:08.000Z",
  "lastSuccessfulAt": "2026-05-19T05:00:12.000Z",
  "stale": true,
  "postalCode": "44135",
  "offers": [ "...previous day's offers..." ],
  "sourceStatuses": [
    {
      "sourceId": "marktguru",
      "ok": false,
      "fetchedAt": null,
      "error": "marktguru API key fetch failed"
    }
  ],
  "errors": [
    "Offer data may be outdated. Last successful refresh: 2026-05-19T05:00:12.000Z"
  ]
}
```

### Response `404 Not Found`

No snapshot exists yet (boot failure, no prior cache).

```json
{
  "error": "snapshot_unavailable",
  "message": "No offer snapshot available yet. Retry after next refresh."
}
```

### Response `422 Unprocessable Entity`

Configuration is structurally invalid.

```json
{
  "error": "supermarket_config_invalid",
  "message": "providers.supermarket.retailers must contain between 1 and 2 entries."
}
```

---

## GET /api/supermarket-offers/health

Lightweight diagnostic endpoint.

### Response `200 OK`

```json
{
  "hasSnapshot": true,
  "stale": false,
  "lastSuccessfulAt": "2026-05-19T05:00:12.000Z",
  "nextRefreshDueAt": "2026-05-20T05:00:12.000Z",
  "configuredRetailers": ["rewe", "lidl"],
  "configuredProductCount": 12
}
```

---

## OfferRecord Field Reference

| Field | Type | Source | Description |
|---|---|---|---|
| `snapshotDate` | `string` (ISO date) | Server | Date of the refresh cycle that produced this record. |
| `retailer` | `string` | marktguru `advertisers[0].name` | Human-readable retailer name for source attribution (FR-010). |
| `retailerSlug` | `string` | config `retailers[]` | Normalized slug matching the config entry. |
| `trackedProductName` | `string` | config `products[].name` | The canonical configured product that matched. |
| `matchedBy` | `'name' \| 'alias'` | Server | Whether the match was on canonical name or an explicit alias. |
| `sourceProductTitle` | `string` | marktguru `offer.description` | Original product title from marktguru for transparency. |
| `price` | `number` | marktguru `offer.price` | Current offer price (numeric). |
| `oldPrice` | `number \| null` | marktguru `offer.oldPrice` | Pre-discount price when available. |
| `priceText` | `string` | Server-formatted | Display-ready price string (e.g. `"1,29 €"`). |
| `imageUrl` | `string \| null` | marktguru image CDN | `https://mg2de.b-cdn.net/api/v1/offers/{id}/images/default/0/small.jpg` |
| `validFrom` | `string \| null` | marktguru `validityDates[0].from` | Offer validity start (ISO date). |
| `validTo` | `string \| null` | marktguru `validityDates[0].to` | Offer validity end (ISO date). |

---

## Contract Rules

- No POST/PUT/PATCH/DELETE endpoints — this feature is view-only.
- Matching is server-side only: exact comparison of `normalize(sourceProductTitle)` against `normalize(product.name)` and each `normalize(alias)`. No fuzzy/substring/token matching.
- Duplicate `retailer + trackedProductName + price + validTo` combinations within one snapshot are collapsed to a single record (FR-011).
- On refresh failure the server retains the previous snapshot, sets `stale: true`, and populates `errors[]` with a user-safe message (FR-012).
- `imageUrl` may be `null` if marktguru returns no image for an offer — the dashboard must handle this gracefully.
