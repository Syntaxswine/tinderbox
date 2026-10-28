// Technical visualization of authoritative surface state. Artist-owned flame art
// can consume the same contract; this view never advances fire or applies damage.
export function createStructureFireView({THREE: T, scene, maxSurfaces = 4096}) {
  const root = new T.Group(); root.name = 'Exterior thermal surfaces'; scene.add(root);
  const patchGeometry = new T.BoxGeometry(1, 1, 1), flameGeometry = new T.ConeGeometry(0.18, 1, 5);
  const patchMaterial = new T.MeshBasicMaterial({color: 0xffffff});
  const flameMaterial = new T.MeshBasicMaterial({color: 0xffca55});
  const patches = new T.InstancedMesh(patchGeometry, patchMaterial, maxSurfaces);
  const flames = new T.InstancedMesh(flameGeometry, flameMaterial, maxSurfaces);
  patches.frustumCulled = flames.frustumCulled = false; root.add(patches, flames);
  const pose = new T.Object3D(), color = new T.Color(), up = new T.Vector3(0, 1, 0), direction = new T.Vector3();
  return {
    update(fire) {
      let hot = 0, burning = 0;
      for (const p of fire?.surfaces ?? []) {
        if (p.temperatureK > 323.15 || p.phase === 'spent') {
          pose.rotation.set(0, 0, 0);
          pose.position.set(p.x + p.nx * 0.012, p.h + p.nh * 0.012, p.y + p.ny * 0.012);
          if (p.faceAxis === 0) pose.scale.set(0.012, p.spanB * 0.97, p.spanA * 0.97);
          else if (p.faceAxis === 1) pose.scale.set(p.spanB * 0.97, p.spanA * 0.97, 0.012);
          else pose.scale.set(p.spanA * 0.97, 0.012, p.spanB * 0.97);
          pose.updateMatrix(); patches.setMatrixAt(hot, pose.matrix);
          color.setHex(p.phase === 'spent' ? 0x1c2127 : p.phase === 'burning' ? 0xff5d25 : p.temperatureK >= 638.15 ? 0xc84638 : p.temperatureK >= 373.15 ? 0xec9d39 : 0x8d7155);
          patches.setColorAt(hot++, color);
        }
        if (p.phase === 'burning' && p.powerW > 0) {
          const height = p.flameHeight, wind = fire.wind;
          direction.set(wind.x / 5, 1, wind.y / 5); const length = direction.length();
          pose.quaternion.setFromUnitVectors(up, direction.clone().normalize());
          pose.position.set(p.x + p.nx * 0.07 + direction.x * height / 2,
            p.h + direction.y * height / 2, p.y + p.ny * 0.07 + direction.z * height / 2);
          pose.scale.set(Math.sqrt(p.area) * 0.75, height * length, Math.sqrt(p.area) * 0.75); pose.updateMatrix();
          flames.setMatrixAt(burning++, pose.matrix);
        }
      }
      patches.count = hot; flames.count = burning; patches.instanceMatrix.needsUpdate = flames.instanceMatrix.needsUpdate = true;
      if (patches.instanceColor) patches.instanceColor.needsUpdate = true;
    },
    dispose() { root.removeFromParent(); patches.dispose(); flames.dispose(); patchGeometry.dispose(); flameGeometry.dispose(); patchMaterial.dispose(); flameMaterial.dispose(); root.clear(); }
  };
}
