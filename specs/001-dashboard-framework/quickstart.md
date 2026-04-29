# Quickstart: Dashboard Framework

**Feature**: 001-dashboard-framework

## Prerequisites

- Node.js 20+ (LTS)
- pnpm (`npm install -g pnpm`)

## Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Create a Config File

Create `config.json` in the project root:

```json
{
  "cycleInterval": 10,
  "views": [
    {
      "type": "image",
      "settings": {
        "src": "/assets/welcome.png",
        "displayMode": "contain"
      }
    },
    {
      "type": "image",
      "settings": {
        "src": "https://picsum.photos/1920/1080",
        "displayMode": "cover"
      }
    }
  ]
}
```

## Add an Image

Place an image file in the `assets/` directory:

```bash
mkdir -p assets
cp /path/to/your/image.png assets/welcome.png
```

## Run (Headless / Browser Mode)

```bash
pnpm start
# Opens dashboard at http://localhost:3000
```

## Run (Headed / Electron Mode)

```bash
pnpm start:electron
# Opens dashboard in a native window
```

## Verify

1. The dashboard should display your first image
2. After the cycle interval (10s), it switches to the next image
3. After the last image, it loops back to the first
4. Resize the browser window — the image should adapt to fill the screen

## Config Reference

| Field              | Type   | Default     | Description                          |
|--------------------|--------|-------------|--------------------------------------|
| `cycleInterval`    | number | `30`        | Seconds between view transitions     |
| `views[].type`     | string | —           | Component type (currently: `"image"`) |
| `views[].settings` | object | `{}`        | Component-specific config            |

### Image Component Settings

| Field         | Type   | Default     | Values                                       |
|---------------|--------|-------------|----------------------------------------------|
| `src`         | string | —           | Local path (`/assets/...`) or URL            |
| `displayMode` | string | `"contain"` | `"contain"`, `"cover"`, `"stretch"`, `"center"` |
