# Research: Dashboard Framework

**Feature**: 001-dashboard-framework | **Date**: 2025-07-15

## R1: Configuration File Format

**Decision**: JSON

**Rationale**: JSON is natively parsed by Node.js/TypeScript with zero dependencies. The config structure is simple key-value pairs and arrays — no need for YAML's advanced features (anchors, multi-line strings). JSON Schema can validate configs in the future if needed.

**Alternatives considered**:
- **YAML**: More human-friendly for complex configs, but adds a dependency (`js-yaml` or similar). Config is simple enough that JSON readability is fine. YAGNI.
- **TOML**: Less common in the JS ecosystem. No clear advantage for this use case.

## R2: Backend Framework

**Decision**: Fastify

**Rationale**: Constitution allows Express or Fastify. Fastify has built-in TypeScript support, schema-based validation, and better performance. For a lightweight config-serving API with static file serving, Fastify's plugin system (`@fastify/static`) is clean and minimal.

**Alternatives considered**:
- **Express**: More widely known but requires more boilerplate for TypeScript. No meaningful advantage for this simple server.

## R3: Monorepo Package Layout

**Decision**: Three packages — `shared`, `server`, `dashboard`

**Rationale**: Clean separation matching the constitution's modular-first principle. `shared` holds TypeScript types used by both server and dashboard (config schema, component interfaces). This is the minimum viable package split for a full-stack TypeScript app with shared types.

**Alternatives considered**:
- **Two packages** (server + dashboard with inline types): Would duplicate type definitions or create import coupling. Shared types package prevents this.
- **Four+ packages** (separate packages for components, config, etc.): Over-engineering for one component. YAGNI — can split later if the component count grows significantly.

## R4: Image Display Mode Implementation

**Decision**: Map display modes directly to CSS `object-fit` property

**Rationale**: The four display modes (contain, cover, stretch, center) map 1:1 to CSS `object-fit` values:
- `contain` → `object-fit: contain`
- `cover` → `object-fit: cover`
- `stretch` → `object-fit: fill`
- `center` → `object-fit: none` (with `object-position: center`)

This requires zero custom layout logic — just an `<img>` tag with the right CSS property. Fully responsive via `width: 100%; height: 100%` on the container.

**Alternatives considered**:
- **Background-image approach**: Using `background-size` on a `<div>`. Works but loses `<img>` semantics (alt text, loading events, error detection). Harder to detect load failures for the placeholder requirement.
- **Canvas rendering**: Massively over-engineered for static images.

## R5: View Cycling Mechanism

**Decision**: `setInterval` with React state managing the active view index

**Rationale**: The simplest timer mechanism available. React re-renders the active component when the index changes. No animation library needed since transitions are "instant swap" per spec assumptions. `setInterval` is cleaned up in a `useEffect` return.

**Alternatives considered**:
- **`setTimeout` chain**: Slightly more flexible for variable intervals but adds complexity for no benefit since all views share one cycle interval.
- **requestAnimationFrame loop**: Designed for animations, not periodic view swaps. Overkill.

## R6: Config File Location

**Decision**: Default to `./config.json` relative to the working directory, overridable via `HEIMDALL_CONFIG` environment variable

**Rationale**: Simple convention. The server reads the config on startup. Environment variable allows flexibility without CLI argument parsing complexity. Aligns with 12-factor app conventions for configuration.

**Alternatives considered**:
- **XDG config directory** (`~/.config/heimdall/`): More Linux-conventional but adds path resolution complexity. Users deploying on a Raspberry Pi will likely run from a project directory anyway.
- **CLI flag** (`--config path`): Requires argument parsing. Can add later if needed. YAGNI.

## R7: Serving Images from Local Filesystem

**Decision**: Fastify serves a configurable static assets directory via `@fastify/static`

**Rationale**: The image component needs to load images from local file paths. The server mounts a static directory (default: `./assets/`) that the frontend can reference via relative URLs. Network URLs are fetched directly by the browser's `<img>` tag.

**Alternatives considered**:
- **Filesystem API in Electron only**: Would break headless/browser mode. The server must serve files for both modes.
- **Proxy all images through API**: Adds unnecessary latency and complexity for local files.

## R8: Responsive Full-Screen Layout

**Decision**: CSS viewport units (`100vw` × `100vh`) with `overflow: hidden` on the root container

**Rationale**: The dashboard is always full-screen, one view at a time. No layout framework needed — just make the root container fill the viewport and let each component fill its parent. CSS handles resize events automatically.

**Alternatives considered**:
- **CSS Grid/Flexbox framework** (Tailwind, etc.): No layout complexity to justify a framework. One component fills the screen. YAGNI.
- **ResizeObserver API**: Needed only if components require pixel dimensions for canvas rendering. CSS handles image scaling natively.
