import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import * as T from '../../../src/runtime/three.js';
import {createFisheriesBuilding} from '../../../assets/art/exposition-fisheries/index.js';
import {createBearRig,BEAR_SOURCE_COMMIT,BEAR_SPEC} from '../../../src/reuse/bear.js';
const out=path.resolve('artifacts/exposition-fisheries/renders');fs.mkdirSync(out,{recursive:true});
const model=createFisheriesBuilding(T),scene=new T.Scene(),owned=[];scene.add(model.root);
const bear=createBearRig(JSON.parse(fs.readFileSync('vendor/animal-factory-tactics-3d/'+BEAR_SOURCE_COMMIT+'/dist/tactics/bear-10k-data.json'))),lift=new T.Group();scene.add(lift);lift.add(bear.root);bear.update({x:-2.8,y:-5.2,heading:.4,travelled:0,moving:false,tool:'matches'},0);bear.setHeldVisible(false);
const definitions=[
 {name:'fisheries-exterior',title:'Fisheries Building | main hall, aquarium and angling pavilion',camera:{target:[0,8,32],origin:[160,155,-240],halfWidth:143},caption:'Native Nautilus assembly; 112 x50 m main hall, curved arcades and polygonal wings. Warm peach, soda green and terracotta.'},
 {name:'great-rotunda',title:'Fisheries Building | Romanesque drum and marine ornament',camera:{target:[0,16,28],origin:[65,51,-72],halfWidth:47},caption:'High arcaded drum, pointed tile roof, open lantern and four small roof towers. Upper heights and pitches are adapted.'},
 {name:'rear-exterior',title:'Fisheries Building | rear entrance and curved connections',camera:{target:[0,9,35],origin:[-170,150,260],halfWidth:144},caption:'Rear entry mirrors the source plan. Hidden elevations and exact connector spacing remain documented interpretations.'},
 {name:'roof-plan',title:'Fisheries Building | roof plan and distinct pavilion forms',camera:{target:[0,0,37],origin:[0,330,37],up:[0,0,-1],halfWidth:140},caption:'Even-metre native wall chords; .4 x.5 m curved tile rhythm. Overall compound placement is an art adaptation.'},
 {name:'interior-cutaway',title:'Fisheries Building | first floor, gallery and aquarium',camera:{target:[0,3,31],origin:[125,205,-170],halfWidth:142},caption:'Review cutaway. First floor L1 /2.12 m; main gallery L3 /6.36 m, four stair flights and a real hall void.',cutaway:true},
 {name:'gallery-stair',title:'Fisheries Building | main gallery and native-height stairs',camera:{target:[-20,4.5,21],origin:[10,33,-12],halfWidth:29},caption:'2.4 m gallery stairs: 24 treads over two native levels. Marine railings; boats are interpretive exhibits.',cutaway:true,sections:['main']},
 {name:'aquarium-interior',title:'Fisheries Building | aquarium pool and ten large tanks',camera:{target:[104.42,3.8,25.27],origin:[137,48,-12],halfWidth:26},caption:'Ten tanks around a rock-and-water rotunda. Layout follows period text; no aquarium construction plan was inspected.',cutaway:true,sections:['aquarium']},
 {name:'angling-interior',title:'Fisheries Building | angling pavilion and radial exhibits',camera:{target:[-104.42,3.2,25.27],origin:[-74,45,-9],halfWidth:26},caption:'Polygonal pavilion follows the separate angling diagram. Rod cases and internal furnishings are art interpretations.',cutaway:true,sections:['angling']},
 {name:'native-entry',title:'Fisheries Building | native bear and paired entry leaves',camera:{target:[0,3.6,0],origin:[13,12,-19],halfWidth:12},caption:'Unscaled bear; 2 m paired doorway with 2.72 m height, separate leaf extensions and 4 m approach stair.',entry:true}
];
function keep(o,d,m,spec){const id=d.componentId||o.name;if(spec.sections&&!spec.sections.includes(d.sectionId))return false;if(spec.entry&&d.sectionId&&d.sectionId!=='main')return false;if(!spec.cutaway)return true;if(['roof-tiles','roof-underlay'].includes(d.role)||/roof|gable|great-lantern|drum-satellite/i.test(id))return false;if(d.level>=3&&['structural-wall','perimeter-closure'].includes(d.role))return false;
 const pos=new T.Vector3().setFromMatrixPosition(m);if(!['floor','stair-tread'].includes(d.role)&&pos.y>7.5)return false;
 if(/central-drum|upper-drum|drum-balcony|belfry/i.test(id))return false;return true;}
function exportView(spec){for(const portal of model.metadata.portals)model.setPortalState(portal.id,!!spec.entry);scene.updateMatrixWorld(true);lift.visible=!spec.cutaway;const groups=new Map(),v=new T.Vector3(),instance=new T.Matrix4();let triangles=0;
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
 const record={...spec,directory,materials,triangles,assetManifestSha256:createHash('sha256').update(fs.readFileSync('assets/art/exposition-fisheries/manifest.json')).digest('hex'),reference:{bear:BEAR_SPEC,floorPitch:2.12},limitations:['Actual model meshes; CPU alpha blending approximates the default transparent glazing. WebGL shader, frame sorting, performance and gameplay acceptance remain pending.','Source photograph is monochrome. Peach finishes, soda-green glass and terracotta hues follow the user art direction; exact historic colours remain unverified.','Crowds, exact historical exhibits, concealed services and fine sculpture are omitted. Boats, rods, marine reliefs and tank details are simplified interpretations.','Ground is review-only. Native bear source geometry/base colours retained; source projection-paint shader omitted. Vertex-colour tile variation is omitted by the CPU adapter.','Cutaways hide roofs/high walls only for review; they do not alter the runtime asset.']};
 fs.writeFileSync(path.join(directory,'scene.json'),JSON.stringify(record,null,2)+'\n');return record;
}
try{const filter=process.argv[2],records=[];for(const spec of definitions){if(filter&&spec.name!==filter)continue;const {materials,...r}=exportView(spec);records.push(r);console.log('Exported '+spec.name+' / '+r.triangles+' actual triangles.');}const indexPath=path.join(out,'index.json'),old=fs.existsSync(indexPath)?JSON.parse(fs.readFileSync(indexPath)):[];fs.writeFileSync(indexPath,JSON.stringify([...old.filter(r=>!records.some(n=>n.name===r.name)),...records],null,2)+'\n');}
finally{model.dispose();bear.dispose();for(const r of owned)r.dispose();}
