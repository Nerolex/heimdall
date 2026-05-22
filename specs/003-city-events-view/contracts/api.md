# API Contract: City Events Snapshot

**Feature**: 003-city-events-view | **Date**: 2025-07-14

The city events view is **read-only**. The API exposes two endpoints per view type: a snapshot retrieval endpoint and a lightweight health endpoint. The upstream data source is [rausgegangen.de](https://rausgegangen.de); scraping, filtering, and caching are handled entirely server-side.

---

## Configuration Shape (`config.json`)

```json
{
  "providers": {
    "events": {
      "city": "dortmund",
      "lat": 51.5136,
      "lng": 7.4653,
      "categories": ["konzert", "theater", "party", "festival"]
    }
  },
  "views": [
    {
      "type": "events-today",
      "skipIfEmpty": true,
      "settings": {}
    },
    {
      "type": "events-weekend",
      "skipIfEmpty": true,
      "settings": {}
    },
    {
      "type": "events-upcoming",
      "skipIfEmpty": false,
      "settings": { "days": 7 }
    }
  ]
}
```

### Provider Config Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `city` | `string` | Yes | rausgegangen.de city slug (path component of the city landing page URL). |
| `lat` | `number` | Yes | City latitude for search API payload. |
| `lng` | `number` | Yes | City longitude for search API payload. |
| `categories` | `string[]` | No | Category whitelist (lowercased slugs). Empty array = show all. `available-anytime` excluded unless explicitly listed. |

### View Settings Fields

| Field | Type | View type | Default | Description |
|---|---|---|---|---|
| `days` | `number` | `events-upcoming` only | `7` | Number of calendar days ahead to include (inclusive of today). |

---

## GET /api/events/snapshot

Returns the latest cached event snapshot for the given view type.

### Query Parameters

| Parameter | Type | Required | Values |
|---|---|---|---|
| `type` | `string` | Yes | `events-today` \| `events-weekend` \| `events-upcoming` |

### Response `200 OK`

```json
{
  "viewType": "events-today",
  "city": "dortmund",
  "windowStart": "2025-07-14",
  "windowEnd": "2025-07-14",
  "generatedAt": "2025-07-14T05:00:04.000Z",
  "lastSuccessfulAt": "2025-07-14T05:00:04.000Z",
  "stale": false,
  "events": [
    {
      "id": "847291",
      "title": "The National – Live in Concert",
      "categorySlug": "konzert",
      "categoryLabel": "Konzert",
      "date": "2025-07-14",
      "dateDisplay": "Mo., 14. Jul.",
      "venueAndTime": "Konzerthaus Dortmund | 20:00 Uhr",
      "rawDescription": "Konzerthaus Dortmund | 20:00 Uhr",
      "recurrenceNote": null,
      "detailUrl": "https://rausgegangen.de/events/the-national-live-in-concert-dortmund"
    },
    {
      "id": "849003",
      "title": "Sommerfest im Westpark",
      "categorySlug": "festival",
      "categoryLabel": "Festival",
      "date": "2025-07-14",
      "dateDisplay": "Mo., 14. Jul.",
      "venueAndTime": "Westpark Dortmund | 15:00 Uhr",
      "rawDescription": "Westpark Dortmund | 15:00 Uhr",
      "recurrenceNote": "+ 3 Termine",
      "detailUrl": "https://rausgegangen.de/events/sommerfest-im-westpark"
    }
  ],
  "totalFetched": 12,
  "errors": []
}
```

**Stale example** (last refresh failed, previous day's data served):

```json
{
  "viewType": "events-today",
  "city": "dortmund",
  "windowStart": "2025-07-15",
  "windowEnd": "2025-07-15",
  "generatedAt": "2025-07-15T05:00:09.000Z",
  "lastSuccessfulAt": "2025-07-14T05:00:04.000Z",
  "stale": true,
  "events": [ "...previous day's filtered events..." ],
  "totalFetched": 12,
  "errors": [
    "Event data may be outdated. Last successful refresh: 2025-07-14T05:00:04.000Z"
  ]
}
```

**Empty result** (snapshot loaded but 0 events pass filter):

```json
{
  "viewType": "events-today",
  "city": "dortmund",
  "windowStart": "2025-07-14",
  "windowEnd": "2025-07-14",
  "generatedAt": "2025-07-14T05:00:04.000Z",
  "lastSuccessfulAt": "2025-07-14T05:00:04.000Z",
  "stale": false,
  "events": [],
  "totalFetched": 5,
  "errors": []
}
```

### Response `404 Not Found`

No snapshot exists yet (e.g., boot failure before first successful refresh).

```json
{
  "error": "snapshot_unavailable",
  "message": "No events snapshot available yet for type 'events-today'. Retry after next refresh."
}
```

### Response `400 Bad Request`

Invalid or missing `type` parameter.

```json
{
  "error": "invalid_view_type",
  "message": "Query parameter 'type' must be one of: events-today, events-weekend, events-upcoming."
}
```

### Response `422 Unprocessable Entity`

Events provider configuration is structurally invalid.

```json
{
  "error": "events_config_invalid",
  "message": "providers.events.city is required and must be a non-empty string."
}
```

---

## GET /api/events/health

Lightweight diagnostic endpoint showing refresh status per active view type.

### Response `200 OK`

```json
{
  "city": "dortmund",
  "configuredCategories": ["konzert", "theater", "party", "festival"],
  "viewTypes": [
    {
      "viewType": "events-today",
      "ok": true,
      "lastAttemptAt": "2025-07-14T05:00:04.000Z",
      "lastSuccessfulAt": "2025-07-14T05:00:04.000Z",
      "error": null
    },
    {
      "viewType": "events-weekend",
      "ok": true,
      "lastAttemptAt": "2025-07-14T05:00:06.000Z",
      "lastSuccessfulAt": "2025-07-14T05:00:06.000Z",
      "error": null
    },
    {
      "viewType": "events-upcoming",
      "ok": false,
      "lastAttemptAt": "2025-07-14T05:00:08.000Z",
      "lastSuccessfulAt": "2025-07-13T05:00:07.000Z",
      "error": "CSRF cookie fetch failed: connection timeout"
    }
  ]
}
```

---

## EventRecord Field Reference

| Field | Type | Source | Description |
|---|---|---|---|
| `id` | `string` | rausgegangen `event.id` | Unique event identifier. |
| `title` | `string` | rausgegangen `event.title` | Event name. |
| `categorySlug` | `string` | rausgegangen `event.category_slug` | Normalised category identifier. |
| `categoryLabel` | `string` | Server-derived | Human-readable category (title-cased slug). |
| `date` | `string` (ISO date) | rausgegangen `event.date` | Event date in `YYYY-MM-DD`. |
| `dateDisplay` | `string` | Server-formatted | Localised date string for dashboard display (Europe/Berlin locale). |
| `venueAndTime` | `string \| null` | Parsed from `event.description` | Venue + time extracted on `" \| "` split; `null` if not present. |
| `rawDescription` | `string` | rausgegangen `event.description` | Original description for fallback display. |
| `recurrenceNote` | `string \| null` | rausgegangen `event.additional_infos` | Recurrence indicator string, or `null`. |
| `detailUrl` | `string` | Server-constructed | Full URL: `https://rausgegangen.de/events/{event.slug}`. |

---

## Scraper Flow (internal reference for implementers)

```
1. GET https://rausgegangen.de/{city}
   → Extract Set-Cookie header value (session/CSRF cookie)
   → Extract CSRF token from cookie or response meta tag

2. For each page (offset = 0, 10, 20 … until window end date exceeded or cap reached):
   POST https://rausgegangen.de/api/v1/search
   Headers:
     Cookie: <session-cookie>
     X-CSRF-Token: <token>
     Content-Type: application/json
   Body:
     { "city": "<slug>", "lat": <lat>, "lng": <lng>,
       "date": "<YYYY-MM-DD>", "limit": 10, "offset": <N> }
   → Collect events; stop when last event.date > windowEnd or response is empty

3. Filter: discard events where date < windowStart or date > windowEnd
4. Filter: apply category whitelist (empty = all); always exclude available-anytime
5. Sort ascending by date
6. Cap at 50 events
7. Store EventsViewSnapshot
```
