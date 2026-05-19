# Feature Specification: Supermarket Offers View

**Feature Branch**: `002-supermarket-offers-view`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "Add a new Heimdall dashboard view for supermarket offers. View-only dashboard behavior (no interactive searching/input in UI). Data sources should be live sources for initially 1-2 markets. Market/region should be configurable (not hardcoded to one city/PLZ). Product list is configured in config.json (no free search in view). Refresh cadence: once daily."

## Clarifications

### Session 2026-05-19

- Q: What is the canonical product matching rule for v1? → A: Exact normalized product name + explicit aliases in config.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See Daily Offers at a Glance (Priority: P1)

A household user opens Heimdall and sees a dedicated supermarket offers view that shows current offers for their configured products, without any manual interaction.

**Why this priority**: This is the primary value of the feature: passive, glanceable offer visibility for known products.

**Independent Test**: Configure one market, one region, and three products in `config.json`; start the dashboard and verify the offers view renders matching daily offers without any user input.

**Acceptance Scenarios**:

1. **Given** a valid supermarket offers configuration, **When** the dashboard cycles to the supermarket offers view, **Then** the view displays current offers for configured products.
2. **Given** the dashboard is running in normal cycle mode, **When** the supermarket offers view is displayed, **Then** the user is not prompted for search text or any interactive input.
3. **Given** no matching offers are available for configured products, **When** the view renders, **Then** the user sees a clear "no offers found" state rather than an empty/broken layout.

---

### User Story 2 - Configure Region and Markets (Priority: P1)

A user configures which region/market context should be used and which 1-2 live supermarket sources to include, so the displayed offers reflect local availability.

**Why this priority**: Locality is essential for usefulness; offers from the wrong region are low value.

**Independent Test**: Configure two different region values in separate runs and confirm the shown offers differ according to region and selected markets.

**Acceptance Scenarios**:

1. **Given** a configured region and one enabled market source, **When** the daily data refresh runs, **Then** only offers relevant to that region and source are shown.
2. **Given** two enabled market sources, **When** offers are displayed, **Then** the view includes results from both sources in a single consolidated display.
3. **Given** an unsupported or invalid region configuration, **When** data refresh runs, **Then** the system surfaces a user-friendly error state for the view.

---

### User Story 3 - Manage Tracked Products via Configuration (Priority: P2)

A user edits `config.json` to define the product list to monitor, and the view updates to only show offers for those configured products.

**Why this priority**: Product targeting controls relevance and avoids noisy, generic offer feeds.

**Independent Test**: Change the configured product list from set A to set B and verify that only products in set B appear after the next refresh/display cycle.

**Acceptance Scenarios**:

1. **Given** a configured product list in `config.json`, **When** offers are rendered, **Then** only offers matching configured products are shown.
2. **Given** the product list is empty, **When** the view loads, **Then** the user sees a clear message explaining that no products are configured.
3. **Given** duplicate product entries in configuration, **When** offers are displayed, **Then** duplicate offer rows are not shown to the user.

---

### Edge Cases

- Live source is temporarily unavailable during refresh.
- One enabled market returns data while the second fails.
- A configured product has multiple offers across different markets with different validity periods.
- Offer data is stale or missing validity dates in a source response.
- Region is changed while previously cached daily data exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated supermarket offers dashboard view that participates in the existing dashboard rotation.
- **FR-002**: Supermarket offers view MUST be view-only and MUST NOT expose free-text search, filters, or other interactive input controls in the UI.
- **FR-003**: System MUST read supermarket offers configuration from `config.json`, including tracked products, enabled market sources, and region/market context.
- **FR-004**: System MUST support at least one and up to two live supermarket data sources in the initial release scope.
- **FR-005**: System MUST fetch offer data from configured live sources once every 24 hours.
- **FR-006**: System MUST match offers only to tracked products using exact comparison against normalized product names and explicit aliases defined in `config.json`, and MUST ignore non-configured products.
- **FR-007**: System MUST allow region/market configuration so displayed offers are not hardcoded to a single city or postal code.
- **FR-008**: System MUST show a clear non-blocking error state when one or more configured sources fail to load.
- **FR-009**: System MUST show a clear empty state when no offers match configured products.
- **FR-010**: System MUST display source attribution for each offer so users can identify the originating market.
- **FR-011**: System MUST avoid duplicate visible entries for the same product-offer combination within a refresh cycle.
- **FR-012**: System MUST display the most recently successful daily data set if a scheduled refresh fails, and indicate that data may be outdated.

### Key Entities

- **Offer Source Configuration**: Defines which supermarket live sources are enabled (initially 1-2) and required connection settings.
- **Region Context**: Configured locality scope (such as market/region) used to request relevant offers.
- **Tracked Product**: A product definition in `config.json` containing a canonical normalized product name and optional explicit aliases used as the matching basis for which offers are shown.
- **Offer Record**: A normalized offer item shown in the dashboard, including product name, offer details, validity window, and source market.
- **Daily Offer Snapshot**: The consolidated set of offer records produced by the once-daily refresh.

## Constraints

- UI interaction is out of scope; this feature is display-only.
- Free product search in the dashboard UI is out of scope; tracked products are configuration-driven only.
- Initial source coverage is intentionally limited to 1-2 live markets.
- Refresh cadence is fixed to once daily for this feature scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of enabled supermarket offers views render without requiring user input during normal dashboard operation.
- **SC-002**: In acceptance testing, at least 95% of daily refresh runs complete successfully for each enabled market source over a 30-day window.
- **SC-003**: For a configured list of at least 20 products, 100% of displayed offers correspond to configured products only.
- **SC-004**: When region configuration is changed, the next successful daily refresh reflects the new region in displayed offers.
- **SC-005**: When no matching offers exist, users see an explicit empty state within the view in 100% of tested cases.
- **SC-006**: During partial source failures, the view continues to display available results from successful sources in 100% of tested failure simulations.

## Assumptions

- Existing dashboard framework and view rotation behavior remain unchanged and reusable for this view.
- Live supermarket sources provide legally usable offer data for configured regions.
- Product matching for v1 uses exact normalized product name comparison plus explicit aliases configured in `config.json`.
- Configuration changes are applied through existing config management flow and do not require a new settings UI.
- Once-daily refresh timing uses a consistent daily schedule defined by existing application runtime behavior.
