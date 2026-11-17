// Independent saved-data checks. No native/world/compiler/provider execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),hash=b=>createHash('sha256').update(b).digest('hex');
const result=JSON.parse(fs.readFileSync(path.join(here,'grouping.json'))),pins=JSON.parse(fs.readFileSync(path.join(here,'input-pins.json')));
for(const p of pins.files){const raw=fs.readFileSync(path.join(root,p.path));assert.equal(hash(p.mode==='raw'?raw:raw.toString('utf8').replace(/\r\n/g,'\n')),p.sha256,p.path);}
const saved=JSON.parse(fs.readFileSync(path.join(root,result.input.path))).blocks[0],native=saved.identity.ownerStates[0].native,ids=new Map(native.map((n,i)=>[n.id,i]));
assert.equal(native.length,4132);assert.equal(saved.edges.length,33558);
const reports=[];
for(const c of result.cases){
  const n=c.sizeMetres/.5,map=new Map(c.regions.map(g=>[g.key,[]]));
  native.forEach((b,i)=>{const cell=b.id.slice(b.id.lastIndexOf('@')+1).split(',').map(Number),key=[Math.floor(cell[0]/n),cell[1],Math.floor(cell[2]/n)].join(',');assert.ok(map.has(key));map.get(key).push(i);});
  for(const g of c.regions){assert.equal(map.get(g.key).length,g.nativeFragments);assert.equal(hash(JSON.stringify(map.get(g.key).map(i=>native[i].id))),g.orderedOriginalIdsSha256);}
  assert.equal(c.regions.reduce((s,g)=>s+g.nativeFragments,0),native.length);assert.equal(c.internalDirectedEdges+c.crossRegionDirectedEdges,saved.edges.length);
  const lo=c.centreRange.min,hi=c.centreRange.max,nx=hi[0]-lo[0]+1,nz=hi[2]-lo[2]+1,total=nx*nz*(hi[1]-lo[1]+1),at=(x,y,z)=>((y-lo[1])*nz+z-lo[2])*nx+x-lo[0];
  // Inverse enumeration: each region contributes to its nearby snapped centres.
  // This differs from the producer's centre-first count accumulation.
  for(const kind of ['tightBounds','cellBounds']){
    const counts=new Uint32Array(total),regions=new Uint16Array(total);
    for(const g of c.regions){const b=g[kind],r=result.radius.actual;
      const min=b.min.map((v,i)=>Math.max(lo[i],Math.ceil((v-r-result.grid.origin[i])/result.grid.pitch[i]-.5)-1)),max=b.max.map((v,i)=>Math.min(hi[i],Math.floor((v+r-result.grid.origin[i])/result.grid.pitch[i]-.5)+1));
      for(let y=min[1];y<=max[1];y++)for(let z=min[2];z<=max[2];z++)for(let x=min[0];x<=max[0];x++){const cell=[x,y,z],p=cell.map((v,i)=>result.grid.origin[i]+(v+.5)*result.grid.pitch[i]);if(Math.hypot(...p.map((v,i)=>Math.max(b.min[i]-v,v-b.max[i],0)))>r)continue;const index=at(x,y,z);counts[index]+=g.nativeFragments;regions[index]++;}
    }
    let maxCount=0,maxRegions=0;for(let i=0;i<total;i++){maxCount=Math.max(maxCount,counts[i]);maxRegions=Math.max(maxRegions,regions[i]);}
    const expected=kind==='tightBounds'?c.frontier.tight:c.frontier.conservative;assert.equal(maxCount,expected.maxima.fragments.nativeFragments);assert.equal(maxRegions,expected.maxima.regions.regions);
    for(const maximum of Object.values(expected.maxima)){const selected=new Set(maximum.regionKeys),inside=new Set([...map].filter(([k])=>selected.has(k)).flatMap(([,v])=>v));let internal=0,cut=0,incident=0;for(const [a,b]of saved.edges){const aa=inside.has(ids.get(a)),bb=inside.has(ids.get(b));if(aa&&bb)internal++;if(aa!==bb)cut++;if(aa||bb)incident++;}assert.equal(inside.size,maximum.nativeFragments);assert.equal(internal,maximum.internalDirectedEdges);assert.equal(cut,maximum.crossCutDirectedEdges);assert.equal(incident,maximum.incidentDirectedEdges);}
    reports.push({horizontalMetres:c.sizeMetres,bounds:kind,independentlyEnumeratedCentres:total,maxNativeFragments:maxCount,maxNonemptyRegions:maxRegions,exactWitnessEdgeRecounts:true});
  }
}
const historical=[];
for(const name of ['support-large-proof-v1','support-large-proof-v2']){
  const p='docs/engineering/shared-maps/'+name+'/',manifest=JSON.parse(fs.readFileSync(path.join(root,p,'manifest.json')));
  for(const f of manifest.files)assert.equal(hash(fs.readFileSync(path.join(root,f.path))),f.sha256,f.path);historical.push({archive:name,rawFiles:manifest.files.length,manifestSha256:hash(fs.readFileSync(path.join(root,p,'manifest.json')))});
}
const out={version:1,authority:result.authority,passed:true,scope:'Saved-data grouping and source/reference integrity only',reports,historical,noNativeCompilation:true,noWorldTrialOrTick:true,noTimingObservation:true,noSourceExportOrRuntimeChange:true};
fs.writeFileSync(path.join(here,'verification.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({passed:true,checks:reports.length,savedFragments:4132,directedEdges:33558,sourcePins:pins.files.length,historicalRawFiles:historical.reduce((n,h)=>n+h.rawFiles,0),nativeCompilations:0,worldSteps:0,measurement:false}));
