# Data Model: City Events View

**Feature**: 003-city-events-view | **Date**: 2025-07-14

## Entities

### EventsProviderConfig

Grouped configuration section under `config.json → providers.events`.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `city` | `string` | Yes | Non-empty slug (e.g. `"dortmund"`) | City slug used in rausgegangen.de URL path and search payload. |
| `lat` | `number` | Yes | Valid latitude (-90..90) | City latitude passed to search API. |
| `lng` | `number` | Yes | Valid longitude (-180..180) | City longitude passed to search API. |
| `categories` | `string[]` | No | May be empty; values are lowercased slugs | Category whitelist. Empty = show all categories (excluding `available-anytime`). |

**Validation rules**:
- Must reject config when `city` is missing or empty string.
- Must reject config when `lat` is outside [-90, 90] or `lng` is outside [-180, 180].
- `categories` defaults to `[]` (all categories shown, except `available-anytime`).
- `available-anytime` is stripped from `categories` at config normalisation time; it is never a valid whitelist entry unless explicitly added back (FR-005).

**Known valid category slugs** (non-exhaustive): `konzert`, `theater`, `party`, `kunst`, `lesung`, `film`, `sport`, `festival`, `comedy`, `ausstellung`, `kinder`, `fuehrung`

---

### EventsViewSettings

Per-view settings stored in `ViewEntry.settings` for events view types.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `days` | `number` | No | `7` | Only for `events-upcoming`: number of calendar days ahead (inclusive of today). |

**Note**: `skipIfEmpty` lives on the parent `ViewEntry` (shared framework field), not in `settings`.

---

### RawEventRecord

Normalised representation of a single event object returned by `POST /api/v1/search`.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | rausgegangen event ID (numeric string). |
| `title` | `string` | Yes | Event title. |
| `categorySlug` | `string` | Yes | Category slug from API (e.g. `"konzert"`). |
| `date` | `string` | Yes | Event date in `YYYY-MM-DD` format (Berlin timezone). |
| `description` | `string` | Yes | Raw description field; typically contains venue and time (e.g. `"Konzerthaus | 20:00 Uhr"`). |
| `additionalInfos` | `string \| null` | No | Recurrence note (e.g. `"+ 10 Termine"`) when present. |
| `slug` | `string` | Yes | URL slug for detail page; stored as relative path `/events/{slug}`. |

**Validation rules**:
- Records with a `date` outside the requested window are discarded after fetch.
- Records with `categorySlug === 'available-anytime'` are discarded unless explicitly whitelisted.

---

### EventRecord

Dashboard-facing representation of a single event (sent via API to the dashboard).

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | rausgegangen event ID. |
| `title` | `string` | Yes | Event title. |
| `categorySlug` | `string` | Yes | Normalised category slug. |
| `categoryLabel` | `string` | Yes | Human-readable category label (title-cased slug, e.g. `"Konzert"`). |
| `date` | `string` | Yes | Event date `YYYY-MM-DD`. |
| `dateDisplay` | `string` | Yes | Formatted date for display (e.g. `"Mo., 14. Jul."`). |
| `venueAndTime` | `string \| null` | No | Extracted venue+time string from `description`; `null` if not parseable. |
| `rawDescription` | `string` | Yes | Original description fallback (shown when `venueAndTime` is `null`). |
| `recurrenceNote` | `string \| null` | No | Recurrence note from `additionalInfos` (e.g. `"+ 10 Termine"`). |
| `detailUrl` | `string` | Yes | Absolute URL to event detail page (`https://rausgegangen.de/events/{slug}`). |

**Validation rules**:
- `venueAndTime` is populated by splitting `description` on `" | "` — left part = venue, right part = time. If the pattern is absent, `venueAndTime` is `null` and `rawDescription` is shown.
- `categoryLabel` is derived as `categorySlug[0].toUpperCase() + categorySlug.slice(1).replace(/-/g, ' ')`.
- No fuzzy or partial matching on any field.

---

### EventsViewSnapshot

Server-side cached snapshot for a single city + view-type combination.

| Field | Type | Required | Description |
|---|---|---|---|
| `viewType` | `'events-today' \| 'events-weekend' \| 'events-upcoming'` | Yes | View type this snapshot was generated for. |
| `city` | `string` | Yes | City slug used for this snapshot. |
| `windowStart` | `string` | Yes | First date of the event window (`YYYY-MM-DD`). |
| `windowEnd` | `string` | Yes | Last date of the event window (`YYYY-MM-DD`). |
| `generatedAt` | `string` | Yes | ISO timestamp of latest refresh attempt. |
| `lastSuccessfulAt` | `string \| null` | Yes | ISO timestamp of last successful refresh; `null` if never succeeded. |
| `stale` | `boolean` | Yes | `true` when latest refresh attempt failed and prior data is being served. |
| `events` | `EventRecord[]` | Yes | Filtered, ordered event list (chronological by date). |
| `totalFetched` | `number` | Yes | Total raw events fetched before category filtering (diagnostic). |
| `errors` | `string[]` | Yes | User-safe error summaries; empty on success. |

---

### RefreshStatus

Diagnostic metadata for the most recent refresh cycle (returned in health endpoint).

| Field | Type | Required | Description |
|---|---|---|---|
| `viewType` | `string` | Yes | View type identifier. |
| `ok` | `boolean` | Yes | Whether the most recent refresh cycle succeeded. |
| `lastAttemptAt` | `string \| null` | Yes | ISO timestamp of most recent attempt. |
| `lastSuccessfulAt` | `string \| null` | Yes | ISO timestamp of most recent success. |
| `error` | `string \| null` | Yes | User-safe failure reason when `ok` is `false`. |

---

## Relationships

```text
EventsProviderConfig
  ├── city: string (slug → rausgegangen URL + search payload)
  ├── lat: number
  ├── lng: number
  └── categories: string[] (whitelist applied post-fetch)

EventsViewSnapshot (one per active view type)
  ├── city: string (← from provider config)
  ├── viewType: 'events-today' | 'events-weekend' | 'events-upcoming'
  ├── windowStart / windowEnd: string (computed from viewType + date of refresh)
  └── events: EventRecord[] (1:N, filtered and ordered)
```

---

## State Transitions

### Refresh Lifecycle

```text
[BOOT]
  │
  ├── startup refresh success ──────────▶ SNAPSHOT_READY (stale=false)
  └── startup refresh fail + no cache ──▶ SNAPSHOT_ERROR (no data)
                            │
                            └── fail + prior success exists ──▶ SNAPSHOT_READY (stale=true)

SNAPSHOT_READY
  │
  ├── scheduled 24h refresh success ────▶ SNAPSHOT_READY (stale=false, data replaced)
  └── scheduled 24h refresh failure ────▶ SNAPSHOT_READY (stale=true, last success retained)

SNAPSHOT_ERROR
  └── next successful refresh ──────────▶ SNAPSHOT_READY (stale=false)
```

### View Rendering States

```text
LOADING
  ├── snapshot unavailable + error ───────▶ ERROR_STATE    ("Events unavailable")
  ├── snapshot present + events.length=0  ─▶ EMPTY_STATE   (hidden if skipIfEmpty=true)
  └── snapshot present + events.length>0  ─▶ EVENTS_STATE

EVENTS_STATE
  └── snapshot.stale=true ─────────────────▶ STALE_BANNER overlay
```

### `skipIfEmpty` Integration

The events view components call `settings.__onEmpty()` (existing framework contract on `ViewEntry`) when rendering `EMPTY_STATE`, which signals the view cycling engine to skip this view when `skipIfEmpty: true` is configured.
