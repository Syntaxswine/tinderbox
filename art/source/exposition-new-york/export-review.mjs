import fs from 'node:fs';
import path from 'node:path';
import * as T from '../../../src/runtime/three.js';
import {createNewYorkStateBuilding} from '../../../assets/art/exposition-new-york/index.js';
import {createBearRig,BEAR_SOURCE_COMMIT,BEAR_SPEC} from '../../../src/reuse/bear.js';
const out=path.resolve('artifacts/exposition-new-york/renders');fs.mkdirSync(out,{recursive:true});
const textures={};for(const [slot,file] of Object.entries({facade:'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/ground-concrete.png',roof:'assets/art/exposition-skins-v1/roof-slate-v1.png'})){
  const t=new T.Texture();t.userData.file=path.resolve(file);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(.5);t.colorSpace=T.SRGBColorSpace;textures[slot]=t;
}
const building=createNewYorkStateBuilding(T,{textures}),scene=new T.Scene();scene.add(building.root);
const data=JSON.parse(fs.readFileSync('vendor/animal-factory-tactics-3d/'+BEAR_SOURCE_COMMIT+'/dist/tactics/bear-10k-data.json')),bear=createBearRig(data);bear.update({x:-4,y:-13.3,heading:Math.PI/2,travelled:0,moving:false,tool:'matches'},0);bear.setHeldVisible(false);scene.add(bear.root);
// Precisely measured native module reference, independent of the bear's paint shader.
const reference=new T.Group();reference.name='native-scale-reference';reference.position.set(-10.5,0,-13.3);scene.add(reference);
const owned=[];for(const [name,size,pos,color] of [['native-wall',[1,2,.16],[0,1,0],0xcdbda1],['native-leaf',[1,1.65,.12],[1.5,.825,0],0x674b32]]){
  const g=new T.BoxGeometry(...size),m=new T.MeshStandardMaterial({color}),mesh=new T.Mesh(g,m);owned.push(g,m);mesh.name=name;mesh.position.fromArray(pos);reference.add(mesh);
}
const records=[];
function exportView(name,camera,caption,withReference=true){
  bear.root.visible=reference.visible=withReference;scene.updateMatrixWorld(true);const groups=new Map(),point=new T.Vector3(),instance=new T.Matrix4();let triangles=0;
  scene.traverseVisible(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh)o.skeleton.update();const g=o.geometry,p=g.attributes.position,uv=g.attributes.grossUV||g.attributes.uv,index=g.index,materials=[o.material].flat(),ranges=Array.isArray(o.material)?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}];
    for(let it=0;it<(o.isInstancedMesh?o.count:1);it++){
      const transform=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(it,instance);transform.multiply(instance);}
      for(const range of ranges){const m=materials[range.materialIndex];if(!m)continue;let r=groups.get(m.uuid);if(!r){r={name:m.name||o.name,color:m.color?.toArray()||[1,1,1],texture:m.map?.userData.file||null,repeat:m.map?.repeat.toArray()||[1,1],offset:m.map?.offset.toArray()||[0,0],mapBlend:m.userData.newYorkMapBlend??1,vertices:[]};groups.set(m.uuid,r);}
        for(let i=range.start;i<range.start+range.count;i+=3){for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j;o.getVertexPosition(k,point);point.applyMatrix4(transform);r.vertices.push([point.x,point.y,point.z,uv?uv.getX(k):0,uv?uv.getY(k):0]);}triangles++;}
      }
    }
  });
  const directory=path.join(out,name);fs.mkdirSync(directory,{recursive:true});const materials=[];
  for(const [i,r] of [...groups.values()].entries()){const vs=r.vertices;if(!vs.length)continue;const file='material-'+i+'.ply',header=Buffer.from(`ply\nformat binary_little_endian 1.0\nelement vertex ${vs.length}\nproperty float x\nproperty float y\nproperty float z\nproperty float u\nproperty float v\nelement face ${vs.length/3}\nproperty list uchar uint vertex_indices\nend_header\n`),b=Buffer.alloc(vs.length*20+vs.length/3*13);let n=0;
    for(const v of vs)for(const value of v){if(!Number.isFinite(value))throw Error('Non-finite exported vertex');b.writeFloatLE(value,n);n+=4;}for(let j=0;j<vs.length;j+=3){b.writeUInt8(3,n++);for(let k=0;k<3;k++){b.writeUInt32LE(j+k,n);n+=4;}}
    fs.writeFileSync(path.join(directory,file),Buffer.concat([header,b]));const {vertices,...record}=r;materials.push({...record,file,triangles:vs.length/3});
  }
  const record={name,directory,camera,caption,materials,triangles,reference:withReference?{bear:BEAR_SPEC,modules:{wall:[1,2,.16],door:[1,1.65,.12]},positions:{bear:[-4,0,-13.3],modules:[-10.5,0,-13.3]}}:null,limitations:['CPU diffuse render of actual exported meshes; WebGL shader/performance acceptance remains pending.','No effects, crowds, gameplay or UI; exterior only.','Native bear geometry and source base colours; multi-view painted shader omitted.']};
  fs.writeFileSync(path.join(directory,'scene.json'),JSON.stringify(record,null,2)+'\n');records.push(record);
}
try{
  exportView('front-isometric',{target:[0,11,11],origin:[80,62,-90],halfWidth:43},'47 m facade; 70.5 m full ground envelope. Native 1.67 m bear and 2 m wall / 1.65 m door at front.');
  exportView('rear-isometric',{target:[0,11,11],origin:[-86,68,105],halfWidth:43},'Stepped rear follows the plan. Rear openings, roof depth and back joins are inferred.',false);
  exportView('front-elevation',{target:[0,17,0],origin:[0,17,-160],halfWidth:38},'Front elevation: source-calibrated 47 m facade and 33.5 m tower caps.',false);
  exportView('roof-plan',{target:[0,0,11],origin:[0,160,11],up:[0,0,1],halfWidth:38},'Top view of the actual model. Raised roof depth and rear roof joins are inferred.',false);
  exportView('entry-detail',{target:[0,5.5,-1],origin:[21,16,-29],halfWidth:15},'Two native 1 x 1.65 m door leaves below fixed transoms; native bear and wall/door references.');
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(records.map(({materials,...r})=>r),null,2)+'\n');
  fs.writeFileSync(path.join(out,'model.json'),JSON.stringify({diagnostics:building.diagnostics(),metadata:building.metadata},null,2)+'\n');
  console.log('Exported '+records.length+' actual-model views. '+JSON.stringify(building.diagnostics()));
}finally{building.dispose();bear.dispose();for(const v of owned)v.dispose();for(const t of Object.values(textures))t.dispose();}
