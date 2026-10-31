import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readScalarBytes,voxelCentre,toGame,trilinear,surfaceResidual} from './reader.mjs';
const b=Buffer.alloc(20);[0,-0,1.65,-3.2,1e-5].forEach((v,i)=>b.writeFloatLE(v,i*4));const values=readScalarBytes(b,5);assert(Object.is(values[1],-0));assert.equal(values[2],Math.fround(1.65));
assert.throws(()=>readScalarBytes(b,4),/byte length/);const invalid=Buffer.alloc(4);invalid.writeFloatLE(NaN);assert.throws(()=>readScalarBytes(invalid,1),/Nonfinite/);
assert.deepEqual(voxelCentre(13,[3,2,4],[1,2,3],[.1,.2,.3]),[1.1,2,3.6]);assert.throws(()=>voxelCentre(24,[3,2,4],[0,0,0],[1,1,1]),/outside/);
const linear=Float32Array.from({length:27},(_,i)=>(i%3)+2*(Math.floor(i/3)%3)+3*Math.floor(i/9));assert.equal(trilinear(linear,[3,3,3],[.5,.5,.5]),3);assert.equal(surfaceResidual([.5,.5,.5],linear,[3,3,3],[0,0,0],[1,1,1],3).meanAbsoluteError,0);assert(surfaceResidual([1,1,1],linear,[3,3,3],[0,0,0],[1,1,1],3).meanAbsoluteError>2);
const settings=JSON.parse(fs.readFileSync(new URL('./settings.json',import.meta.url),'utf8'));assert.deepEqual(toGame([1,2,3],settings.source.blenderWorldToGameRowMajor),[6.5,3,6.5]);
assert.equal(settings.limits.wallSeconds,900);assert.equal(settings.limits.processMemoryBytes,2**31);assert.equal(settings.limits.outputBytes,512*1024*1024);assert.deepEqual(settings.simulation.frames,[1,24]);assert.equal(settings.simulation.resolutionMax,32);assert.equal(settings.simulation.noise,false);assert.equal(settings.simulation.adaptiveDomain,false);assert.equal(settings.source.cells.length,4);
const frozen='96b20e0634c56086200fe0d5e9fadbcf121660d5';
const attributesPath='assets/art/fire-realism/contact-pilot/.gitattributes';
function immutableBytesEqual(file,actual,expected){
  if(file!==attributesPath)return actual.equals(expected);
  // Git may check out this non-runtime attributes text with CRLF. Preserve
  // every other byte; runtime JS, JSON and binaries always use exact bytes.
  const lf=bytes=>Buffer.from(bytes.filter((v,i)=>v!==13||bytes[i+1]!==10));
  return lf(actual).equals(lf(expected));
}
const frozenBytes=file=>execFileSync('git',['show',frozen+':'+file],{maxBuffer:4*1024*1024});
const attrs=frozenBytes(attributesPath),attrsCrlf=Buffer.from(attrs.toString('utf8').replace(/\r?\n/g,'\r\n'));
assert(attrsCrlf.includes(13)&&!attrsCrlf.equals(attrs),'Fixture must contain an actual CRLF byte change');
assert(immutableBytesEqual(attributesPath,attrsCrlf,attrs),'CRLF attributes checkout should pass');
assert(!immutableBytesEqual('assets/art/fire-realism/other/.gitattributes',attrsCrlf,attrs),'Only the named non-runtime attributes file is exempt');
assert(!immutableBytesEqual(attributesPath,Buffer.concat([attrsCrlf,Buffer.from('# changed content\r\n')]),attrs),'Attributes content changes must fail');
for(const file of ['assets/art/fire-realism/index.js','assets/art/fire-realism/manifest.json']){
  const raw=frozenBytes(file),crlf=Buffer.from(raw.toString('utf8').replace(/\r?\n/g,'\r\n'));
  assert(!immutableBytesEqual(file,crlf,raw),file+' CRLF must still fail');
  assert(!immutableBytesEqual(file,Buffer.concat([raw,Buffer.from('changed')]),raw),file+' content changes must fail');
}
assert(!immutableBytesEqual('example.bin',Buffer.from([0,13,10,255]),Buffer.from([0,10,255])),'Binary bytes must remain exact');
for(const dir of ['assets/art/fire-realism']){
  const files=execFileSync('git',['ls-tree','-r','--name-only',frozen,'--',dir],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  assert(files.length>0,dir+' frozen guard empty');for(const file of files)assert(immutableBytesEqual(file,fs.readFileSync(file),frozenBytes(file)),file+' changed outside stage1');
}
console.log('PASS: f32LE exact roundtrip/nonfinite/truncation, XYZ stride and native axis mapping, bounded settings, immutable R09 + rejected pilot; only attributes CRLF canonicalized, content/runtime/binary changes rejected');
