/** Independent original-data reader; no renderer, solver or input writes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {scalarCentre,scalarBoundsToGame,validateGrid} from '../../../../assets/art/fire-realism/fluid-contact/space.js';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function readF32LE(bytes,count){
  if(!(bytes instanceof Uint8Array)||bytes.byteLength!==count*4)throw Error('Full scalar byte extent mismatch');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),array=new Float32Array(count),roundtrip=new Uint8Array(count*4),back=new DataView(roundtrip.buffer);
  for(let i=0;i<count;i++){const value=view.getFloat32(i*4,true);if(!Number.isFinite(value))throw Error('Nonfinite scalar');array[i]=value;back.setFloat32(i*4,value,true);}
  if(sha(bytes)!==sha(roundtrip))throw Error('Scalar f32LE byte roundtrip failed');return array;
}
export function positiveAudit(values,grid,contactHeight){
  const count=validateGrid(grid),[nx,ny,nz]=grid.resolution;if(values.length!==count)throw Error('Actual scalar count mismatch');
  let positive=0,contactCentreOutside=0,contactHaloOutside=0,belowGround=0;const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],boundary={xMin:0,xMax:0,yMin:0,yMax:0,zMin:0,zMax:0};
  for(let i=0;i<count;i++)if(values[i]>0){
    positive++;const x=i%nx,y=Math.floor(i/nx)%ny,z=Math.floor(i/(nx*ny)),p=[x,y,z].map((n,k)=>grid.origin[k]+n*grid.spacing[k]);
    for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
    if(x===0)boundary.xMin++;if(x===nx-1)boundary.xMax++;if(y===0)boundary.yMin++;if(y===ny-1)boundary.yMax++;if(z===0)boundary.zMin++;if(z===nz-1)boundary.zMax++;
    if(p[2]<0)belowGround++;
    if(p[2]<=contactHeight&&(Math.abs(p[0])>.5||Math.abs(p[1])>.5))contactCentreOutside++;
    if(p[2]-grid.spacing[2]<=contactHeight&&(Math.abs(p[0])+grid.spacing[0]>.5||Math.abs(p[1])+grid.spacing[1]>.5))contactHaloOutside++;
  }
  const bounds=positive?{min:lo,max:hi}:null,halo=positive?{min:lo.map((v,i)=>v-grid.spacing[i]),max:hi.map((v,i)=>v+grid.spacing[i])}:null;
  return {positive,threshold:0,boundsBlender:bounds,oneVoxelHaloBoundsBlender:halo,oneVoxelHaloBoundsGame:halo?scalarBoundsToGame(halo):null,boundaryVoxels:boundary,boundaryContact:Object.values(boundary).some(v=>v>0),lowerBandCentreOutsidePatchVoxels:contactCentreOutside,lowerBandHaloOutsidePatchVoxels:contactHaloOutside,belowGroundPositiveVoxels:belowGround};
}
export function openRawFields(manifestPath){
  manifestPath=path.resolve(manifestPath);const root=path.dirname(manifestPath),raw=fs.readFileSync(manifestPath),manifest=JSON.parse(raw);
  if(manifest.version!==1||manifest.sampleCount!==193||manifest.samples?.length!==193||manifest.initialConditionObservedZero!==true||manifest.upperOverhangApproved!==false)throw Error('Expected actual finite193-sample raw export');
  const first=manifest.samples[0],grid={resolution:first.resolution,origin:first.scalarCentreOriginBlender,spacing:first.voxelSize};validateGrid(grid);
  for(let i=0;i<193;i++){
    const sample=manifest.samples[i];if(sample.frame!==i+1||sample.ageSeconds!==i/30||JSON.stringify(sample.resolution)!==JSON.stringify(grid.resolution)||JSON.stringify(sample.scalarCentreOriginBlender)!==JSON.stringify(grid.origin)||JSON.stringify(sample.voxelSize)!==JSON.stringify(grid.spacing))throw Error('Finite clocks/grid changed between samples');
    for(let k=0;k<3;k++)if(Math.abs(grid.origin[k]-(sample.domainBoundsBlender.min[k]+grid.spacing[k]/2))>1e-10)throw Error('Scalar centre origin changed; do not apply mesh offset');
  }
  function read(sampleIndex,channel){
    const record=manifest.samples[sampleIndex]?.channels?.[channel];if(!record)throw Error('Unknown actual scalar channel');
    const file=path.resolve(root,record.path);if(!file.startsWith(root+path.sep))throw Error('Scalar path escaped source');const bytes=fs.readFileSync(file);if(bytes.length!==record.bytes||sha(bytes)!==record.sha256)throw Error('Actual raw scalar hash changed');
    const values=readF32LE(bytes,grid.resolution.reduce((a,b)=>a*b,1));let min=Infinity,max=-Infinity,nonzero=0,positive=0;
    for(const v of values){min=Math.min(min,v);max=Math.max(max,v);if(v!==0)nonzero++;if(v>0)positive++;}
    if(min!==record.min||max!==record.max||nonzero!==record.nonzero||positive!==record.positive)throw Error('Independent scalar statistics differ from Blender');if(sampleIndex===0&&nonzero!==0)throw Error('Actual initial condition is not zero');
    return {values,bytes,record};
  }
  return {root,manifest,grid,manifestSha256:sha(raw),read};
}
export function auditAllFields(source){
  const samples=[],distinct={density:new Set(),temperature:new Set(),flame:new Set()};let anyReactionBoundary=false,anyDensityBoundary=false;
  for(let index=0;index<193;index++){
    const frame=source.manifest.samples[index],channels={};
    for(const name of ['density','temperature','flame']){
      const {values,record}=source.read(index,name);distinct[name].add(record.sha256);
      if(name!=='temperature')channels[name]=positiveAudit(values,source.grid,frame.contactBandHeight);
    }
    anyReactionBoundary||=channels.flame.boundaryContact;anyDensityBoundary||=channels.density.boundaryContact;samples.push({frame:frame.frame,ageSeconds:frame.ageSeconds,...channels});
  }
  if(anyReactionBoundary!==source.manifest.boundaryReactionFailed)throw Error('Independent reaction boundary verdict differs');
  for(const set of Object.values(distinct))if(set.size<2)throw Error('No actual temporal variation');
  return {status:anyReactionBoundary?'raw-verified-reaction-boundary-failed':'raw-verified-support-awaits-architect',samples,anyReactionBoundary,anyDensityBoundary,scalarByteRoundtrips:579,distinctFrames:Object.fromEntries(Object.entries(distinct).map(([k,v])=>[k,v.size])),upperOverhangApproved:false,rule:'All-positive support, independent native scalar centres, one-voxel halo. No threshold/crop/mesh modifier offset.'};
}
