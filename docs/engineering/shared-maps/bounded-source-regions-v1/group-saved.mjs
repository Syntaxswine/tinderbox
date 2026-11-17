// Saved JSON/source text only. No native/compiler/world/render imports or timing.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(path.join(root,p));
const payloadPath='docs/engineering/shared-maps/support-large-proof-v2/reference-blocks.json',raw=read(payloadPath);
assert.equal(hash(raw),'bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418');
const payload=JSON.parse(raw),block=payload.blocks[0],owner=block.identity.ownerStates[0],nodes=owner.native,edges=block.edges,grid=block.identity.grid,carrier=owner.carrier;
assert.equal(owner.id,'new-york::carrier/roof/clerestory');assert.equal(nodes.length,4132);assert.equal(edges.length,33558);assert.deepEqual(grid,{origin:[0,0,0],pitch:[.5,1.06,.5]});
const activationText=read('src/simulation/source-activation.js').toString('utf8').replace(/\r\n/g,'\n'),rulesText=read('workbenches/furnished-house/simulation.js').toString('utf8').replace(/\r\n/g,'\n');
assert.ok(activationText.includes('radius=trial.rules.radiantRange+Math.hypot(...trial.scene.pitch)/2'));
assert.ok(activationText.includes('const centre=trial.scene.position(coordinates)'));
assert.ok(rulesText.includes('radiantRange:8,'));
assert.ok(rulesText.includes('r={...RULES,...overrides}'));
const thermalText=read('src/simulation/scene-thermal.js').toString('utf8'),trialCall=thermalText.split('trial=createTrial(')[1].split(');')[0];assert.ok(trialCall&&!trialCall.includes('rules:'));
const radius=8+Math.hypot(...grid.pitch)/2,idIndex=new Map(nodes.map((n,i)=>[n.id,i])),pairs=edges.map(([a,b])=>[idIndex.get(a),idIndex.get(b)]);
assert.ok(pairs.every(p=>p.every(Number.isInteger)));assert.equal(new Set(edges.map(e=>JSON.stringify(e))).size,edges.length);
const edgeSet=new Set(edges.map(e=>JSON.stringify(e)));assert.ok(edges.every(([a,b])=>edgeSet.has(JSON.stringify([b,a]))));
const cells=nodes.map(n=>{const m=n.id.match(/@(-?\d+),(-?\d+),(-?\d+)$/);assert.ok(m&&n.id.startsWith(n.sourceSurfaceId+'@'),n.id);return m.slice(1).map(Number);});
const cellRanges=grid.pitch.map((_,i)=>({min:Math.min(...cells.map(c=>c[i])),max:Math.max(...cells.map(c=>c[i]))}));
function boxUnion(list){return {min:[0,1,2].map(i=>Math.min(...list.map(b=>b.min[i]))),max:[0,1,2].map(i=>Math.max(...list.map(b=>b.max[i])))};}
function dsu(n){const p=Array.from({length:n},(_,i)=>i);return {find(i){while(p[i]!==i){p[i]=p[p[i]];i=p[i];}return i;},join(a,b){const x=this.find(a),y=this.find(b);if(x!==y)p[Math.max(x,y)]=Math.min(x,y);}};}
const full=dsu(nodes.length);for(const [a,b]of pairs)full.join(a,b);
const fullComponents=new Set(nodes.map((_,i)=>full.find(i))).size;
function analyze(size){
  const span=size/grid.pitch[0];assert.ok(Number.isInteger(span)&&grid.pitch[0]===grid.pitch[2]);
  const byKey=new Map(),keys=cells.map(c=>[Math.floor(c[0]/span),c[1],Math.floor(c[2]/span)].join(','));
  keys.forEach((key,i)=>{if(!byKey.has(key))byKey.set(key,{key,indices:[]});byKey.get(key).indices.push(i);});
  const groups=[...byKey.values()].sort((a,b)=>{const x=a.key.split(',').map(Number),y=b.key.split(',').map(Number);return x[1]-y[1]||x[2]-y[2]||x[0]-y[0];});
  const groupByNode=new Int32Array(nodes.length),local=dsu(nodes.length);
  groups.forEach((g,index)=>{g.index=index;g.coordinate=g.key.split(',').map(Number);g.indices.forEach(i=>groupByNode[i]=index);g.tightBounds=boxUnion(g.indices.map(i=>nodes[i].bounds));const [x,y,z]=g.coordinate,lo=[x*span,y,z*span],hi=[(x+1)*span-1,y,(z+1)*span-1];g.cellRange={min:lo,max:hi};
    g.cellBounds={min:lo.map((c,i)=>Math.max(carrier.bounds.min[i],grid.origin[i]+c*grid.pitch[i]-1e-7)),max:hi.map((c,i)=>Math.min(carrier.bounds.max[i],grid.origin[i]+(c+1)*grid.pitch[i]+1e-7))};
    assert.ok(g.indices.every(n=>nodes[n].bounds.min.every((v,i)=>v>=g.cellBounds.min[i]-1e-9)&&nodes[n].bounds.max.every((v,i)=>v<=g.cellBounds.max[i]+1e-9)));
    g.internalRanks=[];g.cross=new Map();g.ports=new Set();g.outgoing=0;});
  const crossRanks=[];
  pairs.forEach(([a,b],rank)=>{const ga=groups[groupByNode[a]],gb=groups[groupByNode[b]];ga.outgoing++;if(ga===gb){ga.internalRanks.push(rank);local.join(a,b);}else{crossRanks.push(rank);ga.cross.set(gb.index,(ga.cross.get(gb.index)||0)+1);ga.ports.add(a);gb.ports.add(b);}});
  const componentIds=new Map();for(let i=0;i<nodes.length;i++)if(!componentIds.has(local.find(i)))componentIds.set(local.find(i),componentIds.size);
  const quotient=dsu(componentIds.size);for(const [a,b]of pairs)if(groupByNode[a]!==groupByNode[b])quotient.join(componentIds.get(local.find(a)),componentIds.get(local.find(b)));
  assert.equal(new Set([...componentIds.values()].map(i=>quotient.find(i))).size,fullComponents);
  const rebuilt=[...groups.flatMap(g=>g.internalRanks),...crossRanks].sort((a,b)=>a-b);assert.deepEqual(rebuilt,edges.map((_,i)=>i));
  assert.equal(hash(JSON.stringify(rebuilt.map(i=>edges[i]))),hash(JSON.stringify(edges)));
  const regionRows=groups.map(g=>({key:g.key,nativeFragments:g.indices.length,nativeY:g.coordinate[1],cellRange:g.cellRange,tightBounds:g.tightBounds,cellBounds:g.cellBounds,internalDirectedEdges:g.internalRanks.length,crossOutgoingDirectedEdges:g.outgoing-g.internalRanks.length,portFragments:g.ports.size,internalComponents:new Set(g.indices.map(i=>local.find(i))).size,orderedOriginalIdsSha256:hash(JSON.stringify(g.indices.map(i=>nodes[i].id)))}));
  // Exhaust all snapped native-cell centres whose sphere could reach the owner.
  // One extra cell around each bound avoids a floating-point range fence miss.
  const centreRange={min:carrier.bounds.min.map((v,i)=>Math.ceil((v-radius-grid.origin[i])/grid.pitch[i]-.5)-1),max:carrier.bounds.max.map((v,i)=>Math.floor((v+radius-grid.origin[i])/grid.pitch[i]-.5)+1)};
  const centreCount=centreRange.min.reduce((n,v,i)=>n*(centreRange.max[i]-v+1),1);assert.ok(centreCount<200000);
  function frontier(boundsKind){
    const chosen=new Uint8Array(groups.length),selected=[],maxima={fragments:null,regions:null,incidentDirectedEdges:null},touchedSets=new Set();let tested=0,nonempty=0;
    const record=(centre,fragmentCount,internal,outgoing)=>({centreCell:[...centre],centre:centre.map((v,i)=>grid.origin[i]+(v+.5)*grid.pitch[i]),regions:selected.length,nativeFragments:fragmentCount,internalDirectedEdges:internal,crossCutDirectedEdges:2*(outgoing-internal),incidentDirectedEdges:2*outgoing-internal,regionKeys:selected.map(i=>groups[i].key)});
    for(let y=centreRange.min[1];y<=centreRange.max[1];y++)for(let z=centreRange.min[2];z<=centreRange.max[2];z++)for(let x=centreRange.min[0];x<=centreRange.max[0];x++){
      tested++;const c=[x,y,z],p=c.map((v,i)=>grid.origin[i]+(v+.5)*grid.pitch[i]);chosen.fill(0);selected.length=0;let count=0,internal=0,outgoing=0;
      for(const g of groups){const b=g[boundsKind],dx=Math.max(b.min[0]-p[0],p[0]-b.max[0],0),dy=Math.max(b.min[1]-p[1],p[1]-b.max[1],0),dz=Math.max(b.min[2]-p[2],p[2]-b.max[2],0);if(Math.hypot(dx,dy,dz)>radius)continue;chosen[g.index]=1;selected.push(g.index);count+=g.indices.length;internal+=g.internalRanks.length;outgoing+=g.outgoing;}
      if(!selected.length)continue;nonempty++;
      for(const i of selected)for(const [j,n]of groups[i].cross)if(chosen[j])internal+=n;
      const incident=2*outgoing-internal;
      if(!maxima.fragments||count>maxima.fragments.nativeFragments)maxima.fragments=record(c,count,internal,outgoing);
      if(!maxima.regions||selected.length>maxima.regions.regions)maxima.regions=record(c,count,internal,outgoing);
      if(!maxima.incidentDirectedEdges||incident>maxima.incidentDirectedEdges.incidentDirectedEdges)maxima.incidentDirectedEdges=record(c,count,internal,outgoing);
    }
    assert.equal(tested,centreCount);
    // Independent exact saved-edge recount at each reported extremum.
    for(const result of Object.values(maxima)){const set=new Set(result.regionKeys),included=i=>set.has(keys[i]);let inside=0,cut=0,incident=0;for(const [a,b]of pairs){const aa=included(a),bb=included(b);if(aa&&bb)inside++;if(aa!==bb)cut++;if(aa||bb)incident++;}assert.equal(result.internalDirectedEdges,inside);assert.equal(result.crossCutDirectedEdges,cut);assert.equal(result.incidentDirectedEdges,incident);assert.equal(result.nativeFragments,groups.filter(g=>set.has(g.key)).reduce((n,g)=>n+g.indices.length,0));}
    return {boundsKind,testedCentres:tested,centresWithAnyRegion:nonempty,maxima};
  }
  const tight=frontier('tightBounds'),conservative=frontier('cellBounds');
  assert.ok(conservative.maxima.fragments.nativeFragments>=tight.maxima.fragments.nativeFragments);
  const possibleRegionCells=[Math.floor(cellRanges[0].max/span)-Math.floor(cellRanges[0].min/span)+1,cellRanges[1].max-cellRanges[1].min+1,Math.floor(cellRanges[2].max/span)-Math.floor(cellRanges[2].min/span)+1].reduce((a,b)=>a*b,1);
  // Potential descriptors include cells with no saved exterior fragment.
  // They cannot be discarded on that evidence alone for this closed solid.
  const catalog=[];
  for(let y=cellRanges[1].min;y<=cellRanges[1].max;y++)for(let z=Math.floor(cellRanges[2].min/span);z<=Math.floor(cellRanges[2].max/span);z++)for(let x=Math.floor(cellRanges[0].min/span);x<=Math.floor(cellRanges[0].max/span);x++){
    const key=[x,y,z].join(','),existing=byKey.get(key),lo=[x*span,y,z*span],hi=[(x+1)*span-1,y,(z+1)*span-1];
    catalog.push({key,nativeFragments:existing?.indices.length||0,bounds:{min:lo.map((c,i)=>Math.max(carrier.bounds.min[i],grid.origin[i]+c*grid.pitch[i]-1e-7)),max:hi.map((c,i)=>Math.min(carrier.bounds.max[i],grid.origin[i]+(c+1)*grid.pitch[i]+1e-7))}});
  }
  assert.equal(catalog.length,possibleRegionCells);
  let maxCandidates=null,catalogMaxFragments=0;
  for(let y=centreRange.min[1];y<=centreRange.max[1];y++)for(let z=centreRange.min[2];z<=centreRange.max[2];z++)for(let x=centreRange.min[0];x<=centreRange.max[0];x++){
    const c=[x,y,z],p=c.map((v,i)=>grid.origin[i]+(v+.5)*grid.pitch[i]);let candidates=0,occupied=0,fragments=0;
    for(const g of catalog){const b=g.bounds;if(Math.hypot(...p.map((v,i)=>Math.max(b.min[i]-v,v-b.max[i],0)))>radius)continue;candidates++;fragments+=g.nativeFragments;if(g.nativeFragments)occupied++;}
    catalogMaxFragments=Math.max(catalogMaxFragments,fragments);
    if(!maxCandidates||candidates>maxCandidates.candidateDescriptors)maxCandidates={centreCell:c,centre:p,candidateDescriptors:candidates,nonemptyRegions:occupied,nativeFragments:fragments};
  }
  assert.equal(catalogMaxFragments,conservative.maxima.fragments.nativeFragments);
  const pilotContact=payload.blocks[3],contactRegionCounts=new Map();let roofEndpointPairs=0;for(const edge of pilotContact.edges)for(const id of edge)if(idIndex.has(id)){const key=keys[idIndex.get(id)];contactRegionCounts.set(key,(contactRegionCounts.get(key)||0)+1);roofEndpointPairs++;}
  return {sizeMetres:size,horizontalNativeCells:span,verticalNativeCells:1,verticalMetres:grid.pitch[1],regionCount:groups.length,possibleBoundingGridRegions:possibleRegionCells,noSavedExteriorRegions:possibleRegionCells-groups.length,maxRegionFragments:Math.max(...regionRows.map(g=>g.nativeFragments)),maxInternalComponents:Math.max(...regionRows.map(g=>g.internalComponents)),sumColdComponentNodes:componentIds.size,fullGraphComponents:fullComponents,quotientGraphComponents:fullComponents,crossRegionDirectedEdges:crossRanks.length,crossRegionUndirectedEdges:crossRanks.length/2,internalDirectedEdges:edges.length-crossRanks.length,portFragmentMemberships:groups.reduce((n,g)=>n+g.ports.size,0),allOriginalIdsAssignedOnce:true,allOriginalEdgeRanksReassembleExactly:true,orderedEdgeSha256:hash(JSON.stringify(edges)),centreRange,frontier:{tight,conservative,potentialCatalog:{descriptors:catalog.length,noSavedExteriorRegions:possibleRegionCells-groups.length,maxCandidates,catalogMaxFragments}},savedContact3555:{directedEdges:pilotContact.edges.length,roofEndpointPairs,regions:[...contactRegionCounts].map(([key,endpointOccurrences])=>({key,endpointOccurrences})),scope:'Only the saved pair, not a proof of all536 declared parents'},regions:regionRows};
}
const result={version:1,authority:'ea0bb3db15b275513f48df6e00f255438610462e',scope:'Review-only saved-data grouping, no new source export, native/world calculation or timing experiment',input:{path:payloadPath,bytes:raw.length,sha256:hash(raw),owner:owner.id,nativeFragments:nodes.length,directedEdges:edges.length,orderedIdsSha256:hash(JSON.stringify(nodes.map(n=>n.id))),canonicalStock:carrier.fuelAmount+(carrier.finish?.amount||0),profile:carrier.fuelClass,originalParts:carrier.parts,anchors:carrier.anchors.length,declaredParents:carrier.supports.length,adjacency:carrier.adjacency.length,partClosed:owner.parts[0].closed},grid,cellRanges,radius:{radiantRange:8,cellHalfDiagonal:Math.hypot(...grid.pitch)/2,actual:radius,method:'ensurePoint snaps to native cell centre, then sources.near uses sphere/AABB distance <= radius',allPossibleSnappedCentres:true,noRouteSelection:true},notes:['Regions use original encoded native cell coordinates, not a centroid or stretched metre scale.','Vertical strata are original native y=20 and y=21, each1.06m; no new vertical grid.','Tight bounds are saved fragment unions; conservative bounds use canonical region cell boxes, EPS-expanded and clamped to original owner bounds.','Worst scopes are roof-only demand from one frontier query, not a bound on other carriers, multiple hot sites, support cascades or accumulated residency.','Graph components/ports summarize saved pristine static connectivity only; no damage or support physics is executed.','No per-cell fuel amounts or heat/air cells are present in the saved identity. Region stock/error certificates remain an implementation acceptance requirement.'],cases:[analyze(2),analyze(4)]};
fs.writeFileSync(path.join(here,'grouping.json'),JSON.stringify(result,null,2)+'\n');
const sources=[payloadPath,'src/simulation/source-activation.js','workbenches/furnished-house/simulation.js','src/simulation/scene-thermal.js','src/content/map-source-geometry.js','workbenches/furnished-house/scene.js','src/simulation/source-carriers.js','src/runtime/source-query-registry.js','src/runtime/collision.js','src/simulation/source-support.js','src/simulation/source-support-calculations.js','src/simulation/source-follow.js','src/content/map-source-presentation.js','src/runtime/sections.js','src/simulation/actor-support.js','workbenches/furnished-house/partition-error.js'];
fs.writeFileSync(path.join(here,'input-pins.json'),JSON.stringify({version:1,hashPolicy:'Raw payload; LF source text',files:sources.map(p=>{const b=read(p),rawInput=p===payloadPath;return {path:p,bytes:b.length,sha256:hash(rawInput?b:b.toString('utf8').replace(/\r\n/g,'\n')),mode:rawInput?'raw':'LF'};})},null,2)+'\n');
console.log(JSON.stringify({savedFragments:nodes.length,edges:edges.length,radius,cases:result.cases.map(c=>({size:c.sizeMetres,regions:c.regionCount,maxGroup:c.maxRegionFragments,maxComponents:c.maxInternalComponents,crossEdges:c.crossRegionDirectedEdges,frontierFragments:c.frontier.conservative.maxima.fragments.nativeFragments,frontierRegions:c.frontier.conservative.maxima.regions.regions,centres:c.frontier.conservative.testedCentres})),nativeCompilations:0,worldSteps:0,measurement:false}));
