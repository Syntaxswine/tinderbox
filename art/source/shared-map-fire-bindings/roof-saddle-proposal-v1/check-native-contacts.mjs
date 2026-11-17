// Finite source contacts only. No actor, world, native activation, renderer or timer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {bounds,overlaps,unit,cross,sub} from '../../../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../../../workbenches/furnished-house/support.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const proposalPath='art/source/shared-map-fire-bindings/roof-saddle-proposal-v1/source-proposal.json',a=read(proposalPath);
const baseRaw=fs.readFileSync(path.join(root,a.baseBindings.path));
if(sha(baseRaw)!=='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba')throw Error('Original bindings changed');
if(a.status!=='UNAPPROVED_SINGLE_SOURCE_PROTOTYPE'||a.members.length!==1)throw Error('Only one proposed source fitting allowed');
const added=new Map(a.members.map(m=>[m.id,m])),base=new Map(JSON.parse(baseRaw).carriers.map(c=>[c.id,c]));
const hosts=new Set(Object.keys(a.namedOriginalParents)),permitted=new Set([...added.keys(),...hosts]);
if(hosts.size!==3||!hosts.has('carrier/roof/rear-tail'))throw Error('Unexpected proposed source parents');
const geometries=new Map(),shapes=new Map();
function geometry(p,expected){const raw=fs.readFileSync(path.join(root,p));if(sha(raw)!==expected)throw Error('Source geometry changed '+p);if(!geometries.has(p))geometries.set(p,JSON.parse(raw));return geometries.get(p);}
const shared=geometry(a.geometry.path,a.geometry.sha256);
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
  const ref=a.namedOriginalParents[id].find(r=>r.geometryPath===b.geometryPath);
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
const controls=a.proposedContacts.map(j=>{if(!permitted.has(j.child)||!permitted.has(j.parent))throw Error('Unexpected proposal contact');const contact=facets(j.child).some(t=>facets(j.parent).some(s=>overlaps(t.bounds,s.bounds,.00001)&&supportSurfacesTouch(t,s)));if(!contact)throw Error('Actual proposed contact absent '+j.child+' -> '+j.parent);return {child:j.child,parent:j.parent,nativeTriangleContact:true,accepted:false,groundAnchor:false};});
if(controls.length!==3||shapes.size!==4||geometries.size!==4)throw Error('Unexpected finite source contact scope');
const report={version:1,result:'PASS_PROPOSED_SOURCE_CONTACTS',proposalPath,proposalSha256:sha(fs.readFileSync(path.join(root,proposalPath))),geometrySha256:a.geometry.sha256,prototypeCount:1,originalParentCount:3,sourceShapesRead:shapes.size,geometryBuffersRead:geometries.size,nativeTriangleContacts:3,nativeTouchingFunctionSha256:sha(functionText),producerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),controls,nativeActivationStarted:false,runtimeOrJointAcceptance:false,rendererStarted:false};
if(process.argv.includes('--record'))fs.writeFileSync(path.join(here,'native-contact-results.json'),JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--check')){const old=read(path.relative(root,path.join(here,'native-contact-results.json')));if(JSON.stringify(old)!==JSON.stringify(report))throw Error('Non-reproducing proposal contacts');}
console.log(JSON.stringify(report));
