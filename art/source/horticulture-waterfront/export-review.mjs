import fs from 'node:fs';
import path from 'node:path';
import * as T from '../../../src/runtime/three.js';
import {createWaterfrontTile,WATERFRONT_TILES,WATERFRONT_PROFILE as P} from '../../../assets/art/horticulture-waterfront/index.js';
import {createBearRig,BEAR_SOURCE_COMMIT,BEAR_SPEC} from '../../../src/reuse/bear.js';
const out=path.resolve('artifacts/horticulture-waterfront/renders');fs.mkdirSync(out,{recursive:true});const records=[],owned=[],tiles=[];
const scene=new T.Scene(),assembly=new T.Group(),catalogue=new T.Group();scene.add(assembly,catalogue);
function tile(type,position=[0,0,0],quarterTurns=0,parent=assembly){const a=createWaterfrontTile(T,{type,position,quarterTurns});parent.add(a.root);tiles.push(a);return a;}
for(let x=0;x<14;x++){
 if(x===5){tile('quay-stairs',[x,0,0]);x++;continue;}
 tile(x===0?'quay-outer-corner':x===13?'quay-outer-corner':x===4?'quay-end-right':x===7?'quay-end-left':[3,11].includes(x)?'quay-pier':'quay-rail',x===13?[14,0,0]:[x,0,0],x===13?3:0);
}
for(let z=1;z<6;z++){tile(z===5?'quay-end-left':z===4?'quay-pier':'quay-rail',[0,0,z+1],1);tile(z===5?'quay-end-right':z===4?'quay-pier':'quay-rail',[14,0,z],3);}
for(let x=1;x<13;x++)for(let z=1;z<6;z++)tile('promenade-slab',[x,0,z]);
function mesh(parent,name,geometry,material,position=[0,0,0]){const m=new T.Mesh(geometry,material);m.name=name;m.position.fromArray(position);parent.add(m);owned.push(geometry,material);return m;}
mesh(assembly,'review-only land fill',new T.BoxGeometry(13.66,2,5.83),new T.MeshStandardMaterial({color:0xa59a82}),[7,1,3.085]);
const waterGeometry=new T.PlaneGeometry(100,100,100,100);waterGeometry.rotateX(-Math.PI/2);const points=waterGeometry.attributes.position;for(let i=0;i<points.count;i++)points.setY(i,.012*Math.sin(points.getX(i)*1.4+points.getZ(i)*.6)*Math.cos(points.getZ(i)*1.1));waterGeometry.computeVertexNormals();
mesh(assembly,'review-only water',waterGeometry,new T.MeshStandardMaterial({color:0x547b77,roughness:.32}),[7,.92,0]);
const data=JSON.parse(fs.readFileSync('vendor/animal-factory-tactics-3d/'+BEAR_SOURCE_COMMIT+'/dist/tactics/bear-10k-data.json')),bear=createBearRig(data),bearLift=new T.Group();assembly.add(bearLift);bearLift.position.y=P.floorSpacing;bearLift.add(bear.root);bear.update({x:3.4,y:2.8,heading:Math.PI/3,travelled:0,moving:false,tool:'matches'},0);bear.setHeldVisible(false);
const placements=[];WATERFRONT_TILES.forEach((type,i)=>{const position=[(i%3)*4,0,Math.floor(i/3)*6],a=tile(type,position,0,catalogue);placements.push({number:i+1,type,position,bounds:a.metadata.overhangBounds});});
function exportView(name,title,camera,caption,isCatalogue=false,singleIndex=null){
 assembly.visible=!isCatalogue;catalogue.visible=isCatalogue;catalogue.children.forEach((c,i)=>c.visible=singleIndex===null||i===singleIndex);scene.updateMatrixWorld(true);const groups=new Map(),v=new T.Vector3(),instance=new T.Matrix4();let triangles=0;
 scene.traverseVisible(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh)o.skeleton.update();const g=o.geometry,p=g.attributes.position,uv=g.attributes.grossUV||g.attributes.uv,index=g.index,mats=[o.material].flat(),ranges=Array.isArray(o.material)?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}];
  for(let it=0;it<(o.isInstancedMesh?o.count:1);it++){
   const transform=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(it,instance);transform.multiply(instance);}
   for(const range of ranges){const m=mats[range.materialIndex];if(!m)continue;const color=m.color?.toArray()||[1,1,1],key=JSON.stringify(color);if(!groups.has(key))groups.set(key,{name:m.name||o.name,color,texture:null,repeat:[1,1],offset:[0,0],vertices:[]});const r=groups.get(key);
    for(let i=range.start;i<range.start+range.count;i++){const k=index?index.getX(i):i;o.getVertexPosition(k,v);v.applyMatrix4(transform);r.vertices.push([v.x,v.y,v.z,uv?uv.getX(k):0,uv?uv.getY(k):0]);}triangles+=range.count/3;
   }
  }
 });
 const directory=path.join(out,name);fs.mkdirSync(directory,{recursive:true});const materials=[];
 for(const [i,r]of [...groups.values()].entries()){
  const vs=r.vertices,file='material-'+i+'.ply',header=Buffer.from(`ply\nformat binary_little_endian 1.0\nelement vertex ${vs.length}\nproperty float x\nproperty float y\nproperty float z\nproperty float u\nproperty float v\nelement face ${vs.length/3}\nproperty list uchar uint vertex_indices\nend_header\n`),b=Buffer.alloc(vs.length*20+vs.length/3*13);let n=0;
  for(const a of vs)for(const f of a){if(!Number.isFinite(f))throw Error('Nonfinite export');b.writeFloatLE(f,n);n+=4;}for(let j=0;j<vs.length;j+=3){b.writeUInt8(3,n++);for(let k=0;k<3;k++){b.writeUInt32LE(j+k,n);n+=4;}}
  fs.writeFileSync(path.join(directory,file),Buffer.concat([header,b]));const {vertices,...rest}=r;materials.push({...rest,file,triangles:vs.length/3});
 }
 const record={name,title,directory,camera,caption,materials,triangles,tiles:WATERFRONT_TILES,placements:isCatalogue?placements:undefined,reference:isCatalogue?null:{bear:BEAR_SPEC,nativeFloorY:P.floorSpacing},limitations:['Actual exported meshes in CPU diffuse lighting; WebGL shader/performance review remains pending.','Horticultural Building, source planting, boats, crowds and UI are omitted.','Native bear source geometry/base colours retained; source projection-paint shader omitted.','Water and land fill are review-only geometry; water height0.92 m is an art choice, not an engine or historical requirement.','Corners, ends and stairs are useful game adaptations; no exact historic placement is claimed.']};
 fs.writeFileSync(path.join(directory,'scene.json'),JSON.stringify(record,null,2)+'\n');records.push(record);
}
try{
 exportView('assembled-waterfront','Horticulture waterfront | reusable Nautilus shoreline',{target:[7,1.4,1],origin:[25,18,-22],halfWidth:11},'1 m repeating pieces; deck at 2.12 m; actual native bear. Building, planting and boats omitted.');
 exportView('pier-and-stairs','Waterfront | native-scale pier, railing and access stairs',{target:[5.4,1.6,-.6],origin:[13,8,-12],halfWidth:5},'Capped pale posts and dark rails follow the photo. Stairs are an explicit game adaptation.');
 for(const [i,p]of placements.entries()){
  const c=p.bounds.min.map((v,k)=>(v+p.bounds.max[k])/2+p.position[k]),halfWidth=p.type==='quay-stairs'?4.6:p.type==='quay-inner-corner'?3.8:p.type==='promenade-slab'?1.8:3.1;
  exportView('part-'+String(i+1).padStart(2,'0'),'Waterfront tile '+(i+1)+' | '+p.type,{target:c,origin:[c[0]+5,c[1]+4,c[2]-6],halfWidth},p.type==='quay-stairs'?'2 m wide x 5 m projection, including native landing. Twelve custom steps.':p.type==='quay-inner-corner'?'2 x 2 m envelope, three native floor cells and an open water notch.':'1 x 1 m floor cell; retaining panels remain 1 x 2 x 0.16 m.',true,i);
 }
 fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(records.map(({materials,...r})=>r),null,2)+'\n');console.log('Exported '+records.length+' actual-mesh views; '+tiles.length+' owned tile instances.');
}finally{for(const a of tiles)a.dispose();bear.dispose();for(const v of owned)v.dispose();}
