// Finite source contacts only. No actor, world, native activation, renderer or timer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {bounds,overlaps,unit,cross,sub} from '../../../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../../../workbenches/furnished-house/support.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifestPath='assets/art/shared-map-support-additions/new-york-parapet-clear-blocking-v1/index.json',a=read(manifestPath);
const baseRaw=fs.readFileSync(path.join(root,a.baseBindings.path));
if(sha(baseRaw)!=='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba')throw Error('Original binding pin changed');
const designRaw=fs.readFileSync(path.join(root,a.sourceDesign.path));
if(sha(designRaw)!=='481294255d3afd8dd0ea208d2dc0cc1c7adf1f2e6108e5929a0e887bbb1abfa4')throw Error('Approved clear row pin changed');
const rows=JSON.parse(designRaw).families.flatMap(f=>f.candidates).filter(c=>c.rectangularRepeatReadyForApproval);
const expectedIds=new Set(rows.map(c=>c.proposalId.replace('proposal-only/blocking/','carrier/clear-parapet-blocking/')));
const added=new Map(a.members.map(m=>[m.id,m])),base=new Map(JSON.parse(baseRaw).carriers.map(c=>[c.id,c]));
if(added.size!==96||a.members.length!==96||[...added.keys()].some(id=>!expectedIds.has(id)))throw Error('Unexpected source scope');
const hosts=new Set(rows.flatMap(c=>[c.lowerSourceCarrierId,c.upperSourceCarrierId]));
const permitted=new Set([...added.keys(),...hosts]);
const geometries=new Map(),shapes=new Map();
function geometry(p,expected){
 const raw=fs.readFileSync(path.join(root,p));
 if(expected&&sha(raw)!==expected)throw Error('Geometry changed: '+p);
 if(!geometries.has(p))geometries.set(p,JSON.parse(raw));
 return geometries.get(p);
}
const shared=geometry(a.geometry.path,a.geometry.sha256);
if(sha(fs.readFileSync(path.join(root,a.geometry.path)).subarray(0,-1))!==a.geometry.id)throw Error('Primitive canonical identity changed');
const point=(p,m)=>[0,1,2].map(k=>m[k]*p[0]+m[4+k]*p[1]+m[8+k]*p[2]+m[12+k]);
function transformed(g,m,range){
 const pos=g.attributes.position.array,index=g.index?.array??Array.from({length:pos.length/3},(_,i)=>i);
 const start=range?.start??0,count=range?.count??index.length,out=[];
 for(let i=start;i<start+count;i+=3)out.push(index.slice(i,i+3).map(j=>point(pos.slice(j*3,j*3+3),m)));
 return out;
}
function shape(id){
 if(!permitted.has(id))throw Error('Out-of-scope source requested: '+id);
 if(shapes.has(id))return shapes.get(id);
 let out=[];
 if(added.has(id))out=transformed(shared,added.get(id).matrix);
 else for(const b of base.get(id).renderBindings){
  if(b.physicalContribution!=='carrier-solid')continue;
  const ref=a.joins.flatMap(j=>[j.childRegion,j.parentRegion]).flatMap(r=>r.geometryRefs).find(r=>r.geometryPath===b.geometryPath);
  if(!ref)throw Error('Unpinned original parent');
  out.push(...transformed(geometry(b.geometryPath,ref.sha256),b.matrix,b.sourceRange));
 }
 shapes.set(id,out);return out;
}
const facetCache=new Map();
function facets(id){
 if(!facetCache.has(id))facetCache.set(id,shape(id).map(t=>({kind:'wall',triangles:[t],bounds:bounds(t),normal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0]))),thickness:0})));
 return facetCache.get(id);
}
const fn=fs.readFileSync(path.join(root,'workbenches/furnished-house/support.js'),'utf8').replace(/\r\n/g,'\n');
const functionText=fn.slice(fn.indexOf('function touching(a,b) {'),fn.indexOf('// Read-only geometry query'));
const before=read('art/source/shared-map-fire-bindings/reachability-review-v1/native-contact-results.json');
if(sha(functionText)!==before.nativeTouchingFunctionSha256)throw Error('Native triangle predicate changed');
const controls=a.joins.map(j=>{
 if(!added.has(j.evidence.blockCarrierId)||!permitted.has(j.childCarrierId)||!permitted.has(j.parentCarrierId))throw Error('Unexpected bearing scope');
 const contact=facets(j.childCarrierId).some(t=>facets(j.parentCarrierId).some(s=>overlaps(t.bounds,s.bounds,.00001)&&supportSurfacesTouch(t,s)));
 if(!contact)throw Error('Actual contact missing: '+j.id);
 return {joinId:j.id,blockCarrierId:j.evidence.blockCarrierId,blockFace:j.evidence.blockFace,childCarrierId:j.childCarrierId,parentCarrierId:j.parentCarrierId,nativeTriangleContact:true,groundAnchor:false};
});
if(controls.length!==192||new Set(controls.map(c=>c.joinId)).size!==192||controls.filter(c=>c.blockFace==='top').length!==96||controls.filter(c=>c.blockFace==='bottom').length!==96||shapes.size!==112||hosts.size!==16)throw Error('Incomplete finite check');
const report={version:1,result:'PASS',scope:'Only 96 new clear pieces plus their 16 named original parents. Triangle predicate only; no native activation or runtime behavior acceptance.',
 manifestPath,manifestSha256:sha(fs.readFileSync(path.join(root,manifestPath))),geometrySha256:a.geometry.sha256,
 sharedGeometryCount:1,uniqueMembers:96,originalParentCount:18,sourceShapesRead:shapes.size,
 originalParentIds:[...hosts].sort(),geometryBuffersRead:geometries.size,nativeTriangleContacts:192,
 nativeTouchingFunctionSha256:sha(functionText),producerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),
 controls,runtimeBehaviorAcceptance:false,nativeActivationStarted:false,rendererStarted:false};
if(process.argv.includes('--record'))fs.writeFileSync(path.join(here,'native-contact-results.json'),JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--check')){
 const old=read(path.relative(root,path.join(here,'native-contact-results.json')));
 if(JSON.stringify(old)!==JSON.stringify(report))throw Error('Non-reproducing native source contacts');
}
console.log(JSON.stringify({...report,controls:undefined,originalParentIds:undefined}));
