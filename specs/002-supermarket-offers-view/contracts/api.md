# API Contract: Supermarket Offers Snapshot

**Feature**: 002-supermarket-offers-view | **Date**: 2026-05-19

The supermarket offers view is **read-only**. API contract exposes only snapshot retrieval endpoints.

---

## GET /api/supermarket-offers/snapshot

Returns the latest consolidated daily snapshot for configured region, markets, and tracked products.

### Response `200 OK`

```json
{
  "generatedAt": "2026-05-19T05:00:12.000Z",
  "lastSuccessfulAt": "2026-05-19T05:00:12.000Z",
  "stale": false,
  "region": {
    "countryCode": "DE",
    "postalCode": "44135",
    "city": "Dortmund"
  },
  "offers": [
    {
      "snapshotDate": "2026-05-19",
      "market": "Market A",
      "trackedProductName": "banane",
      "matchedBy": "alias",
      "sourceProductTitle": "Bananen",
      "priceText": "1,29 € / kg",
      "validFrom": "2026-05-19",
      "validTo": "2026-05-25"
    }
  ],
  "sourceStatuses": [
    {
      "sourceId": "market-a",
      "ok": true,
      "fetchedAt": "2026-05-19T05:00:10.100Z",
      "error": null
    },
    {
      "sourceId": "market-b",
      "ok": false,
      "fetchedAt": null,
      "error": "Source unavailable"
    }
  ],
  "errors": [
    "market-b refresh failed; showing available results from other sources"
  ]
}
```

### Response `404 Not Found`

No successful snapshot exists yet (initial startup failure and no cache).

```json
{
  "error": "snapshot_unavailable",
  "message": "No offer snapshot available yet. Retry after next refresh."
}
```

### Response `422 Unprocessable Entity`

Configuration invalid for supermarket provider.

```json
{
  "error": "supermarket_config_invalid",
  "message": "providers.supermarket.markets must contain between 1 and 2 entries."
}
```

---

## GET /api/supermarket-offers/health

Optional lightweight endpoint for diagnostics and tests.

### Response `200 OK`

```json
{
  "hasSnapshot": true,
  "stale": false,
  "lastSuccessfulAt": "2026-05-19T05:00:12.000Z",
  "nextRefreshDueAt": "2026-05-20T05:00:12.000Z",
  "enabledSources": ["market-a", "market-b"]
}
```

---

## Contract Rules

- No POST/PUT/PATCH/DELETE endpoints for this feature (view-only UI contract).
- Matching behavior is server-side only and limited to exact normalized canonical names and explicit aliases from `config.json`.
- If refresh fails, server must continue serving previous successful snapshot with `stale: true` and explanatory error messaging.
