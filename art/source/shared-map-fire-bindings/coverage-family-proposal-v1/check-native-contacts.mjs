// Fresh CPU-only source-facet contacts; never runs the simulator or renderer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {bounds,overlaps,unit,cross,sub} from '../../../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../../../workbenches/furnished-house/support.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const relationships=JSON.parse(fs.readFileSync(path.join(here,'relationships.json'),'utf8')).relationships;
const bindings=JSON.parse(fs.readFileSync(path.join(here,'geometry-bindings.json'),'utf8')).carriers;
const geometries=new Map(),shapes=new Map(),facetsById=new Map();
const point=(p,m)=>[0,1,2].map(k=>m[k]*p[0]+m[k+4]*p[1]+m[k+8]*p[2]+m[k+12]);
function shape(id){if(shapes.has(id))return shapes.get(id);let out=[];for(const b of bindings[id]){
 let g=geometries.get(b.geometryPath);if(!g){const raw=fs.readFileSync(path.join(root,b.geometryPath));if(sha(raw)!==b.sha256)throw Error('Source geometry changed: '+b.geometryPath);g=JSON.parse(raw);geometries.set(b.geometryPath,g);}
 const positions=g.attributes.position.array,index=g.index?.array??Array.from({length:positions.length/3},(_,i)=>i),start=b.sourceRange?.start??0,count=b.sourceRange?.count??index.length;
 for(let i=start;i<start+count;i+=3)out.push(index.slice(i,i+3).map(j=>point(positions.slice(j*3,j*3+3),b.matrix)));
 }shapes.set(id,out);return out;}
function facets(id){if(facetsById.has(id))return facetsById.get(id);const f=shape(id).map(t=>({kind:'wall',triangles:[t],bounds:bounds(t),normal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0]))),thickness:0}));facetsById.set(id,f);return f;}
const fn=fs.readFileSync(path.join(root,'workbenches/furnished-house/support.js'),'utf8').replace(/\r\n/g,'\n'),touchingText=fn.slice(fn.indexOf('function touching(a,b) {'),fn.indexOf('// Read-only geometry query'));
const reference=read('art/source/shared-map-fire-bindings/reachability-review-v1/native-contact-results.json');
if(sha(touchingText)!==reference.nativeTouchingFunctionSha256)throw Error('Native triangle contact function changed');
const pairs=new Map();for(const r of relationships){const key=r.childCarrierId+'\n'+r.parentCarrierId;if(!pairs.has(key))pairs.set(key,{childCarrierId:r.childCarrierId,parentCarrierId:r.parentCarrierId,proposalIds:[]});pairs.get(key).proposalIds.push(r.id);}
const results=[];for(const pair of pairs.values()){
 const child=facets(pair.childCarrierId),parent=facets(pair.parentCarrierId),contact=child.some(t=>parent.some(s=>overlaps(t.bounds,s.bounds,.00001)&&supportSurfacesTouch(t,s)));
 results.push({...pair,nativeSourceFacetContact:contact});
}
const report={version:1,result:'COMPLETE',scope:'Source-facet contact evidence only; strict solid overlap and intended dependency remain separate. A contained solid can overlap without crossing the other solid surface.',proposalSha256:sha(fs.readFileSync(path.join(here,'relationships.json'))),nativeTouchingFunctionSha256:sha(touchingText),producerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),canonicalProposedPairs:relationships.length,uniqueDirectedPairs:results.length,nativeSourceFacetContacts:results.filter(r=>r.nativeSourceFacetContact).length,noSourceFacetCrossing:results.filter(r=>!r.nativeSourceFacetContact).map(r=>({childCarrierId:r.childCarrierId,parentCarrierId:r.parentCarrierId})),rendererStarted:false,runtimeAcceptance:false,results};
if(process.argv.includes('--record'))fs.writeFileSync(path.join(here,'native-contact-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:undefined,noSourceFacetCrossing:report.noSourceFacetCrossing.length}));
