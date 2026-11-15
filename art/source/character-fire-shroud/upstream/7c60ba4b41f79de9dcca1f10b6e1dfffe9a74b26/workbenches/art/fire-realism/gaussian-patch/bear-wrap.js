// The rear soot mount uses the same blend as the other splats. Cap its
// strength so the densest particle remains below unit opacity.
const MAX_SMOKE_STRENGTH = 4.7;

export function createBearWrap(T, {rig, hit, direction, attach}) {
  const {root, parts} = rig.worker;
  const side = root.worldToLocal(hit.point.clone()).z < 0 ? -1 : 1;
  const mounts = [];

  function mount(surface, incoming, {scale, delay, flame, smoke, flameRise = 1, smokeSize = 1, smokeRise = 1}) {
    const {patch, update} = attach(surface, incoming, scale, 1893 + mounts.length * 9);
    Object.assign(patch, {flameRise, smokeSize, smokeRise});
    // Resolve the outward offset in the contact pose, before the bear turns.
    update(0, 0);
    mounts.push({
      patch,
      delay,
      update(flameStrength, smokeStrength) {
        update(flameStrength * flame, Math.min(smokeStrength * smoke, MAX_SMOKE_STRENGTH));
      },
    });
  }

  mount(hit, direction, {scale: .70, delay: 0, flame: 1, smoke: .33, flameRise: 1.12});

  const overalls = parts.find(part => part.name === 'connected overalls seat and legs');
  const shirt = parts.find(part => part.name === 'connected shirt and sleeves');
  if (!overalls || !shirt) return mounts;

  // Native metre coordinates, with +X forward. The two leg rays enter from
  // opposing front quarters and stretch through the waist. The last ray
  // adds a back flame and lifts a wider plume above the shoulders.
  const zones = [
    {cloth: [overalls], from: [.62, .25, side * .54], targetZ: side * .22,
      scale: 1.12, delay: .08, flame: 1, smoke: .16, flameRise: 1.60},
    {cloth: [overalls], from: [.53, .40, -side * .61], targetZ: -side * .20,
      scale: 1.10, delay: .18, flame: 1, smoke: .22, flameRise: 1.54},
    {cloth: [shirt, overalls], from: [-.63, .99, side * .27], targetZ: side * .085,
      scale: 1.02, delay: .26, flame: .82, smoke: 3, smokeSize: 1.63, smokeRise: 2},
  ];
  const caster = new T.Raycaster();
  for (const {cloth, from, targetZ, ...appearance} of zones) {
    const start = root.localToWorld(new T.Vector3(...from));
    const incoming = root.localToWorld(new T.Vector3(0, from[1], targetZ)).sub(start);
    caster.far = incoming.length();
    caster.set(start, incoming.normalize());
    const [surface] = caster.intersectObjects(cloth, false);
    if (surface) mount(surface, incoming, appearance);
  }

  return mounts;
}
