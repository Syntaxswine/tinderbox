import fs from 'node:fs';
import path from 'node:path';
import * as T from '../../../src/runtime/three.js';
import {createNewYorkStateBuildingTile} from '../../../assets/art/exposition-new-york-tile/index.js';
import {createBearRig,BEAR_SOURCE_COMMIT,BEAR_SPEC} from '../../../src/reuse/bear.js';
const out=path.resolve('artifacts/exposition-new-york-tile/renders');fs.mkdirSync(out,{recursive:true});
const textures={};for(const [slot,file] of Object.entries({facade:'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/ground-concrete.png',roof:'assets/art/exposition-skins-v1/roof-slate-v1.png'})){
  const t=new T.Texture();t.userData.file=path.resolve(file);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(.5);t.colorSpace=T.SRGBColorSpace;textures[slot]=t;
}
const building=createNewYorkStateBuildingTile(T,{textures}),scene=new T.Scene();scene.add(building.root);
const data=JSON.parse(fs.readFileSync('vendor/animal-factory-tactics-3d/'+BEAR_SOURCE_COMMIT+'/dist/tactics/bear-10k-data.json')),bear=createBearRig(data);bear.update({x:-4,y:-13.3,heading:Math.PI/2,travelled:0,moving:false,tool:'matches'},0);bear.setHeldVisible(false);scene.add(bear.root);
// Precisely measured native module reference, independent of the bear's paint shader.
const reference=new T.Group();reference.name='native-scale-reference';reference.position.set(-10.5,0,-13.3);scene.add(reference);
const owned=[];for(const [name,size,pos,color] of [['native-wall',[1,2,.16],[0,1,0],0xcdbda1],['native-leaf',[1,1.65,.12],[1.5,.825,0],0x674b32]]){
  const g=new T.BoxGeometry(...size),m=new T.MeshStandardMaterial({color}),mesh=new T.Mesh(g,m);owned.push(g,m);mesh.name=name;mesh.position.fromArray(pos);reference.add(mesh);
}
const records=[];
function exportView(name,camera,caption,withReference=true){
  const structural=name==='structural-cutaway';
  bear.root.visible=reference.visible=withReference;scene.updateMatrixWorld(true);const groups=new Map(),point=new T.Vector3(),instance=new T.Matrix4();let triangles=0;
  scene.traverseVisible(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh)o.skeleton.update();const g=o.geometry,p=g.attributes.position,uv=g.attributes.grossUV||g.attributes.uv,index=g.index,materials=[o.material].flat(),ranges=Array.isArray(o.material)?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}];
    for(let it=0;it<(o.isInstancedMesh?o.count:1);it++){
      const part=o.isInstancedMesh?o.userData.parts[it]:o.userData;
      if(structural&&!['floor','structural-wall','perimeter-closure'].includes(part.role))continue;
      const transform=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(it,instance);transform.multiply(instance);}
      for(const range of ranges){const m=materials[range.materialIndex];if(!m)continue;const key=m.uuid+(structural?'/'+part.role:'');let r=groups.get(key);if(!r){r={name:m.name||o.name,color:structural&&part.role==='floor'?[.23,.48,.4]:(m.color?.toArray()||[1,1,1]),texture:structural?null:m.map?.userData.file||null,repeat:m.map?.repeat.toArray()||[1,1],offset:m.map?.offset.toArray()||[0,0],mapBlend:m.userData.newYorkMapBlend??1,vertices:[]};groups.set(key,r);}
        for(let i=range.start;i<range.start+range.count;i+=3){let vs=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j;o.getVertexPosition(k,point);point.applyMatrix4(transform);vs.push([point.x,point.y,point.z,uv?uv.getX(k):0,uv?uv.getY(k):0]);}
          if(structural){const clipped=[];for(let a=0;a<vs.length;a++){const p=vs[a],q=vs[(a+1)%vs.length],pin=p[2]>=14,qin=q[2]>=14;if(pin)clipped.push(p);if(pin!==qin){const t=(14-p[2])/(q[2]-p[2]);clipped.push(p.map((v,k)=>v+t*(q[k]-v)));}}vs=clipped;}
          for(let j=1;j<vs.length-1;j++){r.vertices.push(vs[0],vs[j],vs[j+1]);triangles++;}
        }
      }
    }
  });
  const directory=path.join(out,name);fs.mkdirSync(directory,{recursive:true});const materials=[];
  for(const [i,r] of [...groups.values()].entries()){const vs=r.vertices;if(!vs.length)continue;const file='material-'+i+'.ply',header=Buffer.from(`ply\nformat binary_little_endian 1.0\nelement vertex ${vs.length}\nproperty float x\nproperty float y\nproperty float z\nproperty float u\nproperty float v\nelement face ${vs.length/3}\nproperty list uchar uint vertex_indices\nend_header\n`),b=Buffer.alloc(vs.length*20+vs.length/3*13);let n=0;
    for(const v of vs)for(const value of v){if(!Number.isFinite(value))throw Error('Non-finite exported vertex');b.writeFloatLE(value,n);n+=4;}for(let j=0;j<vs.length;j+=3){b.writeUInt8(3,n++);for(let k=0;k<3;k++){b.writeUInt32LE(j+k,n);n+=4;}}
    fs.writeFileSync(path.join(directory,file),Buffer.concat([header,b]));const {vertices,...record}=r;materials.push({...record,file,triangles:vs.length/3});
  }
  const record={name,directory,camera,caption,materials,triangles,reference:withReference?{bear:BEAR_SPEC,modules:{wall:[1,2,.16],door:[1,1.65,.12]},positions:{bear:[-4,0,-13.3],modules:[-10.5,0,-13.3]}}:null,limitations:['CPU diffuse render of actual exported meshes; WebGL shader/performance acceptance remains pending.',structural?'Actual structural geometry clipped at Z=14 m; ornament hidden and floors coloured green.':'No effects, crowds, gameplay or UI; exterior only.','Native bear geometry and source base colours; multi-view painted shader omitted.']};
  fs.writeFileSync(path.join(directory,'scene.json'),JSON.stringify(record,null,2)+'\n');records.push(record);
}
try{
  exportView('front-isometric',{target:[0,11,12],origin:[80,62,-90],halfWidth:43},'Separate 48 x 28 m tile adaptation. Floors follow the native 2.12 m pitch; original model preserved.');
  exportView('rear-isometric',{target:[0,11,12],origin:[-86,68,105],halfWidth:43},'Whole-metre rear steps. Roof slopes and rear openings remain artistic adaptations.',false);
  exportView('front-elevation',{target:[0,17,0],origin:[0,17,-160],halfWidth:38},'All floors/decks on n x 2.12 m; custom ornament and pitched roof profiles.',false);
  exportView('structural-cutaway',{target:[0,14,22],origin:[64,49,-82],halfWidth:38},'Actual wall cells and slabs; front half cut at Z=14 m. Green slabs; blank levels stay open.',false);
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(records.map(({materials,...r})=>r),null,2)+'\n');
  fs.writeFileSync(path.join(out,'model.json'),JSON.stringify({diagnostics:building.diagnostics(),metadata:building.metadata},null,2)+'\n');
  console.log('Exported '+records.length+' actual-model views. '+JSON.stringify(building.diagnostics()));
}finally{building.dispose();bear.dispose();for(const v of owned)v.dispose();for(const t of Object.values(textures))t.dispose();}
