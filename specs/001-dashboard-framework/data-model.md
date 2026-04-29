# Data Model: Dashboard Framework

**Feature**: 001-dashboard-framework | **Date**: 2025-07-15

## Entities

### DashboardConfig

The top-level configuration object. Stored as a JSON file on disk.

| Field           | Type          | Required | Default | Description                                    |
|-----------------|---------------|----------|---------|------------------------------------------------|
| `cycleInterval` | `number`      | No       | `30`    | Seconds between view transitions. Must be > 0. |
| `views`         | `ViewEntry[]` | Yes      | `[]`    | Ordered list of views to display.              |

**Validation rules**:
- `cycleInterval`: If absent, defaults to 30. If ≤ 0, treated as 30.
- `views`: If empty or absent, dashboard shows "no views configured" state.

---

### ViewEntry

A single view in the dashboard rotation. References a component by type name and passes settings to it.

| Field      | Type     | Required | Default | Description                                            |
|------------|----------|----------|---------|--------------------------------------------------------|
| `type`     | `string` | Yes      | —       | Component type identifier (e.g., `"image"`).           |
| `settings` | `object` | No       | `{}`    | Component-specific configuration. Shape depends on type.|

**Validation rules**:
- `type`: Must be a non-empty string. If the type is not in the component registry, the view renders an error indicator.
- `settings`: Passed directly to the component. Each component validates its own settings.

---

### ImageSettings

Configuration for the `image` component type.

| Field         | Type     | Required | Default     | Description                                                        |
|---------------|----------|----------|-------------|--------------------------------------------------------------------|
| `src`         | `string` | Yes      | —           | Image source — local path (relative to assets dir) or network URL. |
| `displayMode` | `string` | No       | `"contain"` | One of: `"contain"`, `"cover"`, `"stretch"`, `"center"`.           |

**Validation rules**:
- `src`: Must be a non-empty string. If the image fails to load, show a placeholder.
- `displayMode`: If absent, defaults to `"contain"`. If invalid value, defaults to `"contain"`.

---

## Relationships

```
DashboardConfig
  └── views: ViewEntry[]     (1:N, ordered)
        └── settings: ImageSettings  (1:1, when type="image")
```

## State Transitions

### View Cycling State

```
[Start]
  │
  ▼
LOADING_CONFIG
  │── config found ──▶ DISPLAYING (activeIndex=0)
  │── no config ─────▶ EMPTY_STATE
  │── parse error ───▶ ERROR_STATE
  
DISPLAYING
  │── timer tick ────▶ DISPLAYING (activeIndex = (activeIndex + 1) % views.length)
  │── single view ───▶ DISPLAYING (no cycling, stays on index 0)

EMPTY_STATE  (static — "No views configured" message)
ERROR_STATE  (static — config error message)
```

## CSS Display Mode Mapping

| Config Value | CSS `object-fit` | CSS `object-position` | Behavior                               |
|--------------|------------------|-----------------------|----------------------------------------|
| `"contain"`  | `contain`        | `center`              | Fit within area, preserve aspect ratio |
| `"cover"`    | `cover`          | `center`              | Fill area, crop excess                 |
| `"stretch"`  | `fill`           | `center`              | Fill area exactly, distort if needed   |
| `"center"`   | `none`           | `center`              | Original size, centered                |
