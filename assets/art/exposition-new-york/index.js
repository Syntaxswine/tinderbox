import {NATIVE_CONTRACT as S} from './native-contract.js';
import {createForms} from './forms.js';

export const NEW_YORK_ASSET_ID='exposition-new-york-1893';
export const APPEARANCE_SLOTS=Object.freeze(['facade','trim','door','roof','glazing','shadow','awning']);
const DEFAULTS={facade:0xe7dcc0,trim:0xefe1bd,door:0x674b32,roof:0x8e9a84,glazing:0x456e70,shadow:0x5d6151,awning:0x747d55};
const BODY=[[-23.5,0],[-23.5,27],[-13.25,27],[-13.25,30.5],[-7.25,30.5],[-7.25,32],[7.25,32],[7.25,30.5],[13.25,30.5],[13.25,27],[23.5,27],[23.5,0]];
const FOUNDATION=[[-23.75,-.25],[-23.75,27.25],[-13.5,27.25],[-13.5,30.75],[-7.5,30.75],[-7.5,32.25],[7.5,32.25],[7.5,30.75],[13.5,30.75],[13.5,27.25],[23.75,27.25],[23.75,-.25]];
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const rectangle=(a,b,c,d)=>[[a,c],[b,c],[b,d],[a,d]];
function offsetVertex(poly,index,distance){
  const n=poly.length,p=poly[index%n],a=poly[(index+n-1)%n],b=poly[(index+1)%n],l=Math.hypot(p[0]-a[0],p[1]-a[1]),r=Math.hypot(b[0]-p[0],b[1]-p[1]);
  const u=[-(p[1]-a[1])/l,(p[0]-a[0])/l],v=[-(b[1]-p[1])/r,(b[0]-p[0])/r],den=1+u[0]*v[0]+u[1]*v[1];
  return[p[0]+distance*(u[0]+v[0])/den,p[1]+distance*(u[1]+v[1])/den];
}
const halfDisc=r=>Array.from({length:41},(_,i)=>{const a=-Math.PI/2+i*Math.PI/40;return[r*Math.cos(a),r*Math.sin(a)];});
const annulus=(r,w,neck=0)=>[...halfDisc(r).map(([x,z])=>[x+neck,z]),...halfDisc(r-w).reverse().map(([x,z])=>[x+neck,z])];
const porchOutline=(r,neck=1.25)=>[[0,-r],...halfDisc(r).map(([x,z])=>[x+neck,z]),[0,r]];
// Plate44: fourteen paired outer columns and eight inner columns, in source metres.
const PORCH_COLUMNS={"outer":[[2.15,7.25],[4.4,6.85],[5.3,6.45],[7.1,5.0],[7.75,4.3],[8.7,2.1],[8.95,1.1],[8.95,-1.1],[8.7,-2.1],[7.75,-4.3],[7.1,-5.0],[5.3,-6.45],[4.4,-6.85],[2.15,-7.25]],"inner":[[1.85,4.3],[3.65,3.85],[5.1,2.65],[6.05,0.95],[6.05,-0.95],[5.1,-2.65],[3.65,-3.85],[1.85,-4.3]]};

/** Exterior-only landmark. Borrowed materials are cloned as owned UV adapters;
 * maps/textures and the supplied Three namespace always remain host-owned.
 * Anchor is ground at centre of main front wall; +Z goes toward the rear.
 * Bounds and metadata remain local metres regardless of placement.
 */
export function createNewYorkStateBuilding(T,{materials={},textures={},quarterTurns=0,position=[0,0,0]}={}){
  if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('quarterTurns must be 0..3');
  if(!Array.isArray(position)||position.length!==3||position.some(n=>!Number.isFinite(n)))throw Error('position must contain three finite metres');
  for(const slot of [...Object.keys(materials),...Object.keys(textures)])if(!APPEARANCE_SLOTS.includes(slot))throw Error('Unknown appearance slot '+slot);
  const root=new T.Group();root.name=NEW_YORK_ASSET_ID;let closed=false;
  const ownedMaterials=new Set(),slots={},bindings={materials:{...materials},textures:{...textures}};
  function material(slot){
    const borrowed=bindings.materials[slot],texture=bindings.textures[slot];if(texture&&!texture.isTexture)throw Error('Expected Three texture in '+slot);if(borrowed&&!borrowed.isMaterial)throw Error('Expected Three material in '+slot);
    const m=borrowed?borrowed.clone():new T.MeshStandardMaterial({color:DEFAULTS[slot],roughness:slot==='glazing'?.45:.93,metalness:slot==='glazing'?.12:0});
    const prior=borrowed?.onBeforeCompile,key=borrowed?.customProgramCacheKey?.call(borrowed)||'default';
    if(Object.hasOwn(bindings.textures,slot))m.map=bindings.textures[slot];m.name='New York / '+slot;m.userData.newYorkMapBlend=borrowed?1:slot==='facade'?.12:slot==='roof'?.45:1;
    m.onBeforeCompile=(shader,renderer)=>{
      prior?.call(m,shader,renderer);
      if(m.userData.newYorkMapBlend<1)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#ifdef USE_MAP\ndiffuseColor.rgb = mix(diffuse, diffuseColor.rgb, '+m.userData.newYorkMapBlend.toFixed(6)+');\n#endif');
      if(!shader.vertexShader.includes('attribute vec2 grossUV;'))shader.vertexShader='attribute vec2 grossUV;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (mapTransform * vec3(grossUV, 1.0)).xy;\n#endif');
    };
    m.customProgramCacheKey=()=>key+'/new-york-physical-uv-v1/'+m.userData.newYorkMapBlend;ownedMaterials.add(m);return m;
  }
  try{for(const slot of APPEARANCE_SLOTS)slots[slot]=material(slot);}catch(error){for(const m of ownedMaterials)m.dispose();throw error;}
  const f=createForms(T,slots),{box,cylinder,prism,profile,arch,hip,group,rail,urn}=f,groundContact=[],passages=[],roofGroups=[],sourceBays=[];
  function face(id,width,x,z,angle,holes=[],bottom=2.12,top=17.2,{inferred=false}={}){
    const g=group(root,id,[x,0,z],angle,{evidence:inferred?'inferred rear treatment':'plate44 outline / elevation'}),lo=-width/2,hi=width/2;
    const xs=[lo,hi,...Array.from({length:Math.floor(width)},(_,i)=>lo+i+1).filter(v=>v<hi),...holes.flatMap(h=>[h.x-h.w/2,h.x+h.w/2])].filter(v=>v>=lo&&v<=hi);
    const ys=[bottom,top,...Array.from({length:9},(_,i)=>[2.12+i*S.floorSpacing,2.12+i*S.floorSpacing+S.wallHeight]).flat(),...holes.flatMap(h=>[h.y,h.y+h.h])].filter(v=>v>=bottom&&v<=top);
    const unique=a=>[...new Set(a.map(n=>Math.round(n*1e6)/1e6))].sort((a,b)=>a-b),xx=unique(xs),yy=unique(ys);let n=0;
    for(let i=1;i<xx.length;i++)for(let j=1;j<yy.length;j++){
      const a=xx[i-1],b=xx[i],c=yy[j-1],d=yy[j],mx=(a+b)/2,my=(c+d)/2;
      if(holes.some(h=>mx>h.x-h.w/2-1e-7&&mx<h.x+h.w/2+1e-7&&my>h.y-1e-7&&my<h.y+h.h+1e-7))continue;
      const native=Math.abs(b-a-S.tile)<1e-6&&Math.abs(d-c-S.wallHeight)<1e-6;
      box(g,id+'/panel-'+n++,b-a,d-c,S.wallThickness,mx,my,0,'facade',{form:native?'native-wall':'explicit-infill',sourceUVs:'unchanged BoxGeometry UV',physicalMaterial:'unassigned'});
    }
    return g;
  }
  function window(g,id,x,y,w=1.5,h=2.9,{pediment=false,awning=false}={}){
    box(g,id+'/glass',w-.14,h-.12,.07,x,y+h/2,.015,'glazing');
    for(const s of [-1,1])box(g,id+'/jamb-'+s,.14,h+.22,.24,x+s*w/2,y+h/2,-.12);
    for(const [j,dy] of [[0,0],[1,h]])box(g,id+'/rail-'+j,w+.28,.15,.27,x,y+dy,-.14);
    box(g,id+'/mullion',.055,h,.09,x,y+h/2,-.19);
    for(let i=1;i<4;i++)box(g,id+'/sash-'+i,w,.045,.09,x,y+h*i/4,-.19);
    box(g,id+'/sill',w+.48,.16,.42,x,y-.12,-.18);
    if(pediment){box(g,id+'/hood',w+.78,.2,.45,x,y+h+.24,-.2);profile(g,id+'/pediment',[[-(w+.7)/2,0],[(w+.7)/2,0],[0,.48]],.23,x,y+h+.36,-.15);}
    if(awning){
      const canopy=box(g,id+'/canopy',w+.24,.055,.94,x,y+h-.3,-.57,'awning');canopy.rotation.x=-.3;
      const stripes=6;for(let i=0;i<stripes;i++){const m=box(g,id+'/canopy-stripe-'+i,(w+.24)/stripes/2,.058,.95,x-(w+.24)/2+(i+.25)*(w+.24)/stripes,y+h-.3,-.57);m.rotation.x=-.3;}
      box(g,id+'/valance',w+.25,.2,.06,x,y+h-.44,-1.02,'awning');
    }
  }
  function niche(g,id,x){
    box(g,id+'/recess',1.35,2.75,.045,x,4.42,-.09,'shadow');arch(g,id+'/arch',.66,.13,.19,x,5.13,-.16,'trim');
    for(const s of [-1,1])box(g,id+'/jamb-'+s,.14,2.1,.2,x+s*.73,4.08,-.16);
    box(g,id+'/base',1.7,.2,.35,x,2.93,-.17);
    box(g,id+'/upper-recess',1.35,2.45,.04,x,11.05,-.095,'shadow');arch(g,id+'/upper-arch',.66,.13,.19,x,11.77,-.16);
    for(const s of [-1,1])box(g,id+'/upper-jamb-'+s,.14,2.1,.2,x+s*.73,10.72,-.16);
  }
  prism(root,'foundation',FOUNDATION,2.12,0,1.06,0,'facade');groundContact.push({id:'main-plinth',polygon:FOUNDATION,minY:0,maxY:2.12,intent:'raised closed mass'});
  // The first-floor plan gives this outline; roof-back surfaces remain inferred.
  const lowerXs=[-20.75,-14.75,-9.75,-4.9,4.9,9.75,14.75,20.75],upperXs=lowerXs.filter(x=>Math.abs(x)>5),atticXs=[-20.75,-14.75,-9.75,-4.9,0,4.9,9.75,14.75,20.75];
  const frontHoles=[...lowerXs.map(x=>({x,y:3.0,w:1.5,h:2.9})),...upperXs.map(x=>({x,y:9.8,w:1.5,h:2.9})),...atticXs.map(x=>({x,y:15.1,w:1.15,h:1.05})),{x:0,y:2.12,w:2.3,h:4.5}];
  const front=face('front',47,0,0,0,frontHoles);
  lowerXs.forEach((x,i)=>{window(front,'front/lower-window-'+i,x,3,1.5,2.9,{awning:true});sourceBays.push({id:'lower-'+i,x,y:3,source:'plate44 elevation'});});
  upperXs.forEach((x,i)=>window(front,'front/upper-window-'+i,x,9.8,1.5,2.9,{pediment:true,awning:true}));
  atticXs.forEach((x,i)=>window(front,'front/frieze-window-'+i,x,15.1,1.15,1.05));
  for(const x of [-17.75,17.75])niche(front,'front/niche-'+x,x);
  for(const [label,s,angle] of [['east',1,-Math.PI/2],['west',-1,Math.PI/2]]){
    const us=[-10.5,-5.5,5.5,10.5],holes=[...us.flatMap(x=>[3,9.8].map(y=>({x,y,w:1.5,h:2.9}))),...[-10.5,-5.5,0,5.5,10.5].map(x=>({x,y:15.1,w:1.15,h:1.05})),{x:0,y:2.12,w:2,h:3.6}];
    const g=face(label,27,s*23.5,13.5,angle,holes);
    us.forEach((x,i)=>{window(g,label+'/lower-'+i,x,3,1.5,2.9,{awning:true});window(g,label+'/upper-'+i,x,9.8,1.5,2.9,{pediment:true,awning:true});});
    [-10.5,-5.5,0,5.5,10.5].forEach((x,i)=>window(g,label+'/attic-'+i,x,15.1,1.15,1.05));
    for(const u of [-.5,.5])box(g,label+'/closed-leaf-'+u,1,1.65,.12,u,2.12+.825,-.01,'door',{form:'native-door',dimensions:[1,1.65,.12]});
    box(g,label+'/transom',2,1.9,.07,0,4.72,.01,'glazing');
    for(const t of [-1,1])box(g,label+'/entry-jamb-'+t,.12,3.6,.24,t*1.04,3.92,-.11);
    box(g,label+'/entry-header',2.3,.14,.24,0,5.72,-.11);
    passages.push({id:label+'-entry',centre:[s*23.5,2.12,13.5],clearWidth:2,visualIntent:'closed leaves at raised porch; no traversal',nativeLeaves:2});
  }
  // Each rear boundary segment follows the plan; openings on these faces are inferred.
  const rearSegments=[{id:'rear-west-wing',a:[-23.5,27],b:[-13.25,27]},{id:'rear-west-step',a:[-13.25,27],b:[-13.25,30.5]},{id:'rear-west-shoulder',a:[-13.25,30.5],b:[-7.25,30.5]},{id:'rear-west-return',a:[-7.25,30.5],b:[-7.25,32]},{id:'rear-centre',a:[-7.25,32],b:[7.25,32]},{id:'rear-east-return',a:[7.25,32],b:[7.25,30.5]},{id:'rear-east-shoulder',a:[7.25,30.5],b:[13.25,30.5]},{id:'rear-east-step',a:[13.25,30.5],b:[13.25,27]},{id:'rear-east-wing',a:[13.25,27],b:[23.5,27]}];
  for(const {id,a,b} of rearSegments){
    const w=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=Math.PI-Math.atan2(b[1]-a[1],b[0]-a[0]),us=w>5?Array.from({length:Math.max(1,Math.round(w/4.5))},(_,i)=>-w/2+(i+.5)*w/Math.max(1,Math.round(w/4.5))):[],holes=us.flatMap(x=>[3,9.8].map(y=>({x,y,w:1.5,h:2.9})));
    const g=face(id,w,(a[0]+b[0])/2,(a[1]+b[1])/2,angle,holes,2.12,17.2,{inferred:true});us.forEach((x,i)=>{window(g,id+'/lower-'+i,x,3);window(g,id+'/upper-'+i,x,9.8,1.5,2.9,{pediment:true});});
  }
  // Repeated cornice courses follow every plan edge. Native slabs stay .12 m.
  for(let i=0;i<BODY.length;i++){
    const a=BODY[i],b=BODY[(i+1)%BODY.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),g=group(root,'edge-'+i,[(a[0]+b[0])/2,0,(a[1]+b[1])/2],-Math.atan2(b[1]-a[1],b[0]-a[0]));
    for(const [j,y,h,d] of [[0,2.06,.12,.38],[1,7.85,.2,.36],[2,8.12,.32,.5],[3,8.43,.18,.64],[4,14.22,.16,.3],[5,16.65,.2,.4],[6,17,.36,.55],[7,17.31,.26,.82],[8,17.53,.18,1.02]]){const strip=[offsetVertex(BODY,i,d/2),offsetVertex(BODY,i+1,d/2),offsetVertex(BODY,i+1,-d/2),offsetVertex(BODY,i,-d/2)];prism(root,'edge-'+i+'/course-'+j,strip,h,0,y,0,'trim').userData.form='mitered-cornice';}
    rail(root,'main-parapet-'+i,a,b,18.1,1.1);
    const n=Math.max(1,Math.floor(len/.8));for(let j=0;j<n;j++)box(g,'edge-'+i+'/dentil-'+j,.19,.25,.26,-len/2+(j+.5)*len/n,16.86,-.33);
  }
  for(const x of [-23.2,-19,-14.75,-9.75,-4.9,0,4.9,9.75,14.75,19,23.2])urn(root,'front-parapet-urn-'+x,x,19.2,0);
  for(const s of [-1,1])for(const z of [5,10,17,23,26.5])urn(root,'side-parapet-urn-'+s+'-'+z,s*23.5,19.2,z);
  // Simplified repeated garlands replace fine sculpted frieze at isometric scale.
  for(let i=0;i<8;i++){const x=(atticXs[i]+atticXs[i+1])/2,w=atticXs[i+1]-atticXs[i]-1.7;arch(front,'front/frieze-swag-'+i,w/2,.09,.1,x,15.82,-.12,'trim',.35).rotation.z=Math.PI;}
  // Monumental surround uses two unscaled native door leaves below fixed transoms.
  for(const s of [-1,1]){
    box(front,'entry/leaf-'+s,S.doorWidth,S.doorHeight,S.doorThickness,s*.5,2.12+S.doorHeight/2,-.03,'door',{form:'native-door'});
    for(let j=0;j<2;j++)box(front,'entry/leaf-panel-'+s+'-'+j,.65,.5,.035,s*.5,2.12+.44+j*.72,-.11,'trim');
    cylinder(front,'entry/column-'+s,.25,.32,4.75,s*1.8,4.7,-.44,'trim',12);
    box(front,'entry/column-plinth-'+s,.76,.45,.76,s*1.8,2.345,-.44);box(front,'entry/capital-'+s,.81,.3,.81,s*1.8,7.08,-.44);
  }
  for(const t of [-1,1])box(front,'entry/jamb-'+t,.16,4.5,.24,t*1.07,4.37,-.1);
  box(front,'entry/fixed-transom',2.22,2.75,.07,0,5.165,.01,'glazing');
  for(const y of [3.77,5.1,6.55])box(front,'entry/transom-rail-'+y,2.5,.15,.22,0,y,-.14);
  box(front,'entry/transom-mullion',.13,2.75,.2,0,5.165,-.13);
  box(front,'entry/entablature',5.3,.4,1.1,0,7.48,-.35);
  arch(front,'entry/upper-relief-arch',2.5,.32,.22,0,9.2,-.16);
  for(const s of [-1,1]){
    const r=cylinder(front,'entry/medallion-'+s,.85,.85,.12,s*4.7,10.9,-.12);r.rotation.x=Math.PI/2;
    const field=cylinder(front,'entry/medallion-field-'+s,.65,.65,.14,s*4.7,10.9,-.19,'facade');field.rotation.x=Math.PI/2;
    const head=cylinder(front,'entry/cameo-head-'+s,.17,.17,.1,s*4.7,11.12,-.29);head.rotation.x=Math.PI/2;
    profile(front,'entry/cameo-bust-'+s,[[-.38,0],[.38,0],[.23,.24],[-.2,.24]],.1,s*4.7,10.57,-.29);
  }
  box(front,'entry/relief-band',13.8,.85,.16,0,13.15,-.13);for(let i=-3;i<=3;i++)arch(front,'entry/relief-swag-'+i,.7,.1,.1,i*1.8,13.4,-.25,'facade',.25).rotation.z=Math.PI;
  passages.push({id:'front-entry',centre:[0,2.12,0],clearWidth:2,visualIntent:'closed native leaves below fixed transom; no traversal',nativeLeaves:2});
  // Landing and visual stair envelope follow the plan without gameplay promises.
  box(root,'terrace',26.5,2.12,4.5,0,1.06,-2.25,'facade');groundContact.push({id:'terrace',polygon:rectangle(-13.25,13.25,-4.5,0),minY:0,maxY:2.12,intent:'raised terrace'});
  for(const s of [-1,1])rail(root,'terrace-rail-'+s,[s*7.4,-4.3],[s*13,-4.3],2.12,1.05);
  for(let i=0;i<10;i++){const h=(i+1)*2.12/10,d=(10-i)*.61;box(root,'front-step-'+i,14,h,d,0,h/2,-4.5-d/2,'facade');}
  for(const s of [-1,1])for(let i=0;i<10;i++){const h=(i+1)*2.12/10,d=(10-i)*.61;box(root,'front-cheek-'+s+'-'+i,1.9,h+.25,d,s*8.2,(h+.25)/2,-4.5-d/2);}
  groundContact.push({id:'front-stair',polygon:rectangle(-9.15,9.15,-10.6,-4.5),minY:0,maxY:2.37,intent:'visual steps / cheeks; traversal deferred'});
  for(const [label,s,angle] of [['east',1,0],['west',-1,Math.PI]]){
    const g=group(root,'porch-'+label,[s*23.5,0,13.5],angle,{evidence:'plate44 paired colonnades and clear stair axis; plate43 curved porch'}),r=8,neck=1.25;
    prism(g,'porch-'+label+'/base',porchOutline(r,neck),2.12,0,1.06,0,'facade');
    for(const [i,row] of ['outer','inner'].entries())for(const [j,[x,z]] of PORCH_COLUMNS[row].entries()){
      const id='porch-'+label+'/col-'+i+'-'+j;
      cylinder(g,id+'/base',.44,.48,.28,x,2.26,z);cylinder(g,id+'/shaft',.25,.32,5.1,x,4.95,z);cylinder(g,id+'/neck',.32,.3,.2,x,7.6,z);box(g,id+'/capital',.78,.37,.78,x,7.885,z);
      f.columns.push({id,centre:[s*(23.5+x),z*s+13.5],radius:.48,minY:2.12,maxY:8.07});
    }
    for(const [i,rr,y,h] of [[0,7.9,8.18,.36],[1,8.25,8.48,.24],[2,8.35,8.67,.14]])prism(g,'porch-'+label+'/cornice-'+i,porchOutline(rr,neck),h,0,y,0,'trim');
    prism(g,'porch-'+label+'/deck',porchOutline(r,neck),.12,0,8.78,0,'roof');
    prism(g,'porch-'+label+'/rail-base',annulus(r,.28,neck),.14,0,8.91,0);prism(g,'porch-'+label+'/rail-cap',annulus(r+.07,.31,neck),.16,0,9.72,0);
    for(const t of [-1,1]){box(g,'porch-'+label+'/neck-rail-base-'+t,neck,.14,.28,neck/2,8.91,t*(r-.14));box(g,'porch-'+label+'/neck-rail-cap-'+t,neck,.16,.31,neck/2,9.72,t*(r-.085));}
    const n=37;for(let i=0;i<=n;i++){const a=-Math.PI/2+Math.PI*i/n;f.lathe(g,'porch-'+label+'/baluster-'+i,f.balusterProfile,neck+(r-.15)*Math.cos(a),8.98,(r-.15)*Math.sin(a));}
    for(let i=0;i<=4;i++){const a=-Math.PI/2+Math.PI*i/4;box(g,'porch-'+label+'/pier-'+i,.52,.96,.52,neck+(r-.15)*Math.cos(a),9.32,(r-.15)*Math.sin(a));urn(g,'porch-'+label+'/urn-'+i,neck+(r-.15)*Math.cos(a),9.8,(r-.15)*Math.sin(a));}
    for(let i=0;i<10;i++){const h=(i+1)*.212,w=(10-i)*.25;box(g,'porch-'+label+'/step-'+i,w,h,3,9.25+w/2,h/2,0,'facade');}
    const polygon=porchOutline(r,neck).map(([x,z])=>[s*(23.5+x),13.5+s*z]);groundContact.push({id:'porch-'+label,polygon,minY:0,maxY:2.12,intent:'raised open colonnade; voids between columns above deck'});
    groundContact.push({id:'porch-'+label+'-stair',polygon:rectangle(s>0?32.75:-35.25,s>0?35.25:-32.75,12,15),minY:0,maxY:2.12,intent:'visual stairs; traversal deferred'});
    passages.push({id:'porch-'+label+'-arc',visualIntent:'open between declared columns above 2.12 m deck',columnIds:f.columns.filter(c=>c.id.startsWith('porch-'+label)).map(c=>c.id)});
  }
  // All roof pieces are custom metre geometry, with no stretching of kit tiles.
  const roofs=group(root,'roof-envelope',[0,0,0],0,{evidence:'front height/profile from plate44; roof plan and rear joins inferred'});roofGroups.push(roofs);
  hip(roofs,'roof/main-low-hip',47.5,27.5,.65,0,17.72,13.5);
  hip(roofs,'roof/rear-shoulder',27,4,.35,0,17.72,28.7);hip(roofs,'roof/rear-centre',15,2.1,.28,0,17.72,31.4);
  const clerestory=group(root,'clerestory',[0,0,8.5],0,{evidence:'plate44 elevation; depth inferred'});roofGroups.push(clerestory);
  const clereHoles=[-10,-5,0,5,10].map(x=>({x,y:19.42,w:1.3,h:1.35}));
  // This wall is already in root coordinates to keep the native UV/metre basis.
  const cf=face('clerestory/front',26.5,0,8.5,0,clereHoles,18.3,21.45);roofGroups.push(cf);
  [-10,-5,0,5,10].forEach((x,i)=>window(cf,'clerestory/window-'+i,x,19.42,1.3,1.35));
  for(const s of [-1,1])box(clerestory,'clerestory/side-'+s,.16,3.15,15.5,s*13.25,19.875,7.75,'facade');
  box(clerestory,'clerestory/rear',26.5,3.15,.16,0,19.875,15.5,'facade');
  box(clerestory,'clerestory/front-cornice',27.4,.3,.65,0,21.5,0);hip(clerestory,'roof/clerestory-hip',27.5,16.2,2.4,0,21.65,7.75);
  box(root,'roof/lower-front-curb',27.1,.3,.5,0,21.8,8.2);
  rail(root,'roof/lower-front-rail',[-13.3,8.2],[13.3,8.2],21.95,1.1);
  box(root,'roof/upper-terrace-curb',14.5,.75,6.4,0,23.525,16,'facade');
  box(root,'roof/upper-terrace',14.5,.22,6.4,0,23.91,16,'roof');
  rail(root,'roof/upper-front-rail',[-7.3,12.8],[7.3,12.8],23.8,1.1);
  rail(root,'roof/upper-rear-rail',[-7.3,19.2],[7.3,19.2],23.8,1.1);
  for(const s of [-1,1]){
    const id='tower-'+(s>0?'east':'west'),g=group(root,id,[s*9.7,0,13.5],0,{evidence:'plate44 height/front profile and plate43 cap form; rear depth inferred'});roofGroups.push(g);
    box(g,id+'/pedestal',6.4,1.1,6.4,0,22.85,0,'facade');
    for(const [side,angle] of [['front',0],['east',-Math.PI/2],['rear',Math.PI],['west',Math.PI/2]]){
      const a=group(g,id+'/'+side,[0,0,0],angle,{evidence:side==='rear'?'inferred':'plate44 / built plate43 visible motif'}),z=-2.7;
      box(a,id+'/'+side+'/base',5.4,2.6,.16,0,24.5,z,'facade');
      for(const t of [-1,1]){box(a,id+'/'+side+'/pier-'+t,1.35,5.4,.16,t*2.025,28.5,z,'facade');box(a,id+'/'+side+'/pilaster-'+t,.29,7.1,.26,t*2.45,27.3,z-.12);box(a,id+'/'+side+'/panel-'+t,.58,2.3,.07,t*2.02,27.6,z-.12,'trim');}
      box(a,id+'/'+side+'/lintel',5.4,.62,.2,0,30.89,z,'facade');
      box(a,id+'/'+side+'/dark-arch',2.7,4.55,.06,0,28.125,z+.06,'shadow');
      arch(a,id+'/'+side+'/arch-ring',1.35,.18,.27,0,29.1,z-.08);
      for(const t of [-1,1]){
        const points=[[t*1.35,0],[t*1.35,1.48],[0,1.48],[0,1.35]];for(let i=1;i<=20;i++){const a=Math.PI/2+i*Math.PI/2/20;points.push([t*-1.35*Math.cos(a),1.35*Math.sin(a)]);}profile(a,id+'/'+side+'/spandrel-'+t,points,.16,0,29.1,z,'facade');
      }
      const hood=box(a,id+'/'+side+'/awning',2.65,.06,1.0,0,28.5,z-.55,'awning');hood.rotation.x=-.4;
      for(let i=0;i<6;i++){const st=box(a,id+'/'+side+'/awning-stripe-'+i,.17,.065,1.01,-1.1+i*.43,28.5,z-.55);st.rotation.x=-.4;}
      box(a,id+'/'+side+'/cornice',5.85,.3,.68,0,31.2,z);
    }
    box(g,id+'/balcony-deck',7.25,.18,.95,0,23.15,-3.0);
    rail(g,id+'/front-balcony',[-3.5,-3.2],[3.5,-3.2],23.2,1.1);
    box(g,id+'/cap-eave',6.8,.24,6.8,0,31.47,0);hip(g,id+'/cap-hip',7.0,7.0,1.67,0,31.59,0);cylinder(g,id+'/terminal',.035,.11,.24,0,33.38,0,'trim',8);
  }
  root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),localBounds={min:bounds.min.toArray(),max:bounds.max.toArray()},overhangs=roofGroups.map(g=>{const b=new T.Box3().setFromObject(g);return{id:g.name,min:b.min.toArray(),max:b.max.toArray(),inference:g.userData.evidence};});
  const assembly=f.finalize(root);
  const metadata=freeze({assetId:NEW_YORK_ASSET_ID,version:1,units:'metres',groundAnchor:'centre of main front wall at ground; +X right, +Z rear, +Y up',nativeContract:{...S},authoredBodyOutline:BODY.map(p=>[...p]),porchProfile:{neckDepth:1.25,curveRadius:8,projection:9.25,diameter:16,outerColumns:14,innerColumns:8,layout:PORCH_COLUMNS,evidence:'Plate44 original plan; paired columns preserve the side-stair axis'},groundContact,porchColumns:f.columns,passages,upperEnvelope:overhangs,overhangBounds:{min:[localBounds.min[0],2.12,localBounds.min[2]],max:[...localBounds.max],meaning:'Conservative bounds of all above-deck geometry, including porch cornices, rails and urns; not gameplay collision.'},localBounds,appearanceSlots:[...APPEARANCE_SLOTS],physicalMaterial:{structure:'unassigned',finish:'unassigned',reason:'Monochrome plates establish appearance; combustion properties require later content evidence.'},sourceId:'TB009-R02',sourceBays,inferred:['Rear opening rhythm and service faces','Roof plan, depth, back joins and tower back faces','Exact colours; awning stripe colour','Fine sculpture simplified to repeated garlands, medallions, empty urns'],integration:'Exterior art only; simulation owns collisions, fire, traversal, collapse and placement.'});
  root.userData={assetId:NEW_YORK_ASSET_ID,metadata};root.rotation.y=-quarterTurns*Math.PI/2;root.position.fromArray(position);root.updateMatrixWorld(true);
  function setAppearance(next={}){
    if(closed)throw Error('Building is disposed');
    const names=new Set([...Object.keys(next.materials||{}),...Object.keys(next.textures||{})]);for(const s of names)if(!APPEARANCE_SLOTS.includes(s))throw Error('Unknown appearance slot '+s);
    const staged={};const before={materials:{...bindings.materials},textures:{...bindings.textures}};
    try{Object.assign(bindings.materials,next.materials);Object.assign(bindings.textures,next.textures);for(const s of names)staged[s]=material(s);}catch(error){bindings.materials=before.materials;bindings.textures=before.textures;for(const m of Object.values(staged)){m.dispose();ownedMaterials.delete(m);}throw error;}
    for(const [s,m] of Object.entries(staged)){const old=slots[s];slots[s]=m;for(const mesh of f.meshes)if(mesh.userData.appearanceSlot===s)mesh.material=m;old.dispose();ownedMaterials.delete(old);}
  }
  function diagnostics(){return {disposed:closed,meshes:f.meshes.length,triangles:f.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1),0),sourceParts:assembly.sourceParts,instanceBatches:assembly.instances.length,geometries:f.geometries.size,materials:ownedMaterials.size,ownedTextures:0,borrowedTextureCount:new Set([...ownedMaterials].flatMap(m=>m.map?[m.map]:[])).size,nativeWalls:assembly.nativeWalls,nativeDoors:assembly.nativeDoors,components:f.components.length,quarterTurns};}
  return {root,bounds:bounds.clone(),metadata,setAppearance,diagnostics,dispose(){if(closed)return;closed=true;root.removeFromParent();const groups=[];root.traverse(o=>{if(o.isGroup)groups.push(o);});for(const g of groups)g.clear();for(const m of assembly.instances)m.dispose();assembly.instances.length=0;for(const g of f.geometries.values())g.dispose();for(const m of ownedMaterials)m.dispose();f.geometries.clear();ownedMaterials.clear();f.meshes.length=0;f.components.length=0;}};
}
