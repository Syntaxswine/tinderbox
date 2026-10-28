import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from '../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js';
import {createHopkinsHouse} from '../../../src/art/hopkins-housing.js';
import {createHopkinsNeighborhoodHouse} from '../../../src/art/hopkins-neighborhood.js';
import {createGrossHouse} from '../../../src/art/gross-housing.js';
const collection=process.argv.includes('--collection')?process.argv[process.argv.indexOf('--collection')+1]:'hopkins';
if(!['hopkins','gross','hopkins2'].includes(collection))throw Error('Unknown housing collection');
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url))),out=path.join(root,'artifacts/'+collection+'-renders/scenes');fs.mkdirSync(out,{recursive:true});
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'assets/art/'+(collection==='hopkins2'?'hopkins-housing-v2':collection+'-housing-v1')+'/houses.json'),'utf8'));
const texturePaths={clapboard:'gross-housing-v1/clapboard-ivory-v1.png',cedar:'gross-housing-v1/cedar-shingles-v1.png',oak:'gross-housing-v1/floorboards-oak-v1.png',paper:'gross-housing-v1/wallpaper-botanical-v1.png',brick:'exposition-skins-v1/brick-sienna-v1.png',slate:'exposition-skins-v1/roof-slate-v1.png'};
const textures=Object.fromEntries(Object.entries(texturePaths).map(([id,file])=>{const t=new T.Texture();t.userData.file='assets/art/'+file;t.repeat.setScalar(['brick','slate'].includes(id)?.5:1);return[id,t];}));
function clip(poly,y){const result=[];for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],insideA=a[1]<=y,insideB=b[1]<=y;if(insideA)result.push(a);if(insideA!==insideB){const t=(y-a[1])/(b[1]-a[1]);result.push(a.map((v,k)=>v+(b[k]-v)*t));}}return result;}
function exportView(model,view,level){
 model.setView({view,level});model.root.updateMatrixWorld(true);const groups=new Map(),points=[];
 model.root.traverseVisible(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,uv=g.attributes.grossUV,index=g.index,materials=Array.isArray(o.material)?o.material:[o.material];
 const ranges=Array.isArray(o.material)?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}];
 for(const range of ranges){const m=materials[range.materialIndex];if(!m)continue;let record=groups.get(m.uuid);if(!record){record={name:m.name,color:m.color.toArray(),texture:m.map?.userData.file||null,repeat:m.map?.repeat.toArray()||[1,1],vertices:[]};groups.set(m.uuid,record);}
 for(let i=range.start;i<range.start+range.count;i+=3){let poly=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j,v=new T.Vector3().fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld);poly.push([v.x,v.y,v.z,uv.getX(k),uv.getY(k)]);}
 if(m.clippingPlanes?.length)poly=clip(poly,m.clippingPlanes[0].constant);
 for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){record.vertices.push(v);points.push(v);}
 }
 }
 });
 const id=model.house.id+'-'+view+'-'+level,directory=path.join(out,id);fs.mkdirSync(directory,{recursive:true});const files=[];
 let materialIndex=0;for(const record of groups.values()){
 const vs=record.vertices;if(!vs.length)continue;const file='material-'+materialIndex+++'.ply',header=Buffer.from(`ply\nformat binary_little_endian 1.0\nelement vertex ${vs.length}\nproperty float x\nproperty float y\nproperty float z\nproperty float u\nproperty float v\nelement face ${vs.length/3}\nproperty list uchar uint vertex_indices\nend_header\n`),bytes=Buffer.alloc(vs.length*20+vs.length/3*13);let n=0;
 for(const v of vs)for(const component of v){bytes.writeFloatLE(component,n);n+=4;}
 for(let j=0;j<vs.length;j+=3){bytes.writeUInt8(3,n++);for(let k=0;k<3;k++){bytes.writeUInt32LE(j+k,n);n+=4;}}
 fs.writeFileSync(path.join(directory,file),Buffer.concat([header,bytes]));const {vertices,...material}=record;files.push({file,...material,triangles:vs.length/3});
 }
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of points)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}
 const data={id,house:model.house.id,label:model.house.label,view,level,source:model.house.source.url,bounds:{min,max},groundY:view==='cutaway'?model.house.plinth+level*2.12-.14:-.14,materials:files};fs.writeFileSync(path.join(directory,'scene.json'),JSON.stringify(data,null,2)+'\n');return data;
}
const selected=process.argv.includes('--id')?process.argv[process.argv.indexOf('--id')+1]:null,scenes=[];
for(const h of catalogue.houses.filter(h=>!selected||h.id===selected)){const create=collection==='hopkins2'?createHopkinsNeighborhoodHouse:collection==='hopkins'?createHopkinsHouse:createGrossHouse,model=create(T,{catalogue,textures},h.id);scenes.push(exportView(model,'exterior',0));if(!process.argv.includes('--only-exterior'))for(const level of model.levels)scenes.push(exportView(model,'cutaway',level.index));model.dispose();}
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(scenes.map(({materials,...s})=>s),null,2)+'\n');console.log('Exported '+scenes.length+' actual geometry scenes, including the renderer cut planes.');
