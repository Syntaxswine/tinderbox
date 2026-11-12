# Another layer: what the cheap arithmetic could carry next

- **Asked by the owner, 2026-11-11:** "remember, the math was the cheap part, if you want to expand on those rules its easy and affordable to make upgrades there. if you have ideas for other parts they are welcome too. i build like sediment, layers grow on layers untill the game settles into what it wants to be. this is your chance to add another layer"
- **What this is:** proposals from the reviewer, for the architect to take, change or leave. Nothing here is accepted. The reviewer builds none of it in the game.
- **What it rests on:** the architect's accepted replay on `codex/review-furnished-house`, which costs 26.7 ms of fire arithmetic and 157.9 ms of drawing preparation a step at its peak, and six review rounds on the fire-travel rules. One idea below was trialled in the reviewer's kernel. Every other idea is untested and says so.
- **The measure:** the owner's, of that replay: it "captures the fear of how intense the fire is". Each idea says what it would add to that, in one line, before it says anything else.

## Part 1. Rules: seven upgrades, each one more number per tile or per fuel

### 1. A grass fire is cooler than a timber fire, and a house stands on stone. Trialled

**What the player gets:** a lawn fire that runs up to a house and licks at its foot while the player wonders whether it will take. Today it takes at once.

Review round 6 found that on a lawn the grass lit the clapboard 0.4 s after a match and rang the house; half the house was alight at a median of 28 s, against 45 s on bare ground. Three rules, each one number, were tried against that on all 101 strikes with lawn to the walls (`evidence/fire-travel-rules-trial/results/layer/`):

| On a lawn | Half the house in 40 to 70 s | Median |
| --- | ---: | ---: |
| As the rules stand | 14 of 101 | 28.1 s |
| **Plinth:** the foot of a ground-storey wall is stone to the plan's plinth height, and that share of it is shielded from the tile outside | 14 | 30.3 s |
| **Low flame:** grass sends a fifth of its heat to the tiles above | 14 | 29.2 s |
| **Cool flame:** a tile fed only by grass cannot be driven above 1.6, where timber drives it to 2.9 | 14 | 29.6 s |
| Plinth and low flame | 28 | 33.6 s |
| Plinth and cool flame | 29 | 34.9 s |
| **All three** | **39** | **39.7 s** |
| For scale: bare ground, as the rules stand | 66 | 45.0 s |

- **No one of them does anything alone.** The plinth fails alone because the grass flame heats the air above it and lights the wall over the stone. The cooler or lower flame fails alone because the wall's foot is still wood.
- **Together they get half way.** By plan it is uneven: Ashland, whose whole ground storey is stone, goes from 0 of 14 to 13; Hopkins 15 from 4 of 18 to 11; Hopkins 9 and 13 do not move.
- **Grass speed is untouched:** 1.58 and 1.52 m/s with the cool and low flame, as without.
- **The old target 2 goes,** and should: "a lawn fire lights a wall in under 2 s" is the thing these rules are there to stop.
- **Limits.** Three surveys and five controls, one run each, in the reviewer's kernel and scene, not the workbench. The numbers 1.6 and a fifth were first guesses and were not tuned. Why Hopkins 9 and 13 do not move was not looked into; round 6 found their upper floors overhang the grass.

All three are off by default in the kernel (`shield` on a surface, `rises` and `hot` on a fuel class). With them off, the saved surveys are byte-identical.

### 2. Air. Untested

**What the player gets:** a shut room that smoulders, dark and quiet, and a window that, once broken, feeds it. The bear's own tools make the fire worse in a way he can see.

One more number per tile: air. Burning spends it; an open face to outdoors refills it; a fuel's output is scaled by the air in its tile. A shut room burns down to a glow. Breaking glass, or a door burning through, lets air in and the room goes up. With the stored heat already in the tiles, the first seconds after an opening are the strongest the room will ever be: that is a backdraft, and it needs no rule of its own.

- **Check:** a sealed room's output falls to a floor within some seconds of lighting and rises within a second of a window breaking; the replay's kitchen start with every window unbroken ends as a smoulder.
- **Risk:** it slows the developing fire the owner accepted. Tune it on the accepted kitchen replay first, so that the house as built (windows that break at 1.6) burns the same.

### 3. The hot layer and flashover. Untested

**What the player gets:** the pause before a room goes. Fire on one wall, smoke thickening at the ceiling, and then everything in the room at once.

The workbench already sends blocked upward heat sideways under a ceiling. Take the top-layer tiles joined by open faces as one pool, found by walking faces, with no room label. When the pool's coolest tile passes a set heat, every unlit fuel under it is exposed to the pool, not to its own tile. The room goes together, and the pool reaches as far as the open doors let it.

- **Check:** in a shut room the last fuel lights within two seconds of the first one lit by the pool; with the door open the pool is two rooms.
- **Risk:** this is the reach rule again in another coat. Reach was withdrawn because it ran along surfaces it was not meant for. The pool must be bounded by faces and by its own heat budget, and tested on a long hall and an open-plan floor before a house.

### 4. Smoke as a tile number. Untested

**What the player gets:** a house that tells you what it is about to do. Smoke under the eaves before flame at the window.

Burning adds smoke to its tile; smoke rises by the same weights as heat, pools under closed faces and leaves by open ones. It costs one number and one pass. It is the cheapest thing here and it feeds three others: the drawing (Part 2, A), what the people in the street can see, and the warning of a room about to flash over.

- **Check:** a ledger like fuel's (made, vented, left); smoke at an upstairs window before any upstairs fuel lights.

### 5. Firebrands. Untested

**What the player gets:** watching sparks cross the street and wondering which roof they will find.

"Should a burning house light one it does not touch" has been the owner's open decision since round 1, and three forms of radiant reach failed review. Firebrands answer it with something the player can see coming. A tile burning hard under open sky sheds a brand every so often; the wind sampler the workbench already has carries it; it lands as a small lit fuel on the first surface or ground under its path. Which tile, when and how far come from a hash of tile and step, never a random draw, so a replay is still a replay.

- **Check:** in calm air nothing leaves the lot; at 1.5 m/s east, brands land in a fan to the east and none to the west; a brand on stone or bare ground goes out; the fuel ledger closes with brands counted.
- **This would also carry fire across the road** between the street's two rows, which nothing else in the rules does.

### 6. A warning before a fall. Untested

**What the player gets:** dread. The floor sags and groans before it goes.

A support patch already has an age and a failure point. Publish an event when it passes four fifths of the way, and a sag in between. The arithmetic is one comparison. The art and sound do the rest.

### 7. Heat you cannot stand in. Untested

**What the player gets:** being driven back. The fire decides where the bear can be.

Rule 11 of the rules record said things should read the heat of the tile they are in, and neither trial did it. The radiant dose the workbench already computes at 2 m and 8 m is the number: above a threshold the bear is slowed or hurt, and the people in the street back away by the same field. It gives the fire a front the player feels before he sees it.

## Part 2. Other parts: where the 158 ms goes

These are ideas from reading the architect's `performance.md`, not from profiling. The coder and artist are already profiling; where an idea below is already on their list it says so.

- **A. Draw from the tile field, not from each fuel.** At the peak the replay prepares about 3,900 burning fuels a step. A house is about 20 by 20 by 5 tiles. Pack heat, flame and smoke for each tile into a small data texture, write only the tiles that changed, and let flame and smoke cards read it in the shader. Preparation then scales with tiles that changed, not with fuels that burn. Fine detail (which chair, which board) stays on the few dozen things nearest the camera.
- **B. Cache by a topology revision.** Grouping of connected surfaces and support lookups change only when a face opens or a piece falls. Bump a counter then and rebuild only then. On their list.
- **C. Animate in the shader.** Flicker and lick from time and a per-instance seed, so a steady fire costs no CPU. On their list.
- **D. Stagger what is far or hidden.** Update a tile's presentation every second or fourth frame by a hash of its coordinates, every frame only near the camera or when it changes state.
- **E. Let the simulation pick the lights.** Six lights from the six hottest clusters, which the fire loop can keep cheaply as it goes, instead of the presentation searching for them.
- **F. Distant houses as glow.** For a house across the street: window glow and roof flame from a few sums per face, no per-tile drawing at all.
- **G. Sound from events.** Glass, groan, fall, and a roar that follows total output. The events exist; the fear is cheap.

## Part 3. What I would put down first

1. **Air (2).** It is the one that makes the player's own actions matter to the fire, and it is one number.
2. **Firebrands (5).** It settles the oldest open decision with something that is frightening to watch.
3. **Plinth, low flame and cool flame together (1),** when the house goes onto the street's grass, because without them the accepted developing fire is at risk there.
4. **Drawing from the tile field (A),** because the arithmetic has room to grow only once the drawing stops scaling with it.

Smoke (4) comes along with A for nothing.

## Limits

- One idea trialled, in the reviewer's kernel, which is not what the coder builds from. The rest are reasoning.
- No fire-science source was read for any of this.
- Nothing here was tried against the accepted replay. Each idea names the check that would show whether it keeps or loses what the owner liked.
