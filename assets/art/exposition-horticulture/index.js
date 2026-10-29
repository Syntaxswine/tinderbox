import {HORTICULTURE_PALETTE,HORTICULTURE_PALETTE_ID} from './palette.js';
export {HORTICULTURE_PALETTE,HORTICULTURE_PALETTE_ID};
import {createForms} from '../exposition-new-york/forms.js';
import {PLAN,ROTUNDA,SMALL_PAVILIONS} from './plan.js';
import {PROFILE as S,levelY,compileNautilusStructure,ENGINE_PIN} from './engine.js';
import {compileFloor} from './floors.js';
export {PLAN} from './plan.js';
export const APPEARANCE_SLOTS=Object.freeze(['facade','trim','glazing','frame','roof','cupola','door','floor','foliage','trunk','soil','water','fruit']);
const DEFAULTS=HORTICULTURE_PALETTE;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function createHorticulturalBuilding(T,{materials={},textures={},quarterTurns=0,position=[0,0,0],includePlanting=true}={}){
 if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('quarterTurns must be0..3');
 if(!Array.isArray(position)||position.length!==3||position.some(v=>!Number.isFinite(v))||!Number.isInteger(position[0])||!Number.isInteger(position[2])||Math.abs(position[1]/S.floorSpacing-Math.round(position[1]/S.floorSpacing))>1e-8)throw Error('Native tile placement needs integer X/Z and standard floor Y');
 if(typeof includePlanting!=='boolean')throw Error('includePlanting must be boolean');
 for(const slot of [...Object.keys(materials),...Object.keys(textures)])if(!APPEARANCE_SLOTS.includes(slot))throw Error('Unknown appearance slot '+slot);
 const root=new T.Group();root.name='exposition-horticulture-1893';let closed=false;const ownedMaterials=new Set(),slots={},bindings={materials:{...materials},textures:{...textures}};
 function material(slot){
  const borrowed=bindings.materials[slot],texture=bindings.textures[slot];if(borrowed&&!borrowed.isMaterial)throw Error('Expected Three material in '+slot);if(texture&&!texture.isTexture)throw Error('Expected Three texture in '+slot);
  const m=borrowed?borrowed.clone():new T.MeshStandardMaterial({color:DEFAULTS[slot],roughness:slot==='glazing'?.24:slot==='water'?.35:.88,metalness:slot==='frame'?.18:0,transparent:slot==='glazing',opacity:slot==='glazing'?.34:1,depthWrite:slot!=='glazing',side:slot==='glazing'||slot==='foliage'?T.DoubleSide:T.FrontSide});
  const prior=borrowed?.onBeforeCompile,key=borrowed?.customProgramCacheKey?.call(borrowed)||'default';if(Object.hasOwn(bindings.textures,slot))m.map=texture;m.name='Horticulture / '+slot;
  m.onBeforeCompile=(shader,renderer)=>{prior?.call(m,shader,renderer);if(!shader.vertexShader.includes('attribute vec2 grossUV;'))shader.vertexShader='attribute vec2 grossUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (mapTransform * vec3(grossUV, 1.0)).xy;\n#endif');};
  m.customProgramCacheKey=()=>key+'/horticulture-physical-metres-v1';ownedMaterials.add(m);return m;
 }
 try{for(const slot of APPEARANCE_SLOTS)slots[slot]=material(slot);}catch(error){for(const m of ownedMaterials)m.dispose();throw error;}
 const f=createForms(T,slots),{box,cylinder,prism,profile,arch,hip,group,rail,lathe}=f,compiled=compileNautilusStructure(PLAN.runs),structuralPieces=[],seamPieces=[],floorTiles=[],floorMeshes=[],passages=[],faceGroups=new Map(),stairs=[],plants=[];
  // Face frames are merely coordinate systems. Actual wall centres, yaw and
  // dimensions below come from Nautilus wallPanels, including rotated runs.
  for(const run of PLAN.runs){
    const angle=-Math.atan2(run.b[1]-run.a[1],run.b[0]-run.a[0]);
    faceGroups.set(run.id,group(root,run.id,[(run.a[0]+run.b[0])/2,0,(run.a[1]+run.b[1])/2],angle,{role:'native-wall-run',source:'Nautilus wallPanels'}));
  }
  const runs=new Map(PLAN.runs.map(r=>[r.id,r]));
  function fragment(g,run,p,bottom,height,seam=false){
    const x=(p.center[0]-(run.a[0]+run.b[0])/2)*Math.cos(p.yaw)-(p.center[2]-(run.a[1]+run.b[1])/2)*Math.sin(p.yaw),width=p.size[0],top=bottom+height;
    const holes=run.openings.filter(h=>x>h.x-h.width/2+1e-6&&x<h.x+h.width/2-1e-6&&h.bottom<top&&h.bottom+h.height>bottom);
    const ys=[...new Set([bottom,top,...holes.flatMap(h=>[Math.max(bottom,h.bottom),Math.min(top,h.bottom+h.height)])].map(v=>Math.round(v*1e6)/1e6))].sort((a,b)=>a-b);
    for(let i=1;i<ys.length;i++){
      const a=ys[i-1],b=ys[i],mid=(a+b)/2;if(b-a<1e-7||holes.some(h=>mid>h.bottom-1e-7&&mid<h.bottom+h.height+1e-7))continue;
      const id=p.id+(seam?'/seam-':'/wall-')+i,native=!seam&&Math.abs(b-a-S.wallHeight)<1e-6;
      box(g,id,Math.abs(width-1)<1e-8?1:width,b-a,S.wallThickness,x,mid,0,'facade',{form:native?'native-wall':seam?'level-closure':'aperture-cut',role:seam?'perimeter-closure':'structural-wall',runId:run.id,level:p.level,panelId:p.id,enginePin:ENGINE_PIN,engineSource:'wallPanels'});
      (seam?seamPieces:structuralPieces).push({id,panelId:p.id,runId:run.id,level:p.level,localX:x,width:Math.abs(width-1)<1e-8?1:width,bottom:a,height:b-a,engineTier:p.tier,cut:!native});
    }
  }
  for(const p of compiled.panels){const run=runs.get(p.runId),g=faceGroups.get(run.id);fragment(g,run,p,p.center[1]-S.wallHeight/2,S.wallHeight);fragment(g,run,p,levelY(p.level)+S.wallHeight,S.slab,true);}
  // Floor slabs retain .12 m thickness. Only boundary cells are clipped; the
  // uncut majority retain native 1 x .12 x 1 m geometry and metre UV density.
  for(const floor of PLAN.floors){
    const cells=compileFloor(floor),top=levelY(floor.level),slot=floor.slot;let full=0,cut=0,surface=0;
    for(const c of cells){const id=floor.id+'/cell-'+c.x+'-'+c.z+'-'+c.part;let mesh;
      if(c.full){mesh=box(root,id,1,S.slab,1,c.x+.5,top-S.slab/2,c.z+.5,slot,{form:'native-slab'});full++;}
      else{mesh=prism(root,id,c.polygon,S.slab,0,top-S.slab/2,0,slot);mesh.userData.form='boundary-slab';cut++;}
      Object.assign(mesh.userData,{role:'floor',floorId:floor.id,level:floor.level,cell:[c.x,c.z],area:c.area});
      floorTiles.push({id,floorId:floor.id,level:floor.level,x:c.x,z:c.z,part:c.part,full:c.full,area:c.area});surface+=c.area;
    }
    floorMeshes.push({id:floor.id,level:floor.level,top,thickness:S.slab,fullTiles:full,boundaryTiles:cut,surfaceArea:surface});
  }
 function roundTop(g,h){
  const id=h.id,w=h.width,H=h.height,b=h.bottom,r=w/2,spring=b+H-r,z=-.13;
  if(h.kind!=='interior-arch'){
   const pts=[[-r,0],[r,0],[r,H-r]];for(let i=1;i<=24;i++){const a=i*Math.PI/24;pts.push([r*Math.cos(a),H-r+r*Math.sin(a)]);}
   profile(g,id+'/arched-glass',pts,.035,h.x,b,.015,'glazing').userData.role='window-glass';
  }
  for(const sign of [-1,1])box(g,id+'/jamb-'+sign,.17,H+.15,.28,h.x+sign*r,b+H/2,z,'trim');
  arch(g,id+'/arch',r,.20,.29,h.x,spring,z,'trim');
  for(const sign of [-1,1]){const pts=[[0,r],[sign*r,r],[sign*r,0]];for(let i=1;i<=24;i++){const a=i*Math.PI/48;pts.push([sign*r*Math.cos(a),r*Math.sin(a)]);}profile(g,id+'/spandrel-'+sign,pts,.16,h.x,spring,0,'facade');}
  if(h.kind!=='interior-arch'){
   box(g,id+'/sill',w+.32,.16,.38,h.x,b,-.15,'trim');
   box(g,id+'/mullion',.055,H-r,.09,h.x,b+(H-r)/2,-.08,'frame');
   if(H-r>1.5)box(g,id+'/transom',w,.07,.10,h.x,b+1.45,-.09,'frame');
   for(const sign of [-1,1]){const beam=box(g,id+'/fan-'+sign,.045,r,.09,h.x+sign*r*.25,spring+r*.433,-.09,'frame');beam.rotation.z=-sign*Math.PI/6;}
  }
  if(h.kind==='entrance'){
   for(const sign of [-1,1])box(g,id+'/native-leaf-'+sign,1,1.65,.12,h.x+sign*.5,b+.825,-.08,'door',{form:'native-door',role:'door-leaf'});
   box(g,id+'/leaf-header',2.3,.17,.28,h.x,b+1.75,-.11,'trim');passages.push({id,level:1,width:2,nativeLeaves:2,intent:'Closed native leaves beneath a larger fixed screen; traversal is consumer-owned.'});
  }
 }
 for(const run of PLAN.runs){const g=faceGroups.get(run.id);for(const h of run.openings)roundTop(g,h);}
 function custom(parent,id,key,create,slot,position=[0,0,0],extra={}){
  if(!f.geometries.has(key)){const geom=create();if(!geom.attributes.normal)geom.computeVertexNormals();if(!geom.attributes.grossUV){const p=geom.attributes.position,uv=[];for(let i=0;i<p.count;i++)uv.push(p.getX(i),p.getY(i)+p.getZ(i));geom.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));}if(!geom.attributes.uv)geom.setAttribute('uv',geom.attributes.grossUV.clone());geom.computeBoundingBox();geom.computeBoundingSphere();f.geometries.set(key,geom);}
  const m=new T.Mesh(f.geometries.get(key),slots[slot]);m.name=id;m.position.fromArray(position);m.castShadow=slot!=='glazing';m.receiveShadow=true;m.userData={componentId:id,appearanceSlot:slot,form:'authored-'+key.split('/')[0],physicalMaterial:'unassigned',...extra};parent.add(m);f.meshes.push(m);f.components.push(id);return m;
 }
 function beam(parent,id,a,b,width,slot='frame',depth=width){const v=new T.Vector3(...b).sub(new T.Vector3(...a)),m=box(parent,id,width,v.length(),depth,...new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray(),slot);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
 function offset(poly,i,d){const n=poly.length,p=poly[i%n],a=poly[(i+n-1)%n],b=poly[(i+1)%n],l=Math.hypot(p[0]-a[0],p[1]-a[1]),r=Math.hypot(b[0]-p[0],b[1]-p[1]),u=[(p[1]-a[1])/l,-(p[0]-a[0])/l],v=[(b[1]-p[1])/r,-(b[0]-p[0])/r],den=1+u[0]*v[0]+u[1]*v[1];return[p[0]+d*(u[0]+v[0])/den,p[1]+d*(u[1]+v[1])/den];}
 function cornice(poly,id,y,skip=[]){for(let i=0;i<poly.length;i++)if(!skip.includes(i))for(const [j,h,w,delta]of [[0,.17,.42,-.52],[1,.26,.7,-.27],[2,.18,.96,-.04]])prism(root,id+'-'+i+'-'+j,[offset(poly,i,w/2),offset(poly,i+1,w/2),offset(poly,i+1,-w/2),offset(poly,i,-w/2)],h,0,y+delta,0,'trim');}
 cornice(PLAN.body,'outer-cornice',levelY(3),[3,4,5]);for(const sign of [-1,1])cornice([[sign*117,12],[sign*153,12],[sign*153,88],[sign*117,88]],'end-upper-cornice-'+sign,levelY(4));cornice(ROTUNDA,'rotunda-cornice',levelY(5));cornice([[-8,0],[8,0],[8,8],[-8,8]],'entrance-cornice',levelY(5));SMALL_PAVILIONS.forEach((p,i)=>cornice(p,'foyer-cornice-'+i,levelY(5)));
 for(const run of PLAN.runs){const g=faceGroups.get(run.id),top=levelY(run.endLevel),length=run.length;
  // Cream friezes, pilasters and floral bosses are source-derived simplifications.
  for(const x of [-length/2+.32,length/2-.32]){box(g,run.id+'/pilaster-'+x,.32,top-levelY(1)-.32,.27,x,(top+levelY(1))/2-.16,-.14,'trim');box(g,run.id+'/capital-'+x,.56,.22,.4,x,top-.65,-.18,'trim');}
  const n=Math.floor(length/4);for(let j=0;j<n;j++){
   const x=(j-(n-1)/2)*4,y=top-.97,c=cylinder(g,run.id+'/boss-'+j,.22,.22,.10,x,y,-.18,'trim',12);c.rotation.x=Math.PI/2;
   if(length>=4){const curve=new T.CatmullRomCurve3([new T.Vector3(-1.45,.12,0),new T.Vector3(0,-.35,0),new T.Vector3(1.45,.12,0)]);custom(g,run.id+'/swag-'+j,'swag',()=>new T.TubeGeometry(curve,12,.045,4,false),'trim',[x,y,-.19],{role:'ornament'});}
  }
 }
 function gable(id,{x,z,width,depth,base,rise},slot='glazing'){
  const g=group(root,id,[x,base,z]);
  for(const sign of [-1,1]){
   const a=[-width/2,0,sign*depth/2],b=[width/2,0,sign*depth/2],c=[width/2,rise,0],d=[-width/2,rise,0],length=Math.hypot(depth/2,rise),key=['gable',width,depth,rise,sign].join('/');
   custom(g,id+'/surface-'+sign,key,()=>{const geom=new T.BufferGeometry(),pts=[a,b,c,a,c,d].flat();geom.setAttribute('position',new T.Float32BufferAttribute(pts,3));geom.setAttribute('grossUV',new T.Float32BufferAttribute([0,0,width,0,width,length,0,0,width,length,0,length],2));geom.computeVertexNormals();return geom;},slot,[0,0,0],{role:'roof-glass',roofId:id});
   for(let at=-width/2;at<=width/2+.001;at+=2)beam(g,id+'/rafter-'+sign+'-'+at,[at,0,sign*depth/2],[at,rise,0],.075,'frame');
   for(let j=0;j<=8;j++){const t=j/8;box(g,id+'/purlin-'+sign+'-'+j,width,.06,.065,0,rise*t,sign*depth/2*(1-t),'frame');}
  }
  for(const side of [-1,1])custom(g,id+'/gable-end-'+side,'gable-end/'+width+'/'+depth+'/'+rise+'/'+side,()=>{const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute([side*width/2,0,-depth/2,side*width/2,0,depth/2,side*width/2,rise,0],3));geom.setAttribute('grossUV',new T.Float32BufferAttribute([0,0,depth,0,depth/2,rise],2));geom.computeVertexNormals();return geom;},slot,[0,0,0],{role:'roof-glass'});
 }
 for(const [i,r]of PLAN.roof.frontGlass.entries())gable('front-glass-gallery-'+i,r);
 for(const sign of [-1,1])gable('curved-gallery-connector-'+sign,{x:sign*30,z:34,width:6,depth:20,base:levelY(3),rise:levelY(2)});
 hip(root,'rear-curtain-roof',PLAN.roof.rear.width,PLAN.roof.rear.depth,PLAN.roof.rear.rise,0,PLAN.roof.rear.base,80,'roof');
 for(const [i,r]of PLAN.roof.ends.entries())hip(root,'end-pavilion-roof-'+i,r.depth,r.width,r.rise,r.x,r.base,r.z,'roof').rotation.y=Math.PI/2;
 function dome(id,{x,z,radius,rise,base,segments=96,lanternRadius=0,slot='glazing',vent=false}){
  const max=lanternRadius?Math.acos(lanternRadius/radius):Math.PI/2,rows=32,profilePoints=Array.from({length:rows+1},(_,i)=>{const a=max*i/rows;return[radius*Math.cos(a),rise*Math.sin(a)];});
  const g=group(root,id,[x,base,z]);
  if(!vent)custom(g,id+'/glass-skin','ellipsoid/'+radius+'/'+rise+'/'+segments+'/'+lanternRadius,()=>{const geom=new T.LatheGeometry(profilePoints.map(p=>new T.Vector2(...p)),segments),p=geom.attributes.position,uv=[];for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getZ(i)),angle=(Math.atan2(p.getX(i),p.getZ(i))+2*Math.PI)%(2*Math.PI);let arc=0;const target=Math.asin(Math.max(0,Math.min(1,p.getY(i)/rise)));for(let j=1;j<=80;j++){const a=target*(j-1)/80,b=target*j/80;arc+=Math.hypot(radius*(Math.cos(b)-Math.cos(a)),rise*(Math.sin(b)-Math.sin(a)));}uv.push(angle*r,arc);}geom.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));return geom;},slot,[0,0,0],{role:'dome-glass'});
  else for(const [s,role]of [['cupola','cupola-roof'],['glazing','cupola-vent']])custom(g,id+'/'+role,'paneled-dome/'+radius+'/'+rise+'/'+s,()=>{const p=[],uv=[];for(let row=0;row<12;row++)for(let j=0;j<24;j++){const isVent=j%4===0&&row>=3&&row<=5;if((s==='glazing')!==isVent)continue;const point=(u,v)=>[radius*Math.cos(v)*Math.cos(u),rise*Math.sin(v),radius*Math.cos(v)*Math.sin(u)],a=j*Math.PI/12,b=(j+1)*Math.PI/12,c=row*Math.PI/24,d=(row+1)*Math.PI/24,pts=[point(a,c),point(b,d),point(b,c),point(a,c),point(a,d),point(b,d)];for(const v of pts){p.push(...v);uv.push(Math.atan2(v[2],v[0])*Math.hypot(v[0],v[2]),v[1]);}}const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(p,3));geom.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));geom.computeVertexNormals();return geom;},s,[0,0,0],{role});
  const ribs=vent?24:96;for(let j=0;j<ribs;j++){
   const angle=j*2*Math.PI/ribs,points=profilePoints.map(([r,y])=>new T.Vector3(r*Math.cos(angle),y,r*Math.sin(angle)));custom(g,id+'/rib-'+j,'meridian-rib/'+radius+'/'+rise+'/'+angle,()=>new T.TubeGeometry(new T.CatmullRomCurve3(points),40,.055,4,false),'frame',[0,0,0],{role:'dome-frame'});
  }
  for(let j=1;j<=(vent?4:14);j++){const a=max*j/(vent?5:15),r=radius*Math.cos(a),y=rise*Math.sin(a),m=custom(g,id+'/latitude-'+j,'latitude/'+r,()=>new T.TorusGeometry(r,.05,4,96),'frame',[0,y,0],{role:'dome-frame'});m.rotation.x=Math.PI/2;}
  return {id,centre:[x,z],base,radius,rise,top:base+rise,openLanternRadius:lanternRadius};
 }
 const domes=[dome('great-crystal-dome',{x:0,z:36,radius:28,rise:levelY(9),base:levelY(5),lanternRadius:4})];
 for(const sign of [-1,1])domes.push(dome('front-cupola-'+sign,{x:20*sign,z:12,radius:11.3,rise:levelY(2),base:levelY(5),segments:48,slot:'cupola',vent:true}));
 const lanternBottom=levelY(5)+levelY(9)*Math.sqrt(1-16/(28*28)),lanternTop=levelY(16)-1.06;
 custom(root,'great-dome/lantern-glazing','lantern-glass',()=>new T.CylinderGeometry(4,4,lanternTop-lanternBottom,48,1,true),'glazing',[0,(lanternBottom+lanternTop)/2,36],{role:'lantern-glass'});
 for(let j=0;j<24;j++){const a=j*Math.PI/12;cylinder(root,'great-dome/lantern-post-'+j,.06,.06,lanternTop-lanternBottom,4*Math.cos(a),(lanternBottom+lanternTop)/2,36+4*Math.sin(a),'frame',6);}
 lathe(root,'great-dome/lantern-crown',[[4,0],[4.15,.12],[3.9,.25],[2.6,.75],[0,1.06]],0,lanternTop,36,'frame',48);
 for(const y of [lanternBottom,lanternTop]){const ring=custom(root,'great-dome/lantern-ring-'+y,'lantern-ring',()=>new T.TorusGeometry(4,.14,6,48),'trim',[0,y,36],{role:'lantern-frame'});ring.rotation.x=Math.PI/2;}
 // Galleries retain true voids and custom stairs terminate on standard floor tops.
 for(const spec of PLAN.stairs){const rise=(levelY(spec.toLevel)-levelY(spec.fromLevel))/24,run=8/24,base=levelY(spec.fromLevel);
  for(let i=0;i<24;i++){const top=base+(i+1)*rise;box(root,spec.id+'/step-'+i,2,top-base,run,spec.x,(top+base)/2,spec.z+(i+.5)*run,'trim',{role:'stair-tread',stairId:spec.id,step:i,top});}
  for(const sign of [-1,1]){beam(root,spec.id+'/handrail-'+sign,[spec.x+sign*.94,base+1,spec.z],[spec.x+sign*.94,levelY(spec.toLevel)+1,spec.z+8],.07,'door');for(let j=0;j<=12;j++)box(root,spec.id+'/post-'+sign+'-'+j,.045,.95,.045,spec.x+sign*.94,base+(levelY(spec.toLevel)-base)*j/12+.475,spec.z+8*j/12,'door');}
  stairs.push({...spec,steps:24,rise,run,fromY:base,toY:levelY(spec.toLevel),opening:[spec.x-1,spec.z,spec.x+1,spec.z+8],interpretation:spec.interpretation||'Source-positioned straight gallery stair adapted to two native levels; no traversal assignment.'});
 }
 for(const s of [-1,1]){const x=s*135;for(const poly of [[[x-12,50],[x+12,50],[x+12,74],[x-12,74]]])for(let i=0;i<poly.length;i++)rail(root,'end-gallery-guard-'+s+'-'+i,poly[i],poly[(i+1)%poly.length],levelY(3)+.02,1.05,.65);}
 const inner=PLAN.floors.find(p=>p.id==='rotunda-gallery').holes[0];for(let i=0;i<inner.length;i++)rail(root,'rotunda-gallery-guard-'+i,inner[i],inner[(i+1)%inner.length],levelY(3)+.02,1.05,.65);
 // The native diagram establishes gallery cafes; table locations are art choices.
 for(const sign of [-1,1])for(const z of [22,30])for(const x of [sign*129,sign*141]){cylinder(root,'cafe/'+x+'/'+z+'/top',.7,.7,.08,x,levelY(3)+.8,z,'door',16);cylinder(root,'cafe/'+x+'/'+z+'/leg',.07,.25,.76,x,levelY(3)+.38,z,'door',8);for(const dx of [-1.1,1.1]){box(root,'cafe/'+x+'/'+z+'/bench-'+dx,.8,.12,.45,x+dx,levelY(3)+.48,z,'door');for(const dz of [-.15,.15])box(root,'cafe/'+x+'/'+z+'/foot-'+dx+'-'+dz,.07,.42,.07,x+dx,levelY(3)+.21,z+dz,'door');}}
 if(includePlanting){
  for(const sign of [-1,1])for(const x of [sign*54,sign*76,sign*98]){
   box(root,'front-flower-bed-'+x,18,.16,2,x,levelY(1)+.08,12,'soil',{role:'planting-bed'});
   for(let j=0;j<9;j++){
    custom(root,'front-shrub-'+x+'-'+j,'front-shrub',()=>new T.IcosahedronGeometry(.45,1),'foliage',[x-8+j*2,levelY(1)+.5,12],{role:'plant'});
    for(const dx of [-.25,.25])custom(root,'front-flower-'+x+'-'+j+'-'+dx,'front-flower',()=>new T.IcosahedronGeometry(.13,1),'fruit',[x-8+j*2+dx,levelY(1)+.9,12],{role:'plant'});
   }
  }
  function palm(id,x,z,height,fern=false){const g=group(root,id,[x,levelY(1),z],0,{role:'plant'});cylinder(g,id+'/trunk',fern?.16:.18,fern?.24:.28,height,0,height/2,0,'trunk',10);
   for(let j=0;j<12;j++){const angle=j*Math.PI/6,L=fern?2.8:4.5,key='frond/'+L;
    const m=custom(g,id+'/frond-'+j,key,()=>{const p=[],uv=[],point=(t,side)=>{const width=(fern?.28:.42)*Math.sin(Math.PI*t)*(Math.floor(t*30)%2?.68:1);return[side*width,1.45*Math.sin(Math.PI*t)-.7*t,L*t];};for(let i=0;i<30;i++){const a=i/30,b=(i+1)/30;for(const v of [point(a,-1),point(a,1),point(b,1),point(a,-1),point(b,1),point(b,-1)]){p.push(...v);uv.push(v[0],v[2]);}}const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(p,3));geom.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));geom.computeVertexNormals();return geom;},'foliage',[0,height,0],{role:'plant'});m.rotation.y=angle;
   }plants.push({id,kind:fern?'tree-fern':'palm',position:[x,levelY(1),z],trunkHeight:height,placement:'Interpretive planting, not an exact exhibit reconstruction.'});
  }
  for(const [i,p]of [[-10,28,8],[10,28,8],[-10,46,9],[10,46,9],[-5,36,11],[6,37,10]].entries())palm('palm-'+i,...p);
  for(const [i,p]of [[-18,25,3.4],[18,25,3.4],[-18,49,3.8],[18,49,3.8]].entries())palm('fern-'+i,...p,true);
  for(const sign of [-1,1]){
   for(const x of [sign*54,sign*76,sign*98])for(const z of [51,65]){
    box(root,'court-bed-'+x+'-'+z,10,.16,6,x,levelY(1)+.08,z,'soil',{role:'planting-bed'});cylinder(root,'orange-tree-'+x+'-'+z+'/trunk',.1,.16,2.2,x,levelY(1)+1.1,z,'trunk',8);
    custom(root,'orange-tree-'+x+'-'+z+'/canopy','orange-canopy',()=>new T.IcosahedronGeometry(1.55,2),'foliage',[x,levelY(1)+3.1,z],{role:'plant'});
    for(let j=0;j<8;j++){const a=j*Math.PI/4;custom(root,'orange-tree-'+x+'-'+z+'/fruit-'+j,'orange-fruit',()=>new T.IcosahedronGeometry(.11,1),'fruit',[x+1.4*Math.cos(a),levelY(1)+3+Math.sin(j*2)*.55,z+1.4*Math.sin(a)],{role:'plant'});}
    plants.push({id:'orange-tree-'+x+'-'+z,kind:'orange-tree',position:[x,levelY(1),z],placement:'Courtyard planting supported by Conkey; exact arrangement adapted.'});
   }
   const x=sign*76,z=58;box(root,'court-basin-'+sign+'/water',8,.04,4,x,levelY(1)+.3,z,'water',{role:'decorative-water'});for(const dz of [-2.3,2.3])box(root,'court-basin-'+sign+'/kerb-z-'+dz,9,.4,.6,x,levelY(1)+.2,z+dz,'trim');for(const dx of [-4.3,4.3])box(root,'court-basin-'+sign+'/kerb-x-'+dx,.6,.4,4,x+dx,levelY(1)+.2,z,'trim');
  }
 }
 // Simplified staff figures flank the grand arch; faces/individual works are not copied.
 for(const sign of [-1,1]){const x=sign*6.3,id='entrance-figure-'+sign;box(root,id+'/plinth',.8,.45,.7,x,levelY(1)+.225,-.3,'trim');lathe(root,id+'/body',[[0,0],[.25,0],[.18,.55],[.25,.9],[.14,1.2],[0,1.2]],x,levelY(1)+.45,-.3,'trim',10);custom(root,id+'/head','figure-head',()=>new T.IcosahedronGeometry(.18,1),'trim',[x,levelY(1)+1.85,-.3],{role:'ornament'});}
  let mergedBoundaryParts=0,boundaryAssemblies=0;
  for(const floor of PLAN.floors){
    const parts=f.meshes.filter(m=>m.userData.form==='boundary-slab'&&m.userData.floorId===floor.id);if(!parts.length)continue;
    const arrays={position:[],normal:[],uv:[],grossUV:[]},ranges=[];
    for(const mesh of parts){const g=mesh.geometry,start=arrays.position.length/3,p=g.attributes.position,index=g.index;
      for(let i=0;i<(index?.count||p.count);i++){const k=index?index.getX(i):i;for(const name of Object.keys(arrays)){const at=g.attributes[name];for(let j=0;j<at.itemSize;j++)arrays[name].push(at.array[k*at.itemSize+j]+(name==='position'?mesh.position.getComponent(j):0));}}
      ranges.push({id:mesh.name,...mesh.userData,start,count:arrays.position.length/3-start});mesh.removeFromParent();f.meshes.splice(f.meshes.indexOf(mesh),1);
    }
    const geometry=new T.BufferGeometry();for(const [name,values]of Object.entries(arrays))geometry.setAttribute(name,new T.Float32BufferAttribute(values,name==='position'||name==='normal'?3:2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const id=floor.id+'/boundary-assembly',mesh=new T.Mesh(geometry,slots[floor.slot]);mesh.name=id;mesh.userData={componentId:id,appearanceSlot:floor.slot,form:'boundary-slab-assembly',role:'floor',floorId:floor.id,level:floor.level,parts:ranges};root.add(mesh);f.meshes.push(mesh);f.components.push(id);f.geometries.set(id,geometry);mergedBoundaryParts+=parts.length;boundaryAssemblies++;
  }
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),assembly=f.finalize(root);for(const mesh of f.meshes)if(mesh.userData.appearanceSlot==='glazing')mesh.castShadow=false;
 const metadata=freeze({assetId:'exposition-horticulture-1893',version:1,units:'metres',nativeContract:S,plan:PLAN,localBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},appearanceSlots:APPEARANCE_SLOTS,palette:{id: HORTICULTURE_PALETTE_ID,swatches: HORTICULTURE_PALETTE,interpretation:"User-directed soda-green glazing and warm sunset-peach finishes; historical cream staff remains documented separately."},
  nautilus:{enginePin:ENGINE_PIN,compiler:compiled.compiler,panels:compiled.panels.length,tiers:compiled.tiers,materialToken:compiled.materialToken},structuralPieces,seamPieces,floorTiles,floors:floorMeshes,stairs,domes,plants,passages,physicalMaterial:{structure:'unassigned',finish:'unassigned'},sourceIds:['HORT-CONKEY-1893','HORT-ARNOLD-1893','HORT-WALKER-1893'],
  interiors:'Native first floor, two court gardens, pavilion galleries with open wells, central gallery ring, three straight stairs and interpretive palm/fern/orange planting. No exact exhibit layout, concealed service-room plan or navigation acceptance.',
  integration:'Whole-building native art assembly for later Nautilus/Tinderbox provider intake. Not registered in the fixed catalogue or production world; simulation, collision, fire and traversal remain consumer-owned.',
  roofStatus:'Great glass dome and glazed front curtains are source-supported. Twin ribbed domed foyers follow built photographs; end/rear profiles and hidden joints are simplified. No flat floor crosses the centre of the rotunda above level1.'});
 root.userData={assetId:metadata.assetId,metadata};root.rotation.y=quarterTurns*Math.PI/2;root.position.fromArray(position);root.updateMatrixWorld(true);
 function setAppearance(next={}){if(closed)throw Error('Building is disposed');const names=new Set([...Object.keys(next.materials||{}),...Object.keys(next.textures||{})]);for(const s of names)if(!APPEARANCE_SLOTS.includes(s))throw Error('Unknown appearance slot '+s);const old={materials:{...bindings.materials},textures:{...bindings.textures}},fresh={};try{Object.assign(bindings.materials,next.materials);Object.assign(bindings.textures,next.textures);for(const s of names)fresh[s]=material(s);}catch(error){bindings.materials=old.materials;bindings.textures=old.textures;for(const m of Object.values(fresh)){m.dispose();ownedMaterials.delete(m);}throw error;}for(const [s,m]of Object.entries(fresh)){const prior=slots[s];slots[s]=m;for(const mesh of f.meshes)if(mesh.userData.appearanceSlot===s)mesh.material=m;prior.dispose();ownedMaterials.delete(prior);}}
 function diagnostics(){return {disposed:closed,meshes:f.meshes.length,triangles:f.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1),0),sourceParts:assembly.sourceParts+mergedBoundaryParts-boundaryAssemblies,instanceBatches:assembly.instances.length,geometries:f.geometries.size,materials:ownedMaterials.size,ownedTextures:0,enginePanels:compiled.panels.length,nativeWalls:assembly.nativeWalls,nativeDoors:assembly.nativeDoors,floorTiles:floorTiles.length,wallPieces:structuralPieces.length,closures:seamPieces.length,plants:plants.length};}
 function dispose(){if(closed)return;closed=true;root.removeFromParent();for(const instance of assembly.instances)instance.dispose();for(const g of new Set(f.geometries.values()))g.dispose();for(const m of ownedMaterials)m.dispose();root.clear();f.geometries.clear();ownedMaterials.clear();f.meshes.length=0;}
 return {root,bounds,metadata,setAppearance,diagnostics,dispose};
}
