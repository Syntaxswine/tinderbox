/** Authoring/review data reader only. No renderer, simulation or runtime factory. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createProbeMeshAdapter,adapterProof} from './blender-mesh-adapter.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function readScalarBytes(bytes,count){
  if(bytes.byteLength!==count*4)throw Error('Full-sized scalar byte length mismatch');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),values=new Float32Array(count),roundtrip=Buffer.alloc(bytes.length);
  for(let i=0;i<count;i++){const v=view.getFloat32(i*4,true);if(!Number.isFinite(v))throw Error('Nonfinite scalar');values[i]=v;roundtrip.writeFloatLE(v,i*4);}
  if(!roundtrip.equals(bytes))throw Error('Float32 little-endian byte roundtrip mismatch');
  return values;
}
export function voxelCentre(index,dimensions,origin,spacing){
  const [nx,ny,nz]=dimensions;if(!Number.isInteger(index)||index<0||index>=nx*ny*nz)throw Error('Voxel index outside grid');
  return [index%nx,Math.floor(index/nx)%ny,Math.floor(index/(nx*ny))].map((n,i)=>origin[i]+n*spacing[i]);
}
export function toGame(point,matrix){return matrix.slice(0,3).map(row=>row[0]*point[0]+row[1]*point[1]+row[2]*point[2]+row[3]);}
export function trilinear(values,dimensions,q){
  const base=q.map(Math.floor),t=q.map((v,i)=>v-base[i]);let result=0;const [nx,ny,nz]=dimensions;
  for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){
    const ix=base[0]+x,iy=base[1]+y,iz=base[2]+z;
    if(ix>=0&&ix<nx&&iy>=0&&iy<ny&&iz>=0&&iz<nz)result+=values[ix+nx*(iy+ny*iz)]*(x?t[0]:1-t[0])*(y?t[1]:1-t[1])*(z?t[2]:1-t[2]);
  }return result;
}
export function surfaceResidual(vertices,field,dimensions,origin,spacing,threshold,indexShift=0){
  let sum=0,max=0,sumSquared=0;const errors=[];for(let i=0;i<vertices.length;i+=3){
    const q=[0,1,2].map(k=>(vertices[i+k]-origin[k])/spacing[k]+indexShift),e=Math.abs(trilinear(field,dimensions,q)-threshold);sum+=e;sumSquared+=e*e;max=Math.max(max,e);errors.push(e);
  }errors.sort((a,b)=>a-b);const percentile=p=>errors[Math.ceil(p*(errors.length-1))];
  return {meanAbsoluteError:sum/errors.length,rootMeanSquareError:Math.sqrt(sumSquared/errors.length),maximumAbsoluteError:max,medianAbsoluteError:percentile(.5),p90AbsoluteError:percentile(.9),p95AbsoluteError:percentile(.95),p99AbsoluteError:percentile(.99),indexShift};
}
function sourceFile(root,record){
  const p=path.resolve(root,record.path);if(!p.startsWith(path.resolve(root)+path.sep))throw Error('Export path escaped probe');
  const b=fs.readFileSync(p);if(b.length!==record.bytes||hash(b)!==record.sha256)throw Error('Export bytes/hash mismatch: '+record.path);return b;
}
export function verifyProbe(manifestPath,{meshAdapter=false}={}){
  const root=path.dirname(manifestPath),m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(m.status!=='data-and-mesh-export-pass'||m.frames.length!==24||m.newRuntimeAsset!==false||m.noCustomSolver!==true)throw Error('Not a completed stage1 authoring export');
  const run=JSON.parse(fs.readFileSync(path.join(root,'run.json'),'utf8'));
  if(!run.valid)throw Error('Supervisor did not validate the completed lifetime');
  const channels={density:new Set(),temperature:new Set(),flame:new Set()},nonzero={density:0,temperature:0,flame:0};
  for(const f of m.frames){
    if(f.frame!==m.frames.indexOf(f)+1||f.timeSeconds!==(f.frame-1)/30)throw Error('Frame clock mismatch');
    if(f.resolution.length!==3||f.resolution.some(n=>!Number.isInteger(n)||n<1||n>32))throw Error('Grid dimensions escaped stage1');
    const count=f.resolution.reduce((a,b)=>a*b,1);if(count<=32)throw Error('Not a full domain');
    for(const name of Object.keys(channels)){
      const r=f.channels[name],values=readScalarBytes(sourceFile(root,r),count);let min=Infinity,max=-Infinity,n=0;
      for(const v of values){min=Math.min(min,v);max=Math.max(max,v);if(v!==0)n++;}
      if(min!==r.min||max!==r.max||n!==r.nonzero)throw Error('Decoded statistics differ from Blender: '+name);
      for(const sample of r.samples)if(values[sample.index]!==sample.value)throw Error('Actual exported sample mismatch');
      channels[name].add(r.sha256);if(f.frame<=16)nonzero[name]+=n;
    }
    for(let i=0;i<3;i++)if(Math.abs((f.domainWorldBounds.max[i]-f.domainWorldBounds.min[i])/f.resolution[i]-f.voxelSize[i])>1e-10)throw Error('Voxel/world scale mismatch');
  }
  for(const name of Object.keys(channels))if(channels[name].size<2||nonzero[name]===0)throw Error('Missing active temporal data: '+name);
  const vf=path.resolve(root,m.vdb.path);if(!vf.startsWith(path.resolve(root)+path.sep)||hash(fs.readFileSync(vf))!==m.vdb.sha256||!m.vdb.gridNames.includes('flame'))throw Error('Named actual VDB proof mismatch');
  const frameMatch=path.basename(m.vdb.path).match(/(\d+)\.vdb$/);if(!frameMatch)throw Error('Actual VDB frame identity unavailable');
  const sourceFrame=m.frames.find(f=>f.frame===Number(frameMatch[1]));if(!sourceFrame)throw Error('VDB source frame absent');
  const flame=readScalarBytes(sourceFile(root,sourceFrame.channels.flame),sourceFrame.resolution.reduce((a,b)=>a*b,1));
  let adapter=null;
  if(meshAdapter){
    if(meshAdapter!==adapterProof.id)throw Error('Unsupported mesh adapter');
    for(const [name,expected]of Object.entries(adapterProof.inputHashes))if(hash(fs.readFileSync(path.join(root,name)))!==expected)throw Error('Exact adapter input changed: '+name);
    if(hash(fs.readFileSync(new URL('./blender_probe.py',import.meta.url)))!==adapterProof.authoringProbeSha256)throw Error('Authoring target-transform source changed');
    const metadata=JSON.parse(fs.readFileSync(path.join(root,'metadata.json'),'utf8')),settings=JSON.parse(fs.readFileSync(new URL('./settings.json',import.meta.url),'utf8'));
    adapter=createProbeMeshAdapter({manifest:m,metadata,settings});
  }
  const alignment=[];
  if(m.meshes.length!==2)throw Error('Expected two threshold mesh checks');
  for(const mesh of m.meshes){
    if(mesh.emptyTargetBefore.vertices!==0||mesh.emptyTargetBefore.polygons!==0||mesh.grid!=='flame'||mesh.vertices<3||mesh.triangles<1)throw Error('Mesh is not from an empty named-flame target');
    const values=readScalarBytes(sourceFile(root,mesh.verticesFile),mesh.vertices*3),indices=sourceFile(root,mesh.indicesFile);
    const corrected=adapter?adapter.adaptVertices(values):values;
    const residual=surfaceResidual(corrected,flame,sourceFrame.resolution,sourceFrame.voxelCentreOriginBlenderWorld,sourceFrame.voxelSize,mesh.threshold);
    const rawResidual=surfaceResidual(values,flame,sourceFrame.resolution,sourceFrame.voxelCentreOriginBlenderWorld,sourceFrame.voxelSize,mesh.threshold);
    const correctedBounds={min:[0,1,2].map(axis=>{let n=Infinity;for(let i=axis;i<corrected.length;i+=3)n=Math.min(n,corrected[i]);return n;}),max:[0,1,2].map(axis=>{let n=-Infinity;for(let i=axis;i<corrected.length;i+=3)n=Math.max(n,corrected[i]);return n;})};
    alignment.push({threshold:mesh.threshold,rawResidual,comparedResidual:residual,correctedBoundsBlenderWorld:correctedBounds});
    if(residual.meanAbsoluteError>sourceFrame.channels.flame.max*.075)throw Error('Actual mesh/scalar coordinate alignment failed: '+JSON.stringify(residual));
    if(indices.length!==mesh.triangles*3*4)throw Error('Triangle byte count mismatch');
    for(let i=0;i<indices.length;i+=4)if(indices.readUInt32LE(i)>=mesh.vertices)throw Error('Triangle index outside actual mesh');
    for(let axis=0;axis<3;axis++){
      let min=Infinity,max=-Infinity;for(let i=axis;i<values.length;i+=3){min=Math.min(min,values[i]);max=Math.max(max,values[i]);}
      if(Math.abs(min-mesh.boundsBlenderWorld.min[axis])>1e-6||Math.abs(max-mesh.boundsBlenderWorld.max[axis])>1e-6)throw Error('Decoded mesh bounds mismatch');
    }
  }
  if(m.meshes[0].verticesFile.sha256===m.meshes[1].verticesFile.sha256)throw Error('Threshold-insensitive noop mesh');
  return {status:'authoring-byte-and-mesh-roundtrip-pass',scope:'Not production engine integration, appearance acceptance or GPU cost evidence',frames:m.frames.length,resolution:m.frames[0].resolution,channelUniqueFrames:Object.fromEntries(Object.entries(channels).map(([k,v])=>[k,v.size])),activeNonzeroVoxels:nonzero,meshes:m.meshes.map(x=>({threshold:x.threshold,vertices:x.vertices,triangles:x.triangles})),allScalarBytesRoundtripped:true,actualVdbVerified:true,surfaceAlignment:alignment,meshAdapter:adapter?{id:adapter.id,transformP:adapter.transformP,offsetTargetMetres:adapter.offsetTargetMetres,witnesses:adapter.witnesses,scalarOriginUnchanged:true,originalBuffersUnchanged:true,contourCaveat:adapterProof.contourCaveat}:null};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(!process.argv[2])throw Error('Usage: node reader.mjs PATH/TO/export-manifest.json');
  const flag=process.argv[3];if(flag&&flag!=='--blender-mesh-adapter')throw Error('Only --blender-mesh-adapter is supported');
  console.log(JSON.stringify(verifyProbe(path.resolve(process.argv[2]),{meshAdapter:flag?adapterProof.id:false}),null,2));
}
