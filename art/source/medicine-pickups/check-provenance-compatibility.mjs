import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PRESERVED_MARK_SOURCE as pin, readPreservedMarkSource} from './build-marks.mjs';
const root = process.cwd(), sha = b => createHash('sha256').update(b).digest('hex');
const preserved = readPreservedMarkSource(), arg = process.argv.indexOf('--ui-commit'), uiCommit = arg < 0 ? null : process.argv[arg + 1];
if (uiCommit && !/^[a-f0-9]{40}$/.test(uiCommit)) throw Error('Use an immutable 40-character UI commit');
let ui = uiCommit ? execFileSync('git', ['show', uiCommit + ':' + pin.originalPath]) : fs.readFileSync(pin.originalPath);
const sourceUiSha = sha(ui);
if (sha(ui) === pin.sha256 || sha(Buffer.from(ui.toString('utf8').replace(/\r\n/g, '\n'))) === pin.sha256)
  ui = Buffer.concat([ui, Buffer.from('\n<!-- Independent UI evolution fixture; original medicine art stays pinned. -->\n')]);
const base = path.resolve('artifacts/medicine-pickups/provenance-compatibility'); fs.mkdirSync(base, {recursive: true});
const tools = {generator: path.join(root, 'art/source/medicine-pickups/build-marks.mjs'), checker: path.join(root, 'workbenches/art/check-medicine-pickups.mjs')};
function fixture(label, currentUi) {
  const cwd = fs.mkdtempSync(path.join(base, label + '-'));
  for (const relative of [pin.path, 'assets/art/medicine-pickups/marks.js']) fs.mkdirSync(path.dirname(path.join(cwd, relative)), {recursive: true});
  fs.writeFileSync(path.join(cwd, pin.path), preserved);
  if (currentUi) { const p = path.join(cwd, pin.originalPath); fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, currentUi); }
  return cwd;
}
function run(which, cwd, expectedError) {
  let result, error;
  try { result = execFileSync(process.execPath, [tools[which]], {cwd, timeout: 15000, encoding: 'utf8', maxBuffer: 2 ** 20, stdio: ['ignore', 'pipe', 'pipe']}); }
  catch (e) { error = e; }
  if (expectedError) {
    assert.ok(error, which + ' must reject invalid provenance');
    assert.match(String(error.stderr), expectedError); return;
  }
  if (error) throw error;
  return result;
}
function successful(cwd) {
  run('generator', cwd);
  assert.deepEqual(fs.readFileSync(path.join(cwd, 'assets/art/medicine-pickups/marks.js')), fs.readFileSync('assets/art/medicine-pickups/marks.js'), 'Regenerated runtime marks remain byte-identical');
  const report = JSON.parse(run('checker', cwd));
  assert.equal(report.passed, true); assert.equal(report.preservedSource.selectedRuntimeContoursMatch, true);
}
const newer = fixture('newer-ui', ui); successful(newer);
assert.deepEqual(fs.readFileSync(path.join(newer, pin.originalPath)), ui, 'Generator/checker must leave current UI bytes unchanged');
const absent = fixture('no-ui', null); successful(absent);
assert.equal(fs.existsSync(path.join(absent, pin.originalPath)), false);
fs.writeFileSync(path.join(absent, pin.path), Buffer.concat([preserved, Buffer.from('\n<!-- invalid source mutation -->\n')]));
run('generator', absent, /Preserved medicine SVG differs from the pinned original Git bytes/);
fs.writeFileSync(path.join(absent, pin.path), preserved);
const metaPath = path.join(absent, 'art/source/medicine-pickups/mark-source.json'), metadata = JSON.parse(fs.readFileSync(metaPath));
metadata.marks.powder.contours[0][0][0] += 1; fs.writeFileSync(metaPath, JSON.stringify(metadata));
run('checker', absent, /Recorded selected glyph contours must match the immutable preserved SVG/);
const report = {passed: true, source: pin, ui: {commit: uiCommit, sourceSha256: sourceUiSha, exercisedSha256: sha(ui), differsFromPreserved: sha(ui) !== pin.sha256, leftUnchanged: true},
  cases: ['Actual generator and full art checker pass beside different/newer UI bytes', 'Actual generator and full art checker pass with runtime UI SVG absent', 'Regenerated runtime marks remain byte-identical', 'Changed preserved SVG rejected', 'Changed selected glyph contour rejected'],
  fixtures: [path.relative(root, newer).split(path.sep).join('/'), path.relative(root, absent).split(path.sep).join('/')], helpers: 'Finite synchronous child commands, 15-second timeouts; no service or retained process'};
fs.writeFileSync('artifacts/medicine-pickups/provenance-compatibility.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
