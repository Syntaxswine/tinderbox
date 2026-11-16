import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCatalogueModules} from '../../src/content/catalogue-modules.js';

const houseId=id=>'hopkins-fifteen::'+id,shopId=id=>'bell-and-alder::'+id;
const source=ids=>({
  version:1,prefabId:'door-registration-control',runtimeAdapterVersion:1,
  levels:[{id:'ground',index:0,floorY:0}],items:[],furnitureParts:[],stores:[],sourceMeshes:[],render:{materials:[],geometry:[]},
  surfaces:ids.map((id,i)=>({id,kind:'wall',material:'timber',normal:[0,0,1],triangles:[[[i,0,0],[i+1,0,0],[i+1,2,0]],[[i,0,0],[i+1,2,0],[i,2,0]]]})),
  openings:ids.map((id,i)=>({id,kind:'door',surfaceId:id,pivot:[i,0,0],bounds:{min:[i,0,-.06],max:[i+1,2,.06]}}))
});
function fixture(){
  const shop=source(['shop-left','shop-right']),house=source(['front-left','front-right','side']);
  shop.closingTime={anchors:{entry:{position:[4,.9,8]}},doors:[{id:'bell-and-alder:entry',anchor:'entry',openingIds:['shop-left','shop-right'],label:'Shop doors'}]};
  return {
    host:{id:'neighborhood',buildings:[{id:'hopkins-fifteen',x:24,y:13,quarterTurns:2}],modules:[]},sources:{shop,house},
    manifest:{version:1,prefabId:'catalogue-modular-v1',instances:[
      {id:'bell-and-alder',kind:'closing',source:'shop',translation:[36,0,9],quarterTurns:0},
      {id:'hopkins-fifteen',kind:'furnished',source:'house',translation:[24,0,13],quarterTurns:2}
    ]}
  };
}
const compile=f=>compileCatalogueModules(f.manifest,f.sources,f.host).data.catalogueModules.doors;
const pair=()=>({id:houseId('front-left'),openingIds:[houseId('front-left'),houseId('front-right')],position:[19,1.48,13.15],label:'House door'});

test('an explicit paired front emits one stable contextual target and consumes both leaves once',()=>{
  const f=fixture(),before=compile(f);f.manifest.doors=[pair()];const input=JSON.stringify(f),doors=compile(f),front=doors.find(d=>d.id===houseId('front-left'));
  assert.equal(JSON.stringify(f),input,'Compilation does not mutate sources or the group manifest');
  assert.equal(doors.length,3);assert.equal(doors.filter(d=>d.instanceId==='hopkins-fifteen').length,2);
  assert.equal(doors.filter(d=>d.id===houseId('front-left')).length,1);
  assert.ok(!doors.some(d=>d.id===houseId('front-right')),'The secondary leaf has no independent action');
  assert.deepEqual(front,{id:houseId('front-left'),openingIds:[houseId('front-left'),houseId('front-right')],position:[19,1.48,13.15],label:'House door',instanceId:'hopkins-fifteen'});
  assert.deepEqual(doors.find(d=>d.id===houseId('side')),before.find(d=>d.id===houseId('side')),'An ungrouped house door is unchanged');
  assert.deepEqual(doors.find(d=>d.id==='bell-and-alder:entry'),before.find(d=>d.id==='bell-and-alder:entry'),'Existing shop grouping and placed anchor are unchanged');
  front.openingIds.pop();front.position[0]=0;assert.deepEqual(f.manifest.doors[0],pair(),'Published registration arrays do not alias manifest inputs');
});

test('paired registration does not depend on source leaf order and preserves declared group order',()=>{
  const f=fixture();f.sources.house.openings.reverse();f.manifest.doors=[{...pair(),openingIds:[houseId('front-right'),houseId('front-left')]}];
  const doors=compile(f);assert.equal(doors.length,3);assert.equal(doors.filter(d=>d.openingIds.includes(houseId('front-right'))).length,1);
  assert.deepEqual(doors.find(d=>d.id===houseId('front-left')).openingIds,[houseId('front-right'),houseId('front-left')]);
});

test('ordinary doors and legacy single-door label/position overrides remain compatible',()=>{
  const f=fixture(),ordinary=compile(f);assert.equal(ordinary.length,4);assert.deepEqual(ordinary[0].openingIds,[shopId('shop-left'),shopId('shop-right')]);
  f.manifest.doors=[{id:houseId('front-left'),label:'Front doors'}];const doors=compile(f),front=doors.find(d=>d.id===houseId('front-left'));
  assert.equal(doors.length,4);assert.equal(front.label,'Front doors');assert.deepEqual(front.openingIds,[houseId('front-left')]);
  assert.deepEqual(front.position,ordinary.find(d=>d.id===front.id).position,'Absent override position uses the placed native opening');
});

test('a new explicit group in a closing source leaves its existing owned actions intact',()=>{
  const f=fixture(),extra=source(['service-left','service-right']);f.sources.shop.surfaces.push(...extra.surfaces);f.sources.shop.openings.push(...extra.openings);
  f.manifest.doors=[{id:shopId('service-left'),openingIds:[shopId('service-left'),shopId('service-right')]}];
  const doors=compile(f);assert.equal(doors.filter(d=>d.instanceId==='bell-and-alder').length,2);assert.ok(doors.some(d=>d.id==='bell-and-alder:entry'));
  assert.deepEqual(doors.find(d=>d.id===shopId('service-left')).openingIds,[shopId('service-left'),shopId('service-right')]);
});

const invalid=[
  ['unknown action target',f=>{f.manifest.doors=[{...pair(),id:houseId('missing')}];},/Unknown door override target/],
  ['unknown leaf',f=>{f.manifest.doors=[{...pair(),openingIds:[houseId('front-left'),houseId('missing')]}];},/Unknown door opening/],
  ['non-door leaf',f=>{f.sources.house.openings[1].kind='window';f.manifest.doors=[pair()];},/Unknown door opening/],
  ['non-door action target',f=>{f.sources.house.openings[0].kind='window';f.manifest.doors=[pair()];},/Unknown door override target/],
  ['cross-instance leaf',f=>{f.manifest.doors=[{...pair(),openingIds:[houseId('front-left'),shopId('shop-left')]}];},/Cross-instance door group/],
  ['duplicate leaf within group',f=>{f.manifest.doors=[{...pair(),openingIds:[houseId('front-left'),houseId('front-left')]}];},/Reused door opening/],
  ['leaf reused by another action',f=>{f.manifest.doors=[pair(),{id:houseId('front-right')}];},/Reused door opening/],
  ['duplicate action target',f=>{f.manifest.doors=[pair(),pair()];},/Duplicate\/missing door override/],
  ['existing shop group leaf reused',f=>{f.manifest.doors=[{id:shopId('shop-left')}];},/Reused door opening/],
  ['anchor omitted from membership',f=>{f.manifest.doors=[{...pair(),openingIds:[houseId('front-right')]}];},/must include its target opening/],
  ['empty leaf list',f=>{f.manifest.doors=[{...pair(),openingIds:[]}];},/Explicit door opening IDs required/],
  ['null leaf list',f=>{f.manifest.doors=[{...pair(),openingIds:null}];},/Explicit door opening IDs required/],
  ['string leaf list',f=>{f.manifest.doors=[{...pair(),openingIds:houseId('front-left')}];},/Explicit door opening IDs required/],
  ['non-string leaf',f=>{f.manifest.doors=[{...pair(),openingIds:[houseId('front-left'),3]}];},/Explicit door opening IDs required/],
  ['nonfinite position',f=>{f.manifest.doors=[{...pair(),position:[19,NaN,13]}];},/Measured door interaction required/],
  ['non-array overrides',f=>{f.manifest.doors=pair();},/Door overrides must be an array/],
  ['null override record',f=>{f.manifest.doors=[null];},/Door overrides must be an array/]
];
for(const [name,mutate,error]of invalid)test('invalid door registration refuses '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>compile(f),error);});
