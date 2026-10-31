// Tiny source/byte fixtures only. Does not call run() or open any actual dataset.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {sha,plain,readInto,readPinned,exactInventory,parseArgs,createOutputDirectory} from './assess.mjs';
import {scanField,connectivity,validateSamples,terminalReport,compareTerminal} from './metrics.mjs';
const passed=[],test=(name,fn)=>{fn();passed.push(name);};
const here=path.dirname(fileURLToPath(import.meta.url)),project=path.resolve(here,'../../../..'),base=path.join(project,'artifacts/qa/fire-realism/half-rate-assessment');
fs.mkdirSync(base,{recursive:true});const temp=fs.mkdtempSync(path.join(base,'source-fixtures-'));
const g={resolution:[2,3,4],voxelSize:[.5,.5,.5],gridOrigin:[-.5,-.5,-.5],domainBounds:{min:[-.75,-.75,-.75],max:[.25,.75,1.25]},contactBandHeight:.27};
const bytes=Buffer.alloc(96),put=(x,y,z,v)=>bytes.writeFloatLE(v,4*(x+2*(y+3*z)));
put(0,0,0,1);put(1,1,1,2);put(0,2,3,7);const original=sha(bytes);
const file=path.join(temp,'tiny.f32');fs.writeFileSync(file,bytes,{flag:'wx'});const r={path:'tiny.f32',bytes:96,sha256:original};
test('exact raw byte reader roundtrip and caller buffer',()=>{const out=Buffer.alloc(96);readInto(file,out,r);assert.equal(sha(out),original);});
test('wrong SHA refuses without input writes',()=>assert.throws(()=>readInto(file,Buffer.alloc(96),{...r,sha256:'0'.repeat(64)}),/SHA-256/));
test('short/oversized field refuses before read',()=>{assert.throws(()=>readInto(file,Buffer.alloc(92),{...r,bytes:92}),/byte count/);assert.throws(()=>readInto(file,Buffer.alloc(100),{...r,bytes:100}),/byte count/);});
test('escaping metadata path refuses',()=>assert.throws(()=>readPinned(temp,{...r,path:'../tiny.f32'}),/Escaping/));
test('regular file cannot stand in for directory inventory',()=>assert.throws(()=>exactInventory(file,['tiny.f32']),/directory/));
const inv=path.join(temp,'inventory');fs.mkdirSync(inv);fs.writeFileSync(path.join(inv,'a.f32'),bytes);
test('absent and extra inputs refuse',()=>{assert.throws(()=>exactInventory(inv,[]),/inventory/);assert.throws(()=>exactInventory(inv,['a.f32','b.f32']),/inventory/);exactInventory(inv,['a.f32']);});
const links=path.join(temp,'hardlinked.f32');fs.linkSync(file,links);
test('hardlinked input refuses',()=>assert.throws(()=>plain(file),/hardlinked/));fs.unlinkSync(links);
const junction=path.join(temp,'linked-directory');fs.symlinkSync(inv,junction,process.platform==='win32'?'junction':'dir');
test('linked ancestor refuses',()=>assert.throws(()=>plain(path.join(junction,'a.f32')),/Linked/));
test('refused checks preserve original bytes',()=>assert.equal(sha(fs.readFileSync(file)),original));
const input=path.join(temp,'synthetic-input'),outputQA=path.join(temp,'output-qa');fs.mkdirSync(input);fs.mkdirSync(outputQA);
const marker=path.join(input,'keep.txt');fs.writeFileSync(marker,'immutable synthetic input\n');const markerHash=sha(fs.readFileSync(marker));
const outputLink=path.join(outputQA,'link');fs.symlinkSync(input,outputLink,process.platform==='win32'?'junction':'dir');
test('nested linked output refuses before output creation/input changes',()=>{
 assert.throws(()=>createOutputDirectory(outputQA,path.join(outputLink,'fresh')),/DIRECT child/);
 assert.deepEqual(fs.readdirSync(input),['keep.txt']);assert.equal(sha(fs.readFileSync(marker)),markerHash);assert.equal(fs.existsSync(path.join(input,'fresh')),false);
});
test('linked ancestor above missing QA refuses before any mkdir/write',()=>{
 const ancestor=path.join(temp,'qa-ancestor-link');fs.symlinkSync(input,ancestor,process.platform==='win32'?'junction':'dir');
 const qa=path.join(ancestor,'new-qa');assert.throws(()=>createOutputDirectory(qa,path.join(qa,'fresh')),/Nonplain output ancestor/);
 assert.deepEqual(fs.readdirSync(input),['keep.txt']);assert.equal(sha(fs.readFileSync(marker)),markerHash);assert.equal(fs.existsSync(path.join(input,'new-qa')),false);
});
test('plain fresh direct child succeeds and existing output refuses',()=>{
 const qa=path.join(temp,'plain-qa'),out=path.join(qa,'fresh');assert.equal(createOutputDirectory(qa,out),out);assert.equal(fs.lstatSync(out).isDirectory(),true);
 assert.throws(()=>createOutputDirectory(qa,out),/Fresh own-QA/);assert.deepEqual(fs.readdirSync(out),[]);
});
test('asymmetric x-fastest mapping and native vertical axis',()=>{
 const m=scanField(bytes,g,{profile:true});assert.equal(m.positive,3);assert.equal(m.integral,1.25);assert.deepEqual(m.support.positiveCentreBoundsBlender,{min:[-.5,-.5,-.5],max:[0,.5,1]});
 assert.deepEqual(m.profile.weightedQuantiles.map(x=>x.centreNativeY),[1,1,1,1]);assert.equal(m.profile.fractionsAbove.find(x=>x.height===.5).sumFFraction,.7);assert.equal(m.belowGroundPositive,1);
});
test('6-face connectivity is distinct from AABB/weighted extent',()=>{const c=connectivity(bytes,g.resolution);assert.equal(c.components,3);assert.equal(c.largestVoxels,1);assert.equal(c.largestComponentSumFFraction,.7);});
test('zero and any positive subnormal stay distinct',()=>{const b=Buffer.alloc(96);b.writeUInt32LE(1,0);const m=scanField(b,g,{profile:true});assert.equal(m.positive,1);assert.equal(m.profile.thresholds[0].voxels,1);assert.equal(m.profile.thresholds[1].voxels,0);});
test('negative zero retained as a bit observation',()=>{const b=Buffer.alloc(96);b.writeUInt32LE(0x80000000,0);const m=scanField(b,g);assert.equal(m.nonzero,0);assert.equal(m.nonzeroBits,1);assert.equal(m.negativeZero,1);});
test('nonfinite and negative flame profile refuse',()=>{const b=Buffer.alloc(96);b.writeFloatLE(NaN,0);assert.throws(()=>scanField(b,g),/Nonfinite/);b.writeFloatLE(-1,0);assert.throws(()=>scanField(b,g,{profile:true}),/nonnegative/);});
test('wrong endian bytes cannot satisfy LE byte/hash pin',()=>{const b=Buffer.alloc(96);b.writeFloatBE(1,0);const p=path.join(temp,'wrong-endian.f32');fs.writeFileSync(p,b);assert.throws(()=>readInto(p,Buffer.alloc(96),r),/SHA-256/);});
test('scan interruption preserves input buffer',()=>{let n=0;assert.throws(()=>scanField(bytes,g,{check:()=>{if(++n===2)throw Error('fixture STOP');}}),/fixture STOP/);assert.equal(sha(bytes),original);});
test('empty F has null percentiles instead of fake floor',()=>{const m=scanField(Buffer.alloc(96),g,{profile:true});assert(m.profile.weightedQuantiles.every(x=>x.centreNativeY===null));assert.equal(m.support.positiveCentreBoundsBlender,null);});
const makeManifest=()=>({sampleCount:193,samples:Array.from({length:193},(_,i)=>({frame:i+1,ageSeconds:i/30,resolution:g.resolution,voxelSize:g.voxelSize,scalarCentreOriginBlender:g.gridOrigin,domainBoundsBlender:g.domainBounds,contactBandHeight:g.contactBandHeight,channels:Object.fromEntries(['density','temperature','flame'].map(c=>[c,{path:`fields/${c}-${String(i+1).padStart(3,'0')}.f32`,bytes:96,sha256:'a'.repeat(64),min:0,max:1,nonzero:1,positive:1}])),support:{density:{},flame:{}}}))});
test('complete canonical 193/579 shape',()=>assert.equal(validateSamples(makeManifest(),g).length,579));
for(const [name,mutate]of[
 ['clock',m=>m.samples[96].ageSeconds=3.21],
 ['dimension',m=>m.samples[1].resolution=[3,2,4]],
 ['path escape',m=>m.samples[0].channels.flame.path='../flame-001.f32'],
 ['byte count',m=>m.samples[0].channels.flame.bytes=92],
 ['channel inventory',m=>m.samples[0].channels.heat=m.samples[0].channels.flame],
 ['missing sample',m=>m.samples.pop()],
 ['invalid range',m=>m.samples[0].channels.flame.max=NaN]
])test('manifest refuses '+name,()=>{const m=makeManifest();mutate(m);assert.throws(()=>validateSamples(m,g));});
const flame=Array.from({length:193},(_,i)=>({frame:i+1,age:i/30,min:0,max:i>0&&i<96?1:0,nonzero:i>0&&i<96?1:0,positive:i>0&&i<96?1:0,integral:i>0&&i<96?1:0,belowGroundPositive:0,boundaryPositive:0}));
Object.assign(flame[96],{max:.3547821044921875,nonzero:55,positive:55,integral:.0002870405151671375});
test('known frame97 failure stays failed and frame98 stays zero',()=>{const t=terminalReport(flame,true);assert.equal(t.rawGatesPassed,false);assert.deepEqual(t.failures,['raw flame not exactly zero at/after3.2 frame97']);assert.equal(t.lastPositiveAge,3.2);assert.equal(t.requiredSamples[3].nonzero,0);});
test('integral summation tolerance never tolerates changed zero/counts',()=>{const a=terminalReport(flame,true),b=structuredClone(a);b.peakIntegral.value*=1+5e-13;compareTerminal(a,b);b.requiredSamples[3].integral=1e-40;assert.throws(()=>compareTerminal(a,b),/row mismatch/);});
test('CLI rejects relative output/unknown flags/extra args',()=>{assert.equal(parseArgs(['--output',temp]),temp);for(const a of[['--output','relative'],['--stage',temp],['--output',temp,'--retry']])assert.throws(()=>parseArgs(a));});
assert.equal(sha(fs.readFileSync(file)),original);
const spec=JSON.parse(fs.readFileSync(path.join(here,'inputs.json'))),prov=JSON.parse(fs.readFileSync(path.join(here,'provenance.json')));
test('frozen source/control identities and descriptive terminology',()=>{assert.equal(spec.manifest.sha256,'1a3bb8d2af92f6a9c7017ad37a49b76977baa227d94ae3a0cded781229a2c77e');assert.equal(spec.validation.sha256,'8da43a63ab134deeadb3e1791baaf4bd3762c7be19ac9670167a58b68f2379f4');assert.equal(spec.sourceSnapshots.length,9);assert.equal(Object.keys(spec.sourcePins).length,9);assert.equal(prov.adaptedFrom.length,3);});
console.log(JSON.stringify({status:'pure-fixtures-pass',checks:passed.length,passed,fixtureDirectory:temp,originalInputSha256:original,afterSha256:sha(fs.readFileSync(file)),actualDatasetRead:false,authoringOrJobOrBlender:false},null,2));
