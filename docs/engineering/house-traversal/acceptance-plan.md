# Paired-door registration and H15 circulation acceptance

This is compiler preparation for [Milestone 28](../../milestones/28-tree-and-traversal-corrections.md), based on common commit `32576da673524a5bbff39ea556976ab24e0310fd`. The artist owns the versioned physical/rendered circulation successor and its exports. This checkpoint changes no asset, input, navigation, native body, fire rule or clock. Its focused compiler checks do not establish traversal acceptance. No new browser, asset preview or build is part of this preparation.

## Registration contract

`manifest.doors` remains optional. Each explicit row has a qualified existing door opening `id`, optional `openingIds`, optional world-space `position`, and optional `label`. An omitted membership list means the original one-opening override. A paired row includes its target opening in its membership. The agreed H15 identity keeps the original target as the left leaf and adds `/right` for the second native leaf:

```js
{
  id: 'hopkins-fifteen::opening/l0/5-0-6-0',
  openingIds: [
    'hopkins-fifteen::opening/l0/5-0-6-0',
    'hopkins-fifteen::opening/l0/5-0-6-0/right'
  ],
  position: [19, 1.48, 13.15],
  label: 'House door'
}
```

The example position is the previous interaction centre, not a claim about the successor's final geometry. The artist supplies the final measured point and exported registration. The compiler validates known `kind: 'door'` openings, one owning instance, unique action IDs and unique leaf ownership. A group's target must be one of its leaves. Unknown/non-door targets, unknown/non-door members, duplicate/reused leaves, cross-instance membership and malformed groups refuse compilation. Existing Bell & Alder `closingTime.doors` already reserve their leaves. Explicit groups cannot steal them. A new explicit group on otherwise unclaimed leaves can coexist with those actions.

Only the anchor opening emits the grouped contextual registration; other members emit no separate action, regardless of their source order. Unrelated doors retain their original registrations. Published group membership and position arrays do not alias the manifest.

The existing `catalogue-thermal.js` path already resolves every member's live boundaries, excludes the complete group when testing reach, checks every proposed leaf pose against native occupants, and submits the opening changes from one accepted interaction. This checkpoint reuses it unchanged. Actual paired-source occupancy and action tests remain required after intake; code inspection alone is not acceptance.

## Captured regressions to preserve

The [published baseline](../../reviews/2026-11-16-house-traversal-baseline.md) preserves the unchanged control, real input and normal-zoom JPGs. The owner's exact original house/backend remains unconfirmed.

| Case | Captured obstruction | Required successor behavior |
| --- | --- | --- |
| Bear approaching Hopkins 15 | Upper porch post `attachment/house/gross-housing-hopkins-4-15/3/exterior-ornament/47/prototype-entry-rail-post`; original post gap 1.125 m, bear diameter 1.12 m, authored local X 5.00375 | Native bear walks the supported approach and actual open entrance with practical clearance; no forced centring, body change or collision exemption |
| Goat leaving the open front door | `attachment/house/gross-housing-hopkins-4-15/0/level-0/0/group/33/wall-4-0-5-0/2/interior-skirting`; throat X 4.4925..5.5075; a real 20 mm world-X step leads to contact | Repeat real Open, enter, inside Close/Open, walked offset, reversal and exit; preserve the occupied-threshold rejection while allowing the intended clear route |

Keep these raw IDs and measurements as control evidence even if the successor replaces the pieces. Record the successor's exact source IDs and route differences. Use the same original street spawn and normal input to reach each stance; do not relocate the player or force door state.

## Acceptance after the exported candidate

First pin the artist commit, export paths/hashes, versioned adaptation and actual rendered/physical/support/fuel agreement. Confirm the artist's preview helper has closed before starting the one coder gameplay review. Run no competing renderer. The frozen original and access125 control remain available separately.

Use the measured native profiles throughout:

| Animal | Radius | Height | Maximum step |
| --- | ---: | ---: | ---: |
| Goat | 0.50 m | 1.66 m | 0.22 m |
| Horse | 0.50 m | 1.66 m | 0.22 m |
| AFT bear | 0.56 m | 1.68 m | 0.22 m |

Prepare focused physical controls across all three profiles, both travel directions, centred and ±0.05/±0.10 m offsets, full input and partial magnitudes 0.2/0.5. Preserve 9 m/s at full input and the original powder/world clocks. Sweep the front approach, both doorway sides, kitchen return, actual tread bearing, mid-flight reversal and upper landing/exit. Exact candidate geometry is needed before these controls can be implemented and passed.

The real-input review starts with both captured regressions. It then covers each animal with real keyboard and captured mouse input, varying full/partial magnitude and actual walked offsets along the route. Release, stop and reverse on real treads. Use the actual contextual button from inside and outside and verify one target changes both leaves. Preserve per-frame held input, player/support/elevation, accepted path, leaf state and existing blocker diagnostics, plus normal-zoom JPGs. Mark any unrun combination explicitly. A controlled fixed-step run establishes behavior; it does not establish wall-clock FPS or phone Safari performance.

Required negative controls are closed leaves blocking travel, either leaf's destination pose occupied on opening or closing, stale/out-of-reach interaction refusal, ordinary solid wall/rail contact, an unsupported edge and unchanged native step/headroom limits. Exercise each member of the pair independently so a first-leaf-only check cannot pass. A rejected close at an occupied threshold is expected safety behavior, not a traversal failure.

Stop on the first sustained unexpected stall, preserve the trace and source cause, and correct it before promotion. After the exact asset and focused controls pass, run one coherent repository/build/package gate and normal-zoom gameplay review. Retain M27 fire/shroud/light/grass behavior and cache ownership; no new fire profile or donor update is authorized. Architect review and promotion remain separate from the coder's candidate push.

## Preparation checks

`node --test tests/sandbox/catalogue-doors.test.mjs` covers grouped registration, source order, compatibility, input detachment and invalid ownership/membership. Actual successor traversal, paired-leaf occupancy, exported package checks and browser acceptance remain pending the artist delivery.
