/** Original, opt-in authoring adapter for one exact Blender4.5.15 probe.
 * This reverses Blender's source-documented *mesh* offset. It never changes
 * scalar origins/data and never writes original mesh/cache files.
 */
import proof from './modifier-adapter-proof.json' with {type:'json'};
export const adapterProof=proof;
function same(actual,expected,label,tolerance=1e-12){
  if(Array.isArray(expected)){
    if(!Array.isArray(actual)||actual.length!==expected.length)throw Error('Unsupported '+label);
    expected.forEach((v,i)=>same(actual[i],v,label+'['+i+']',tolerance));
  }else if(typeof expected==='number'){
    if(!Number.isFinite(actual)||Math.abs(actual-expected)>tolerance)throw Error('Unsupported '+label);
  }else if(actual!==expected)throw Error('Unsupported '+label);
}
export function multiply4(a,b){return a.map(row=>b[0].map((_,col)=>row.reduce((v,n,k)=>v+n*b[k][col],0)));}
export function transformPoint(m,p){return m.slice(0,3).map(row=>row[0]*p[0]+row[1]*p[1]+row[2]*p[2]+row[3]);}
export function createProbeMeshAdapter({manifest,metadata,settings,targetMatrixWorld=proof.targetMatrixWorld}){
  same(manifest.tool.version,proof.tool.version,'Blender version');same(manifest.tool.buildHash,proof.tool.buildHash,'Blender build');
  for(const key of ['version','buildHash','exeSha256'])same(settings.tool[key],proof.tool[key],'tool '+key);
  same(metadata.tool.version,proof.tool.version,'metadata version');same(metadata.tool.buildHash,proof.tool.buildHash,'metadata build');
  same(manifest.vdb.sha256,proof.sourceVdbSha256,'source VDB');same(metadata.sourceVdb.sha256Before,proof.sourceVdbSha256,'metadata input VDB');same(metadata.sourceVdb.sha256After,proof.sourceVdbSha256,'metadata unchanged VDB');
  same(metadata.sourceBlendSha256,proof.inputHashes['probe.blend'],'prepared scene');same(metadata.frame,proof.sourceFrame,'source frame');
  same(targetMatrixWorld,proof.targetMatrixWorld,'nonidentity target');same(manifest.vdb.rawGridMatrixObject,proof.nativeGridMatrix,'native grid transform');same(manifest.vdb.alignmentMatrix,proof.volumeWorldMatrixDuringExport,'export Volume transform');
  same(metadata.importedVolume.matrixWorld,proof.targetMatrixWorld,'untouched imported Volume');
  const frame=manifest.frames.find(f=>f.frame===proof.sourceFrame);if(!frame)throw Error('Missing exact source frame');
  same(frame.resolution,proof.resolution,'resolution');same(frame.voxelSize,proof.voxelSize,'spacing');same(frame.voxelCentreOriginBlenderWorld,proof.scalarCentreOrigin,'scalar centre origin');
  for(const key of ['min','max'])same(metadata.domain.physicalBounds[key],proof.domainBounds[key],'domain '+key);
  const names=metadata.namedGrids.map(g=>g.name).sort();same(names,['density','flame','temperature'],'named grids');
  for(const grid of metadata.namedGrids){same(grid.matrixObject,proof.nativeGridMatrix,grid.name+' native grid');same(grid.volumeMatrixWorld,proof.targetMatrixWorld,grid.name+' imported transform');}
  for(let i=0;i<3;i++)if(Math.abs(frame.voxelCentreOriginBlenderWorld[i]-(proof.domainBounds.min[i]+frame.voxelSize[i]/2))>1e-12)throw Error('Scalar centre convention changed');
  // Identity target is a checked precondition, so inverse(target) is identity.
  const p=multiply4(manifest.vdb.alignmentMatrix,manifest.vdb.rawGridMatrixObject);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(row===col?p[row][col]<=0:p[row][col]!==0)throw Error('Only the observed positive-diagonal transform is supported');
  // Blender stores this post-composition offset in OpenVDB Vec3s (float32).
  const offset=p.slice(0,3).map((row,i)=>Math.fround(row[i]/2));
  const witnesses=[[0,0,0],[1,0,0],[0,1,0],[0,0,1],[15,15,31]].map(index=>{
    const gridPoint=transformPoint(p,index),modifierPoint=gridPoint.map((x,i)=>x+offset[i]),adapterPoint=modifierPoint.map((x,i)=>x-offset[i]);
    if(adapterPoint.some((x,i)=>Math.abs(x-gridPoint[i])>1e-12))throw Error('Modifier inverse algebra failed');
    return {index,gridPointTarget:gridPoint,blenderModifierPointTarget:modifierPoint,readerAdapterPointTarget:adapterPoint,scalarIndexAfterAdapter:adapterPoint.map((x,i)=>(x-frame.voxelCentreOriginBlenderWorld[i])/frame.voxelSize[i])};
  });
  return Object.freeze({id:proof.id,transformP:p,offsetTargetMetres:offset,witnesses,
    adaptVertices(vertices){
      if(!(vertices instanceof Float32Array)||vertices.length%3)throw Error('Expected raw f32 mesh; adapter output must not be adapted twice');
      const result=new Float64Array(vertices.length);for(let i=0;i<vertices.length;i++){
        if(!Number.isFinite(vertices[i]))throw Error('Nonfinite raw mesh');result[i]=vertices[i]-offset[i%3];
      }return result;
    }
  });
}
