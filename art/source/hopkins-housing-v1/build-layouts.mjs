import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planEdges} from '../../../src/art/gross-housing.js';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const R=(id,label,x,z,w,d,type=id)=>({id,label,type,polygon:[[x,z],[x+w,z],[x+w,z+d],[x,z+d]]});
const P=(id,label,polygon,type=id)=>({id,label,type,polygon});
const F=(label,rooms,links,entry=null,stair=null)=>({label,rooms,connections:links.map(s=>s.split('/')),entry,stairs:stair?{x:stair[0],z:stair[1],width:1,run:3,rise:2.12}:null});
const Q=(x,z,width,depth,axis='z',base=4.12,rise=1.7,form='gable')=>({x,z,width,depth,axis,base,rise,form});
const houses=[],colors=['#bbbfa6','#d0c0a1','#b4bda8','#c9bba0','#d5cdb4','#bac2ae','#c9b295','#b5c2b7','#d2c3a3','#b9bda4','#c4b49a','#b7beb1'];
function add(n,title,width,depth,feet,floors,porch,roofs,notes,extra={}){
 const leaf=20+Math.floor((n-9)/2)*2,printed=leaf-2;
 houses.push({id:'hopkins-4-'+String(n).padStart(2,'0'),designNumber:n,label:'No. '+n+' / '+title,source:{book:4,date:1891,leaf,scanNumber:leaf+1,printedPage:null,descriptionPrintedPage:printed,descriptionLeaf:leaf-1,url:`https://archive.org/details/DSHopkinsHousesandcottagesbookno40001/page/n${leaf}/mode/1up`,plate:`../../../art/source/hopkins-housing-v1/plates/n${leaf}.jpg`,type:'Published pattern-book design; no as-built survey'},sourceDimensions:{overallFeet:feet,qualifier:n===15?'Printed 26 x 33 ft conflicts with the sum of room widths in the plan; native composition follows the room arrangement.':n===12||n===17||n===19?'Published overall includes porches.':'Published overall; see description for porch inclusion.',floorHeightsFeet:n===13?[9,7.5]:[9,n===9||n===10||n===19?8.5:8]},width,depth,plinth:.48,style:{wall:'clapboard',color:colors[n-9],trim:'#eee3cb',accent:['#52604e','#665648','#715647'][n%3],roof:'cedar',form:'custom'},floors,porch,roofPieces:roofs,notes,...extra});
}
add(9,'Chamfered parlor cottage',7,10,[24,35],[
 F('First floor',[P('parlor','Parlor',[[2,0],[4,0],[5,1],[5,4],[1,4],[1,1]],'parlor'),R('hall','Entry hall',5,1,2,3,'hall'),R('dining','Dining room',0,4,4,4,'dining'),R('kitchen','Kitchen',4,4,3,6,'kitchen'),R('pantry','Pantry',1,8,3,2,'pantry')],['hall/parlor','hall/kitchen','parlor/dining','dining/kitchen','dining/pantry','pantry/kitchen'],[5,1,6,1],[5,4]),
 F('Second floor',[P('bed-a','Front chamber',[[2,0],[4,0],[5,1],[5,4],[1,4],[1,1]],'bedroom'),R('bed-b','Rear chamber',0,4,4,4,'bedroom'),R('hall','Landing',4,4,3,3,'hall'),R('bed-c','Rear chamber',4,7,3,3,'bedroom'),R('closet','Closets',0,8,4,2,'pantry')],['hall/bed-a','hall/bed-b','hall/bed-c','bed-b/closet'],null,[5,4])
],{x:5,z:-1,width:2,depth:2},[Q(3,4.5,4.5,10),Q(3.5,6,7.5,4.5,'x')],['Chamfered parlor front, three upper chambers, and rear pantry follow the plate.','The partly open source stair becomes one common native stair flight.']);
add(10,'Narrow cross-gable cottage',7,13,[23,43],[
 F('First floor',[R('parlor','Parlor',0,0,4,4,'parlor'),R('vest','Vestibule',4,2,3,2,'hall'),R('living','Living room',0,4,4,4,'sitting'),P('hall','Stair hall',[[4,4],[7,4],[7,9],[2,9],[2,8],[4,8]],'hall'),R('pantry','Pantry',0,8,2,2,'pantry'),R('fuel','Fuel room',0,10,2,3,'service'),R('kitchen','Kitchen',2,9,5,4,'kitchen')],['vest/parlor','vest/hall','parlor/living','living/hall','living/pantry','pantry/fuel','pantry/kitchen','fuel/kitchen','hall/kitchen'],[5,2,6,2],[4,5]),
 F('Second floor',[R('bed-a','Front chamber',0,0,3,4,'bedroom'),R('bed-b','Side chamber',0,4,3,4,'bedroom'),R('bed-c','Side chamber',5,4,2,4,'bedroom'),P('hall','Landing',[[3,0],[5,0],[5,8],[7,8],[7,9],[3,9]],'hall')],['hall/bed-a','hall/bed-b','hall/bed-c'],null,[4,5])
],{x:4,z:0,width:3,depth:2},[Q(2,4.5,4.5,9.5),Q(3.5,6,7.5,4.5,'x'),Q(3.5,11,7.5,4.5,'z',2.05,1.1)],['Separate fuel room and rear kitchen wing are retained.','The dual-access source stair is consolidated into one flight, with a widened upper landing.']);
add(11,'Square family cottage',8,8,[27,27],[
 F('First floor',[P('sitting','Sitting room',[[0,0],[4,0],[4,3],[3,3],[3,4],[0,4]],'sitting'),R('vest','Vestibule',4,0,2,2,'hall'),P('living','Bay living room',[[6,0],[8,0],[8,1],[9,2],[9,3],[8,4],[8,7],[4,7],[4,2],[6,2]],'sitting'),P('kitchen','Kitchen',[[0,4],[3,4],[3,7],[4,7],[4,8],[0,8]],'kitchen'),R('hall','Stair passage',3,3,1,4,'hall'),R('pantry','Pantry',4,7,2,1,'pantry'),R('rear','Rear passage',6,7,2,1,'hall')],['vest/sitting','vest/living','sitting/hall','hall/kitchen','hall/living','kitchen/pantry','living/pantry','living/rear','pantry/rear'],[4,0,5,0],[3,3]),
 F('Second floor',[R('bed-a','Front chamber',0,0,3,3,'bedroom'),R('bed-b','Front chamber',5,0,3,3,'bedroom'),R('bed-c','Rear chamber',0,5,3,3,'bedroom'),R('bed-d','Rear chamber',5,5,3,3,'bedroom'),P('hall','Landing',[[3,0],[5,0],[5,3],[8,3],[8,5],[5,5],[5,8],[3,8],[3,5],[0,5],[0,3],[3,3]],'hall')],['hall/bed-a','hall/bed-b','hall/bed-c','hall/bed-d'],null,[3,3])
],{x:3,z:-2,width:4,depth:2},[Q(4,4,8.5,8.5),Q(7.5,3.5,3.5,4.5,'x')],['Square main block, projecting living-room bay and four upper chambers are retained.','A clear central landing replaces small closet passages; closets are included in chamber areas.']);
add(12,'Broad-porch roof cottage',8,7,[25,28],[
 F('First floor',[R('sitting','Sitting room',0,0,4,3,'sitting'),R('dining','Dining room',4,0,4,3,'dining'),R('bed-a','Chamber',0,3,3,4,'bedroom'),R('hall','Stair passage',3,3,2,3,'hall'),P('kitchen','Kitchen',[[5,3],[8,3],[8,7],[3,7],[3,6],[5,6]],'kitchen')],['sitting/dining','sitting/bed-a','sitting/hall','dining/hall','dining/kitchen','hall/kitchen','bed-a/hall'],[2,0,3,0],[4,3]),
 F('Second floor',[P('bed-b','Chamber',[[1,1],[4,1],[4,5],[3,6],[1,6],[0,5],[0,2]],'bedroom'),R('hall','Landing',4,2,1,4,'hall'),R('servant','Servants room',5,3,3,3,'bedroom')],['hall/bed-b','hall/servant'],null,[4,3])
],{x:0,z:-2,width:8,depth:2},[Q(4,3.5,8.5,7.5,'x',4.12,1.8,'gambrel')],['One lower chamber, one upper chamber and the smaller servants room follow the plan.','Broad front porch and chamfered upper projection are retained. The curved source roof becomes a separately declared faceted gambrel envelope.']);
add(13,'Laborers cottage',8,8,[25,26],[
 F('First floor',[R('bed-a','Chamber',0,0,3,4,'bedroom'),R('living','Living room',3,0,5,4,'sitting'),R('closet','Closet',1,4,1,2,'pantry'),R('pantry','Pantry',1,6,1,2,'pantry'),R('kitchen','Kitchen',2,4,4,4,'kitchen'),R('hall','Stair passage',6,4,1,4,'hall')],['bed-a/living','living/kitchen','living/hall','kitchen/hall','kitchen/closet','kitchen/pantry'],[4,0,5,0],[6,4]),
 F('Second floor',[R('bed-b','Chamber',0,0,3,4,'bedroom'),R('bed-c','Chamber',4,0,4,4,'bedroom'),P('hall','Landing',[[3,0],[4,0],[4,4],[7,4],[7,7],[3,7]],'hall')],['hall/bed-b','hall/bed-c'],null,[6,4])
],{x:3,z:-1,width:3,depth:1},[Q(4,2,8.5,4.5,'x'),Q(4.5,5.5,5.5,3.5)],['Published as a laborers cottage costing $450-$575 in 1891; the printed 25 x 26 ft overall is visually verified.','One lower chamber and two upper chambers retained; the tiny stair landing is enlarged to fit the shared flight.']);
add(14,'Plain gabled cottage',7,9,[22,30],[
 F('First floor',[R('living','Living room',0,0,4,4,'sitting'),R('hall','Hall',4,0,3,5,'hall'),R('dining','Dining room',0,4,4,5,'dining'),R('kitchen','Kitchen',4,5,3,4,'kitchen')],['hall/living','living/dining','hall/dining','hall/kitchen','dining/kitchen'],[4,0,5,0],[5,2]),
 F('Second floor',[R('bed-a','Front chamber',0,0,4,4,'bedroom'),P('hall','Landing',[[4,1],[7,1],[7,5],[0,5],[0,4],[4,4]],'hall'),R('bed-b','Rear chamber',0,5,3,4,'bedroom'),R('bed-c','Rear chamber',3,5,4,4,'bedroom')],['hall/bed-a','hall/bed-b','hall/bed-c'],null,[5,2])
],{x:4,z:-2,width:3,depth:2},[Q(3.5,4.5,7.5,9.5,'z',4.12,2.1)],['Plain front gable, recessed entrance and three upper chambers follow the plate.','The optional rear kitchen addition described by Hopkins is not added.']);
add(15,'Gambrel family cottage',10,10,[26,33],[
 F('First floor',[R('living','Living room',0,0,4,6,'sitting'),R('dining','Dining end',0,6,4,4,'dining'),R('hall','Stair hall',4,0,2,7,'hall'),R('parlor','Parlor',6,0,4,5,'parlor'),R('kitchen','Kitchen',6,5,4,5,'kitchen'),R('pantry','Pantry',4,7,2,3,'pantry')],['hall/living','living/dining','hall/parlor','hall/kitchen','hall/pantry','dining/pantry','pantry/kitchen','parlor/kitchen'],[4,0,5,0],[4,4]),
 F('Second floor',[R('bed-a','Chamber',0,0,4,7,'bedroom'),R('bed-b','Chamber',6,0,4,7,'bedroom'),R('bed-c','Front chamber',4,-1,2,3,'bedroom'),R('hall','Landing',4,2,2,5,'hall')],['hall/bed-a','hall/bed-b','hall/bed-c'],null,[4,4])
],{x:3,z:-2,width:4,depth:2,roofRise:.18},[Q(5,3.5,10.44,9.2,'x',2.05,3.72,'gambrel'),Q(5,.91,4.4,4.18,'z',2.05,3.39,'gambrel'),Q(5,8.5,10.5,3.5,'z',2.05,1,'hip')],['Gambrel roof, central porch and front upper chamber distinguish this house.','The source living room has a grille dividing its dining end; that transition is kept as an open framed span.','Printed 26 ft width and individual room widths disagree; the 10 m composition follows the illustrated arrangement, not a claimed measured reproduction.','Roof correction: continuous steep skirts and shallow crowns replace the notched footprint roof. Extended eaves clear the two full native wall courses. Roof angles, overhangs and the lower front ridge are artistic adaptations, not source measurements.','Per user art direction, vertical gable faces carry horizontal clapboard; cedar shingles remain on the sloped roof surfaces.','The centered two-space window is deferred to the map-editor work requested separately by the user. Existing window openings are retained.'],{roofAssembly:{kit:'gambrel-v1',runModule:1,gableMaterial:'clapboard',pieces:[
 {id:'main',axis:'x',x:5,z:3.5,base:2.05,span:9.2,kneeRun:.8,kneeRise:2.2,upperPitch:.4,runStart:-.22,runEnd:10.22,ends:[{run:0,wallMin:-3.5,wallMax:3.5},{run:10,wallMin:-3.5,wallMax:3.5}]},
 {id:'front',axis:'z',x:5,z:.91,base:2.05,span:4.4,kneeRun:.5,kneeRise:2.2,upperPitch:.7,runStart:-1.18,runEnd:3,ends:[{run:-1,wallMin:-1,wallMax:1}]}
],junction:'Exact planar valley cuts remove roof faces buried inside the intersecting gambrel. Front rear-end cap omitted below main roof.',source:'n26 / facing description page 24',nativeWalls:'unchanged'}});
add(16,'High-roof cottage',7,9,[24,28],[
 F('First floor',[R('living','Living room',0,0,4,4,'sitting'),R('kitchen','Kitchen',0,4,4,5,'kitchen'),P('dining','Dining room',[[4,2],[7,2],[7,6],[5,6],[5,7],[4,7]],'dining'),R('pantry','Pantry',4,7,1,2,'pantry'),R('hall','Rear stair passage',5,6,2,3,'hall')],['living/kitchen','living/dining','kitchen/dining','kitchen/pantry','dining/pantry','dining/hall','pantry/hall'],[4,2,5,2],[5,6]),
 F('Second floor',[R('bed-a','Front chamber',0,0,4,4,'bedroom'),R('bed-b','Chamber',0,4,3,4,'bedroom'),R('bed-c','Chamber',4,2,3,4,'bedroom'),P('hall','Landing',[[3,4],[4,4],[4,6],[7,6],[7,9],[3,9]],'hall')],['hall/bed-a','hall/bed-b','hall/bed-c'],null,[5,6])
],{x:4,z:0,width:3,depth:2},[Q(3.5,4.5,7.5,9.5,'z',4.12,2.3),Q(5.5,3.5,3.5,4.5,'x')],['Inset entrance, high roof and three upper chambers follow the plate.','The pantry is a narrow shared-grid compartment; rear stair circulation is expanded.']);
add(17,'Veranda and wood-house cottage',5,9,[24,29],[
 F('First floor',[P('parlor','Parlor',[[0,0],[5,0],[5,4],[0,4],[-1,3],[-1,1]],'parlor'),R('dining','Dining room',0,4,3,3,'dining'),R('kitchen','Kitchen',3,4,2,3,'kitchen'),R('wood','Wood house',0,7,3,2,'service'),R('pantry','Pantry',3,7,2,2,'pantry')],['parlor/dining','parlor/kitchen','dining/kitchen','dining/wood','kitchen/pantry','wood/pantry'],[2,0,3,0],[3,4]),
 F('Second floor',[R('bed-a','Front chamber',0,0,5,3,'bedroom'),R('bed-b','Rear chamber',0,5,3,2,'bedroom'),P('hall','Landing',[[0,3],[5,3],[5,7],[3,7],[3,5],[0,5]],'hall')],['hall/bed-a','hall/bed-b'],null,[3,4])
],{x:0,z:-2,width:7,depth:2},[Q(2.5,3.5,5.5,7.5),Q(2.5,8,5.5,2.5,'z',2.05,.8,'hip')],['Uses the leftmost principal dwelling plan, not the more densely partitioned summer-cottage alternative.','Two upper chambers, a side parlor bay, rear wood house and two-sided veranda are retained.'],{sidePorches:[{x:5,z:0,width:2,depth:7}]});
add(18,'Small T-plan cottage',7,8,[24,25],[
 F('First floor',[R('living','Living room',1,0,4,4,'sitting'),R('hall','Entry passage',5,3,2,1,'hall'),R('dining','Dining room',0,4,3,4,'dining'),R('kitchen','Kitchen',3,4,4,4,'kitchen')],['hall/living','hall/kitchen','living/dining','living/kitchen','dining/kitchen'],[5,3,6,3],[3,4]),
 F('Second floor',[R('bed-a','Front chamber',1,0,4,4,'bedroom'),R('bed-b','Rear chamber',0,4,2,4,'bedroom'),R('store','Store room',5,4,2,4,'service'),R('hall','Landing',2,4,3,4,'hall')],['hall/bed-a','hall/bed-b','hall/store'],null,[3,4])
],{x:5,z:1,width:2,depth:2},[Q(3,2,4.5,4.5),Q(3.5,6,7.5,4.5,'x')],['T-shaped plan, two upper chambers and separate store room are retained.','The upper third small space is storage, not an invented bedroom.']);
add(19,'Balcony veranda cottage',6,11,[34,41],[
 F('First floor',[P('living','Living room',[[0,0],[6,0],[6,4],[1,4],[1,3],[0,3]],'sitting'),R('hall','Stair passage',0,3,1,4,'hall'),R('bed-a','Chamber',1,4,2,3,'bedroom'),R('dining','Dining room',3,4,3,4,'dining'),R('closet','Closet',1,7,2,1,'pantry'),R('kitchen','Kitchen',0,8,4,3,'kitchen'),R('rear','Rear entry',4,8,2,2,'hall')],['living/hall','living/bed-a','living/dining','hall/bed-a','bed-a/dining','bed-a/closet','closet/dining','closet/kitchen','dining/kitchen','dining/rear','kitchen/rear'],[2,0,3,0],[0,3]),
 F('Second floor',[R('bed-b','Front chamber',1,0,5,4,'bedroom'),P('hall','Landing',[[0,0],[1,0],[1,4],[6,4],[6,5],[1,5],[1,7],[0,7]],'hall'),R('bed-c','Rear chamber',0,7,3,3,'bedroom'),R('bed-d','Rear chamber',3,5,3,5,'bedroom')],['hall/bed-b','hall/bed-c','hall/bed-d'],null,[0,3])
],{x:-2,z:-2,width:10,depth:2},[Q(3,5,6.5,10.5)],['Hopkins explicitly calls this a summer cottage; retain that identity as a suburban/leisure variant.','Wraparound porch and upper front balcony retained. The optional two-party exterior stair access is not implemented.'],{sidePorches:[{x:-2,z:0,width:2,depth:10},{x:6,z:0,width:2,depth:10}],frontBalcony:{x:1,z:-1.3,width:4,depth:1.3}});
add(20,'Bay-front compact house',8,13,[25,44],[
 F('First floor',[P('parlor','Bay parlor',[[4,0],[5,0],[5,-1],[7,-1],[7,0],[8,0],[8,5],[4,5]],'parlor'),R('vest','Vestibule',2,3,2,2,'hall'),R('sitting','Sitting room',0,5,4,5,'sitting'),R('dining','Dining room',4,5,4,5,'dining'),R('kitchen','Kitchen',1,10,6,3,'kitchen')],['vest/parlor','vest/sitting','parlor/dining','sitting/dining','sitting/kitchen','dining/kitchen'],[2,3,3,3],[3,7]),
 F('Second floor',[R('bed-a','Front chamber',4,0,4,5,'bedroom'),R('bed-b','Rear chamber',4,6,4,4,'bedroom'),P('hall','Landing',[[3,3],[4,3],[4,5],[8,5],[8,6],[4,6],[4,10],[3,10]],'hall')],['hall/bed-a','hall/bed-b'],null,[3,7])
],{x:0,z:0,width:4,depth:3},[Q(6,4.5,4.5,10.5),Q(4,7.5,8.5,4.5,'x'),Q(4,11.5,6.5,3.5,'z',2.05,1)],['Four principal lower rooms and two upper chambers follow the plan.','Projecting parlor bay and recessed front porch are retained; the combination stair becomes one native flight.']);
// Door and stair geometry remain unscaled. This is a catalogue-derived composition.
const native={units:'metres',wall:[1,2,.16],door:[1,1.65,.12],lintel:[1,.35,.16],floorThickness:.12,floorSpacing:2.12,diagonalConstruction:'native 1m panels with a cut end',meshScale:[1,1,1],newVictorianSashOpening:[1,1.2],originalFarmyardWindowOpening:[1,.7]};
for(const h of houses){
 if(h.designNumber===19)h.floors[1].entry=[3,0,4,0];
 if(h.designNumber===15)h.floors[0].openConnections=[['living','dining']];
 for(const f of h.floors){
  // Window rhythm is a declared art adaptation; never a measured historic opening schedule.
  const edges=planEdges(f),chosen=new Set();
  for(const r of f.rooms.filter(r=>!['hall','pantry','service'].includes(r.type))){
   const runs=new Map();
   for(const e of edges.filter(e=>e.rooms.length===1&&e.rooms[0]===r.id&&!e.opening)){
    const horizontal=e.a[1]===e.b[1],vertical=e.a[0]===e.b[0];if(!horizontal&&!vertical)continue;
    const key=(horizontal?'h:':'v:')+(horizontal?e.a[1]:e.a[0]);if(!runs.has(key))runs.set(key,[]);runs.get(key).push(e);
   }
   for(const group of runs.values())if(group.length>1){const e=group[Math.floor(group.length/2)];chosen.add(e.id);}

  }
  f.windows=edges.filter(e=>chosen.has(e.id)).map(e=>[...e.a,...e.b]);
  for(const r of f.rooms)r.polygon=r.polygon.map(([x,z])=>[h.width-x,z]).reverse();
  for(const field of ['entry'])if(f[field])f[field]=[h.width-f[field][2],f[field][3],h.width-f[field][0],f[field][1]];
  f.windows=f.windows.map(([a,b,c,d])=>[h.width-c,d,h.width-a,b]);
  if(f.stairs)f.stairs.x=h.width-f.stairs.x-1;
 }
 if(h.porch)h.porch.x=h.width-h.porch.x-h.porch.width;
 for(const p of h.sidePorches||[])p.x=h.width-p.x-p.width;
 if(h.frontBalcony)h.frontBalcony.x=h.width-h.frontBalcony.x-h.frontBalcony.width;
 for(const p of h.roofPieces)p.x=h.width-p.x;
 h.nativeContract={...native};h.integration={status:'artist contribution candidate',nautilusImported:false,requires:['Tinderbox nautilus-wall-runs-v1 consumer','interior-floor support','door and stair gameplay integration']};
 h.adaptation='One-metre plan snapping and two full native wall courses preserve reuse. Published one-and-half-storey proportions are interpreted with new roof envelopes above the native courses. Colors, rear surfaces, furnishings, opening spacing and consolidated closets/circulation are interpretations. Cellars are described but no cellar partition plans are published for these designs; none are invented as extra interiors.';
 if(h.roofAssembly)h.adaptation=h.adaptation.replace('new roof envelopes above the native courses','new roof envelopes around the full upper native course; eaves, roof panels and removable clapboard gable facings are new art');
 h.notes.push('Historical floor heights and overall feet are recorded separately; native wall and door geometry is never rescaled.');
}
const base=path.join(root,'assets/art/hopkins-housing-v1');fs.mkdirSync(path.join(base,'prefabs'),{recursive:true});
const write=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2)+'\n');
write(path.join(base,'houses.json'),{version:1,collection:'Hopkins small houses / Book 4, first set',sourceDate:1891,front:'negative Z',houses});
for(const h of houses)write(path.join(base,'prefabs',h.id+'.json'),h);
write(path.join(base,'manifest.json'),{version:1,kind:'artist-housing-contribution',source:'art/source/hopkins-housing-v1',houses:houses.map(h=>({id:h.id,path:'prefabs/'+h.id+'.json',design:h.designNumber,leaf:h.source.leaf,floors:h.floors.length})),materials:[],reusedMaterialCollection:'assets/art/gross-housing-v1',contract:native,nautilusImported:false});
console.log('Wrote '+houses.length+' Hopkins houses, '+houses.reduce((n,h)=>n+h.floors.length,0)+' interior levels.');
