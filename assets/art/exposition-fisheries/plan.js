import {PROFILE,levelY} from './engine.js';
export {levelY};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const rect=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]];
export function regular(n,side,x,z){const radius=side/(2*Math.sin(Math.PI/n));return Array.from({length:n},(_,i)=>{const a=-Math.PI/2-Math.PI/n+i*2*Math.PI/n;return[x+radius*Math.cos(a),z+radius*Math.sin(a)];});}
export function inside(x,z,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
const runs=[],floors=[],stairs=[],arcades=[],pavilions=[],towers=[],portals=[],body=rect(-56,12,56,62),mainCentre=[0,37];
const opening=(id,x,width,bottom,top,kind='window')=>({id,x,width,bottom,height:top-bottom,kind});
const windows=(id,len,level=1)=>Array.from({length:Math.floor(len/4)},(_,j)=>opening(id+'-window-'+j,(j-(Math.floor(len/4)-1)/2)*4,2,levelY(level)+.3,levelY(level+2)-.45));
function edge(section,id,a,b,startLevel,endLevel,holes){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length,openings=holes??windows(id,length);
 for(let at=0,n=0;at<length-1e-7;n++){const len=Math.min(64,length-at);if(Math.abs(len/2-Math.round(len/2))>1e-6)throw Error('Use even metre lengths: '+id);const centre=at+len/2-length/2;
  runs.push({section,id:id.replaceAll('/','-')+'-piece-'+n,a:[a[0]+at*ux,a[1]+at*uz],b:[a[0]+(at+len)*ux,a[1]+(at+len)*uz],length:len,startLevel,endLevel,openings:openings.filter(h=>h.x>=centre-len/2-1e-7&&h.x<centre+len/2-1e-7).map(h=>({...h,x:h.x-centre}))});at+=len;
 }}
function loop(section,id,poly,start,end,holes){for(let i=0;i<poly.length;i++)edge(section,id+'-'+i,poly[i],poly[(i+1)%poly.length],start,end,holes?.(i));}
for(const z of [12,62])for(const sign of [-1,1])edge('main','main-long-'+z+'-'+sign,[sign<0?-56:8,z],[sign<0?-8:56,z],0,5);
for(const sign of [-1,1]){
 const id='main-end-'+sign,len=50;edge('main',id,[sign*56,12],[sign*56,62],0,5,[...windows(id,len).filter(h=>Math.abs(h.x)>5),opening(id+'/arcade',0,6,levelY(1),levelY(3)-.15,'passage')]);
}
for(const rear of [false,true]){
 const id=rear?'north-entry':'south-entry',z=rear?62:0,front=rear?74:0,centreZ=rear?70:4;
 edge('main',id+'/front',[-8,front],[8,front],0,4,[opening(id+'/arch',0,8,levelY(1),levelY(4),'portal')]);
 stairs.push({id:id+'-approach',section:'main',x:0,z:rear?78:-4,heading:rear?Math.PI:0,width:4,run:4,fromLevel:0,toLevel:1,steps:12,source:'Exterior approach is a native-height game adaptation.'});
 portals.push({id,section:'main',position:[0,levelY(1),front],heading:rear?Math.PI:0,openingWidth:2,clearWidth:1.72,clearHeight:2.72,screenWidth:8,level:1});
 for(const sign of [-1,1])edge('main',id+'/side-'+sign,[sign*8,z],[sign*8,z+12],0,4,[...windows(id+'/side-'+sign,12).filter(h=>Math.abs(h.x-(centreZ-(z+6)))>3),opening(id+'/tower-link-'+sign,centreZ-(z+6),4,levelY(1),levelY(3)-.15,'passage')]);
 for(const sign of [-1,1]){const x=sign*12,poly=regular(12,2,x,centreZ),towerId=id+'/turret-'+sign,doorSide=sign>0?9:3;
  loop('main',towerId,poly,0,8,i=>i===doorSide?[opening(towerId+'/door',0,2,levelY(1),levelY(1)+2.72,'passage')]:i===((doorSide+1)%12)?[]:[opening(towerId+'/sash-'+i,0,1,levelY(1)+.4,levelY(3)-.4),opening(towerId+'/belfry-'+i,0,1,levelY(6)+.2,levelY(8)-.25,'passage')]);
  towers.push({id:towerId,x,z:centreZ,polygon:poly,section:'main',topLevel:8,radius:2/(2*Math.sin(Math.PI/12)),roofRise:levelY(2)});
 }
}
// Raised source hall clerestory: all support walls still use native metre panels.
const clerestory=rect(-48,22,48,52),centralDrum=regular(16,8,0,37),drumIntersection=centralDrum.flatMap((a,i)=>{const b=centralDrum[(i+1)%16];return(a[1]<=22&&b[1]>=22||b[1]<=22&&a[1]>=22)?[a[0]+(22-a[1])*(b[0]-a[0])/(b[1]-a[1])]:[];}),joinWidth=Math.max(...drumIntersection)*2;
loop('main','clerestory',clerestory,7,9,i=>[...windows('clerestory-'+i,i%2?30:96,7).filter(h=>i%2||Math.abs(h.x)-h.width/2>joinWidth/2),...(i%2?[]:[opening('clerestory-'+i+'-drum-join',0,joinWidth,levelY(7),levelY(9),'join-cut')])]);
loop('main','central-drum',centralDrum,5,12,i=>[-2,2].map((x,j)=>opening('central-drum-'+i+'-arch-'+j,x,2,levelY(8),levelY(11)-.4,'passage')));
floors.push({id:'main-first',section:'main',level:1,polygons:[body,rect(-8,0,8,12),rect(-8,62,8,74),...towers.map(t=>t.polygon),...towers.map(t=>rect(t.x<0?-12:8,t.z-2,t.x<0?-8:12,t.z+2))],holes:[],slot:'floor'});
floors.push({id:'main-gallery',section:'main',level:3,polygons:[rect(-48,20,48,54),rect(-8,0,8,20),rect(-8,54,8,74),...towers.map(t=>t.polygon),...towers.map(t=>rect(t.x<0?-12:8,t.z-2,t.x<0?-8:12,t.z+2))],holes:[rect(-40,26,40,48)],slot:'floor'});
floors.push({id:'upper-drum-balcony',section:'main',level:8,polygons:[regular(16,8.6,0,37)],holes:[regular(16,7.4,0,37)],slot:'trim',decorative:true});
for(const sign of [-1,1])for(const rear of [false,true])stairs.push({id:'main-gallery-stair-'+sign+'-'+rear,section:'main',x:sign*18,z:rear?62:12,heading:rear?Math.PI:0,width:2.4,run:8,fromLevel:1,toLevel:3,steps:24,source:'Conkey ground/gallery stair positions; straight native-height flight is adapted.'});
// Curved connection is a sequence of unscaled even-metre chord modules. Exact
// historical lengths/placement of these arcades are not surveyed by the source.
for(const sign of [-1,1]){
 const section=sign<0?'west-arcade':'east-arcade',path=[[sign*56,37]];
 for(const angle of [0,-Math.PI/12,-Math.PI/6,-Math.PI/4]){const p=path.at(-1);path.push([p[0]+sign*8*Math.cos(angle),p[1]+8*Math.sin(angle)]);}
 const normals=path.map((p,i)=>{const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],l=Math.hypot(b[0]-a[0],b[1]-a[1]);return[-(b[1]-a[1])/l,(b[0]-a[0])/l];});
 normals[normals.length-1]=[0,sign];
 const left=path.map((p,i)=>[p[0]+normals[i][0]*3,p[1]+normals[i][1]*3]),right=path.map((p,i)=>[p[0]-normals[i][0]*3,p[1]-normals[i][1]*3]);
 const polys=path.slice(1).map((p,i)=>{const q=[left[i],right[i],right[i+1],left[i+1]],area=q.reduce((v,a,j)=>v+a[0]*q[(j+1)%4][1]-q[(j+1)%4][0]*a[1],0);return area>0?q:q.reverse();});
 floors.push({id:section+'/deck',section,level:1,polygons:polys,holes:[],slot:'floor'});arcades.push({id:section,section,path,left,right,polygons:polys,width:6});
 const end=path.at(-1),apothem=8/(2*Math.tan(Math.PI/16)),x=end[0]+sign*apothem,z=end[1],pavSection=sign<0?'angling':'aquarium',poly=regular(16,8,x,z),inwardSide=sign>0?12:4;
 loop(pavSection,pavSection+'/outer',poly,0,4,i=>i===inwardSide?[opening(pavSection+'/link',0,6,levelY(1),levelY(3)-.15,'passage')]:i===0?[opening(pavSection+'/entry',0,6,levelY(1),levelY(3)-.15,'portal')]:[-2,2].map((dx,j)=>opening(pavSection+'/'+i+'-sash-'+j,dx,2,levelY(1)+.3,levelY(3)-.4)));
 const frontEdge=[poly[0],poly[1]],mid=frontEdge[0].map((v,j)=>(v+frontEdge[1][j])/2),yaw=-Math.atan2(frontEdge[1][1]-frontEdge[0][1],frontEdge[1][0]-frontEdge[0][0]);
 portals.push({id:pavSection+'-entry',section:pavSection,position:[mid[0],levelY(1),mid[1]],heading:yaw,openingWidth:2,clearWidth:1.72,clearHeight:2.72,screenWidth:6,level:1});
 stairs.push({id:pavSection+'-approach',section:pavSection,x:mid[0],z:mid[1]-4,heading:0,width:4,run:4,fromLevel:0,toLevel:1,steps:12,source:'Exterior approach is a native-height game adaptation.'});
 const drum=regular(16,4,x,z);loop(pavSection,pavSection+'/upper-drum',drum,6,8,i=>[opening(pavSection+'/drum-'+i,0,2,levelY(6)+.2,levelY(8)-.4,'passage')]);
 floors.push({id:pavSection+'/first',section:pavSection,level:1,polygons:[poly],holes:[],slot:'floor'});pavilions.push({id:pavSection,section:pavSection,x,z,polygon:poly,radius:8/(2*Math.sin(Math.PI/16)),drum,drumRadius:4/(2*Math.sin(Math.PI/16))});
}
export const SECTION_IDS=Object.freeze(['main','west-arcade','east-arcade','angling','aquarium']);
export const PLAN=freeze({version:1,assetId:'exposition-fisheries-1893',units:'metres',nativeProfile:PROFILE,body,mainCentre,runs,floors,stairs,arcades,pavilions,towers,portals,centralDrum,clerestory,sectionIds:SECTION_IDS,
 authored:{mainLength:112,mainDepth:50,entranceEnvelope:32,entranceProjection:12,wingDiameter:8/Math.sin(Math.PI/16),crown:levelY(20),occupiedLevels:[1,3],decorativeRingLevel:8},
 sources:['FISH-CONKEY-1893:scans34-37','FISH-FLINN-1893:printed73,75','FISH-ARNOLD-1893:plate53'],
 adaptations:['Written 365 x165 ft main hall becomes112 x50 m. Overall siting and32 m chord-arcades are composition choices; Conkey 1100 ft overall is not treated as a calibrated envelope.','The 16-sided wings use 8 m native edges, adapting the 133.5/135 ft statements; the aquarium layout is interpreted from text, not an inspected aquarium construction plan.','Upper gallery heights, roof pitches, turret heights and cross-connections are game adaptations on 2.12 m levels. The L8 external drum balcony remains decorative without an accepted upper access route.','The original installation identifiers are exhibit positions, not wall bays or surveyed structural spacing.'],
 anchor:'Ground at centre of the front entry; +X toward aquarium, +Z to rear. This is a local art anchor, not a surveyed fair-site placement.'});
