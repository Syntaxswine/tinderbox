// Explicit technical stand-ins. This module is not the production art factory.
export function createDiagnosticScene({THREE: T, scene, config}) {
  const root = new T.Group(); root.name = 'DIAGNOSTIC STAND-INS'; scene.add(root);
  const ownedGeometries = new Set(), ownedMaterials = new Set();
  const geom = g => (ownedGeometries.add(g), g);
  const material = (color, options = {}) => { const m = new T.MeshStandardMaterial({color, roughness: 0.9, ...options}); ownedMaterials.add(m); return m; };
  const box = geom(new T.BoxGeometry(1, 1, 1));
  const character = geom(new T.CapsuleGeometry(0.23, 0.85, 3, 8));
  const bear = new T.Group(), body = new T.Mesh(character, material(0x63d7cf)); body.position.y = 0.67; bear.add(body); root.add(bear);
  const nose = new T.Mesh(box, material(0x183632)); nose.scale.set(0.22, 0.12, 0.12); nose.position.set(0.28, 0.9, 0); bear.add(nose);
  const playerRing = new T.Mesh(geom(new T.RingGeometry(0.3, 0.34, 24)), material(0xffffff, {side: T.DoubleSide})); playerRing.rotation.x = -Math.PI / 2; playerRing.position.y = 0.025; bear.add(playerRing);
  const floorMaterial = material(0x4b5555), obstacleMaterials = {wood: material(0xae8653), masonry: material(0x63777c), steel: material(0xad4b35)};
  const obstacles = new Map(), actors = new Map(), projectiles = new Map(), bursts = [];
  const drum = geom(new T.CylinderGeometry(0.5, 0.5, 1, 16));
  const sphere = geom(new T.SphereGeometry(0.11, 8, 6));
  const shotMaterial = material(0xffd558), actorMaterial = material(0xa4a2f8);
  // Bounded diagnostic geometry consumes the model mask directly; no scene raycasts.
  const rayPositions = new Float32Array(257 * 6), fanPositions = new Float32Array(255 * 9);
  const rayGeometry = geom(new T.BufferGeometry()), fanGeometry = geom(new T.BufferGeometry());
  rayGeometry.setAttribute('position', new T.BufferAttribute(rayPositions, 3)); rayGeometry.setDrawRange(0, 0);
  fanGeometry.setAttribute('position', new T.BufferAttribute(fanPositions, 3)); fanGeometry.setDrawRange(0, 0);
  const rayMaterial = new T.LineBasicMaterial({color: 0xffc24f}); ownedMaterials.add(rayMaterial);
  const fanMaterial = new T.MeshBasicMaterial({color: 0xff8c20, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false}); ownedMaterials.add(fanMaterial);
  const dischargeRays = new T.LineSegments(rayGeometry, rayMaterial), dischargeFan = new T.Mesh(fanGeometry, fanMaterial);
  dischargeRays.name = 'AUTHORITATIVE DISCHARGE RAYS'; dischargeFan.name = 'AUTHORITATIVE DISCHARGE FAN';
  dischargeRays.frustumCulled = dischargeFan.frustumCulled = false; root.add(dischargeFan, dischargeRays);
  let floor, cells, flames, grid, lastEvent = 0;
  const cellMaterial = material(0x2368a0, {transparent: true, opacity: 0.8, depthWrite: false});
  const flameMaterial = material(0xf19628, {emissive: 0xe36116, emissiveIntensity: 0.8});
  const pose = new T.Object3D(), color = new T.Color();
  function setWorld(snapshot) {
    floor = new T.Mesh(geom(new T.PlaneGeometry(snapshot.world.width, snapshot.world.height)), floorMaterial);
    floor.rotation.x = -Math.PI / 2; floor.position.set(snapshot.world.width / 2, 0, snapshot.world.height / 2); root.add(floor);
    const vertices = [];
    for (let x = 0; x <= snapshot.world.width; x++) vertices.push(x, 0.006, 0, x, 0.006, snapshot.world.height);
    for (let y = 0; y <= snapshot.world.height; y++) vertices.push(0, 0.006, y, snapshot.world.width, 0.006, y);
    const g = geom(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    const m = new T.LineBasicMaterial({color: 0x73807a, transparent: true, opacity: 0.25}); ownedMaterials.add(m); grid = new T.LineSegments(g, m); root.add(grid);
    cells = new T.InstancedMesh(box, cellMaterial, snapshot.cells.length); cells.frustumCulled = false;
    flames = new T.InstancedMesh(box, flameMaterial, snapshot.cells.length); flames.frustumCulled = false; root.add(cells, flames);
  }
  function update(snapshot, timing) {
    if (!floor) setWorld(snapshot);
    bear.position.set(snapshot.player.x, 0, snapshot.player.y); bear.rotation.y = -snapshot.player.heading;
    body.material.color.setHex(snapshot.player.hp <= 0 ? 0x666666 : snapshot.effects.powder.active ? 0xefff94 : 0x63d7cf);
    playerRing.scale.setScalar(snapshot.player.radius / 0.34);
    body.scale.set(snapshot.player.radius / 0.23, 1, snapshot.player.radius / 0.23);
    const d = snapshot.discharge; let lineFloats = 0, fanFloats = 0;
    if (d.active) {
      for (const r of d.rays) {
        rayPositions.set([d.shapeOrigin.x, d.shapeOrigin.h, d.shapeOrigin.y, r.x, r.h, r.y], lineFloats); lineFloats += 6;
      }
      if (d.lead) { rayPositions.set([d.lead.from.x, d.lead.from.h, d.lead.from.y, d.lead.to.x, d.lead.to.h, d.lead.to.y], lineFloats); lineFloats += 6; }
      if (d.connectRays) for (let i = 1; i < d.rays.length; i++) {
        const a = d.rays[i - 1], b = d.rays[i];
        fanPositions.set([d.shapeOrigin.x, d.shapeOrigin.h, d.shapeOrigin.y, a.x, a.h, a.y, b.x, b.h, b.y], fanFloats); fanFloats += 9;
      }
    }
    rayGeometry.setDrawRange(0, lineFloats / 3); rayGeometry.attributes.position.needsUpdate = true;
    fanGeometry.setDrawRange(0, fanFloats / 3); fanGeometry.attributes.position.needsUpdate = true;
    dischargeRays.visible = lineFloats > 0; dischargeFan.visible = fanFloats > 0;
    let c = 0, f = 0;
    for (const cell of snapshot.cells) {
      if (cell.depositedFuel > 0.00001 || cell.heat > 0.03 || cell.phase === 'spent' || cell.material === 'grass') {
        pose.position.set(cell.x, 0.018, cell.y); pose.rotation.set(0, 0, 0); pose.scale.set(cell.size * 0.97, 0.018, cell.size * 0.97); pose.updateMatrix(); cells.setMatrixAt(c, pose.matrix);
        color.setHex(cell.phase === 'spent' ? 0x161d1d : cell.phase === 'burning' ? 0xe16622 : cell.phase === 'heating' ? 0xd9ab45 : cell.depositedFuel > 0 ? 0x247bce : 0x5b7447);
        cells.setColorAt(c++, color);
      }
      if (cell.phase === 'burning') {
        // Pure visualization of authoritative intensity; never applies damage.
        const height = 0.12 + cell.intensity * (0.5 + Math.sin(timing.worldTime * 9 + cell.x * 5 + cell.y * 7) * 0.06);
        pose.position.set(cell.x, height / 2 + 0.03, cell.y); pose.scale.set(cell.size * 0.65, height, cell.size * 0.65); pose.updateMatrix(); flames.setMatrixAt(f++, pose.matrix);
      }
    }
    cells.count = c; cells.instanceMatrix.needsUpdate = true; if (cells.instanceColor) cells.instanceColor.needsUpdate = true;
    flames.count = f; flames.instanceMatrix.needsUpdate = true;
    const sceneParts = [...snapshot.world.obstacles, ...snapshot.world.modules.flatMap(m =>
      m.parts.filter(p => !p.solid && !p.destroyed && p.role !== 'roof-envelope'))];
    const present = new Set(sceneParts.map(o => o.id));
    for (const [id, mesh] of obstacles) if (!present.has(id)) { mesh.removeFromParent(); obstacles.delete(id); }
    for (const o of sceneParts) if (!obstacles.has(o.id)) {
      const mesh = new T.Mesh(o.kind === 'barrel' ? drum : box, obstacleMaterials[o.material] ?? floorMaterial);
      mesh.scale.set(o.width, o.height, o.depth);
      mesh.position.set(o.x, o.h ?? (o.baseHeight ?? 0) + o.height / 2, o.y); mesh.userData.objectId = o.id; obstacles.set(o.id, mesh); root.add(mesh);
    }
    for (const a of snapshot.actors) {
      let mesh = actors.get(a.id); if (!mesh) { mesh = new T.Mesh(character, actorMaterial); root.add(mesh); actors.set(a.id, mesh); }
      mesh.position.set(a.x, a.hp > 0 ? 0.67 : 0.2, a.y); mesh.rotation.z = a.hp > 0 ? 0 : Math.PI / 2;
    }
    const liveProjectiles = new Set(snapshot.projectiles.map(p => p.id));
    for (const [id, mesh] of projectiles) if (!liveProjectiles.has(id)) { mesh.removeFromParent(); projectiles.delete(id); }
    for (const p of snapshot.projectiles) { let mesh = projectiles.get(p.id); if (!mesh) { mesh = new T.Mesh(sphere, shotMaterial); projectiles.set(p.id, mesh); root.add(mesh); } mesh.position.set(p.x, p.h, p.y); }
    for (const event of snapshot.events) if (event.id > lastEvent) {
      lastEvent = event.id;
      if (event.type === 'barrel-explosion') {
        const mesh = new T.Mesh(sphere, shotMaterial); mesh.position.set(event.x, 0.5, event.y); root.add(mesh);
        bursts.push({mesh, start: timing.worldTime, radius: event.radius});
      }
    }
    for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i], age = timing.worldTime - b.start;
      if (age > 0.6 || age < 0) { b.mesh.removeFromParent(); bursts.splice(i, 1); } else b.mesh.scale.setScalar(1 + age * b.radius * 4); }
  }
  return {update, dispose() { root.removeFromParent(); cells?.dispose(); flames?.dispose(); for (const g of ownedGeometries) g.dispose(); for (const m of ownedMaterials) m.dispose(); root.clear(); }};
}
