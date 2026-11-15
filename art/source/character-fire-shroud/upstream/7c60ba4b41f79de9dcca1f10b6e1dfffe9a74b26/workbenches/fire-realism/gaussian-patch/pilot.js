import * as T from '../../../src/runtime/three.js';
import {createArtScene} from '../../../src/art/index.js';
import {placeFireReviewCamera} from '../../../tools/fire-realism/camera.js';
import {createFireReviewSimulation} from '../../../tools/fire-realism/scenarios.js';
import {createLinearHdrPresentation} from '../../../tools/fire-realism/linear-hdr-presentation.js';
import {createGpuTimer, statistics} from '../../../tools/fire-realism/profiling.js';

const VIEWPORT = {width: 1280, height: 800, pixelRatio: 1};
const GAME_SPAN = 12.6;
const POSE = {scenario: 'match-contact', view: 'isometric', seed: 1893, characterId: 'bear', viewport: VIEWPORT};
const FRAME = 61;
const SAMPLE_FRAMES = 12;

export function makeWindSampler({firstCenterHeight, spacing, velocities}) {
  // The baked open-ground field is horizontally uniform at every sampled height.
  const top = velocities.length - 1;
  return function sampleWind(_x, y, _z, out = [0, 0, 0]) {
    const level = Math.max(0, Math.min(top, (y - firstCenterHeight) / spacing));
    const lower = Math.min(top - 1, Math.floor(level));
    const fraction = level - lower;
    const a = velocities[lower];
    const b = velocities[lower + 1];
    for (let axis = 0; axis < 3; axis++) out[axis] = a[axis] + (b[axis] - a[axis]) * fraction;
    return out;
  };
}

export function matchContactSnapshot() {
  const simulation = createFireReviewSimulation(POSE);
  try {
    for (let i = 0; i < FRAME; i++) simulation.advanceReceiptStep();
    return {...simulation.snapshot(), paused: true};
  } finally {
    simulation.dispose();
  }
}

export function placeGameZoomCamera(camera) {
  const {span} = placeFireReviewCamera(T, camera, POSE);
  for (const side of ['left', 'right', 'top', 'bottom']) camera[side] *= GAME_SPAN / span;
  camera.updateProjectionMatrix();
  return {width: Math.round(VIEWPORT.width * span / GAME_SPAN),
    height: Math.round(VIEWPORT.height * span / GAME_SPAN)};
}

export function patchPopulation(snapshot, count) {
  if (count === 1) {
    const cells = snapshot.cells.filter(cell => cell.phase === 'burning');
    if (cells.length !== 4) throw Error('The frame-61 match patch requires four burning cells.');
    const center = axis => cells.reduce((sum, cell) => sum + cell[axis], 0) / cells.length;
    return [{x: center('x'), y: 0, z: center('y'), seed: POSE.seed}];
  }
  if (count !== 32 && count !== 128) throw RangeError('Choose 1, 32 or 128 patches.');
  // These native ground extents leave viewport room above the highest row for smoke.
  const columns = count === 32 ? 8 : 16;
  const rows = count / columns;
  return Array.from({length: count}, (_, index) => ({
    x: 1.1 + 9.2 * (index % columns) / (columns - 1),
    y: 0,
    z: 3.7 + 8.4 * Math.floor(index / columns) / (rows - 1),
    seed: POSE.seed + index
  }));
}

async function timePass(gl, draw, patches, age, signal) {
  const timer = createGpuTimer(gl);
  const cpu = [];
  const nextFrame = async () => {
    if (document.hidden) throw Error('Keep this tab visible while timing.');
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (signal.aborted || gl.isContextLost()) throw Error('WebGL draw interrupted.');
  };
  try {
    for (let i = -4; i < SAMPLE_FRAMES; i++) {
      await nextFrame();
      const ms = draw(age + Math.max(0, i) / 60, patches, i < 0 ? null : timer, i);
      if (i >= 0) cpu.push(ms);
    }
    for (let i = 0; i < SAMPLE_FRAMES && timer.pending; i++) {
      await nextFrame();
      timer.poll();
    }
    const samples = timer.samples.map(sample => sample.gpuMs);
    const gpu = !timer.available ? 'unsupported (WebGL2 timer extension unavailable)'
      : samples.length !== SAMPLE_FRAMES ? 'unavailable (' + samples.length + '/' + SAMPLE_FRAMES + ' valid queries)'
      : statistics(samples).median.toFixed(2) + ' ms';
    return {cpu: statistics(cpu).median.toFixed(2) + ' ms', gpu};
  } finally {
    timer.dispose();
  }
}

export async function mountPilot() {
  const get = id => document.getElementById(id);
  const comparison = get('comparison');
  const reference = get('reference');
  const count = get('patch-count');
  const play = get('play');
  const measure = get('measure');
  const download = get('download');
  const status = get('status');
  const results = get('timing');
  const lifecycle = new AbortController();
  const {signal} = lifecycle;
  let renderer, presentation, art, effect, animation = null;
  let measuring = false, ready = false, referenceReady = false;
  let age, patches;

  function syncControls() {
    count.disabled = measure.disabled = play.disabled = !ready || measuring;
    download.disabled = !ready || measuring || !referenceReady || count.value !== '1';
    play.textContent = animation === null ? 'Play fire' : 'Pause fire';
  }

  function pause() {
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
  }

  function fail(error) {
    pause();
    ready = false;
    syncControls();
    status.textContent = error.message;
  }

  function dispose() {
    lifecycle.abort();
    pause();
    effect?.dispose();
    art?.dispose();
    presentation?.dispose();
    renderer?.dispose();
  }

  window.addEventListener('pagehide', event => {
    pause();
    syncControls();
    if (!event.persisted) dispose();
  }, {signal});

  reference.decode().then(() => {
    referenceReady = true;
    syncControls();
  }, () => {
    get('reference-caption').textContent = 'The unchanged R60 JPEG is unavailable in this served checkout.';
  });

  try {
    const windResponse = await fetch(new URL('./wind.json', import.meta.url), {signal});
    if (!windResponse.ok) throw Error('The baked wind fixture could not be loaded.');
    const sampleWind = makeWindSampler(await windResponse.json());
    const {createSplatPatch} = await import('../../art/fire-realism/gaussian-patch/splats.js');

    const scene = new T.Scene();
    const hemisphere = new T.HemisphereLight(0xfff1d1, 0x334852, 2.3);
    const sun = new T.DirectionalLight(0xffffff, 2.5);
    sun.position.set(-8, 16, 6);
    scene.add(hemisphere, sun);
    const camera = new T.OrthographicCamera(-10, 10, 10, -10, .1, 300);
    const crop = placeGameZoomCamera(camera);
    comparison.style.setProperty('--crop-aspect', crop.width + ' / ' + crop.height);
    comparison.style.setProperty('--crop-canvas-width', (100 * VIEWPORT.width / crop.width) + '%');

    renderer = new T.WebGLRenderer({antialias: true, alpha: false});
    renderer.setPixelRatio(VIEWPORT.pixelRatio);
    renderer.setSize(VIEWPORT.width, VIEWPORT.height, false);
    renderer.setClearColor(0x35281e);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;
    renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      const logs = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment)];
      throw Error('WebGL shader failed. ' + logs.filter(Boolean).join(' | '));
    };
    renderer.domElement.setAttribute('aria-label', 'Live Gaussian fire at normal game scale');
    renderer.domElement.addEventListener('webglcontextlost', () => fail(Error('WebGL context lost. Reload to reopen the pilot.')), {signal});
    get('live').append(renderer.domElement);
    const gl = renderer.getContext();
    presentation = createLinearHdrPresentation(T, renderer);
    if (!presentation.diagnostics().available) throw Error(presentation.diagnostics().reason);

    const snapshot = matchContactSnapshot();
    const stillAge = snapshot.clocks.world;
    const oldFireOff = () => ({
      root: new T.Group(),
      update() {},
      diagnostics: () => ({discharge: {active: false}}),
      dispose() {}
    });
    art = await createArtScene({THREE: T, scene, renderer, characterId: POSE.characterId, signal,
      world: snapshot.world, pickups: snapshot.pickups, fireFactory: oldFireOff});
    art.update(snapshot, {camera, viewport: VIEWPORT});
    const [hero] = patchPopulation(snapshot, 1);
    const floorLight = new T.PointLight(0xff963e, .28, 1.4, 2);
    floorLight.position.set(hero.x, hero.y + .29, hero.z);
    scene.add(floorLight);
    effect = createSplatPatch(T, {maxPatches: 128});
    scene.add(effect.root);

    function draw(time, population, timer = null, index = 0) {
      const beforeUpdate = performance.now();
      floorLight.visible = population.length === 1;
      effect.update({time, patches: population, camera, sampleWind});
      const updateMs = performance.now() - beforeUpdate;
      const timed = timer?.begin(index);
      const beforeSubmission = performance.now();
      try {
        presentation.render({scene, camera});
        return updateMs + (performance.now() - beforeSubmission);
      } finally {
        if (timed) timer.end();
      }
    }

    function showFrame() {
      draw(age, patches);
      const {patches: visible, flameSplats, smokeSplats} = effect.stats();
      status.textContent = visible + '/' + patches.length + ' patches submitted · ' + flameSplats +
        ' flame splats · ' + smokeSplats + ' smoke splats · ' + age.toFixed(3) + ' s since ignition';
    }

    function selectPopulation() {
      pause();
      age = stillAge;
      patches = patchPopulation(snapshot, Number(count.value));
      comparison.toggleAttribute('data-stress', patches.length !== 1);
      results.textContent = '';
      showFrame();
      syncControls();
    }

    count.addEventListener('change', () => {
      try { selectPopulation(); } catch (error) { fail(error); }
    }, {signal});

    play.addEventListener('click', () => {
      try {
        if (animation !== null) {
          pause();
          showFrame();
        } else {
          const from = performance.now() - age * 1000;
          const animate = now => {
            age = (now - from) / 1000;
            try {
              draw(age, patches);
              animation = requestAnimationFrame(animate);
            } catch (error) { fail(error); }
          };
          status.textContent = 'Playing ' + patches.length + ' Gaussian patch(es).';
          animation = requestAnimationFrame(animate);
        }
        syncControls();
      } catch (error) { fail(error); }
    }, {signal});

    measure.addEventListener('click', async () => {
      pause();
      measuring = true;
      syncControls();
      results.textContent = 'Timing the scene with zero splats, then with ' + patches.length + ' patches.';
      try {
        const baseline = await timePass(gl, draw, [], stillAge, signal);
        const active = await timePass(gl, draw, patches, stillAge, signal);
        results.textContent = 'Median of ' + SAMPLE_FRAMES + ' frames per pass\n' +
          'Scene with zero splats · CPU ' + baseline.cpu + ' · GPU ' + baseline.gpu + '\n' +
          (patches.length === 1 ? '1 patch + floor light' : patches.length + ' patches') +
          ' · CPU ' + active.cpu + ' · GPU ' + active.gpu;
      } catch (error) {
        results.textContent = 'Timing stopped. ' + error.message;
      } finally {
        measuring = false;
        if (ready && !signal.aborted) {
          try { showFrame(); } catch (error) { fail(error); }
          syncControls();
        }
      }
    }, {signal});

    download.addEventListener('click', async () => {
      try {
        const output = document.createElement('canvas');
        output.width = crop.width * 2;
        output.height = crop.height;
        const ctx = output.getContext('2d');
        ctx.drawImage(reference, 0, 0, crop.width, crop.height);
        draw(stillAge, patches);
        ctx.drawImage(renderer.domElement,
          Math.floor((VIEWPORT.width - crop.width) / 2), Math.floor((VIEWPORT.height - crop.height) / 2),
          crop.width, crop.height, crop.width, 0, crop.width, crop.height);
        if (animation === null && age !== stillAge) showFrame();
        const png = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
        if (!png) throw Error('The paired PNG could not be encoded.');
        const url = URL.createObjectURL(png);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'r60-vs-gaussian-frame61-12.6m.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) { results.textContent = error.message; }
    }, {signal});

    ready = true;
    selectPopulation();
  } catch (error) {
    fail(error);
    dispose();
  }
}
