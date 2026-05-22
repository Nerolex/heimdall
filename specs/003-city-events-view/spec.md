# Feature Specification: City Events View

**Feature Branch**: `003-city-events-view`
**Created**: 2025-07-14
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Today's Events at a Glance (Priority: P1)

A Heimdall dashboard user wants to see what's happening in their city today so they can spontaneously plan their evening without leaving the dashboard.

**Why this priority**: The "today" view is the most time-sensitive and highest-value slice of the feature. It delivers immediate, actionable information and represents the core reason someone would add a city events widget to their home dashboard.

**Independent Test**: Can be fully tested by configuring the `events-today` view type with a city and category filter, restarting Heimdall, and verifying that today's filtered events appear in a readable list on the dashboard.

**Acceptance Scenarios**:

1. **Given** the dashboard is configured with an `events-today` view for a city, **When** the dashboard loads, **Then** a list of events happening today is displayed, each showing title, category, date, and venue.
2. **Given** a category whitelist is configured, **When** events are fetched, **Then** only events matching the configured categories are shown.
3. **Given** no events match the configured categories today, **When** `skipIfEmpty: true` is set, **Then** the view is hidden entirely from the dashboard layout.
4. **Given** no events match the configured categories today, **When** `skipIfEmpty: false` is set (or not set), **Then** the view renders an empty-state message (e.g., "No events today").
5. **Given** the data was already fetched earlier the same day, **When** the dashboard reloads, **Then** the cached event list is served without re-fetching from the source.

---

### User Story 2 — Weekend Events Planning (Priority: P2)

A Heimdall user wants to browse events for the upcoming Saturday and Sunday so they can plan activities in advance.

**Why this priority**: Weekend planning is a natural complement to the today view. It allows forward-looking use and covers the most popular days for leisure events.

**Independent Test**: Can be fully tested by configuring the `events-weekend` view type, verifying only Saturday and Sunday events are displayed, regardless of the current day of the week.

**Acceptance Scenarios**:

1. **Given** an `events-weekend` view is configured, **When** the dashboard loads on any weekday, **Then** events for the coming Saturday and Sunday are displayed.
2. **Given** an `events-weekend` view is configured, **When** the dashboard loads on a Saturday, **Then** events for that Saturday and the following Sunday are displayed.
3. **Given** category filters are configured, **When** weekend events are fetched, **Then** only events in the configured categories are shown.
4. **Given** no weekend events match the filter, **When** `skipIfEmpty: true` is set, **Then** the view is hidden.

---

### User Story 3 — Upcoming Events Over N Days (Priority: P3)

A Heimdall user wants to see a rolling window of events for the next several days so they can stay aware of upcoming activities beyond just today or the weekend.

**Why this priority**: Provides flexibility for users who want a broader horizon (e.g., next 7 days). Builds on the P1 and P2 infrastructure with a configurable time window.

**Independent Test**: Can be fully tested by configuring `events-upcoming` with a `days` value (e.g., 7), verifying the list spans that many calendar days and respects category filters.

**Acceptance Scenarios**:

1. **Given** an `events-upcoming` view is configured with `days: 7`, **When** the dashboard loads, **Then** events for the next 7 days (from today inclusive) are displayed.
2. **Given** an `events-upcoming` view is configured, **When** events are fetched, **Then** events are presented in chronological order by date.
3. **Given** category filters are configured, **When** the upcoming list is rendered, **Then** only events matching configured categories appear.
4. **Given** `days` is not explicitly configured, **When** the view renders, **Then** a sensible default window (7 days) is used.

---

### Edge Cases

- What happens when the city slug is not found on rausgegangen.de? → The view renders an error state indicating the city could not be resolved; no crash occurs.
- What happens if the CSRF cookie fetch fails? → The view renders an error/unavailable state; the daily refresh retry will attempt recovery at the next cycle.
- What happens when the search API returns zero results (not a filter match issue, but a genuine empty response)? → The empty-state logic applies the same as a filtered-empty result.
- What happens when the event description contains no recognisable venue or time? → The field is omitted gracefully from the card; no broken layout.
- What happens when the `categories` array is empty? → All categories are shown (empty = no filter applied = show everything, excluding `available-anytime` by default).
- What happens with recurring events (those with `additional_infos` such as "+ 10 Termine")? → They are displayed like regular events with the recurrence note shown as supplementary text; deduplication is not required in v1.
- What happens when pagination is needed (more than 10 results from the API)? → The system fetches additional pages via offset until the relevant time window is covered or a reasonable result cap is reached.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support three view types for city events: `events-today`, `events-weekend`, and `events-upcoming`.
- **FR-002**: The system MUST fetch events server-side from rausgegangen.de by first obtaining a CSRF session cookie from the city landing page, then querying the search endpoint with city, latitude, and longitude parameters.
- **FR-003**: The system MUST cache fetched event data and refresh it at most once per day, aligned with the existing daily-refresh pattern used by other Heimdall views.
- **FR-004**: The system MUST filter displayed events to only those matching the configured `categories` whitelist; an empty `categories` list MUST show all categories.
- **FR-005**: The `available-anytime` category MUST be excluded by default and MUST NOT be included unless explicitly listed in the `categories` config.
- **FR-006**: Each displayed event card MUST show: event title, category label, date (day + month), and venue/time extracted from the event description field.
- **FR-007**: The system MUST support `skipIfEmpty: true` — when configured, a view with no matching events after filtering MUST be hidden from the dashboard entirely.
- **FR-008**: The `events-upcoming` view type MUST support a configurable `days` parameter controlling how many calendar days ahead to include; the default MUST be 7 days when not specified.
- **FR-009**: Event results spanning multiple API pages MUST be collected via offset-based pagination until the relevant time window is covered.
- **FR-010**: When the data source is unreachable or returns an error, the view MUST display an error/unavailable state rather than crashing the dashboard.
- **FR-011**: The feature MUST be configured under the `providers.events` key in `config.json` with at minimum: `city` (slug), `lat`, `lng`, and `categories` fields.
- **FR-012**: Event images MUST NOT be fetched in v1 (detail-page scraping is out of scope); event cards are displayed without images.
- **FR-013**: Recurring event indicators (e.g. `additional_infos` containing "+ N Termine") MUST be displayed as supplementary text on the event card.

### Key Entities

- **Event**: Represents a single city event. Key attributes: unique ID, title, category slug, date (day + month), description (contains venue and datetime), recurrence info, detail URL.
- **EventsProvider**: Configuration entity. Attributes: city slug, latitude, longitude, category whitelist.
- **EventsView**: A dashboard view instance. Attributes: view type (`events-today` | `events-weekend` | `events-upcoming`), `days` (for upcoming), `skipIfEmpty` flag.
- **EventsCache**: Server-side cached response. Attributes: city slug, view type, fetched-at timestamp, event list payload.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The dashboard displays city events within 2 seconds of page load when data is already cached.
- **SC-002**: Fresh event data is available on the dashboard within 24 hours of a city's event schedule changing, given the daily refresh cycle.
- **SC-003**: All three view types (`events-today`, `events-weekend`, `events-upcoming`) render correctly with correctly filtered event lists across at least 3 different configured cities.
- **SC-004**: When `skipIfEmpty: true` is configured and no events match the filter, the view does not appear in the dashboard layout in 100% of cases.
- **SC-005**: Category filtering reduces the displayed event list to only matching entries with 100% accuracy (no false inclusions, no false exclusions relative to the configured whitelist).
- **SC-006**: The dashboard remains fully operational when the events data source is temporarily unavailable — no other views or widgets are affected.
- **SC-007**: Pagination works correctly such that when more than 10 events exist for a given time window, all relevant events are collected and displayed (not capped at 10).

## Assumptions

- The rausgegangen.de scraping approach is acceptable for personal/self-hosted use; no commercial or public deployment is intended.
- The CSRF cookie obtained from the city landing page is valid for the duration of a single daily fetch cycle; no mid-day token refresh is needed.
- The existing Heimdall provider/view/cache infrastructure (as used by the supermarket offers view) will be reused and extended for the events feature.
- Event data structure returned by `POST /api/v1/search` remains stable; no version negotiation is required.
- The `description` field reliably contains venue and datetime information in a parseable format (e.g., "Venue Name | DD.MM.YYYY HH:mm"); if parsing fails, the raw description is displayed as-is.
- Timezone is assumed to be Europe/Berlin (where rausgegangen.de operates); no multi-timezone support is required.
- The `events-weekend` view always refers to the *next* upcoming Saturday and Sunday, not the *current* calendar week's weekend if those days have already passed.
- `available-anytime` events are non-time-specific (e.g., permanent exhibitions, always-open venues) and are excluded by default since they are not meaningful for a time-filtered events view.
- Up to ~50 events per view type is a reasonable display cap for v1; beyond this, the oldest/least-relevant results may be dropped without user impact.
- Event detail page URLs are relative paths on rausgegangen.de; they are stored as-is and not followed or pre-fetched in v1.
