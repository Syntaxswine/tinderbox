import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIN_GEARS,trainDetent,trainGearOf} from '../../src/ui/train-control-model.js';
import {createTrainClick} from '../../src/ui/train-click.js';

test('train lever has exactly two forward stops, neutral and reverse',()=>{
  assert.deepEqual(TRAIN_GEARS.map(gear=>[gear.direction,gear.power]),[['forward',1],['forward',.5],['neutral',0],['reverse',.5]]);
  assert.equal(trainGearOf({direction:'forward',power:.5,brake:0}),1);
  assert.equal(trainGearOf({direction:'forward',power:1,brake:0}),0);
  assert.equal(trainGearOf({direction:'reverse',power:.5,brake:0}),3);
  assert.equal(trainGearOf({direction:'forward',power:1,brake:1}),2);
});

test('a lever notch resists midpoint jitter and snaps after crossing its detent',()=>{
  assert.equal(trainDetent(1.5,2),2);
  assert.equal(trainDetent(1.39,2),2);
  assert.equal(trainDetent(1.37,2),1);
  assert.equal(trainDetent(1.61,1),1);
  assert.equal(trainDetent(1.63,1),2);
  assert.equal(trainDetent(-1,2),0);
  assert.equal(trainDetent(5,0),3);
});

test('gear click needs an unlocked audio context, obeys mute and closes its owned context',()=>{
  const sounds=[];let closed=0,disconnected=0;
  const parameter=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.destination={};}
    createOscillator(){const source={frequency:parameter(),connect(){},disconnect(){disconnected++;},start(){sounds.push(source);},stop(){}};return source;}
    createGain(){return {gain:parameter(),connect(){},disconnect(){disconnected++;}};}
    close(){closed++;return Promise.resolve();}
  }
  const audio=createTrainClick({AudioContext});
  assert.equal(audio.click(),false);audio.unlock({isTrusted:false});assert.equal(audio.click(),false);
  audio.unlock({isTrusted:true});assert.equal(audio.click(),true);assert.equal(sounds.length,1);
  audio.setMuted(true);assert.equal(audio.click(),false);
  audio.setMuted(false);assert.equal(audio.click(),true);
  audio.dispose();assert.equal(closed,1);assert.equal(audio.click(),false);assert.ok(disconnected>=4);
});
