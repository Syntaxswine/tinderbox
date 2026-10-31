# Weighted surface source: source-only candidate

Authority: architect fe109488fd23b3d8481e93c6f88414b829d4e6a9, docs/proposals/weighted-surface-source-authoring.md in PRIMARY. Derived deliberately from cfe4d95b4ffd17b20376073a18d7ac8d0947b781. This checkpoint authorizes no Blender/API/scene/prepare/bake/export/render or helper invocation.

The single physical change is the static group TinderboxSurfaceFeed1893, object CanonicalFourCellBed, group index0 (expected C++ one-based1). The original source must have no groups/memberships and a blank selector; refusal preserves it. No existing group is deleted to reach this premise. The exact25 index/weight records and unchanged23 triangle indices are in settings.json. The weights, in vertex order0..24, are:

    1,1,1,.875,.875,.375,.25,.375,.25,.0625,.5,.75,.625,.375,.125,.0625,.125,.375,.5,.375,.125,.125,.375,.75,1

All weights are positive dyadic floats in[1/16,1]. There are no deliberate zeros or algebraic positive-footprint removals. The broad primary lobe is strongly fed; the unequal secondary/small lobes and connectors receive lower feeding. There is no random/time-varying mask, subvoxel pattern, second source or compensation. Weak feeding can lose useful roots/height or produce static fingers; unequal feeding does not prove folds.

Exact-build fluid.cc shows barycentric weights multiply shared surface E. Fuel/density targets and nonlinear reaction falloff change together. Positive E gates heat; temperature is not multiplied by the weight. Actual absolute mode remains true, volume_density0, so geometric targets are not aggregate delivered fuel/density/heat and are not a dose-matched experiment. Unchanged flame_vorticity.5 uses evolving fuel in its local forcing; that coupling remains.

The fixture model in profile-prediction.json has h=1/24m and fixed grid48x48x96. It predicts surface-area mean weight0.58047 and sampled weighted E / original E about0.57031; all246 modeled positive centres remain positive, distributed61/44/69/72 across four cells. Predicted fuel/density targets fall accordingly while the modeled positive heat predicate count remains246. The high/weak region area-equivalent diameters10.22/7.49 voxels describe area, not minimum width or CFD resolution proof. Full per-cell/per-lobe target comparisons and explicit limits are recorded there. No real field was read to create this model.

The author installs weights only after the existing mesh replacement. It captures complete original and borrowed evaluated mesh/deform records into plain primitives while the evaluated ID is valid, with the fluid domain disabled and restored in finally. There is no to_mesh conversion, borrowed-data disposal or original-data fallback. Missing/effectively skipped membership, collision, wrong selector/index/float32 bits, changed topology/world/flow flags or unsupported API refuses. Selected frames1/2/91/193 provide static/evaluated witnesses alongside the unchanged193 input rows. The saved/reloaded preparation receives another strict original/evaluated witness before the sole future bake. The controller independently requires both witness gates.

All other physical settings remain the half-rate source: burning_rate.375, global vorticity.25, flame_vorticity.5, scalar1/1/2 inputs, withdrawal2.8/3.0/3.2, planeZ.02, half-voxel surface kernel, identical mesh/grid/ground/clocks and terminal/below-ground/boundary gates. Original scene/cache and the three V5 control identities remain read-only. grid.py, surface.py and winjob.py are exact cfe copies; inherited supervisor mechanisms are unchanged apart from namespace/purpose and the two witness gates.

Source-only checks:

    python -B workbenches/art/fire-realism/mantaflow-weighted-source/check_source.py

These12 small pure/fake groups never construct Author/Controller/OwnedJob, import bpy, spawn a helper or read real scene/field data. Syntax compilation and source inverses are separate evidence; mocks do not prove actual Blender group propagation or live enforcement.

Future operation, if separately permitted, uses this existing supervisor CLI with the new settings/output and two architect-owned prepare/bake authorization paths. It keeps one creation-based900s UTC/uptime lifetime,2GiB process and aggregate committed-memory caps,2GiB polled scratch and CPU4. No permit, output stage, retry, repair, capacity increase or raw terminal waiver is supplied here. The failed half-rate raw3.2 gate and old source/data/controls remain unchanged. Actual field bounds/qualification, native motion and hostile review follow separately if authorized; this is neither R acceptance nor optimization/cost credit.
