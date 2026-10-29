import {PROFILE as S,levelY} from './engine.js';
export {levelY};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const BODY=[[-40,0],[-14,0],[-14,10],[14,10],[14,0],[40,0],[40,26],[30,26],[30,54],[40,54],[40,80],[14,80],[14,70],[-14,70],[-14,80],[-40,80],[-40,54],[-30,54],[-30,26],[-40,26]];
const rect=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]],apothem=8*(1+Math.SQRT2);
// Eight equal 16 m native runs. Fractional diagonal endpoints come from the
// exact octagon; panels keep their authored metre width and are only rotated.
export const ROTUNDA=[[-8,40-apothem],[8,40-apothem],[apothem,32],[apothem,48],[8,40+apothem],[-8,40+apothem],[-apothem,48],[-apothem,32]];
export const INNER=ROTUNDA.map(([x,z])=>[x*(1-.08/apothem),40+(z-40)*(1-.08/apothem)]);
const runs=[],rooms=[];
function loop(id,poly,startLevel,endLevel,holes,role='exterior'){
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);runs.push({id:id+'-'+i,a,b,length,startLevel,endLevel,role,openings:holes(i,length,id+'-'+i)});}
}
const arched=(id,x,width,bottom,top,kind='arched-window')=>({id,kind,x,width,bottom,height:top-bottom,archRadius:width/2});
loop('body',BODY,0,9,(i,len,id)=>{
 if(len===26)return [-6,6].map((x,j)=>arched(id+'-sash-'+j,x,8,levelY(2),levelY(8)+.3));
 if(len===28)return [arched(id+'-entrance',0,16,levelY(1),levelY(8),'entrance')];
 return len===10?[{id:id+'-basement-sash',kind:'window',x:0,width:2,bottom:levelY(1)+.35,height:1.3}]:[];
});
loop('rotunda',ROTUNDA,1,23,(i,len,id)=>[
 arched(id+'-lower-arch',0,i%2?10:12,levelY(1),levelY(8),i%2?'interior-arch':'interior-arch'),
 ...[-5,0,5].map((x,j)=>({id:id+'-upper-window-'+j,kind:'window',x,width:2,bottom:levelY(10)+.4,height:levelY(17)-levelY(10)-.8}))
],'rotunda');
for(const x of [-27,23])for(const z of [13,63])loop('colonnade-pier-'+x+'-'+z,rect(x,z,x+4,z+4),9,19,()=>[],'colonnade-pier');
loop('colonnade-entablature',rect(-27,13,27,67),17,19,()=>[],'entablature');
// Raised approaches fill each recess at the same first-floor elevation.
const approaches=[rect(-8,0,8,10),rect(30,32,40,48),rect(-8,70,8,80),rect(-40,32,-30,48)];
for(const [i,poly] of approaches.entries())for(let j=0;j<4;j++){const a=poly[j],b=poly[(j+1)%4];if((i===0&&j===2)||(i===1&&j===3)||(i===2&&j===0)||(i===3&&j===1))continue;runs.push({id:'approach-'+i+'-'+j,a,b,length:Math.hypot(b[0]-a[0],b[1]-a[1]),startLevel:0,endLevel:1,role:'foundation',openings:[]});}
// Evidence-derived front offices. Rear/upper subdivisions are intentionally
// left open; no undocumented rear office plan is asserted.
function room(id,label,poly,source){rooms.push({id,label,polygon:poly,level:1,source});}
room('west-post','Post office',rect(-30,0,-14,12),'Hunt 4');room('west-public','Public waiting room',rect(-40,0,-30,12),'Hunt 6');room('west-exchange','Exchange',rect(-40,12,-26,26),'Hunt 5');
room('west-foyer','Ante-room',rect(-26,12,-14,20),'Hunt 8');room('west-vault','Vault',rect(-26,20,-20,26),'Hunt 9');room('west-wc','Toilet',rect(-20,20,-14,26),'Hunt 7; squared native adaptation');
room('east-foreign','Foreign visitors office',rect(14,0,20,12),'Hunt 10');room('east-information','Information office',rect(20,0,28,12),'Hunt 11');room('east-ambulance','Ambulance service',rect(28,0,40,12),'Hunt 12');
room('east-foyer','Ante-room',rect(14,12,28,20),'Hunt 8');room('east-doctor','Doctor',rect(28,12,34,26),'Hunt 13');room('east-pharmacy','Pharmacy',rect(34,12,40,26),'Hunt 14');room('east-wc','Toilet',rect(14,20,20,26),'Hunt 7; squared native adaptation');
// Deduplicate shared room edges, and omit exterior lines already in BODY.
const partitions=[{a:[-30,0],b:[-30,12]},{a:[-40,12],b:[-14,12]},{a:[-26,12],b:[-26,26]},{a:[-26,20],b:[-14,20]},{a:[-20,20],b:[-20,26]},
 {a:[20,0],b:[20,12]},{a:[28,0],b:[28,26]},{a:[14,12],b:[40,12]},{a:[34,12],b:[34,26]},{a:[14,20],b:[28,20]},{a:[20,20],b:[20,26]}];
for(const [i,p] of partitions.entries()){
 const length=Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]);runs.push({id:'office-partition-'+i,...p,length,startLevel:1,endLevel:3,role:'interior',openings:[{id:'office-door-'+i,kind:'open-door',x:.5,width:1,bottom:levelY(1),height:1.65}]});
}
const pavilions=[rect(-40,0,-14,26),rect(14,0,40,26),rect(-40,54,-14,80),rect(14,54,40,80)];
export const STAIR_PODS=[{id:'front-west',x:-15,z:25,heading:Math.PI*5/4},{id:'front-east',x:15,z:25,heading:Math.PI*7/4},{id:'rear-west',x:-15,z:55,heading:Math.PI*3/4},{id:'rear-east',x:15,z:55,heading:Math.PI/4}];
const stairHoles=STAIR_PODS.map(p=>Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return[p.x+3.4*Math.cos(a),p.z+3.4*Math.sin(a)];}));
const floors=[{id:'ground-floor',level:1,polygons:[BODY,...approaches],holes:[],use:'ground floor, source-supported front offices and rotunda; rear rooms unknown'},
 ...[3,5,7].map(level=>({id:'pavilion-floor-'+level,level,polygons:pavilions,holes:stairHoles,use:'four-story pavilion floor plates; exact upper subdivisions are inferred'})),
 {id:'pavilion-roof-and-gallery',level:9,polygons:[BODY],holes:[INNER],use:'roof deck and lower gallery; open rotunda void'},
 {id:'upper-colonnade-terrace',level:19,polygons:[rect(-27,13,27,67)],holes:[INNER],use:'upper terrace; open rotunda void'},
 {id:'dome-spring-ring',level:23,polygons:[ROTUNDA.map(([x,z])=>[x*1.055,40+(z-40)*1.055])],holes:[INNER],use:'narrow dome spring ring; open rotunda void'}];
export function inside(x,z,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export const PLAN=freeze({version:1,assetId:'exposition-administration-1893',units:'metres',nativeProfile:S,body:BODY,rotunda:ROTUNDA,innerRotunda:INNER,runs,floors,rooms,stairs:STAIR_PODS,
 levels:Array.from({length:37},(_,index)=>({index,elevation:levelY(index),floors:floors.filter(f=>f.level===index).map(f=>f.id),rotunda:index===1?'floor':index<36?'void: no slab across the rotunda':'custom dome crown'})),
 groundAnchor:'centre of front footprint at ground; +X right, +Z rear, +Y up',
 exceptions:['Custom dome, columns, arches, cornices, carved figures, stairs and slab boundary cuts.','Rotunda wall endpoints are the exact regular octagon; all eight runs are exactly 16 m and all native panels are 1 m, rotated without scaling.'],
 sourceStatus:'A tile adaptation of the Hunt published front-half plan/elevation and contemporary photographs. Complete exterior footprint uses the four-pavilion description and source symmetry; rear rooms, upper partitions and hidden roof joins remain unverified.'});
