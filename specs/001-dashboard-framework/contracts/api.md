# API Contract: Dashboard Server

**Feature**: 001-dashboard-framework | **Date**: 2025-07-15

This document captures the **core bootstrap API contract** for the dashboard framework.

Additional content integrations (calendar/photos/retro/gaming/music/plex/trailers) are implemented in the codebase with their own endpoints, but are intentionally out of scope for this contract file.

---

## GET /api/config

Returns the current dashboard configuration.

When `HEIMDALL_REDACT_CONFIG=true`, sensitive credential fields are stripped from the response.

**Response** `200 OK`:

```json
{
  "cycleInterval": 30,
  "views": [
    {
      "type": "image",
      "settings": {
        "src": "/assets/photo.jpg",
        "displayMode": "contain"
      }
    },
    {
      "type": "image",
      "settings": {
        "src": "https://example.com/image.png",
        "displayMode": "cover"
      }
    }
  ]
}
```

**Response** `404 Not Found` (no config file):

```json
{
  "error": "config_not_found",
  "message": "No configuration file found. Create config.json in the project root."
}
```

**Response** `422 Unprocessable Entity` (invalid config):

```json
{
  "error": "config_invalid",
  "message": "Configuration file could not be parsed: <detail>"
}
```

---

## GET /assets/*

Serves static files from the configured assets directory. Used for local image files referenced in view settings.

**Response** `200 OK`: The file content with appropriate `Content-Type` header.

**Response** `404 Not Found`: File does not exist in the assets directory.

---

## GET / (and all non-API routes)

Serves the React SPA (dashboard frontend). All routes not matching `/api/*` or `/assets/*` return `index.html` for client-side routing.

---

## Notes

- No authentication. The dashboard is designed for local-network access only.
- No write endpoints. Config is edited manually by the user on the filesystem.
- CORS is not needed — frontend and API are served from the same origin.
