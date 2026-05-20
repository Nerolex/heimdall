# Heimdall 🏠

A self-hosted smart display dashboard for Raspberry Pi (or any device with a browser). Think Amazon Echo Show, but fully customizable and privacy-respecting.

Heimdall cycles through configurable views — weather, calendars, photos, music, gaming achievements, and more — with smooth transitions and a beautiful full-screen UI.

## Features

- 🖼️ **Photo views** — Random photos and "On this day" memories with blurred background fill
- 🎮 **Gaming** — Steam + RetroAchievements integration (recent achievements, game showcases)
- 🎵 **Music** — Last.fm now playing / recently played
- 📅 **Calendar** — Day, week, month, and agenda views from iCal sources
- 🌤️ **Weather** — Current conditions with animated icons
- 🕐 **Clock** — Large clock with photo background, weather, and date
- ⚡ **Keep Awake** — Silent audio loop to prevent Echo Show (Silk browser) from sleeping
- 🎲 **Frequency weighting** — Make important views appear more often

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev
# → Dashboard: http://localhost:5173
# → API Server: http://localhost:3000
```

## Configuration

Create a `config.json` in the project root:

```json
{
  "schemaVersion": 2,
  "app": {
    "cycleInterval": 15,
    "viewOrder": "random",
    "showFullscreenButton": true,
    "keepAwake": "auto"
  },
  "providers": {
    "weather": {
      "apiKey": "<OpenWeatherMap API key>",
      "city": "Berlin",
      "units": "metric",
      "refreshInterval": 15
    },
    "calendar": {
      "sources": [
        { "url": "https://calendar.example.com/feed.ics", "name": "Main", "color": "#4a90d9" }
      ]
    },
    "music": {
      "lastfm": {
        "apiKey": "<Last.fm API key>",
        "user": "<Last.fm username>"
      }
    },
    "gaming": {
      "retro": {
        "apiUser": "<RetroAchievements username>",
        "apiKey": "<RetroAchievements API key>",
        "user": "<RetroAchievements username>"
      },
      "steam": {
        "apiKey": "<Steam Web API key>",
        "steamId": "<Steam64 ID>"
      },
      "igdb": {
        "clientId": "<Twitch/IGDB client ID>",
        "clientSecret": "<Twitch/IGDB client secret>"
      },
      "sgdb": {
        "apiKey": "<SteamGridDB API key>"
      }
    },
    "plex": {
      "url": "http://127.0.0.1:32400",
      "token": "<Plex token>"
    }
  },
  "views": [
    { "type": "clock", "overlay": "none", "frequency": "high" },
    { "type": "weather", "overlay": "clock", "frequency": "high" },
    { "type": "calendar-day", "overlay": "clock" },
    { "type": "photos-random", "overlay": "clock" },
    { "type": "gaming-achievement", "overlay": "clock" }
  ]
}
```

`schemaVersion: 2` is the recommended grouped format. Legacy top-level provider keys (`weather`, `calendar`, `lastfm`, `retro`, `steam`, `plex`) are still supported for backward compatibility.

### Security notes

- **Do not commit real credentials** in `config.json`. Keep placeholders in git and inject real values only on your runtime host.
- If your dashboard is reachable by untrusted clients, enable config redaction:

```bash
HEIMDALL_REDACT_CONFIG=true
```

This strips sensitive keys from `/api/config` responses (`weather.apiKey`, `lastfm.apiKey`, `retro.apiKey`, `retro.igdbClientSecret`, `retro.sgdbApiKey`, `steam.apiKey`, `plex.token`).

## Global Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `app.cycleInterval` | number | `30` | Seconds between view transitions |
| `app.viewOrder` | `"sequential"` \| `"random"` | `"sequential"` | View cycling order |
| `app.showFullscreenButton` | boolean | `false` | Show fullscreen toggle in overlay |
| `app.keepAwake` | `true` \| `false` \| `"auto"` | `"auto"` | Keep browser awake (auto-detects Silk/Echo Show) |

## Available Views

### Clock (`clock`)

Large readable clock with a random photo background, current weather, and date.

- Weather icon + temperature + weekday/date displayed above the clock
- Best with `"overlay": "none"` (has its own built-in clock display)

```json
{ "type": "clock", "overlay": "none", "settings": {} }
```

### Weather (`weather`)

Full-screen weather display with current conditions, temperature, and animated icon.

- Requires `providers.weather` config section

```json
{ "type": "weather", "overlay": "clock", "frequency": "high", "settings": {} }
```

### Calendar

Four layouts pulling events from iCal/ICS sources. Requires `providers.calendar`.

```json
{ "type": "calendar-day",    "overlay": "clock", "settings": {} },
{ "type": "calendar-week",   "overlay": "clock", "settings": {} },
{ "type": "calendar-month",  "overlay": "clock", "settings": {} },
{ "type": "calendar-agenda", "overlay": "clock", "settings": {} }
```

### Photos

- **photos-random** — Random photo with blurred background fill
- **photos-memories** — "Heute vor X Jahren" — photos from this day in past years

Photos are served from the `photos/` directory. Supports EXIF date extraction.

```json
{ "type": "photos-random",   "overlay": "clock", "settings": {} },
{ "type": "photos-memories", "overlay": "clock", "settings": {} }
```

### Music (`music-now-playing`)

Currently playing or recently played track from Last.fm with album art background.

- Requires `providers.music.lastfm` config section

```json
{ "type": "music-now-playing", "overlay": "clock", "settings": {} }
```

### Gaming

Unified views merging Steam + RetroAchievements data. Requires `providers.gaming.steam` and/or `providers.gaming.retro`.

- **gaming-recent** — Recent achievements timeline across both platforms
- **gaming-showcase** — Random game spotlight with hero art
- **gaming-achievement** — Random achievement with game background and badge icon
- **gaming-now** — Currently playing game (live)

```json
{ "type": "gaming-recent",      "overlay": "clock", "settings": {} },
{ "type": "gaming-showcase",    "overlay": "clock", "settings": {} },
{ "type": "gaming-achievement", "overlay": "clock", "settings": {} },
{ "type": "gaming-now",         "overlay": "clock", "settings": {} }
```

### Retro (RetroAchievements only)

RetroAchievements-specific views. Prefer unified `gaming-*` views for new configs.

- Requires `providers.gaming.retro` config section

```json
{ "type": "retro-recent",   "overlay": "clock", "settings": {} },
{ "type": "retro-playing",  "overlay": "clock", "settings": {} },
{ "type": "retro-profile",  "overlay": "clock", "settings": {} },
{ "type": "retro-showcase", "overlay": "clock", "settings": {} }
```

### Plex (`plex-now-playing`)

Shows currently playing media on your Plex server.

- Requires `providers.plex` config section

```json
{ "type": "plex-now-playing", "overlay": "clock", "settings": {} }
```

### Game Trailers (`gametrailers`)

Plays recent game trailers as a background video view.

```json
{ "type": "gametrailers", "overlay": "clock", "settings": {} }
```

## View Options

Each view entry supports:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | string | — | View component identifier (see above) |
| `overlay` | `"both"` \| `"clock"` \| `"weather"` \| `"none"` | `"both"` | Which overlay elements to show |
| `frequency` | `"high"` \| `"normal"` \| `"low"` | `"normal"` | How often this view appears (3×, 1×, 0.5×) |
| `skipIfEmpty` | boolean | `false` | Automatically skip this view when it has no content to show. Only effective on views that implement empty signalling: `photos-memories`, `calendar-day`, `calendar-agenda` |
| `settings` | object | `{}` | View-specific overrides |

## Deployment (Docker)

```bash
docker compose up -d
```

The Docker image is published to `ghcr.io/nerolex/heimdall:001-dashboard-framework` and supports `linux/amd64` and `linux/arm64` (Raspberry Pi).

Mount your config and photos:

```yaml
services:
  heimdall:
    image: ghcr.io/nerolex/heimdall:001-dashboard-framework
    ports:
      - "3000:3000"
    volumes:
      - ./config.json:/app/config.json
      - ./photos:/app/photos
    restart: unless-stopped
```

## Tech Stack

- **Frontend**: React + Vite + TypeScript + CSS Modules
- **Backend**: Fastify + TypeScript
- **Monorepo**: pnpm workspaces (`packages/dashboard`, `packages/server`, `packages/shared`)
- **Deployment**: Docker (multi-arch), GitHub Actions CI/CD

## License

Private project.
