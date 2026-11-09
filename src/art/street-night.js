export function createStreetNight(T, scene, renderer, defaultLights = []) {
  const defaults = defaultLights.filter(light => light?.isLight && light.parent === scene);
  if (!defaults.length && scene.children.some(object => object.isLight)) return null;
  const previousVisibility = defaults.map(light => light.visible);
  defaults.forEach(light => { light.visible = false; });

  const root = new T.Group();
  root.name = 'Catalogue Street night';
  const sky = new T.HemisphereLight(0x7296df, 0x29374f, .36);
  const moon = new T.DirectionalLight(0xa8c4ff, .38);
  sky.name = 'Cool night sky fill';
  moon.name = 'Catalogue moonlight';
  moon.position.set(-20.5, 20, 13);
  root.add(sky, moon);

  const oldClear = renderer?.getClearColor?.(new T.Color());
  const oldAlpha = renderer?.getClearAlpha?.();
  renderer?.setClearColor(0x0b1223);
  const shadow = renderer?.shadowMap;
  const oldShadow = shadow && {enabled: shadow.enabled, type: shadow.type};
  if (shadow) {
    // Match Ashland's depth settings so the carried torch can cast its own shadow.
    shadow.enabled = true;
    shadow.type = T.PCFShadowMap;
  }

  return {root, dispose() {
    defaults.forEach((light, i) => { light.visible = previousVisibility[i]; });
    if (oldClear) renderer.setClearColor(oldClear, oldAlpha);
    if (shadow) Object.assign(shadow, oldShadow);
    moon.dispose();
    root.removeFromParent();
    root.clear();
  }};
}
