// Offline source-local reference producer. No gameplay trial, clock or renderer.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {compileScene} from '../workbenches/furnished-house/scene.js';
import {compileSharedMap} from '../src/content/shared-map.js';
import {createSourceSupportCalculations,sourceSupportRelation,captureSourceCalculation} from '../src/simulation/source-support-calculations.js';
import {sourceCalculationIdentity,encodeSourceCalculationResult,PREPARED_SUPPORT_ALGORITHM} from '../src/simulation/prepared-source-support.js';
import {supportPreparationDependencies} from './support-preparation-identity.mjs';

export const PREPARATION_LIMITS=Object.freeze({parts:512,sourceTriangles:32768,surfaces:4096,fragments:8192,localCells:65536});
const approvedEvidence=new Set(['coplanar-horizontal-triangle-contact','native-opening-assembly-attachment','native-portal-hinge-attachment','native-leaf-hardware-attachment']);
export const sourceBlockDigest=block=>createHash('sha256').update(JSON.stringify({version:block.version,identity:block.identity,edges:block.edges,result:block.result})).digest('hex');
export function selectSourceCalculation(model,request){
  if(request.kind==='continuity'){
    if(!model.carrierById.has(request.carrier))throw Error('Unknown selected source carrier');
    return {key:'continuity:'+request.carrier,owners:[request.carrier],calculation:{kind:'continuity',carrier:request.carrier}};
  }
  if(request.kind==='adjacency'){
    if(!Number.isSafeInteger(request.index)||request.index<0)throw Error('Select one original ordered contact index');
    const pair=model.index?.contacts?.[request.index];if(!pair||pair.length!==2)throw Error('Unknown original source contact');
    const [a,b]=pair.map(n=>model.carriers[n].id);return {key:'adjacency:'+request.index,owners:[a,b],calculation:{kind:'contact',a,b,directed:false}};
  }
  if(request.kind==='relation'){
    if(!Number.isSafeInteger(request.index)||request.index<0)throw Error('Select one original declared relation index');
    let index=0;
    for(const c of model.carriers)for(const parent of c.supports){
      const attachment=c.attachments.find(a=>a.parent===parent),evidence=c.supportEvidence.find(e=>e.parent===parent),record=attachment||(approvedEvidence.has(evidence?.kind)?evidence:null);
      if(!record)throw Error('Missing approved source support evidence '+c.id+' -> '+parent);
      if(index++===request.index){const relation=sourceSupportRelation(c.id,parent,record,model.carrierById);return {key:'relation:'+request.index,owners:[c.id,parent],calculation:{kind:'declared-region',relation}};}
    }
    throw Error('Unknown original declared relation');
  }
  throw Error('Select one continuity, adjacency or declared relation calculation');
}

export function prepareSourceSupportBlocks({model,sources,data,identity,request,ownershipCases,portalStates={},limits={}}){
  const policy={...PREPARATION_LIMITS,...limits};if(!Object.values(policy).every(n=>Number.isSafeInteger(n)&&n>0))throw Error('Invalid preparation limits');
  const selected=selectSourceCalculation(model,request),owners=[...new Set(selected.owners)];if(owners.length!==selected.owners.length||owners.length>2)throw Error('Preparation is one source or one ordered pair');
  const parts=owners.flatMap(id=>model.carrierById.get(id).parts.map(n=>model.parts[n]));if(parts.length>policy.parts)throw Error('Selected source exceeds part budget');
  let estimate=0;
  for(const p of parts){const g=model.library?.geometries?.[p.geometry];if(!g?.attributes?.position)throw Error('Preparation needs the pinned native geometry library');estimate+=(g.index?.array.length??g.attributes.position.array.length/g.attributes.position.itemSize)/3;}
  if(estimate>policy.sourceTriangles)throw Error('Selected source exceeds triangle budget');
  const bundles=owners.map(id=>sources.sourcesForCarrier(id,portalStates)),surfaces=bundles.flatMap(b=>b.surfaces),openings=bundles.flatMap(b=>b.openings||[]);
  if(surfaces.length>policy.surfaces||surfaces.reduce((n,s)=>n+s.triangles.length,0)>policy.sourceTriangles)throw Error('Selected blueprint exceeds preparation budget');
  // Same sparse-activation compiler input, with only this source/pair installed.
  // One compilation serves all requested ownership calculations. Never createTrial.
  const scene=compileScene({...data,surfaces,openings,items:[],furnitureParts:[],stores:[],implicitGround:false,runtimeAdapterVersion:1});
  const resources={selectedOwners:owners,compiledNativeScenes:1,trials:0,worldSteps:0,sourceParts:parts.length,sourceSurfaces:surfaces.length,nativeFragments:scene.index.surfaces.size,localCells:scene.cells.size,localFuels:scene.fuels.size,coldGeometryRetained:false};
  try{
    if(resources.nativeFragments>policy.fragments||resources.localCells>policy.localCells)throw Error('Selected native fragments exceed preparation budget');
    const records=[...scene.index.surfaces.values()],cases=ownershipCases||(owners.length===1?[owners]:[[],[owners[0]],[owners[1]],owners]),blocks=[],skipped=[];
    if(!Array.isArray(cases)||cases.length>4)throw Error('At most the four ownership combinations');
    const seen=new Set();
    for(const ids of cases){
      if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!owners.includes(id)))throw Error('Invalid selected ownership');
      const caseKey=JSON.stringify(owners.filter(id=>ids.includes(id)));if(seen.has(caseKey))throw Error('Duplicate ownership case');seen.add(caseKey);
      if(!ids.length){skipped.push({ownership:[],reason:'Original graph bypasses its calculation cache for both-cold owners'});continue;}
      const active=new Map(),nodes=new Map(),births=new Map();for(const b of records)if(ids.includes(b.sourceCarrierId)){if(!active.has(b.sourceCarrierId))active.set(b.sourceCarrierId,[]);active.get(b.sourceCarrierId).push(b);nodes.set(b.id,b);births.set(b.id,b);}
      const querySource={shape:(id,open)=>sources.shapeForPart(id,open),portalStates:()=>portalStates},context={...selected,scene,model,querySource,index:scene.index,nodes,active,births};
      const math=createSourceSupportCalculations(context),captured=captureSourceCalculation(add=>math.run(selected.calculation,add)),block={version:1,identity:sourceCalculationIdentity(context,identity),edges:captured.edges,result:encodeSourceCalculationResult(captured.result)};
      block.digest=sourceBlockDigest(block);blocks.push(block);
    }
    return {version:1,identity,selected,blocks,skipped,resources,limits:policy,manifest:{algorithmBaseline:PREPARED_SUPPORT_ALGORITHM,blockDigests:blocks.map(b=>b.digest),scope:'Reference source-local calculations only; no provider is enabled in any production map'}};
  }finally{
    for(const map of [scene.index.surfaces,scene.index.bins,scene.cells,scene.fuels,scene.items,scene.parts,scene.sourceDefinitions])map.clear();
    resources.localCompilerDisposed=true;
  }
}

async function main(){
  const args=process.argv.slice(2),value=name=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
  for(const a of args)if(!/^--(?:index|library|navigation|carrier|adjacency|relation|out)=/.test(a))throw Error('Unknown preparation argument');
  const selections=['carrier','adjacency','relation'].filter(n=>value(n)!==undefined);if(selections.length!==1||!value('out'))throw Error('Select exactly one --carrier, --adjacency or --relation and an --out artifact path');
  const root=fs.realpathSync(process.cwd()),output=path.resolve(value('out'));if(!output.startsWith(path.join(root,'artifacts')+path.sep))throw Error('Preparation output stays in this worktree artifacts');
  const paths={index:value('index')||'assets/runtime/map-sources/new-york/index.json',library:value('library')||'assets/runtime/map-sources/new-york/library.json',navigation:value('navigation')||'assets/art/place-scenes/new-york/navigation.json'},raw=Object.fromEntries(Object.entries(paths).map(([key,p])=>[key,fs.readFileSync(p)])),hash=b=>createHash('sha256').update(b).digest('hex');
  // Compile and identify the same captured bytes, even if a file later changes.
  const compiled=compileSharedMap(JSON.parse(raw.index),JSON.parse(raw.library),JSON.parse(raw.navigation)),query=compiled.createQuerySource();
  try{
    const dependencies=supportPreparationDependencies();
    const identity={version:1,algorithm:PREPARED_SUPPORT_ALGORITHM,sourceModel:hash(JSON.stringify(Object.fromEntries(Object.entries(raw).map(([k,bytes])=>[k,hash(bytes)])))),compiler:dependencies.digest,layout:hash(JSON.stringify({origin:compiled.data.gridOrigin,pitch:compiled.data.thermalCell,scene:compiled.data.scene,layoutVersion:1}))};
    const name=selections[0],request=name==='carrier'?{kind:'continuity',carrier:value(name)}:{kind:name,index:Number(value(name))};
    const result=prepareSourceSupportBlocks({model:compiled.model,sources:compiled.sources,data:compiled.data,identity,request,portalStates:query.portalStates()});result.sourceFiles=paths;result.compilerDependencies=dependencies;
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,blocks:result.blocks.length,resources:result.resources,enabledInProduction:false}));
  }finally{query.dispose();compiled.dispose();}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
