// Static preparation/audit only. This command never imports or runs geometry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),seam='989ecd6777f8a77791b0fa8ad32fcc618a2d3438',baseline='55cd9b597744244fbd0168939b13fbc66662d7b3';
const hash=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}),lf=s=>s.replace(/\r\n/g,'\n');
const base=lf(git('show',baseline+':src/simulation/source-support.js')),producer=lf(git('show',seam+':tools/prepare-source-support.mjs'));
assert.equal(hash(base),'1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c');
const sourceManifest=JSON.parse(fs.readFileSync(path.join(root,'docs/engineering/shared-maps/support-preparation-v1/manifest.json')));
assert.equal(hash(producer),sourceManifest.sources.find(f=>f.path==='tools/prepare-source-support.mjs').lfSha256);
const between=(code,start,end)=>{const i=code.indexOf(start),j=code.indexOf(end,i);assert.ok(i>=0&&j>i,start);return code.slice(i,j);};
const fragments={
  imports:base.split('\n').slice(0,4).join('\n'),
  helpers:between(base,'const TOLERANCE=','// The full metadata graph is cold;'),
  capture:between(base,'  function directed(a,b){','  function coldPieces(id,near){'),
  contact:between(base,'  function coldPieces(id,near){','  function assemblyRegions(r){'),
  regions:between(base,'  function assemblyRegions(r){','  function rebuild(){'),
  continuity:between(base,'      const temporary=visitSourceContinuityCandidates','    });\n    for(let i=0;i<adjacency.length;i++)'),
  declared:between(base,"        if(r.kind==='coplanar-horizontal-triangle-contact')",'      });\n      if(!found)')
};
const imports=fragments.imports.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,q,p)=>{const target=path.resolve(root,'src/simulation',p),relative=path.relative(here,target).split(path.sep).join('/');return 'from '+JSON.stringify(relative.startsWith('.')?relative:'./'+relative);});
const reference=imports+'\n\n'+fragments.helpers+`// The following original function bodies are verbatim 55cd fragments.
// Only the surrounding local-call/capture context replaces graph scheduling.
export function originalCalculation(context,calculation){
  const {index,model,querySource,nodes,active}=context,carriers=model.carrierById;
  const links=new Map([...nodes.keys(),...context.owners.map(id=>'cold:'+id)].map(id=>[id,new Set()]));
  const capture={edges:[],seen:new Map()};let continuityBuilds=0,peakTemporaryRecords=0,peakTemporaryMemberships=0;
  function cold(id){return 'cold:'+id;}
`+fragments.capture+fragments.contact+fragments.regions+'  function continuity(id){const list=active.get(id);\n'+fragments.continuity+'  }\n  function declaredRegion(r){\n'+fragments.declared+`  }
  let result;
  if(calculation.kind==='continuity')result=continuity(calculation.carrier);
  else if(calculation.kind==='contact')result=connectContact(calculation.a,calculation.b,calculation.directed);
  else if(calculation.kind==='declared-region')result=declaredRegion(calculation.relation);
  else throw Error('Unknown pinned calculation');
  return {edges:capture.edges,result};
}
`;
const glue={
  parts:between(producer,'  const parts=owners.flatMap','  const bundles='),
  blueprint:between(producer,'  const bundles=','  // Same sparse-activation compiler input,'),
  compile:between(producer,'  const scene=compileScene','  const resources='),
  resources:between(producer,'  const resources=','  try{'),
  cap:between(producer,'    if(resources.nativeFragments','    const records='),
  cleanup:between(producer,'    for(const map of [scene.index.surfaces','  }\n}\n\nasync function main()')
};
const native=`import {compileScene} from '../../../../workbenches/furnished-house/scene.js';
import {PREPARATION_LIMITS} from '../../../../tools/prepare-source-support.mjs';
// Copied parts/blueprint/compile/resource/cap/cleanup statements are unchanged.
// Fenced phase wrappers expose one compilation to the proof callback.
export function withNativePair({model,sources,data,selected,portalStates},phase,observe,work){
  const policy=PREPARATION_LIMITS,owners=[...new Set(selected.owners)];
  if(owners.length!==selected.owners.length||owners.length!==2)throw Error('Proof requires the exact ordered pair');
  const {parts,estimate}=phase('source-part-preflight',()=>{
`+glue.parts+`    return {parts,estimate};
  });
  const {surfaces,openings}=phase('native-blueprint',()=>{
`+glue.blueprint+`    return {surfaces,openings};
  });
  observe('blueprint',{parts:parts.length,libraryTriangles:estimate,surfaces:surfaces.length,sourceTriangles:surfaces.reduce((n,s)=>n+s.triangles.length,0),openings:openings.length});
  const scene=phase('native-clipping',()=>{
`+glue.compile+`    return scene;
  });
`+glue.resources+`  try{
    observe('native-resources',resources);
    phase('native-postflight',()=>{
`+glue.cap+`    });
    return work({scene,resources,owners});
  }finally{
`+glue.cleanup+`    observe('native-cleanup',resources);
  }
}
`;
const outputs={'original-calculation.mjs':reference,'native-preparation.mjs':native};
for(const [name,code]of Object.entries(outputs))fs.writeFileSync(path.join(here,name),code);
const audit={version:1,sourceSeam:seam,baseline,baselineLfSha256:hash(base),producerLfSha256:hash(producer),noGeometryCalculation:true,
  referenceAdaptations:['Rebase exactly four imports to repository-relative URLs.','Wrap verbatim original helpers/contact/regions/continuity/declared/capture fragments in a local synchronous calculation call.','Supply native local index/nodes/active owners and capture-only links; graph scheduling/live decisions are not run or replaced.'],
  preparationAdaptations:['Use unchanged frozen PREPARATION_LIMITS without overrides.','Wrap verbatim source part/blueprint/native compile/cap statements in named timing phases.','Expose the single compiled pair to a synchronous callback sharing its records for large continuity and ownership cases.','Keep verbatim owned-map cleanup in finally; append a compact cleanup observation.'],
  referenceFragments:Object.fromEntries(Object.entries(fragments).map(([k,v])=>[k,{lfSha256:hash(v),bytes:Buffer.byteLength(v),verbatim:k!=='imports',text:v}])),
  preparationFragments:Object.fromEntries(Object.entries(glue).map(([k,v])=>[k,{lfSha256:hash(v),bytes:Buffer.byteLength(v),verbatim:true,text:v}])),
  outputs:Object.entries(outputs).map(([file,code])=>({file,lfSha256:hash(code),bytes:Buffer.byteLength(code)}))};
for(const [key,value]of Object.entries(fragments))if(key!=='imports')assert.ok(reference.includes(value),key);
for(const [key,value]of Object.entries(glue))assert.ok(native.includes(value),key);
fs.writeFileSync(path.join(here,'adaptation-audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({sourceOnly:true,verbatimReferenceFragments:Object.keys(fragments).length-1,verbatimPreparationFragments:Object.keys(glue).length,outputs:audit.outputs}));
