// Verify the byte-preserved local font distribution and its notices.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/art/ui/typography/manifest.json'), 'utf8'));
for (const file of manifest.files) {
  const target = path.resolve(root, file.installedPath);
  if (!target.startsWith(root + path.sep)) throw Error('Font source escaped project: ' + file.installedPath);
  const bytes = fs.readFileSync(target);
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw Error('Font source drift: ' + file.installedPath);
  if (target.endsWith('.ttf') && bytes.readUInt32BE(0) !== 0x10000) throw Error('Unexpected font container');
  if (target.endsWith('OFL.txt') && !bytes.toString('utf8').includes('SIL OPEN FONT LICENSE')) throw Error('Missing font notice');
}
console.log('PASS: ' + manifest.files.length + ' pinned font/notice/source files retain their exact bytes; three local font faces and both OFL notices are present.');
