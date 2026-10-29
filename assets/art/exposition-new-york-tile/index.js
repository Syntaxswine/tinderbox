import {NATIVE_CONTRACT as S} from '../exposition-new-york/native-contract.js';
import {createForms} from '../exposition-new-york/forms.js';
import {TILE_PLAN,levelY,floorCells} from './plan.js';
export {TILE_PLAN} from './plan.js';
export const NEW_YORK_ASSET_ID='exposition-new-york-1893-tile';
export const APPEARANCE_SLOTS=Object.freeze(['facade','trim','door','roof','glazing','shadow','awning']);
const DEFAULTS={facade:0xe7dcc0,trim:0xefe1bd,door:0x674b32,roof:0x8e9a84,glazing:0x456e70,shadow:0x5d6151,awning:0x747d55};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const halfDisc=r=>Array.from({length:41},(_,i)=>{const a=-Math.PI/2+i*Math.PI/40;return[r*Math.cos(a),r*Math.sin(a)];});
const porchOutline=r=>[[0,-r],...halfDisc(r).map(([x,z])=>[x+1,z]),[0,r]];
const annulus=(r,w)=>[...halfDisc(r).map(([x,z])=>[x+1,z]),...halfDisc(r-w).reverse().map(([x,z])=>[x+1,z])];
const PORCH_COLUMNS={"outer":[[2.15,7.25],[4.4,6.85],[5.3,6.45],[7.1,5.0],[7.75,4.3],[8.7,2.1],[8.95,1.1],[8.95,-1.1],[8.7,-2.1],[7.75,-4.3],[7.1,-5.0],[5.3,-6.45],[4.4,-6.85],[2.15,-7.25]],"inner":[[1.85,4.3],[3.65,3.85],[5.1,2.65],[6.05,0.95],[6.05,-0.95],[5.1,-2.65],[3.65,-3.85],[1.85,-4.3]]};

/** Separate whole-metre / native-level structural adaptation. No original geometry is resized. */
export function createNewYorkStateBuildingTile(T,{materials={},textures={},quarterTurns=0,position=[0,0,0]}={}){
  if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('quarterTurns must be 0..3');
  if(!Array.isArray(position)||position.length!==3||position.some(n=>!Number.isFinite(n)))throw Error('position must contain three finite metres');
  if(!Number.isInteger(position[0])||!Number.isInteger(position[2])||Math.abs(position[1]/S.floorSpacing-Math.round(position[1]/S.floorSpacing))>1e-8)throw Error('Tile placement requires integer X/Z metres and Y at a standard floor level');
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
  const f=createForms(T,slots),{box,cylinder,prism,profile,arch,hip,group,rail,urn}=f,structuralPieces=[],floorTiles=[],seamPieces=[],passages=[],floorMeshes=[],faceGroups=new Map();
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

  // Compile each logical cell independently. Apertures remove only intersected
  // parts of that 1 x 2 m envelope; .12 m void-level closures are perimeter strips.
  function wallCell(g,run,level,cell,bottom,height,closure=false){
    const x=-run.length/2+cell+.5,top=bottom+height,id=run.id+'/'+(closure?'seam-':'cell-')+level+'-'+cell;
    const holes=run.openings.filter(h=>x>h.x-h.width/2+1e-7&&x<h.x+h.width/2-1e-7&&h.bottom<top&&h.bottom+h.height>bottom);
    const ys=[bottom,top,...holes.flatMap(h=>[Math.max(bottom,h.bottom),Math.min(top,h.bottom+h.height)])].sort((a,b)=>a-b);
    const unique=[...new Set(ys.map(y=>Math.round(y*1e6)/1e6))];
    for(let j=1;j<unique.length;j++){
      const a=unique[j-1],b=unique[j],mid=(a+b)/2;if(b-a<1e-7||holes.some(h=>mid>h.bottom-1e-7&&mid<h.bottom+h.height+1e-7))continue;
      const piece=id+'/'+j,full=!closure&&Math.abs(b-a-S.wallHeight)<1e-7;
      box(g,piece,1,b-a,S.wallThickness,x,mid,0,'facade',{form:full?'native-wall':closure?'level-closure':'aperture-cut',cellId:run.id+'/cell-'+level+'-'+cell,runId:run.id,level,cell,role:closure?'perimeter-closure':'structural-wall'});
      (closure?seamPieces:structuralPieces).push({id:piece,runId:run.id,cell,level,localX:x,bottom:a,height:b-a,width:1,depth:S.wallThickness,apertureCut:!full&&!closure});
    }
  }
  for(const run of TILE_PLAN.runs){
    const g=group(root,run.id,[(run.a[0]+run.b[0])/2,0,(run.a[1]+run.b[1])/2],run.heading,{role:'structural-wall-run'});faceGroups.set(run.id,g);
    for(let level=run.startLevel;level<run.endLevel;level++)for(let cell=0;cell<run.length;cell++){
      wallCell(g,run,level,cell,levelY(level),S.wallHeight);
      wallCell(g,run,level,cell,levelY(level)+S.wallHeight,S.slab,true);
    }
    for(const h of run.openings){
      if(h.kind==='window')window(g,h.id,h.x,h.bottom,h.width,h.height,h);
      else if(h.kind==='door'){
        for(const s of [-1,1])box(g,h.id+'/leaf-'+s,S.doorWidth,S.doorHeight,S.doorThickness,s*.5,h.bottom+S.doorHeight/2,-.03,'door',{form:'native-door'});
        const low=h.bottom+S.doorHeight+.02,high=h.bottom+h.height;
        box(g,h.id+'/fixed-transom',2,high-low,.07,0,(low+high)/2,.01,'glazing');
        for(const s of [-1,1])box(g,h.id+'/jamb-'+s,.16,h.height,.26,s*1.08,h.bottom+h.height/2,-.12);
        for(const y of [h.bottom+S.doorHeight,high])box(g,h.id+'/header-'+y,2.3,.14,.26,0,y,-.14);
        box(g,h.id+'/transom-mullion',.09,high-low,.18,0,(low+high)/2,-.11);
        passages.push({id:h.id,runId:run.id,level:1,width:2,state:'closed',nativeLeaves:2,intent:'visual only; no traversal adapter'});
      }else{
        box(g,h.id+'/shadow',2,h.height,.04,0,h.bottom+h.height/2,.04,'shadow');
        const spring=h.bottom+h.height-1;
        arch(g,h.id+'/arch',1,.2,.28,0,spring,-.14);
        // Fill the rectangular opening above the rounded arch with custom spandrels.
        for(const s of [-1,1]){
          const points=[[0,1],[s*1,1],[s*1,0]];
          for(let i=1;i<=20;i++){const a=i*Math.PI/40;points.push([s*Math.cos(a),Math.sin(a)]);}
          profile(g,h.id+'/spandrel-'+s,points,.16,0,spring,0,'facade');
        }
        const awning=box(g,h.id+'/awning',2.2,.06,.9,0,spring-.35,-.54,'awning');awning.rotation.x=-.3;
        for(let j=0;j<5;j++){const st=box(g,h.id+'/stripe-'+j,.16,.065,.91,-.9+j*.45,spring-.35,-.54);st.rotation.x=-.3;}
        for(const s of [-1,1])box(g,h.id+'/pilaster-'+s,.27,h.height+.4,.3,s*2.65,h.bottom+h.height/2,-.12);
      }
    }
  }
  // Every horizontal occupied floor/deck has a .12 m slab ending at n * 2.12 m.
  for(const floor of TILE_PLAN.floors){
    const top=levelY(floor.level),slot=floor.id.includes('roof')?'roof':'facade';
    if(floor.form==='tiles')for(const [x,z] of floorCells(floor)){
      const id=floor.id+'/tile-'+x+'-'+z;
      box(root,id,1,S.slab,1,x+.5,top-S.slab/2,z+.5,slot,{form:'native-slab',floorId:floor.id,level:floor.level,role:'floor'});
      floorTiles.push({id,floorId:floor.id,level:floor.level,x,z});
    }else{
      prism(root,floor.id,floor.polygon,S.slab,0,top-S.slab/2,0,slot).userData={componentId:floor.id,appearanceSlot:slot,form:'custom-porch-slab',role:'floor',floorId:floor.id,level:floor.level};
    }
    floorMeshes.push({id:floor.id,level:floor.level,top,thickness:S.slab,form:floor.form,tileCount:floorCells(floor).length});
  }
  // Horizontal bands and rails follow the new metre outline, not a scaled mesh.
  const poly=TILE_PLAN.bodyOutline;
  function offsetVertex(i,distance){const n=poly.length,p=poly[i%n],a=poly[(i+n-1)%n],b=poly[(i+1)%n],l=Math.hypot(p[0]-a[0],p[1]-a[1]),r=Math.hypot(b[0]-p[0],b[1]-p[1]),u=[(p[1]-a[1])/l,-(p[0]-a[0])/l],v=[(b[1]-p[1])/r,-(b[0]-p[0])/r],den=1+u[0]*v[0]+u[1]*v[1];return[p[0]+distance*(u[0]+v[0])/den,p[1]+distance*(u[1]+v[1])/den];}
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(const [j,y,h,d] of [[0,levelY(1)-.06,.12,.38],[1,levelY(4)-.25,.2,.36],[2,levelY(4),.3,.5],[3,levelY(4)+.24,.18,.64],[4,levelY(7)-.15,.16,.3],[5,levelY(8)-.4,.2,.4],[6,levelY(8)-.18,.25,.65],[7,levelY(8),.18,1.02]]){
      prism(root,'edge-'+i+'/cornice-'+j,[offsetVertex(i,d/2),offsetVertex(i+1,d/2),offsetVertex(i+1,-d/2),offsetVertex(i,-d/2)],h,0,y,0,'trim').userData.form='mitered-cornice';
    }
    rail(root,'main-parapet-'+i,a,b,levelY(8)+.3,1.1);
    const g=group(root,'edge-'+i,[(a[0]+b[0])/2,0,(a[1]+b[1])/2],-Math.atan2(b[1]-a[1],b[0]-a[0]));
    const n=Math.floor(len/.8);for(let j=0;j<n;j++)box(g,'edge-'+i+'/dentil-'+j,.19,.25,.26,-len/2+(j+.5)*len/n,levelY(8)-.37,-.33);
  }
  for(const x of [-24,-21,-15,-10,-5,0,5,10,15,21,24])urn(root,'parapet-urn-'+x,x,levelY(8)+1.4,0);
  for(const s of [-1,1])for(const z of [5,10,18,23,28])urn(root,'side-urn-'+s+'-'+z,s*24,levelY(8)+1.4,z);
  const front=faceGroups.get('main/0');
  for(const x of [-18,18])for(const bottom of [levelY(1)+.8,levelY(4)+.8]){
    const id='niche-'+x+'-'+bottom;
    box(front,id+'/recess',1.35,2.7,.04,x,bottom+1.35,-.11,'shadow');arch(front,id+'/arch',.66,.14,.19,x,bottom+2.04,-.16);
    for(const s of [-1,1])box(front,id+'/jamb-'+s,.14,2.1,.2,x+s*.73,bottom+1,-.16);
    box(front,id+'/base',1.7,.2,.35,x,bottom,-.17);
  }
  for(const s of [-1,1]){
    cylinder(front,'entry/column-'+s,.25,.32,4.75,s*1.8,levelY(1)+2.6,-.44);
    box(front,'entry/column-base-'+s,.76,.45,.76,s*1.8,levelY(1)+.225,-.44);
    box(front,'entry/column-capital-'+s,.81,.3,.81,s*1.8,levelY(1)+5.05,-.44);
    const m=cylinder(front,'entry/medallion-'+s,.85,.85,.12,s*5,levelY(4)+2,-.16);m.rotation.x=Math.PI/2;
    const field=cylinder(front,'entry/medallion-field-'+s,.65,.65,.14,s*5,levelY(4)+2,-.24,'facade');field.rotation.x=Math.PI/2;
    const head=cylinder(front,'entry/cameo-head-'+s,.17,.17,.1,s*5,levelY(4)+2.22,-.35);head.rotation.x=Math.PI/2;
    profile(front,'entry/cameo-bust-'+s,[[-.38,0],[.38,0],[.23,.24],[-.2,.24]],.1,s*5,levelY(4)+1.67,-.35);
  }
  box(front,'entry/entablature',5.3,.4,1.1,0,levelY(1)+5.45,-.35);
  arch(front,'entry/upper-relief',2.5,.32,.22,0,levelY(4)+.75,-.16);
  box(front,'entry/relief-band',14,.85,.16,0,levelY(7)-1.25,-.13);
  for(let i=-3;i<=3;i++)arch(front,'entry/relief-swag-'+i,.7,.1,.1,i*1.8,levelY(7)-1.0,-.25,'facade',.25).rotation.z=Math.PI;
  const fx=[-21,-15,-10,-5,0,5,10,15,21];for(let i=0;i<8;i++){const x=(fx[i]+fx[i+1])/2,w=fx[i+1]-fx[i]-2.4;arch(front,'frieze-swag-'+i,w/2,.09,.1,x,levelY(7)+1.1,-.12,'trim',.3).rotation.z=Math.PI;}
  // Front landing is tiled above; its fascia and stair treads are custom attachments.
  box(root,'landing/fascia',26,2,4,0,1,-2,'facade');
  for(const s of [-1,1])rail(root,'landing/rail-'+s,[s*7.4,-3.8],[s*12.8,-3.8],levelY(1),1.05);
  for(let i=0;i<12;i++){
    const h=(i+1)*levelY(1)/12,d=(12-i)*.5;
    box(root,'front-stair/tread-'+i,14,h,d,0,h/2,-4-d/2,'facade',{role:'stair-tread'});
    for(const s of [-1,1])box(root,'front-stair/cheek-'+s+'-'+i,1.6,h+.22,d,s*8,(h+.22)/2,-4-d/2,'trim',{role:'stair-trim'});
  }
  for(const [label,s,angle] of [['east',1,0],['west',-1,Math.PI]]){
    const g=group(root,'porch-'+label,[s*24,0,14],angle,{role:'custom-portico',exception:'Curved columns and ornamental fascia; deck levels are standard.'}),base=levelY(1),deck=levelY(4);
    prism(g,'porch-'+label+'/plinth',porchOutline(8),2,0,1,0,'facade');
    for(const [i,row] of ['outer','inner'].entries())for(const [j,[oldX,z]] of PORCH_COLUMNS[row].entries()){
      const x=oldX-.25,id='porch-'+label+'/column-'+i+'-'+j;
      cylinder(g,id+'/base',.44,.48,.28,x,base+.14,z);
      const shaftLow=base+.28,shaftHigh=deck-.96;
      cylinder(g,id+'/shaft',.25,.32,shaftHigh-shaftLow,x,(shaftLow+shaftHigh)/2,z);
      cylinder(g,id+'/neck',.32,.3,.2,x,deck-.86,z);box(g,id+'/capital',.78,.36,.78,x,deck-.58,z);
      f.columns.push({id,centre:[s*(24+x),14+s*z],radius:.48,minY:base,maxY:deck-.4});
    }
    for(const [i,r,y,h] of [[0,7.9,deck-.42,.36],[1,8.25,deck-.18,.24]])prism(g,'porch-'+label+'/cornice-'+i,porchOutline(r),h,0,y,0);
    prism(g,'porch-'+label+'/rail-base',annulus(8,.28),.14,0,deck+.07,0);prism(g,'porch-'+label+'/rail-cap',annulus(8.07,.31),.16,0,deck+.96,0);
    for(const t of [-1,1]){box(g,'porch-'+label+'/neck-rail-base-'+t,1,.14,.28,.5,deck+.07,t*7.86);box(g,'porch-'+label+'/neck-rail-cap-'+t,1,.16,.31,.5,deck+.96,t*7.985);}
    for(let i=0;i<=37;i++){const a=-Math.PI/2+Math.PI*i/37;f.lathe(g,'porch-'+label+'/baluster-'+i,f.balusterProfile,1+7.85*Math.cos(a),deck+.14,7.85*Math.sin(a));}
    for(let i=0;i<=4;i++){const a=-Math.PI/2+Math.PI*i/4,x=1+7.85*Math.cos(a),z=7.85*Math.sin(a);box(g,'porch-'+label+'/pier-'+i,.52,1.04,.52,x,deck+.52,z);urn(g,'porch-'+label+'/urn-'+i,x,deck+1.04,z);}
    for(let i=0;i<12;i++){const h=(i+1)*base/12,w=(12-i)/6;box(g,'porch-'+label+'/stair-'+i,w,h,4,9+w/2,h/2,0,'facade',{role:'stair-tread'});}
  }
  // Roof pitches are custom forms, sitting on grid-aligned roof slabs.
  for(const [id,w,d,x,z] of [['west-wing',10.4,28.4,-19,14],['east-wing',10.4,28.4,19,14],['front-centre',28.4,8.4,0,4],['back-centre',28.4,4.4,0,26],['rear-shoulder',28.4,4.4,0,30],['rear-tail',16.4,2.4,0,33]])hip(root,'roof/'+id,w,d,.65,x,levelY(8),z);
  box(root,'clerestory/cornice',28.8,.25,.7,0,levelY(10),8);
  hip(root,'roof/clerestory',28.6,16.6,S.floorSpacing,0,levelY(10),16);
  rail(root,'clerestory/front-rail',[-14,8],[14,8],levelY(10)+.12,1.1);
  // The upper terrace is a real standard slab, supported above the pitched roof.
  for(const s of [-1,1])for(const z of [13,19])box(root,'upper-terrace/support-'+s+'-'+z,.4,2,.4,s*6.7,levelY(10)+1,z,'facade');
  for(const [id,a,b] of [['front',[-7,13],[7,13]],['rear',[-7,19],[7,19]],['east',[7,13],[7,19]],['west',[-7,13],[-7,19]]])rail(root,'upper-terrace/rail-'+id,a,b,levelY(11),1.1);
  for(const s of [-1,1]){
    const id='tower-'+(s<0?'west':'east');
    for(let i=0;i<4;i++){
      const run=TILE_PLAN.runs.find(r=>r.id===id+'/'+i),g=faceGroups.get(run.id);
      box(g,id+'/cornice-'+i,6.7,.3,.7,0,levelY(15)-.12,0);
      for(const t of [-1,1])box(g,id+'/lower-panel-'+i+'-'+t,.6,2.2,.06,t*2,levelY(11)+1.1,-.12);
    }
    box(root,id+'/cap-eave',6.8,.18,6.8,s*10,levelY(15)+.09,16);
    hip(root,id+'/cap-hip',7,7,S.floorSpacing,s*10,levelY(15)+.18,16);
    cylinder(root,id+'/terminal',.035,.11,.24,s*10,levelY(16)+.3,16);
    rail(root,id+'/balcony-front',[s*10-3,12],[s*10+3,12],levelY(11),1.1);
    for(const t of [-1,1])rail(root,id+'/balcony-side-'+t,[s*10+t*3,12],[s*10+t*3,13],levelY(11),1.1);
  }
  root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),localBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  const assembly=f.finalize(root);
  const metadata=freeze({assetId:NEW_YORK_ASSET_ID,version:1,units:'metres',groundAnchor:'centre of front wall at ground; +X right, +Z rear, +Y up',nativeContract:{...S},
    preservedOriginal:{assetId:'exposition-new-york-1893',commit:'5e8d64b8b41637637d57ed762eb5157e5d521b4f',changed:false},tilePlan:TILE_PLAN,
    structuralPieces,seamPieces,floorTiles,floors:floorMeshes,porchColumns:f.columns,passages,localBounds,appearanceSlots:[...APPEARANCE_SLOTS],
    sourceId:'TB009-R02',historicalStatus:'Deliberate tile adaptation of plate44, not an exact historical reconstruction.',
    physicalMaterial:{structure:'unassigned',finish:'unassigned'},
    integration:TILE_PLAN.integration,interiors:'Unpartitioned floor/deck slabs only; historical room layout and stair traversal are not implemented.'});
  root.userData={assetId:NEW_YORK_ASSET_ID,metadata};root.rotation.y=-quarterTurns*Math.PI/2;root.position.fromArray(position);root.updateMatrixWorld(true);
  function setAppearance(next={}){
    if(closed)throw Error('Building is disposed');
    const names=new Set([...Object.keys(next.materials||{}),...Object.keys(next.textures||{})]);for(const s of names)if(!APPEARANCE_SLOTS.includes(s))throw Error('Unknown appearance slot '+s);
    const staged={};const before={materials:{...bindings.materials},textures:{...bindings.textures}};
    try{Object.assign(bindings.materials,next.materials);Object.assign(bindings.textures,next.textures);for(const s of names)staged[s]=material(s);}catch(error){bindings.materials=before.materials;bindings.textures=before.textures;for(const m of Object.values(staged)){m.dispose();ownedMaterials.delete(m);}throw error;}
    for(const [s,m] of Object.entries(staged)){const old=slots[s];slots[s]=m;for(const mesh of f.meshes)if(mesh.userData.appearanceSlot===s)mesh.material=m;old.dispose();ownedMaterials.delete(old);}
  }
  function diagnostics(){return {disposed:closed,meshes:f.meshes.length,triangles:f.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1),0),sourceParts:assembly.sourceParts,instanceBatches:assembly.instances.length,geometries:f.geometries.size,materials:ownedMaterials.size,ownedTextures:0,borrowedTextureCount:new Set([...ownedMaterials].flatMap(m=>m.map?[m.map]:[])).size,nativeWalls:assembly.nativeWalls,nativeDoors:assembly.nativeDoors,components:f.components.length,floorTiles:floorTiles.length,wallPieces:structuralPieces.length,levelClosures:seamPieces.length,quarterTurns};}
  return {root,bounds:bounds.clone(),metadata,setAppearance,diagnostics,dispose(){if(closed)return;closed=true;root.removeFromParent();const groups=[];root.traverse(o=>{if(o.isGroup)groups.push(o);});for(const g of groups)g.clear();for(const m of assembly.instances)m.dispose();assembly.instances.length=0;for(const g of f.geometries.values())g.dispose();for(const m of ownedMaterials)m.dispose();f.geometries.clear();ownedMaterials.clear();f.meshes.length=0;f.components.length=0;}};
}
