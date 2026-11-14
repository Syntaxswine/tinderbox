import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createGrayboxData} from '../../workbenches/bell-and-alder-closing/graybox-data.js';

function run(commands,steps=1){const data=createGrayboxData();data.surfaces[0].fuelClass='lacquer';const trial=createTrial(data);for(const command of commands)trial.command(command);trial.step(steps);return trial;}
const match={type:'match',position:[1.2,.02,1.2],energy:1.05};
test('native evidence identifies one independently sufficient same-tick input, excluding mixed and prior heat',()=>{
  const trials=[run([match]),run([match,{...match,energy:.01}]),run([{...match,energy:.01,tick:1},{...match,tick:2}],2)];
  try{
    const positive=trials[0].events.find(e=>e.type==='ignition');assert.ok(positive.inputProof.independent);assert.equal(positive.inputProof.commandSequence,1);assert.equal(positive.inputProof.beforeEnergy,0);assert.equal(positive.inputProof.incomingEnergy,0);assert.equal(positive.inputProof.cellId,positive.burningCellId);
    assert.ok(trials[1].events.some(e=>e.type==='ignition'));assert.ok(trials[1].events.filter(e=>e.type==='ignition').every(e=>!e.inputProof));
    assert.ok(trials[2].events.some(e=>e.type==='ignition'));assert.ok(trials[2].events.filter(e=>e.type==='ignition').every(e=>!e.inputProof));
  }finally{for(const trial of trials)trial.dispose();}
});
