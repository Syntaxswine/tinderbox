import {WALL_KIT,wallPanels} from '../../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
import {BLOCK_PLAN} from './plan.js';
import {makeSculpt} from './forms.js';
import {createPalette,nativeWindowTemplates,instanceSlabs,measuredBounds,SLOT_COLOURS} from './architecture.js';
import {createClothRecipes} from './cloth.js';
import {lettering} from './lettering.js';
export {BLOCK_PLAN};
export const HULL_HOUSE_ASSET_ID='hull-house-block';
export const ENGINE_PIN='90054d07134116a5d9661f8318a76fe68f922aad';
export const HULL_SKINS=Object.freeze(['working','jubilee']);
const pitch=WALL_KIT.floorSpacing,slab=.12,round=n=>Math.round(n*1e6)/1e6;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const clone=v=>JSON.parse(JSON.stringify(v));
freeze(BLOCK_PLAN);
const area=p=>Math.abs(p.reduce((n,a,i)=>{const c=p[(i+1)%p.length];return n+a[0]*c[1]-c[0]*a[1];},0)/2);
export function createHullHouseBlock(T,{quarterTurns=0,position=[0,0,0],skin='jubilee',materials={},textures={},buildingIds=null,ground=true}={}){
 if(!T?.InstancedMesh||!T?.BufferGeometry)throw Error('Inject the shared host Three namespace');
 if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('quarterTurns must be 0..3');
 if(!Array.isArray(position)||position.length!==3||position.some(n=>!Number.isFinite(n))||!Number.isInteger(position[0])||!Number.isInteger(position[2])||Math.abs(position[1]/pitch-Math.round(position[1]/pitch))>1e-8)throw Error('Native placement requires integer X/Z and floor-pitch Y');
 if(!HULL_SKINS.includes(skin))throw Error('Unknown Hull block skin');
 for(const key of [...Object.keys(materials),...Object.keys(textures)])if(!Object.hasOwn(SLOT_COLOURS,key))throw Error('Unknown appearance slot '+key);
 if(buildingIds!==null&&(!Array.isArray(buildingIds)||!buildingIds.length||new Set(buildingIds).size!==buildingIds.length||buildingIds.some(id=>!BLOCK_PLAN.buildings.some(b=>b.id===id))))throw Error('Choose valid unique building IDs');
 const selected=BLOCK_PLAN.buildings.filter(b=>!buildingIds||buildingIds.includes(b.id)),root=new T.Group();
 root.name=HULL_HOUSE_ASSET_ID;root.position.fromArray(position);root.rotation.y=quarterTurns*Math.PI/2;
 let disposed=false,currentSkin=skin,windows;
 const palette=createPalette(T,materials,textures),b=makeSculpt(T,root,palette.slots,1893),cloth=createClothRecipes(b);
 const slabGeometry=new T.BoxGeometry(1,slab,1),instanceBatches=[],ownedGeometry=new Set([slabGeometry]),floorRecords=[],roofRecords=[],wallRecords=[],doorRecords=[],windowRecords=[],dressing=[],lightAnchors=[],buildings=new Map(),gables=[],details=[];
 const p=slabGeometry.attributes.position,n=slabGeometry.attributes.normal,uv=[];
 for(let i=0;i<p.count;i++)uv.push(...(Math.abs(n.getY(i))>.5?[p.getX(i)+.5,p.getZ(i)+.5]:Math.abs(n.getX(i))>.5?[p.getZ(i)+.5,p.getY(i)+.06]:[p.getX(i)+.5,p.getY(i)+.06]));
 slabGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 slabGeometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(p.count*3).fill(1),3));
 const rect=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
 const faceSide=(a,c)=>c[0]>a[0]?'north':c[0]<a[0]?'south':c[1]>a[1]?'east':'west';
 function addDoor(face,def,edge,cell,level){
  const x=cell+.5,y=level*pitch,hinge=b.group(def.id+'/door/'+edge+'/'+level,face,[cell,y,-.025]);
  b.box(hinge,'native closed leaf',[1,1.65,.12],[.5,.825,0],'wood3');
  for(const xx of [.11,.89])b.box(hinge,'door stile',[.065,1.50,.025],[xx,.825,-.074],'trim');
  for(const yy of [.19,.80,1.48])b.box(hinge,'door rail',[.83,.055,.025],[.5,yy,-.074],'trim');
  b.sphere(hinge,'knob',[.025,.025,.025],[.84,.86,-.11],'iron');
  b.box(face,'native lintel cut',[1,.35,.16],[x,y+1.825,0],def.physicalWall==='brick'?'brick':'wood'+def.skin);
  for(const xx of [cell-.025,cell+1.025])b.box(face,'door casing',[.065,1.72,.055],[xx,y+.86,-.105],'trim');
  b.box(face,'door head casing',[1.13,.07,.055],[x,y+1.70,-.105],'trim');
  doorRecords.push({id:hinge.name,buildingId:def.id,group:hinge,width:1,height:1.65,thickness:.12,pivot:[cell, y,-.025],edge,level,state:'closed',passableByNativeActors:false,geometry:'Unchanged native leaf dimensions; traversal deferred'});
 }
 function wall(face,def,edge,length,level,hasDoor){
  const wallSlot=def.physicalWall==='brick'?'brick':'wood'+def.skin,doorAt=length>=3?1:-1;
  for(let cell=0;cell<length;){
   if(hasDoor&&cell===doorAt){addDoor(face,def,edge,cell,level);cell++;continue;}
   const roomForWindow=cell+2<=length&&!(hasDoor&&doorAt>=cell&&doorAt<cell+2);
   const cadence=(edge+level)%2?1:0;
   if(cell%3===cadence&&roomForWindow){
    const center=[cell+1,level*pitch,0],quaternion=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI);
    const lit=(Math.floor(def.bounds.min[0])+cell+level*3+edge)%5===0;
    for(const [kind,geometry]of windows.geometries){
     const slot=kind==='wall'?wallSlot:kind==='glass'?(lit?'glassLit':'glass'):kind;
     b.add(face,def.id+'/window/'+edge+'/'+level+'/'+cell+'/'+kind,geometry.clone(),slot,center,quaternion,true);
    }
    windowRecords.push({id:def.id+'/window/'+edge+'/'+level+'/'+cell,buildingId:def.id,edge,level,startCell:cell,group:face,
     center:[cell+1,level*pitch,0],assetId:'window-bay-period',span:2,openingWidth:1,wallHeight:2,piers:[.5,.5],physicalMaterials:['wood frame','glass','iron fittings',def.physicalWall],lit});
    cell+=2;continue;
   }
   const panel=wallPanels({id:def.id+'/wall/'+edge+'/'+level,a:[cell,0],b:[cell+1,0],z:level,stories:1,material:def.physicalWall})[0];
   b.box(face,panel.id,panel.size,panel.center,wallSlot);cell++;
  }
 }
 function createRoof(def,g){
  const [x0,z0]=def.bounds.min,[x1,z1]=def.bounds.max,top=def.levels*pitch,wallSlot=def.physicalWall==='brick'?'brick':'wood'+def.skin;
  if(def.roof==='flat'){
   instanceSlabs(T,g,def.cells,top,palette.slots.roof,slabGeometry,def.id+'/roof-slabs',instanceBatches);
   roofRecords.push({id:def.id+'/roof',buildingId:def.id,kind:'roof',polygon:def.polygon.map(([x,z])=>[x,top,z]),holes:[],elevation:top,physicalMaterial:'timber deck',coverMaterial:'unverified roof covering',overhang:0,walkable:false});
   for(let i=0;i<def.polygon.length;i++){
    const a=def.polygon[i],c=def.polygon[(i+1)%def.polygon.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]),e=b.group('roof fascia',g,[(a[0]+c[0])/2,top,(a[1]+c[1])/2],-Math.atan2(c[1]-a[1],c[0]-a[0]));
    b.box(e,'fascia',[len,.18,.20],[0,-.03,0],wallSlot);b.box(e,'coping',[len+.10,.065,.24],[0,.075,0],'trim');
   }
   return;
  }
  instanceSlabs(T,g,def.cells,top,palette.slots.floor,slabGeometry,def.id+'/attic-floor',instanceBatches);
  floorRecords.push({id:def.id+'/attic-floor',buildingId:def.id,level:def.levels,elevation:top,kind:'attic-floor',polygon:def.polygon.map(([x,z])=>[x,top,z]),holes:[],physicalMaterial:'timber',nativeCellCount:def.cells.length});
  const acrossX=!['west','east'].includes(def.frontage),lo=acrossX?x0:z0,hi=acrossX?x1:z1,along0=acrossX?z0:x0,along1=acrossX?z1:x1,mid=(lo+hi)/2,over=.16;
  const roofY=u=>top+(hi-lo)/2-Math.abs(u-mid),pt=(u,v)=>acrossX?[u,roofY(u),v]:[v,roofY(u),u];
  for(const [u0,u1]of [[lo-over,mid],[mid,hi+over]]){
   const polygon=[pt(u0,along0-over),pt(u1,along0-over),pt(u1,along1+over),pt(u0,along1+over)];
   roofRecords.push({id:def.id+'/roof/'+u0,buildingId:def.id,kind:'roof',polygon,holes:[],physicalMaterial:'timber support',coverMaterial:'unverified roof covering',pitch:1,overhang:over,walkable:false});
   for(let u=u0;u<u1-1e-6;u+=1)for(let v=along0-over;v<along1+over-1e-6;v+=1){
    const endU=Math.min(u1,u+1),endV=Math.min(along1+over,v+1);
    const p=[pt(u,v),pt(endU,v),pt(endU,endV),pt(u,endV)];
    b.surface(g,'native roof panel',p,'roof',[0,1,2,0,2,3]);
    b.surface(g,'roof panel underside',p.map(v=>[v[0],v[1]-.045,v[2]]),'roof',[0,2,1,0,3,2]);
   }
  }
  for(const along of [along0,along1]){
   const end=b.group('gable end',g,acrossX?[mid,top,along]:[along,top,mid],acrossX?0:-Math.PI/2);
   const width=hi-lo;b.profile(end,'clad gable',[[-width/2,0],[width/2,0],[0,width/2]],.16,[0,0,0],wallSlot);
   for(const s of [-1,1])b.beam(end,'gable verge',[s*(width/2+over),-.16,along===along0?-.11:.11],[0,width/2,along===along0?-.11:.11],.09,.09,'trim');
   gables.push({id:def.id+'/gable/'+along,buildingId:def.id,skinSlot:wallSlot,physicalMaterial:def.physicalWall,roofTexture:false});
  }
  for(const side of [lo,hi]){
   const a=pt(side,along0-over),c=pt(side,along1+over);b.beam(g,'eave fascia',a,c,.10,.15,'trim');
  }
 }
 try{
  windows=nativeWindowTemplates(T,palette.slots);
  for(const def of selected){
   const g=b.group(def.id);g.userData.buildingId=def.id;buildings.set(def.id,g);
   for(let level=0;level<def.levels;level++){
    instanceSlabs(T,g,def.cells,level*pitch,palette.slots.floor,slabGeometry,def.id+'/floor/'+level,instanceBatches);
    floorRecords.push({id:def.id+'/floor/'+level,buildingId:def.id,kind:'floor',level,elevation:level*pitch,polygon:def.polygon.map(([x,z])=>[x,level*pitch,z]),holes:[],physicalMaterial:'timber',nativeCellCount:def.cells.length});
   }
   for(let edge=0;edge<def.polygon.length;edge++){
    const a=def.polygon[edge],c=def.polygon[(edge+1)%def.polygon.length],length=Math.hypot(c[0]-a[0],c[1]-a[1]),side=faceSide(a,c);
    const face=b.group(def.id+'/face/'+edge,g,[a[0],0,a[1]],-Math.atan2(c[1]-a[1],c[0]-a[0]));
    wallRecords.push({id:face.name,buildingId:def.id,a,b:c,length,stories:def.levels,material:def.physicalWall,thickness:.16,height:2,floorPitch:pitch,side});
    for(let level=0;level<def.levels;level++)wall(face,def,edge,length,level,(side===def.frontage&&level===0)||(def.id==='halsted-348'&&side==='east'&&level===1));
    b.box(face,'plinth',[length,.12,.20],[length/2,.06,0],'wood3');
    if(side===def.frontage){
     if(def.festive||['halsted-346','halsted-348','polk-194'].includes(def.id)){
      lightAnchors.push({id:def.id+'/entry-lantern',buildingId:def.id,assetId:'city1880-entry-lantern-lit',group:face,position:[Math.min(length-.4,1),0,-.557],localYaw:Math.PI,
       source:'Existing Nautilus oil-light design; distribution is inferred game art direction'});
     }
     if(def.sign){
      const sign=b.group(def.id+'/trade sign',face,[length/2,1.94,-.14]);b.box(sign,'sign board',[Math.min(length-.25,3.8),.31,.06],[0,0,0],'sign');
      lettering(T,b,sign,def.sign,Math.min(length-.45,3.5),.18,0,-.085,-.046,'ink');
     }
     if(def.festive){
      const decor=b.group(def.id+'/jubilee',face,[0,pitch+.30,-.19]);decor.userData.skin='jubilee';
      for(let x=.95;x<length-.6;x+=2.5){const fan=b.group('pleated fan',decor,[x,0,0]);cloth.fan(fan,1.7,.58);}
      for(const x of [.24,length-.24]){const bow=b.group('ribbon bow',decor,[x,.02,0]);cloth.ribbon(bow);}
      dressing.push({id:decor.name,group:decor,buildingId:def.id,anchors:[[.24,.02,0],[length-.24,.02,0]],physicalMaterial:'cloth',slots:['clothRed','clothCream','clothBlue']});
     }
    }
   }
   createRoof(def,g);
   // A single modest chimney keeps roof rhythm; its placement is inferred.
   const cx=def.bounds.min[0]+1.1,cz=def.bounds.max[1]-1.2,acrossX=!['west','east'].includes(def.frontage),u=acrossX?cx:cz,lo=acrossX?def.bounds.min[0]:def.bounds.min[1],hi=acrossX?def.bounds.max[0]:def.bounds.max[1],roofTop=def.roof==='gable'?def.levels*pitch+(hi-lo)/2-Math.abs(u-(lo+hi)/2):def.levels*pitch;
   if(def.levels>1){b.box(g,'chimney shaft',[.42,.90,.42],[cx,roofTop+.30,cz],'brick');b.box(g,'chimney cap',[.52,.09,.52],[cx,roofTop+.78,cz],'trim');}
  }
  if(!buildingIds||buildingIds.includes('halsted-348')){
   // Explicit, inferred yard adaptation from the later photograph. Fixed native landing.
   const porch=b.group('halsted-348/rear-porch'),cells=[];
   for(let x=18;x<22;x++)for(let z=61;z<64;z++)cells.push([x,z]);
   instanceSlabs(T,porch,cells,pitch,palette.slots.floor,slabGeometry,'halsted-348/porch-floor',instanceBatches);
   floorRecords.push({id:'halsted-348/porch-floor',buildingId:'halsted-348',kind:'porch-floor',level:1,elevation:pitch,polygon:rect(18,61,22,64).map(([x,z])=>[x,pitch,z]),holes:[],physicalMaterial:'timber',nativeCellCount:cells.length,inferred:true});
   for(const x of [18.1,21.9])for(const z of [61.1,63.9])b.box(porch,'porch post',[.12,2,.12],[x,1,z],'wood3');
   for(let i=0;i<12;i++){const top=(i+1)*pitch/12,x=26-(i+.5)*4/12;b.box(porch,'stair/tread/'+i,[4/12,top,2],[x,top/2,62],'wood0');}
   for(const z of [61.05,62.95]){b.beam(porch,'sloping stair handrail',[26,.95,z],[22,pitch+.95,z],.07,.07,'wood3');for(let i=0;i<=4;i++)b.box(porch,'stair baluster',[.045,.94,.045],[26-i,.47+i*pitch/4,z],'trim');}
   for(const z of [61,64]){b.box(porch,'porch rail',[3.9,.07,.07],[20,pitch+.95,z],'wood3');for(let x=18.3;x<21.9;x+=.25)b.box(porch,'porch spindle',[.035,.84,.035],[x,pitch+.49,z],'trim');}
   details.push({id:porch.name,kind:'timber-porch-and-stair',physicalMaterial:'timber',source:'HH-PHOTO-3446, c1900 comparable yard; inferred placement',footprint:rect(18,61,26,64),landingHeight:pitch,treads:12,width:2,rise:pitch/12,run:4/12});
   const repairs=b.group('yard/repair-boards');for(let i=0;i<5;i++)b.beam(repairs,'leaning repair/'+i,[25+i*.13,0,58],[25+i*.13,1.6,58.4],.11,.045,'wood3');
   details.push({id:repairs.name,kind:'repair-boards',physicalMaterial:'timber',source:'HH-PHOTO-3446 later comparison; placement inferred',footprint:rect(24.9,57.9,25.8,58.5)});
   const washing=b.group('yard/wash-line');
   for(const x of [23,29])b.box(washing,'line post',[.08,pitch,.08],[x,pitch/2,54],'wood3');
   b.beam(washing,'clothes line',[23,2.02,54],[29,2.02,54],.012,.012,'iron');
   for(let i=0;i<4;i++){const x=23.5+i*1.2;b.surface(washing,'hanging linen/'+i,[[x,2,54],[x+.65,2,54],[x+.65,1.43,54.05],[x,1.45,53.95]],i%3?'clothCream':'clothBlue',[0,1,2,0,2,3]);}
   details.push({id:washing.name,kind:'wash-line',physicalMaterial:'timber posts, iron line, cloth',source:'Domestic-use adaptation; exact location unverified',footprint:rect(22.9,53.9,29.1,54.1)});
  }
  for(const def of selected.filter(d=>d.street==='S. Halsted').slice(0,8)){
   const z=(def.bounds.min[1]+def.bounds.max[1])/2,g=b.group(def.id+'/wooden-bin');
   for(const [x,zoff,sx,sz]of [[-1.1,-.47,1,.065],[-1.1,.47,1,.065],[-1.57,0,.065,.94],[-.63,0,.065,.94]])b.box(g,'bin wall',[sx,.78,sz],[x,.39,z+zoff],'wood3');
   b.box(g,'bin lid',[1.1,.065,1.05],[-1.1,.81,z],'wood1');details.push({id:g.name,kind:'wooden-street-bin',physicalMaterial:'timber',source:'HH-TEXT-1895 printed page6; distribution is inferred',footprint:rect(-1.7,z-.55,-.5,z+.55)});
  }
  if(!buildingIds){
   const used=new Set(),occupied=new Set(selected.flatMap(d=>d.cells.map(c=>c.join('/')))),posts=new Set(),fences=b.group('property fences');
   const blocked=(x,z)=>occupied.has(Math.floor(x)+'/'+Math.floor(z));
   const addFence=(x,z,yaw,id)=>{
    const dx=Math.round(Math.cos(yaw)),dz=-Math.round(Math.sin(yaw)),key=[x,z,dx,dz].join('/');
    if(used.has(key)||[.1,.5,.9].some(t=>[-.21,.21].some(o=>blocked(x+dx*t-dz*o,z+dz*t+dx*o))))return;
    used.add(key);const g=b.group(id,fences,[x,0,z],yaw);
    for(const y of [.30,1.08])b.box(g,'fence rail',[1,.10,.055],[.5,y,0],'wood3');
    for(let i=0;i<8;i++)b.box(g,'fence board/'+i,[.105,1.30,.045],[(i+.5)/8,.65,-.025],'wood4');
    for(const t of [0,1]){const px=x+dx*t,pz=z+dz*t,pk=px+'/'+pz;if(!posts.has(pk)){posts.add(pk);b.box(fences,'fence post/'+pk,[.09,1.4,.09],[px,.70,pz],'wood3');}}
    const ax=x+dx/2,az=z+dz/2;details.push({id,kind:'property-fence',physicalMaterial:'timber',height:1.4,source:'Printed property divisions; 1.4 m fence construction inferred',footprint:rect(ax-(dx?.5:.06),az-(dz?.5:.06),ax+(dx?.5:.06),az+(dz?.5:.06))});
   };
   for(let x=34;x<258;x++)addFence(x,38,0,'boundary/rear/'+x);
   for(const parcel of BLOCK_PLAN.parcels){
    const x=Math.round(parcel.polygon[0][0]);if(x<34||x>=258)continue;
    const isNorth=parcel.id.startsWith('north-'),isSouth=parcel.id.startsWith('south-');
    if(!isNorth&&!isSouth)continue;
    for(let z=isNorth?24:38;z<(isNorth?38:52);z++)addFence(x,z,-Math.PI/2,'boundary/'+parcel.id+'/'+z);
   }
  }
  if(ground){
   const occupied=new Set(selected.flatMap(d=>d.cells.map(c=>c.join('/')))),earth=[],road=[],sidewalk=[],W=BLOCK_PLAN.block.width,D=BLOCK_PLAN.block.depth;
   for(let x=-20;x<W+12;x++)for(let z=-12;z<D+12;z++){
    if(x>=0&&x<W&&z>=0&&z<D){if(!occupied.has(x+'/'+z))earth.push([x,z]);}
    else if((x>=-4&&x<W+4&&z>=-4&&z<D+4))sidewalk.push([x,z]);else road.push([x,z]);
   }
   const terrain=b.group('site ground');
   instanceSlabs(T,terrain,earth,0,palette.slots.yard,slabGeometry,'courts/ground',instanceBatches);
   instanceSlabs(T,terrain,sidewalk,0,palette.slots.sidewalk,slabGeometry,'streets/sidewalk',instanceBatches);
   instanceSlabs(T,terrain,road,0,palette.slots.road,slabGeometry,'streets/carriageway',instanceBatches);
   floorRecords.push({id:'courts/ground',kind:'ground',level:0,elevation:0,polygon:rect(0,0,W,D).map(([x,z])=>[x,0,z]),holes:selected.map(d=>d.polygon.map(([x,z])=>[x,0,z])),physicalMaterial:'packed earth',nativeCellCount:earth.length});
   floorRecords.push({id:'streets/sidewalk',kind:'ground',level:0,elevation:0,polygon:rect(-4,-4,W+4,D+4).map(([x,z])=>[x,0,z]),holes:[rect(0,0,W,D).map(([x,z])=>[x,0,z])],physicalMaterial:'paving',nativeCellCount:sidewalk.length});
   floorRecords.push({id:'streets/carriageway',kind:'ground',level:0,elevation:0,polygon:rect(-20,-12,W+12,D+12).map(([x,z])=>[x,0,z]),holes:[rect(-4,-4,W+4,D+4).map(([x,z])=>[x,0,z])],physicalMaterial:'paving',nativeCellCount:road.length});
  }
  b.finalize();windows.dispose();windows=null;setSkin(skin);
 }catch(e){windows?.dispose();for(const mesh of instanceBatches)mesh.dispose();b.dispose();for(const g of ownedGeometry)g.dispose();palette.dispose();root.clear();throw e;}
 const transform=p=>new T.Vector3(...p).applyMatrix4(root.matrixWorld).toArray().map(round);
 const direction=p=>new T.Vector3(...p).transformDirection(root.matrixWorld).toArray().map(round);
 function setSkin(next){if(disposed)throw Error('Hull block disposed');if(!HULL_SKINS.includes(next))throw Error('Unknown Hull block skin');currentSkin=next;for(const d of dressing)d.group.visible=next==='jubilee';root.updateMatrixWorld(true);}
 function metadata(){
  if(disposed)throw Error('Hull block disposed');root.updateMatrixWorld(true);
  return freeze({assetId:HULL_HOUSE_ASSET_ID,version:1,units:'metres',nativeProfile:BLOCK_PLAN.native,enginePin:ENGINE_PIN,representedDate:BLOCK_PLAN.representedDate,
   placement:{position:[...position],quarterTurns},skin:currentSkin,bounds:measuredBounds(T,root),block:clone(BLOCK_PLAN.block),
   buildings:selected.map(d=>({id:d.id,placement:{origin:transform([d.bounds.min[0],0,d.bounds.min[1]]),quarterTurns,floorBase:position[1]},street:d.street,printedNumbers:[...d.printedNumbers],addressNote:'Printed parcel/address group; exact door assignment unverified',polygon:d.polygon.map(([x,z])=>transform([x,0,z])),nativeCells:d.cells.length,
    floorLevels:Array.from({length:d.levels},(_,i)=>i),roof:d.roof,bounds:measuredBounds(T,buildings.get(d.id)),physicalWall:d.physicalWall,appearanceSlot:d.physicalWall==='brick'?'brick':'wood'+d.skin,
    footprintEvidence:d.footprintEvidence,facadeEvidence:d.facadeEvidence,heightEvidence:d.heightEvidence,note:d.note,sourceIds:[...d.sourceIds]})),
   wallRuns:wallRecords.map(r=>({...r,a:transform([r.a[0],0,r.a[1]]),b:transform([r.b[0],0,r.b[1]])})),
   surfaces:[...floorRecords,...roofRecords].map(s=>({...s,polygon:s.polygon.map(transform),holes:s.holes.map(h=>h.map(transform)),elevation:s.elevation===undefined?undefined:round(s.elevation+position[1])})),
   doors:doorRecords.map(({group,pivot,...d})=>({...d,pivot:group.getWorldPosition(new T.Vector3()).toArray().map(round),axis:direction([0,1,0]),closedAngle:0,closedQuaternion:group.getWorldQuaternion(new T.Quaternion()).toArray().map(round)})),
   windows:windowRecords.map(({group,center,...w})=>({...w,center:new T.Vector3(...center).applyMatrix4(group.matrixWorld).toArray().map(round)})),
   gableEnds:clone(gables),
   fittings:details.map(d=>({...d,footprint:d.footprint.map(([x,z])=>transform([x,0,z]))})),
   lightAttachments:lightAnchors.map(({group,position:local,localYaw,...a})=>({...a,position:new T.Vector3(...local).applyMatrix4(group.matrixWorld).toArray().map(round),
    quaternion:group.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),localYaw)).toArray().map(round)})),
   clothAttachments:dressing.map(d=>({id:d.id,buildingId:d.buildingId,active:currentSkin==='jubilee',physicalMaterial:d.physicalMaterial,slots:[...d.slots],
    anchors:d.anchors.map((p,i)=>({id:'tie/'+i,position:new T.Vector3(...p).applyMatrix4(d.group.matrixWorld).toArray().map(round)}))})),
   passages:(buildingIds?[]:BLOCK_PLAN.passages).map(p=>({...p,polygon:p.polygon.map(([x,z])=>transform([x,0,z])),minHeight:null,note:p.note+' Actual native mesh corridor checked separately.'})),
   connectors:buildingIds?[]:[{id:'west',position:transform([0,0,BLOCK_PLAN.block.depth/2]),outward:direction([-1,0,0])},{id:'east',position:transform([BLOCK_PLAN.block.width,0,BLOCK_PLAN.block.depth/2]),outward:direction([1,0,0])},{id:'north',position:transform([BLOCK_PLAN.block.width/2,0,0]),outward:direction([0,0,-1])},{id:'south',position:transform([BLOCK_PLAN.block.width/2,0,BLOCK_PLAN.block.depth]),outward:direction([0,0,1])}],
   sourceTrace:'art/source/hull-house-block/trace.json',calibration:'art/source/hull-house-block/trace.json#calibration',
   integration:'Source-traced art study. No production placement, collision, traversal, door control or fire behavior installed.',
   limits:[BLOCK_PLAN.adaptation,'Facade openings, native levels, roof forms and domestic fittings are interpretations.']});
 }
 function diagnostics(){let meshes=0,triangles=0;const geometries=new Set(),mats=new Set();root.traverseVisible(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);geometries.add(o.geometry);mats.add(o.material);}});
  return {disposed,buildings:selected.length,meshes,triangles,geometries:geometries.size,ownedMaterials:palette.owned.length,instanceBatches:instanceBatches.length,nativeSlabs:instanceBatches.reduce((n,m)=>n+m.count,0),windows:windowRecords.length,doors:doorRecords.length,bounds:disposed?null:measuredBounds(T,root)};
 }
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const mesh of instanceBatches)mesh.dispose();b.dispose();for(const g of ownedGeometry)g.dispose();palette.dispose();root.clear();}
 return {root,setSkin,get metadata(){return metadata();},get bounds(){return measuredBounds(T,root);},diagnostics,dispose};
}
export function createHullHouseBuilding(T,{id,position=[0,0,0],...options}={}){
 const def=BLOCK_PLAN.buildings.find(d=>d.id===id);if(!def)throw Error('Unknown Hull block building '+id);
 const q=options.quarterTurns||0,anchor=new T.Vector3(def.bounds.min[0],0,def.bounds.min[1]).applyAxisAngle(new T.Vector3(0,1,0),q*Math.PI/2);
 return createHullHouseBlock(T,{...options,buildingIds:[id],ground:false,position:[Math.round(position[0]-anchor.x),position[1],Math.round(position[2]-anchor.z)]});
}
