import {createGrossHouse} from '../art/gross-housing.js';
import {createHopkinsHouse} from '../art/hopkins-housing.js';
import {createMonroeRowHouse} from '../art/row-house.js';
import {HOUSING_PLANS,HOUSING_SOURCE_COMMIT} from './housing-plans.js';
import {preparePhysicalInstance} from '../../workbenches/bell-and-alder-sandbox/compose.js';
import {legacyModuleOwner} from './catalogue-modules.js';

const round=n=>Math.round(n*1e7)/1e7;
const box=points=>({min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))});
const textureFor=(name,plan)=>({'Painted exterior':plan.style.wall==='brick'?'exposition-skins-v1/brick-sienna-v1.png':'gross-housing-v1/clapboard-ivory-v1.png','Botanical wallpaper':'gross-housing-v1/wallpaper-botanical-v1.png','Oak boards':'gross-housing-v1/floorboards-oak-v1.png','Brick basement':'exposition-skins-v1/brick-sienna-v1.png','Roof covering':plan.style.roof==='slate'?'exposition-skins-v1/roof-slate-v1.png':'gross-housing-v1/cedar-shingles-v1.png','Gable shingles':'gross-housing-v1/cedar-shingles-v1.png'}[name]);
function physical(name,role,plan){
  if(/glass/i.test(name))return {material:'glass',fuelClass:null};
  if(/iron|brass|enamel|porch & plinth|brick basement/i.test(name)||/plinth|chimney|join cap/i.test(role))return {material:/iron|brass/i.test(name)?'iron':'masonry',fuelClass:null};
  if(name==='Painted exterior'&&plan.style.wall==='brick')return {material:'masonry',fuelClass:null};
  if(/roof covering|gable shingles/i.test(name))return {material:'timber',fuelClass:'roof'};
  if(/door panel|closed-door leaf/i.test(role))return {material:'timber',fuelClass:'door'};
  if(/wall|wallpaper|plaster/i.test(name+' '+role))return {material:'timber',fuelClass:'partition'};
  return {material:'timber',fuelClass:'frame'};
}

// Serialize the actual existing native factory output, not coarse lot boxes.
// Unupgraded houses remain unfurnished/exterior-only, including their authored
// closed leaves. No source house, dimensions, UVs or party-wall recipe is edited.
export function nativeExteriorSource(T,building){
  const plan=HOUSING_PLANS[building.prefabId],library={catalogue:{houses:Object.values(HOUSING_PLANS)},textures:{}},factory=building.prefabId==='monroe-row'?createMonroeRowHouse:building.collection==='hopkins'?createHopkinsHouse:createGrossHouse;
  const model=factory(T,library,building.prefabId,{furnished:false,partyWalls:building.prefabId==='monroe-row'?building.partyWalls:false});
  const data={version:1,prefabId:building.prefabId,buildingId:building.id,units:'metres',runtimeAdapterVersion:1,sourceCommit:HOUSING_SOURCE_COMMIT,module:[1,1,2.12],thermalCell:[.5,1.06,.5],gridOrigin:[0,0,0],levels:plan.floors.map((f,i)=>({id:'level-'+i,index:i,label:f.label,floorY:plan.plinth+i*2.12})),surfaces:[],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]},sourceHashes:[],runtimeAdaptations:[{id:'native-exterior-facets',description:'Actual existing native meshes grouped into coplanar material facets. Finite combustible fuel is half the actual exposed mesh area in prototype surface units; no kilograms or legacy heat conversion is implied. Original closed leaves remain noninteractive.'}]};
  const materialIds=new Map();let sequence=0;
  const materialId=m=>{if(materialIds.has(m))return materialIds.get(m);const id='appearance-'+materialIds.size,texture=textureFor(m.name,plan);data.render.materials.push({id,name:m.name,color:m.color?.getHex()??0xffffff,roughness:m.roughness??.9,metalness:m.metalness??0,texture:texture?'../../assets/art/'+texture:null,repeat:/(?:brick-sienna|roof-slate)/.test(texture||'')?.5:1,physicalUV:true});materialIds.set(m,id);return id;};
  try{
    model.setView({view:'exterior',showFurniture:false});model.root.updateMatrixWorld(true);
    model.root.traverse(o=>{
      if(!o.isMesh||o.userData.partySide==='left'&&building.partyWalls.left)return;
      const id='native-mesh-'+sequence++,g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,guv=g.attributes.grossUV||uv,index=g.index,count=index?.count??p.count,normalMatrix=new T.Matrix3().getNormalMatrix(o.matrixWorld),render=[],facets=new Map();
      let level=null;for(let parent=o;parent;parent=parent.parent)if(/^Level /.test(parent.name)){level=Number(parent.name.slice(6));break;}
      for(let i=0;i<count;i+=3){
        const group=g.groups.find(a=>i>=a.start&&i<a.start+a.count),mat=Array.isArray(o.material)?o.material[group?.materialIndex||0]:o.material;if(!mat)continue;
        const vertices=[0,1,2].map(k=>{const j=index?index.getX(i+k):i+k,q=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld),nn=n?new T.Vector3().fromBufferAttribute(n,j).applyMatrix3(normalMatrix).normalize():new T.Vector3(0,1,0);return [...q.toArray().map(round),...nn.toArray().map(round),uv?.getX(j)||0,uv?.getY(j)||0,guv?.getX(j)||0,guv?.getY(j)||0];});
        const triangle=vertices.map(v=>v.slice(0,3)),a=new T.Vector3(...triangle[0]),b=new T.Vector3(...triangle[1]),c=new T.Vector3(...triangle[2]),cross=b.clone().sub(a).cross(c.clone().sub(a)),area=cross.length()/2;if(area<1e-9)continue;
        const normal=cross.normalize().toArray(),mid=normal.reduce((sum,v,k)=>sum+v*triangle[0][k],0),key=[materialId(mat),...normal.map(v=>Math.round(v*1e5)),Math.round(mid*1e5)].join(':');
        render.push({vertices,materialId:materialId(mat)});let facet=facets.get(key);if(!facet){facet={normal:normal.map(round),triangles:[],area:0,physical:physical(mat.name,o.name,plan)};facets.set(key,facet);}facet.triangles.push(triangle);facet.area+=area;
      }
      if(!render.length)return;
      data.sourceMeshes.push({id,name:o.name,level,matrix:new T.Matrix4().toArray(),bounds:box(render.flatMap(t=>t.vertices.map(v=>v.slice(0,3))))});data.render.geometry.push({id,triangles:render});
      let fi=0;for(const facet of facets.values()){
        const floor=/Room floor/.test(o.name),roof=/roof envelope|roof covering|gambrel roof/i.test(o.name),kind=floor?'floor':roof?'roof':/plinth|basement|chimney/i.test(o.name)?'plinth':'wall';
        data.surfaces.push({id:id+'/face-'+fi++,kind,level,normal:facet.normal,triangles:facet.triangles,bounds:box(facet.triangles.flat()),area:round(facet.area),...facet.physical,fuelAmount:facet.physical.fuelClass?round(facet.area*(floor?1:.5)):0,thickness:floor?.12:0,supports:floor||roof&&facet.normal[1]>.2,sourceMeshBindings:[id],supportSurfaceIds:[],nativeRole:o.name});
      }
    });
    return data;
  }finally{model.dispose();}
}

export function appendCatalogueNativeSources(T,compiled,host){
  const instances=[...compiled.instances],data=compiled.data;
  for(const building of host.buildings.filter(b=>!compiled.masks.buildingIds.includes(b.id))){
    const source=nativeExteriorSource(T,building),spec={id:building.id,kind:'exterior',translation:[building.x,0,building.y],quarterTurns:(4-building.quarterTurns)%4,source:'native-factory:'+building.prefabId};
    const instance=preparePhysicalInstance(source,spec);instances.push(instance);for(const key of ['levels','surfaces','items','furnitureParts','stores','openings','sourceMeshes','sourceHashes','runtimeAdaptations'])data[key].push(...instance.data[key]||[]);for(const key of ['materials','geometry'])data.render[key].push(...instance.data.render[key]);
  }
  const terrain={version:1,prefabId:'catalogue-terrain-v1',module:[1,1,2.12],levels:[{id:'ground',index:0,floorY:0}],surfaces:[],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}};
  for(const tile of host.tiles||[]){if(tile.material!=='grass')continue;const {x,y:z,size}=tile,lo=x-size/2,lz=z-size/2;terrain.surfaces.push({id:`grass:${lo},${lz}`,kind:'ground',normal:[0,1,0],material:'grass',fuelClass:'grass',fuelAmount:size*size,thickness:0,supports:true,sourceMeshBindings:[],triangles:[[[lo,0,lz],[lo+size,0,lz+size],[lo+size,0,lz]],[[lo,0,lz],[lo,0,lz+size],[lo+size,0,lz+size]]]});}
  const ground=preparePhysicalInstance(terrain,{id:'terrain',kind:'terrain',source:'host-native-grass-tiles',translation:[0,0,0],quarterTurns:0});instances.push(ground);data.surfaces.push(...ground.data.surfaces);
  // The original barrels retain their host explosion rule. Their one canonical
  // inert body uses the same 18-sided cylinder as createWorld; no second oil
  // store or explosion timer is introduced into the detailed trial.
  const props={...terrain,prefabId:'catalogue-props-v1',surfaces:[]};
  for(const o of host.obstacles.filter(o=>!o.buildingId&&!legacyModuleOwner(o,compiled.masks)&&!o.moduleId)){
    const geometry=o.kind==='barrel'?new T.CylinderGeometry(Math.min(o.width,o.depth)/2,Math.min(o.width,o.depth)/2,o.height,18):new T.BoxGeometry(o.width,o.height,o.depth),p=geometry.attributes.position,index=geometry.index,triangles=[];
    for(let i=0;i<(index?.count??p.count);i+=3)triangles.push([0,1,2].map(k=>{const j=index?index.getX(i+k):i+k;return [o.x+p.getX(j),o.height/2+p.getY(j),o.y+p.getZ(j)];}));geometry.dispose();
    props.surfaces.push({id:o.id,hostObstacleId:o.id,kind:'fitting',normal:[0,1,0],material:o.material==='wood'?'timber':'iron',fuelClass:o.material==='wood'?'furniture':null,fuelAmount:o.material==='wood'?o.width*o.depth*o.height:0,thickness:0,physicalShape:'source-closed-mesh',supports:false,sourceMeshBindings:[],triangles});
  }
  const propInstance=preparePhysicalInstance(props,{id:'street-props',kind:'props',source:'host-native-props',translation:[0,0,0],quarterTurns:0});instances.push(propInstance);data.surfaces.push(...propInstance.data.surfaces);
  data.catalogueModules.instances=instances.map(({data,...identity})=>identity);
  return {...compiled,instances,data};
}
