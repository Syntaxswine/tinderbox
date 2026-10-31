import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {voxelIndex,scalarCentre,blenderToGame,gameToBlender,scalarBoundsToGame} from '../../../../assets/art/fire-realism/fluid-contact/space.js';
import {buildSupportPrisms,prismContains,rayPrismInterval,prismGeometry,convexHull,prismOwnsHeight} from '../../../../assets/art/fire-realism/fluid-contact/support.js';
import {readF32LE,positiveAudit} from './read-fields.mjs';
const bits=Buffer.alloc(12);bits.writeUInt32LE(0x80000000,0);bits.writeUInt32LE(1,4);bits.writeFloatLE(.12345,8);const decoded=readF32LE(bits,3);assert(Object.is(decoded[0],-0));assert(decoded[1]>0);assert.equal(decoded[2],Math.fround(.12345));assert.throws(()=>readF32LE(bits,2),/extent/);
const grid={resolution:[3,4,5],origin:[-1.1,2.7,.31],spacing:[.1,.2,.3]},count=60;
assert.equal(voxelIndex([2,1,3],grid),41);assert.deepEqual(scalarCentre(41,grid),[-.9000000000000001,2.9000000000000004,1.21]);
const known=[.71,-.23,1.49],native=blenderToGame(known);assert.deepEqual(native,[6.21,1.49,8.73]);gameToBlender(native).forEach((v,i)=>assert(Math.abs(v-known[i])<1e-12));
assert.deepEqual(scalarBoundsToGame({min:[-1,-2,0],max:[3,4,5]}),{min:[4.5,0,4.5],max:[8.5,5,10.5]});
const first={density:new Float32Array(count),flame:new Float32Array(count)},next={density:new Float32Array(count),flame:new Float32Array(count)};
const marks=[{ijk:[0,1,0],channel:'flame',frame:first,value:Math.fround(1e-40)},{ijk:[2,3,4],channel:'density',frame:next,value:.7},{ijk:[1,0,2],channel:'flame',frame:next,value:.12345}];
for(const m of marks)m.frame[m.channel][voxelIndex(m.ijk,grid)]=m.value;
const faintAudit=positiveAudit(first.flame,grid,2);assert.equal(faintAudit.positive,1);assert(faintAudit.boundaryContact);assert.equal(faintAudit.threshold,0);
const original=[...Object.values(first),...Object.values(next)].map(a=>Buffer.from(a.buffer).toString('hex')),prisms=buildSupportPrisms(first,next,grid);
assert.deepEqual([...Object.values(first),...Object.values(next)].map(a=>Buffer.from(a.buffer).toString('hex')),original);
for(const m of marks){const centre=scalarCentre(voxelIndex(m.ijk,grid),grid);for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
  const p=centre.map((v,i)=>v+[sx,sy,sz][i]*grid.spacing[i]);assert(prisms.some(prism=>prismContains(prism,p,{halfOpen:false,tolerance:1e-9})),'Missing current/next one-voxel halo landmark');
}}
assert(prisms.some(p=>p.band===-1),'Faint boundary halo was cropped');assert(prisms.some(p=>p.band===4),'Far-edge next-frame halo was lost');
assert.deepEqual(convexHull([[0,0],[.5,0],[1,0],[1,1],[0,1],[0,0]]),[[0,0],[1,0],[1,1],[0,1]]);
const columnGrid={resolution:[1,1,3],origin:[0,0,.5],spacing:[1,1,1]},column={density:Float32Array.from([1,1,1]),flame:Float32Array.from([1,1,1])},bands=buildSupportPrisms(column,column,columnGrid);
const down=bands.map(p=>rayPrismInterval(p,[0,0,5],[0,0,-1])).filter(Boolean).sort((a,b)=>a[0]-b[0]);for(let i=1;i<down.length;i++)assert(down[i][0]>=down[i-1][1]-1e-12,'Ray intervals overlap');assert.equal(down.reduce((n,p)=>n+p[1]-p[0],0),4);
for(let i=1;i<bands.length;i++)assert.equal(bands[i-1].upper,bands[i].lower,'Adjacent heights must use identical scalar-index endpoints');
const boundary=bands[1].lower;assert.equal(bands.filter(p=>prismOwnsHeight(p,boundary-5e-11)).length,1);assert(!prismOwnsHeight(bands[1],boundary-5e-11));assert(prismContains(bands[1],[0,0,boundary-5e-11],{halfOpen:false}));
const baseInterval=rayPrismInterval(bands[1],[0,0,5],[0,0,-1]);for(const scale of [1e-15,1e15]){const scaled=rayPrismInterval(bands[1],[0,0,5],[0,0,-scale]);assert(scaled);scaled.forEach((v,i)=>assert(Math.abs(v*scale-baseInterval[i])<1e-12,'Ray-scale invariance failed'));}
const horizontal=bands.map(p=>rayPrismInterval(p,[-2,0,1.5],[1,0,0])).filter(Boolean);assert.equal(horizontal.length,1,'Half-open band boundary integrated twice');
for(const p of prisms){const mesh=prismGeometry(p);assert(mesh.vertices.length>=18&&mesh.indices.length>=24);assert(mesh.indices.every(i=>i<mesh.vertices.length/3));}
const settings=JSON.parse(fs.readFileSync(new URL('./settings.json',import.meta.url),'utf8'));assert.equal(settings.simulation.lastFrame,193);assert.equal((193-1)/30,6.4);assert.equal(settings.limits.automaticRebakes,0);assert.equal(settings.limits.wallSeconds,5400);
const frozen='21495349729056f41a0ae5ebe96da123d8b0e945';for(const folder of ['assets/art/fire-realism','workbenches/art/fire-realism/mantaflow-probe']){
  const files=execFileSync('git',['ls-tree','-r','--name-only',frozen,'--',folder],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  for(const file of files){const actual=fs.readFileSync(file),expected=execFileSync('git',['show',frozen+':'+file],{maxBuffer:1024*1024});const canonical=b=>Buffer.from(b.filter((v,i)=>v!==13||b[i+1]!==10));const equal=file==='assets/art/fire-realism/contact-pilot/.gitattributes'?canonical(actual).equals(canonical(expected)):actual.equals(expected);assert(equal,file+' altered outside additive Stage2');}
}
console.log('PASS: asymmetric scalar/axis landmarks; faint/current-next/one-voxel halo containment; convex nonoverlapping ray intervals; half-open boundary; useful hull vertices; unchanged R09/cone/probe. No Blender or visual approval.');
