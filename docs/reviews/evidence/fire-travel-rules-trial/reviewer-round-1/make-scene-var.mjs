// Reviewer round 1: writes scene-var.mjs from ../scene.mjs with a few stated replacements, so the
// difference from the original is exactly these lines.
import fs from 'node:fs';
import path from 'node:path';
const here = import.meta.dirname;
let s = fs.readFileSync(path.join(here, '../scene.mjs'), 'utf8');
const rs = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a); s = s.replace(a, b); };
rs('// Builds test scenes', '// REVIEWER COPY (round 1) of ../scene.mjs: house() also takes a plan OBJECT, and options {doorsOpen}.\n// Builds test scenes');
rs("import {PITCH} from './kernel.mjs';", "import {PITCH} from '../kernel.mjs';");
rs("path.resolve(import.meta.dirname, '../../../..')", "path.resolve(import.meta.dirname, '../../../../..')");
rs('export const plan = id => HOUSING_PLANS[id];', "export const plan = id => typeof id === 'string' ? HOUSING_PLANS[id] : id;\nexport {HOUSING_PLANS};");
rs('export function house(world, name, planId, ox, oy, contents = {}) {', 'export function house(world, name, planId, ox, oy, contents = {}, options = {}) {');
rs("const door = doorFaces.has([f, ci, cj, axis, step].join(':'));", "const door = doorFaces.has([f, ci, cj, axis, step].join(':'));\n        if (door && options.doorsOpen) continue;");
rs('hash(planId + record.id)', 'hash(p.id + record.id)');
rs('return {name, plan: p, rooms, origin: [oi, oj]};', 'return {name, plan: p, rooms, origin: [oi, oj], doorFaces};');
fs.writeFileSync(path.join(here, 'scene-var.mjs'), s);
console.log('scene-var.mjs written');
