# Tinderbox

An isometric 3D game about a pyromaniac anthropomorphic bear who does drugs and sets things on fire.

The current **Catalogue Street** candidate extends the first three-house street to six original artist designs, with the native painted bear, original Farmyard horse/goat civilians, five tools, three drug effects, continuous gasoline trails and spreading fire. It runs in a browser with WebGL 2.

Hopkins Nos. 9, 12, 13 and 15, the Gross Ashland cottage and the Monroe Street brick row-house design retain the artist's actual native geometry, siding, shingles and window/porch details. The committed Nautilus sash update supplies the centered upper windows on Nos. 13 and 15. A following camera and conservative house fading keep the bear visible around the buildings. Ground footprints govern movement and fire; each house chars and retires with its collider group when its finite fuel is spent. The existing interface still uses the imported Farmyard control assets; a future UI pass must begin with the donor's actual component layout and recipes.

[Browser acceptance is pending](docs/reviews/2026-10-28-catalogue-block-two.md). The public Pages build remains the reviewed **Exposition Study**, with its provisional bear; this review branch contains the shared AFT bear and new houses.

JPG previews: [all six houses](docs/reviews/media/2026-10-28-catalogue-block-two-overview.jpg) and [the three additions](docs/reviews/media/2026-10-28-catalogue-block-two-new-houses.jpg). These offline views omit characters, fire and UI.

The setting reference is the 1893 World's Columbian Exposition. The [research dossier](docs/research/1893-exposition/README.md) links original plans, architectural drawings, photographs, maps and guides, with exact locators and uncertainties. The street is a fictional arrangement of [the first catalogue houses](docs/research/catalogue-neighborhood/README.md) and [three further designs](docs/research/catalogue-block-two/README.md), preserving the reusable Farmyard/AFT dimensions. Interiors, stair traversal, wall-climb fire and collapse physics remain separate work.

## Play and develop

Play [Tinderbox on GitHub Pages](https://syntaxswine.github.io/tinderbox/). Node.js 22 or newer is needed for local checks; no package installation is required.

```sh
npm run check
npm run build
node tools/check-release.mjs
npm run serve -- --root dist --port 4550 --ttl 1800
```

Open `http://127.0.0.1:4550/`. The loopback preview expires after 30 minutes; stop it immediately when finished. Agents must register retained previews under the user's helper policy.

Move with WASD/arrows or the joystick. Point or tap the ground to aim. Select tools with 1–5; use Space or the red action button. Jerry-can pouring toggles on a press and continues while moving. Torch and flamethrower require holding the action. Q uses powder, E heals, R reverses the movement stick; Esc/P opens pause, options and reset.

For the reproducible browser acceptance page, serve the source root and open `/workbenches/integration/`. It runs the actual simulation, art and UI together. Workbenches and evidence are excluded from the public build.

The focused production-street review is `/workbenches/art/neighborhood.html`, with desktop/phone frames, entry/rear/gap views, actual UI behavior and an accelerated burn-out fixture. `/workbenches/art/shared-bear.html` retains the earlier native-character review. Offline review tools under `tools/review/` can reproduce the saved house-layout render; they do not establish WebGL acceptance.

## Project coordination

The architect owns architecture, worktree assignments, integration, and final quality control. The artist and coder deliver separate commits from their own worktrees. Work enters the integration branch only after the architect reviews the exact candidate.

- [Architecture and reuse decisions](docs/architecture.md)
- [Architect's reconciled reuse plan](docs/reuse-plan.md)
- [Current candidate: second catalogue block](docs/milestones/05-catalogue-block-two.md)
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

The primary checkout is the architect's workspace, currently on `codex/catalogue-block-two`; `master` remains the integration and deployment branch. [Syntaxswine/tinderbox](https://github.com/Syntaxswine/tinderbox) is configured as `origin`; worker branches share that remote. The Pages workflow checks and packages `master`, then deploys the generated `dist/` artifact when Pages is configured and the repository variable `PAGES_ENABLED` is `true`. The donor game has its own repository and deployment.

The repository is public with the user's approval, and the exposition construction-kit study is live on Pages. The [publication run](https://github.com/Syntaxswine/tinderbox/actions/runs/40606724201) passed both build and deployment; all 70 hosted game files match the reviewed package. Source evidence, checks and remaining art scope are recorded in [the architect's acceptance](docs/reviews/2026-10-27-exposition-foundation.md). The [opening mechanics review](docs/reviews/2026-10-27-burning-trail.md) remains the earlier gameplay baseline.
