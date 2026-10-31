// Workbench-only frozen source data. No factory, gameplay, or accepted mode.
export function diagnosticSnapshot(data, frameIndex) {
  const phase = data.phases.find(p => p.frameIndex === frameIndex);
  if (!phase) throw new RangeError('Unknown frozen diagnostic source phase');
  const cells = structuredClone(data.baseCells);
  for (const [index, cell] of phase.cellChanges) cells[index] = structuredClone(cell);
  return {...structuredClone(phase.snapshot), world: structuredClone(data.world), cells};
}

export function cameraRecord(camera) {
  camera.updateMatrixWorld(true);
  return {kind: 'orthographic', position: {...camera.position}, quaternion: camera.quaternion.toArray(), matrixWorld: camera.matrixWorld.toArray(), matrixWorldInverse: camera.matrixWorldInverse.toArray(), projectionMatrix: camera.projectionMatrix.toArray(), near: camera.near, far: camera.far};
}

export function applyFrozenCamera(camera, record) {
  const {left, right, top, bottom, near, far, zoom} = record;
  Object.assign(camera, {left, right, top, bottom, near, far, zoom});
  camera.position.fromArray(record.position); camera.quaternion.fromArray(record.quaternion); camera.up.fromArray(record.up);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}

export function saveCamera(camera) {
  return {left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom, near: camera.near, far: camera.far, zoom: camera.zoom,
    position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), up: camera.up.toArray()};
}
