import fs from 'node:fs';
import path from 'node:path';
import * as T from '../../../src/runtime/three.js';
import {createHorticulturalBuilding} from '../../../assets/art/exposition-horticulture/index.js';
import {createHorticultureTerrace} from '../../../assets/art/exposition-horticulture/terrace.js';
import {createBearRig,BEAR_SOURCE_COMMIT,BEAR_SPEC} from '../../../src/reuse/bear.js';
const out=path.resolve('artifacts/exposition-horticulture/renders');fs.mkdirSync(out,{recursive:true});
const model=createHorticulturalBuilding(T),terrace=createHorticultureTerrace(T),scene=new T.Scene(),owned=[];scene.add(model.root,terrace.root);
const bear=createBearRig(JSON.parse(fs.readFileSync('vendor/animal-factory-tactics-3d/'+BEAR_SOURCE_COMMIT+'/dist/tactics/bear-10k-data.json'))),lift=new T.Group();scene.add(lift);lift.position.y=2.12;lift.add(bear.root);bear.update({x:-4,y:-8,heading:.5,travelled:0,moving:false,tool:'matches'},0);bear.setHeldVisible(false);
const water=new T.Mesh(new T.PlaneGeometry(450,150).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x577f7c,roughness:.35}));water.name='review-only-water';water.position.set(0,.92,-90);scene.add(water);owned.push(water.geometry,water.material);
const fill=new T.Mesh(new T.BoxGeometry(305.5,2,17.5),new T.MeshStandardMaterial({color:0xa99c7e}));fill.name='review-only-terrace-fill';fill.position.set(0,1,-8.6);scene.add(fill);owned.push(fill.geometry,fill.material);
const definitions=[
 {name:'waterfront-exterior',title:'Horticultural Building | Nautilus exterior and waterfront',camera:{target:[0,7,31],origin:[250,200,-295],halfWidth:180},caption:'306 m frontage; 56 m glass dome; 33.92 m crown. Native walls and floors; terrace from the reusable shoreline kit.'},
 {name:'central-pavilion',title:'Horticultural Building | central glass dome and domed foyers',camera:{target:[0,12,23],origin:[85,65,-115],halfWidth:69},caption:'Source-supported glass dome and front galleries; twin ribbed foyers, peach arcades, ivory details and soda-green glass.'},
 {name:'rear-exterior',title:'Horticultural Building | rear and planted courts',camera:{target:[0,7,46],origin:[-230,215,320],halfWidth:177},caption:'Two open courts, orange trees and aquatic basins. Rear and end roof profiles are documented simplifications.'},
 {name:'roof-plan',title:'Horticultural Building | roof and open-court plan',camera:{target:[0,0,35],origin:[0,330,35],up:[0,0,-1],halfWidth:173},caption:'Three pavilions joined around two open courts. Source installation grid is not treated as a structural bay schedule.'},
 {name:'interior-cutaway',title:'Horticultural Building | galleries, courts and open dome hall',camera:{target:[0,3,42],origin:[160,255,-155],halfWidth:174},caption:'Review cutaway: roofs and walls above level3 hidden. Floors at 2.12 m and 6.36 m; open gallery wells and palm hall.',cutaway:true},
 {name:'gallery-stair',title:'Horticultural Building | native pavilion gallery and stair',camera:{target:[-135,5,43],origin:[-108,30,20],halfWidth:25},caption:'2 m stair connects level1 to level3; upper slab has a true opening. End gallery cafe and railings are interpretive.',cutaway:true,gallery:true},
 {name:'entry-and-terrace',title:'Horticultural Building | native bear, entry and water stair',camera:{target:[-1,3,-7],origin:[20,15,-30],halfWidth:15},caption:'Unscaled native bear, two 1 m door leaves and a 2 m landing. Central boat stair is a reusable game adaptation.'}
];
function keep(o,d,m,spec){if(!spec.cutaway)return true;const id=d.componentId||o.name;if(/roof|gable|front-glass-gallery|curved-gallery-connector|great-crystal|front-cupola|great-dome|dome-spring|foyer-roof/i.test(id))return false;if(d.level>=3&&['structural-wall','perimeter-closure'].includes(d.role))return false;
 const pos=new T.Vector3().setFromMatrixPosition(m);if(!['plant','floor','stair-tread'].includes(d.role)&&pos.y>7.5)return false;
 if(spec.gallery&&(pos.x>-115||pos.z<8||pos.z>91))return false;return true;}
function exportView(spec){scene.updateMatrixWorld(true);water.visible=fill.visible=!spec.cutaway;terrace.root.visible=!spec.gallery;lift.visible=!spec.cutaway;const groups=new Map(),v=new T.Vector3(),instance=new T.Matrix4();let triangles=0;
 scene.traverseVisible(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh)o.skeleton.update();const g=o.geometry,p=g.attributes.position,uv=g.attributes.grossUV||g.attributes.uv,index=g.index,mats=[o.material].flat(),ranges=Array.isArray(o.material)?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}];
  for(let it=0;it<(o.isInstancedMesh?o.count:1);it++){const transform=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(it,instance);transform.multiply(instance);}const d=o.isInstancedMesh?o.userData.parts[it]:o.userData;if(!keep(o,d,transform,spec))continue;
   for(const range of ranges){const m=mats[range.materialIndex];if(!m)continue;const color=m.color?.toArray()||[1,1,1],opacity=m.transparent?m.opacity:1,key=JSON.stringify([color,opacity]);if(!groups.has(key))groups.set(key,{name:m.name||o.name,color,opacity,texture:null,repeat:[1,1],offset:[0,0],vertices:[]});const r=groups.get(key);
    for(let i=range.start;i<range.start+range.count;i++){const k=index?index.getX(i):i;o.getVertexPosition(k,v);v.applyMatrix4(transform);r.vertices.push([v.x,v.y,v.z,uv?uv.getX(k):0,uv?uv.getY(k):0]);}triangles+=range.count/3;
   }
  }
 });
 const directory=path.join(out,spec.name);fs.mkdirSync(directory,{recursive:true});const materials=[];
 for(const [i,r]of [...groups.values()].entries()){const vs=r.vertices,file='material-'+i+'.ply',header=Buffer.from(`ply\nformat binary_little_endian 1.0\nelement vertex ${vs.length}\nproperty float x\nproperty float y\nproperty float z\nproperty float u\nproperty float v\nelement face ${vs.length/3}\nproperty list uchar uint vertex_indices\nend_header\n`),b=Buffer.alloc(vs.length*20+vs.length/3*13);let n=0;
  for(const a of vs)for(const value of a){if(!Number.isFinite(value))throw Error('Nonfinite export');b.writeFloatLE(value,n);n+=4;}for(let j=0;j<vs.length;j+=3){b.writeUInt8(3,n++);for(let k=0;k<3;k++){b.writeUInt32LE(j+k,n);n+=4;}}
  fs.writeFileSync(path.join(directory,file),Buffer.concat([header,b]));const {vertices,...rest}=r;materials.push({...rest,file,triangles:vs.length/3});
 }
 const record={...spec,directory,materials,triangles,reference:{bear:BEAR_SPEC,floorPitch:2.12},limitations:['Actual model meshes; CPU alpha blending approximates the default transparent glazing. WebGL shader, frame sorting, performance and gameplay acceptance remain pending.','Source photograph is monochrome and period text supports cream staff. Current peach finishes and soda-green glazing follow the user art direction; exact historic colours remain unverified.','Crowds, boats, exact historical exhibits, concealed services and fine sculpture are omitted.','Water at0.92 m, bulk terrace fill and ground are review-only. Native bear source geometry/base colours retained; source projection-paint shader omitted.','Cutaways hide roofs/high walls only for review; they do not alter the runtime asset.']};
 fs.writeFileSync(path.join(directory,'scene.json'),JSON.stringify(record,null,2)+'\n');return record;
}
try{const filter=process.argv[2],records=[];for(const spec of definitions){if(filter&&spec.name!==filter)continue;const {materials,...r}=exportView(spec);records.push(r);console.log('Exported '+spec.name+' / '+r.triangles+' actual triangles.');}const indexPath=path.join(out,'index.json'),old=fs.existsSync(indexPath)?JSON.parse(fs.readFileSync(indexPath)):[];fs.writeFileSync(indexPath,JSON.stringify([...old.filter(r=>!records.some(n=>n.name===r.name)),...records],null,2)+'\n');}
finally{model.dispose();terrace.dispose();bear.dispose();for(const r of owned)r.dispose();}
