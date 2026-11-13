import test from 'node:test';
import assert from 'node:assert/strict';
import {base64Payload} from '../../workbenches/bell-and-alder-closing/encoding.js';
test('FileReader video codec commas cannot replace the EBML bytes with a MIME fragment',()=>{
  const bytes=Buffer.from([0x1a,0x45,0xdf,0xa3,0x9f,0x42,0x86,0x81]);
  for(const mime of ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','image/jpeg'])assert.deepEqual(Buffer.from(base64Payload('data:'+mime+';base64,'+bytes.toString('base64')),'base64'),bytes);
  assert.throws(()=>base64Payload('data:video/webm;codecs=vp9,opus'),/base64/);assert.throws(()=>base64Payload('data:video/webm;base64,not;base64'),/payload/);
});
