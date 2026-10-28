import {mergeCenteredWindowEdges,addCenteredWindow} from './nautilus-windows.js';
import {Resources} from './resources.js';
import {ASSET_SCALE as S} from '../content/asset-scale.js';

export const GROSS_HOUSING_URL=new URL('../../assets/art/gross-housing-v1/houses.json',import.meta.url).href;
const textureFiles={clapboard:'gross-housing-v1/clapboard-ivory-v1.png',cedar:'gross-housing-v1/cedar-shingles-v1.png',oak:'gross-housing-v1/floorboards-oak-v1.png',paper:'gross-housing-v1/wallpaper-botanical-v1.png',brick:'exposition-skins-v1/brick-sienna-v1.png',slate:'exposition-skins-v1/roof-slate-v1.png'};
export async function loadGrossHousing(T,{renderer,catalogueUrl=GROSS_HOUSING_URL}={}){
  const response=await fetch(catalogueUrl);if(!response.ok)throw Error('Housing catalogue '+response.status);
  const catalogue=await response.json(),pool=new Resources(),textures={};
  try{const loads=await Promise.allSettled(Object.entries(textureFiles).map(async([id,file])=>{
    const texture=pool.texture(await new T.TextureLoader().loadAsync(new URL('../../assets/art/'+file,import.meta.url).href));
    texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.repeat.setScalar(['brick','slate'].includes(id)?.5:1);texture.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||2);textures[id]=texture;
  }));const failed=loads.find(r=>r.status==='rejected');if(failed)throw failed.reason;}catch(error){pool.dispose();throw error;}
  return{catalogue,textures,dispose:()=>pool.dispose(),diagnostics:()=>pool.counts()};
}
export function pointInRoom([x,z],polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,az]=polygon[j],[bx,bz]=polygon[i],cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);
    if(Math.abs(cross)<1e-7&&x>=Math.min(ax,bx)-1e-7&&x<=Math.max(ax,bx)+1e-7&&z>=Math.min(az,bz)-1e-7&&z<=Math.max(az,bz)+1e-7)return true;
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
  }return inside;
}
const key=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
export function planEdges(floor){
  const edges=new Map();
  for(const room of floor.rooms){
    const p=room.polygon;
    for(let i=0;i<p.length;i++){
      const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.max(Math.abs(dx),Math.abs(dz));
      if(!Number.isInteger(n)||!n||(dx&&dz&&Math.abs(dx)!==Math.abs(dz)))throw Error('Plan requires unit or 45 degree edges: '+room.id);
      for(let j=0;j<n;j++){
        const c=[a[0]+dx*j/n,a[1]+dz*j/n],d=[a[0]+dx*(j+1)/n,a[1]+dz*(j+1)/n],id=key(c,d);
        if(edges.has(id))edges.get(id).rooms.push(room.id);else edges.set(id,{id,a:c,b:d,rooms:[room.id],opening:null});
      }
    }
  }
  for(const pair of floor.connections){
    const candidates=[...edges.values()].filter(e=>pair.every(id=>e.rooms.includes(id)));
    if(!candidates.length)throw Error('Unconnected plan rooms '+floor.label+': '+pair.join('/'));
    const center=candidates.reduce((s,e)=>[s[0]+(e.a[0]+e.b[0])/2,s[1]+(e.a[1]+e.b[1])/2],[0,0]).map(x=>x/candidates.length);
    candidates.sort((a,b)=>Math.hypot((a.a[0]+a.b[0])/2-center[0],(a.a[1]+a.b[1])/2-center[1])-Math.hypot((b.a[0]+b.b[0])/2-center[0],(b.a[1]+b.b[1])/2-center[1]));
    if(floor.openConnections?.some(other=>pair.every(id=>other.includes(id))))for(const edge of candidates)edge.opening='arch';else candidates[0].opening='door';
  }
  if(floor.entry){const e=edges.get(key(floor.entry.slice(0,2),floor.entry.slice(2)));if(!e||e.rooms.length!==1)throw Error('Entry must be an exterior unit edge');e.opening='entry';}
  for(const e of edges.values())if(e.rooms.length>2)throw Error('Overlapping wall ownership '+e.id);
  return [...edges.values()];
}
export function housePlanEdges(house,floor,{partyWalls=true}={}){
 const edges=planEdges(floor);
 if(Array.isArray(floor.windows)){
  for(const opening of floor.windows){const edge=edges.find(e=>e.id===key(opening.slice(0,2),opening.slice(2)));if(!edge||edge.rooms.length!==1||edge.opening)throw Error('Invalid declared window in '+house.id);edge.opening='window';}
  return mergeCenteredWindowEdges(edges,floor.windowBays);
 }
 for(const e of edges){
  if(e.opening||e.rooms.length!==1)continue;
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],side=!!dz&&!dx,party=house.partyWalls&&partyWalls&&side,index=Math.round((e.a[0]+e.b[0]+e.a[1]+e.b[1])/2),front=!dz&&Math.min(e.a[1],e.b[1])<=0;
  if(!party&&(dx&&dz||(front?Math.round(Math.min(e.a[0],e.b[0]))%2===0:index%3===1)))e.opening='window';
 }
 return mergeCenteredWindowEdges(edges,floor.windowBays);
}
function bounds(p){const xs=p.map(p=>p[0]),zs=p.map(p=>p[1]);return{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};}

// This is a visual asset assembler. It does not compile gameplay walls, collision,
// navigation, stairs or fire. Diagonal meshes are newly declared art pieces.
export function createGrossHouse(T,library,id,{furnished=true,partyWalls=true,roofBuilder=null}={}){
  const house=library.catalogue.houses.find(h=>h.id===id);if(!house)throw Error('Unknown Gross house '+id);
  const pool=new Resources(),root=new T.Group(),geometryCache=new Map(),wallMaterials=[],levelRecords=[];
  root.name='Gross housing: '+id;root.userData={assetId:id,artistPrefab:true,nativeContract:house.nativeContract,integration:house.integration};
  const clip=new T.Plane(new T.Vector3(0,-1,0),100),stats={wallUnits:0,diagonalUnits:0,doors:0,windows:0,props:0,floorTriangles:0};
  let closed=false,mode='exterior',selected=0;
  function mat(name,color,map=null,{wall=false,roughness=.92,metalness=0}={}){
    const material=pool.material(new T.MeshStandardMaterial({name,color,map,roughness,metalness,side:T.DoubleSide}));
    if(map){material.onBeforeCompile=shader=>{shader.vertexShader='attribute vec2 grossUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (mapTransform * vec3(grossUV, 1.0)).xy;\n#endif');};material.customProgramCacheKey=()=> 'gross-physical-uv-v1';}
    if(wall){wallMaterials.push(material);material.clippingPlanes=[];material.clipShadows=true;}
    return material;
  }
  const m={exterior:mat('Painted exterior',house.style.color,library.textures[house.style.wall],{wall:true}),paper:mat('Botanical wallpaper','#f4e8cb',library.textures.paper,{wall:true}),plaster:mat('Service plaster','#d1c8ad',null,{wall:true}),trim:mat('Painted trim',house.style.trim,null,{wall:true}),accent:mat('Painted accent',house.style.accent,null,{wall:true}),floor:mat('Oak boards','#d8be96',library.textures.oak),stone:mat('Brick basement','#b9ae97',library.textures.brick,{wall:true}),roof:mat('Roof covering','#a7a294',library.textures[house.style.roof]),shingle:mat('Gable shingles','#d9ceb4',library.textures.cedar),doorWood:mat('Door panels','#725037',null,{wall:true}),wallIron:mat('Door iron','#343932',null,{wall:true}),wood:mat('Dark oak joinery','#725037'),glass:mat('Sash glass','#6f9398',null,{wall:true}),iron:mat('Black iron','#343932',null,{roughness:.6,metalness:.35}),linen:mat('Cream linen','#e5dcc3'),cloth:mat('Woven upholstery','#897652'),red:mat('Wool rug','#8b4e3f'),ceramic:mat('Cream enamel','#d0d1bd'),earth:mat('Porch & plinth','#aa9b7d')};
  function project(geometry){
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=[];
    for(let i=0;i<p.count;i++){
      if(Math.abs(n.getY(i))>.55)uv.push(p.getX(i),p.getZ(i));
      else uv.push(Math.abs(n.getX(i))>.55?p.getZ(i):p.getX(i),p.getY(i));
    }
    geometry.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));return geometry;
  }
  function boxGeometry(w,h,d){const k=[w,h,d].join('/');if(!geometryCache.has(k))geometryCache.set(k,pool.geometry(project(new T.BoxGeometry(w,h,d))));return geometryCache.get(k);}
  function box(parent,name,w,h,d,x,y,z,material,rotation=0){
    const mesh=new T.Mesh(boxGeometry(w,h,d),material);mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=true;mesh.userData={nativeDimensions:[w,h,d],assetRole:name};parent.add(mesh);return mesh;
  }
  function cylinder(parent,name,r1,r2,h,x,y,z,material,segments=8){
    const k=['cylinder',r1,r2,h,segments].join('/');if(!geometryCache.has(k))geometryCache.set(k,pool.geometry(project(new T.CylinderGeometry(r1,r2,h,segments))));
    const mesh=new T.Mesh(geometryCache.get(k),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function line(parent,name,a,b,width,material){
    const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),mesh=box(parent,name,width,delta.length(),width,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,material);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return mesh;
  }
  function floorMesh(parent,room,y,stairHole){
    const b=bounds(room.polygon),positions=[],uv=[],push=(a,b,c)=>{
      const center=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];
      if(stairHole&&center[0]>stairHole.x&&center[0]<stairHole.x+1&&center[1]>stairHole.z&&center[1]<stairHole.z+3)return;
      positions.push(a[0],y,a[1],c[0],y,c[1],b[0],y,b[1]);uv.push(...a,...c,...b);stats.floorTriangles++;
    };
    for(let x=b.minX;x<b.maxX;x+=.5)for(let z=b.minZ;z<b.maxZ;z+=.5){
      const corners=[[x,z],[x+.5,z],[x+.5,z+.5],[x,z+.5]],inside=corners.filter(p=>pointInRoom(p,room.polygon));
      if(inside.length===4){push(corners[0],corners[1],corners[2]);push(corners[0],corners[2],corners[3]);}
      else if(inside.length===3)push(...inside);
    }
    const g=pool.geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();
    const mesh=new T.Mesh(g,m.floor);mesh.name='Room floor: '+room.id;mesh.receiveShadow=true;parent.add(mesh);
  }
  function frame(parent,length,kind,smallWindow=false){
    if(kind==='window'){
      const openingHeight=smallWindow?.7:1.2,sillHeight=1.55-openingHeight,centerY=sillHeight+openingHeight/2;
      box(parent,smallWindow?'Native window sill':'New Victorian window sill',1,sillHeight,S.wallThickness,0,sillHeight/2,0,[m.trim,m.trim,m.trim,m.trim,m.paper,m.exterior]);
      box(parent,'Native window lintel',1,.45,S.wallThickness,0,1.775,0,[m.trim,m.trim,m.trim,m.trim,m.paper,m.exterior]);
      if(length>1){const w=(length-1)/2;for(const sign of [-1,1])box(parent,'Nautilus cut window pier',w,S.wallHeight,S.wallThickness,sign*(.5+w/2),S.wallHeight/2,0,m.exterior);}
      box(parent,smallWindow?'Native sash glass':'New Victorian sash glass',.98,openingHeight-.02,.035,0,centerY,0,m.glass);
      for(const side of [-1,1])box(parent,'Sash casing',.075,openingHeight+.15,.23,side*.53,centerY,0,m.trim);
      for(const y of [sillHeight-.04,centerY,1.59])box(parent,'Sash rail',1.13,.055,.23,0,y,0,m.trim);
      box(parent,'Sash mullion',.035,openingHeight+.03,.12,0,centerY,-.055,m.accent);
      box(parent,'Window apron',1.18,.095,.22,0,sillHeight-.11,-.03,m.trim);stats.windows++;
    }else if(kind==='door'||kind==='entry'||kind==='arch'){
      box(parent,'Native door lintel',1,S.wallHeight-S.doorHeight,S.wallThickness,0,(S.wallHeight+S.doorHeight)/2,0,[m.trim,m.trim,m.trim,m.trim,m.paper,m.exterior]);
      if(length>1){const w=(length-1)/2;for(const sign of [-1,1])box(parent,'Nautilus cut door pier',w,S.wallHeight,S.wallThickness,sign*(.5+w/2),S.wallHeight/2,0,m.exterior);}
      for(const sign of [-1,1])box(parent,'Door casing',.065,1.74,.21,sign*.54,.87,0,m.trim);
      box(parent,'Door header',1.14,.08,.21,0,1.72,0,m.trim);
      if(kind==='arch')return;
      const hinge=new T.Group();hinge.position.x=-.5;parent.add(hinge);if(kind==='door')hinge.rotation.y=Math.PI*.42;
      const leaf=box(hinge,'Native closed-door leaf',S.doorWidth,S.doorHeight,S.doorThickness,.5,S.doorHeight/2,0,m.accent);leaf.userData.sourceAsset='roomBoxes:Closed door';
      for(const y of [.35,1.12])box(hinge,'Raised door panel',.74,.49,.025,.5,y,-.073,m.doorWood);
      cylinder(hinge,'Door knob',.035,.035,.055,.88,.87,-.12,m.wallIron,8).rotation.x=Math.PI/2;stats.doors++;
    }else{
      for(let along=0;along<length-1e-8;along+=1){const width=Math.min(1,length-along);box(parent,width===1?'Native wall unit':'Nautilus cut-end wall panel',width,S.wallHeight,S.wallThickness,-length/2+along+width/2,S.wallHeight/2,0,[m.trim,m.trim,m.trim,m.trim,m.paper,m.exterior]);}
    }
    if(kind!=='door'&&kind!=='entry'){
      box(parent,'Interior skirting',length,.11,.045,0,.055,.105,m.accent);
      box(parent,'Picture rail',length,.035,.035,0,1.77,.105,m.trim);
    }
  }
  function wall(parent,e,level,basement){
    const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],length=Math.hypot(dx,dz),group=new T.Group();
    group.position.set((e.a[0]+e.b[0])/2,level,(e.a[1]+e.b[1])/2);group.rotation.y=-Math.atan2(dz,dx);group.name='wall:'+e.id;group.userData={edge:e.id,rooms:e.rooms,diagonal:!!(dx&&dz),newArtGeometry:!!(dx&&dz)};parent.add(group);
    const opening=e.opening;
    const external=m.exterior,internal=m.paper;
    if(basement){m.exterior=house.id==='ashland-worker'?m.exterior:m.stone;m.paper=m.plaster;}else if(e.rooms.length===2)m.exterior=m.paper;
    if(e.windowProfile){
      m.brass??=mat('Window brass','#a88a4f',null,{wall:true,roughness:.5,metalness:.45});
      const window=addCenteredWindow(T,group,pool,e.windowProfile,{wall:m.exterior,inside:m.paper,trim:m.trim,sash:m.accent,brass:m.brass,glass:m.glass});
      window.root.userData.windowBayId=e.windowBayId;stats.windows++;
    }else frame(group,length,opening,basement);
    m.exterior=external;m.paper=internal;
    if(basement&&['ashland-worker','archer-worker','humboldt-cottage'].includes(house.id)){for(const x of [-length/2,length/2])box(group,'Basement framing',.055,2,.035,x,1,-.1,m.accent);for(const yy of [.08,1,1.94])box(group,'Basement framing',length,.055,.035,0,yy,-.1,m.accent);}
    stats.wallUnits++;if(dx&&dz)stats.diagonalUnits++;
    e.presentationOpening=opening||'wall';
  }
  function stairsModel(parent,s,y){
    for(let i=0;i<12;i++){const h=(i+1)*s.rise/12;box(parent,'Stair tread',1,h,.25,s.x+.5,y+h/2,s.z+(i+.5)*.25,m.wood);}
    for(const side of [0,1]){
      for(const i of [0,4,8,12])box(parent,'Stair newel',.065,.75,.065,s.x+side,y+i*s.rise/12+.38,s.z+i*.25,m.accent);
      line(parent,'Stair handrail',[s.x+side,y+.78,s.z],[s.x+side,y+s.rise+.78,s.z+3],.055,m.accent);
    }
  }
  function choosePosition(room,w,d,doors,stair){
    const b=bounds(room.polygon),choices=[];
    for(let x=b.minX+.1;x+w<=b.maxX+.001;x+=.25)for(let z=b.minZ+.1;z+d<=b.maxZ+.001;z+=.25){
      if(![[x,z],[x+w,z],[x+w,z+d],[x,z+d]].every(p=>pointInRoom(p,room.polygon)))continue;
      if(stair&&x<stair.x+1.1&&x+w>stair.x-.1&&z<stair.z+3.1&&z+d>stair.z-.1)continue;
      if(doors.some(p=>p[0]>x-.5&&p[0]<x+w+.5&&p[1]>z-.5&&p[1]<z+d+.5))continue;
      choices.push({x:x+w/2,z:z+d/2,score:Math.min(x-b.minX,b.maxX-x-w)+Math.min(z-b.minZ,b.maxZ-z-d)});
    }
    choices.sort((a,b)=>a.score-b.score);return choices[0];
  }
  function furnishing(parent,room,y,edges,stair){
    const doors=edges.filter(e=>e.rooms.includes(room.id)&&['door','entry'].includes(e.opening)).map(e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2]);
    const bedroom=room.type==='bedroom',kitchen=room.type==='kitchen',service=room.type==='service',bath=room.type==='bath';
    const w=bedroom?1.1:kitchen?1.5:bath?.8:service?1:1.6,d=bedroom?1.85:kitchen?.7:bath?.65:service?.6:1;
    const p=choosePosition(room,w,d,doors,stair);if(!p)return;
    const g=new T.Group();g.position.set(p.x,y,p.z);g.name='Furnishing: '+room.type;parent.add(g);stats.props++;
    const b=(name,w,h,d,x,yy,z,mat)=>box(g,name,w,h,d,x,yy,z,mat);
    if(bedroom){
      b('Bed frame',1.05,.2,1.82,0,.23,0,m.wood);b('Linen mattress',1,.17,1.75,0,.405,0,m.linen);b('Wool coverlet',1.01,.05,1.1,0,.51,.25,m.cloth);b('Pillow',.74,.1,.36,0,.53,-.6,m.linen);
      b('Headboard',1.1,.8,.07,0,.45,-.9,m.wood);for(const x of [-.5,.5])for(const z of [-.86,.86])cylinder(g,'Bed post',.045,.05,.68,x,.35,z,m.wood);
    }else if(kitchen){
      b('Cast iron stove',.8,.7,.62,-.3,.35,0,m.iron);for(const x of [-.48,-.1])cylinder(g,'Stove hotplate',.13,.13,.025,x,.71,0,m.iron,16);
      cylinder(g,'Stove flue',.055,.055,1,-.54,1.2,.22,m.iron);b('Kitchen work table',.56,.08,.65,.48,.7,0,m.wood);for(const x of [.25,.7])for(const z of [-.24,.24])b('Table leg',.05,.7,.05,x,.35,z,m.wood);
    }else if(bath){b('Bath pedestal',.45,.35,.45,0,.18,0,m.ceramic);b('Wash basin',.75,.15,.62,0,.45,0,m.ceramic);cylinder(g,'Tap',.025,.025,.18,0,.6,.19,m.iron);}
    else if(service||room.type==='pantry'){
      b('Storage cabinet',.95,1.15,.42,0,.58,0,m.wood);for(const yy of [.25,.65,1.05])b('Shelf',.95,.035,.46,0,yy,0,m.earth);
    }else if(['parlor','sitting','library'].includes(room.type)){
      b('Settee seat',1.55,.2,.65,0,.38,0,m.cloth);b('Settee back',1.55,.48,.13,0,.66,.32,m.cloth);for(const x of [-.73,.73])b('Settee arm',.12,.3,.68,x,.58,0,m.wood);for(const x of [-.6,.6])for(const z of [-.2,.2])b('Settee leg',.07,.28,.07,x,.14,z,m.wood);
      b('Wool hearth rug',1.5,.025,.38,0,.015,-.55,m.red);
    }else if(room.type==='dining'){
      b('Dining table',1.5,.1,.85,0,.73,0,m.wood);for(const x of [-.6,.6])for(const z of [-.3,.3])b('Dining leg',.07,.7,.07,x,.35,z,m.wood);
      for(const z of [-.65,.65]){b('Dining chair seat',.4,.08,.4,0,.4,z,m.wood);b('Dining chair back',.4,.44,.06,0,.65,z+Math.sign(z)*.17,m.wood);}
    }else{b('Hall console',1.2,.07,.35,0,.72,0,m.wood);for(const x of [-.5,.5])b('Console leg',.055,.7,.28,x,.35,0,m.wood);}
  }
  const allFloors=[...(house.basementFloor?[{floor:house.basementFloor,index:-1}]:[]),...house.floors.map((floor,index)=>({floor,index}))];
  for(const {floor,index} of allFloors){
    const y=house.plinth+index*S.floorSpacing,group=new T.Group();group.name='Level '+index;root.add(group);
    const walls=new T.Group(),props=new T.Group();group.add(walls,props);const edges=housePlanEdges(house,floor,{partyWalls}),shaft=index>=0&&house.floors[0].stairs?house.floors[0].stairs:null;
    for(const room of floor.rooms){floorMesh(group,room,y,index>0?shaft:null);if(furnished)furnishing(props,room,y,edges,shaft);}
    for(const e of edges)wall(walls,e,y,index<0);
    // New slab rims expose the native .12m floor spacing without scaling walls.
    for(const e of edges.filter(e=>e.rooms.length===1)){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1];box(group,'Floor slab rim',Math.hypot(dx,dz),S.slab,.18,(e.a[0]+e.b[0])/2,y-S.slab/2,(e.a[1]+e.b[1])/2,m.earth,-Math.atan2(dz,dx));}
    if(index>=0&&index<house.floors.length-1&&shaft)stairsModel(props,shaft,y);
    levelRecords.push({index,y,group,walls,props,floor,edges});
  }
  // Where no basement plan exists, use a shallow new plinth rather than a stretched native wall.
  if(!house.basementFloor)box(root,'New raised plinth',house.width,house.plinth,.0+house.depth,house.width/2,house.plinth/2-S.slab,house.depth/2,m.earth);
  const ornament=new T.Group();ornament.name='Exterior ornament';root.add(ornament);
  const top=house.plinth+(house.floors.length-1)*S.floorSpacing+S.wallHeight;
  // Vertical roof enclosures continue the house siding or masonry. Roof covering
  // belongs to the sloped envelope; changing its skin never repaints the walls.
  function roof(parent,cx,cz,w,d,y,h,form='gable'){
    const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2,positions=[],uv=[];
    const tri=(a,b,c)=>{positions.push(...a,...b,...c);const av=new T.Vector3(...a),normal=new T.Vector3(...b).sub(av).cross(new T.Vector3(...c).sub(av)).normalize();if(normal.y<0)normal.negate();const u=new T.Vector3().crossVectors(normal,new T.Vector3(0,1,0)).normalize();if(u.x<-.001||Math.abs(u.x)<.001&&u.z<0)u.negate();const v=new T.Vector3().crossVectors(normal,u).normalize();for(const p of [a,b,c]){const q=new T.Vector3(...p);uv.push(q.dot(u),q.dot(v));}};
    const a=[x0,y,z0],b=[x1,y,z0],c=[x1,y,z1],e=[x0,y,z1];
    if(form==='hip'){
      const inset=Math.min(w,d)/2,l=[cx,y+h,z0+inset],r=[cx,y+h,z1-inset];tri(a,b,l);tri(e,r,c);tri(a,l,r);tri(a,r,e);tri(b,c,r);tri(b,r,l);
    }else{
      const l=[cx,y+h,z0],r=[cx,y+h,z1];tri(a,l,r);tri(a,r,e);tri(b,c,r);tri(b,r,l);
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...l,...e,...r,...c],3));g.computeVertexNormals();project(g);g.setAttribute('uv',g.attributes.grossUV.clone());const mesh=new T.Mesh(pool.geometry(g),m.exterior);mesh.name='New gable infill';parent.add(mesh);
      for(const z of [z0,z1]){line(parent,'Gable bargeboard',[x0,y,z],[cx,y+h,z],.1,m.trim);line(parent,'Gable bargeboard',[cx,y+h,z],[x1,y,z],.1,m.trim);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('grossUV',g.attributes.uv.clone());g.computeVertexNormals();const mesh=new T.Mesh(pool.geometry(g),m.roof);mesh.name='New roof envelope';mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
    for(const x of [x0,x1])line(parent,'Eaves fascia',[x,y,z0],[x,y,z1],.11,m.trim);
  }
  const roofs=new T.Group();roofs.name='Removable roofs';root.add(roofs);
  if(!roofBuilder){
  const roofHeight=house.style.form==='row'?1:Math.min(2.1,house.width*.24);
  const rearStart=house.style.turret?5:0;
  roof(roofs,house.width/2,(house.depth+rearStart)/2,house.width+.5,house.depth-rearStart+.5,top+.08,roofHeight,house.style.form==='hip'?'hip':'gable');
  if(house.style.form!=='hip'){box(roofs,'New attic sash',.68,.48,.06,house.width/2,top+.62,-.29,m.glass);for(const x of [-.37,0,.37])box(roofs,'Attic sash trim',.045,.55,.08,house.width/2+x,top+.62,-.33,m.trim);for(const yy of [top+.35,top+.62,top+.89])box(roofs,'Attic sash trim',.78,.035,.08,house.width/2,yy,-.33,m.trim);}
  if(house.style.form==='cross'&&!house.style.turret){
    const cross=new T.Group();cross.position.set(house.width*.5,0,house.depth*.48);cross.rotation.y=Math.PI/2;roofs.add(cross);roof(cross,0,0,4.4,house.width+2.5,top+.09,1.45);
  }
  if(house.style.dormer){roof(roofs,house.width/2,1,2.6,2,top+.6,1.25);box(roofs,'Dormer front',2.3,.9,.15,house.width/2,top+.85,.0,m.exterior);for(const x of [-.6,0,.6])box(roofs,'Dormer sash',.4,.4,.06,house.width/2+x,top+.95,-.09,m.glass);}
  for(const x of (['ashland-worker','archer-worker','humboldt-cottage'].includes(house.id)?[house.width*.65]:[1,house.width-1]))box(roofs,'New brick chimney',.52,1.6,.62,x,top+roofHeight,house.depth*.7,m.stone);
  if(house.style.spire){
    const x=house.style.spire[0],z=house.id==='grossdale-spire'?-.1:house.style.spire[1];
    box(roofs,'New spire drum',1.55,1.35,1.1,x,top+.64,z,m.exterior);
    for(const side of [-1,1])box(roofs,'Spire corner board',.1,1.4,.12,x+side*.72,top+.65,z-.58,m.trim);
    box(roofs,'Spire frieze',1.7,.14,1.26,x,top+1.28,z,m.trim);box(roofs,'Spire sash',.62,.7,.06,x,top+.65,z-.59,m.glass);
    cylinder(roofs,'Square spire roof',0,1.1,2.2,x,top+2.45,z,m.roof,4).rotation.y=Math.PI/4;cylinder(roofs,'Spire finial',.025,.045,.65,x,top+3.85,z,m.iron);
  }
  if(house.style.turret){
    const polygon=house.floors[0].rooms.find(r=>r.id==='parlor').polygon,b=bounds(polygon),x=(b.minX+b.maxX)/2,z=(b.minZ+b.maxZ)/2;
    const attic={label:'Unplanned decorative attic bay',rooms:[{id:'attic-bay',polygon}],connections:[]};
    for(const e of housePlanEdges(house,attic))wall(roofs,e,top+.12,false);
    roof(roofs,1,2.5,2.4,5.5,top+.08,.7,'hip');roof(roofs,house.width-.5,2.5,1.4,5.5,top+.08,.5,'hip');
    cylinder(roofs,'Octagonal turret roof',0,3.05,1.7,x,top+2.97,z,m.roof,8).rotation.y=Math.PI/8;
    cylinder(roofs,'Turret finial',.025,.05,.65,x,top+4.13,z,m.iron);
  }
  if(house.style.form==='row'){
    const cx=house.width-2,z=-1.13,w=4,y=top+.05,h=1.65;
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([cx-w/2,y,z,cx+w/2,y,z,cx,y+h,z],3));g.computeVertexNormals();project(g);g.setAttribute('uv',g.attributes.grossUV.clone());const infill=new T.Mesh(pool.geometry(g),m.stone);infill.name='New Monroe ornamental front gable';roofs.add(infill);
    line(roofs,'Monroe gable coping',[cx-w/2,y,z-.03],[cx,y+h,z-.03],.11,m.trim);line(roofs,'Monroe gable coping',[cx,y+h,z-.03],[cx+w/2,y,z-.03],.11,m.trim);
    const fan=pool.geometry(project(new T.CircleGeometry(.52,24,0,Math.PI))),window=new T.Mesh(fan,m.glass);window.position.set(cx,y+.45,z-.045);window.name='New Monroe fanlight';roofs.add(window);
    line(roofs,'Fanlight sill',[cx-.56,y+.45,z-.08],[cx+.56,y+.45,z-.08],.07,m.trim);
    for(let i=0;i<16;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;line(roofs,'Fanlight arch',[cx+Math.cos(a)*.55,y+.45+Math.sin(a)*.55,z-.08],[cx+Math.cos(b)*.55,y+.45+Math.sin(b)*.55,z-.08],.06,m.trim);}
    for(const a of [Math.PI/4,Math.PI/2,Math.PI*3/4])line(roofs,'Fanlight radial bar',[cx,y+.45,z-.1],[cx+Math.cos(a)*.5,y+.45+Math.sin(a)*.5,z-.1],.025,m.trim);
  }
  }
  function porch(){
    const p=house.porch;if(!p)return;const y=house.plinth;
    box(ornament,'Porch deck',p.width,.12,p.depth,p.x+p.width/2,y-.06,p.z+p.depth/2,m.floor);
    const stoop=['ashland-worker','archer-worker','humboldt-cottage'].includes(house.id);
    const postXs=stoop?[]:[p.x+.12,p.x+p.width-.12];if(p.width>5)postXs.splice(1,0,p.x+p.width/2);
    for(const x of postXs){
      const z=p.z+.12;box(ornament,'Porch post base',.18,.2,.18,x,y+.1,z,m.trim);cylinder(ornament,'Turned porch post',.06,.085,1.6,x,y+1,z,m.trim);cylinder(ornament,'Post collar',.1,.1,.07,x,y+.46,z,m.accent);box(ornament,'Porch capital',.2,.13,.2,x,y+1.82,z,m.trim);
      for(const sign of [-1,1])line(ornament,'Porch diagonal bracket',[x,y+1.45,z],[x+sign*.36,y+1.85,z],.055,m.trim);
    }
    if(!stoop)box(ornament,'Porch beam',p.width,.12,.18,p.x+p.width/2,y+1.93,p.z+.12,m.trim);
    // Entry-aligned break in balustrade leaves the native doorway and stair route clear.
    const e=house.floors[0].entry,entryX=e?(e[0]+e[2])/2:p.x+p.width/2;
    for(let x=p.x+.2;x<p.x+p.width-.1;x+=.22){if(Math.abs(x-entryX)<.65)continue;box(ornament,'Porch baluster',.045,.62,.045,x,y+.4,p.z+.12,m.trim);}
    for(const [lo,hi] of [[p.x,Math.max(p.x,entryX-.65)],[Math.min(p.x+p.width,entryX+.65),p.x+p.width]])if(hi>lo)box(ornament,'Porch handrail',hi-lo,.06,.075,(lo+hi)/2,y+.75,p.z+.12,m.accent);
    const n=Math.max(3,Math.ceil(y/.18)),run=n*.22;
    for(let i=0;i<n;i++){const h=y*(i+1)/n;box(ornament,'New entry stair',1.16,h,.22,entryX,h/2,p.z-run+(i+.5)*.22,m.earth);}
    for(const side of [-.61,.61])line(ornament,'Entry stair rail',[entryX+side,.75,p.z-run],[entryX+side,y+.75,p.z],.055,m.accent);
    if(!stoop&&!roofBuilder)roof(roofs,p.x+p.width/2,p.z+p.depth/2,p.width+.35,p.depth+.35,y+2.02,.35,'hip');
  }porch();
  if(roofBuilder)roofBuilder({roof,box,line,cylinder,project,pool,roofs,ornament,materials:m,top,house});
  if(house.style.balcony&&house.porch){const p=house.porch;for(let x=p.x+.1;x<p.x+p.width;x+=.3)box(roofs,'Balcony baluster',.05,.55,.05,x,house.plinth+2.38,p.z+.1,m.trim);box(roofs,'Balcony top rail',p.width,.07,.08,p.x+p.width/2,house.plinth+2.66,p.z+.1,m.trim);}
  function setView({view='exterior',level=0,showFurniture=true}={}){
    if(closed)return;mode=view;selected=level;const cut=view==='cutaway';
    roofs.visible=!cut;ornament.visible=!cut;for(const l of levelRecords){l.group.visible=!cut||l.index===level;l.props.visible=showFurniture;}
    clip.constant=house.plinth+level*S.floorSpacing+.66;
    for(const material of wallMaterials){material.clippingPlanes=cut?[clip]:[];material.needsUpdate=true;}
  }
  setView();
  return{root,house,levels:levelRecords.map(l=>({index:l.index,label:l.floor.label,y:l.y})),setView,
    diagnostics:()=>({...stats,id,mode,selected,resources:pool.counts(),nativeContract:house.nativeContract,disposed:closed}),
    dispose(){if(closed)return;closed=true;root.removeFromParent();root.clear();pool.dispose();}
  };
}