// Read-only saved source/native query comparison. Never imports a compiler,
// source factory, trial, graph, renderer or the spent native-proof entry point.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRegionalQueryKernel} from '../../../../src/runtime/regional-effective-query.js';
import {createBoundaryIndex,segmentTriangle,triangleArea,EPS,cross,sub} from '../../../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear} from '../../../../src/runtime/collision.js';
import {sourceGeometryTriangles} from '../../../../src/content/map-source-shapes.js';
const out='docs/engineering/shared-maps/regional-query-kernel-v1/',attempt=process.argv[2],sha=value=>createHash('sha256').update(value).digest('hex');
if(!/^[a-z0-9-]+$/.test(attempt||''))throw Error('Named bounded read-only comparison required');
const target=out+'saved-'+attempt+'.json';if(fs.existsSync(target))throw Error('Preserve the prior comparison');
const state={authority:'df3dbcea',kind:'Saved-array query correctness only; no speed claim',pid:process.pid,executable:process.execPath,startedAt:new Date().toISOString(),inputs:[],checks:[],firstFailure:null,complete:false,nativeCompilerCalls:0,worldTrials:0,worldSteps:0,graphRebuilds:0,proofReplay:false,cleanup:false};
let kernel;function save(){fs.writeFileSync(target,JSON.stringify(state,null,2)+'\n');}
function check(name,input,fn){if(state.checks.length>=512)throw Error('Bounded saved-query case ceiling reached');state.current={name,input};save();try{const value=fn();state.checks.push({name,input,...value,passed:true});}catch(error){state.firstFailure={name,input,message:error.message,actual:error.actual,expected:error.expected};throw error;}}
const values=hits=>hits.map(h=>({id:h.surface.id,t:h.t,normal:h.normal})),digest=v=>sha(JSON.stringify(v));
// Revive the existing archive's undefined/-0 tags in place. Coordinate arrays
// remain the parsed original arrays; no second geometry snapshot is built.
function revive(value){if(!value||typeof value!=='object')return value;if(value.$undefined===true&&Object.keys(value).length===1)return undefined;if(value.$number==='-0'&&Object.keys(value).length===1)return -0;for(const key of Object.keys(value))value[key]=revive(value[key]);return value;}
function pin(path,expected){const raw=fs.readFileSync(path);assert.equal(sha(raw),expected,path);state.inputs.push({path,bytes:raw.length,sha256:expected});return raw;}
const ownerRoof='new-york::carrier/roof/clerestory';
try{
  save();let payload=JSON.parse(pin('docs/engineering/shared-maps/support-large-proof-v2/reference-blocks.json','bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418')),library=JSON.parse(pin('assets/runtime/map-sources/new-york/library.json','1e93eb730de7a978b01069df5401ea80d4ddebcff7d101010714e8b4643fc296'));
  const selected=payload.blocks[3].identity,grid=selected.grid,owners=selected.ownerStates;assert.equal(owners.length,2);revive(owners);payload=null;
  const sources=[],nativeInventory=[],allCells=new Map();
  for(const owner of owners){assert.equal(owner.parts.length,1);const part=owner.parts[0],g=library.geometries[part.geometry],count=(g.index?.array.length??g.attributes.position.array.length/g.attributes.position.itemSize)/3,ts=sourceGeometryTriangles({matrix:part.matrix,triangleCount:count,...(part.originalRange?{sourceRange:part.originalRange}:{})},g);
    assert.ok(['timber','timber-covering'].includes(owner.carrier.material)); // Both retain the pinned ordinary .02 transmission.
    const rayRecord={id:'new-york::cold/'+part.id,sourceSurfaceId:owner.id,sourceCarrierId:owner.id,nativePartId:part.id,instanceId:'new-york',kind:'query-solid',normal:[0,1,0],intact:true,openFraction:0,transmission:.02,bounds:part.bounds,triangles:ts};
    sources.push({partRef:part,closed:part.closed,surfaceTriangles:ts,solidTriangles:ts,rayRecord});
    for(const record of owner.native){record.transmission=.02;const match=record.id.match(/@(-?\d+),(-?\d+),(-?\d+)$/);assert.ok(match);nativeInventory.push({record,cell:match.slice(1).map(Number)});}
    const min=part.bounds.min.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)),max=part.bounds.max.map((v,i)=>Math.ceil((v-grid.origin[i])/grid.pitch[i]-EPS)-1),cells=[];for(let z=min[2];z<=max[2];z++)for(let y=min[1];y<=max[1];y++)for(let x=min[0];x<=max[0];x++)cells.push([x,y,z]);allCells.set(part.id,cells);
  }
  library=null;assert.equal(nativeInventory.length,4136);assert.equal(sources.reduce((n,s)=>n+s.solidTriangles.length,0),20);
  kernel=createRegionalQueryKernel({grid,sources,nativeInventory,sourceRevision:state.inputs[0].sha256});
  state.admission={parts:sources.map(s=>({id:s.partRef.id,owner:s.partRef.carrierId,sourceTriangles:s.solidTriangles.length,cells:allCells.get(s.partRef.id).length,closed:s.closed})),nativeRecords:nativeInventory.length,nativeRoof:nativeInventory.filter(n=>n.record.sourceCarrierId===ownerRoof).length,geometryArraysCloned:false,queryMetadataRestored:'Undefined/-0 revived in place; pinned timber/timber-covering transmission .02 supplied to both ordinary and regional query records. Saved sourceSurfaceId remains the ordinary sheet fallback; omitted sheetKey is not invented.'};
  const coldIndex=createBoundaryIndex(sources.map(s=>s.rayRecord)),nativeIndex=createBoundaryIndex(nativeInventory.map(n=>n.record));
  const rays=[];for(const x of [41.5,47,56,65,70.5])for(const z of [33.5,36.5,42,49,50.5])rays.push([[x,25,z],[x,20,z]]);
  for(const x of [55.25,55.75,56])for(const z of [36.25,36.75,37])rays.push([[x,24,z],[x,20,z]]);
  rays.push([[38,22,42],[73,22,42]],[[73,22,42],[38,22,42]],[[56,24,32],[56,20,52]],[[56,20,52],[56,24,32]]);
  const edge=sources.find(s=>s.partRef.carrierId===ownerRoof).partRef.bounds.min[0];for(const delta of [-2*EPS,-EPS/2,0,EPS/2,2*EPS])rays.push([[edge+delta,25,42],[edge+delta,20,42]]);
  const bodies=[];for(const [x,z]of [[56,42],[45,36],[68,47],[55.25,36.25]])for(const [low,high]of [[21.1,21.5],[22.4,22.8],[23.4,23.8]])bodies.push([{x,y:z},{x,y:z},.14,low,high]);bodies.push([{x:38,y:42},{x:73,y:42},.2,22.4,22.9],[{x:40,y:32},{x:72,y:52},.2,21.5,22]);
  function fullNative(){const view=kernel.view(),claims=sources.map(s=>kernel.coverage({partId:s.partRef.id,cells:allCells.get(s.partRef.id),records:nativeInventory.filter(n=>n.record.nativePartId===s.partRef.id).map(n=>n.record.id),complete:true}));return kernel.prepare({expectedGeneration:view.generation,expectedRevision:view.revision,native:claims}).commit();}
  for(const [mode,index]of [['cold',coldIndex],['native',nativeIndex]]){
    if(mode==='native')fullNative();
    for(const [i,[a,b]]of rays.entries())for(const includeEndpoints of [false,true])check(mode+'-ray-'+i+'-'+includeEndpoints,{from:a,to:b,includeEndpoints},()=>{const actual=values(kernel.segment(kernel.view(),a,b,{includeEndpoints})),expected=values(index.crossings(a,b,{includeEndpoints}));assert.deepEqual(actual,expected);assert.equal(kernel.trace(kernel.view(),a,b,{includeEndpoints}).transmission,index.trace(a,b,{includeEndpoints}).transmission);return {hits:actual.length,digest:digest(actual)};});
    for(const [i,args]of bodies.entries())check(mode+'-body-'+i,{args},()=>{const expected=mode==='cold'?sources.every(s=>sweptCylinderClear(...args,{triangles:s.solidTriangles,closed:s.closed})):nativeInventory.every(n=>sweptCylinderClear(...args,{triangles:n.record.solidTriangles||n.record.triangles,closed:n.record.closedShape!==false})),actual=kernel.sweptCylinderClear(kernel.view(),...args);assert.equal(actual,expected);return {clear:actual};});
    for(const channel of ['surface','solid'])check(mode+'-scoped-'+channel,{channel},()=>{
      const records=mode==='cold'?sources.map(s=>({record:s.rayRecord,ts:channel==='surface'?s.surfaceTriangles:s.solidTriangles})):nativeInventory.map(n=>({record:n.record,ts:channel==='surface'?n.record.triangles:n.record.solidTriangles||n.record.triangles})),expected=new Map(records.flatMap(({record,ts})=>ts.map((t,i)=>[record.id+'#'+i,{record,t,area:triangleArea(t),measured:0,vertices:0,parts:0}]))),identities=new Set(),pieces=kernel.faces(kernel.view(),{channel});let halos=0,maxAreaDelta=0,maxArithmeticBound=0;
      for(const piece of pieces){const id=piece.recordId+'#'+piece.primitive,original=expected.get(id);assert.ok(original);assert.equal(piece.record,original.record);const identity=id+'@'+piece.cell;assert.ok(!identities.has(identity));identities.add(identity);assert.equal(piece.ownerId,piece.record.sourceCarrierId);assert.equal(piece.channel,channel);assert.deepEqual(piece.normal,(()=>{const n=cross(sub(original.t[1],original.t[0]),sub(original.t[2],original.t[0])),l=Math.hypot(...n);return n.map(v=>v/l);})());
        if(piece.halo)halos++;original.parts++;original.vertices+=piece.polygon.length;for(let i=1;i<piece.polygon.length-1;i++)original.measured+=triangleArea([piece.polygon[0],piece.polygon[i],piece.polygon[i+1]]);
      }
      for(const row of expected.values()){const scale=Math.max(1,...row.t.flat().map(Math.abs)),bound=64*Number.EPSILON*scale**2*(row.vertices+3),delta=Math.abs(row.measured-row.area);assert.ok(delta<=bound,'Original primitive area split, not new thermal area: '+row.record.id);maxAreaDelta=Math.max(maxAreaDelta,delta);maxArithmeticBound=Math.max(maxArithmeticBound,bound);}
      return {pieces:pieces.length,originalPrimitives:expected.size,uniqueScopedPrimitiveIds:identities.size,haloPieces:halos,maxOriginalPrimitiveAreaDelta:maxAreaDelta,maxArithmeticBound,originalRecordReferences:true,noNewCapPrimitive:true,originalEpsilonOverlapBetweenDistinctNativeRecordsPreserved:true};
    });
  }
  kernel.reset();
  const roof=sources.find(s=>s.partRef.carrierId===ownerRoof),roofNative=nativeInventory.filter(n=>n.record.sourceCarrierId===ownerRoof),byCell=new Map();for(const n of roofNative){const id=n.cell.join(',');if(!byCell.has(id))byCell.set(id,[]);byCell.get(id).push(n);}
  const hero=roofNative.find(n=>n.cell[1]===21&&byCell.get(n.cell.join(',')).length===1&&n.record.normal[1]>.8&&n.record.position.every((v,i)=>v>grid.origin[i]+n.cell[i]*grid.pitch[i]+.12&&v<grid.origin[i]+(n.cell[i]+1)*grid.pitch[i]-.12));assert.ok(hero,'One complete pitched native patch with an interior body witness');
  const corner=[...byCell.values()].find(list=>list.length>1),empty=allCells.get(roof.partRef.id).find(c=>!byCell.has(c.join(',')));assert.ok(corner&&empty);
  const chosen=[hero.cell,corner[0].cell,empty],chosenSet=new Set(chosen.map(c=>c.join(','))),claimed=roofNative.filter(n=>chosenSet.has(n.cell.join(','))),receipt=kernel.coverage({partId:roof.partRef.id,cells:chosen,records:claimed.map(n=>n.record.id),complete:true}),before=kernel.view();kernel.prepare({expectedGeneration:before.generation,expectedRevision:before.revision,native:[receipt]}).commit();
  const lost=[hero.record.id,corner[0].record.id],view=kernel.view();kernel.prepare({expectedGeneration:view.generation,expectedRevision:view.revision,retireRecords:lost}).commit();
  state.mixed={partId:roof.partRef.id,claimedCells:chosen,retiredIds:lost,sameCellSurvivors:corner.slice(1).map(n=>n.record.id),explicitEmptyCell:empty};
  // Independent mixed oracle: enumerate original primitive hits, apply an
  // explicit original-domain/native table, THEN choose each original record's
  // first hit. It never calls the new view's faces/domain/query operations.
  function mixedOracle(a,b){const first=new Map(),domain=point=>chosenSet.has(point.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)).join(','));
    const offer=(record,ts,isNative)=>{for(const [primitive,t]of ts.entries()){const at=segmentTriangle(a,b,t,record.thickness||0);if(at===null||at<=EPS||at>=1-EPS)continue;const point=a.map((v,i)=>v+(b[i]-v)*at),inside=record.nativePartId===roof.partRef.id&&domain(point);if(isNative!==inside)continue;const previous=first.get(record.id);if(!previous||at<previous.t){const n=cross(sub(t[1],t[0]),sub(t[2],t[0])),length=Math.hypot(...n);first.set(record.id,{surface:record,t:at,normal:n.map(v=>v/length),primitive});}}};
    for(const s of sources)offer(s.rayRecord,s.surfaceTriangles,false);for(const n of claimed)if(!lost.includes(n.record.id))offer(n.record,n.record.triangles,true);
    const sorted=[...first.values()].sort((a,b)=>a.t-b.t||a.surface.id.localeCompare(b.surface.id)),unique=[];for(const hit of sorted){const old=unique.findIndex(h=>h.surface.sourceSurfaceId===hit.surface.sourceSurfaceId&&Math.abs(h.t-hit.t)<EPS*10);if(old<0)unique.push(hit);}return values(unique);
  }
  const mixedRays=rays.slice(0,25);for(const n of [hero,...corner]){const p=n.record.position;mixedRays.push([[p[0],25,p[2]],[p[0],20,p[2]]],[[p[0],20,p[2]],[p[0],25,p[2]]]);}
  for(const [i,[a,b]]of mixedRays.entries())check('mixed-original-domain-oracle-'+i,{from:a,to:b},()=>{const actual=values(kernel.segment(kernel.view(),a,b)),expected=mixedOracle(a,b);assert.deepEqual(actual,expected);return {hits:actual.length,digest:digest(actual)};});
  const p=hero.record.position,holeArgs=[{x:p[0],y:p[2]},{x:p[0],y:p[2]},.04,p[1]-.08,p[1]+.08];
  check('mixed-retired-patch-full-body-hole',{args:holeArgs,cell:hero.cell},()=>{const lo=[p[0]-.04,p[1]-.08,p[2]-.04],hi=[p[0]+.04,p[1]+.08,p[2]+.04];for(const q of [lo,hi])assert.deepEqual(q.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)),hero.cell);assert.equal(kernel.sweptCylinderClear(kernel.view(),...holeArgs),true);return {clear:true,entireBodyInRetiredNativeCoverage:true};});
  const centre=empty.map((v,i)=>grid.origin[i]+(v+.5)*grid.pitch[i]),emptyArgs=[{x:centre[0],y:centre[2]},{x:centre[0],y:centre[2]},.02,centre[1]-.1,centre[1]+.1];
  check('mixed-complete-empty-native-body',{args:emptyArgs,cell:empty},()=>{assert.equal(claimed.filter(n=>n.cell.join(',')===empty.join(',')).length,0);const ordinary=sources.every(s=>sweptCylinderClear(...emptyArgs,{triangles:s.solidTriangles,closed:s.closed}));assert.equal(ordinary,true);assert.equal(kernel.sweptCylinderClear(kernel.view(),...emptyArgs),ordinary);return {clear:true,explicitCompleteEmptyCoverage:true};});
  state.complete=true;
}catch(error){state.firstFailure||={name:state.current?.name||'admission/setup',message:error.message};process.exitCode=1;}
finally{kernel?.dispose();state.cleanup=!kernel||kernel.diagnostics().closed&&kernel.diagnostics().retainedViews===0&&kernel.diagnostics().retainedCoverageReceipts===0;state.endedAt=new Date().toISOString();save();console.log(JSON.stringify({complete:state.complete,checks:state.checks.length,firstFailure:state.firstFailure,nativeCompilerCalls:0,worldTrials:0,cleanup:state.cleanup}));}
