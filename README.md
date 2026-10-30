# Tinderbox

An isometric 3D game about a pyromaniac anthropomorphic bear who does drugs and sets things on fire.

The current preview opens on a warm brown, period title screen: **Play → animal and destination selection → one separate map**. Options contains shared interface preferences and controls. Choose the native Farmyard goat, horse or existing AFT bear. The delayed Nautilus bear is a later addition.

The four destinations are Catalogue Street, New York State Building, Administration Building and Horticultural Building. Catalogue Street retains the six original house designs, joined Monroe rows, five tools, walk-over medicine, continuous gasoline trails and spreading fire. The three landmark visits add exploration, contextual doors and real stairs, loading nearby geometry as needed. Fire remains a street mechanic in this release.

This preview is [published with the user's explicit approval](docs/reviews/2026-10-29-explorable-places.md) before final stair-route and desktop/phone visual acceptance. Automated tests and package checks pass; doorway, stair and cutaway corrections may follow. The review record distinguishes completed checks from deferred gameplay acceptance.

The setting reference is the 1893 World's Columbian Exposition. The [research dossier](docs/research/1893-exposition/README.md) links original plans, architectural drawings, photographs, maps and guides, with exact locators and uncertainties. The fictional street combines [the first catalogue houses](docs/research/catalogue-neighborhood/README.md) and [three further designs](docs/research/catalogue-block-two/README.md). Native dimensions, source painting and provenance are preserved; playable access additions and cutaways are identified game adaptations. New York's attic stays closed; wall-climb fire and collapse physics remain later work.

## Play and develop

Play [Tinderbox on GitHub Pages](https://syntaxswine.github.io/tinderbox/). Node.js 22 or newer is needed for local checks; no package installation is required.

```sh
npm run check
npm run build
node tools/check-release.mjs
npm run serve -- --root dist --port 4550 --ttl 1800
```

Open `http://127.0.0.1:4550/`. The loopback preview expires after 30 minutes; stop it immediately when finished. Agents must register retained previews under the user's helper policy.

Move with WASD/arrows or the joystick. Base movement is **9 m/s**, three times the initial preview; partial stick movement remains analog. Mouse gestures recover from missed releases and retain their direction when the interface shifts. The [movement/input review](docs/reviews/2026-10-29-movement-input.md) records the tested correction and the unconfirmed exact stair report.

In Catalogue Street, point or tap the ground to aim, select tools with 1–5, and use Space or the action button. Matches ignite one target tile per press. Jerry-can pouring toggles on a press and follows accepted movement. Light a torch once, carry it for its finite burn time, then press its action to ignite nearby fuel. Hold the flamethrower action to discharge it.

Walk over powder or pills to use them automatically. Powder increases player speed while slowing world time, including fire. Healing restores HP and stays on the ground at full health. Inversion reverses movement by 180 degrees. In landmark visits, approach a door and click its floating **Open/Close** button; E/Space also works. Move clear of the doorway to close it safely. Walk along the actual stairs. Overview/Follow changes the camera, not the player's position. Pause and Return to Places cancel held input and dispose the current visit. The [door review](docs/reviews/2026-10-29-contextual-doors.md) records its acceptance and publication status.

For the reproducible browser acceptance page, serve the source root and open `/workbenches/integration/`. It runs the actual simulation, art and UI together. Workbenches and evidence are excluded from the public build.

The focused production-street review is `/workbenches/art/neighborhood.html`, with desktop/phone frames, entry/rear/gap views, actual UI behavior and an accelerated burn-out fixture. `/workbenches/art/shared-bear.html` retains the earlier native-character review. Offline review tools under `tools/review/` can reproduce the saved house-layout render; they do not establish WebGL acceptance.

## Project coordination

The active [explorable-places assignment](docs/milestones/08-explorable-places.md) combines the title, four maps, selectable animals, playable interiors/stairs and nearby sections. Its [architect review](docs/reviews/2026-10-29-explorable-places.md) records exact worker intakes, corrections, checks and publication status.

The architect owns architecture, worktree assignments, integration, and final quality control. The artist and coder deliver separate commits from their own worktrees. Work enters the integration branch only after the architect reviews the exact candidate.

- [Architecture and reuse decisions](docs/architecture.md)
- [Architect's reconciled reuse plan](docs/reuse-plan.md)
- [Active proposal: joined rows and deliberate ignition](docs/milestones/06-row-houses-and-ignition.md)
- [Artist proposal: New York State Building exterior](docs/milestones/07-new-york-state-building.md)
- [Last implementation checkpoint: second catalogue block](docs/milestones/05-catalogue-block-two.md)
- [First catalogue neighborhood](docs/milestones/04-catalogue-neighborhood.md)
- [Shared bear protagonist](docs/milestones/03-shared-bear-protagonist.md)
- [Reviewed exposition construction kit](docs/milestones/02-exposition-foundation.md)
- [Exposition research and original sources](docs/research/1893-exposition/README.md)
- [Original burning-trail mechanics](docs/milestones/01-burning-trail.md)
- [Art reuse audit](docs/art/farmyard-reuse-audit.md)
- [Runtime reuse audit](docs/engineering/farmyard-reuse-audit.md)
- [Assignments and promotion gate](docs/workflow.md)
- [Reuse foundation review](docs/reviews/2026-10-27-reuse-foundation.md)
- [Exposition construction-kit acceptance](docs/reviews/2026-10-27-exposition-foundation.md)
- [Shared bear candidate review](docs/reviews/2026-10-28-shared-bear-protagonist.md)
- [Catalogue neighborhood review and offline preview](docs/reviews/2026-10-28-catalogue-neighborhood.md)
- [Second catalogue block review and JPG previews](docs/reviews/2026-10-28-catalogue-block-two.md)
- [Pinned Farmyard source](docs/source-baseline.json)
- [Repository instructions](AGENTS.md)

## Asset layout

- `art/source/`: editable originals, concept sheets, and generation inputs.
- `assets/art/`: game-ready exports, including sprites, textures, backgrounds, and UI.

Use descriptive lowercase-kebab-case filenames. Keep source and export names paired
so each game asset can be traced back to its editable original. Record prompts or
export settings alongside an asset when they are needed to reproduce it.

Copied assets also need a source revision, original path, SHA-256, license/provenance evidence, and any adaptations recorded beside the import. The editable-original convention applies to new art; a third-party asset may have only the original supplied export.

## Delivery status

The primary checkout is the architect's workspace, currently on `codex/movement-input`; `master` remains the integration and deployment branch. [Syntaxswine/tinderbox](https://github.com/Syntaxswine/tinderbox) is configured as `origin`; worker branches share that remote. The Pages workflow checks and packages `master`, then deploys the generated `dist/` artifact when Pages is configured and the repository variable `PAGES_ENABLED` is `true`. The donor game has its own repository and deployment.

The repository is public with the user's approval. The [explorable-places release record](docs/reviews/2026-10-29-explorable-places.md) contains the current preview's publication, verification and deferred corrections. The [exposition acceptance](docs/reviews/2026-10-27-exposition-foundation.md) and [opening mechanics review](docs/reviews/2026-10-27-burning-trail.md) preserve the earlier releases.
