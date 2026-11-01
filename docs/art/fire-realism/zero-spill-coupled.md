# Zero local spill causal ablation

The [source note](../../../workbenches/art/fire-realism/zero-spill-coupled/README.md)
and [provenance](../../../workbenches/art/fire-realism/zero-spill-coupled/provenance.json)
record PRIMARY commit `344202f12ea2756508f60e14de393cce0b83c737` and exact34af
lineage. No architect proposal is copied into this candidate.

This wrapper guards all 92 original coupled materials and the sole owned
PointLight, then forces only that light's intensity 0 after delegated updates.
The light stays allocated. Requested versus applied intensity, lifecycle and
failure state are explicit. Original arguments/results and reset/disposal remain
bounded; original/suppression/cleanup errors are preserved. No environment light,
shader, field/store, geometry, mask, depth, legibility or clock changes.

All three data APIs are exact aliases. The 68-module manifest preserves 66 old
source records and 193 resources; measured source usage is recomputed with all
other capacities unchanged. Removing the wrapper recovers the original delegate
and ordinary local spill. No GPU/cache reversal or zero-GPU-work claim is made.

This is a causal control, not an accepted unlit final product, useful R or cost
optimization. Halo removal alone with a still-merged body refutes spill alone.
Any improved contrast remains diagnostic pending separately released native
comparison and independent acceptance. Raw97's50positive F values,98zero and
raw/admission/inputE/referencefalse remain untouched. No fitting, data repair,
bake, brightness rescue, native quality/cost acceptance or promotion follows.
