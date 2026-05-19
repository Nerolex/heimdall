# Quickstart: Supermarket Offers View

**Feature**: 002-supermarket-offers-view

## Prerequisites

- Node.js 20+
- pnpm
- Access credentials/endpoints for 1-2 supported live supermarket sources

## 1) Configure `config.json`

Add supermarket provider configuration and the new view entry.

```json
{
  "schemaVersion": 2,
  "app": {
    "cycleInterval": 15,
    "viewOrder": "sequential"
  },
  "providers": {
    "supermarket": {
      "region": {
        "countryCode": "DE",
        "postalCode": "44135",
        "city": "Dortmund"
      },
      "markets": [
        { "id": "market-a", "enabled": true },
        { "id": "market-b", "enabled": true }
      ],
      "products": [
        {
          "name": "banane",
          "aliases": ["bananen", "banana"]
        },
        {
          "name": "hafermilch",
          "aliases": ["oat milk", "hafer drink"]
        }
      ]
    }
  },
  "views": [
    { "type": "clock", "overlay": "none" },
    { "type": "supermarket-offers", "overlay": "clock" }
  ]
}
```

### Config rules to verify

- `markets` must contain **1 or 2** entries only.
- Product matching uses **exact normalized canonical name + explicit aliases only**.
- No UI search/filter settings exist for this view.

## 2) Install and run

```bash
pnpm install
pnpm dev
```

- Dashboard: `http://localhost:5173`
- API server: `http://localhost:3000`

## 3) Verify core behavior

1. Wait for dashboard rotation to show `supermarket-offers`.
2. Confirm offers appear only for configured products/aliases.
3. Confirm each offer shows source attribution (market label).
4. Confirm no search bar, filter controls, or text input is rendered.

## 4) Verify region configurability

1. Change `providers.supermarket.region` (e.g., postal code/city).
2. Trigger next refresh cycle (or restart in development).
3. Confirm returned offers reflect the new region context (not old hardcoded locality).

## 5) Verify stale fallback

1. Start with at least one successful snapshot.
2. Simulate source failure (invalid credential/network block).
3. Confirm previous successful snapshot remains visible.
4. Confirm stale indicator is shown and failure is non-blocking.

## 6) Verify empty/error states

- Empty products list => explicit "no products configured" message.
- No matching offers => explicit "no offers found" message.
- One source fails, another succeeds => partial-error banner + available offers still displayed.
