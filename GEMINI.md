\# Oneiric — Project Rules



\## 1. Core Principles

\- Build a real, functional product, not a visual mockup.

\- Prioritize reliability, privacy, usability, and maintainability.

\- Preserve all working features when adding new ones.

\- Do not remove existing functionality without explicit approval.

\- Keep the application focused on dream journaling and lucid-dreaming research.



\## 2. Mandatory Development Workflow

\- Inspect the existing codebase before making changes.

\- Read this file and relevant project documentation before starting each task.

\- Identify affected components, dependencies, and potential regressions.

\- Make a concise implementation plan for substantial changes, then implement it.

\- Run the development server after completing development work and keep it running.

\- Open the local application and verify the actual interface and interactions.

\- Run relevant tests, lint checks, and the production build.

\- Fix errors introduced by your changes before declaring completion.

\- Report the local URL, completed work, test results, and remaining issues honestly.

\- Never claim that a feature works or a test passes without verifying it.

\- Never stop after writing a plan when implementation was requested.



\## 3. Code Quality

\- Use React, TypeScript, and the project's existing architecture consistently.

\- Prefer small, reusable components and clearly separated responsibilities.

\- Use strict typing. Avoid `any`, unsafe type assertions, and unexplained suppression comments.

\- Keep database logic separate from presentation components.

\- Avoid duplicated logic, giant components, unnecessary abstractions, and excessive dependencies.

\- Handle loading states, empty states, validation errors, and unexpected failures.

\- Remove obsolete code and debug logging introduced during development.

\- Follow existing naming conventions and formatting.



## 4. UI and UX

- Maintain Oneiric's calm, focused midnight dark-blue visual identity (`#0b132b`).
- Adhere strictly to the anti-vibecoding design principles: avoid AI-generated aesthetic clichés, excessive glowing gradients, decorative sparkles, oversized radii, and fake landing-page hero banners.
- Use consistent spacing, typography, colors, icons, and component styles.
- Support desktop, tablet, and mobile layouts with clean, responsive breakpoints.
- Ensure buttons, menus, forms, dialogs, navigation, and keyboard interactions work smoothly with visible focus rings (`focus-visible:ring-2 focus-visible:ring-blue-500`).
- Provide clear feedback for saving, deleting, importing, and exporting.
- Use confirmation dialogs for destructive actions.
- Never add decorative controls or status icons that do nothing.
- Avoid unnecessary redesigns when a targeted improvement is sufficient.
- Maintain high information density suitable for an analytical journal workbench.



\## 5. Data Integrity

\- Never silently discard, overwrite, duplicate, or corrupt user data.

\- Persist all relevant changes correctly.

\- Use stable identifiers and consistent timestamps.

\- Validate data before writing it to storage.

\- Handle missing, malformed, and outdated records safely.

\- Preserve existing database records during schema migrations.

\- Validate imports before applying them.

\- Require explicit confirmation before replacing existing records or deleting all data.

\- Keep export files complete and usable for restoration.

\- Test important data operations after changing the database layer.



\## 6. Privacy and Security

\- Dream entries are private personal data.

\- Keep journal content local unless the user explicitly enables a future feature requiring external storage.

\- Never transmit dream narratives, personal notes, or identifying information to external services without explicit user consent.

\- Do not add analytics, tracking scripts, advertising, or external AI APIs without approval.

\- Never expose secrets, API keys, credentials, or private configuration in frontend code or Git.

\- Treat imported files and user-generated content as untrusted input.

\- Avoid rendering user content as unsanitized HTML.

\- Do not weaken security settings to make development easier.



\## 7. Dependencies and Architecture

\- Inspect existing dependencies before installing new packages.

\- Prefer established, lightweight libraries that solve a real problem.

\- Explain and justify significant architectural changes.

\- Avoid introducing a backend, authentication, cloud synchronization, or paid APIs unless explicitly requested.

\- Keep future expansion possible without prematurely building complex infrastructure.

\- Do not replace working libraries merely because another option is fashionable.



\## 8. Testing and Verification

\- Add tests for new functionality and regression tests for discovered bugs.

\- Test successful operations and relevant failure cases.

\- Verify persistence across page refreshes.

\- Verify import/export round trips.

\- Check responsive layouts and browser-console errors.

\- Run the project's available lint, test, and build commands.

\- Never disable or weaken tests just to achieve a passing result.

\- Distinguish automated test results from manual browser verification.



\## 9. Scope Control

\- Implement only the requested phase and necessary supporting infrastructure.

\- Do not silently expand the task into unrelated features.

\- Do not leave core functionality as TODO comments or placeholders.

\- If a requirement conflicts with the existing architecture, investigate before modifying it.

\- Ask for approval before destructive migrations, major rewrites, or significant new recurring costs.

\- Keep a short record of completed features, known limitations, and the next recommended phase.



\## 10. Git and Change Management

\- Inspect Git status before making changes.

\- Never overwrite unrelated user modifications.

\- Do not reset, clean, or delete project files indiscriminately.

\- Keep changes focused and reviewable.

\- Do not commit, push, publish, or deploy unless requested or explicitly authorized.

\- Never expose secrets in commits.

\- Report significant file changes and any required manual configuration.



\## 11. Definition of Done

A task is complete only when:

\- The requested feature is implemented.

\- Existing functionality remains intact.

\- Relevant tests pass.

\- Lint and production build checks have been run.

\- The application has been started and the changed functionality verified locally.

\- No known critical regression remains.

\- Remaining limitations are documented honestly.



## 12. Phase 1 Architecture & Specifications

### Storage & Persistence
- Library: Dexie.js (IndexedDB wrapper)
- Tables:
  - `dreams`: `id, date, lucidity, createdAt, updatedAt` (plus full narrative, vividness, recall, emotions, tags, dream signs notes, wakeUpTime)
  - `techniqueLogs`: `id, date, technique, outcome, createdAt`
  - `customTags`: `id, name, createdAt`
- Layering: Database logic lives in `src/db/` and services in `src/services/`. UI components must not call raw IndexedDB directly.

### Theme & Styling
- Unified Midnight Palette:
  - Base background: `#0b132b` (deep midnight blue)
  - Card & Surface background: `#101a38` / `bg-slate-900/60`
  - Subtle borders: `#1e293b` (slate-800)
  - Primary button / action accent: `#2563eb` (crisp cobalt blue)
  - Text: High contrast `#f8fafc` (primary), `#94a3b8` (secondary), `#64748b` (muted)
- Semantic CSS Variables (in `src/index.css`):
  - `--bg-base`: `#0b132b`
  - `--bg-surface`: `#101a38`
  - `--bg-surface-raised`: `#15224a`
  - `--border-subtle`: `#1e293b`
  - `--border-strong`: `#334155`
  - `--accent-primary`: `#2563eb`
  - `--accent-primary-hover`: `#1d4ed8`
  - `--text-primary`: `#f8fafc`
  - `--text-secondary`: `#94a3b8`
  - `--text-muted`: `#64748b`
- Crisp Lucide React icons; icons are functional indicators, never decorative fluff.

### Routing
- `/`: Dashboard (Metrics, streak, 7-day recall chart, quick actions, recent dreams)
- `/journal`: Dream Journal (search, filter, sort, list, dream detail modal)
- `/journal/new`: Dream Editor (create entry)
- `/journal/edit/:id`: Dream Editor (edit entry)
- `/calendar`: Monthly Calendar (visual indicators for dreams & lucid dreams, day detail drawer)
- `/lucid`: Lucid Dreams dedicated view
- `/techniques`: Lucid dreaming technique logger and educational guide
- `/settings`: Data export/import (validated JSON), sample data toggle, reset data

### Development Server
- Default Port: `5180` (configured with `host: true` to avoid port collisions with 5173)

## 13. Phase 2 Architecture: Dream Intelligence & Pattern Analysis

### Storage & Schema (Dexie Database v2)
- Upgraded `OneiricDatabase` to Version 2:
  - `dreams`: `id, date, lucidity, falseAwakening, createdAt, updatedAt, *tags, *emotions, isSample`
    - Enhanced fields: `scenesCount`, `dreamControl`, `lucidityConfidence`, `falseAwakening`, `falseAwakeningDetails`, `realityChecksUseful`, `interpretationNotes`, `scenes`
  - `techniqueLogs`: `id, date, technique, outcome, createdAt, isSample`
    - Enhanced fields: `bedTime`, `wakeTime`, `confidenceRating`, `secondaryTechniques`
  - `customTags`: `id, name, createdAt`
  - `dreamSigns`: `id, name, category, status, distinctDreamCount, lastOccurred, isRealityCheckReminder, createdAt, updatedAt, *keywords, isSample`
    - Categories: `person`, `location`, `object`, `action`, `anomaly`, `emotion`, `other`
    - Status: `confirmed`, `suggested`, `dismissed`

### New Navigation & Views
- `/analytics`: Dream Analytics Dashboard (time ranges, recall rates, heatmaps, trends, vividness/control metrics)
- `/signs`: Dream Signs Detection & Library (rule-based local engine, occurrences, confirmation/dismissal, merging)
- `/false-awakenings`: Dedicated False Awakenings Archive & Pattern Tracker
- `/timeline`: Chronological Nocturnal Timeline (grouped by night, scene transitions, techniques, dream signs)
- `/correlations`: Cross-Dream Correlation Engine & Dashboard (statistical discovery across signs, lucidity, vividness, and techniques)

### Core Detection Principles
- All analysis is strictly local (no external AI APIs, zero telemetry).
- Distinct entry rule: Recurring requires >= 2 distinct dreams. Repeated occurrences in one entry count as 1 dream.
- Technique comparisons must always show sample size (n = X).
- Unrecorded nights are never assumed to be non-dream nights.

## 14. Anti-Vibecoding Design Philosophy & Product Standards

### 1. Zero AI Aesthetic Clichés
- **No glowing neon gradients**: Forbid purple-blue gradient backgrounds, glowing neon buttons, neon text, and rainbow gradient borders.
- **No artificial glows or blur blobs**: Forbid `celestial-glow`, `lucid-glow`, blurred radial background circles, and excessive glassmorphism.
- **No gratuitous iconography**: Never prefix page headings, card titles, or section headers with decorative `<Sparkles>` or meaningless star icons.
- **No fake animations**: Do not use `animate-pulse` on static status badges or data indicators. Animations must be restricted to active spinners during async tasks (`animate-spin`) or calm entrance fades (`animate-fadeIn`).
- **No marketing fluff / melodramatic microcopy**: Never use exaggerated cosmic prose (e.g. "Celestial Threshold", "Sacred Sanctuary", "Inscribe Dream Experience", "Astronomical Ledger"). Use direct, respectful, disciplined language suited for personal journaling and scientific research (e.g. "Dashboard", "Lucid Dreams Archive", "Edit Dream", "Record Narrative").

### 2. Disciplined Geometry & Radius Hierarchy
- `rounded-md` (6px): Badges, tags, filter pills, small buttons (`size="sm"` or `"xs"`), icon containers.
- `rounded-lg` (8px): Inputs, select dropdowns, textareas, standard buttons (`size="md"`), table rows, sub-cards.
- `rounded-xl` (12px): Top-level cards, section panels, modals, and primary drawer surfaces.
- Never use `rounded-2xl` or `rounded-3xl` as generic wrappers.

### 3. Button & Interaction Standards
- **Primary Action**: Crisp cobalt blue (`bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border border-blue-500/60 shadow-sm`), never multi-color glowing gradients.
- **Secondary Action**: Dark navy surface (`bg-[#121c38] hover:bg-[#18264d] text-slate-200 border border-slate-700/80`).
- **Outline / Ghost**: Transparent surfaces with subtle borders and crisp hover feedback.
- **Danger**: Red surface with high-contrast text (`bg-red-950/40 text-red-300 border border-red-800/60`).
- **Standardized Heights**: `xs` (28px / `h-7`), `sm` (32px / `h-8`), `md` (36px / `h-9`), `lg` (40px / `h-10`).
- **Keyboard Accessibility**: Every interactive control must have a visible focus ring (`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b132b]`).

### 4. Information Density & Layout Hierarchy
- Design as an analytical dream laboratory workbench, not a consumer marketing landing page.
- Avoid card-in-card unnecessary nesting and excessive white/empty space.
- Avoid giant headings that push actual dream records below the fold.
- Maintain high-density table and list views with clear typographic hierarchy.

**Final rule:** Working software is more important than impressive-looking progress reports. Verify first, report second.


