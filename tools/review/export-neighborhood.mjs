import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
const {values,positionals}=parseArgs({allowPositionals:true,options:{out:{type:'string'},view:{type:'string',default:'overview'}}});
if(!['overview','new-block'].includes(values.view))throw Error('Unknown review view: '+values.view);
const tree=path.resolve(positionals[0]||'.'),out=path.resolve(values.out||'artifacts/qa/catalogue-layout');fs.mkdirSync(out,{recursive:true});
const load=p=>import(pathToFileURL(path.join(tree,p)));
const T=await load('src/runtime/three.js'),{createSimulation}=await load('src/simulation/index.js'),{createNeighborhood}=await load('src/art/neighborhood.js'),{createWorld}=await load('src/art/world.js'),{PALETTE}=await load('src/art/materials.js');
const {HOUSING_SOURCE_COMMIT}=await load('src/content/housing-plans.js');
const texturePaths={clapboard:'gross-housing-v1/clapboard-ivory-v1.png',cedar:'gross-housing-v1/cedar-shingles-v1.png',oak:'gross-housing-v1/floorboards-oak-v1.png',paper:'gross-housing-v1/wallpaper-botanical-v1.png',brick:'exposition-skins-v1/brick-sienna-v1.png',slate:'exposition-skins-v1/roof-slate-v1.png'};
const textures=Object.fromEntries(Object.entries(texturePaths).map(([id,file])=>{const t=new T.Texture();t.userData.file=path.join(tree,'assets/art',file);t.repeat.setScalar(['brick','slate'].includes(id)?.5:1);return[id,t];}));
const catalogue={houses:['gross','hopkins'].flatMap(c=>JSON.parse(fs.readFileSync(path.join(tree,'assets/art/'+c+'-housing-v1/houses.json'))).houses)};
const materials=Object.fromEntries(Object.entries({...PALETTE,wood:0x79502f,creamWood:0xd9cda1,oliveWood:0x666c3e,drum:0xaf3b28,blueDrum:0x426d7c,dark:0x292c29,hazard:0xd6bb6b}).map(([key,color])=>[key,new T.MeshStandardMaterial({color})]));
const sim=createSimulation({scenario:'neighborhood'}),houses=createNeighborhood(T,{catalogue,textures}),ground=createWorld(T,materials),scene=new T.Scene();
try{
const snapshot=sim.snapshot(),additions=new Set(['hopkins-4-09','hopkins-4-13','monroe-row']);
const shown=snapshot.world.buildings.filter(b=>values.view!=='new-block'||additions.has(b.prefabId));
if(!shown.length)throw Error('No houses match the requested review view');
houses.update({...snapshot.world,buildings:shown});ground.update({...snapshot.world,obstacles:snapshot.world.obstacles.filter(o=>!o.buildingId&&!o.moduleId)});scene.add(houses.root,ground.root);scene.updateMatrixWorld(true);
const groups=new Map(),point=new T.Vector3(),local=new T.Matrix4(),matrix=new T.Matrix4();let triangles=0;
scene.traverseVisible(o=>{
 if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,uv=g.attributes.grossUV||g.attributes.uv,index=g.index,ms=Array.isArray(o.material)?o.material:[o.material],ranges=Array.isArray(o.material)?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}];
 for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){
  if(o.isInstancedMesh){o.getMatrixAt(instance,local);matrix.multiplyMatrices(o.matrixWorld,local);}else matrix.copy(o.matrixWorld);
  for(const range of ranges){const m=ms[range.materialIndex];if(!m)continue;let r=groups.get(m.uuid);if(!r){r={name:m.name||o.name,color:m.color.toArray(),texture:m.map?.userData.file||null,repeat:m.map?.repeat.toArray()||[1,1],vertices:[]};groups.set(m.uuid,r);}
   for(let i=range.start;i<range.start+range.count;i+=3){for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j;point.fromBufferAttribute(p,k).applyMatrix4(matrix);r.vertices.push([point.x,point.y,point.z,uv?uv.getX(k):0,uv?uv.getY(k):0]);}triangles++;}
  }
 }
});
const records=[];let materialIndex=0;
for(const r of groups.values()){
 const vs=r.vertices;if(!vs.length)continue;const file='material-'+materialIndex+++'.ply',header=Buffer.from(`ply\nformat binary_little_endian 1.0\nelement vertex ${vs.length}\nproperty float x\nproperty float y\nproperty float z\nproperty float u\nproperty float v\nelement face ${vs.length/3}\nproperty list uchar uint vertex_indices\nend_header\n`),bytes=Buffer.alloc(vs.length*20+vs.length/3*13);let n=0;
 for(const v of vs)for(const component of v){bytes.writeFloatLE(component,n);n+=4;}for(let j=0;j<vs.length;j+=3){bytes.writeUInt8(3,n++);for(let k=0;k<3;k++){bytes.writeUInt32LE(j+k,n);n+=4;}}
 fs.writeFileSync(path.join(out,file),Buffer.concat([header,bytes]));const {vertices,...record}=r;records.push({...record,file,triangles:vs.length/3});
}
let camera={target:[18,1.5,10],origin:[38,29.5,38],halfWidth:21};
const outputName=snapshot.world.height>30?'catalogue-block-two-'+values.view:'catalogue-street-offline';
if(snapshot.world.height>30){
 const target=values.view==='new-block'?[18,1.5,35]:[snapshot.world.width/2,1.5,snapshot.world.height/2];
 camera={target,origin:[target[0]+32,target[1]+38,target[2]-44],halfWidth:values.view==='new-block'?23:31};
}
const result={sourceTree:tree,artistCommit:HOUSING_SOURCE_COMMIT,purpose:'Offline review of actual catalogue house placement; not a game screenshot',view:values.view,outputName,buildings:shown,materials:records,triangles,camera,limitations:['Native house meshes, source UVs and original housing textures are exported.','Ground and barrels use their flat base palette; procedural paint and instance tint variation are omitted.','Bear, civilians, fire, UI and WebGL shaders are not rendered.','Overview camera differs from the player follow camera.',...(values.view==='new-block'?['The first row is omitted from this closer review of the three additions.']:[])]};
fs.writeFileSync(path.join(out,'scene.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({out,materials:records.length,triangles,buildings:result.buildings.map(b=>b.prefabId)}));
}finally{houses.dispose();ground.dispose();sim.dispose();for(const t of Object.values(textures))t.dispose();for(const m of Object.values(materials))m.dispose();}
