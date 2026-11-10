import test from 'node:test';
import assert from 'node:assert/strict';
import {configuration} from '../../src/simulation/config.js';
import {HeatField} from '../../src/simulation/field.js';
import {createRubbleHeat} from '../../src/simulation/rubble-heat.js';

test('an Ashland-sized source respects changing cover, cools after a short exposure and ignites only with sustained heat',()=>{
  const cover={id:'test-screen',x:6,y:5.5,width:.10,depth:1.5,height:2,material:'masonry'};
  const obstacles=[cover],grass={x:6.25,y:5.25},far={x:7.75,y:5.25};
  const def={width:12,height:12,fireCellSize:.5,obstacles,
    patches:[{x:6,y:5,width:.5,depth:.5,material:'grass'},{x:7.5,y:5,width:.5,depth:.5,material:'grass'}]};
  const config=configuration(),field=new HeatField(def,config,obstacles),rubble=createRubbleHeat(field);
  const building={id:'test-cottage',prefabId:'ashland-worker',x:5,y:5,quarterTurns:0};
  rubble.retire(building,1,0,0,.56);
  const events=[];
  let tick=0;
  const step=count=>{
    for(let i=0;i<count;i++){
      const time=++tick*config.step;
      field.step(config.step,time,(type,point,extra)=>events.push({type,...extra}),rubble.transfer(config.step,time));
    }
  };
  step(60);
  assert.equal(field.heatIndex(grass,0),0);
  cover.destroyed=true;
  step(15);
  const warm=field.at(grass).heat;
  assert.ok(warm>0&&warm<config.fire.ignition.grass);
  // A new box with the old ID covers the still-hot source immediately.
  obstacles.splice(0,1,{...cover,destroyed:false});
  step(60);
  assert.equal(field.at(grass).heat,0);
  assert.equal(field.at(grass).phase,'cold');
  assert.deepEqual(events,[]);
  obstacles.splice(0,1);
  step(240);
  const ignition=events.find(event=>event.type==='ignition');
  assert.equal(ignition?.cause,'rubble');
  assert.equal(ignition.sourceId,'test-cottage/section:0');
  assert.equal(ignition.cellId,field.at(grass).id);
  assert.equal(field.at(far).phase,'cold');
  step(1700);
  assert.equal(field.heatIndex(grass,0),0);
  assert.equal(field.heatIndex(far,0),0);
  assert.deepEqual(rubble.snapshot()[0].sections,[{index:0,retiredAt:0,retainedHeat:.56}]);
});
