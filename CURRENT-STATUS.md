# CieloVista Website Generator — Session Status
**Date:** April 10, 2026  
**Project:** `C:\Users\jwpmi\Downloads\one-electron-universe\createWebsite`  
**Extension:** `C:\dev\cielovista-website-generator`

---

## ✅ Completed This Session

### Publishing Pipeline (fully working)
- `/publish/{slug}` endpoint in `server.js` — copies site from demos/, strips stubs, commits, pushes, deletes local copy
- Workflow fixed: `.github/workflows/deploy-generated-pages.yml` now deploys entire `generated/` folder (was hardcoded to one site) — **committed and pushed**
- Portfolio `generated/index.html` rebuilt on every publish (lists all published sites as clickable cards)
- `release.json` + `published.json` manifest — no duplicate HTML on disk at rest
- `publishedUrl` + `publishedAt` written back to demos meta.json on every publish
- `npm start` from `C:\dev\cielovista-website-generator` starts server with `GENERATED_DIR=demos\`

### My Sites Gallery
- **Publish button** (green) on every card — opens GitHub Pages link after push
- **Published URL** shown as clickable `🌐` link on card, read from meta.json (permanent, no DOM tricks)
- **Published card sorts to top** — list sorts by `meta.publishedAt` desc, falls back to `created`
- **Fix Missing hidden** when not needed — server scans HTML on every `/list` call, counts stubs, caches in `meta.stubCount`, only shows button when `stubCount > 0`
- **Restyle panel** intact — layout picker, section checkboxes, Generate AI images toggle, ↺ Regenerate
- **Auto-fix after Restyle** — `regenSite` automatically calls `_fixMissingImages` after regeneration
- **Blue star favicon** (`#3b82f6`) added to generator UI and portfolio index page
- **Help panel** now centered modal (was right-side drawer) with `r{N}` release badge
- **Cache-Control: no-store** on HTML responses — no more stale page serving

### Fix Missing Images
- Detects both `data-gen-prompt` img stubs AND `*-img-stub shimmer` div stubs
- `addImg` pre-check counts both types before enabling button
- `_fixMissingImages` converts stub divs → img stubs using card title/body from meta.content
- Stub count stored in meta.json at save time and refreshed on every `/list` call

### chord-diagram.js (NEW)
- `C:\Users\jwpmi\Downloads\one-electron-universe\createWebsite\src\chord-diagram.js`
- Copied to `C:\dev\cielovista-website-generator\bundled\src\chord-diagram.js`
- Exports: `drawChord(chord, opts)`, `drawChordSet(names)`, `chordGridHTML(names, opts)`, `CHORDS`
- 25 chords: E A D G C F Em Am Dm Bm + dom7 (G7 E7 A7 D7 B7 C7) + maj7 (Cmaj7 Amaj7 Emaj7 Gmaj7) + min7 (Am7 Em7 Dm7 Bm7) + Bdim
- **Degree colour annotations** for 7th/extended chords: teal=1, amber=3/♭3, blue=5/♭5, coral=♭7, purple=M7
- Auto-annotates any chord with type matching `/7|9|11|13|dim|aug|sus/`

---

## 🔲 TODO / Parking Lot

### Next Up
1. **Wire chord-diagram.js into the generator** — music/guitar sites get chord SVGs in card image slots instead of FLUX calls. Plan: Claude generates chord names in content metadata → builder calls `drawChord()` → SVG embedded inline.
2. **First successful GitHub Pages publish** — confirm `guitar-music-theroy` is live after today's workflow fix push (check Actions tab at github.com/CieloVistaSoftware/one-electron-universe/actions)
3. **GitHub Pages source setting** — must be set to "GitHub Actions" (not "Deploy from branch") in repo Settings → Pages

### Known Issues / Pending
- `npm start` from `C:\dev\cielovista-website-generator` works but requires server restart after any server.js changes
- Bundled extension (`C:\dev\cielovista-website-generator`) needs `npm run rebuild` to pick up bundled file changes for the VS Code extension panel; standalone port 3000 picks up source changes immediately
- `B7` chord definition has 5 fingers — may need fingering review for accuracy
- Open string degree annotations (e.g. A7 string 3 open = ♭7) not yet shown on open-string circles

---

## Key File Locations

| File | Purpose |
|------|---------|
| `createWebsite/server.js` | Local server — all endpoints including /publish, /list, /release |
| `createWebsite/index.html` | Generator UI served at localhost:3000 |
| `createWebsite/src/generator.js` | AI website generator logic |
| `createWebsite/src/chord-diagram.js` | NEW — chord SVG generator |
| `createWebsite/.github/workflows/deploy-generated-pages.yml` | GitHub Actions deploy workflow |
| `createWebsite/generated/release.json` | Release counter |
| `createWebsite/generated/published.json` | Manifest of all published sites |
| `bundled/index.html` | VS Code extension UI |
| `bundled/src/chord-diagram.js` | Extension copy of chord diagram lib |
| `C:\dev\cielovista-website-generator\demos\` | All locally generated sites (source of truth) |

## Working Rules
- Never use mocks; one-time-one-place; ES modules only; never poll
- My Sites tab is the single source of truth — everything syncs to meta.json in demos/
- Run `npm start` from `C:\dev\cielovista-website-generator` to start server with demos/ as GEN_DIR
- Hard-refresh (Ctrl+Shift+R) after server restart to clear HTML cache
- `_push.cmd` pattern for git commits from PowerShell (avoids quote issues with -m flag)
