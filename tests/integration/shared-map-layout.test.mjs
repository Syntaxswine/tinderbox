import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSharedMapLayout} from '../../tools/review/shared-map-layout.mjs';
const fixture=()=>({browser:{width:844,height:390},canvas:{left:0,top:30,width:844,height:304},metrics:{width:844,height:304},player:{feet:{visible:true,x:422,y:182},center:{visible:true,x:422,y:164},head:{visible:true,x:422,y:146},pointerTarget:'CANVAS'}});
test('a useful real canvas can differ from its phone browser while renderer, native projection and input agree',()=>{const layout=fixture();assert.equal(checkSharedMapLayout(layout).canvas.height,304);});
test('matching renderer dimensions do not waive the original 114px scene-height failure',()=>{const layout=fixture();layout.canvas.top=70;layout.canvas.height=114;layout.metrics.height=114;assert.throws(()=>checkSharedMapLayout(layout),/at least 300px/);});
test('a full-size metrics assertion cannot hide a smaller actual DOM canvas',()=>{const layout=fixture();layout.metrics.height=390;assert.throws(()=>checkSharedMapLayout(layout),/actual canvas DOM height/);});
test('visible projection alone does not waive a control intercepting the player center or an unreadably small body',()=>{const layout=fixture();layout.player.pointerTarget='BUTTON';assert.throws(()=>checkSharedMapLayout(layout),/intercept/);layout.player.pointerTarget='CANVAS';layout.player.head.y=layout.player.feet.y-8;assert.throws(()=>checkSharedMapLayout(layout),/readable/);});
