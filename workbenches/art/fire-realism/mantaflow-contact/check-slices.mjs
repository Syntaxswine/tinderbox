/** Independent exact numerical slice witnesses, not a native optical test. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const rawPath=process.argv[2];if(!rawPath)throw Error('Expected original raw-manifest.json');
const sha=b=>createHash('sha256').update(b).digest('hex'),folder=new URL('./diagnostic-slices/',import.meta.url),report=JSON.parse(fs.readFileSync(new URL('slices.json',folder))),rawBytes=fs.readFileSync(rawPath),raw=JSON.parse(rawBytes),root=path.dirname(path.resolve(rawPath));
assert.equal(sha(rawBytes),report.rawManifestSha256);assert.equal(report.plotScriptSha256,sha(fs.readFileSync(new URL('./plot-raw-slices.mjs',import.meta.url))));
assert.equal(report.observedIgnition.tick,1);assert.equal(report.observedIgnition.worldTime,1/60);assert.equal(report.observedIgnition.events.length,4);let checked=0,positives=0;
for(const [phaseIndex,phase]of report.phases.entries()){
 assert.equal(phase.nativeFrame,[30,60,120][phaseIndex]);assert.equal(phase.sourceAge,phase.worldTime-report.observedIgnition.worldTime);const samplePosition=phase.sourceAge*30;assert.equal(phase.sample0,Math.floor(samplePosition));assert.equal(phase.sample1,phase.sample0+1);assert.equal(phase.mix,samplePosition-phase.sample0);assert.equal(phase.gpuUniformMix,Math.fround(phase.mix));assert.deepEqual(phase.cacheFrames,[[15,16],[30,31],[60,61]][phaseIndex]);
 for(const field of phase.fields){assert.deepEqual(field.range,field.name==='flame'?[0,1]:[0,3]);assert.match(field.unit,/uncalibrated/);
  const aRecord=raw.samples[phase.sample0].channels[field.name],bRecord=raw.samples[phase.sample1].channels[field.name],a=fs.readFileSync(path.join(root,aRecord.path)),b=fs.readFileSync(path.join(root,bRecord.path));assert.equal(sha(a),aRecord.sha256);assert.equal(sha(b),bRecord.sha256);assert.deepEqual(field.originals,[aRecord,bRecord]);const aView=new DataView(a.buffer,a.byteOffset,a.byteLength),bView=new DataView(b.buffer,b.byteOffset,b.byteLength);
  for(const [row,slice]of field.slices.entries()){
   assert.equal(slice.zIndex,[6,11,27][row]);assert.equal(slice.height,report.grid.origin[2]+slice.zIndex*report.grid.spacing[2]);assert.equal(slice.values.length,48*48);let positive=0;
   for(let y=0;y<48;y++)for(let x=0;x<48;x++){const offset=(x+48*(y+48*slice.zIndex))*4,value=aView.getFloat32(offset,true)+(bView.getFloat32(offset,true)-aView.getFloat32(offset,true))*phase.mix;assert.equal(slice.values[x+48*y],value);if(value>0)positive++;checked++;}
   assert.equal(slice.positiveValues,positive);positives+=positive;assert.equal(slice.min,Math.min(...slice.values));assert.equal(slice.max,Math.max(...slice.values));
  }
 }
 const svg=fs.readFileSync(new URL('phase-'+String(phase.nativeFrame).padStart(3,'0')+'.svg',folder),'utf8');assert.match(svg,/uncalibrated solver proxy, NOT kelvin/);assert.match(svg,/Blender X \(m\); native X = 5.5 \+ X/);assert.match(svg,/native Z = 8.5/);assert.match(svg,/not a fire rendering/);assert.equal((svg.match(/measured height /g)||[]).length,6);
}
for(const record of JSON.parse(fs.readFileSync(new URL('inventory.json',folder))).files){const bytes=fs.readFileSync(new URL(record.path,folder));assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);}
console.log(JSON.stringify({status:'pass',nativePhases:[30,60,120],actualCachePairs:[[15,16],[30,31],[60,61]],fixedScales:[[0,1],[0,3]],zIndices:[6,11,27],exactRawBlendedSliceValues:checked,positiveValuesRetained:positives,originalInputHashChecks:true,noGPUorArtClaim:true}));
