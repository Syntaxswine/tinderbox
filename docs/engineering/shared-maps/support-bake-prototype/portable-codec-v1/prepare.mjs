// Preparation only: Node I/O/hash dependencies are intentionally outside codec.mjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {encodeSupportBlocks,decodeSupportBlocks,DEFAULT_LIMITS,WIRE_FORMAT} from './codec.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inputURL=new URL('../blocks.json',import.meta.url),raw=fs.readFileSync(inputURL);
assert.equal(sha(raw),'ef1990de493c8f901c1cf631b71aaf750bf7e30bb7b9b8976e3f5f12401244fa','Only the four archived blocks are accepted here');
const archive=JSON.parse(raw);assert.equal(archive.entries.length,4);
for(const entry of archive.entries){
  assert.equal(sha(JSON.stringify(entry.descriptor)),entry.signature);
  assert.equal(sha(JSON.stringify({signature:entry.signature,edges:entry.edges,result:entry.result})),entry.blockSha256);
}
const encoded=encodeSupportBlocks(archive),decoded=decodeSupportBlocks(encoded);
assert.equal(JSON.stringify(decoded),JSON.stringify(archive),'Identity data, key order, edge order and results stay exact');
assert.deepEqual(encodeSupportBlocks(decoded),encoded,'Deterministic encoding');
const outputURL=new URL('./four-saved-blocks.tbsb',import.meta.url);
fs.writeFileSync(outputURL,encoded);
const header=new DataView(encoded.buffer,encoded.byteOffset,encoded.byteLength);
const result={
  purpose:'Portable codec packaging of four saved blocks only; no simulation or benchmark',
  originalProofCommit:'e3c352265862ad39046128a9b27b2a5c10f1e6fa',
  frozenSourceCommit:archive.sourceCommit,
  input:{path:'../blocks.json',bytes:raw.length,sha256:sha(raw)},
  output:{path:'four-saved-blocks.tbsb',bytes:encoded.length,sha256:sha(encoded),wireFormat:WIRE_FORMAT},
  codecLfSha256:sha(fs.readFileSync(new URL('./codec.mjs',import.meta.url),'utf8').replace(/\r\n/g,'\n')),
  testsLfSha256:sha(fs.readFileSync(new URL('./codec.test.mjs',import.meta.url),'utf8').replace(/\r\n/g,'\n')),
  dictionaryIdsAndStrings:header.getUint32(12,true),
  entries:header.getUint32(16,true),orderedDirectedEdges:header.getUint32(20,true),
  identityJSONExact:true,originalSignatureFields:archive.entries.map(e=>({signature:e.signature,blockSha256:e.blockSha256})),
  savedTypedResults:archive.entries.map(e=>e.result),
  hardLimits:DEFAULT_LIMITS,
  integrityScope:'CRC32 detects wire corruption only. Reviewed SHA-256/source/block identity and native applicability remain separate; no runtime admission.',
  helpersCreated:0
};
fs.writeFileSync(new URL('./codec-package.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({entries:result.entries,orderedDirectedEdges:result.orderedDirectedEdges,
  dictionaryIdsAndStrings:result.dictionaryIdsAndStrings,inputBytes:raw.length,encodedBytes:encoded.length,sha256:result.output.sha256}));
