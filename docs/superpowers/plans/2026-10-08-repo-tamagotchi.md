# Repo Tamagotchi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static GitHub Pages app that turns a public repository URL or local ZIP/folder into a deterministic SVG pet with transparent metrics, local-only processing, export, and URL-hash sharing.

**Architecture:** A no-build static site uses `index.html`, `styles.css`, and ES modules under `src/`. A small vendored ZIP reader is loaded locally so offline use works after the page is cached; folder drops are traversed with browser APIs. `src/analyzer.js` converts normalized file entries into signals and metrics; `src/app.js` owns UI state, hash serialization, export, and error flows.

**Tech Stack:** HTML/CSS, vanilla JavaScript modules, browser `DecompressionStream` with a local fallback ZIP parser, SVG + Canvas export, GitHub Pages-compatible static assets.

---

### Task 1: Create static shell and visual system

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/app.js`

- [ ] **Step 1: Create the semantic page shell** with header, source form, journal result region, empty/error states, and action controls.
- [ ] **Step 2: Add design tokens and responsive rules** for ink/paper/marigold/coral/muted, Fraunces/Azeret Mono stacks, thin rules, rectangular panels, focus-visible outlines, reduced motion, and mobile layout.
- [ ] **Step 3: Add an inline SVG pet frame** with named groups for body, eyes, markings, and status accessories so later render code can update attributes.
- [ ] **Step 4: Run a local static server and inspect the page at 390px and 1440px widths.**

### Task 2: Implement browser-only source loading

**Files:**
- Create: `src/sources.js`
- Create: `vendor/zip-reader.js`
- Modify: `src/app.js`

- [ ] **Step 1: Implement URL parser** accepting `github.com/owner/repo`, normalizing optional protocol/trailing slash, and rejecting malformed/private-looking URLs.
- [ ] **Step 2: Implement public archive fetch** using `https://github.com/{owner}/{repo}/archive/refs/heads/HEAD.zip` with `mode: cors`, timeout, and clear fallback error copy for CORS, 404, 403, 429, and network errors.
- [ ] **Step 3: Implement ZIP and folder readers** returning `{path, bytes, text}` entries, skipping `.git`, `node_modules`, build folders, binary extensions, and empty paths.
- [ ] **Step 4: Add empty/corrupt archive validation** so the UI receives typed errors.

### Task 3: Analyze repository structure deterministically

**Files:**
- Create: `src/analyzer.js`
- Create: `src/analyzer.test.html`

- [ ] **Step 1: Define normalized signals** for file count, extension histogram, language histogram, approximate bytes, README, license, package manifests, test files, and config files.
- [ ] **Step 2: Define formula**: each score is `clamp(round(35 + 65 * weightedSignal), 0, 100)` where weighted signals are deterministic ratios/count caps, and retain per-metric contribution rows for the UI.
- [ ] **Step 3: Generate pet state** from the five scores (palette accents, eye size, cheek marks, antenna count) without using commit history.
- [ ] **Step 4: Add browser-run assertions** for the same fixture analyzed twice, ignored folders/binaries, empty archive, and a fixture with README/license/package/tests/configs.

### Task 4: Wire UI, hash snapshots, and exports

**Files:**
- Modify: `src/app.js`
- Modify: `index.html`
- Modify: `styles.css`

- [ ] **Step 1: Render analysis snapshot** with pet state, local date, source label, metrics, signal notes, file summary, languages, and detected markers.
- [ ] **Step 2: Implement hash share** using compact base64url JSON snapshot in `location.hash`, restoring it on load with corruption handling.
- [ ] **Step 3: Implement Repeat analysis and Reset** with correct focus restoration and no stale state.
- [ ] **Step 4: Implement SVG export** from the rendered pet and PNG export via an offscreen canvas with a paper background.
- [ ] **Step 5: Add keyboard/focus behavior, live regions, and reduced-motion-safe transitions.**

### Task 5: Document deployment and local privacy

**Files:**
- Modify: `README.md`
- Create: `.nojekyll`

- [ ] **Step 1: Document accepted URL format, ZIP/folder mode, ignored paths, deterministic formula, no commit-history claims, browser-only privacy, and offline behavior.**
- [ ] **Step 2: Document GitHub Pages deployment from the repository root and static-server preview.**
- [ ] **Step 3: Run the browser assertions and an offline reload smoke test.**

### Task 6: Verification pass

**Files:**
- Modify: any files required by verification findings

- [ ] **Step 1: Run the local test page and record passing assertions.**
- [ ] **Step 2: Validate URL and ZIP fixtures produce identical metrics and pet state.**
- [ ] **Step 3: Validate empty/broken ZIP errors, hash restore, exports, and responsive layout.**
- [ ] **Step 4: Run `rg` for forbidden gradients/glassmorphism/pill styles and fix any accidental matches.**
