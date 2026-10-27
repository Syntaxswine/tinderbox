# Tinderbox

An isometric 3D game about a pyromaniac anthropomorphic bear who does drugs and sets things on fire.

Tinderbox will reuse Farmyard Commando's existing UI, art, and suitable gameplay systems, including flamethrower and explosive-barrel work. The first milestone is an audited reuse plan. This repository does not contain a playable game yet.

## Project coordination

The architect owns architecture, worktree assignments, integration, and final quality control. The artist and coder deliver separate commits from their own worktrees. Work enters the integration branch only after the architect reviews the exact candidate.

- [Architecture and reuse decisions](docs/architecture.md)
- [Assignments and promotion gate](docs/workflow.md)
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

The primary checkout is the architect's integration workspace, currently on `master`. No GitHub remote or deployment is configured. Keep commits local until the Tinderbox destination is established; the Farmyard remote belongs to the donor game.
