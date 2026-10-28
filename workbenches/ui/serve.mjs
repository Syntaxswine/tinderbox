import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.TINDERBOX_UI_PORT || 4552);
const minutes = Number(process.env.TINDERBOX_UI_MINUTES || 60);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || !(minutes > 0 && minutes <= 1440)) throw Error('Invalid preview port or lifetime.');
const helperDirectory = path.join(root, 'artifacts/ui-preview');
fs.mkdirSync(helperDirectory, {recursive: true});
const stopFile = path.join(helperDirectory, 'STOP');
if (fs.existsSync(stopFile)) throw Error('An existing STOP marker is present. Review the prior helper before restarting.');
const vendor = 'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/';
const woodTexture = vendor + 'aft/assets/environment/hybrid-surfaces/wood-factory-v2.png';
const allowed = name => ['src/ui/', 'assets/art/ui/', 'workbenches/ui/', 'tests/ui/', vendor + 'assets/ui/'].some(prefix => name.startsWith(prefix)) || [vendor + 'industrial-switches.css', vendor + 'map-frame.css', woodTexture].includes(name);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server = http.createServer((request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    let name = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '');
    // Optional nested base exercises module- and CSS-relative URL resolution.
    if (name.startsWith('nested/ui-review/')) name = name.slice('nested/ui-review/'.length);
    if (!name) { response.writeHead(302, {Location:'./workbenches/ui/'}).end(); return; }
    if (name.endsWith('/')) name += 'index.html';
    if (!allowed(name) || name.split(/[\\/]/).some(part => part.startsWith('.'))) { response.writeHead(403).end('Not served'); return; }
    const file = fs.realpathSync(path.resolve(root, name));
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw Error('Outside preview root');
    response.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if (request.method === 'HEAD') response.end(); else fs.createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end('Not found'); }
});
let stopping = false;
const startedAt = new Date().toISOString(), expiresAt = new Date(Date.now() + minutes * 60000).toISOString();
function stop(reason) {
  if (stopping) return;
  stopping = true; clearInterval(marker); clearTimeout(expiry);
  console.log('Stopping UI preview: ' + reason);
  server.close(() => { fs.writeFileSync(path.join(helperDirectory,'exit.json'), JSON.stringify({pid:process.pid,reason,stoppedAt:new Date().toISOString()},null,2)); process.exit(0); });
  server.closeAllConnections();
}
const marker = setInterval(() => { if (fs.existsSync(stopFile)) stop('STOP marker'); }, 500);
const expiry = setTimeout(() => stop('automatic expiry'), minutes * 60000);
process.on('SIGINT', () => stop('SIGINT')); process.on('SIGTERM', () => stop('SIGTERM'));
server.on('error', error => { clearInterval(marker); clearTimeout(expiry); console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  fs.writeFileSync(path.join(helperDirectory, 'process.json'), JSON.stringify({pid:process.pid,executable:process.execPath,project:'Tinderbox',task:'TB-006',owner:process.env.TINDERBOX_UI_OWNER || 'unregistered-foreground',purpose:'Temporary UI workbench review',port,startedAt,expiresAt,stopFile,cwd:root},null,2));
  console.log('Tinderbox UI: http://127.0.0.1:' + port + '/workbenches/ui/ · expires ' + expiresAt);
});
