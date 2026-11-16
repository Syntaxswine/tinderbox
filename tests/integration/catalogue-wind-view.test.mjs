import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {cataloguePresentationView} from '../../src/art/index.js';
import {createCameraCuller,hasBoundedHouseWind,houseEffectBounds} from '../../art/source/furnished-house/visibility.js';
import {createStreetFirelight} from '../../src/art/street-firelight.js';
import {ambientWind} from '../../workbenches/furnished-house/simulation.js';

const snapshot=()=>({player:{x:0,y:0,elevation:0,height:1.66,moduleOwner:'terrain'},diagnostics:{thermal:{wind:{kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false}}}});
test('production view forwards matching native wind, pose and camera; absent or untrusted metadata retains unknown bounds',()=>{
  const s=snapshot(),camera=new T.OrthographicCamera(-2,2,2,-2,.1,50),view=cataloguePresentationView(s,camera,ambientWind);
  assert.equal(view.camera,camera);assert.equal(view.sampleWind,ambientWind);assert.equal(view.windMetadata,s.diagnostics.thermal.wind);assert.equal(view.mode,'exterior');assert.equal(hasBoundedHouseWind(view),true);
  for(const p of [[0,0,0],[100,20,-50]])assert.deepEqual(ambientWind(...p),view.windMetadata.direction.map(v=>v*view.windMetadata.speed));
  s.player.moduleOwner='shop';s.player.elevation=2.12;const upper=cataloguePresentationView(s,camera,ambientWind);assert.equal(upper.mode,'cutaway');assert.equal(upper.level,1);assert.equal(upper.observer.y,2.12);
  delete s.diagnostics.thermal.wind;assert.equal(hasBoundedHouseWind(cataloguePresentationView(s,camera,ambientWind)),false);
  s.diagnostics.thermal.wind={kind:'unbounded-custom',speed:1.5,direction:[1,0,0]};assert.equal(hasBoundedHouseWind(cataloguePresentationView(s,camera,ambientWind)),false);
});

test('off-camera flame base cannot cull its independently visible smoke plume or canonical host light',()=>{
  const s=snapshot(),camera=new T.OrthographicCamera(-2,2,2,-2,.1,50);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const view=cataloguePresentationView(s,camera,ambientWind),cull=createCameraCuller(T,camera);
  const site={id:'outside-base',part:'floor',x:6,y:0,z:0,nx:0,ny:1,nz:0,exposed:true,flame:1,smoke:.5,area:1};
  assert.equal(hasBoundedHouseWind(view),true);assert.equal(cull(houseEffectBounds(site,'flames')),true);assert.equal(cull(houseEffectBounds(site,'smoke')),false);
  assert.equal(cull(null),false);assert.equal(createCameraCuller(T,null)(houseEffectBounds(site,'flames')),false);
  const light=createStreetFirelight(T);try{
    light.update({...s,world:{fireCellSize:.5},cells:Object.freeze([])},new Map([['shop',[site]]]),1);
    assert.equal(light.diagnostics().surfaceSites,1);assert.ok(light.diagnostics().lights.some(l=>l.intensity>0&&l.reach>6));
  }finally{light.dispose();}
});
