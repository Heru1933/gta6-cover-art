# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Heru1933/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Heru1933/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Coast — an offline web app that turns any photo and a caption into GTA 6 poster-style cover art: multi-panel layouts, Vice City sunset and neon colour grades, bold poster lettering, and PNG export in post sizes (1080×1080, 1080×1350, 1920×1080, plus story 1080×1920). No Rockstar logo, artwork or fonts — all art and lettering is original, drawn in code. Photos never leave the machine.

## What's in round 3

- **Nine-panel poster layout (3 × 3)** with a title block — the strongest cover in the studio.
- **Distinct crop per panel**: every panel shows a different zoom/pan of its photo, so the same photo never repeats identically; wide panels anchor their crop to the upper third so faces are never cut at chin level.
- **Poster treatment**: thick ink borders, duotone banding and halftone dots on every panel; halftone sky in the title block.
- **Richer title block**: two-layer skyline with lit windows, palm silhouettes, a big gradient sun with a sea reflection, a five-star heat meter and a VICE COAST badge ribbon.
- **Polaroid snapshots**: the tilted snapshot layout is now real polaroids — white frame, deep bottom edge, tape strip, drop shadow.
- **Story size** 1080 × 1920 export, alongside 1080×1080, 1080×1350 and 1920×1080.
- **Undo / redo** (buttons and Ctrl+Z / Ctrl+Y) for every editor change.
- Four grades (Sunset, Neon Nights, Miami Vice, Dusk Noir), film grain + vignette, and the hero / grid / strip layouts from before.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser, load a photo (or several), pick a layout and grade, edit the caption, and export a PNG.

## Verify it

```sh
node serve.ts --port 8080
# in a headless browser, open http://localhost:8080/?selftest=1
# document.body.dataset.selftest reports PASS when every layout renders at
# every export size, all panel crops are distinct, and undo/redo round-trips.
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=Heru1933&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
