import {BELL_AND_ALDER} from '../../../src/content/bell-and-alder-layout.js';
import {sculptCityProp} from '../../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/three.js';
import {Sculpt} from '../../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/sculpt.js';
import {compileWindowBay} from '../../../src/art/nautilus-windows.js';

const ART='../../assets/art/',CITY='../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/assets/city-props/';
export function createClosingAssembly(T,{layout}){
 const root=new T.Group(),owned=new Set(),materials=new Map(),objects=[],openings=[],items=[],lights=[];
 root.name='Bell and Alder closing v1 / native measured source';
 const mat=(name,color,texture=null,roughness=.9,metalness=0)=>{if(!materials.has(name)){const m=new T.MeshStandardMaterial({name,color,roughness,metalness,side:T.DoubleSide});m.userData.export={id:name,name,color,texture,roughness,metalness,repeat:1};materials.set(name,m);}return materials.get(name);};
 const oak=mat('Oak boards',0xffffff,ART+'gross-housing-v1/floorboards-oak-v1.png');
 const siding=mat('Ivory clapboard',0xe2c5a0,ART+'gross-housing-v1/clapboard-ivory-v1.png');
 const plaster=mat('Native shop plaster',0xd7c4a7,'../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/ground-concrete.png');
 const brick=mat('Sienna brick',0xc2a18a,ART+'exposition-skins-v1/brick-sienna-v1.png');
 const roof=mat('Roof covering',0xb4a38c,ART+'gross-housing-v1/cedar-shingles-v1.png');
 const wood=mat('Warm timber',0x7b6043,ART+'gross-housing-v1/floorboards-oak-v1.png');
 const stone=mat('Paved stone',0x706454,'../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/ground-concrete.png');
 const iron=mat('Iron',0x343938,null,.72,.18),glass=mat('Soda glass',0x8fa99d,null,.28),trim=mat('Ivory trim',0xdbc8a4,null,.88),brass=mat('Brass',0x9b8054,null,.6,.25);
 const cityPaint=mat('Nautilus city paint',0xffffff,CITY+'painted-city-materials-v1.png',.75),cityTrim=mat('Nautilus city trim',0xffffff,null,.77),cityGlass=mat('Nautilus store glass',0x9db8b4,null,.25),cityFlame=mat('Nautilus lamp flame',0xffc166,null,.9);
 const physical={oak:'timber',siding:'timber',plaster:'masonry',brick:'masonry',roof:'timber',wood:'timber',stone:'stone',iron:'iron',glass:'glass',trim:'timber',brass:'iron'};
 const top=(x,z,w,d,y)=>[[[x,y,z],[x,y,z+d],[x+w,y,z+d]],[[x,y,z],[x+w,y,z+d],[x+w,y,z]]];
 const plane=(a,b,y0,y1)=>[[[a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]]],[[a[0],y0,a[1]],[b[0],y1,b[1]],[a[0],y1,a[1]]]];
 function mesh(id,g,m,meta,position=[0,0,0],yaw=0){
  owned.add(g);const o=new T.Mesh(g,m);o.name=id;o.position.fromArray(position);o.rotation.y=yaw;o.castShadow=o.receiveShadow=true;o.userData.export={id,...meta};root.add(o);objects.push(o);return o;
 }
 function box(id,c,size,m,meta){
  const g=new T.BoxGeometry(...size),p=g.attributes.position,n=g.attributes.normal,uv=[];
  for(let i=0;i<p.count;i++)uv.push(Math.abs(n.getY(i))>.55?p.getX(i):Math.abs(n.getX(i))>.55?p.getZ(i):p.getX(i),Math.abs(n.getY(i))>.55?p.getZ(i):p.getY(i));
  g.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));return mesh(id,g,m,meta,c);
 }
 function slab(id,x,z,w,d,y,level,m=oak,extra={}){
  return box(id,[x+w/2,y-.06,z+d/2],[w,.12,d],m,{kind:'floor',level,material:m===stone?'stone':'timber',fuelClass:m===stone?null:'frame',fuelAmount:m===stone?0:w*d,thickness:.12,triangles:top(x,z,w,d,y),normal:[0,1,0],...extra});
 }
 function wall(id,a,b,y,level,m=plaster,extra={}){
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),g=new T.BoxGeometry(length,2,.16),p=g.attributes.position;
  g.setAttribute('grossUV',new T.Float32BufferAttribute(Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i)]).flat(),2));
  return mesh(id,g,m,{kind:'wall',level,material:m===plaster||m===brick?'masonry':'timber',fuelClass:m===plaster||m===brick?null:'clapboard',fuelAmount:m===plaster||m===brick?0:length*2,thickness:.16,triangles:plane(a,b,y,y+2),normal:[-dz/length,0,dx/length],...extra},[(a[0]+b[0])/2,y+1,(a[1]+b[1])/2],-Math.atan2(dz,dx));
 }
 // Ground is split around the shop; the foundation below the wooden floor stays inert.
 for(const [id,x,z,w,d]of [['west',-4,-2,4,20],['east',8,-2,5,20],['rear',0,-2,8,2],['front',0,8,8,10]])slab('pavement/'+id,x,z,w,d,0,0,stone,{kind:'ground'});
 slab('foundation/lot',0,0,8,8,-.12,0,stone,{kind:'plinth'});
 for(const l of [0,1])for(let x=0;x<8;x++)for(let z=0;z<8;z++)slab('floor/l'+l+'/'+x+','+z,x,z,1,1,l*2.12,l);
 for(const w of BELL_AND_ALDER.modules){
  const x=w.x-36,z=w.y-9,h=w.heading||0,a=[x-.5*Math.cos(h),z-.5*Math.sin(h)],b=[x+.5*Math.cos(h),z+.5*Math.sin(h)];
  wall(w.id,a,b,0,0);
 }
 // New lodging walls. Front three two-metre bays retain the original Nautilus window forms.
 for(let i=0;i<8;i++){wall('upper/rear/'+i,[i,0],[i+1,0],2.12,1,siding);wall('upper/west/'+i,[0,i],[0,i+1],2.12,1,siding);}
 for(let i=0;i<8;i++)if(i<2||i>=4)wall('upper/east/'+i,[8,i],[8,i+1],2.12,1,siding);
 for(const x of [0,7])wall('upper/front/'+x,[x,8],[x+1,8],2.12,1,siding);
 function nativeWindow(id,c,yaw=0){
  const glassBindings=[];
  const spec=compileWindowBay('window-bay-period');
  for(const [i,p]of spec.parts.entries()){
   const v=new T.Vector3(...p.center).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(new T.Vector3(...c)),isGlass=p.material==='glass',m={wall:siding,trim,sash:trim,brass,glass}[p.material]||trim;
   const o=box(id+'/'+i,v.toArray(),p.size,m,{kind:'attachment',level:1,material:isGlass?'glass':p.material==='brass'?'iron':'timber',fuelClass:isGlass||p.material==='brass'?null:'frame',fuelAmount:isGlass||p.material==='brass'?0:Math.max(.002,p.size.reduce((a,v)=>a*v,1)*8),physicalShape:'source-closed-mesh',thickness:0,windowBayId:id,group:p.group});
   o.rotation.y=yaw;
   if(isGlass){o.name+=' glass';o.userData.export.id=o.name;o.userData.export.appearanceOnly=true;glassBindings.push(o.name);}
  }
  const sid=id+'/aperture',a=[c[0]-.5,c[2]],b=[c[0]+.5,c[2]];
  const o=box(sid,[c[0],c[1]+.95,c[2]],[.92,1.12,.012],glass,{kind:'window',level:1,material:'glass',fuelClass:null,fuelAmount:0,thickness:.012,triangles:plane(a,b,c[1]+.35,c[1]+1.55),normal:[0,0,1],openingId:id,physicalOnly:true});
  o.rotation.y=yaw;o.visible=false;openings.push({id,surfaceId:sid,kind:'window',level:1,pivot:c,initialOpenFraction:0,sourceMeshBindings:glassBindings});
 }
 for(const x of [2,4,6])nativeWindow('upper-front-'+x,[x,2.12,8]);
 for(let i=0;i<8;i++)if(i<3||i>=5)wall('upper/partition/'+i,[i,4],[i+1,4],2.12,1,siding);
 // Flat roof slabs and a modest repeated cornice.
 for(let x=0;x<8;x++)for(let z=0;z<8;z++)box('roof/'+x+','+z,[x+.5,4.18,z+.5],[1,.12,1],roof,{kind:'roof',level:1,material:'timber',fuelClass:'roof',fuelAmount:1,thickness:.12,triangles:top(x,z,1,1,4.18),normal:[0,1,0]});
 for(let i=0;i<8;i++)box('upper/cornice/'+i,[i+.5,4.22,8.07],[1,.16,.24],wood,{kind:'attachment',level:1,material:'timber',fuelClass:'frame',fuelAmount:.15,thickness:0,physicalShape:'source-closed-mesh'});
 // Stair top contacts and a real level landing; iron rails preserve wide native actor clearance.
 const stair=layout.stair,stairFootZ=stair.bounds.max[2],stairTopZ=stair.bounds.min[2];
 for(let x=9;x<11;x++)slab('stair/base/'+x+','+stairFootZ,x,stairFootZ,1,1,0,0,wood,{supportType:'porch-deck'});
 for(let i=0;i<12;i++){
  const y=(i+1)*stair.rise/stair.treads,z=stairFootZ-(i+1)*stair.going;
  slab('stair/tread-'+String(i+1).padStart(2,'0'),9,z,2,stair.going,y,1,wood,{supportType:'stair-tread'});
  for(const x of [9.03,10.97])box('stair/rail-post/'+i+'/'+x,[x,y+.48,z+stair.going/2],[.035,.96,.035],iron,{kind:'attachment',level:1,material:'iron',fuelClass:null,fuelAmount:0,thickness:0,physicalShape:'source-closed-mesh'});
 }
 for(let x=8;x<11;x++)for(let z=2;z<4;z++)slab('landing/'+x+','+z,x,z,1,1,2.12,1,wood,{supportType:'porch-deck'});
 for(const x of [8.15,10.85])for(const z of [2.15,3.85])box('landing/post/'+x+','+z,[x,1,z],[.16,2,.16],wood,{kind:'attachment',level:0,material:'timber',fuelClass:'frame',fuelAmount:.3,thickness:0,physicalShape:'source-closed-mesh'});
 function slopedBeam(id,x,z0,z1,y0,y1,m=wood){
  const direction=new T.Vector3(0,y1-y0,z1-z0),g=new T.BoxGeometry(m===iron?.04:.12,m===iron?.045:.20,direction.length()),o=mesh(id,g,m,{kind:'attachment',level:1,material:m===iron?'iron':'timber',fuelClass:m===iron?null:'frame',fuelAmount:m===iron?0:.6,thickness:0,physicalShape:'source-closed-mesh'},[x,(y0+y1)/2,(z0+z1)/2]);o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction.normalize());
 }
 for(const x of [9.10,10.90])slopedBeam('stair/stringer/'+x,x,stairFootZ,stairTopZ,0,stair.rise);
 for(const x of [9.03,10.97])slopedBeam('stair/handrail/'+x,x,stairFootZ,stairTopZ,.98,stair.rise+.98,iron);
 for(const z of [2,4,6])for(let x=0;x<8;x++)box('ceiling/beam/'+z+'/'+x,[x+.5,1.90,z],[1,.20,.16],wood,{kind:'attachment',level:0,material:'timber',fuelClass:'frame',fuelAmount:.25,thickness:0,physicalShape:'source-closed-mesh'});
 // Native one-metre door leaves; glass and wood retain separate physical meaning.
 function door(id,centre,yaw,level,pivotSide){
  const y=level*2.12+.06,base=new T.Vector3(centre[0],y,centre[1]),rot=v=>new T.Vector3(...v).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(base).toArray(),normal=[Math.sin(yaw),0,Math.cos(yaw)];
  const strips=[['apron',[0,.265,0],[.844,.53,.10]],['left',[-.461,.825,0],[.078,1.65,.12]],['right',[.461,.825,0],[.078,1.65,.12]],['top',[0,1.609,0],[.844,.082,.12]],['rail',[0,.489,0],[.844,.082,.12]],['mullion',[0,1.049,0],[.027,1.038,.088]],['glass', [0,1.049,0],[.815,1.038,.012]]];
  const pivot=rot([pivotSide*.5,0,0]);
  for(const [suffix,c,size]of strips){
   const sid=id+'/'+suffix,isGlass=suffix==='glass',m=isGlass?glass:wood;
   const o=box(sid,rot(c),size,m,{kind:'door',level,material:isGlass?'glass':'timber',fuelClass:isGlass?null:'door',fuelAmount:isGlass?0:size[0]*size[1],thickness:size[2],normal,openingId:id+'/'+suffix});o.rotation.y=yaw;
   if(!isGlass){const sculpt=new Sculpt(T,'map');sculpt.box([0,0,0],size,'sage',{shade:.55});const g=sculpt.geometry().get('paint');owned.add(g);o.geometry=g;o.material=cityPaint;}
   const a=rot([c[0]-size[0]/2,c[1]-size[1]/2,0]),b=rot([c[0]+size[0]/2,c[1]-size[1]/2,0]),up=[0,size[1],0];
   o.userData.export.triangles=[[a,b,b.map((v,i)=>v+up[i])],[a,b.map((v,i)=>v+up[i]),a.map((v,i)=>v+up[i])]];
   openings.push({id:id+'/'+suffix,surfaceId:sid,kind:'door',level,pivot,maxOpenAngle:pivotSide<0?-Math.PI/2:Math.PI/2,initialOpenFraction:0,sourceMeshBindings:[sid]});
   if(suffix==='apron')for(const side of [-1,1]){
    const sculpt=new Sculpt(T,'map');sculpt.face([0,0,side*.0505],[.794,.366],'panel-green',{rotation:[0,side===1?0:Math.PI,0]});
    const panel=mesh(sid+'/paint/'+side,sculpt.geometry().get('trim'),cityTrim,{kind:'appearance',level,appearanceOnly:true,hostSurfaceId:sid},rot([0,.265,0]),yaw);
    openings.at(-1).sourceMeshBindings.push(panel.name);
   }
  }
 }
 door('entry-left',[3.5,8],0,0,-1);door('entry-right',[4.5,8],0,0,1);
 door('service-left',[8,2.5],Math.PI/2,1,1);door('service-right',[8,3.5],Math.PI/2,1,-1);
 for(const [id,c,yaw,l]of [['entry-head-left',[3.5,8],0,0],['entry-head-right',[4.5,8],0,0],['service-head-left',[8,2.5],Math.PI/2,1],['service-head-right',[8,3.5],Math.PI/2,1]]){
  const y=l*2.12+1.71,rot=v=>new T.Vector3(...v).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(new T.Vector3(c[0],y,c[1])).toArray(),normal=[Math.sin(yaw),0,Math.cos(yaw)];
  for(const [suffix,centre,size]of [['top',[0,.2675,0],[1,.045,.16]],['bottom',[0,.0225,0],[1,.045,.16]],['left',[-.48,.145,0],[.04,.20,.16]],['right',[.48,.145,0],[.04,.20,.16]],['glass',[0,.145,0],[.92,.20,.012]]]){
   const sid=id+'/'+suffix,isGlass=suffix==='glass',o=box(sid,rot(centre),size,isGlass?glass:wood,{kind:isGlass?'window':'attachment',level:l,material:isGlass?'glass':'timber',fuelClass:isGlass?null:'frame',fuelAmount:isGlass?0:.025,physicalShape:isGlass?undefined:'source-closed-mesh',thickness:isGlass?.012:0,normal});o.rotation.y=yaw;
   if(isGlass){const a=rot([-.46,.045,0]),b=rot([.46,.045,0]);o.userData.export.triangles=[[a,b,b.map((v,i)=>v+(i===1?.20:0))],[a,b.map((v,i)=>v+(i===1?.20:0)),a.map((v,i)=>v+(i===1?.20:0))]];openings.push({id,surfaceId:sid,kind:'window',level:l,pivot:rot([0,0,0]),initialOpenFraction:0,sourceMeshBindings:[sid]});}
  }
 }
 // Installed shop and Eastlake assets, with physical materials separated by their original paint swatch.
 const cache=new Map();
 function cityClass(finish,uv){
  if(['glass','store-glass','amber','mirror'].includes(finish))return 'glass';if(finish==='flame')return 'iron';if(finish==='trim')return 'timber';
  const cell=Math.min(15,Math.floor(uv[0]*4)+4*Math.floor((1-uv[1])*4));
  return [4,5,6,10,12,13,15].includes(cell)?'cloth':[8,9].includes(cell)?'iron':[7,14].includes(cell)?'stone':cell===11?'glass':'timber';
 }
 function city(id,assetId,position,yaw=0,level=0){
  if(!cache.has(assetId))cache.set(assetId,sculptCityProp(T,assetId));
  const item={id,assetId,position,quaternion:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw).toArray(),level,parts:[]};items.push(item);
  for(const [finish,g]of cache.get(assetId)){
   const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,c=g.attributes.color,ix=g.index.array,groups=new Map();
   for(let i=0;i<ix.length;i+=3){const cls=cityClass(finish,[u.getX(ix[i]),u.getY(ix[i])]);if(!groups.has(cls))groups.set(cls,[]);groups.get(cls).push(ix[i],ix[i+1],ix[i+2]);}
   for(const [cls,indices]of groups){
    const copy=g.clone();copy.setIndex(indices);const part=id+'/'+finish+'/'+cls;item.parts.push(part);
    const m=finish==='paint'?cityPaint:finish==='trim'?cityTrim:finish==='flame'?cityFlame:cityGlass;
    const o=mesh(part,copy,m,{kind:assetId==='city1880-shop-window'&&cls==='glass'?'window':'item-part',itemId:id,level,material:cls,fuelClass:cls==='timber'?'furniture':cls==='cloth'?'cloth':null,sourceAssetId:assetId,sourceFinish:finish,physicalShape:'source-closed-mesh'},position,yaw);
    if(assetId==='city1880-shop-window'&&cls==='glass'){
     o.name=part+' glass';o.userData.export.id=o.name;item.parts=item.parts.filter(p=>p!==part);
     openings.push({id:id+'/glazing',surfaceId:o.name,kind:'window',level,pivot:position,initialOpenFraction:0,sourceMeshBindings:[o.name]});
    }
   }
  }
  if(assetId==='city1880-table-lamp-lit')lights.push({id:id+':light',itemId:id,position:[position[0],position[1]+1.009,position[2]],color:0xffbc81,intensity:4,reach:4.3});
  if(assetId==='city1880-shop-pendant-lit')lights.push({id:id+':light',itemId:id,position:[position[0],position[1]+1.736,position[2]],color:0xffbb7f,intensity:8.5,reach:4.7});
 }
 for(const p of BELL_AND_ALDER.props)city(p.id,p.assetId,[p.x-36,0,p.y-9],-p.quarterTurns*Math.PI/2);
 for(const p of layout.lodging.furniture)city(p.id,p.assetId,p.position,0,1);
 city('closing/front-pendant','city1880-shop-pendant-lit',[5.5,0,6.6],0,0);
 box('street-lamp/post',[-1.5,1.06,9.6],[.12,2.12,.12],iron,{kind:'attachment',level:0,material:'iron',fuelClass:null,fuelAmount:0,physicalShape:'source-closed-mesh',thickness:0});
 box('street-lamp/foot',[-1.5,.09,9.6],[.32,.18,.32],iron,{kind:'attachment',level:0,material:'iron',fuelClass:null,fuelAmount:0,physicalShape:'source-closed-mesh',thickness:0});
 city('street-lamp/fixture','city1880-entry-lantern-lit',[-1.5,0,10.077],0,0);
 lights.push({id:'street-lamp:light',itemId:'street-lamp/fixture',position:[-1.5,1.559,9.809],color:0xffbd83,intensity:5,reach:3.6});
 // A few fair ribbons are finite cloth strips, kept clear of the doorway.
 for(const x of [1,7])for(let i=0;i<3;i++)box('fair-ribbon/'+x+'/'+i,[x+(i-1)*.075,2.04,8.15],[.07,.25,.014],mat('Ribbon '+i,[0xc1ac8a,0x6b3433,0x3e4d57][i]),{kind:'attachment',level:0,material:'cloth',fuelClass:'cloth',fuelAmount:.012,thickness:0,physicalShape:'source-closed-mesh'});
 // A shallow inert opposite frontage and its metre-grid chamfer receive real light.
 for(let i=-3;i<3;i++)for(const l of [0,1])wall('opposite/front/'+l+'/'+i,[i,15],[i+1,15],l*2.12,l,brick,{background:true});
 for(const l of [0,1])wall('opposite/chamfer/'+l,[3,15],[4,16],l*2.12,l,brick,{background:true});
 for(let z=16;z<18;z++)for(const l of [0,1])wall('opposite/return/'+l+'/'+z,[4,z],[4,z+1],l*2.12,l,brick,{background:true});
 root.updateMatrixWorld(true);
 return {root,objects,openings,items,lights,materials,dispose(){root.clear();for(const g of owned)g.dispose();for(const map of cache.values())for(const g of map.values())g.dispose();for(const m of materials.values())m.dispose();}};
}
