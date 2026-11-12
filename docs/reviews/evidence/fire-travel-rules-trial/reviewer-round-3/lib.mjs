// Round 3 reviewer helpers. Imports the author's code unchanged; scene variants are made through the
// `before` hook of burn() (which runs after the house is built and before the match), so no copy of
// scene.mjs, measure.mjs or kernel.mjs is needed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
export * from '../measure.mjs';
import {PLANS} from '../measure.mjs';

export const here = import.meta.dirname;
export const out = (name, text) => { const dir = path.join(here, 'results'); fs.mkdirSync(dir, {recursive: true}); fs.writeFileSync(path.join(dir, name), text); };
export const hashEvents = events => crypto.createHash('sha1').update(JSON.stringify(events)).digest('hex').slice(0, 12);
export const PANEL = [['hopkins-4-15', 'wall:x+:19:4'], ['hopkins-4-15', 'wall:y-:10:0'], ['hopkins-4-15', 'room:0:dining'], ['hopkins-4-15', 'room:1:bed-a'], ['hopkins-4-12', 'wall:x+:15:7'],
  ['hopkins-4-12', 'room:0:kitchen'], ['ashland-worker', 'room:0:kitchen'], ['hopkins-4-09', 'room:1:bed-a'], ['monroe-row', 'room:0:parlor'], ['hopkins-4-13', 'wall:y+:8:15']];
export const readSurvey = dir => PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(dir, 'survey-' + p + '.json'), 'utf8')));

// Scene variants, applied to a built world.
// extra air layers above the present top, over every column that has a tile.
export function moreAir(world, layers) {
  let top = 0; for (const t of world.tiles.values()) if (t.k > top) top = t.k;
  const cols = new Map(); for (const t of world.tiles.values()) if (t.k === top) cols.set(t.i + ':' + t.j, t);
  for (const t of cols.values()) for (let n = 1; n <= layers; n++) world.addTile(t.i, t.j, top + n);
}
// widen the ring of air round everything by `width` tiles on every layer that exists.
export function widerRing(world, width) {
  let top = 0; for (const t of world.tiles.values()) if (t.k > top) top = t.k;
  const all = [...world.tiles.values()];
  for (const t of all) for (let dj = -width; dj <= width; dj++) for (let di = -width; di <= width; di++) for (let k = 0; k <= top; k++) if (!world.tileAt(t.i + di, t.j + dj, k)) world.addTile(t.i + di, t.j + dj, k);
}
export const isOpenToSky = (world, tile) => { let top = 0; for (const t of world.tiles.values()) if (t.k > top) top = t.k; for (let k = tile.k; k <= top; k++) { const f = world.faceBetween(tile.i, tile.j, k, 2, 1); if (f && f.pass < world.rules.sight) return false; } return true; };
