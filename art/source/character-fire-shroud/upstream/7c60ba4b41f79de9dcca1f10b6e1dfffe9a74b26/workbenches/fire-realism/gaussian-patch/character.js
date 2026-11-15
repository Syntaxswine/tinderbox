import * as T from '../../../src/runtime/three.js';
import {createArtScene} from '../../../src/art/index.js';
import {createDischarge} from '../../../src/art/discharge.js';
import {createSimulation} from '../../../src/simulation/index.js';
import {loadBearKit} from '../../../src/reuse/bear.js';
import {createLinearHdrPresentation} from '../../../tools/fire-realism/linear-hdr-presentation.js';
import {createSplatPatch} from '../../art/fire-realism/gaussian-patch/splats.js';
import {createBearWrap} from '../../art/fire-realism/gaussian-patch/bear-wrap.js';
import {createShroudBands} from '../../art/fire-realism/gaussian-patch/shroud-bands.js';
import {makeWindSampler, placeGameZoomCamera} from './pilot.js';

const VIEWPORT = {width: 1280, height: 800, pixelRatio: 1};
const JPEG_CROP = {width: 544, height: 340, offsetY: 26};
const BURST_STEPS = 36;
const BURST_END = BURST_STEPS / 60;
const END = 3.25;
const AFTER_VIEW = 1.20;
export const TARGET = Object.freeze({x: 7.1, y: 8.3, heading: 0.45, travelled: 0, tool: 'matches'});

export function recordBearBurst(obstacles = []) {
  const sim = createSimulation({characterId: 'bear', scenario: {
    id: 'private-bear-flamethrower', width: 20, height: 16, obstacles,
    player: {x: 4.9, y: 10.9, tool: 'flamethrower'}
  }});
  try {
    sim.dispatch({type: 'aim', x: TARGET.x, y: TARGET.y});
    sim.dispatch({type: 'primary', pressed: true});
    for (let step = 0; step < BURST_STEPS; step++) sim.advanceReceiptStep();
    const firing = sim.snapshot();
    sim.dispatch({type: 'primary', pressed: false});
    sim.advanceReceiptStep();
    return {firing, released: sim.snapshot()};
  } finally {
    sim.dispose();
  }
}

function attach(hit, incoming, scale, seed) {
  const mesh = hit.object;
  const {a, b, c} = hit.face;
  const weights = hit.barycoord;
  const p = new T.Vector3(), q = new T.Vector3(), r = new T.Vector3();
  const normal = new T.Vector3(), center = new T.Vector3();
  const patch = {x: 0, y: 0, z: 0, seed, scale, flameStrength: 1, smokeStrength: 1};
  let sign;

  function update(flameStrength, smokeStrength) {
    mesh.getVertexPosition(a, p).applyMatrix4(mesh.matrixWorld);
    mesh.getVertexPosition(b, q).applyMatrix4(mesh.matrixWorld);
    mesh.getVertexPosition(c, r).applyMatrix4(mesh.matrixWorld);
    center.copy(p).multiplyScalar(weights.x).addScaledVector(q, weights.y).addScaledVector(r, weights.z);
    normal.subVectors(q, p).cross(r.sub(p)).normalize();
    sign ??= normal.dot(incoming) > 0 ? -1 : 1;
    center.addScaledVector(normal, sign * .055);
    patch.x = center.x;
    patch.y = center.y;
    patch.z = center.z;
    patch.flameStrength = flameStrength;
    patch.smokeStrength = smokeStrength;
  }
  return {patch, update};
}

export function traceBearContact(rig, discharge) {
  if (!discharge.active || discharge.tool !== 'flamethrower') return {discharge, mounts: [], wrapMounts: [], hitRays: 0};
  rig.root.updateMatrixWorld(true);
  rig.worker.skeleton.update();
  const raycaster = new T.Raycaster();
  const shape = discharge.shapeOrigin;
  const origin = new T.Vector3(shape.x, shape.h, shape.y);
  const contacts = [];
  function cast(start, direction, reach) {
    raycaster.set(start, direction);
    raycaster.far = reach;
    return raycaster.intersectObjects(rig.worker.parts, false)[0];
  }
  const rays = discharge.rays.map(ray => {
    const direction = new T.Vector3(ray.x, ray.h, ray.y).sub(origin).normalize();
    const hit = cast(origin, direction, ray.distance);
    if (!hit) return ray;
    contacts.push({hit, direction, error: Math.abs(ray.angle - discharge.heading)});
    return {...ray, x: hit.point.x, y: hit.point.z, h: hit.point.y, distance: hit.distance, obstacleId: 'preview-bear'};
  });
  if (contacts.length === 0) return {discharge, mounts: [], wrapMounts: [], hitRays: 0};
  contacts.sort((a, b) => a.error - b.error);
  const {hit, direction} = contacts[0];
  // Sample adjacent cloth surfaces only after a real, in-range jet contact.
  const sites = [hit];
  const side = new T.Vector3(-direction.z, 0, direction.x);
  for (const [height, across] of [[.20, -.06], [-.24, .12], [.06, -.22]]) {
    const start = origin.clone().addScaledVector(side, across);
    start.y += height;
    const neighbor = cast(start, direction, hit.distance + .35);
    if (neighbor && sites.every(site => site.point.distanceTo(neighbor.point) > .11)) sites.push(neighbor);
  }
  return {discharge: {...discharge, rays}, hitRays: contacts.length,
    mounts: sites.map((site, index) => attach(site, direction, index === 0 ? .86 : .59, 1893 + index * 9)),
    wrapMounts: createBearWrap(T, {rig, hit, direction, attach})};
}

export async function mountCharacterPilot() {
  const get = id => document.getElementById(id);
  const controller = new AbortController();
  const {signal} = controller;
  let renderer, presentation, art, targetKit, effect, animation;
  function pause() {
    cancelAnimationFrame(animation);
    animation = undefined;
  }
  function dispose() {
    pause();
    controller.abort();
    effect?.dispose();
    targetKit?.dispose();
    art?.dispose();
    presentation?.dispose();
    renderer?.dispose();
  }
  window.addEventListener('pagehide', event => event.persisted ? pause() : dispose(), {signal});
  try {
    const scene = new T.Scene();
    const sun = new T.DirectionalLight(0xffffff, 2.5);
    sun.position.set(-8, 16, 6);
    const glow = new T.PointLight(0xff8f37, 0, 1.7, 2);
    scene.add(new T.HemisphereLight(0xfff1d1, 0x334852, 2.3), sun, glow);
    const camera = new T.OrthographicCamera(-10, 10, 10, -10, .1, 300);
    placeGameZoomCamera(camera);
    const {firing, released} = recordBearBurst();
    renderer = new T.WebGLRenderer({antialias: true, alpha: false});
    renderer.setPixelRatio(1);
    renderer.setSize(VIEWPORT.width, VIEWPORT.height, false);
    renderer.setClearColor(0x35281e);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      const logs = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment)];
      throw Error('WebGL shader failed. ' + logs.filter(Boolean).join(' | '));
    };
    renderer.domElement.setAttribute('aria-label', 'Native bear flamethrower contact preview');
    get('live').append(renderer.domElement);
    presentation = createLinearHdrPresentation(T, renderer);
    if (!presentation.diagnostics().available) throw Error(presentation.diagnostics().reason);

    const response = await fetch(new URL('./wind.json', import.meta.url), {signal});
    if (!response.ok) throw Error('The baked wind fixture could not be loaded.');
    const sampleWind = makeWindSampler(await response.json());
    art = await createArtScene({THREE: T, scene, renderer, signal, world: firing.world,
      fireFactory(shared, assets) {
        const jet = createDischarge(shared, assets.flame);
        return {root: jet.root, update: (snapshot, time, anchors) => jet.update(snapshot.discharge, time, anchors),
          diagnostics: () => ({discharge: jet.diagnostics()}), dispose: jet.dispose};
      }
    });
    targetKit = await loadBearKit({THREE: T, renderer, signal, unarmed: true});
    const target = targetKit.create();
    scene.add(target.root);
    target.update(TARGET);
    target.setHeldVisible(false);
    const contact = traceBearContact(target, firing.discharge);
    if (!contact.hitRays) throw Error('The jet missed the native bear in the contact fixture.');
    if (contact.wrapMounts.length !== 4) throw Error('The bear shroud needs four clothing patches.');
    const active = {...firing, discharge: contact.discharge};
    const modes = {
      original: {label: 'Original side flame', mounts: contact.mounts},
      wrap: {label: 'Fire shroud', mounts: contact.wrapMounts}
    };
    for (const mode of Object.values(modes)) mode.patches = mode.mounts.map(mount => mount.patch);
    for (const patch of modes.wrap.patches) patch.shroudDetail = true;
    const shroud = createShroudBands(T, target, modes.wrap.patches[0]);
    effect = createSplatPatch(T, {maxPatches: Math.max(contact.mounts.length, contact.wrapMounts.length), flameGain: [2.9, 1.95, 1.25]});
    scene.add(effect.root);

    const away = new T.Vector2(TARGET.x - firing.player.x, TARGET.y - firing.player.y).normalize();
    let style = 'wrap', shownTime = AFTER_VIEW;
    function draw(time, modeName = style) {
      shownTime = time;
      const jet = time < BURST_END;
      const recoil = T.MathUtils.smoothstep(time, BURST_END, 1.18);
      const step = recoil * .62;
      const heading = TARGET.heading - .64 * recoil;
      const flameFade = 1 - T.MathUtils.smoothstep(time, 1.28, 2.42);
      const flame = T.MathUtils.smoothstep(time, .02, .24) * flameFade;
      const smoke = 1.55 * (1 - T.MathUtils.smoothstep(time, 2.42, END));
      target.update({...TARGET, x: TARGET.x + away.x * step, y: TARGET.y + away.y * step,
        heading, travelled: step, moving: time > BURST_END && time < 1.18}, time);
      const mode = modes[modeName];
      for (const mount of mode.mounts) {
        const delay = mount.delay ?? 0;
        const localFlame = delay > 0 ? T.MathUtils.smoothstep(time - delay, .02, .24) * flameFade : flame;
        const localSmoke = delay > 0 ? T.MathUtils.smoothstep(time - delay, .02, .20) * smoke : smoke;
        mount.update(localFlame * (modeName === 'wrap' ? .73 : 1), localSmoke);
      }
      // Keep lighting fixed to the original contact when comparing the two effects.
      const lightMount = contact.mounts[0];
      if (modeName === 'wrap') lightMount.update(0, 0);
      const hot = lightMount.patch;
      glow.position.set(hot.x, hot.y + .13, hot.z);
      glow.intensity = .46 * flame * (1 - Math.exp(-time * 12));
      const bands = modeName === 'wrap' ? shroud.update(time, heading, flameFade, sampleWind) : undefined;
      effect.update({time, patches: mode.patches, camera, sampleWind, bands});
      art.update(jet ? active : released, {camera, viewport: VIEWPORT, worldTime: time, playerTime: time});
      presentation.render({scene, camera});
      const {flameSplats, smokeSplats} = effect.stats();
      get('status').textContent = `${mode.label} · ${jet ? 'Jet on' : 'Trigger released'} · ${time.toFixed(2)} s · ${contact.hitRays} jet rays hit the bear · ${flameSplats} flame / ${smokeSplats} smoke splats`;
    }

    get('wrap').addEventListener('click', () => {
      style = style === 'wrap' ? 'original' : 'wrap';
      get('wrap').setAttribute('aria-pressed', String(style === 'wrap'));
      draw(shownTime);
    }, {signal});
    for (const button of document.querySelectorAll('[data-time]')) button.addEventListener('click', () => {
      pause();
      draw(Number(button.dataset.time));
    }, {signal});
    get('replay').addEventListener('click', () => {
      pause();
      const start = performance.now();
      function frame(now) {
        const time = Math.min(END, (now - start) / 1000);
        draw(time);
        animation = time < END ? requestAnimationFrame(frame) : undefined;
      }
      animation = requestAnimationFrame(frame);
    }, {signal});
    get('download').addEventListener('click', async () => {
      pause();
      const restoreTime = shownTime;
      const crop = JPEG_CROP;
      const output = document.createElement('canvas');
      output.width = crop.width * 2;
      output.height = crop.height + 40;
      const ctx = output.getContext('2d');
      ctx.fillStyle = '#241913';
      ctx.fillRect(0, 0, output.width, output.height);
      ctx.fillStyle = '#f3e6d1';
      ctx.font = '20px Georgia';
      for (const [index, modeName] of ['original', 'wrap'].entries()) {
        draw(AFTER_VIEW, modeName);
        ctx.fillText(`${modes[modeName].label} · 0.60 s after release`, index * crop.width + 14, 26);
        ctx.drawImage(renderer.domElement, Math.floor((VIEWPORT.width - crop.width) / 2),
          Math.floor((VIEWPORT.height - crop.height) / 2) + crop.offsetY,
          crop.width, crop.height, index * crop.width, 40, crop.width, crop.height);
      }
      draw(restoreTime);
      const jpeg = await new Promise(resolve => output.toBlob(resolve, 'image/jpeg', .95));
      if (!jpeg) {
        get('status').textContent = 'The paired JPEG could not be encoded.';
        return;
      }
      const url = URL.createObjectURL(jpeg);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bear-fire-shroud.jpg';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, {signal});

    draw(AFTER_VIEW);
    for (const button of document.querySelectorAll('button')) button.disabled = false;
  } catch (error) {
    get('status').textContent = error.message;
    dispose();
  }
}
