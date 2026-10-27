import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const root = fs.realpathSync(path.resolve(option('--root', '.'))), port = Number(option('--port', '4550'));
const ttl = Number(option('--ttl', '1800'));
const base = option('--base', '/');
if (!Number.isInteger(port) || port < 1024 || port > 65535 || !Number.isFinite(ttl) || ttl <= 0 || ttl > 86400) throw Error('Invalid preview port/TTL');
if (!/^\/(?:[a-z0-9-]+\/)*$/i.test(base)) throw Error('Invalid preview base path');
const helperDirectory = path.resolve('artifacts/helpers', 'preview-' + process.pid);
const stopFile = path.resolve(option('--stop-file', path.join(helperDirectory, 'STOP')));
fs.mkdirSync(path.dirname(stopFile), {recursive: true});
const expiresAt = Date.now() + ttl * 1000;
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp'};
const server = http.createServer((req, res) => {
  let file;
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/' && base !== '/') { res.writeHead(302,{Location:base}).end(); return; }
    if (!url.pathname.startsWith(base)) { res.writeHead(404).end(); return; }
    let pathname = '/' + decodeURIComponent(url.pathname.slice(base.length));
    if (pathname.endsWith('/')) pathname += 'index.html';
    file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || pathname.split(/[\\/]/).some(p => p.startsWith('.'))) { res.writeHead(403).end(); return; }
    if (!fs.realpathSync(file).startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  } catch { res.writeHead(404).end('Not found'); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    const stream = fs.createReadStream(file); stream.on('error', () => res.destroy()); stream.pipe(res);
  });
});
let stopping = false;
function stop(reason) { if (stopping) return; stopping = true; clearInterval(retire); server.close(() => { console.log(JSON.stringify({status: 'stopped', reason, pid: process.pid})); process.exit(0); }); server.closeAllConnections(); }
const retire = setInterval(() => { if (Date.now() >= expiresAt || fs.existsSync(stopFile)) stop(fs.existsSync(stopFile) ? 'stop-file' : 'ttl'); }, 250);
process.on('SIGINT', () => stop('SIGINT')); process.on('SIGTERM', () => stop('SIGTERM'));
server.on('error', error => { clearInterval(retire); console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({pid: process.pid, url: `http://127.0.0.1:${port}${base}`, root, stopFile, expiresAt: new Date(expiresAt).toISOString()})));
