// Compose existing native backdrop/underlay/animal APIs, not another engine.
import {Resources} from '../../../src/art/resources.js';
import {createMaterials} from '../../../src/art/materials.js';
import {createWorld} from '../../../src/art/world.js';
import {createGroundField} from '../../../src/art/ground-field.js';
import {loadCharacterKit} from '../../../src/reuse/characters.js';
import {createToolProps} from '../../../src/art/tool-props.js';

const assetRoot = new URL('../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/', import.meta.url);
export function prepareFixtureDepth(T, renderer, scene, camera, target, excludedRoots) {
  const hidden = new Map(), materials = new Map(), size = renderer.getDrawingBufferSize(new T.Vector2());
  const saved = {target: renderer.getRenderTarget(), autoClear: renderer.autoClear, viewport: renderer.getViewport(new T.Vector4()), scissor: renderer.getScissor(new T.Vector4()), scissorTest: renderer.getScissorTest(), shadowAutoUpdate: renderer.shadowMap?.autoUpdate};
  try {
    for (const root of excludedRoots) {hidden.set(root, root.visible); root.visible = false;}
    scene.traverse(object => {for (const material of [object.material].flat().filter(Boolean)) if (material.transparent || material.opacity < 1 || material.depthWrite === false) {if (!materials.has(material)) materials.set(material, material.visible); material.visible = false;}});
    renderer.autoClear = true; if (renderer.shadowMap) renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(target); renderer.setViewport(0, 0, size.x, size.y); renderer.setScissorTest(false); renderer.clear(true, true, true); renderer.render(scene, camera);
    return {valid: true, texture: target.depthTexture, width: size.x, height: size.y, convention: 'webgl-depth-0-1', viewProjectionMatrix: new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).toArray(), projectionMatrixInverse: camera.projectionMatrixInverse.toArray(), cameraWorldMatrix: camera.matrixWorld.toArray()};
  } finally {
    for (const [material, visible] of materials) material.visible = visible;
    for (const [root, visible] of hidden) root.visible = visible;
    renderer.setRenderTarget(saved.target); renderer.setViewport(saved.viewport); renderer.setScissor(saved.scissor); renderer.setScissorTest(saved.scissorTest); renderer.autoClear = saved.autoClear;
    if (renderer.shadowMap) renderer.shadowMap.autoUpdate = saved.shadowAutoUpdate;
  }
}
export async function createFrozenDiagnosticScene(T, renderer, scene, signal) {
  const pool = new Resources(), root = new T.Group(); root.name = 'DIAGNOSTIC: frozen native match source'; root.visible = false;
  let world, field, bear, kit, tools, closed = false;
  function dispose() {if (closed) return; closed = true; signal?.removeEventListener('abort', dispose); root.removeFromParent(); root.clear(); tools?.dispose(); bear?.dispose(); kit?.dispose(); field?.dispose(); world?.dispose(); pool.dispose();}
  signal?.addEventListener('abort', dispose, {once: true});
  try {
    if (signal?.aborted) throw new DOMException('Fixture closed', 'AbortError');
    const names = {materials: 'environment/painted-study/material-atlas-v2.png', cargo: 'environment/painted-study/cargo-materials-v1.png'}, entries = Object.entries(names), loader = new T.TextureLoader();
    const loaded = await Promise.allSettled(entries.map(async ([, name]) => {const texture = await loader.loadAsync(new URL(name, assetRoot).href); if (closed) texture.dispose(); else pool.texture(texture); return texture;}));
    if (loaded.some(r => r.status === 'rejected')) throw Error('Existing native diagnostic backdrop textures unavailable');
    if (closed || signal?.aborted) throw new DOMException('Fixture closed', 'AbortError');
    const assets = Object.fromEntries(entries.map(([name], i) => {const texture = loaded[i].value; texture.colorSpace = T.SRGBColorSpace; return [name, texture];}));
    const materials = createMaterials(T, pool, assets);
    kit = await loadCharacterKit({characterId: 'bear', THREE: T, renderer, materials, signal});
    if (closed || signal?.aborted) {kit.dispose(); kit = null; throw new DOMException('Fixture closed', 'AbortError');}
    world = createWorld(T, materials); field = createGroundField(T); tools = createToolProps(T, materials);
    root.add(world.root, field.root, tools.root);
    // Same native selection display, with no gameplay behavior.
    const ringGeo = pool.geometry(new T.RingGeometry(.96, 1, 40)); ringGeo.rotateX(-Math.PI / 2);
    const ring = new T.Mesh(ringGeo, pool.material(new T.MeshBasicMaterial({color: 0xf0d28a, transparent: true, opacity: .60, depthWrite: false}))); root.add(ring);
    const arrowGeo = pool.geometry(new T.BufferGeometry()); arrowGeo.setAttribute('position', new T.Float32BufferAttribute([1.6, .027, 0, 1.23, .027, -.16, 1.23, .027, .16], 3)); arrowGeo.computeVertexNormals();
    const arrow = new T.Mesh(arrowGeo, pool.material(new T.MeshBasicMaterial({color: 0xf0d28a, transparent: true, opacity: .7, side: T.DoubleSide, depthWrite: false}))); root.add(arrow);
    scene.add(root);
    return {root, field, update(snapshot) {
      if (closed) return;
      world.update(snapshot.world); field.update(snapshot);
      // Phase visit order cannot carry animation smoothing into another A/B.
      bear?.dispose(); bear = kit.create(); root.add(bear.root); bear.update(snapshot.player, snapshot.clocks.player, {paused: false}); bear.setHeldVisible(true); tools.update(snapshot, snapshot.clocks.player, bear.anchors);
      const p = snapshot.player; ring.position.set(p.x, .026, p.y); ring.scale.set(p.radius, 1, p.radius); arrow.position.set(p.x, 0, p.y); arrow.rotation.y = -(p.heading || 0); arrow.scale.set(p.radius, 1, p.radius);
      root.updateWorldMatrix(true, true);
    }, anchors() {const p = bear.anchors.muzzle.getWorldPosition(new T.Vector3()), q = bear.anchors.muzzle.getWorldQuaternion(new T.Quaternion()); return {muzzle: {...p}, muzzleQuaternion: q.toArray(), torchTip: null};},
      adaptations: ['Static reconstruction of exact old-engine phases; not played gameplay or quality/performance acceptance', 'Native world/material/underlay/bear/tool modules composed directly; no combined runtime review driver or UI overlay', 'Native bear is freshly evaluated at selected player/time inputs; prior per-render animation history is not replayed, so animation pose/depth may differ from played native capture. All layer/sample comparisons hold this pose fixed', 'No match-source civilians, landmark, pickups or legacy transients exist in these frozen phases'], dispose};
  } catch (error) {dispose(); throw error;}
}
