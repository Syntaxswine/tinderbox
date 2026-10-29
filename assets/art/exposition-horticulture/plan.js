import {PROFILE,levelY} from './engine.js';
export {levelY};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const rect=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]];
export function regular(n,side,x,z){const radius=side/(2*Math.sin(Math.PI/n));return Array.from({length:n},(_,i)=>{const a=-Math.PI/2-Math.PI/n+i*2*Math.PI/n;return[x+radius*Math.cos(a),z+radius*Math.sin(a)];});}
export const BODY=[[-153,12],[-117,12],[-117,24],[-33,24],[-33,0],[33,0],[33,24],[117,24],[117,12],[153,12],[153,88],[-153,88]];
export const ROTUNDA=regular(24,8,0,36),SMALL_PAVILIONS=[regular(12,6,-20,12),regular(12,6,20,12)],COURTS=[rect(-117,44,-33,72),rect(33,44,117,72)];
const runs=[],stairs=[{id:'west-gallery',x:-135,z:38,fromLevel:1,toLevel:3},{id:'east-gallery',x:135,z:38,fromLevel:1,toLevel:3}];
const round=(id,x,width,bottom,top,kind='arched-window')=>({id,x,width,bottom,height:top-bottom,kind,archRadius:width/2});
function ordinary(id,length,kind='arched-window'){const n=Math.floor(length/4);return Array.from({length:n},(_,j)=>round(id+'-arch-'+j,(j-(n-1)/2)*4,2,levelY(1)+.3,levelY(3)-.4,kind));}
function edge(id,a,b,endLevel=3,role='exterior',holes,startLevel=0){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),source=holes||ordinary(id,length),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;
 for(let start=0,index=0;start<length-1e-6;index++){
  const len=Math.min(64,length-start);if(Math.abs(len/2-Math.round(len/2))>1e-6)throw Error('Even edge '+id);
  const centre=start+len/2-length/2,openings=source.filter(h=>h.x>=centre-len/2-1e-6&&h.x<centre+len/2-1e-6).map(h=>({...h,x:h.x-centre}));
  runs.push({id:id+'-piece-'+index,a:[a[0]+ux*start,a[1]+uz*start],b:[a[0]+ux*(start+len),a[1]+uz*(start+len)],length:len,startLevel,endLevel,role,openings});start+=len;
 }
}
function loop(id,poly,endLevel,role,holes){for(let i=0;i<poly.length;i++)edge(id+'-'+i,poly[i],poly[(i+1)%poly.length],endLevel,role,holes?.(i,Math.hypot(poly[(i+1)%poly.length][0]-poly[i][0],poly[(i+1)%poly.length][1]-poly[i][1])));}
// Main perimeter follows the diagram except the central front, whose curved
// arcade and twin domed foyers are established by the built photographs.
for(let i=0;i<BODY.length;i++){if([3,4,5].includes(i))continue;const a=BODY[i],b=BODY[(i+1)%BODY.length],end=([0,1,7,8,9,11].includes(i)?4:3);edge('outer-'+i,a,b,end,'exterior');}
// Upper end-pavilion walls close the gallery edge beneath its taller eaves.
// These continue existing lower runs without duplicating their native panels.
for(const sign of [-1,1]){
 edge('end-upper-inner-'+sign,[sign*117,24],[sign*117,88],4,'exterior',[],3);
 edge('end-upper-back-'+sign,[sign*117,88],[sign*153,88],4,'exterior',[],3);
}
for(const [i,p]of COURTS.entries())loop('court-'+i,p,3,'court');
// Rear curtain front: court edges already supply the outer fields; add central link.
edge('rear-central-link',[-33,72],[33,72],3,'interior',[round('rear-link-portal',0,8,levelY(1),levelY(3)-.12,'interior-arch'),...ordinary('rear-link',66).filter(h=>Math.abs(h.x)>6)]);
loop('rotunda',ROTUNDA,5,'rotunda',(i,len)=>i%6===0?[round('rotunda-portal-'+i,0,6,levelY(1),levelY(3)-.24,'interior-arch')]:[-2,2].map((x,j)=>round('rotunda-'+i+'-arch-'+j,x,2,levelY(1)+.3,levelY(3)-.4)));
for(const [p,poly]of SMALL_PAVILIONS.entries())loop('front-dome-'+p,poly,5,'front-pavilion',(i,len)=>[round('front-dome-'+p+'-arch-'+i,0,2,levelY(1)+.3,levelY(3)-.4,i>=3&&i<=8?'interior-arch':'arched-window')]);
loop('entrance',rect(-8,0,8,8),5,'entrance',(i,len)=>i===0?[round('main-entrance',0,8,levelY(1),levelY(4),'entrance')]:i===2?[round('vestibule-back',0,12,levelY(1),levelY(4),'interior-arch')]:ordinary('vestibule-side-'+i,len));
stairs.push({id:'rotunda-gallery',x:0,z:Math.max(...regular(24,6.2,0,36).map(p=>p[1]))-8,fromLevel:1,toLevel:3,interpretation:'Interpretive rear stair meets the inner gallery tangent without a hidden floor or extra storey; its exact historic placement is unverified.'});
const stairHoles=stairs.filter(s=>Math.abs(s.x)>100).map(s=>rect(s.x-1,s.z,s.x+1,s.z+8)),endWells=[rect(-147,50,-123,74),rect(123,50,147,74)],radius=8/(2*Math.sin(Math.PI/24));
const floors=[{id:'first-floor',level:1,polygons:[BODY],holes:[],slot:'floor'},
 {id:'pavilion-galleries',level:3,polygons:[rect(-153,12,-117,88),rect(117,12,153,88)],holes:[...endWells,...stairHoles],slot:'floor'},
 {id:'rotunda-gallery',level:3,polygons:[ROTUNDA],holes:[regular(24,6.2,0,36)],slot:'floor'},
 {id:'dome-spring-deck',level:5,polygons:[ROTUNDA],holes:[regular(24,7.36,0,36)],slot:'trim'},
 {id:'entrance-roof',level:5,polygons:[rect(-8,0,8,8)],holes:[],slot:'trim'},
 ...SMALL_PAVILIONS.map((p,i)=>({id:'foyer-roof-'+i,level:5,polygons:[p],holes:[],slot:'trim'}))];
export function inside(x,z,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export const PLAN=freeze({version:1,assetId:'exposition-horticulture-1893',units:'metres',nativeProfile:PROFILE,body:BODY,rotunda:ROTUNDA,smallPavilions:SMALL_PAVILIONS,courts:COURTS,runs,floors,stairs,
 roof:{domeDiameter:56,domeBase:levelY(5),domeRise:levelY(9),crown:levelY(16),frontGlass:[{x:-75,z:34,width:84,depth:20,base:levelY(3),rise:levelY(2)},{x:75,z:34,width:84,depth:20,base:levelY(3),rise:levelY(2)}],rear:{x:0,z:80,width:234,depth:16,base:levelY(3),rise:levelY(1)},ends:[{x:-135,z:50,width:36,depth:76,base:levelY(4),rise:levelY(3)},{x:135,z:50,width:36,depth:76,base:levelY(4),rise:levelY(3)}]},
 zones:[{id:'palm-hall',name:'Central palm hall',source:'Conkey description and plan'},{id:'west-court',name:'West planted court',source:'Conkey plan; planting arrangement adapted'},{id:'east-court',name:'East planted court',source:'Conkey plan; planting arrangement adapted'},{id:'front-galleries',name:'Glazed front galleries',source:'Conkey description'},{id:'rear-gallery',name:'Ordinary-light rear gallery',source:'Conkey description'},{id:'pavilion-cafes',name:'Pavilion gallery cafes',source:'Conkey description; exact upper subdivisions unknown'}],
 anchor:'Ground at the middle of the projecting central front; +X along the frontage, +Z to rear, +Y up.',
 decisions:['Written1000 ft length becomes306 m; 250 ft body depth becomes76 m at the end pavilions, while the full plan projection reaches88 m. The printed extreme-width statement and diagram envelope do not coincide.','Courts are84 x28 m against270 x88 ft. The exhibit grid is not used as a structural bay schedule.','Circular arcades use exact even-length segments:24 sides x8 m and12 sides x6 m, rotated unscaled.','Front twin domed foyers follow built photographs; their curvature and native-grid connection to the diagram are adaptations.','Rear/end roof profiles and gallery voids are simplified where built evidence is incomplete; no complete as-built plan is claimed.']});
