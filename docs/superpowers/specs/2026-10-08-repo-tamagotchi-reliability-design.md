+# Repo Tamagotchi — reliability and UX design

## Goal

Make Repo Tamagotchi feel like a small, dependable field tool: it accepts a GitHub URL or local ZIP/folder, analyzes only browser-side repository structure, explains every score with concrete evidence, and presents the result in the existing terrarium journal visual system.

## Decisions

### Source flow

The landing state keeps one primary action and two explicit source modes:

- **GitHub**: a strict public `github.com/owner/repo` input with a native URL type, inline validation, timeout/cancel handling, and a clear ZIP fallback.
- **Local**: a ZIP picker, folder picker, and drag-and-drop surface. Both produce the same normalized entry format.

The result view keeps the source label visible and adds a compact “новый источник” action so users can switch without losing the current result accidentally.

### Analysis pipeline

All source paths feed the same pipeline:

1. validate source and create an operation id;
2. read bytes locally or fetch the public GitHub archive;
3. parse ZIP central-directory records with explicit bounds checks and safe limits;
4. normalize paths, strip a shared archive root, drop ignored directories/binary/NUL files, and deduplicate paths deterministically;
5. analyze counts and structural signals;
6. build a serializable snapshot with a schema version;
7. render the snapshot and update the URL hash.

Every async operation checks that it is still current before mutating UI. A cancelled or superseded operation is silent; only the active operation can show an error or result.

### Metrics and evidence

The existing five metrics remain: энергия, любопытство, устойчивость, хаос, опыт. The deterministic formula stays compatible with current snapshots. Rendering changes:

- each metric shows score, bar, and one-line summary;
- a native details disclosure reveals weighted evidence rows;
- evidence rows show the actual observed value and its contribution;
- the general evidence area shows file count, bytes, depth, languages, and repository markers.

The product describes scores as structural signals, not quality judgments or project age.

### Sharing and exports

The hash payload becomes `{version, snapshot}`. Decoder validation checks object shape, score ranges, marker types, and bounded array sizes before rendering. Invalid hashes return the user to a recoverable error state. SVG and PNG export use a clone with explicit dimensions, inline styles/attributes, a paper background, and safe object URL cleanup.

### Accessibility and visual system

Keep the Fraunces/Onest/Azeret Mono stack and ink/paper/marigold/coral palette. Improve hierarchy and density without gradients, glass, pills, decorative bubbles, or SaaS card sprawl.

Add:

- skip link and a labelled main landmark;
- status regions that announce loading, errors, and completion;
- `type=url`, `required`, `aria-describedby`, and clear error/help copy;
- keyboard-accessible ZIP/folder pickers and dropzone;
- visible README/help link at mobile widths;
- touch-friendly controls and reduced-motion support;
- action grouping with clear primary/secondary priorities.

## Error handling

Typed `SourceError` codes cover invalid URLs, network/CORS, timeout, rate limiting, not found, empty sources, unsupported ZIP compression, corrupt ZIP structure, limits, and invalid share data. Messages stay short and actionable in Russian. ZIP parsing rejects out-of-range offsets, truncated names/data, unsupported encryption/methods, too many entries, or excessive uncompressed bytes.

## Testing

The browser fixture page gains assertions for:

- URL parser accepts only GitHub owner/repo forms;
- ZIP parser rejects truncated/out-of-range records and accepts stored/deflated entries;
- normalization remains deterministic and ignores binary/build paths;
- snapshots round-trip with a version and reject malformed payloads;
- superseded operations cannot replace the active result;
- folder/ZIP inputs use the same analyzer result.

Manual verification covers desktop/mobile layout, keyboard focus, error announcements, share restore, SVG/PNG downloads, and reduced motion.

