import assert from 'node:assert/strict';

// A phone browser can contain a smaller game viewport. Measure both, retain
// their agreement and require useful scene space instead of equating the two.
export function checkSharedMapLayout(layout){
  assert.deepEqual(layout.browser,{width:844,height:390});
  const {canvas,metrics,player}=layout;
  for(const key of ['width','height'])assert.ok(Number.isFinite(canvas[key])&&Math.abs(metrics[key]-canvas[key])<=1,'Renderer and actual canvas DOM '+key+' must agree');
  assert.ok(canvas.width>0&&canvas.height>=300,'The short-landscape scene must have at least 300px of actual height');
  assert.ok(canvas.left>=0&&canvas.top>=0&&canvas.left+canvas.width<=844+1&&canvas.top+canvas.height<=390+1,'The canvas must stay inside the phone viewport');
  for(const point of [player.feet,player.center,player.head])assert.ok(point.visible&&point.x>=canvas.left&&point.x<=canvas.left+canvas.width&&point.y>=canvas.top&&point.y<=canvas.top+canvas.height,'The native body projection must fit the actual scene');
  assert.ok(Math.abs(player.head.y-player.feet.y)>=20,'The native body must remain readable at normal zoom');
  assert.equal(player.pointerTarget,'CANVAS','Input overlays must not intercept the native player center');
  return {browser:layout.browser,canvas,metrics,player,minSceneHeight:300,scope:'Measured DOM/projection/input guard; JPG review still establishes actual native-model visibility.'};
}
