+# Repo Tamagotchi reliability and UX implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the browser-only repository analyzer and refine its field-journal interface so source loading, scoring, sharing, accessibility, and exports behave predictably on desktop and mobile.

**Architecture:** Keep the no-build vanilla ES module structure. `src/sources.js` owns source parsing, safe ZIP reading, and typed errors; `src/analyzer.js` owns deterministic normalization/scoring; `src/app.js` owns an operation token, snapshots, rendering, URL sharing, and exports; `index.html` and `styles.css` expose the same behavior through the existing design system. Extend the browser fixture page rather than adding a framework or dependency.

**Tech Stack:** Static HTML/CSS, browser ES modules, File API, DecompressionStream, SVG/Canvas exports, browser fixture assertions.

---

### Task 1: Harden source parsing and local source selection

**Files:**
- Modify: `src/sources.js`
- Modify: `index.html`
- Modify: `src/app.js`
- Test: `src/analyzer.test.html`

- [ ] **Step 1: Add failing source tests** for strict GitHub hosts/owner/repo forms, rejected query/path forms, ZIP truncation, out-of-range local offsets, and unsupported/encrypted methods.
- [ ] **Step 2: Run the browser fixture page and confirm each new assertion fails for the current implementation.**
- [ ] **Step 3: Implement strict URL parsing** that accepts optional http(s), optional www, exactly github.com, one owner and one repository, optional trailing slash or `.git`, and rejects extra path/query/hash segments.
- [ ] **Step 4: Implement ZIP safety limits and bounds checks**: reject central-directory offsets outside the byte array, verify every name/extra/comment/data slice before reading, reject encrypted entries and unsupported methods, cap entry count and total uncompressed bytes, and keep typed `SourceError` messages.
- [ ] **Step 5: Add a dedicated folder picker** using a second hidden file input with `webkitdirectory`; keep ZIP picker and dropzone behavior, and label each option accurately.
- [ ] **Step 6: Run the fixture page again and verify all source assertions pass.**

### Task 2: Make async analysis state race-safe

**Files:**
- Modify: `src/app.js`
- Test: `src/analyzer.test.html`

- [ ] **Step 1: Add a failing race test helper** that starts two deferred operations and asserts only the latest operation can commit a snapshot or error.
- [ ] **Step 2: Run the fixture page and verify the race assertion fails against the current global state flow.**
- [ ] **Step 3: Add an operation id/token** incremented for every new analysis/reset; guard every async continuation, `showError`, status update, and render commit with the active token.
- [ ] **Step 4: Ensure aborts and superseded operations do not replace the active view, while the active operation always clears busy controls in `finally`.**
- [ ] **Step 5: Run the fixture page and verify race assertions plus existing analyzer assertions pass.**

### Task 3: Version and validate share snapshots

**Files:**
- Modify: `src/app.js`
- Modify: `src/analyzer.test.html`

- [ ] **Step 1: Add failing tests** for versioned encode/decode round-trip, invalid base64, missing fields, out-of-range metric scores, oversized language/metric arrays, and legacy snapshot recovery behavior.
- [ ] **Step 2: Run the fixture page to confirm malformed snapshots are currently accepted or crash without a typed error.**
- [ ] **Step 3: Add `SNAPSHOT_VERSION`, wrap encoded data as `{version, snapshot}`, and validate every primitive/array bound before rendering.
- [ ] **Step 4: Keep current compact payload fields only; never serialize raw entries or file contents. Render a recoverable error for invalid hashes and clear the hash on reset.**
- [ ] **Step 5: Run the fixture page and verify round-trip and rejection assertions.**

### Task 4: Improve evidence rendering without adding noise

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] **Step 1: Add semantic result controls**: skip link, `main` id, live error region, source-switch action, and a details container for per-metric evidence.
- [ ] **Step 2: Replace long concatenated metric notes with a one-line summary plus `details/summary` evidence rows** showing label, observed value, weight, and detail.
- [ ] **Step 3: Add an explicit source summary row** with source kind, included-file count, and local analysis time; keep copy factual and concise.
- [ ] **Step 4: Keep all dynamic text escaped and render empty language/marker states with meaningful copy.**
- [ ] **Step 5: Add CSS for compact evidence rows, focus-visible disclosure, and action grouping while preserving the existing Fraunces/Onest/Azeret Mono tokens and no-gradient/no-glass rules.**

### Task 5: Accessibility and responsive polish

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`

- [ ] **Step 1: Add `type=url`, `required`, `aria-describedby`, `role=alert`/live error messaging, labelled action groups, and a real button semantic for the dropzone.
- [ ] **Step 2: Preserve help/README access at mobile widths, improve placeholder contrast, add `touch-action: manipulation`, and tune heading wrapping and panel density.
- [ ] **Step 3: After reset/source errors/results, move focus to the relevant heading or control without stealing focus during typing.
- [ ] **Step 4: Run keyboard-only checks for tab order, Enter/Space activation, escape/reset behavior, live status announcements, and reduced-motion CSS behavior.**

### Task 6: Harden exports and final verification

**Files:**
- Modify: `src/app.js`
- Modify: `README.md`
- Modify: `src/analyzer.test.html`

- [ ] **Step 1: Add failing export checks** for SVG namespace/size, paper background, and object URL cleanup when PNG conversion fails.
- [ ] **Step 2: Implement a shared export clone helper** that inlines dimensions and paper background without altering the on-page SVG; ensure `toBlob` null/error paths surface a short status.
- [ ] **Step 3: Update README** with folder picker behavior, limits, snapshot versioning, structural-score wording, and the browser-only privacy boundary.
- [ ] **Step 4: Run all browser assertions through a local static server; verify desktop 1440px and mobile 390px layouts, URL/ZIP/folder equivalence, reset, malformed hash, and both downloads.
- [ ] **Step 5: Run `rg` checks for forbidden gradients/glassmorphism/pill styles and inspect the final diff for accidental copy or metadata additions.**

