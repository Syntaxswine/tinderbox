// Real nested-path HTTP and actual loader/assembler exercise; no WebGL rendering.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {pathToFileURL, fileURLToPath} from 'node:url';
const root = path.resolve('dist'), base = '/nested/tinderbox/', startedAt = new Date().toISOString();
const intake = JSON.parse(fs.readFileSync(path.join(root, 'assets/art/neighborhood-intake.json')));
const mime = {'.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.html': 'text/html'};
const server = http.createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost'); if (!url.pathname.startsWith(base)) throw Error('Wrong base');
    const file = path.resolve(root, url.pathname.slice(base.length));
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw Error('Missing resource');
    response.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'}); response.end(fs.readFileSync(file));
  } catch { response.writeHead(404); response.end(); }
});
const expiry = setTimeout(() => { server.closeAllConnections(); server.close(); process.exitCode = 1; }, 30000);
let port, receipt, kit, view, simulation, previousLoad, T;
const netFetch = globalThis.fetch, loaderRequests = [], textures = [];
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  port = server.address().port; const origin = 'http://127.0.0.1:' + port + base;
  const paths = ['index.html', 'src/main.js', 'src/art/index.js', 'src/art/neighborhood.js', 'src/content/neighborhood.js',
    'src/content/buildings.js', 'src/content/housing-plans.js', 'assets/art/neighborhood-intake.json', ...intake.runtimeFiles.map(file => file.installedPath),
    ...(intake.supportFiles || []).map(file => file.installedPath)];
  for (const file of paths) {
    const response = await netFetch(new URL(file, origin)); if (!response.ok) throw Error('Packaged HTTP ' + response.status + ': ' + file);
    const bytes = Buffer.from(await response.arrayBuffer()), expected = [...intake.runtimeFiles, ...(intake.supportFiles || [])].find(record => record.installedPath === file);
    if (expected && (bytes.length !== expected.bytes || createHash('sha256').update(bytes).digest('hex') !== expected.sha256)) throw Error('Changed packaged housing bytes: ' + file);
  }
  function hosted(resource) {
    const original = new URL(resource), relative = path.relative(root, fileURLToPath(original)).split(path.sep).join('/');
    if (path.isAbsolute(relative) || relative.startsWith('../')) throw Error('Loader escaped package');
    const url = new URL(relative, origin); loaderRequests.push(url.pathname); return url;
  }
  T = await import(pathToFileURL(path.join(root, 'src/runtime/three.js'))); previousLoad = T.TextureLoader.prototype.loadAsync;
  globalThis.fetch = resource => netFetch(hosted(resource));
  T.TextureLoader.prototype.loadAsync = async resource => {
    const response = await netFetch(hosted(resource)); if (!response.ok || response.headers.get('content-type') !== 'image/png') throw Error('Missing actual texture');
    const bytes = Buffer.from(await response.arrayBuffer()); if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw Error('Invalid texture payload');
    const texture = new T.Texture(); textures.push(texture); return texture;
  };
  const {loadNeighborhoodKit, createNeighborhood} = await import(pathToFileURL(path.join(root, 'src/art/neighborhood.js')));
  const {createSimulation} = await import(pathToFileURL(path.join(root, 'src/simulation/index.js')));
  kit = await loadNeighborhoodKit(T); simulation = createSimulation({scenario: 'neighborhood'}); view = createNeighborhood(T, kit); view.update(simulation.snapshot().world);
  if (view.diagnostics().active !== 8 || !view.diagnostics().models.every(model => model.nativeScale.every(value => value === 1))) throw Error('Wrong actual packaged prefab instances');
  const row=simulation.snapshot().world.buildings.filter(building=>building.prefabId==='monroe-row');
  if(row.length!==3||row[1].partyWalls.left!==row[0].id||row[1].partyWalls.right!==row[2].id)throw Error('Packaged authoritative row join IDs missing');
  const windows = []; view.root.traverse(object => { if (object.name === 'Nautilus centered window bay') windows.push(object); });
  if (windows.length !== 2 || windows.some(object => object.userData.sourceCommit !== intake.windowSourceCommit)) throw Error('Packaged centered-window source closure missing');
  if (loaderRequests.length !== 8 || textures.length !== 6 || new Set(loaderRequests).size !== 8) throw Error('Expected two actual catalogue requests and six shared texture requests');
  if ((await netFetch(new URL('workbenches/art/neighborhood.html', origin))).status !== 404) throw Error('Review page leaked into public package');
  receipt = {task: 'TB-018', purpose: 'One-shot nested-path HTTP, loader, native instance/source and code-side join check; joined-art/UI semantics await exact candidates; no WebGL',
    pid: process.pid, executable: process.execPath, startedAt, port, sourceCommit: intake.sourceCommit, resources: paths.length,
    loaderRequests, selectedPrefabs: [...new Set(view.diagnostics().models.map(model => model.id))], instances:view.diagnostics().active,
    partyWalls:row.map(({id,partyWalls})=>({id,partyWalls})),artRowAcceptance:'pending exact artist candidate',uiAcceptance:'pending exact UI candidate',centeredWindows: windows.length,
    windowSourceCommit: intake.windowSourceCommit, rendered: false, passed: true};
} finally {
  globalThis.fetch = netFetch; if (T && previousLoad) T.TextureLoader.prototype.loadAsync = previousLoad;
  view?.dispose(); kit?.dispose(); simulation?.dispose(); clearTimeout(expiry);
  server.closeAllConnections(); if (server.listening) await new Promise(resolve => server.close(resolve));
  if (receipt) {
    receipt.stoppedAt = new Date().toISOString(); receipt.serverClosed = !server.listening;
    fs.mkdirSync('artifacts/TB-018', {recursive: true}); fs.writeFileSync('artifacts/TB-018/package-smoke.json', JSON.stringify(receipt, null, 2) + '\n'); console.log(JSON.stringify(receipt));
  }
}
