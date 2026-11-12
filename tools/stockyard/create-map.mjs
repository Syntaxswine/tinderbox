import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {ENGINE_ROOT,ENGINE_COMMIT,FIELD,validateLayout} from '../../workbenches/stockyard/contract.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {createMapDocument,openDocument}=await import(new URL('packages/map-core/index.js',ENGINE_ROOT));
const edgeKey=(axis,x,y,z=0)=>[axis,x,y,...(z?[z]:[])].join(':');
const doc=createMapDocument('Tinderbox | Stockyard entrance blockout'),map=JSON.parse(doc.export());
map.guards=[];
// Required legacy start slots remain explicit staging markers, without invented NPCs.
map.starts.forEach((s,i)=>{s.character.id='char_stockyard_staging_'+(i+1);});
// Keep the editor format's required staging slots in its original margin; no crowd is implied.
function paint(x0,y0,x1,y1,kind,z=0){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(z)map.upper[z-1][x+','+y]=kind;else map.terrain[y][x]=kind;}
function edgeBox(x0,y0,x1,y1,kind,z=0){for(let x=x0;x<=x1;x++){map.edges[edgeKey('s',x,y0-1,z)]=kind;map.edges[edgeKey('s',x,y1,z)]=kind;}for(let y=y0;y<=y1;y++){map.edges[edgeKey('e',x0-1,y,z)]=kind;map.edges[edgeKey('e',x1,y,z)]=kind;}}
paint(80,64,218,178,'yard');
paint(80,122,218,130,'ground-gravel'); // Exchange approach and internal east/west spine.
paint(112,65,121,175,'ground-gravel'); // Centre Avenue / rail-service corridor.
paint(181,70,188,168,'ground-gravel');
for(const y of [88,96,104,112,136,144,152,160])paint(123,y,181,y+2,'ground-gravel');
paint(149,74,153,167,'ground-gravel');
// Industrial edge uses ordinary native editable floors/walls, as massing placeholders.
for(const [x0,y0,x1,y1]of [[83,83,106,113],[85,138,106,164],[190,145,198,158]]){
 for(let z=0;z<2;z++){paint(x0,y0,x1,y1,'floor',z);edgeBox(x0,y0,x1,y1,'wall-brick',z);}paint(x0,y0,x1,y1,'floor',2);
 for(let x=x0+5;x<x0+9;x++){delete map.edges[edgeKey('s',x,y1)];}
}
// Open holding pens are ordinary map-editor rail fences, distinct from covered hog bays.
for(const x of [126,156]){paint(x,72,x+19,85,'yard');edgeBox(x,72,x+19,85,'fence-railing');for(let y=72;y<=85;y++)map.edges[edgeKey('e',x+9,y)]='fence-railing';delete map.edges[edgeKey('s',x+4,85)];delete map.edges[edgeKey('s',x+5,85)];}
for(let y=87;y<118;y++)map.edges[edgeKey('e',201,y)]='fence-railing';
for(let y=135;y<=167;y++)map.edges[edgeKey('e',201,y)]='fence-railing';
const instances=[{id:'exchange-entrance',name:'Union Stock Yard gate',asset:'union-stockyard-gate',x:202,y:126,quarterTurns:3,bays:1,skin:'jubilee'}];
for(const [band,ys]of [['north',[94,102,110]],['south',[138,146,154]]])for(const [col,x]of [[1,126],[2,156]])for(const [i,y]of ys.entries())instances.push({id:`covered-${band}-${col}-${i+1}`,name:`${band==='north'?'North':'South'} covered pens ${col}.${i+1}`,asset:'covered-swine-pen',x,y,quarterTurns:0,bays:6,skin:i===2?'jubilee':'working'});
 map[FIELD]=validateLayout({format:'tinderbox-stockyard-layout',version:1,engineCommit:ENGINE_COMMIT,artCommit:'e98e46f11f818857a2f08054e9d1071e023cc2d3',metresPerUnit:1,stage:'period-map-informed blockout',instances,
 view:{x:147,y:123,span:102},
 labels:[{text:'EXCHANGE AVENUE · entrance spine',x:164,y:126},{text:'CENTRE AVENUE · rail / service edge',x:116,y:116},{text:'COVERED HOG PENS',x:151,y:108},{text:'OPEN HOLDING PENS',x:151,y:78},{text:'PACKINGHOUSE MASSING · provisional',x:95,y:99},{text:'TRANSIT / OFFICE MASSING · provisional',x:195,y:151}],
 interpretation:'Bounded 140 x 115 m game sector. Native assets retain scale. Street/pen/rail/industrial relationships derive from period maps; bay count, spacings, crop and placeholder buildings are game adaptations, not a measured reconstruction.',
 sources:[{id:'SY-1890',url:'https://www.loc.gov/item/98687207/',use:'Pen-row rhythm, industrial edge and rail approaches; perspective is not uniformly scaled.'},{id:'SY-1891',url:'https://chicagohistoryresources.org/greatchicagostories/pdf/artifacts/artifacts_hotdog.pdf',page:10,use:'May 1 1891 general plan: Exchange approach, rail-connected stockyard grid and district relationships. Low-resolution copy; no inferred survey dimensions.'},{id:'SY-ATLAS',url:'https://collections.newberry.org/archive/-2KXJ8Z814UYL2.html',sheet:15,use:'Packinghouse service/rail relationship and block massing. This sheet is not an entrance or individual-pen survey.'}],
 pending:['Specialized livestock, wardrobe and working clutter remain the artist\'s separate assignment.','This is an editable authoring blockout, without stockyard gameplay, fire, collision or AI acceptance.','Stockyard assemblies require the supplied Tinderbox editor layer; native map fields remain editable in Nautilus.']});
doc.replace(map);
for(const waypoints of [[[117,70],[117,171]],[[124,67],[195,67]]]){const r=doc.apply({tool:'railway-route',start:{x:117,y:70,z:0},options:{waypoints}});assert.ok(r.ok,r.error);}
const text=doc.export(),restored=openDocument(text);assert.deepEqual(restored.validate(),[]);assert.deepEqual(JSON.parse(text)[FIELD],JSON.parse(restored.export())[FIELD]);
const out=path.join(root,'maps/stockyard');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'stockyard-1893.map.json'),JSON.stringify(JSON.parse(text))+'\n');
fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify(map[FIELD],null,2)+'\n');
console.log(JSON.stringify({stockyardAssemblies:instances.length,coveredBays:instances.filter(x=>x.asset==='covered-swine-pen').reduce((n,x)=>n+x.bays,0),nativeRailRoutes:2,validation:restored.validate(),bytes:Buffer.byteLength(text)}));
