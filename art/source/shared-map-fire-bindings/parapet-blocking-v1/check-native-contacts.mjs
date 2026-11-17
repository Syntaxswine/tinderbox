// Foreground CPU/source checks only: no actor, simulation, renderer or timer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {bounds,overlaps,unit,cross,sub} from '../../../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../../../workbenches/furnished-house/support.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const sha=data=>createHash('sha256').update(data).digest('hex'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifestPath='assets/art/shared-map-support-additions/new-york-parapet-blocking-v1/index.json',a=read(manifestPath),baseRaw=fs.readFileSync(path.join(root,a.baseBindings.path));
if(sha(baseRaw)!==a.baseBindings.sha256||a.baseBindings.sha256!=='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba')throw Error('Original bindings changed');
const geometryRaw=fs.readFileSync(path.join(root,a.geometry.path));if(sha(geometryRaw)!==a.geometry.sha256||sha(geometryRaw.subarray(0,-1))!==a.geometry.id)throw Error('Shared geometry hash changed');
const added=new Map(a.members.map(m=>[m.id,m])),base=new Map(JSON.parse(baseRaw).carriers.map(c=>[c.id,c])),geometries=new Map([[a.geometry.path,JSON.parse(geometryRaw)]]);
const point=(p,m)=>[0,1,2].map(k=>m[k]*p[0]+m[4+k]*p[1]+m[8+k]*p[2]+m[12+k]);
function transformed(g,m,range){const positions=g.attributes.position.array,index=g.index?.array??Array.from({length:positions.length/3},(_,i)=>i),start=range?.start??0,count=range?.count??index.length,out=[];for(let i=start;i<start+count;i+=3)out.push(index.slice(i,i+3).map(j=>point(positions.slice(j*3,j*3+3),m)));return out;}
const shapes=new Map();function shape(id){if(shapes.has(id))return shapes.get(id);const member=added.get(id);let out=[];if(member)out=transformed(geometries.get(a.geometry.path),member.matrix);else for(const b of base.get(id).renderBindings){if(b.physicalContribution!=='carrier-solid')continue;let g=geometries.get(b.geometryPath);if(!g){g=read(b.geometryPath);geometries.set(b.geometryPath,g);}out.push(...transformed(g,b.matrix,b.sourceRange));}shapes.set(id,out);return out;}
const facets=ts=>ts.map(t=>({kind:'wall',triangles:[t],bounds:bounds(t),normal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0]))),thickness:0}));
const fn=fs.readFileSync(path.join(root,'workbenches/furnished-house/support.js'),'utf8').replace(/\r\n/g,'\n'),functionText=fn.slice(fn.indexOf('function touching(a,b) {'),fn.indexOf('// Read-only geometry query'));
const before=read('art/source/shared-map-fire-bindings/reachability-review-v1/native-contact-results.json');if(sha(functionText)!==before.nativeTouchingFunctionSha256)throw Error('Native triangle contact function changed');
const results=a.joins.map(j=>{const child=facets(shape(j.childCarrierId)),parent=facets(shape(j.parentCarrierId)),contact=child.some(t=>parent.some(s=>overlaps(t.bounds,s.bounds,.00001)&&supportSurfacesTouch(t,s)));if(!contact)throw Error('Actual bearing does not contact '+j.childCarrierId+' -> '+j.parentCarrierId);return {blockCarrierId:j.evidence.blockCarrierId,blockFace:j.evidence.blockFace,childCarrierId:j.childCarrierId,parentCarrierId:j.parentCarrierId,nativeTriangleContact:true,groundAnchor:false};});
if(added.size!==48||results.length!==96||results.filter(r=>r.blockFace==='bottom').length!==48||results.filter(r=>r.blockFace==='top').length!==48)throw Error('Unexpected addition scope');
const report={version:1,result:'PASS',scope:'Actual source triangle contact only; runtime cold/active accounting, local parent loss and rendered acceptance remain separate.',manifestPath,manifestSha256:sha(fs.readFileSync(path.join(root,manifestPath))),geometrySha256:a.geometry.sha256,sharedGeometryCount:1,uniqueMembers:48,nativeTriangleContacts:96,nativeTouchingFunctionSha256:sha(functionText),producerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),controls:results,runtimeBehaviorAcceptance:false,rendererStarted:false};
if(process.argv.includes('--record'))fs.writeFileSync(path.join(here,'native-contact-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,controls:undefined}));
