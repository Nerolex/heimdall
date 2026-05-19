# Heimdall — Copilot Instructions

## Project Status

This is a greenfield project initialized with **SpecKit v0.8.1**. No source code exists yet — development follows the SpecKit specification-driven workflow below.

## SpecKit Workflow

All feature development follows a structured pipeline. Use the SpecKit agents in this order:

1. **`speckit.constitution`** — Define project principles and constraints (do this first, once)
2. **`speckit.specify`** — Generate a feature spec from a natural-language description → `specs/<branch>/spec.md`
3. **`speckit.clarify`** — Ask targeted questions to fill gaps in the spec
4. **`speckit.plan`** — Produce an implementation plan with technical decisions → `specs/<branch>/plan.md`
5. **`speckit.tasks`** — Generate dependency-ordered task list → `specs/<branch>/tasks.md`
6. **`speckit.implement`** — Execute tasks from `tasks.md`

Supporting agents: `speckit.analyze` (cross-artifact consistency check), `speckit.checklist` (custom QA checklist), `speckit.taskstoissues` (sync tasks to GitHub Issues).

### Key Conventions

- **Constitution first**: The constitution in `.specify/memory/constitution.md` must be filled in before any feature work. It governs all design and implementation decisions.
- **Git hooks are automatic**: SpecKit auto-commits before and after each workflow step via the git extension (configured in `.specify/extensions.yml`). Branch naming uses sequential numbering (e.g., `001-feature-name`).
- **Feature branches**: Each feature gets its own branch created by `speckit.git.feature` before specification begins.
- **Specs live in `specs/<branch>/`**: Each feature produces `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, and `tasks.md`.
- **User stories drive task structure**: Tasks in `tasks.md` are grouped by user story (US1, US2, …) so each story can be implemented, tested, and delivered independently.
- **`[P]` = parallelizable**: Tasks marked `[P]` touch different files and have no dependencies — they can run concurrently.

### Before Starting Any Feature

1. Ensure the constitution is filled in (not still placeholder templates)
2. Read the current plan if one exists — check `specs/` for in-progress features
3. Follow the SpecKit pipeline in order; don't skip steps

## Tech Stack

- **TypeScript** full-stack monorepo (pnpm)
- **Frontend**: React + Vite
- **Backend**: Express or Fastify (lightweight server)
- **Headed mode**: Electron (kiosk/window)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Runtime**: Node.js 20+ (LTS)

## Commit Style

Messages complete the sentence "This commit will…" — e.g., `add weather component to dashboard`. Short header + body explaining what and why. Group changes semantically; keep commits cohesive and not too large.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at
`specs/002-supermarket-offers-view/plan.md`
<!-- SPECKIT END -->
