# Dry-wood exterior fire candidate

Coder branch: `codex/coding`, based on `e851cfe5b206a0adc86fafdcb87761ac8a5f7886`. This candidate is for architect review and integration; it has not been promoted to master or deployed.

## Result

Playable street buildings and native exposition walls default to dry wood. Surface temperature, sustained heat exposure, finite wood mass, radiation, upward plume heating and wind determine where fire spreads. The existing ground field, tools, drugs, clocks, vendor assets and native module dimensions remain the integration foundation. Upper-wall burnout now follows its own part state.

The [model notes](../fire-model.md) identify primary scientific sources, SI units, material assumptions, equations, the additive snapshot contract and approximation boundaries. The implementation is in `src/simulation/structure-fire.js`; the runtime's bounded instanced view reads the same surface state. Renderer factories retain the single pinned Three instance.

## Verification

- `node tools/check.mjs`: **71 tests pass**, 64 own scripts pass syntax, 71 static modules resolve, every raw vendor provenance hash and the inherited art smoke check pass.
- `node tools/build.mjs`: **77 public files**, 25,326,320 bytes; workbenches, docs, screenshots and helper records remain outside the public distribution.
- `node tools/check-release.mjs`: all 77 hashes and resources pass at a nested project URL.
- Browser production suite: **9 pass, 0 fail**. Six real WebGL create/update/dispose cycles, failure cleanup, pause/blur and idempotent disposal pass; production rebuild resource counts stay stable. [Browser evidence](fire-browser-evidence.json).
- Desktop 1280×900, phone 390×844 and narrow phone 320×568 reviewed. No horizontal overflow; touch controls are at least 44px high. This is desktop browser viewport testing, not a physical handset performance claim.
- In the five-story phone case, the 10.48 m native assembly remains unchanged and the highest burning surface reaches 10.23 m after 60 world seconds. [Phone evidence](fire-phone.png), [desktop](fire-desktop.png), [narrow wind case](fire-narrow-wind.png).
- Constant-flux coupons distinguish weak/strong exposure, pilot/no pilot, brief pulses and moisture. Energy accounting closes within floating-point tolerance; finite timber exhausts without creating fuel. Fixed recordings agree at 30/60/120 Hz and bounded hitches. Halving patch size or thermal timestep preserves the tested climb arrival within 20%.

The [repeatable comparisons](physics-evidence.json) use a 30-second, 80 kW/m² source exposure on native 3-story/2-story frontages. A 0.75 m calm gap ignites the receiver at 29.1 world seconds; 6 m/s toward it changes that to 10.1 seconds. The 3 m gap stays unlit through 90 seconds. These are model comparisons, not measured real-world ignition predictions. Wet and noncombustible coupons are solver controls; Tinderbox buildings remain dry wood.

## Integration notes

The additive `snapshot.structureFire` joins the artist's modules by stable part IDs. Ground fire cells are still available. A map can project burning surfaces onto x/y while retaining h for height indicators. Renderers must consume `phase` and `powerW`, without inventing ignition from a texture or flame animation. The new runtime view is a technical presentation; artist-owned reskins can use this state without changing geometry or the solver.

Existing normalized ground heat is not a physical flux. Only consumed ground fuel supplies the explicit wall heat bridge. That bridge is currently one-way; wall fires do not yet feed heat back into the old ground field or trigger drums through that field. Roof-envelope bounds remain decorative, since they are not the actual sloped mesh. Airborne embers, interior ventilation and structural collapse remain future work. Representative material/char/wind parameters require further calibration before quantitative claims.

Preview helper PID 34508 (creation FILETIME 134376379140110714) was registered, preserved to a durable restart bundle, stopped through its private marker, and confirmed exited with port 4550 released. All three task-owned review tabs were closed and the temporary browser viewport override reset. No preview service is retained.
