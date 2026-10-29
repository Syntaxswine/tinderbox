import {createForms} from '../exposition-new-york/forms.js';
import {PROFILE as S,levelY,compileNautilusStructure,ENGINE_PIN} from './engine.js';
import {PLAN} from './plan.js';
import {createSpiralStairs} from './stairs.js';
import {compileFloor} from './floors.js';
export {PLAN} from './plan.js';
export const ADMINISTRATION_ASSET_ID='exposition-administration-1893';
export const APPEARANCE_SLOTS=Object.freeze(['facade','trim','door','roof','glazing','shadow','awning','dome','floor','interior']);
const DEFAULTS={facade:0xe4dbc5,trim:0xeee4cb,door:0x705334,roof:0x7b8070,glazing:0x456968,shadow:0x797567,awning:0x777156,dome:0xc4a159,floor:0xb5a17c,interior:0xd8c9aa};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function createAdministrationBuilding(T,{materials={},textures={},quarterTurns=0,position=[0,0,0]}={}){
  if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('quarterTurns must be 0..3');
  if(!Array.isArray(position)||position.length!==3||position.some(n=>!Number.isFinite(n)))throw Error('position must contain three finite metres');
  if(!Number.isInteger(position[0])||!Number.isInteger(position[2])||Math.abs(position[1]/S.floorSpacing-Math.round(position[1]/S.floorSpacing))>1e-8)throw Error('Tile placement requires integer X/Z metres and Y at a standard floor level');
  for(const slot of [...Object.keys(materials),...Object.keys(textures)])if(!APPEARANCE_SLOTS.includes(slot))throw Error('Unknown appearance slot '+slot);
  const root=new T.Group();root.name=ADMINISTRATION_ASSET_ID;let closed=false;
  const ownedMaterials=new Set(),slots={},bindings={materials:{...materials},textures:{...textures}};
  function material(slot){
    const borrowed=bindings.materials[slot],texture=bindings.textures[slot];if(texture&&!texture.isTexture)throw Error('Expected Three texture in '+slot);if(borrowed&&!borrowed.isMaterial)throw Error('Expected Three material in '+slot);
    const m=borrowed?borrowed.clone():new T.MeshStandardMaterial({color:DEFAULTS[slot],roughness:slot==='dome'?.58:slot==='glazing'?.45:.93,metalness:slot==='dome'?.6:slot==='glazing'?.12:0});
    const prior=borrowed?.onBeforeCompile,key=borrowed?.customProgramCacheKey?.call(borrowed)||'default';
    if(Object.hasOwn(bindings.textures,slot))m.map=bindings.textures[slot];m.name='Administration / '+slot;m.userData.newYorkMapBlend=borrowed?1:slot==='facade'?.12:slot==='roof'?.45:1;
    m.onBeforeCompile=(shader,renderer)=>{
      prior?.call(m,shader,renderer);
      if(m.userData.newYorkMapBlend<1)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#ifdef USE_MAP\ndiffuseColor.rgb = mix(diffuse, diffuseColor.rgb, '+m.userData.newYorkMapBlend.toFixed(6)+');\n#endif');
      if(!shader.vertexShader.includes('attribute vec2 grossUV;'))shader.vertexShader='attribute vec2 grossUV;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (mapTransform * vec3(grossUV, 1.0)).xy;\n#endif');
    };
    m.customProgramCacheKey=()=>key+'/administration-physical-uv-v1/'+m.userData.newYorkMapBlend;ownedMaterials.add(m);return m;
  }
  try{for(const slot of APPEARANCE_SLOTS)slots[slot]=material(slot);}catch(error){for(const m of ownedMaterials)m.dispose();throw error;}
  const f=createForms(T,slots),{box,cylinder,prism,profile,arch,hip,group,rail,urn,lathe}=f,structuralPieces=[],floorTiles=[],seamPieces=[],passages=[],floorMeshes=[],faceGroups=new Map(),compiled=compileNautilusStructure(PLAN.runs);

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
      box(g,id,Math.abs(width-1)<1e-8?1:width,b-a,S.wallThickness,x,mid,0,run.role==='interior'?'interior':'facade',{form:native?'native-wall':seam?'level-closure':'aperture-cut',role:seam?'perimeter-closure':'structural-wall',runId:run.id,level:p.level,panelId:p.id,enginePin:ENGINE_PIN,engineSource:'wallPanels'});
      (seam?seamPieces:structuralPieces).push({id,panelId:p.id,runId:run.id,level:p.level,localX:x,width:Math.abs(width-1)<1e-8?1:width,bottom:a,height:b-a,engineTier:p.tier,cut:!native});
    }
  }
  for(const p of compiled.panels){const run=runs.get(p.runId),g=faceGroups.get(run.id);fragment(g,run,p,p.center[1]-S.wallHeight/2,S.wallHeight);fragment(g,run,p,levelY(p.level)+S.wallHeight,S.slab,true);}
  // Floor slabs retain .12 m thickness. Only boundary cells are clipped; the
  // uncut majority retain native 1 x .12 x 1 m geometry and metre UV density.
  for(const floor of PLAN.floors){
    const cells=compileFloor(floor),top=levelY(floor.level),slot=floor.level>=9?'roof':'floor';let full=0,cut=0,surface=0;
    for(const c of cells){const id=floor.id+'/cell-'+c.x+'-'+c.z+'-'+c.part;let mesh;
      if(c.full){mesh=box(root,id,1,S.slab,1,c.x+.5,top-S.slab/2,c.z+.5,slot,{form:'native-slab'});full++;}
      else{mesh=prism(root,id,c.polygon,S.slab,0,top-S.slab/2,0,slot);mesh.userData.form='boundary-slab';cut++;}
      Object.assign(mesh.userData,{role:'floor',floorId:floor.id,level:floor.level,cell:[c.x,c.z],area:c.area});
      floorTiles.push({id,floorId:floor.id,level:floor.level,x:c.x,z:c.z,part:c.part,full:c.full,area:c.area});surface+=c.area;
    }
    floorMeshes.push({id:floor.id,level:floor.level,top,thickness:S.slab,fullTiles:full,boundaryTiles:cut,surfaceArea:surface});
  }
  function roundTop(g,h){
    const id=h.id,w=h.width,H=h.height,b=h.bottom,top=b+H,r=h.archRadius||w/2,spring=top-r,z=-.12;
    if(h.kind!=='interior-arch')box(g,id+'/glass',w-.12,H-.12,.06,h.x,b+H/2,.025,'glazing');
    for(const s of [-1,1]){box(g,id+'/jamb-'+s,.19,H+.2,.3,h.x+s*w/2,b+H/2,z);box(g,id+'/pier-edge-'+s,.15,H+.42,.23,h.x+s*(w/2+.25),b+H/2,z+.02);}
    arch(g,id+'/arch-moulding',r,.24,.34,h.x,spring,z);
    for(const s of [-1,1]){
      const points=[[0,r],[s*r,r],[s*r,0]];for(let i=1;i<=28;i++){const a=i*Math.PI/56;points.push([s*r*Math.cos(a),r*Math.sin(a)]);}
      profile(g,id+'/spandrel-'+s,points,.16,h.x,spring,0,'facade');
    }
    box(g,id+'/sill',w+.5,.24,.52,h.x,b,-.19);
    const columns=h.kind==='interior-arch'?1:h.kind==='entrance'?8:4;for(let j=1;j<columns;j++)box(g,id+'/mullion-'+j,.09,H-r+.05,.16,h.x-w/2+w*j/columns,b+(H-r)/2,-.13);
    for(const y of h.kind==='interior-arch'?[]:[levelY(3),levelY(5),levelY(7)])if(y>b+.2&&y<spring-.2)box(g,id+'/transom-'+y,w,.18,.25,h.x,y,-.16);
    // Arched fanlight spokes use explicit short beams following the true curve.
    for(let j=1;j<(h.kind==='interior-arch'?1:8);j++){const a=j*Math.PI/8,x=r*Math.cos(a),y=r*Math.sin(a),beam=box(g,id+'/fan-'+j,.07,Math.hypot(x,y),.11,h.x+x/2,spring+y/2,-.15);beam.rotation.z=-Math.atan2(x,y);}
    if(h.kind==='entrance'){
      // Ordinary native door leaves are retained below the giant fixed screen.
      for(const s of [-1,1])box(g,id+'/leaf-'+s,1,1.65,.12,h.x+s*.5,b+.825,-.09,'door',{form:'native-door'});
      box(g,id+'/entry-header',2.35,.2,.3,h.x,b+1.75,-.15);passages.push({id,runId:g.name,level:1,width:2,nativeLeaves:2,intent:'Closed native leaves below fixed screen; no gameplay traversal.'});
    }
  }
  function sash(g,h){const w=h.width,H=h.height,b=h.bottom;
    box(g,h.id+'/glass',w-.12,H-.1,.06,h.x,b+H/2,.025,'glazing');for(const s of [-1,1])box(g,h.id+'/jamb-'+s,.13,H+.18,.26,h.x+s*w/2,b+H/2,-.12);
    for(const y of [b,b+H])box(g,h.id+'/rail-'+y,w+.25,.14,.3,h.x,y,-.14);
    box(g,h.id+'/mullion',.065,H,.1,h.x,b+H/2,-.16);for(let j=1;j<4;j++)box(g,h.id+'/sash-'+j,w,.06,.1,h.x,b+H*j/4,-.17);
  }
  for(const run of PLAN.runs){const g=faceGroups.get(run.id);for(const h of run.openings){
    if(h.kind==='open-door'){
      for(const s of [-1,1])box(g,h.id+'/jamb-'+s,.1,1.7,.23,h.x+s*.54,h.bottom+.85,0,'trim');box(g,h.id+'/header',1.18,.14,.25,h.x,h.bottom+1.65,0);
      // No door leaf: front office connections remain actual openings.
    }else if(h.kind==='window')sash(g,h);else roundTop(g,h);
  }}
  // SOURCE-SUPPORTED DORIC FIRST STAGE. Mitered bands close the whole plan.
  function offset(poly,i,d){const n=poly.length,p=poly[i%n],a=poly[(i+n-1)%n],b=poly[(i+1)%n],l=Math.hypot(p[0]-a[0],p[1]-a[1]),r=Math.hypot(b[0]-p[0],b[1]-p[1]),u=[(p[1]-a[1])/l,-(p[0]-a[0])/l],v=[(b[1]-p[1])/r,-(b[0]-p[0])/r],den=1+u[0]*v[0]+u[1]*v[1];return[p[0]+d*(u[0]+v[0])/den,p[1]+d*(u[1]+v[1])/den];}
  function cornices(poly,id,bands){for(let i=0;i<poly.length;i++)for(const [j,y,h,d]of bands)prism(root,id+'-'+i+'-'+j,[offset(poly,i,d/2),offset(poly,i+1,d/2),offset(poly,i+1,-d/2),offset(poly,i,-d/2)],h,0,y,0,'trim').userData.form='mitered-cornice';}
  cornices(PLAN.body,'doric-cornice',[[0,levelY(1)-.06,.12,.4],[1,levelY(2)-.15,.24,.45],[2,levelY(9)-.68,.26,.5],[3,levelY(9)-.35,.38,.8],[4,levelY(9)-.05,.22,1.3]]);
  for(const run of PLAN.runs.filter(r=>r.role==='exterior')){
    const g=faceGroups.get(run.id),len=run.length;
    for(const s of [-1,1])box(g,run.id+'/corner-pilaster-'+s,.55,levelY(9)-levelY(2)-.4,.36,s*(len/2-.62),(levelY(2)+levelY(9)) /2,-.17);
    // Fine scored courses use the full wall width but skip the real apertures.
    for(let y=levelY(2)+.6;y<levelY(9)-.9;y+=.65){
      const cuts=run.openings.filter(h=>y>h.bottom&&y<h.bottom+h.height).map(h=>[h.x-h.width/2,h.x+h.width/2]).sort((a,b)=>a[0]-b[0]);let start=-len/2;
      for(const [left,right]of [...cuts,[len/2,len/2]]){if(left>start+.03)box(g,run.id+'/rustication-'+y+'-'+start,left-start,.025,.018,(left+start)/2,y,-.089,'shadow');start=Math.max(start,right);}
    }
    if(len===26||len===28){rail(g,run.id+'/parapet',[-len/2,0],[len/2,0],levelY(9)+.1,1.1);const n=Math.floor(len/.7);for(let j=0;j<n;j++)box(g,run.id+'/dentil-'+j,.21,.28,.38,-len/2+(j+.5)*len/n,levelY(9)-.47,-.43);}
  }
  // Low basement lights and native-scale secondary doors below the tall sashes.
  for(const run of PLAN.runs.filter(r=>r.role==='exterior'&&r.length===26)){
    const g=faceGroups.get(run.id);for(const x of [-9,-3,3,9]){
      box(g,run.id+'/basement-panel-'+x,1.15,1.45,.045,x,levelY(1)+.8,-.105,'shadow');for(const t of [-1,1])box(g,run.id+'/basement-pier-'+x+'-'+t,.09,1.6,.2,x+t*.62,levelY(1)+.8,-.16);
    }
  }
  // Compact reusable allegorical figures, simplified for the isometric view.
  function statue(parent,id,x,y,z,angle=0,winged=false){
    const g=group(parent,id,[x,y,z],angle,{role:'custom-sculpture',source:'Simplified silhouette of source allegorical groups; not a replica of Bitter sculpture.'});
    box(g,id+'/pedestal',1.65,.36,1.4,0,.18,0);lathe(g,id+'/robe',[[0,0],[.62,0],[.57,.35],[.43,.95],[.36,1.65],[.27,1.9],[0,1.9]],0,.36,0,'trim',9);
    box(g,id+'/shoulders',.9,.35,.43,0,2.05,0);lathe(g,id+'/head',[[0,-.26],[.2,-.2],[.26,0],[.22,.22],[0,.29]],0,2.48,0,'trim',10);
    for(const s of [-1,1]){const arm=cylinder(g,id+'/arm-'+s,.11,.14,.95,s*.48,1.75,.1);arm.rotation.z=s*.22;box(g,id+'/knee-'+s,.37,.42,.68,s*.25,.88,.28);}
    if(winged)for(const s of [-1,1])profile(g,id+'/wing-'+s,[[s*.2,0],[s*1.65,1.65],[s*1.1,1.55],[s*.65,1.2]],.12,0,1.65,-.25,'trim');
    return g;
  }
  for(const x of [-39,-15,15,39])for(const z of [1,25,55,79])if((Math.abs(x)>30&&[1,79].includes(z))||(Math.abs(x)<20&&[1,79].includes(z)))statue(root,'pavilion-figure-'+x+'-'+z,x,levelY(9)+1.2,z,Math.PI);
  // Source first-floor plate labels are retained in metadata; modest furnishings
  // make the offices legible without inventing a finished historical interior.
  for(const room of PLAN.rooms){const xs=room.polygon.map(p=>p[0]),zs=room.polygon.map(p=>p[1]),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
    if(!room.id.includes('wc')){box(root,room.id+'/desk',2,.14,.9,x,levelY(1)+.78,z,'door');for(const s of [-1,1])box(root,room.id+'/desk-leg-'+s,.12,.72,.65,x+s*.8,levelY(1)+.36,z,'door');}
  }
  // Ionic upper colonnade: fixed base/terrace levels, custom column profiles.
  const topSquare=[[-27,13],[27,13],[27,67],[-27,67]];
  cornices(topSquare,'ionic-cornice',[[0,levelY(10),.26,.65],[1,levelY(18)-.25,.35,.8],[2,levelY(18)+.2,.45,1.05],[3,levelY(19)-.25,.3,1.6]]);
  for(const [side,position,angle]of [['front',[0,0,13],0],['east',[27,0,40],-Math.PI/2],['rear',[0,0,67],Math.PI],['west',[-27,0,40],Math.PI/2]]){
    const g=group(root,'ionic-'+side,position,angle);
    for(const [i,x]of [-21,-15,-9,-3,3,9,15,21].entries()){
      const id='ionic-'+side+'/column-'+i,base=levelY(11),top=levelY(17);
      box(g,id+'/pedestal',1.75,levelY(11)-levelY(9),1.75,x,(levelY(11)+levelY(9))/2,0);
      cylinder(g,id+'/base',.76,.86,.3,x,base+.15,0);cylinder(g,id+'/shaft',.5,.61,top-base-.64,x,(top+base-.04)/2,0,'trim',16);
      box(g,id+'/capital',1.8,.38,1.42,x,top-.15,0);for(const s of [-1,1]){const v=cylinder(g,id+'/volute-'+s,.23,.23,.35,x+s*.65,top-.11,-.3,'trim',12);v.rotation.x=Math.PI/2;}
    }
    rail(g,'ionic-'+side+'/upper-rail',[-27,0],[27,0],levelY(19),1.15);
    const n=70;for(let i=0;i<n;i++)box(g,'ionic-'+side+'/dentil-'+i,.22,.3,.42,-27+(i+.5)*54/n,levelY(18)+.55,-.5);
  }
  // Eight-sided drum: actual native 16 m wall runs behind round medallions.
  cornices(PLAN.rotunda,'drum-cornice',[[0,levelY(19)+.2,.32,.65],[1,levelY(22)+.4,.28,.55],[2,levelY(23)-.1,.28,1.1]]);
  for(let i=0;i<8;i++){
    const run=runs.get('rotunda-'+i),g=faceGroups.get(run.id);
    for(const x of [-5,0,5]){const m=cylinder(g,'drum-'+i+'/medallion-'+x,.9,.9,.14,x,levelY(21),-.16);m.rotation.x=Math.PI/2;const f0=cylinder(g,'drum-'+i+'/field-'+x,.64,.64,.16,x,levelY(21),-.25,'facade');f0.rotation.x=Math.PI/2;}
    for(const s of [-1,1])box(g,'drum-'+i+'/pilaster-'+s,.4,levelY(23)-levelY(19),.38,s*7.45,(levelY(23)+levelY(19))/2,-.14);
  }
  // Four small cupolas and winged groups support the silhouette seen in plate23.
  for(const x of [-22,22])for(const z of [18,62]){
    const id='corner-cupola-'+x+'-'+z,base=levelY(19);
    cylinder(root,id+'/curb',3.6,3.6,.55,x,base+.275,z,'trim',16);
    lathe(root,id+'/cap',[[3.5,0],[3.42,.7],[3,1.8],[2.25,2.8],[1.2,3.5],[.2,3.8]],x,base+.55,z,'dome',24);
    statue(root,id+'/winged-figure',x+(x<0?-3.7:3.7),base+.1,z,Math.PI,true);
  }
  // Hollow ribbed dome: no hidden flat cap crosses the rotunda at its spring.
  const domeBase=levelY(23),domeHeight=levelY(35)-domeBase;
  const meridian=[[20.3,0],[20.25,1.2],[20,3.2],[19.4,6.2],[18.45,9.4],[17.1,12.6],[15.3,15.8],[12.9,18.9],[9.5,22],[6.4,24],[3.2,domeHeight]];
  lathe(root,'great-dome/shell',meridian,0,domeBase,40,'dome',72).userData.role='custom-dome-shell';
  // Turned annular base/crown moldings remain open through the middle.
  lathe(root,'great-dome/base-ring',[[19.25,0],[20.7,0],[20.85,.22],[20.55,.45],[19.3,.45]],0,domeBase,40,'trim',72);
  function ribGeometry(id,phi,width,offset){
    const verts=[],uv=[];let distance=0;for(let i=1;i<meridian.length;i++){const [r0,y0]=meridian[i-1],[r1,y1]=meridian[i],delta=width/Math.max(r0,r1)/2;
      const at=(r,y,a)=>[(r+offset)*Math.sin(a),domeBase+y,40+(r+offset)*Math.cos(a)],a=at(r0,y0,phi-delta),b=at(r0,y0,phi+delta),c=at(r1,y1,phi+delta),d=at(r1,y1,phi-delta);verts.push(...a,...b,...c,...a,...c,...d);const next=distance+Math.hypot(r1-r0,y1-y0),u0=(r0+offset)*Math.sin(delta),u1=(r1+offset)*Math.sin(delta);uv.push(-u0,distance,u0,distance,u1,next,-u0,distance,u1,next,-u1,next);distance=next;
    }
    const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(verts,3));geom.computeVertexNormals();geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setAttribute('grossUV',geom.attributes.uv.clone());geom.computeBoundingBox();geom.computeBoundingSphere();
    f.geometries.set(id,geom);const mesh=new T.Mesh(geom,slots.trim);mesh.name=id;mesh.userData={componentId:id,appearanceSlot:'trim',form:'dome-rib',role:'custom-ornament'};root.add(mesh);f.meshes.push(mesh);f.components.push(id);
  }
  for(let i=0;i<24;i++){
    const phi=i*Math.PI/12;ribGeometry('great-dome/rib-'+i,phi,.22,.075);
    const angle=phi+Math.PI/24,g=group(root,'great-dome/relief-'+i,[0,0,40],angle);
    for(let j=0;j<9;j++){
      const y=5.7+j*1.35,k=meridian.findIndex(p=>p[1]>=y),lo=meridian[k-1],hi=meridian[k],radius=lo[0]+(hi[0]-lo[0])*(y-lo[1])/(hi[1]-lo[1]);
      profile(g,'great-dome/leaf-'+i+'-'+j,[[0,0],[.27,.2],[.3,.46],[0,.77],[-.3,.46],[-.27,.2]],.075,0,domeBase+y,radius+.08,'trim');
      for(const s of [-1,1]){const leaf=profile(g,'great-dome/sprig-'+i+'-'+j+'-'+s,[[0,0],[s*.55,.28],[s*.42,.6],[0,.36]],.055,s*.2,domeBase+y+.2,radius+.06,'dome');leaf.rotation.z=s*.24;}
    }
  }
  for(const [i,at]of [1.15,3.3,21.3].entries()){
    const k=meridian.findIndex(p=>p[1]>=at),lo=meridian[k-1],hi=meridian[k],radius=lo[0]+(hi[0]-lo[0])*(at-lo[1])/(hi[1]-lo[1]);
    lathe(root,'great-dome/panel-band-'+i,[[radius-.03,at],[radius+.1,at],[radius+.16,at+.13],[radius+.06,at+.25],[radius-.03,at+.25]],0,domeBase,40,'trim',72);
  }
  cylinder(root,'great-dome/crown-band',3.4,3.4,.32,0,levelY(35)+.16,40,'trim',24);
  hip(root,'great-dome/crown-cap',6.2,6.2,1.25,0,levelY(35)+.32,40,'dome');
  cylinder(root,'great-dome/finial',.03,.18,levelY(36)-levelY(35)-1.57,0,(levelY(36)+levelY(35)+1.57)/2,40,'dome',10);
  // Standard-level visual stairs at all four approaches; traversal stays external.
  for(const [side,pos,angle]of [['front',[0,0,0],0],['east',[40,0,40],-Math.PI/2],['rear',[0,0,80],Math.PI],['west',[-40,0,40],Math.PI/2]]){
    const g=group(root,'steps-'+side,pos,angle);for(let i=0;i<12;i++){const h=(i+1)*levelY(1)/12,d=(12-i)*.5;box(g,'steps-'+side+'/tread-'+i,16,h,d,0,h/2,-d/2,'facade',{role:'stair-tread'});}
  }
  const stairs=PLAN.stairs.map(p=>createSpiralStairs(f,root,p));
  let mergedBoundaryParts=0,boundaryAssemblies=0;
  for(const floor of PLAN.floors){
    const parts=f.meshes.filter(m=>m.userData.form==='boundary-slab'&&m.userData.floorId===floor.id);if(!parts.length)continue;
    const arrays={position:[],normal:[],uv:[],grossUV:[]},ranges=[];
    for(const mesh of parts){const g=mesh.geometry,start=arrays.position.length/3,p=g.attributes.position,index=g.index;
      for(let i=0;i<(index?.count||p.count);i++){const k=index?index.getX(i):i;for(const name of Object.keys(arrays)){const at=g.attributes[name];for(let j=0;j<at.itemSize;j++)arrays[name].push(at.array[k*at.itemSize+j]+(name==='position'?mesh.position.getComponent(j):0));}}
      ranges.push({id:mesh.name,...mesh.userData,start,count:arrays.position.length/3-start});mesh.removeFromParent();f.meshes.splice(f.meshes.indexOf(mesh),1);
    }
    const geometry=new T.BufferGeometry();for(const [name,values]of Object.entries(arrays))geometry.setAttribute(name,new T.Float32BufferAttribute(values,name==='position'||name==='normal'?3:2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const id=floor.id+'/boundary-assembly',mesh=new T.Mesh(geometry,slots.roof);mesh.name=id;mesh.userData={componentId:id,appearanceSlot:'roof',form:'boundary-slab-assembly',role:'floor',floorId:floor.id,level:floor.level,parts:ranges};root.add(mesh);f.meshes.push(mesh);f.components.push(id);f.geometries.set(id,geometry);mergedBoundaryParts+=parts.length;boundaryAssemblies++;
  }
  root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),localBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  const assembly=f.finalize(root);
  const metadata=freeze({assetId:ADMINISTRATION_ASSET_ID,version:1,units:'metres',groundAnchor:PLAN.groundAnchor,nativeContract:{...S},plan:PLAN,
    nautilus:{enginePin:ENGINE_PIN,compiler:compiled.compiler,wallPanels:compiled.panels.length,tierCount:compiled.bands.length,bands:compiled.bands,materialToken:compiled.materialToken,integration:compiled.integration},
    structuralPieces,seamPieces,floorTiles,floors:floorMeshes,stairs,passages,localBounds,appearanceSlots:[...APPEARANCE_SLOTS],
    sourceIds:['ADMIN-HUNT-1893','ADMIN-FLINN-1893','ADMIN-ARNOLD-1893'],historicalStatus:PLAN.sourceStatus,
    physicalMaterial:{structure:'unassigned',finish:'unassigned'},
    integration:'Native Nautilus geometry assembly for later building-library intake. Not placed into the production street or registered in the fixed engine catalogue. Collision, traversal, fire and collapse remain consumer-owned.',
    interiors:'Hunt front ground-floor office partitions/labels adapted to whole metres; four pavilion floor plates, upper gallery and open rotunda. Circular stairs are a native-level interpretation. Rear rooms, exact upper partitions, elevator details and the interior dome mural remain unverified or omitted.'});
  root.userData={assetId:ADMINISTRATION_ASSET_ID,metadata};root.rotation.y=-quarterTurns*Math.PI/2;root.position.fromArray(position);root.updateMatrixWorld(true);
  function setAppearance(next={}){
    if(closed)throw Error('Building is disposed');
    const names=new Set([...Object.keys(next.materials||{}),...Object.keys(next.textures||{})]);for(const s of names)if(!APPEARANCE_SLOTS.includes(s))throw Error('Unknown appearance slot '+s);
    const staged={};const before={materials:{...bindings.materials},textures:{...bindings.textures}};
    try{Object.assign(bindings.materials,next.materials);Object.assign(bindings.textures,next.textures);for(const s of names)staged[s]=material(s);}catch(error){bindings.materials=before.materials;bindings.textures=before.textures;for(const m of Object.values(staged)){m.dispose();ownedMaterials.delete(m);}throw error;}
    for(const [s,m] of Object.entries(staged)){const old=slots[s];slots[s]=m;for(const mesh of f.meshes)if(mesh.userData.appearanceSlot===s)mesh.material=m;old.dispose();ownedMaterials.delete(old);}
  }
  function diagnostics(){return {disposed:closed,meshes:f.meshes.length,triangles:f.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1),0),sourceParts:assembly.sourceParts+mergedBoundaryParts-boundaryAssemblies,instanceBatches:assembly.instances.length,geometries:f.geometries.size,materials:ownedMaterials.size,ownedTextures:0,borrowedTextureCount:new Set([...ownedMaterials].flatMap(m=>m.map?[m.map]:[])).size,enginePanels:compiled.panels.length,nativeWalls:assembly.nativeWalls,nativeDoors:assembly.nativeDoors,components:f.components.length,floorTiles:floorTiles.length,wallPieces:structuralPieces.length,levelClosures:seamPieces.length,quarterTurns};}
  return {root,bounds:bounds.clone(),metadata,setAppearance,diagnostics,dispose(){if(closed)return;closed=true;root.removeFromParent();const groups=[];root.traverse(o=>{if(o.isGroup)groups.push(o);});for(const g of groups)g.clear();for(const m of assembly.instances)m.dispose();assembly.instances.length=0;for(const g of f.geometries.values())g.dispose();for(const m of ownedMaterials)m.dispose();f.geometries.clear();ownedMaterials.clear();f.meshes.length=0;f.components.length=0;}};
}
