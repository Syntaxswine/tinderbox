// Round 2 helper: waits until the files matched by a prefix in a folder hold at least N lines in total, or a time limit passes.
//   node wait-lines.mjs <folder> <file prefix> <lines> [limit seconds]
import fs from 'node:fs';
import path from 'node:path';
const [folder, prefix, want, limit = '540'] = process.argv.slice(2), dir = path.resolve(import.meta.dirname, folder), began = Date.now();
const count = () => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.startsWith(prefix)).reduce((n, f) => n + fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).length, 0) : 0;
const tick = () => { const n = count(); if (n >= +want || Date.now() - began > +limit * 1000) { console.log(n + ' lines after ' + Math.round((Date.now() - began) / 1000) + ' s'); return; } setTimeout(tick, 3000); };
tick();
