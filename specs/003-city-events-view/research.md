# Research: City Events View

**Feature**: 003-city-events-view | **Date**: 2025-07-14

## R0: Data Source — rausgegangen.de Scraping Approach

**Decision**: Scrape rausgegangen.de via a two-step HTTP flow: (1) GET the city landing page (`https://rausgegangen.de/{city-slug}`) to acquire a CSRF session cookie, then (2) POST to `/api/v1/search` with the city slug, latitude, longitude, and a date range payload, using the acquired cookie as a session credential.

**Rationale**: rausgegangen.de does not expose a public documented API. The search endpoint is CSRF-protected via a cookie+header pair obtained from the landing page. This is the minimal viable scraping pattern: no JavaScript rendering required, no binary parsing, no authentication account needed. The server-side fetch keeps the CSRF secret entirely off the client.

**Implementation detail**:
- Step 1 — `GET https://rausgegangen.de/{city}` → extract `Set-Cookie` header, store the relevant session cookie value (typically `_rg_session` or similar `csrf_token` cookie).
- Step 2 — `POST https://rausgegangen.de/api/v1/search` with `Content-Type: application/json` and headers:
  - `Cookie: <session-cookie>`
  - `X-CSRF-Token: <token-value>` (extracted from cookie or page meta tag)
  - Body: `{ "city": "<slug>", "lat": <lat>, "lng": <lng>, "date": "<YYYY-MM-DD>", "limit": 10, "offset": 0 }`
- Response: JSON array of event objects. Fields used: `id`, `title`, `category_slug`, `date`, `description`, `additional_infos`, `slug` (for detail URL).

**ToS note**: Unofficial scraping. Acceptable for personal/self-hosted use; no public or commercial deployment intended.

**Alternatives considered**:
- **Browser automation (Puppeteer/Playwright server-side)**: Rejected — adds a heavy runtime dependency, no requirement for JS-rendered content; native HTTP fetch is sufficient.
- **Third-party events aggregator**: No German city events aggregator with a free/open API was found that covers the breadth of rausgegangen.de.
- **Using ical/RSS feeds from city portals**: German city portals (e.g., Dortmund, Hamburg) provide fragmented iCal feeds with poor category coverage; rausgegangen.de covers all major cities with consistent structure.

---

## R1: Date Window Computation

**Decision**: Compute date windows server-side in the Europe/Berlin timezone using the `Intl` API (Node 20 built-in, no `date-fns` or `luxon` required).

| View type | Window logic |
|-----------|-------------|
| `events-today` | `[today, today]` — single date |
| `events-weekend` | `[next Saturday, next Sunday]` — if today is Saturday, window is `[today, tomorrow]`; if today is Sunday, window is `[today, today]` |
| `events-upcoming` | `[today, today + (days - 1)]` — configurable, default 7 days |

**Rationale**: All logic is a few lines of deterministic date arithmetic. The `Intl.DateTimeFormat` API handles Europe/Berlin timezone offset reliably in Node 20+ without additional dependencies. The window definitions match spec acceptance scenarios exactly (US2 AC2, US3 AC1/AC4).

**Alternatives considered**:
- **`date-fns-tz`**: Rejected — adds a dependency for what is achievable natively in Node 20.
- **UTC-only computation**: Rejected — events are Berlin-local; UTC arithmetic would produce off-by-one date errors around midnight.

---

## R2: Pagination Strategy

**Decision**: Fetch pages from `/api/v1/search` using `offset`-based pagination (incrementing by `limit` = 10 per request) until the last item on the current page falls outside the target date window, or a hard cap of 50 events is reached, whichever comes first.

**Rationale**: FR-009 requires collecting all relevant events beyond the first 10. rausgegangen.de's search endpoint returns results in ascending date order; once a page contains an event beyond the window end date, no further pages need to be fetched. The 50-event cap is consistent with the spec assumption (Assumption §10) and prevents runaway fetches.

**Alternatives considered**:
- **Fetch only first page**: Rejected — violates FR-009 (SC-007 would fail for cities with >10 events per window).
- **Unlimited pagination**: Rejected — no practical cap creates risk of excessive requests to the source for very popular cities.

---

## R3: Category Whitelist Filtering

**Decision**: Apply category filtering client-side on the server (after fetching all pages) by comparing each event's `category_slug` against the normalized `categories` array from config. An empty `categories` config array means *show all categories*, but `available-anytime` is always excluded unless explicitly listed.

**Rationale**: The search API does not appear to support server-side category filtering. Client-side filtering after a full paginated fetch is simpler and keeps the adapter surface minimal. The `available-anytime` default exclusion is required by FR-005 and consistent with the spec assumption that these are non-time-specific entries.

**Normalization rule**: Config category strings and API `category_slug` values are both lowercased and trimmed before comparison. No fuzzy matching.

**Alternatives considered**:
- **Server-side category parameter in API query**: Not confirmed as a supported filter parameter; the approach is unreliable without API documentation.
- **Including `available-anytime` by default**: Rejected — spec FR-005 is explicit; these events would render confusingly in time-bounded views.

---

## R4: Daily Refresh Scheduling

**Decision**: Server-triggered refresh once per 24 hours with an immediate startup refresh attempt per city+view-type combination. The scheduler runs inside the existing Fastify server process using `setInterval`.

**Rationale**: Mirrors the supermarket offers refresh pattern (R2 in 002-supermarket-offers-view/research.md). A startup attempt avoids stale-on-boot scenarios. Daily cadence satisfies FR-003 and SC-002.

**Shared design with 002**: same `snapshotStore` pattern (in-memory + persisted JSON file); same stale-flag + `lastSuccessfulAt` metadata structure.

**Alternatives considered**:
- **Fixed wall-clock time refresh (e.g., 05:00 daily)**: Rejected for v1 — adds timezone/scheduler complexity with no requirement benefit; rolling 24h window is sufficient.
- **Per-request on-demand refresh**: Rejected — violates FR-003's daily cadence constraint and would cause latency spikes on dashboard load.

---

## R5: Configuration Shape

**Decision**: Events provider config stored under `providers.events` in `config.json`. View instances reference three new view type strings (`events-today`, `events-weekend`, `events-upcoming`) in the `views` array with view-type-specific settings.

```json
{
  "providers": {
    "events": {
      "city": "dortmund",
      "lat": 51.5136,
      "lng": 7.4653,
      "categories": ["konzert", "theater", "party"]
    }
  },
  "views": [
    { "type": "events-today",   "skipIfEmpty": true,  "settings": {} },
    { "type": "events-weekend", "skipIfEmpty": true,  "settings": {} },
    { "type": "events-upcoming","skipIfEmpty": false, "settings": { "days": 7 } }
  ]
}
```

**Rationale**: Follows existing `providers.*` grouping convention (matching weather, calendar, plex, etc.). View-level settings (`days`, `skipIfEmpty`) live on the `ViewEntry` to allow multiple configured instances with different windows.

**Alternatives considered**:
- **Per-view-instance city config**: Rejected — multi-city is out of scope for v1; a single provider config keeps it simple.
- **New standalone config file**: Rejected to avoid config fragmentation.

---

## R6: View Rendering States

**Decision**: Each events view renders exactly four states: `ready`, `empty`, `error`, `stale`. No user interaction elements in any state.

| State | Trigger | Rendered content |
|-------|---------|-----------------|
| `ready` | Snapshot has ≥1 matching event | Event card list |
| `empty` | Snapshot loaded but 0 matching events after filter | "No events" message; hidden if `skipIfEmpty: true` |
| `error` | No snapshot available (boot failure, no cache) | Error/unavailable message |
| `stale` | Snapshot present but `stale: true` | Event list + stale banner |

**Alternatives considered**:
- **Hide all errors and show nothing**: Rejected — FR-010 requires a visible error/unavailable state.
- **Inline category filter toggle**: Rejected — view-only constraint (constitution Principle I + spec FR-001).

---

## Clarification Resolution Summary

All technical unknowns are resolved:
- Scraping approach: resolved (CSRF cookie + POST search, native fetch)
- Date window computation: resolved (Berlin timezone, deterministic arithmetic)
- Pagination: resolved (offset loop, 50-event cap)
- Category filtering: resolved (client-side post-fetch, `available-anytime` excluded by default)
- Refresh scheduling: resolved (startup + 24h, same pattern as 002)
- Config shape: resolved (`providers.events` with view-level `settings.days`)
- View states: resolved (ready / empty / error / stale)

No `NEEDS CLARIFICATION` items remain.
