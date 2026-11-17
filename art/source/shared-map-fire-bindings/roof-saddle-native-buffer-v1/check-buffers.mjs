// Actual BufferGeometry/typed-array conversion and four-source contact check only.
// No renderer, native compiler, scene, world, support graph, build or actor.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../../../../src/runtime/three.js';
import {bounds,overlaps,unit,cross,sub} from '../../../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../../../workbenches/furnished-house/support.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=p=>fs.readFileSync(path.join(root,p)),read=p=>JSON.parse(raw(p).toString('utf8'));
const threeEntryLF=raw('src/runtime/three.js').toString('utf8').replace(/\r\n/g,'\n');
if(sha(threeEntryLF)!=='88fd0a63e9d80a3b179b8329b6f06fd794e433caa445937b067ffdbd89f747c4')throw Error('Unapproved shared Three entry source');
const manifestPath='assets/art/shared-map-support-additions/new-york-roof-saddle-native-v1/index.json',a=read(manifestPath),mapping=read(a.physicalRenderMapping.path),made=[];
if(new Uint8Array(new Uint16Array([0x0102]).buffer)[0]!==2)throw Error('Binary files require little-endian host');
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
function geometry(p){
 const data=read(p),g=new T.BufferGeometry();made.push(g);
 for(const [name,v] of Object.entries(data.attributes)){
  if(v.type!=='Float32Array')throw Error('Non-native attribute '+name);
  const attr=new T.Float32BufferAttribute(v.array,v.itemSize,!!v.normalized);
  if(!v.array.every((n,i)=>Object.is(n,attr.array[i])))throw Error('JSON values were not accepted Float32 data');
  g.setAttribute(name,attr);
 }
 g.setIndex(new T.BufferAttribute(new Uint16Array(data.index?.array??Array.from({length:g.attributes.position.count},(_,i)=>i)),1));
 return g;
}
const worldPoints=(g,m)=>{const matrix=new T.Matrix4().fromArray(m),p=new T.Vector3(),out=[];for(let i=0;i<g.attributes.position.count;i++)out.push(p.fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix).toArray());return out;};
const triangles=(g,points)=>{const idx=Array.from(g.index.array),out=[];for(let i=0;i<idx.length;i+=3)out.push(idx.slice(i,i+3).map(j=>points[j]));return out;};
try{
 const physical=geometry(a.geometry.path),render=geometry(a.renderGeometry.path),m=a.members[0].matrix,world=worldPoints(physical,m),renderWorld=worldPoints(render,m);
 const typedPins={};
 for(const [label,g] of [['physical',physical],['render',render]]){
  for(const [name,attr] of [...Object.entries(g.attributes),['index',g.index]]){
   const ref=a.binaryBuffers[label+'/'+name],actual=bytes(attr.array);
   if(sha(actual)!==ref.sha256||!actual.equals(raw(ref.path)))throw Error('Actual accepted buffer differs: '+label+'/'+name);
   typedPins[label+'/'+name]={type:attr.array.constructor.name,bytes:actual.length,sha256:sha(actual)};
  }
 }
 if(physical.attributes.position.count!==10||render.attributes.position.count!==48||physical.index.count!==48)throw Error('Unexpected one-piece topology');
 const physicalPos=physical.attributes.position.array,renderPos=render.attributes.position.array;
 for(let i=0;i<48;i++){
  const owner=mapping.renderToPhysicalVertex[i];
  for(let k=0;k<3;k++)if(!Object.is(renderPos[i*3+k],physicalPos[owner*3+k])||!Object.is(renderWorld[i][k],world[owner][k]))throw Error('Physical/render identity lost');
  if(owner!==physical.index.getX(i)||render.index.getX(i)!==i)throw Error('Triangle mapping changed');
 }
 const normalMatrix=new T.Matrix3().getNormalMatrix(new T.Matrix4().fromArray(m));let minimumNormalDot=Infinity;
 for(let i=0;i<16;i++){
  const t=renderWorld.slice(i*3,i*3+3),normal=new T.Vector3().subVectors(new T.Vector3(...t[1]),new T.Vector3(...t[0])).cross(new T.Vector3().subVectors(new T.Vector3(...t[2]),new T.Vector3(...t[0]))).normalize();
  for(let j=0;j<3;j++){
   const n=new T.Vector3().fromBufferAttribute(render.attributes.normal,i*3+j).applyNormalMatrix(normalMatrix);
   minimumNormalDot=Math.min(minimumNormalDot,n.dot(normal));if(n.dot(normal)<.999999)throw Error('Converted normal not outward');
  }
 }
 const body=a.members[0].id,shapes=new Map([[body,triangles(physical,world)]]),parentTriangles={};
 for(const [id,refs] of Object.entries(a.namedOriginalParents)){
  const ts=[];
  for(const ref of refs){
   if(sha(raw(ref.geometryPath))!==ref.sha256)throw Error('Original parent changed');
   const g=geometry(ref.geometryPath),points=worldPoints(g,ref.matrix),all=triangles(g,points),range=ref.sourceRange;
   ts.push(...(range?all.slice(range.start/3,(range.start+range.count)/3):all));
  }shapes.set(id,ts);parentTriangles[id]=ts;
 }
 if(shapes.size!==4||made.length!==5)throw Error('Only one physical piece, its render view and three named parents allowed');
 const facets=ts=>ts.map(t=>({kind:'wall',triangles:[t],bounds:bounds(t),normal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0]))),thickness:0}));
 const facetMap=new Map([...shapes].map(([id,ts])=>[id,facets(ts)]));
 const source=raw('workbenches/furnished-house/support.js').toString('utf8').replace(/\r\n/g,'\n'),fn=source.slice(source.indexOf('function touching(a,b) {'),source.indexOf('// Read-only geometry query'));
 if(sha(fn)!=='4a1c082c518c22d31bfbf6c6d01ff49d4b6589a246eb8182b662b48d16f58441')throw Error('Native contact predicate changed');
 const contacts=a.proposedContacts.map(j=>{
  if(!facetMap.has(j.child)||!facetMap.has(j.parent))throw Error('Out-of-scope parent');
  const port=a.ports.find(p=>p.id===j.portId);if(!port)throw Error('Fixed source port missing');
  const originalId=j.child===body?j.parent:j.child;if(originalId!==port.fixedParentCarrierId)throw Error('Port remapped to another parent');
  const fittingFacets=port.physicalTriangleIds.map(i=>facetMap.get(body)[i]);
  const parentIds=port.fixedOriginalParentGeometry.flatMap(r=>r.sourceTriangleIds),parentFacets=parentIds.map(i=>facetMap.get(originalId)[i]);
  if(fittingFacets.some(t=>!t)||parentFacets.some(t=>!t)||fittingFacets.length!==2||parentFacets.length!==2)throw Error('Fixed port source triangle selection lost');
  const left=j.child===body?fittingFacets:parentFacets,right=j.child===body?parentFacets:fittingFacets;
  const ok=left.some(t=>right.some(s=>overlaps(t.bounds,s.bounds,.00001)&&supportSurfacesTouch(t,s)));
  if(!ok)throw Error('Actual converted fixed-port contact failed '+j.portId);
  return {...j,nativeTriangleContact:true,physicalPortTriangleIds:port.physicalTriangleIds,fixedOriginalParentTriangleIds:parentIds,contactScope:'Only the fixed declared local port triangles',runtimePortLivenessAccepted:false};
 });
 const report={version:1,result:'PASS_ACTUAL_NATIVE_BUFFERS_AND_THREE_CONTACTS',manifestPath,manifestSha256:sha(raw(manifestPath)),physicalGeometrySha256:a.geometry.sha256,renderGeometrySha256:a.renderGeometry.sha256,
  producerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),threeEntryLFSha256:sha(threeEntryLF),threeEntryProducerCommit:'9df30ffc4b8e06ca3a36df2a624cb04f52480297',threeRevision:T.REVISION,typedArrayPins:typedPins,
  actualPhysicalLocalPositions:Array.from(physicalPos),actualPhysicalIndex:Array.from(physical.index.array),actualPhysicalWorldVertices:world,
  actualRenderLocalPositions:Array.from(renderPos),actualRenderWorldVertices:renderWorld,actualRenderUV:Array.from(render.attributes.uv.array),
  physicalRenderBitMappingEqual:true,minimumOutwardNormalDot:minimumNormalDot,originalParentWorldTriangles:parentTriangles,
  physicalShapeCount:4,geometryBuffersCreated:5,renderGeometryCountedAsAdditionalPhysicalBody:false,nativeTriangleContacts:3,contacts,nativeTouchingFunctionSha256:sha(fn),
  compilerActivationWorldGraphBuildOrRendererStarted:false,resourcesDisposedAtExit:true};
 const file=path.join(here,'actual-buffer-results.json');
 if(process.argv.includes('--record'))fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 if(process.argv.includes('--check')&&JSON.stringify(read(path.relative(root,file)))!==JSON.stringify(report))throw Error('Actual buffer evidence does not reproduce');
 console.log(JSON.stringify({result:report.result,physicalShapeCount:4,geometryBuffersCreated:5,nativeTriangleContacts:3,minimumOutwardNormalDot:minimumNormalDot,compilerActivationWorldGraphBuildOrRendererStarted:false}));
}finally{for(const g of made)g.dispose();}
