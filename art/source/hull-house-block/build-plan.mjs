import fs from 'node:fs';
const root='art/source/hull-house-block',trace=JSON.parse(fs.readFileSync(root+'/trace.json','utf8'));
const {width:W,depth:D}=trace.block,project=([x,z])=>[(x-40)*W/1495,(z-70)*D/454],round=n=>Math.round(n);
function simplify(p){let change=true;while(change){change=false;p=p.filter((v,i)=>{const a=p[(i+p.length-1)%p.length],b=p[(i+1)%p.length];if((v[0]===a[0]&&v[1]===a[1])||(a[0]===v[0]&&v[0]===b[0])||(a[1]===v[1]&&v[1]===b[1])){change=true;return false;}return true;});}return p;}
const area=p=>p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-b[0]*a[1];},0)/2;
const inside=(x,z,p)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const buildings=trace.buildings.map((s,i)=>{
 const exact=s.sourcePolygon.map(project),polygon=simplify(exact.map(p=>p.map(round)));
 if(polygon.length<4||area(polygon)<=0)throw Error('Bad traced polygon '+s.id);
 for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length];if(a[0]!==b[0]&&a[1]!==b[1])throw Error('Diagonal native edge '+s.id);}
 const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]),bounds={min:[Math.min(...xs),Math.min(...zs)],max:[Math.max(...xs),Math.max(...zs)]},cells=[];
 for(let x=bounds.min[0];x<bounds.max[0];x++)for(let z=bounds.min[1];z<bounds.max[1];z++)if(inside(x+.5,z+.5,polygon))cells.push([x,z]);
 if(cells.length!==area(polygon))throw Error('Grid footprint mismatch '+s.id);
 const skin=i%5,festive=['halsted-342','halsted-350','polk-214','ewing-163'].includes(s.id),sign={'halsted-342':'GROCER','halsted-350':'SHOE REPAIR','halsted-346':'ROOMS','polk-209-workshop':'WOOD WORKS','ewing-192-workshop':'WORK ROOMS','ewing-195-front':'ROOMS'}[s.id]||null;
 const frontage=s.street==='S. Halsted'?'west':s.street==='S. Desplaines'?'east':s.street==='W. Polk'?'north':'south';
 return {...s,sourceVertexMetres:exact,polygon,cells,bounds,skin,festive,sign,frontage,roof:polygon.length===4?s.roof:'flat',footprintArea:cells.length,
  gridMaxVertexShift:Math.max(...exact.map((p,j)=>Math.hypot(p[0]-round(p[0]),p[1]-round(p[1])))),sourceIds:['HH-MAP-N1','HH-MAP-W1','HH-TEXT-1895','HH-SANBORN-1906', 'HH-PHOTO-3488','HH-PHOTO-3446']};
});
const occupied=new Map(),overlaps=[];
for(const b of buildings)for(const p of b.cells){const key=p.join('/');if(occupied.has(key))overlaps.push({cell:p,a:occupied.get(key),b:b.id});else occupied.set(key,b.id);}
if(overlaps.length)throw Error('Traced footprint overlaps '+JSON.stringify(overlaps.slice(0,8)));
const passages=trace.passages.map(p=>({...p,polygon:p.sourcePolygon.map(v=>project(v).map(round))}));
for(const p of passages){const xs=p.polygon.map(v=>v[0]),zs=p.polygon.map(v=>v[1]);p.clearWidth=Math.max(...xs)-Math.min(...xs)-.16;p.minHeight=Infinity;}
const plan={version:1,assetId:'hull-house-block',representedDate:trace.representedDate,native:{tile:1,wallHeight:2,wallThickness:.16,door:[1,1.65,.12],slab:.12,floorPitch:2.12},
 block:trace.block,buildings,parcels:trace.parcels.map(p=>({...p,polygon:[[p.sourceRect[0],p.sourceRect[1]],[p.sourceRect[2],p.sourceRect[1]],[p.sourceRect[2],p.sourceRect[3]],[p.sourceRect[0],p.sourceRect[3]]].map(v=>project(v))})),passages,
 adaptation:'Stable block bounds checked against the later printed insurance ruler. Black 1895 outlines manually interpreted, straightened and snapped to whole metres. Heights and skins are inferred; later construction is not silently backdated.',
 metrics:{buildings:buildings.length,nativeFootprintCells:occupied.size,openGroundCells:W*D-occupied.size,maxGridVertexShift:Math.max(...buildings.map(b=>b.gridMaxVertexShift)),overlaps:0}};
fs.writeFileSync(root+'/plan.js','// Compiled from the editable source trace. No household color encodes a physical material.\nexport const BLOCK_PLAN = '+JSON.stringify(plan)+';\n');
fs.writeFileSync(root+'/trace-metrics.json',JSON.stringify(plan.metrics,null,2)+'\n');console.log(plan.metrics);
