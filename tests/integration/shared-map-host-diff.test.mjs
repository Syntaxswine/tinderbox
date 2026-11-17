import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSharedMapHosts} from '../../tools/review/shared-map-host-diff.mjs';
const fixture=()=>({player:{x:2,hp:100,inventory:{matches:12}},actors:[{id:'resident',hp:100}],clocks:{world:1},navigation:{portalStates:{front:false},waitingForSection:false,collision:{cachedShapes:2,cachedTriangles:24,peakShapes:3,peakTriangles:36,shapeBuilds:4,maxSingleQueryTriangles:12,maxShapes:192,maxTriangles:65536,claimedCarriers:1,sourceParts:3,bodies:[{cachedShapes:2,cachedTriangles:24,peakCachedShapes:3,peakCachedTriangles:36,detailedColliders:3}]}}});
test('raw equality stays strict and each actual approved cache-counter difference is retained',()=>{
  const a=fixture(),b=structuredClone(a);assert.deepEqual(compareSharedMapHosts(a,b),{strictEqual:true,semanticEqual:true,differences:[]});
  b.navigation.collision.shapeBuilds=2;b.navigation.collision.bodies[0].peakCachedTriangles=48;
  const result=compareSharedMapHosts(a,b);assert.equal(result.strictEqual,false);assert.equal(result.semanticEqual,true);
  assert.deepEqual(result.differences.map(d=>[d.path,d.reference,d.candidate]),[['/navigation/collision/shapeBuilds',4,2],['/navigation/collision/bodies/0/peakCachedTriangles',36,48]]);
});
for(const [label,change]of [
  ['collision limit',b=>b.navigation.collision.maxShapes=1],
  ['claimed carrier count',b=>b.navigation.collision.claimedCarriers=2],
  ['detailed body collider',b=>b.navigation.collision.bodies[0].detailedColliders=4],
  ['portal state',b=>b.navigation.portalStates.front=true],
  ['stream readiness',b=>b.navigation.waitingForSection=true],
  ['actor health',b=>b.actors[0].hp=99],
  ['player position',b=>b.player.x=2.01],
  ['inventory',b=>b.player.inventory.matches=11],
  ['world clock',b=>b.clocks.world=2]
])test('an observational cache change cannot mask a changed '+label,()=>{
  const a=fixture(),b=structuredClone(a);b.navigation.collision.shapeBuilds=2;change(b);const result=compareSharedMapHosts(a,b);
  assert.equal(result.strictEqual,false);assert.equal(result.semanticEqual,false);assert.equal(result.differences.filter(d=>d.classification==='unexpected').length,1);
});
test('missing, malformed or relocated counters and changed body membership remain failures',()=>{
  for(const change of [b=>delete b.navigation.collision.cachedShapes,b=>b.navigation.collision.cachedShapes='2',b=>b.navigation.collision.cachedShapes=-1,b=>b.navigation.collision.bodies.push({...b.navigation.collision.bodies[0]}),b=>b.other={cachedShapes:3}]){
    const a=fixture(),b=structuredClone(a);change(b);assert.equal(compareSharedMapHosts(a,b).semanticEqual,false);
  }
});
