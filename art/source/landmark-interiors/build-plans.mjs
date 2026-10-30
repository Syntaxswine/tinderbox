import {TANK_DESTRUCTION} from '../../../assets/art/landmark-interiors/tank-state.js';
import fs from 'node:fs';
import {PROP_CATALOGUE,getPropSpec} from '../../../assets/art/landmark-interiors/catalogue.js';
const q=n=>Math.round(n*1e6)/1e6,rect=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]],levelY=n=>q(n*2.12),venues={};
const sourcePins={
 'new-york':{commit:'b689f5501ab06f54822f2aa724ac77de106e3b71',path:'assets/art/exposition-new-york-tile/index.js'},
 administration:{commit:'43337a33ddfe4dff6849654c827c56e1f24e1acc',path:'assets/art/exposition-administration/index.js'},
 horticulture:{commit:'c4287338ff93907900a94a86b6c7e3bed0ae7c2f',path:'assets/art/exposition-horticulture/index.js'},
 fisheries:{commit:'f75499a3ef60d6446a3885d0eb5c21882f27466b',path:'assets/art/exposition-fisheries/index.js'},
 access:{commit:'26e1b1301ce577ab8ed26afa32fdafa93d7d44e4',path:'assets/art/exploration-access/plans.js'}
};
function begin(id,levels){const p={id:'landmark-interior-'+id+'-v1',version:1,venueId:id,units:'metres',occupiedLevels:levels,sourcePins:{building:sourcePins[id],...(id==='fisheries'?{}:{access:sourcePins.access})},rooms:[],walls:[],props:[],portals:[],reservedRoutes:[],replacements:{hiddenSourceParts:[]},notes:[]};venues[id]=p;return p;}
function room(p,id,label,level,polygon,status,sourceIds){p.rooms.push({id,label,level,polygon,sourceStatus:status,sourceIds});return id;}
function wall(p,id,a,b,start,end,openings=[],finish='cream',status='inferred',sourceIds=[]){p.walls.push({id,a:[...a],b:[...b],startLevel:start,endLevel:end,floorLevel:start,openings:openings.map((h,j)=>({id:id+'-opening-'+j,x:h[0],width:h[1]||2,height:h[2]||2.8,bottom:0})),finish,sourceStatus:status,sourceIds});}
function prop(p,assetId,id,x,z,level=1,yaw=0,roomId=null,yOffset=0){const spec=getPropSpec(assetId);if(spec.attachment==='ceiling')yOffset=(p.venueId==='new-york'?3:2)*2.12-.13-spec.bounds.max[1];p.props.push({id,assetId,x:q(x),z:q(z),level,yOffset:q(yOffset),yaw:q(yaw),roomId,sourceIds:getPropSpec(assetId).sourceIds});}
function route(p,id,level,points,width=2){p.reservedRoutes.push({id,level,points:points.map(v=>v.map(q)),width,minimumHeight:2.3,kind:'descriptive art keepout; runtime traversal remains consumer-owned'});}
{
 const p=begin('new-york',[1,4]),S=['INT-NY-PLAN','INT-NY-REPORT'];
 for(const sign of [-1,1]){
  const a=sign<0?-24:14,b=sign<0?-14:24,side=sign<0?'west':'east';
  for(const [j,z]of [[0,8],[8,18],[18,28]].entries())room(p,'ny-l1-'+side+'-'+j,[sign<0?'Ladies parlor':'Gentlemens parlor','Reception room',sign<0?'Ladies room':'Smoking room'][j],1,rect(a,z[0],b,z[1]),'Room functions and adjacency from architect first-floor plan; native quantization.',S);
  wall(p,'ny-l1-'+side+'-spine',[sign*14,0],[sign*14,28],1,4,[[-10,2], [0,4,4.0], [10,2]],sign<0?'cream':'ochre','plan-adapted',S);
  for(const z of [8,18])wall(p,'ny-l1-'+side+'-cross-'+z,[sign<0?-24:8,z],[sign<0?-8:24,z],1,4,[[(sign<0?-19:19)-(sign<0?-16:16),2],[(sign<0?-11:11)-(sign<0?-16:16),2]],'cream','plan-adapted',S);
  wall(p,'ny-l1-'+side+'-inner-front',[sign*8,0],[sign*8,8],1,4,[[0,2]],'pompeian','plan-adapted',S);
  wall(p,'ny-l1-'+side+'-inner-rear',[sign*8,18],[sign*8,28],1,4,[[0,2]],'pompeian','plan-adapted',S);
  room(p,'ny-l1-'+side+'-front-office',sign<0?'Reception manager':'Post and information office',1,rect(sign<0?-14:8,0,sign<0?-8:14,8),'Native adaptation of labeled first-floor service rooms.',S);
  prop(p,'writing-desk','ny-'+side+'-manager-desk',sign*11,2.2,1,0,'ny-l1-'+side+'-front-office');
  prop(p,'clerk-chair','ny-'+side+'-manager-chair',sign*11,3.4,1,0,'ny-l1-'+side+'-front-office');
  if(sign>0)prop(p,'pigeonhole-cabinet','ny-post-sorting',12.4,6.7,1,Math.PI/2,'ny-l1-east-front-office');
  for(const z of [3.0,25]){prop(p,'renaissance-settee','ny-'+side+'-settee-'+z,sign*19,z,1,z<10?Math.PI:0,'ny-l1-'+side+'-'+(z<10?0:2));prop(p,'rug','ny-'+side+'-rug-'+z,sign*19,z+(z<10?1.2:-1.2),1);}
  prop(p,'renaissance-armchair','ny-'+side+'-reception-chair-a',sign*22,10.5,1,Math.PI/2*sign,'ny-l1-'+side+'-1');
  prop(p,'renaissance-armchair','ny-'+side+'-reception-chair-b',sign*17,17,1,0,'ny-l1-'+side+'-1');
  prop(p,'marble-fireplace','ny-'+side+'-chimneypiece',sign*14.5,20.4,1,-sign*Math.PI/2,'ny-l1-'+side+'-2');
  wall(p,'ny-l4-'+side+'-banquet-side',[sign*14,0],[sign*14,28],4,7,[[0,4,4.0]],'cream','Upper room functions documented; exact subdividing lines interpreted.',S);
  for(const z of [10,18])wall(p,'ny-l4-'+side+'-office-cross-'+z,[a,z],[b,z],4,7,[[0,2]],'cream','inferred',S);
  room(p,'ny-l4-'+side+'-office',sign<0?'Board of General Managers office':'Board of Women Managers office',4,rect(a,0,b,10),'Upper functions from 1894 report; grid plan interpreted.',S);
  room(p,'ny-l4-'+side+'-reception','Upper reception room',4,rect(a,10,b,18),'Upper functions documented; exact partition layout unknown.',S);
  room(p,'ny-l4-'+side+'-rear',sign<0?'Relic room':'Tea room',4,rect(a,18,b,28),'Upper functions documented; furnishing arrangement interpreted.',S);
  prop(p,'writing-desk','ny-upper-'+side+'-desk',sign*19,4,4,0,'ny-l4-'+side+'-office');prop(p,'renaissance-armchair','ny-upper-'+side+'-chair',sign*19,5.4,4,0,'ny-l4-'+side+'-office');
  prop(p,'ledger-bookcase','ny-upper-'+side+'-books',sign*21.5,8.8,4,0,'ny-l4-'+side+'-office');
  prop(p,'renaissance-settee','ny-upper-'+side+'-settee',sign*21,16.3,4,0,'ny-l4-'+side+'-reception');
  for(const x of [17,21])prop(p,sign<0?'display-case':'cafe-table-set','ny-upper-'+side+'-rear-'+x,sign*x,23,4,0,'ny-l4-'+side+'-rear');
 }
 room(p,'ny-l1-hall','Pillared entrance hall and grand stair approach',1,rect(-8,0,8,28),'Plan-derived hall with preserved access stair relocation.',S);
 room(p,'ny-l4-banquet','Banquet and reception hall',4,rect(-14,0,14,28),'Central upper hall documented; table positions are set dressing.',['INT-NY-BANQUET','INT-NY-REPORT']);
 for(const x of [-9,9])for(const z of [7,21]){
  prop(p,'banquet-table','ny-banquet-table-'+x+'-'+z,x,z,4,0,'ny-l4-banquet');
  for(const dx of [-1,0,1])for(const dz of [-1.2,1.2])prop(p,'renaissance-armchair','ny-banquet-chair-'+x+'-'+z+'-'+dx+'-'+dz,x+dx,z+dz,4,dz<0?Math.PI:0,'ny-l4-banquet');
 }
 for(const x of [-9,9])for(const z of [7,21])prop(p,'electric-chandelier','ny-banquet-chandelier-'+x+'-'+z,x,z,4,0,'ny-l4-banquet',3.8);
 for(const x of [-10,-6,-2,2,6,10])for(const z of [4,8,12,16,20,24])prop(p,'coffer-panel','ny-ceiling-'+x+'-'+z,x,z,4,0,'ny-l4-banquet',6.0);
 for(const x of [-13.76,13.76])for(const z of [4,8,20,24])prop(p,'classical-wall-panel','ny-upper-panel-'+x+'-'+z,x,z,4,x<0?-Math.PI/2:Math.PI/2,'ny-l4-banquet',2.9);
 route(p,'ny-main-crosshall',1,[[-24,14],[24,14]],2.4);route(p,'ny-front-stair-approach',1,[[0,0],[0,3],[-4.5,6.4],[-4.5,8]],2);
 route(p,'ny-upper-crosshall',4,[[-24,14],[-7,14],[-7,16],[3,16],[3,14],[24,14]],1.8);
 route(p,'ny-upper-stair-arrival',4,[[-1.5,4],[-1.5,2],[3,2],[3,14],[3,27]],1.8);
 p.notes.push('First-floor room divisions follow the architect plate, quantized to this existing 48 m shell. Upper left/right functions follow the report; precise upper partitions remain an interpretation.','The existing access stair occupies a different position from the historical central stair. Its complete source-local stairwell and arrival are preserved; no new floor slabs or changes in floor height.','New partitions have permanent open framed passages. Door interaction and collision are deferred to the coder; no door leaf or invisible barrier is implied.','The cream/gold and Pompeian orange-red schemes are supported by the 1894 description. Exact tapestries, mythological figures, zodiac brass pavement and Millet ceiling painting are not reproduced.');
}
{
 const p=begin('administration',[1,3,5,7]),S=['INT-ADMIN-HUNT'];
 const defined=[['west-public','Public waiting room',-40,0,-30,12],['west-post','Post office',-30,0,-14,12],['west-exchange','Exchange',-40,12,-26,26],['west-foyer','Ante-room',-26,12,-14,20],['west-vault','Vault',-26,20,-20,26],['east-foreign','Foreign visitors office',14,0,20,12],['east-information','Information office',20,0,28,12],['east-ambulance','Ambulance service',28,0,40,12],['east-doctor','Doctor',28,12,34,26],['east-pharmacy','Pharmacy',34,12,40,26]];
 for(const [id,label,a,b,c,d]of defined)room(p,'admin-'+id,label,1,rect(a,b,c,d),'Existing source-supported front room; structural walls retained.',S);
 for(const z of [2.4,9.1])prop(p,'waiting-bench','admin-waiting-'+z,-36,z,1,z<5?Math.PI:0,'admin-west-public');
 prop(p,'wall-clock','admin-waiting-clock',-39.7,6,1,-Math.PI/2,'admin-west-public',2.5);
 for(const x of [-25,-23,-21])prop(p,'service-counter','admin-post-counter-'+x,x,4.2,1,0,'admin-west-post');
 for(const x of [-23,-20])prop(p,'pigeonhole-cabinet','admin-post-sorting-'+x,x,10.8,1,0,'admin-west-post');
 prop(p,'writing-desk','admin-post-desk',-17.5,7.3,1,0,'admin-west-post');prop(p,'clerk-chair','admin-post-chair',-17.5,8.5,1,0,'admin-west-post');
 for(const v of [[-36,17],[-31.8,23.5]]){prop(p,'writing-desk','admin-exchange-desk-'+v[0],...v,1,0,'admin-west-exchange');prop(p,'clerk-chair','admin-exchange-chair-'+v[0],v[0],v[1]+1.15,1,0,'admin-west-exchange');}
 prop(p,'document-safe','admin-vault-safe',-24.3,24,1,0,'admin-west-vault');prop(p,'ledger-bookcase','admin-exchange-ledgers',-38.3,24.8,1,0,'admin-west-exchange');
 prop(p,'waiting-bench','admin-ante-bench',-23,15,1,Math.PI/2,'admin-west-foyer');
 prop(p,'writing-desk','admin-foreign-desk',16.9,3.2,1,0,'admin-east-foreign');prop(p,'clerk-chair','admin-foreign-chair',16.9,4.45,1,0,'admin-east-foreign');
 for(const x of [23,25]){prop(p,'service-counter','admin-information-counter-'+x,x,3.5,1,0,'admin-east-information');p.props.at(-1).labelText='INFO';}
 for(const x of [31,37])prop(p,'iron-cot','admin-ambulance-cot-'+x,x,5,1,Math.PI/2,'admin-east-ambulance');
 prop(p,'washstand','admin-ambulance-basin',38.5,9.8,1,0,'admin-east-ambulance');
 prop(p,'writing-desk','admin-doctor-desk',30.5,15.1,1,0,'admin-east-doctor');prop(p,'clerk-chair','admin-doctor-chair',30.5,16.4,1,0,'admin-east-doctor');
 prop(p,'washstand','admin-doctor-basin',31.3,24.4,1,0,'admin-east-doctor');
 for(const z of [15.6,22.8])prop(p,'pharmacy-cabinet','admin-pharmacy-'+z,39.45,z,1,Math.PI/2,'admin-east-pharmacy');
 prop(p,'writing-desk','admin-pharmacy-desk',36.5,25,1,0,'admin-east-pharmacy');
 for(const level of [1,3,5,7])for(const sign of [-1,1])for(const rear of [false,true]){
  if(level===1&&!rear)continue;const z0=rear?54:0,z1=z0+26,side=(sign<0?'west':'east')+'-'+(rear?'rear':'front'),x0=sign<0?-40:22,x1=sign<0?-22:40;
  wall(p,'admin-'+side+'-corridor-l'+level,[sign*22,z0],[sign*22,z1],level,level+2,[[-7,2],[7,2]],'ochre','inferred',S);
  wall(p,'admin-'+side+'-office-cross-l'+level,[x0,z0+13],[x1,z0+13],level,level+2,[[0,2]],'cream','inferred',S);
  for(const [j,z]of [[z0,z0+13],[z0+13,z1]].entries()){
   const id='admin-'+side+'-l'+level+'-room-'+j;room(p,id,j?'Records office':'Clerical office',level,rect(x0,z[0],x1,z[1]),'Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.',S);
   prop(p,'writing-desk',id+'-desk',sign*31,z[0]+4,level,0,id);prop(p,'clerk-chair',id+'-chair',sign*31,z[0]+5.2,level,0,id);prop(p,'ledger-bookcase',id+'-books',sign*36,z[1]-1.1,level,0,id);prop(p,'opal-pendant',id+'-lamp',sign*31,z[0]+6.5,level,0,id,2.8);
  }
  route(p,'admin-'+side+'-l'+level+'-spine',level,[[sign*18,z0+3],[sign*18,z1-4]],2.0);
 }
 for(const x of [-36,-24,24,36])for(const z of [6,18])prop(p,'opal-pendant','admin-front-pendant-'+x+'-'+z,x,z,1,0,null,2.8);
 for(const level of [1,3,5,7])for(const sign of [-1,1])route(p,'admin-stair-keepout-'+sign+'-'+level,level,[[sign*15,22],[sign*15,25],[sign*15,28]],6.8);
 p.notes.push('The Hunt ground-floor front-half room layout is retained, including the access kit permanent office passages. No duplicate front structural walls are added.','Rear and upper office layouts are deliberately identified interpretations. Desks, mail cabinets, cots and pharmacy jars are period-appropriate models chosen from the documented room uses, not claims to have copied an inspected Administration office photograph.','The archival Arnold dome photograph informed repeated classical panel language only. Its photographic date is n.d. and its publication rights require archive contact; no image pixels are redistributed.','Widened stair wells occupy some source-labeled service/toilet areas; those areas are kept free rather than placing fixtures inside an access route.');
}
{
 const p=begin('horticulture',[1,3]),S=['INT-HORT-CONKEY'];
 room(p,'hort-palm-hall','Palm hall and Crystal Cave mound',1,Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return[q(28*Math.cos(a)),q(36+28*Math.sin(a))];}),'Great planted mound and cave shown in contemporary photograph. Placement and hollow shell simplified.',['INT-HORT-GROTTO']);
 prop(p,'rock-grotto','hort-crystal-cave',0,36,1,0,'hort-palm-hall');
 for(const j of [4,5])p.replacements.hiddenSourceParts.push('palm-'+j+'/trunk',...Array.from({length:12},(_,i)=>'palm-'+j+'/frond-'+i));
 for(const sign of [-1,1]){
  const side=sign<0?'west':'east';room(p,'hort-'+side+'-fruit','Fruit and botanical displays',1,rect(sign<0?-117:33,24,sign<0?-33:117,44),'Photo-derived display types; exact exhibitor allocations and positions are not asserted.',['INT-HORT-FRUIT',...S]);
  for(const x of [43,55,67,83,95,107])for(const z of [28,40])prop(p,'fruit-stand','hort-fruit-'+sign+'-'+x+'-'+z,sign*x,z,1,z===40?Math.PI:0,'hort-'+side+'-fruit');
  for(const x of [61,89])wall(p,'hort-stall-'+sign+'-'+x,[sign*x,24],[sign*x,30],1,2,[],'oak','Interpretive installation partition',S);
  for(const x of [47,103])prop(p,'wardian-case','hort-wardian-'+sign+'-'+x,sign*x,34,1,0,'hort-'+side+'-fruit');
  room(p,'hort-'+side+'-cafe','Pavilion gallery cafe',3,rect(sign<0?-153:117,12,sign<0?-117:153,38),'Gallery cafe use documented; furniture layout interpreted.',S);
  for(const x of [129,141])for(const z of [22,30]){
   prop(p,'cafe-table-set','hort-cafe-'+sign+'-'+x+'-'+z,sign*x,z,3,0,'hort-'+side+'-cafe');const base='cafe/'+(sign*x)+'/'+z;
   p.replacements.hiddenSourceParts.push(base+'/top',base+'/leg');for(const dx of [-1.1,1.1]){p.replacements.hiddenSourceParts.push(base+'/bench-'+dx);for(const dz of [-.15,.15])p.replacements.hiddenSourceParts.push(base+'/foot-'+dx+'-'+dz);}
  }
  for(const z of [79.5,84])prop(p,'potting-bench','hort-potting-'+sign+'-'+z,sign*148,z,1,sign<0?-Math.PI/2:Math.PI/2,null);
  wall(p,'hort-service-'+side+'-side',[sign*143,76],[sign*143,88],1,3,[[0,2]],'oak','Service subdivision interpreted, exact historic plan unknown.',S);
  wall(p,'hort-service-'+side+'-front',[sign<0?-153:143,76],[sign<0?-143:153,76],1,3,[[0,2]],'oak','inferred',S);
  room(p,'hort-'+side+'-potting','Potting and exhibit service bay',1,rect(sign<0?-153:143,76,sign<0?-143:153,88),'Authored service room, not an asserted as-built subdivision.',S);
  route(p,'hort-'+side+'-long-gallery',1,[[sign*34,36],[sign*115,36]],2.5);
  route(p,'hort-'+side+'-court-approach',1,[[sign*75,36],[sign*75,44]],2.0);
  route(p,'hort-'+side+'-gallery-stair',1,[[sign*135,35],[sign*135,46]],3.2);
 }
 prop(p,'orange-tower','hort-california-orange-tower',75,30,1,0,'hort-east-fruit');
 route(p,'hort-main-entrance',1,[[0,0],[0,26],[0,36]],2.0);
 for(const sign of [-1,1])route(p,'hort-grotto-loop-'+sign,1,[[0,24],[sign*7.5,26],[sign*7.5,46],[0,49]],1.6);
 route(p,'hort-rotunda-stair',1,[[0,49],[0,59.546838]],3.2);
 p.notes.push('The 1893 orange-tower photograph and planted Crystal Cave photograph supply display forms, not dimensions derived from perspective. The tower and hollow grotto are simplified authored assets.','The structural galleries and open courts remain intact. Native low installation dividers split selected fruit bays; inferred potting/service rooms occupy end-pavilion corners.','The old cafe tables/benches and two central palm assemblies must be hidden by the listed exact source IDs when these replacements are used. The surrounding original palms, ferns, courts and stairs remain.','No new floor, basement, staircase, height change, invented surveyed exhibit allocation or actual cave admission behavior is introduced.');
}
{
 const p=begin('fisheries',[1,3]),S=['INT-FISH-PLAN'];p.destructionRequirements={aquariumTanks:TANK_DESTRUCTION};
 const C={angling:[-104.42182205858383,25.272593389687454],aquarium:[104.42182205858383,25.272593389687454]};
 room(p,'fish-gallery','Upper fisheries exhibit gallery',3,rect(-48,20,48,54),'Original gallery floor with a central open well; case positions adapted.',S);p.rooms.at(-1).holes=[rect(-40,26,40,48)];
 room(p,'fish-main','Fisheries trade and boat exhibits',1,rect(-56,12,56,62),'Exhibit types from original installation plan; positions adapted.',S);
 for(const x of [-36,36])for(const z of [26,48])prop(p,'skiff-on-cradle','fish-skiff-'+x+'-'+z,x,z,1,0,'fish-main');
 for(const x of [-46,-30,-12,12,30,46])for(const z of [17,57])prop(p,'display-case','fish-case-'+x+'-'+z,x,z,1,0,'fish-main');
 for(const sign of [-1,1])for(const z of [23,51])wall(p,'fish-main-stall-'+sign+'-'+z,[sign<0?-48:40,z],[sign<0?-40:48,z],1,2,[],'oak','Exhibit partition interpretation',S);
 for(const sign of [-1,1])for(const z of [25,33,43,51])prop(p,'display-case','fish-gallery-case-'+sign+'-'+z,sign*46.5,z,3,sign<0?-Math.PI/2:Math.PI/2,'fish-gallery');
 for(const sign of [-1,1])for(const rear of [false,true])route(p,'fish-main-stair-'+sign+'-'+rear,1,[[sign*18,rear?64:10],[sign*18,rear?52:22]],3.8);
 route(p,'fish-main-cross-axis',1,[[-56,37],[56,37]],3.2);route(p,'fish-main-front-axis',1,[[0,0],[0,74]],3.2);
 const [ax,az]=C.angling;room(p,'fish-angling','Angling tackle pavilion',1,Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return[q(ax+20*Math.cos(a)),q(az+20*Math.sin(a))];}),'Radial installation dividers from Conkey; native 12 m runs and case positions adapted.',S);
 for(let j=0;j<8;j++){const a=(j+.5)*Math.PI/4;wall(p,'fish-angling-radial-'+j,[ax+6*Math.cos(a),az+6*Math.sin(a)],[ax+18*Math.cos(a),az+18*Math.sin(a)],1,2,[],'oak','Native even-length adaptation of radial exhibit partitions',S);}
 for(const angle of [45,90,135,180,225,315]){const a=angle*Math.PI/180,yaw=Math.PI/2-a;prop(p,'rod-case','fish-angling-rods-'+angle,ax+14*Math.cos(a),az+14*Math.sin(a),1,yaw,'fish-angling');prop(p,'net-and-buoy-rack','fish-angling-net-'+angle,ax+17*Math.cos(a),az+17*Math.sin(a),1,yaw,'fish-angling');}
 route(p,'fish-angling-east-approach',1,[[ax+20,az],[ax,az]],2.0);route(p,'fish-angling-south-approach',1,[[ax,az-20],[ax,az]],2.0);
 const [x,z]=C.aquarium;room(p,'fish-aquarium','Concentric aquarium galleries',1,Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return[q(x+20*Math.cos(a)),q(z+20*Math.sin(a))];}),'Forbes director report supports two rings, darkened spectator aisle, service passage and central 26 ft pool.',['INT-FISH-FORBES']);
 prop(p,'aquarium-pool','fish-central-pool',x,z,1,0,'fish-aquarium');
 for(let j=0;j<10;j++){const a=(18+j*36)*Math.PI/180;prop(p,'aquarium-inner','fish-inner-tank-'+j,x+10.1*Math.cos(a),z+10.1*Math.sin(a),1,Math.PI/2-a,'fish-aquarium');}
 const first=['s','s','L','L','s','s','L','s','L'],remaining=[...Array(19).fill('s'),...Array(12).fill('L')];let angle=186,index=0;
 for(const group of [first,remaining]){for(const type of group){const span=type==='s'?6:12,a=(angle+span/2)*Math.PI/180;prop(p,type==='s'?'aquarium-small':'aquarium-large','fish-outer-tank-'+index++,x+17.6*Math.cos(a),z+17.6*Math.sin(a),1,Math.PI/2-a,'fish-aquarium');angle+=span;}angle+=12;}
 const arc=(r,a,b,n=12)=>Array.from({length:n+1},(_,i)=>{const t=(a+(b-a)*i/n)*Math.PI/180;return[x+r*Math.cos(t),z+r*Math.sin(t)];});
 route(p,'fish-aquarium-entry-to-outer',1,[[x,z-20],[x,z-14.2],...arc(14.2,270,288,8).slice(1)],1.7);
 route(p,'fish-aquarium-inner-connection',1,[[x+14.2*Math.cos(1.6*Math.PI),z+14.2*Math.sin(1.6*Math.PI)],[x+6.5*Math.cos(1.6*Math.PI),z+6.5*Math.sin(1.6*Math.PI)]],1.4);
 route(p,'fish-aquarium-west-connection',1,[[x-20,z],[x-6.5,z]],1.7);
 route(p,'fish-aquarium-outer-loop',1,arc(14.2,0,360,72),1.6);route(p,'fish-aquarium-inner-loop',1,arc(6.5,0,360,48),1.6);
 p.replacements.factoryOptions={includeExhibits:false};
 p.notes.push('Use the original Fisheries factory with includeExhibits:false before adding this complete replacement exhibit set. Original exterior, floors, doors, roof and gallery stairs remain unchanged.','Forbes printed pp.145-146 support 50 tanks: 24 small + 16 large outer and 8 + 1 + 1 inner. The scanned page was visually checked because OCR misread 16 as 18. This model preserves the 40/10 count but simplifies the unequal inner bay sizes and exact original schedule.','The unequal large inner tanks are simplified into ten independent double-faced bays with safe connecting gaps. Printed 15 ft passages inform the two ring aisles; detailed tank depths, glass engineering, hidden maintenance ladders and plumbing are omitted.','The central pool is an above-floor display prop. A single bullet hit must destroy the struck glazed tank; this is an accepted user requirement. The artist supplies intact/destroyed presentation and stable tank IDs; the coder still owns bullet collision, authoritative destroyed state and persistence. Water spill, fallen glass and fish are static art cues, with no flooding, hazard, swimming or combustion rules implied.');
}
for(const p of Object.values(venues)){
 for(const r of p.walls){const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],length=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx),centre=[(r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2];for(const h of r.openings)p.portals.push({id:h.id,runId:r.id,level:r.floorLevel,position:[q(centre[0]+h.x*dx/length),levelY(r.startLevel),q(centre[1]+h.x*dz/length)],heading:q(yaw),clearWidth:h.width,clearHeight:h.height,stateful:false,sourceStatus:r.sourceStatus});}
 p.prototypeIds=[...new Set(p.props.map(p=>p.assetId))];p.notes.push('Source-local +X right, +Z rear, +Y up; structural floors stay on 2.12 m native levels. Furniture dimensions are metres and are not stretched to grid sizes.','Physical collision/fuel/material assignments and game integration remain consumer-owned. Room labels and route keepouts are descriptive evidence, not proof of runtime traversal.');
}
fs.writeFileSync('assets/art/landmark-interiors/plans.js','// Authored native-grid interior plans; regenerate with art/source/landmark-interiors/build-plans.mjs.\nconst freeze=v=>{if(v&&typeof v===\'object\'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};\nexport const INTERIOR_PLANS=freeze('+JSON.stringify(venues,null,2)+');\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(venues).map(([k,p])=>[k,{rooms:p.rooms.length,walls:p.walls.length,props:p.props.length,portals:p.portals.length}]))));
