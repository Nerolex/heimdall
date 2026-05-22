# Quickstart: City Events View

**Feature**: 003-city-events-view

## Prerequisites

- Node.js 20+
- pnpm
- A city slug from rausgegangen.de (e.g. `dortmund`, `hamburg`, `berlin`, `muenchen`)
- Latitude and longitude for that city

## 1) Configure `config.json`

Add the events provider and one or more events view entries.

```json
{
  "schemaVersion": 2,
  "app": {
    "cycleInterval": 15,
    "viewOrder": "sequential"
  },
  "providers": {
    "events": {
      "city": "dortmund",
      "lat": 51.5136,
      "lng": 7.4653,
      "categories": ["konzert", "theater", "party", "festival"]
    }
  },
  "views": [
    { "type": "clock", "overlay": "none" },
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

### Config rules to verify

- `providers.events.city` must be a valid rausgegangen.de city slug (the path component of `https://rausgegangen.de/{city}`).
- `providers.events.lat` and `lng` are required; they are passed directly to the search API and must be accurate.
- `categories` is optional — an empty array shows all categories. `available-anytime` is always excluded regardless of the categories value.
- `settings.days` is only read for `events-upcoming` view type; defaults to `7` if omitted.
- `skipIfEmpty` is a top-level `ViewEntry` field, not a nested settings key.

## 2) Find your city slug and coordinates

Navigate to `https://rausgegangen.de/` and search for your city. The slug is the URL path segment, for example:
- `https://rausgegangen.de/dortmund` → slug: `dortmund`
- `https://rausgegangen.de/hamburg` → slug: `hamburg`
- `https://rausgegangen.de/muenchen` → slug: `muenchen`

Use a geocoding tool (e.g. [latlong.net](https://www.latlong.net/)) to find the latitude and longitude for the city centre.

## 3) Install and run

```bash
pnpm install
pnpm dev
```

- Dashboard: `http://localhost:5173`
- API server: `http://localhost:3000`

## 4) Verify scraper health

```bash
curl http://localhost:3000/api/events/health
```

Expected: All configured view types show `"ok": true` with a recent `lastSuccessfulAt` timestamp.

## 5) Verify snapshot data

```bash
# Fetch today's events
curl "http://localhost:3000/api/events/snapshot?type=events-today"

# Fetch weekend events
curl "http://localhost:3000/api/events/snapshot?type=events-weekend"

# Fetch upcoming 7-day events
curl "http://localhost:3000/api/events/snapshot?type=events-upcoming"
```

Expected response shape:
```json
{
  "viewType": "events-today",
  "city": "dortmund",
  "stale": false,
  "events": [
    {
      "title": "...",
      "categorySlug": "konzert",
      "categoryLabel": "Konzert",
      "date": "2025-07-14",
      "dateDisplay": "Mo., 14. Jul.",
      "venueAndTime": "Konzerthaus Dortmund | 20:00 Uhr",
      "recurrenceNote": null,
      "detailUrl": "https://rausgegangen.de/events/..."
    }
  ]
}
```

## 6) Verify category filtering

1. Set `categories: ["konzert"]` in `providers.events`.
2. Restart Heimdall (or wait for next refresh cycle).
3. Confirm the snapshot endpoint returns only events with `categorySlug: "konzert"`.
4. Set `categories: []`.
5. Confirm the snapshot returns all categories except `available-anytime`.

## 7) Verify `skipIfEmpty` behaviour

1. Set `categories` to an obscure slug unlikely to match real events (e.g. `["xyznonexistent"]`).
2. Restart; confirm the snapshot returns `"events": []`.
3. Confirm the `events-today` view is hidden from the dashboard rotation when `skipIfEmpty: true`.
4. Confirm the `events-upcoming` view is visible with an empty-state message when `skipIfEmpty: false`.

## 8) Verify stale fallback

1. Start with at least one successful snapshot.
2. Make the source temporarily unreachable (e.g. block the URL via `/etc/hosts` or use an invalid city slug).
3. Trigger a refresh (restart or wait for the 24h cycle).
4. Confirm the previous snapshot is still served with `"stale": true` and an error summary in `errors[]`.
5. Confirm no other views or widgets are affected.

## 9) Verify pagination

1. Use a city and time window where more than 10 events are expected (e.g. `events-upcoming` with `days: 14` for a major city like Hamburg or Berlin).
2. Confirm that `totalFetched` in the snapshot response is >10 and `events` contains more than 10 items.

## 10) Verify `events-weekend` date window

1. Run the dashboard on a Wednesday.
2. Confirm `windowStart` and `windowEnd` in the `events-weekend` snapshot point to the coming Saturday and Sunday (not the past weekend).
3. Run (or simulate) on a Saturday — confirm `windowStart` is today and `windowEnd` is tomorrow.
