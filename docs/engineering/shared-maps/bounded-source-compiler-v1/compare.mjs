// One bounded correctness comparison. No world, trial, graph, renderer or clock.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const file=name=>path.join(here,name),hash=b=>createHash('sha256').update(b).digest('hex');
const deck='new-york::carrier/clerestory-roof-deck/tile--1-10',roof='new-york::carrier/roof/clerestory';
const names=['pins','imports','original-source-pair','original-native-reference','regional-forward','regional-reverse','regional-scattered','local-witness','cleanup'];
const state={version:1,authority:'1a88cf4748bf62c1456285ff43412c929d311199',purpose:'Isolated regional compiler/quantity correctness; not a cost observation',pid:process.pid,executable:process.execPath,execArgv:process.execArgv,startedAt:new Date().toISOString(),stages:[],current:null,firstFailure:null,complete:false,scope:{productionEnabled:false,originalNativeCalls:0,regionalNativeCalls:0,regionalCallsLimit:960,worldTrials:0,worldSteps:0,supportRebuilds:0,liveQueries:0,productionFactories:0,renderers:0},orders:[],cleanup:{reference:false,pilot:false,ledger:false,metadata:false,traceFiles:false}};
let reference,compiled,pilot,ledger,traceFd,activeReceipt;
function save(){state.unrun=names.filter(name=>!state.stages.some(row=>row.name===name&&row.status==='passed'));fs.writeFileSync(file('partial.tmp.json'),JSON.stringify(state,null,2)+'\n');fs.renameSync(file('partial.tmp.json'),file('partial.json'));}
function guard(label){if(performance.now()>=50000||fs.existsSync(file('stop.requested')))throw Error('Cooperative 50-second boundary: '+label);}
async function stage(name,work){guard(name);const row={name,status:'running'};state.stages.push(row);state.current={stage:name};save();try{const result=await work();guard(name);row.status='passed';save();return result;}catch(error){row.status='failed';row.error=error.message;state.firstFailure||={stage:name,current:state.current,name:error.name,message:error.message,stack:error.stack};save();throw error;}}
const boundaryRecord=b=>{const {heatCells,...rest}=b;return {...rest,heatCells:heatCells?.map(c=>c.id)};};
const fuelRecord=f=>{const {cells,...rest}=f;return {...rest,cells:cells.map(c=>c.id)};};
const canonicalIds=ids=>hash(JSON.stringify(ids));
const countBox=b=>b.min.reduce((n,v,i)=>n*Math.max(0,b.max[i]-v+1),1);
function clearScene(scene){for(const map of [scene.index.surfaces,scene.index.bins,scene.cells,scene.fuels,scene.items,scene.parts,scene.sourceDefinitions])map.clear();}
function encodedCell(id){const match=id.match(/@(-?\d+),(-?\d+),(-?\d+)$/);assert.ok(match,'Original cell suffix: '+id);return match.slice(1).map(Number);}
function regionKey(min){return [min[0]/4,min[1],min[2]/4].join(',');}
try{
  assert.ok(fs.existsSync(file('launch.once')),'Use the one-shot bounded supervisor');fs.closeSync(fs.openSync(file('comparison-started.once'),'wx'));save();
  const input=await stage('pins',()=>{
    assert.deepEqual(process.execArgv,['--max-old-space-size=1024']);
    const plan=JSON.parse(fs.readFileSync(file('plan.json')));assert.equal(plan.authority,state.authority);assert.equal(process.version,plan.nodeRuntime);
    for(const pin of [...plan.sourcePins,...plan.harnessPins.map(p=>({...p,path:path.relative(root,file(p.file))}))]){
      const bytes=fs.readFileSync(path.join(root,pin.path)),normalized=pin.mode==='LF'?bytes.toString('utf8').replace(/\r\n/g,'\n'):bytes;assert.equal(hash(normalized),pin.sha256,pin.path);
    }
    const pins=JSON.parse(fs.readFileSync(path.join(root,'docs/engineering/shared-maps/support-preparation-v1/source-pins.json')));
    const raw=Object.fromEntries(pins.files.map((pin,i)=>{const bytes=fs.readFileSync(path.join(root,pin.path));assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.sha256,pin.path);return [['index','library','navigation'][i],bytes];}));
    const grouping=JSON.parse(fs.readFileSync(path.join(root,'docs/engineering/shared-maps/bounded-source-regions-v1/grouping.json'))),saved=grouping.cases.find(c=>c.sizeMetres===2);
    assert.equal(grouping.input.canonicalStock,490.002072);assert.equal(saved.possibleBoundingGridRegions,320);assert.equal(saved.regionCount,232);
    return {plan,raw,grouping,saved};
  });
  const modules=await stage('imports',()=>Promise.all([
    import('../../../../src/content/shared-map.js'),import('../../../../src/simulation/regional-source-pilot.js'),import('../../../../workbenches/furnished-house/geometry.js'),import('./original-scene.mjs')
  ]));
  const [content,regional,geometry,original]=modules;
  const source=await stage('original-source-pair',()=>{
    const parsed=Object.fromEntries(Object.entries(input.raw).map(([key,bytes])=>[key,JSON.parse(bytes)]));
    // Metadata decoding only: no production visit/factory, query or graph is invoked.
    compiled=content.compileSharedMap(parsed.index,parsed.library,parsed.navigation);
    assert.equal(compiled.model.carriers[10027].id,roof);assert.deepEqual(compiled.model.carrierById.get(roof).parts,[10387]);assert.equal(compiled.model.parts[10387].closed,true);
    const owners=[deck,roof].map(id=>compiled.model.carrierById.get(id));assert.ok(owners.every(Boolean));
    const bundles=owners.map(owner=>compiled.sources.sourcesForCarrier(owner.id,{})),surfaces=bundles.flatMap(b=>b.surfaces),openings=bundles.flatMap(b=>b.openings);
    assert.equal(surfaces.length,6);assert.equal(surfaces.filter(s=>s.sourceCarrierId===roof).length,5);assert.equal(openings.length,0);assert.equal(surfaces.reduce((n,s)=>n+s.triangles.length,0),10);
    const data={...compiled.data,surfaces,openings,items:[],furnitureParts:[],stores:[],implicitGround:false,runtimeAdapterVersion:1};
    state.inputs={sourcePins:input.plan.inputPins,sourceRevision:input.plan.sourceRevision,owners:owners.map(o=>({id:o.id,quantity:o.fuelAmount+(o.finish?.amount||0),profile:o.fuelClass,parts:o.parts})),sourceSurfaces:surfaces.map(s=>({id:s.id,triangles:s.triangles.length,quantity:s.fuelAmount,finish:s.finish||null})),sourceExpansion:compiled.sources.metrics()};
    assert.equal(state.inputs.sourceExpansion.nativeSourceExpansions,2);assert.equal(state.inputs.sourceExpansion.nativePartTransforms,2);assert.equal(state.inputs.sourceExpansion.renderExpansions,0);
    return {data,owners};
  });
  const expected=await stage('original-native-reference',()=>{
    state.scope.originalNativeCalls++;reference=original.compileScene(source.data);
    assert.equal(reference.index.surfaces.size,4136);assert.equal(reference.fuels.size,4136);assert.equal(reference.cells.size,9520);
    const boundaries=[...reference.index.surfaces.values()],roofIds=boundaries.filter(b=>b.sourceCarrierId===roof).map(b=>b.id),deckIds=boundaries.filter(b=>b.sourceCarrierId===deck).map(b=>b.id),fuelIds=[...reference.fuels.keys()];
    assert.equal(roofIds.length,4132);assert.equal(deckIds.length,4);assert.equal(canonicalIds(roofIds),input.grouping.input.orderedIdsSha256);
    const boundaryRank=new Map(boundaries.map((b,i)=>[b.id,i])),fuelRank=new Map(fuelIds.map((id,i)=>[id,i]));
    const deckCells=new Set(),seeds=new Map();for(const id of deckIds){const b=reference.index.surfaces.get(id),c=encodedCell(id);seeds.set(c.join(','),c);for(const cell of b.heatCells)seeds.set(cell.id,cell.c);for(const cell of reference.fuels.get(b.fuelId)?.cells||[])seeds.set(cell.id,cell.c);}
    for(const c of seeds.values())for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const id=c.map((v,i)=>v+[x,y,z][i]).join(',');assert.ok(reference.cells.has(id));deckCells.add(id);}
    const roofSurfaces=source.data.surfaces.filter(s=>s.sourceCarrierId===roof),ranges=roofSurfaces.map(s=>{const box=geometry.bounds(s.triangles.flat()),min=box.min.map((v,i)=>Math.floor((v-reference.origin[i])/reference.pitch[i]+geometry.EPS)),max=box.max.map((v,i)=>box.max[i]-box.min[i]<geometry.EPS?min[i]:Math.ceil((v-reference.origin[i])/reference.pitch[i]-geometry.EPS)-1);return {sourceId:s.id,min,max};});
    const originalRoofCandidateCells=ranges.reduce((n,b)=>n+countBox(b),0);
    const nativeRoof=roofIds.reduce((n,id)=>n+reference.fuels.get('fuel:'+id).amount,0);
    const geometryDigest=createHash('sha256');for(const id of [...deckIds,...roofIds])geometryDigest.update(JSON.stringify(boundaryRecord(reference.index.surfaces.get(id)))+'\n');
    const fuelDigest=createHash('sha256');for(const id of fuelIds)fuelDigest.update(JSON.stringify(fuelRecord(reference.fuels.get(id)))+'\n');
    state.reference={fragments:4136,roofFragments:4132,deckFragments:4,fuels:4136,cells:9520,originalFuel:reference.initialFuel,originalRoofFuel:nativeRoof,deckReusedCells:deckCells.size,originalRoofCandidateCells,iterationCountMethod:'Original full native integer source spans; no extra reference pass/instrumentation',sourceRanges:ranges,canonicalOrder:'Original source-array order, then original z/y/x native loop order; fuel insertion order',orderedBoundaryIdsSha256:canonicalIds(boundaries.map(b=>b.id)),orderedFuelIdsSha256:canonicalIds(fuelIds),orderedRoofIdsSha256:canonicalIds(roofIds),orderedCellIdsSha256:canonicalIds([...reference.cells.keys()].sort()),boundaryRecordsSha256:geometryDigest.digest('hex'),fuelRecordsSha256:fuelDigest.digest('hex')};
    pilot=regional.createRegionalSourcePilot({data:{...source.data,surfaces:roofSurfaces},owners:[source.owners[1]],sourceRevision:input.plan.sourceRevision});ledger=regional.createRegionalClaimLedger(pilot);assert.equal(ledger.snapshot().owners[0].state,'cold');
    return {roofIds,deckIds,fuelIds,boundaryRank,fuelRank,deckCells,ranges,originalRoofCandidateCells};
  });
  let forwardRows;
  for(const [orderIndex,order]of ['forward','reverse','scattered'].entries())await stage('regional-'+order,()=>{
    if(orderIndex)ledger.reset();const descriptors=pilot.regions(roof);assert.equal(descriptors.length,320);
    const ordered=order==='reverse'?[...descriptors].reverse():order==='scattered'?Array.from({length:320},(_,i)=>descriptors[i*137%320]):descriptors;
    assert.equal(new Set(ordered).size,320);
    const boundaryIds=new Set(),fuelIds=new Set(),cells=new Set(expected.deckCells),visits=new Map(expected.ranges.map(r=>[r.sourceId,new Set()])),rows=[];
    const result={order,status:'running',compiledRegions:0,nonemptyRegions:0,maxFragments:0,boundaries:0,fuels:0,visitedCells:0};state.orders.push(result);
    traceFd=fs.openSync(file('iterations-'+order+'.jsonl'),'wx');
    for(const descriptor of ordered){
      guard(order);assert.ok(state.scope.regionalNativeCalls<960);state.current={stage:'regional-'+order,nextRegion:regionKey(descriptor.cellMin),attemptedRegionalCalls:state.scope.regionalNativeCalls+1};save();
      const before=pilot.diagnostics().nativeCalls;activeReceipt=pilot.compile(descriptor);state.scope.regionalNativeCalls=pilot.diagnostics().nativeCalls;assert.equal(state.scope.regionalNativeCalls,before+1);
      try{
        const r=activeReceipt,scene=r.scene;assert.equal(scene.partialCompilation,true);assert.deepEqual(scene.profile,reference.profile);assert.deepEqual(scene.origin,reference.origin);assert.deepEqual(scene.pitch,reference.pitch);
        for(const [id,s]of scene.sourceDefinitions)assert.deepEqual(s,reference.sourceDefinitions.get(id));
        const ids=[...scene.index.surfaces.keys()].sort((a,b)=>expected.boundaryRank.get(a)-expected.boundaryRank.get(b));
        for(const id of ids){assert.ok(expected.boundaryRank.has(id));assert.ok(!boundaryIds.has(id),'Unique original boundary '+id);assert.deepEqual(boundaryRecord(scene.index.surfaces.get(id)),boundaryRecord(reference.index.surfaces.get(id)),id);boundaryIds.add(id);}
        const fuels=[...scene.fuels.keys()].sort((a,b)=>expected.fuelRank.get(a)-expected.fuelRank.get(b));
        for(const id of fuels){assert.ok(expected.fuelRank.has(id));assert.ok(!fuelIds.has(id),'Unique original fuel '+id);assert.deepEqual(fuelRecord(scene.fuels.get(id)),fuelRecord(reference.fuels.get(id)),id);fuelIds.add(id);}
        for(const [id,c]of scene.cells){const old=reference.cells.get(id);assert.ok(old,id);assert.deepEqual(c.c,old.c);assert.deepEqual(c.position,old.position);cells.add(id);}
        assert.equal(r.trace.sources.length,expected.ranges.length);let visited=0;
        for(const [i,t]of r.trace.sources.entries()){
          const original=expected.ranges[i];assert.equal(t.sourceId,original.sourceId);assert.deepEqual(t.full,{min:original.min,max:original.max});
          const restricted={min:original.min.map((v,i)=>Math.max(v,descriptor.cellMin[i])),max:original.max.map((v,i)=>Math.min(v,descriptor.cellMaxExclusive[i]-1))};assert.deepEqual(t.restricted,restricted);assert.equal(t.cells,countBox(restricted));visited+=t.cells;
          const seen=visits.get(t.sourceId);for(let z=restricted.min[2];z<=restricted.max[2];z++)for(let y=restricted.min[1];y<=restricted.max[1];y++)for(let x=restricted.min[0];x<=restricted.max[0];x++){const id=[x,y,z].join(',');assert.ok(!seen.has(id),'Disjoint original source iteration '+t.sourceId+'@'+id);seen.add(id);}
        }
        assert.equal(visited,r.trace.visitedCells);const beforeStock=ledger.snapshot(),plan=ledger.prepare(r);assert.deepEqual(ledger.snapshot(),beforeStock);plan.commit();
        const row={key:regionKey(descriptor.cellMin),min:descriptor.cellMin,fragments:ids.length,fuels:fuels.length,orderedOriginalIdsSha256:canonicalIds(ids),nativeQuantity:r.nativeQuantity,certificate:r.certificate,visitedCells:visited,sources:r.trace.sources.map(t=>({sourceId:t.sourceId,restricted:t.restricted,cells:t.cells}))};
        fs.writeSync(traceFd,JSON.stringify(row)+'\n');rows.push(row);result.compiledRegions++;if(ids.length)result.nonemptyRegions++;result.maxFragments=Math.max(result.maxFragments,ids.length);result.boundaries+=ids.length;result.fuels+=fuels.length;result.visitedCells+=visited;
      }finally{activeReceipt.dispose();activeReceipt=null;}
      assert.equal(pilot.diagnostics().retainedReceipts,0);
    }
    fs.closeSync(traceFd);traceFd=null;
    assert.deepEqual(expected.roofIds.filter(id=>boundaryIds.has(id)),expected.roofIds);assert.equal(boundaryIds.size,4132);
    assert.deepEqual(expected.fuelIds.filter(id=>fuelIds.has(id)),expected.roofIds.map(id=>'fuel:'+id));assert.equal(fuelIds.size,4132);
    assert.deepEqual([...cells].sort(),[...reference.cells.keys()].sort());assert.equal(cells.size,9520);assert.equal(result.nonemptyRegions,232);assert.equal(result.maxFragments,36);assert.equal(result.visitedCells,expected.originalRoofCandidateCells);
    for(const range of expected.ranges)assert.equal(visits.get(range.sourceId).size,countBox(range));
    const stock=ledger.snapshot().owners[0];assert.equal(stock.state,'full');assert.equal(stock.canonicalTransferred,490.002072);assert.equal(stock.coldReserve,0);assert.ok(Math.abs(stock.canonicalRemainder)<=stock.provedRemainderBound);
    const nativeRoundoff=64*Number.EPSILON*Math.max(1,stock.nativeBorn)*4132;assert.ok(Math.abs(stock.nativeBorn-state.reference.originalRoofFuel)<=nativeRoundoff);
    Object.assign(result,{status:'passed',cells:cells.size,stock,nativeSummationRoundoff:nativeRoundoff,nativeSumDelta:stock.nativeBorn-state.reference.originalRoofFuel,orderedOriginalBoundaryIdsSha256:canonicalIds(expected.roofIds.filter(id=>boundaryIds.has(id))),originalGeometryAndMetadataExact:true,originalFuelRecordsExact:true,originalSourceDefinitionsExact:true,cellUnionExact:true,disjointOriginalCellIterations:true});
    if(order==='forward')forwardRows=rows;
    state.pilot=pilot.diagnostics();assert.equal(state.pilot.nativeCalls,320*(orderIndex+1));assert.equal(state.pilot.certificateBuilds,320);save();
  });
  await stage('local-witness',()=>{
    const witness=input.saved.frontier.conservative.maxima.fragments;assert.deepEqual(witness.centre,[53.75,21.73,41.75]);assert.equal(witness.nativeFragments,2486);
    const selected=new Set(witness.regionKeys),radius=input.grouping.radius.actual,owner=source.owners[1],selectedPotential=[];
    for(const row of forwardRows){
      const lo=row.min,hi=lo.map((v,i)=>v+[4,1,4][i]),box={min:lo.map((v,i)=>Math.max(owner.bounds.min[i],reference.origin[i]+v*reference.pitch[i]-geometry.EPS)),max:hi.map((v,i)=>Math.min(owner.bounds.max[i],reference.origin[i]+v*reference.pitch[i]+geometry.EPS))};
      if(Math.hypot(...witness.centre.map((v,i)=>Math.max(box.min[i]-v,v-box.max[i],0)))<=radius)selectedPotential.push(row);
    }
    assert.deepEqual(selectedPotential.filter(r=>r.fragments).map(r=>r.key).sort(),[...selected].sort());assert.equal(selected.size,138);
    const requestedRows=forwardRows.filter(r=>selected.has(r.key)),ids=expected.roofIds.filter(id=>selected.has(regionKey(encodedCell(id).map((v,i)=>i===1?v:Math.floor(v/4)*4)))),unrequested=expected.roofIds.filter(id=>!selected.has(regionKey(encodedCell(id).map((v,i)=>i===1?v:Math.floor(v/4)*4))));
    assert.equal(ids.length,2486);assert.equal(unrequested.length,1646);assert.equal(requestedRows.reduce((n,r)=>n+r.fragments,0),2486);
    for(const row of forwardRows){const saved=input.saved.regions.find(r=>r.key===row.key);assert.equal(row.fragments,saved?.nativeFragments||0);if(saved)assert.equal(row.orderedOriginalIdsSha256,saved.orderedOriginalIdsSha256);}
    state.witness={savedCentre:witness.centre,savedRadius:radius,selectedPotentialDescriptors:selectedPotential.length,selectedEmptyDescriptors:selectedPotential.filter(r=>!r.fragments).length,selectedNonemptyDescriptors:selected.size,requestedFragments:ids.length,unrequestedFragments:unrequested.length,requestedOriginalIdsSha256:canonicalIds(ids),unrequestedOriginalIdsSha256:canonicalIds(unrequested),requestedDomainKeys:selectedPotential.map(r=>r.key),unrequestedDomainKeys:forwardRows.filter(r=>!selectedPotential.includes(r)).map(r=>r.key),reusedForwardIterationCells:selectedPotential.reduce((n,r)=>n+r.visitedCells,0),totalRoofIterationCells:expected.originalRoofCandidateCells,additionalNativeCalls:0,noDistantLoopInsideSelectedReceipts:true,interpretation:'Selection of already-recorded bounded receipts/traces only; all three full comparison orders did visit the complete roof. No fifth pass, live frontier query, action latency or accumulated residency claim.'};
    assert.equal(state.scope.originalNativeCalls,1);assert.equal(state.scope.regionalNativeCalls,960);assert.equal(pilot.diagnostics().visitedCells,3*expected.originalRoofCandidateCells);state.complete=true;
  });
}catch(error){state.firstFailure||={stage:state.current?.stage,current:state.current,name:error.name,message:error.message,stack:error.stack};process.exitCode=1;}
finally{
  try{
    activeReceipt?.dispose();if(traceFd!==null&&traceFd!==undefined)fs.closeSync(traceFd);state.cleanup.traceFiles=true;
    ledger?.dispose();state.cleanup.ledger=true;if(pilot){state.pilot=pilot.diagnostics();state.scope.regionalNativeCalls=state.pilot.nativeCalls;assert.equal(state.pilot.retainedReceipts,0);pilot.dispose();state.pilotAfterDispose=pilot.diagnostics();}state.cleanup.pilot=true;
    if(reference)clearScene(reference);state.cleanup.reference=true;compiled?.dispose();state.cleanup.metadata=true;state.stages.push({name:'cleanup',status:'passed'});
  }catch(error){state.firstFailure||={stage:'cleanup',message:error.message,stack:error.stack};process.exitCode=1;}
  state.endedAt=new Date().toISOString();state.processLifetimeMs=performance.now();state.complete=state.complete&&!state.firstFailure;save();fs.writeFileSync(file('final.json'),JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({complete:state.complete,firstFailure:state.firstFailure,scope:state.scope,orders:state.orders.map(o=>({order:o.order,status:o.status,regions:o.compiledRegions,fragments:o.boundaries,visitedCells:o.visitedCells})),witness:state.witness&&{requested:state.witness.requestedFragments,unrequested:state.witness.unrequestedFragments},cleanup:state.cleanup}));
}
