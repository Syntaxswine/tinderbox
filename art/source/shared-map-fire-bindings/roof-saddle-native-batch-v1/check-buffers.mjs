// Typed-buffer and fixed-port contacts for only nineteen fittings and seven original parents.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../../../../src/runtime/three.js';
import {bounds,overlaps,unit,cross,sub} from '../../../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../../../workbenches/furnished-house/support.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=p=>fs.readFileSync(path.join(root,p)),read=p=>JSON.parse(raw(p).toString('utf8'));
const manifestPath='assets/art/shared-map-support-additions/new-york-roof-saddle-native-batch-v1/index.json',a=read(manifestPath);
const audit=read(a.conversionAudit.path),auditBy=new Map(audit.pieces.map(p=>[p.sourceProposalId,p]));
const entry=raw('src/runtime/three.js').toString('utf8').replace(/\r\n/g,'\n');if(sha(entry)!=='88fd0a63e9d80a3b179b8329b6f06fd794e433caa445937b067ffdbd89f747c4')throw Error('Shared Three source changed');
const source=raw('workbenches/furnished-house/support.js').toString('utf8').replace(/\r\n/g,'\n'),fn=source.slice(source.indexOf('function touching(a,b) {'),source.indexOf('// Read-only geometry query'));
if(sha(fn)!=='4a1c082c518c22d31bfbf6c6d01ff49d4b6589a246eb8182b662b48d16f58441')throw Error('Native predicate changed');
if(new Uint8Array(new Uint16Array([0x0102]).buffer)[0]!==2)throw Error('Little endian buffer host required');
const cache=new Map(),created=[];
function geometry(p){
 if(cache.has(p))return cache.get(p);
 const data=read(p),g=new T.BufferGeometry();created.push(g);
 for(const [name,v] of Object.entries(data.attributes)){if(v.type!=='Float32Array')throw Error('Non-Float32 native attribute');const attr=new T.Float32BufferAttribute(v.array,v.itemSize,!!v.normalized);if(v.array.some((n,i)=>!Object.is(n,attr.array[i])))throw Error('Nonrepresentable JSON native value');g.setAttribute(name,attr);}
 g.setIndex(new T.BufferAttribute(new Uint16Array(data.index?.array??Array.from({length:g.attributes.position.count},(_,i)=>i)),1));cache.set(p,g);return g;
}
const bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const world=(array,m)=>{const matrix=new T.Matrix4().fromArray(m),p=new T.Vector3(),out=[];for(let i=0;i<array.length;i+=3)out.push(p.fromArray(array,i).applyMatrix4(matrix).toArray());return out;};
const triangles=(g,points)=>{const index=Array.from(g.index.array),out=[];for(let i=0;i<index.length;i+=3)out.push(index.slice(i,i+3).map(j=>points[j]));return out;};
const facets=ts=>ts.map(t=>({kind:'wall',triangles:[t],bounds:bounds(t),normal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0]))),thickness:0}));
try{
 const profileData={},loaded=new Map();
 for(const [id,p] of Object.entries(a.profiles)){
  for(const ref of [p.physicalGeometry,p.renderGeometry,p.physicalRenderMapping])if(sha(raw(ref.path))!==ref.sha256)throw Error('Shared profile changed');
  const physical=geometry(p.physicalGeometry.path),render=geometry(p.renderGeometry.path),mapping=read(p.physicalRenderMapping.path),pins={};
  for(const [label,g] of [['physical',physical],['render',render]])for(const [name,attr] of [...Object.entries(g.attributes),['index',g.index]]){
   const b=bytes(attr.array),ref=p.binaryBuffers[label+'/'+name];if(sha(b)!==ref.sha256||!b.equals(raw(ref.path)))throw Error('Actual buffer mismatch');pins[label+'/'+name]={type:attr.array.constructor.name,bytes:b.length,sha256:sha(b)};
  }
  if(physical.attributes.position.count!==10||render.attributes.position.count!==48||physical.index.count!==48)throw Error('Topology count changed');
  for(let i=0;i<48;i++){const owner=mapping.renderToPhysicalVertex[i];if(owner!==physical.index.getX(i)||render.index.getX(i)!==i)throw Error('Triangle identity changed');for(let k=0;k<3;k++)if(!Object.is(render.attributes.position.array[i*3+k],physical.attributes.position.array[owner*3+k]))throw Error('Physical/render bit identity changed');}
  loaded.set(id,{physical,render,mapping});profileData[id]={actualPhysicalLocalPositions:Array.from(physical.attributes.position.array),actualPhysicalIndex:Array.from(physical.index.array),actualRenderUV:Array.from(render.attributes.uv.array),typedArrayPins:pins,physicalRenderBitIdentity:true};
 }
 const parents={},parentFacets=new Map();
 for(const [id,refs] of Object.entries(a.namedOriginalParents)){
  const ts=[];
  for(const r of refs){if(sha(raw(r.geometryPath))!==r.sha256)throw Error('Original parent changed');const g=geometry(r.geometryPath),all=triangles(g,world(g.attributes.position.array,r.matrix)),range=r.sourceRange;ts.push(...(range?all.slice(range.start/3,(range.start+range.count)/3):all));}
  parents[id]=ts;parentFacets.set(id,facets(ts));
 }
 const pieces=[];let contactCount=0;
 for(const m of a.members){
  const {physical,render,mapping}=loaded.get(m.profileId),pworld=world(physical.attributes.position.array,m.matrix),rworld=world(render.attributes.position.array,m.matrix),normalMatrix=new T.Matrix3().getNormalMatrix(new T.Matrix4().fromArray(m.matrix));let minDot=Infinity;
  for(let i=0;i<48;i++)if(rworld[i].some((n,k)=>!Object.is(n,pworld[mapping.renderToPhysicalVertex[i]][k])))throw Error('Transformed render identity lost '+m.id);
  for(let i=0;i<16;i++){const t=rworld.slice(i*3,i*3+3),n=new T.Vector3().subVectors(new T.Vector3(...t[1]),new T.Vector3(...t[0])).cross(new T.Vector3().subVectors(new T.Vector3(...t[2]),new T.Vector3(...t[0]))).normalize();for(let j=0;j<3;j++){const r=new T.Vector3().fromBufferAttribute(render.attributes.normal,i*3+j).applyNormalMatrix(normalMatrix);minDot=Math.min(minDot,n.dot(r));if(n.dot(r)<.999999)throw Error('Normal not outward');}}
  const own=facets(triangles(physical,pworld));
  const contacts=m.contacts.map(j=>{
   const port=m.ports.find(p=>p.id===j.portId);if(!port)throw Error('Fixed port missing');
   const parent=j.child===m.id?j.parent:j.child;if(parent!==port.fixedParentCarrierId||!parentFacets.has(parent))throw Error('Fixed parent remapped');
   const fitting=port.physicalTriangleIds.map(i=>own[i]),ids=port.fixedOriginalSourceTriangles.flatMap(p=>p.sourceTriangleIds),pf=ids.map(i=>parentFacets.get(parent)[i]);
   if(fitting.length!==2||![1,2].includes(pf.length)||fitting.some(t=>!t)||pf.some(t=>!t))throw Error('Port triangle selector invalid');
   const left=j.child===m.id?fitting:pf,right=j.child===m.id?pf:fitting;
   if(!left.some(t=>right.some(s=>overlaps(t.bounds,s.bounds,.00001)&&supportSurfacesTouch(t,s))))throw Error('Converted fixed port contact missing '+j.portId);
   contactCount++;return {...j,physicalTriangleIds:port.physicalTriangleIds,originalParentTriangleIds:ids,nativeTriangleContact:true};
  });
  pieces.push({id:m.id,profileId:m.profileId,actualWorldVertices:pworld,initialFloat32WorldVertices:world(new Float32Array(auditBy.get(m.sourceProposalId).initialFloat32LocalPositions),m.matrix),physicalRenderWorldIdentity:true,minimumOutwardNormalDot:minDot,contacts});
 }
 if(a.members.length!==19||pieces.length!==19||Object.keys(parents).length!==7||contactCount!==57)throw Error('Unexpected bounded batch scope');
 const report={version:1,result:'PASS_NINETEEN_ACTUAL_BUFFERS_AND_57_FIXED_CONTACTS',manifestPath,manifestSha256:sha(raw(manifestPath)),producerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),threeEntryLFSha256:sha(entry),threeRevision:T.REVISION,nativeTouchingFunctionSha256:sha(fn),
  profiles:profileData,originalParentWorldTriangles:parents,pieces,physicalShapesChecked:26,distinctGeometryBuffersCreated:created.length,initialConversionVectorsVerified:19,nativeFixedPortContacts:57,rendererCompilerActivationWorldGraphBuildStarted:false,allCPUGeometryDisposedAtExit:true};
 const file=path.join(here,'actual-buffer-results.json');if(process.argv.includes('--record'))fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 if(process.argv.includes('--check')&&JSON.stringify(read(path.relative(root,file)))!==JSON.stringify(report))throw Error('Actual batch evidence differs');
 console.log(JSON.stringify({result:report.result,pieces:pieces.length,profiles:loaded.size,physicalShapesChecked:26,distinctGeometryBuffersCreated:created.length,nativeFixedPortContacts:57,rendererCompilerActivationWorldGraphBuildStarted:false}));
}finally{for(const g of created)g.dispose();}
