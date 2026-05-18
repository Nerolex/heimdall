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
  "cycleInterval": 15,
  "viewOrder": "random",
  "showFullscreenButton": true,
  "keepAwake": "auto",
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
  "lastfm": {
    "apiKey": "<Last.fm API key>",
    "user": "<Last.fm username>"
  },
  "retro": {
    "apiUser": "<RetroAchievements username>",
    "apiKey": "<RetroAchievements API key>",
    "user": "<RetroAchievements username>",
    "igdbClientId": "<Twitch/IGDB client ID>",
    "igdbClientSecret": "<Twitch/IGDB client secret>",
    "sgdbApiKey": "<SteamGridDB API key>"
  },
  "steam": {
    "apiKey": "<Steam Web API key>",
    "steamId": "<Steam64 ID>"
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
| `cycleInterval` | number | `30` | Seconds between view transitions |
| `viewOrder` | `"sequential"` \| `"random"` | `"sequential"` | View cycling order |
| `showFullscreenButton` | boolean | `false` | Show fullscreen toggle in overlay |
| `keepAwake` | `true` \| `false` \| `"auto"` | `"auto"` | Keep browser awake (auto-detects Silk/Echo Show) |

## Available Views

### Clock (`clock`)

Large readable clock with a random photo background, current weather, and date.

- Weather icon + temperature + weekday/date displayed above the clock
- Photo uses blurred background fill (same as photos view)
- Best with `"overlay": "none"` (has its own built-in clock)

### Weather (`weather`)

Full-screen weather display with current conditions, temperature, and animated icon.

- Requires `weather` config section

### Calendar (`calendar-day`, `calendar-week`, `calendar-month`, `calendar-agenda`)

Four calendar layouts pulling events from iCal/ICS sources.

- Requires `calendar` config section with `sources` array

### Photos (`photos-random`, `photos-memories`)

- **photos-random** — Displays a random photo with blurred background fill and date
- **photos-memories** — "Heute vor X Jahren" — photos from this day in previous years

Photos are served from the `photos/` directory. Supports EXIF date extraction.

### Music (`music-now-playing`)

Shows currently playing track (or random recent track) from Last.fm with album art background.

- Requires `lastfm` config section

### Gaming (`gaming-recent`, `gaming-showcase`, `gaming-achievement`, `gaming-now`)

Unified views merging Steam + RetroAchievements data:

- **gaming-recent** — Recent achievements timeline across both platforms
- **gaming-showcase** — Random game spotlight with hero art
- **gaming-achievement** — Random achievement with game background and badge icon
- **gaming-now** — Currently playing game (live)

Requires `retro` and/or `steam` config sections.

### Retro (`retro-recent`, `retro-playing`, `retro-profile`, `retro-showcase`)

RetroAchievements-only views (legacy — prefer unified `gaming-*` views):

- Requires `retro` config section

## View Options

Each view entry supports:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | string | — | View component identifier (see above) |
| `overlay` | `"both"` \| `"clock"` \| `"weather"` \| `"none"` | `"both"` | Which overlay elements to show |
| `frequency` | `"high"` \| `"normal"` \| `"low"` | `"normal"` | How often this view appears (3×, 1×, 0.5×) |
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
