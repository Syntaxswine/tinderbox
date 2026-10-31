// Source/units calibration only. This does NOT render or approve GPU pixels.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {prepareGroundSources, sampleGroundSources, groundEdgeCoverage, groundDomainInterval, GROUND_SOURCE_SIDE, GROUND_DOMAIN_HEIGHT} from '../../../assets/art/fire-realism/ground-field.js';
import {diagnosticSnapshot, applyFrozenCamera} from './diagnostic-data.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const dataBytes = fs.readFileSync(new URL('./fixtures/frozen-match-diagnostic.json', import.meta.url)), data = JSON.parse(dataBytes);
const clamp = x => Math.max(0, Math.min(1, x)), mix = (a,b,t) => a+(b-a)*t;
function smooth(a,b,x) {const t=clamp((x-a)/(b-a)); return t*t*(3-2*t);}
const fract = x => x-Math.floor(x);
function h3(x,y,z) {return fract(Math.sin(x*39.3467+y*11.1351+z*83.1559)*47453.5453);}
function n3(x,y,z) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=smooth(0,1,fract(x)),fy=smooth(0,1,fract(y)),fz=smooth(0,1,fract(z));
  const plane = dz => mix(mix(h3(ix,iy,iz+dz),h3(ix+1,iy,iz+dz),fx),mix(h3(ix,iy+1,iz+dz),h3(ix+1,iy+1,iz+dz),fx),fy);
  return mix(plane(0),plane(1),fz);
}
function fb(x,y,z) {return n3(x,y,z)*.57+n3(x*2.07+13.7,y*2.07+13.7,z*2.07+13.7)*.28+n3(x*4.19-7.4,y*4.19-7.4,z*4.19-7.4)*.15;}
function heightAt(x,z,t,s) {
  if(s[3]<=.5)return 0;
  const macro=fb(x*.73+3.1,z*.73+11.7,t*.29-5.2),secondary=n3(x*1.72,z*1.72,t*.53),licking=fb(x*4.7,z*4.7,t*1.35)-.5;
  return (.30+s[0]*mix(.94,1.2,s[1]))*(.48+macro+secondary*.22+licking*.16)*Math.pow(groundEdgeCoverage(s[3]),.75);
}
function contact09(h,sheet,pocket) {return (1-smooth(.025,.24,h))*(.035+.36*sheet)*(.35+.65*pocket);}
function densities(x,y,z,t,field,storage,activeLocations) {
  if(!activeLocations.has(`${Math.floor(x/.5)}:${Math.floor(z/.5)}`))return [0,0];
  const s=sampleGroundSources(field,storage,x,z),edge=groundEdgeCoverage(s[3]),h=y-.018;
  if(edge<=0||h<0)return [0,0];
  const height=heightAt(x,z,t,s);if(h>=height)return [0,0];
  const lx=(n3(x*.73+17.3,z*.73+17.3,t*.29+17.3)-.5)*h*.58,lz=(n3(x*.73-8.1,z*.73-8.1,t*.29-8.1)-.5)*h*.58;
  let fx=(x-lx)*3.7,fy=h*3.1-t*2.85,fz=(z-lz)*3.7;
  const nx=n3(fx*.38+3.7,fy*.38+3.7,fz*.38+3.7),ny=n3(fx*.38-9.4,fy*.38-9.4,fz*.38-9.4),nz=n3(fx*.38+18.6,fy*.38+18.6,fz*.38+18.6);
  fx+=nx*.9;fy+=ny*.9;fz+=nz*.9;
  const sheet=1-smooth(.018,.065,Math.abs(fb(fx,fy,fz)-.51)),pocket=smooth(.26,.64,fb(x*.92+7.1,h*.84-t*.77-2.3,z*.92+11.8));
  const envelope=1-smooth(height*.80,height,h),coverage=mix(.45,pocket,smooth(.035,Math.max(.10,Math.min(.50,height*.55)),h));
  const oldContact=Math.exp(-h*14)*(.020+.12*sheet),newContact=contact09(h,sheet,pocket),common=sheet*coverage*.98*envelope,factor=s[0]*Math.pow(edge,.55);
  return [(common+oldContact)*factor,(common+newContact)*factor];
}
function summarize(values) {
  const sorted=[...values].sort((a,b)=>a-b),q=f=>sorted[Math.floor((sorted.length-1)*f)]||0;
  return {rays:values.length,mean:values.reduce((a,b)=>a+b,0)/(values.length||1),p25:q(.25),p50:q(.5),p75:q(.75),p90:q(.9),fractionBelowPoint02:values.filter(x=>x<.02).length/(values.length||1),fractionAbovePoint60:values.filter(x=>x>.6).length/(values.length||1)};
}
const report={version:1,kind:'CPU double-precision source ray-integral calibration; NOT actual WebGL readback or image evidence',qualityAcceptance:false,performanceAcceptance:false,
  sourceCommit:data.sourceCommit,artistControlCommit:data.artistCommit,fixtureDataRawSha256:hash(dataBytes),nativeGridMetres:.5,inputPhases:[15,30,60,120],
  methods:{noise:'Same h3/n3/fb formula evaluated in JS double precision. GPU float/fast-sin hash rounding can differ; this is NOT phase-exact GPU noise or shader evaluation.',support:'Actual four-cell native source coordinates/intensities/clocks and pinned camera. Exact non-overlapping AABB interval union, native live mask, zero outer occupancy, common height/sheets/pockets. Integrates continuous density at128 midpoint samples/domain; actual deformed shell entry shifts quadrature phase.',output:'Raw ray opacity before smoke, player legibility and opaque scene occlusion. No RGB image is synthesized. These numerical opacity distributions cannot approve readability or realism.',calibration:'7.4/m original,22.2/m prototype (roughly triple optical depth, NOT proven equivalent to three old overlapping local envelopes). R09 lower contact has smooth falloff to exact zero at0.24m;1.65 emission ceiling and32 renderer samples unchanged.'},
  sourceHashes:Object.fromEntries(['ground-field.js','shaders.js'].map(name=>[name,{control:hash(fs.readFileSync(new URL('./control-08/'+name,import.meta.url))),current:hash(fs.readFileSync(new URL('../../../assets/art/fire-realism/'+name,import.meta.url)))}])),cases:[]};
for(const phase of [15,30,60,120])for(const view of ['isometric','oblique']){
  const snapshot=diagnosticSnapshot(data,phase),cells=snapshot.cells.filter(c=>c.phase==='burning');assert.equal(cells.length,4);for(const c of cells){assert.equal(c.intensity,1);assert.ok(c.surfaceFuel>0);}
  const storage=new Float32Array(GROUND_SOURCE_SIDE**2*4),sources=cells.map(c=>({...c,elevation:c.elevation||0,gas:c.depositedFuel>0})),field=prepareGroundSources(sources,storage);
  const active=new Set(cells.map(c=>`${Math.floor(c.x/.5)}:${Math.floor(c.y/.5)}`)),camera=new T.OrthographicCamera();applyFrozenCamera(camera,data.cameras[view]);
  const forward=camera.getWorldDirection(new T.Vector3()),right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),center=new T.Vector3(5.5,.018,8.5),groups={whole:[[],[],[]],lower:[[],[],[]],upper:[[],[],[]]};
  for(let row=0;row<17;row++)for(let col=0;col<17;col++){
    const u=-.85+1.7*col/16,v=-.12+1.5*row/16,origin=center.clone().addScaledVector(right,u).addScaledVector(up,v).addScaledVector(forward,-10),o=origin.toArray(),d=forward.toArray();
    const intervals=sources.map(c=>groundDomainInterval(o,d,[c.x,.018,c.y],.5,GROUND_DOMAIN_HEIGHT*.85)).filter(Boolean).sort((a,b)=>a[0]-b[0]);if(!intervals.length)continue;
    for(let i=1;i<intervals.length;i++)assert.ok(intervals[i][0]>=intervals[i-1][1]-1e-8,'No duplicated optical domain');
    const integral=[0,0];for(const[a,b]of intervals){const ds=(b-a)/128;for(let j=0;j<128;j++){const p=origin.clone().addScaledVector(forward,a+(j+.5)*ds),den=densities(p.x,p.y,p.z,snapshot.clocks.world,field,storage,active);integral[0]+=den[0]*ds;integral[1]+=den[1]*ds;}}
    const values=[1-Math.exp(-integral[0]*7.4),1-Math.exp(-integral[0]*22.2),1-Math.exp(-integral[1]*22.2)],part=v<.5?'lower':'upper';values.forEach((x,i)=>{groups.whole[i].push(x);groups[part][i].push(x);});
  }
  const variants=['control08','sigma22Only','calibrated09'];report.cases.push({phase,view,worldTime:snapshot.clocks.world,sourceCells:cells.map(({id,intensity,surfaceFuel})=>({id,intensity,surfaceFuel})),statistics:Object.fromEntries(Object.entries(groups).map(([part,a])=>[part,Object.fromEntries(a.map((v,i)=>[variants[i],summarize(v)]))]))});
}
for(const sheet of [0,.25,1])for(const pocket of [0,.5,1]){assert.equal(contact09(.24,sheet,pocket),0);assert.equal(contact09(.50,sheet,pocket),0);assert.ok(contact09(.24-1e-6,sheet,pocket)<1e-9);}
// Beer-Lambert is independent of physical interval partition, not sample count.
const length=.31,den=.4,k=22.2,expected=1-Math.exp(-length*den*k);let a=0;for(let i=0;i<32;i++){const s=1-Math.exp(-length/32*den*k);a+=(1-a)*s;}assert.ok(Math.abs(a-expected)<1e-12);
fs.writeFileSync(new URL('../../../docs/art/fire-realism/calibration-09-ray-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({kind:report.kind,cases:report.cases.map(c=>({phase:c.phase,view:c.view,lowerMedian:Object.fromEntries(Object.entries(c.statistics.lower).map(([k,v])=>[k,v.p50])),upperFractionBelowPoint02:c.statistics.upper.calibrated09.fractionBelowPoint02})),actualWebGL:false},null,2));
