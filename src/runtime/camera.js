import * as THREE from './three.js';
export function createCameraRig(container, renderer, world, {x = 10, h = 14, y = 12} = {}) {
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 150);
  const target = new THREE.Vector3(world.width / 2, 0, world.height / 2);
  let zoom = 1;
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point = new THREE.Vector3();
  function resize() {
    const w = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight), aspect = w / height;
    const width = (world.width * Math.abs(y) + world.height * Math.abs(x)) / Math.hypot(x, y);
    const span = Math.max(18, width / aspect) * 1.05 / zoom;
    camera.left = -span * aspect / 2; camera.right = span * aspect / 2;
    camera.top = span / 2; camera.bottom = -span / 2;
    camera.position.copy(target).add(new THREE.Vector3(x, h, y)); camera.lookAt(target);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(); renderer.setSize(w, height, false);
  }
  function screenToWorld(clientX, clientY) {
    const box = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((clientX - box.left) / box.width * 2 - 1, -(clientY - box.top) / box.height * 2 + 1), camera);
    if (!ray.ray.intersectPlane(plane, point) || point.x < 0 || point.z < 0 || point.x >= world.width || point.z >= world.height) return null;
    return {x: point.x, y: point.z};
  }
  function magnify(factor) { zoom = THREE.MathUtils.clamp(zoom * factor, 0.65, 3); resize(); }
  resize();
  return {camera, resize, screenToWorld, magnify};
}
