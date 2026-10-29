import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const PRESERVED_MARK_SOURCE = Object.freeze({
  path: 'art/source/medicine-pickups/control-symbols-source.svg',
  originalPath: 'assets/art/ui/control-symbols.svg',
  sourceCommit: '26e1b1301ce577ab8ed26afa32fdafa93d7d44e4',
  lastSourceChangeCommit: '2b33b528de724adec3ddf3b7227dfed0ec2210d5',
  sha256: 'd3e36191867deeff14a624cc98d01992333034b87669de9721a0a5bd2d38cd5c',
  bytes: 1836
});
export function readPreservedMarkSource() {
  const bytes = fs.readFileSync(PRESERVED_MARK_SOURCE.path);
  if (bytes.length !== PRESERVED_MARK_SOURCE.bytes || createHash('sha256').update(bytes).digest('hex') !== PRESERVED_MARK_SOURCE.sha256)
    throw new Error('Preserved medicine SVG differs from the pinned original Git bytes');
  return bytes;
}
function contours(d) {
  const tokens = d.match(/[mhlvz]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/ig);
  const result = []; let i = 0, op, x = 0, y = 0, start, polygon;
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) op = tokens[i++];
    if (!op) throw Error('Invalid path');
    const relative = op === op.toLowerCase(), c = op.toUpperCase();
    if (c === 'Z') { x = start[0]; y = start[1]; op = null; continue; }
    if (!'MLHV'.includes(c)) throw Error('Only exact polygon paths are supported');
    if (c === 'M' || c === 'L') {
      const a = Number(tokens[i++]), b = Number(tokens[i++]);
      x = relative ? x + a : a; y = relative ? y + b : b;
      if (c === 'M') { polygon = []; result.push(polygon); start = [x, y]; op = relative ? 'l' : 'L'; }
    } else if (c === 'H') { const a = Number(tokens[i++]); x = relative ? x + a : a; }
    else { const a = Number(tokens[i++]); y = relative ? y + a : a; }
    if (![x, y].every(Number.isFinite)) throw Error('Invalid source contour');
    polygon.push([x, y]);
  }
  return result;
}
export function deriveMarks(source) {
  const marks = {};
  for (const kind of ['powder', 'healing', 'inversion']) {
    const symbol = source.match(new RegExp('<symbol id="' + kind + '"[^>]*>([\\s\\S]*?)</symbol>'))?.[1];
    if (!symbol) throw Error('Missing existing symbol ' + kind);
    const paths = [...symbol.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m => m[1]);
    let selected;
    if (kind === 'powder') selected = contours(paths[2]);
    else if (kind === 'healing') selected = [contours(paths[0])[1]];
    else selected = paths.flatMap(contours);
    // Historical source ID, not a dependency on the evolving runtime UI file.
    marks[kind] = {sourceSymbol: PRESERVED_MARK_SOURCE.originalPath + '#' + kind,
      adaptation: kind === 'powder' ? 'Existing dark lightning inset only; pouch silhouette becomes the physical packet.' :
        kind === 'healing' ? 'Existing cross counterform rendered as positive dark ink on the porcelain lid.' :
        'All existing opposed-arrow contours preserved.', contours: selected};
  }
  return marks;
}
export function buildMarks() {
  const bytes = readPreservedMarkSource(), marks = deriveMarks(bytes.toString('utf8'));
  const out = 'assets/art/medicine-pickups/marks.js';
  fs.writeFileSync(out, '// Derived from the existing Tinderbox vector marks; regenerate with art/source/medicine-pickups/build-marks.mjs.\nexport const MARKS = ' + JSON.stringify(marks, null, 2) + ';\n');
  fs.writeFileSync('art/source/medicine-pickups/mark-source.json', JSON.stringify({...PRESERVED_MARK_SOURCE,
    hashEncoding: 'Exact preserved Git blob bytes; no text normalization',
    preservation: 'Original SVG copied byte-for-byte from sourceCommit:originalPath; local .gitattributes disables text conversion.',
    sourceComment: 'Original Tinderbox control marks, 32-unit grid. Editable vector source.',
    derivation: 'Exact polygon vertices, independently fitted uniformly to the grounded prop label; no new glyph design.', marks}, null, 2) + '\n');
  console.log('Derived three existing marks from the preserved original SVG; evolving UI is not an input.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) buildMarks();
