import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {COTTAGE_PAIR_SCENARIO} from '../../src/content/cottage-pair.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {calmCottageWind} from '../../src/reuse/ashland/wind.js';

const {step, fire, fuel} = DEFAULT_CONFIG;
const {id: hopkinsId, ...hopkins} = NEIGHBORHOOD_SCENARIO.buildings.find(building => building.id === 'hopkins-nine');
const patch = (x, y, material) => ({x, y, width: .5, depth: .5, material});
const gasLine = (x, y, passes) => ({from: {x: x + .01, y: y + .25}, to: {x: x + .49, y: y + .25}, litresPerMetre: passes * fuel.gasPerMetre});
const wall = (x, y) => ({id: 'screen', x, y, width: .04, depth: 2, height: 2, material: 'masonry'});
const findCell = (snapshot, id) => snapshot.cells.find(cell => cell.id === id);
const action = snapshot => snapshot.events.findLast(event => event.type === 'tool-use');
const round = value => value === null ? null : +value.toFixed(4);
const porchHouse = {id:'h12',prefabId:'hopkins-4-12',x:10,y:10,quarterTurns:0};
const porchScene = extra => ({id:'neighborhood',width:28,height:24,buildings:[porchHouse],obstacles:[],actors:[],
  player:{x:25,y:22,tool:'matches'},...extra});
const fireOnly = scenario => createSimulation({scenario,config:{fire:{damagePerSecond:0}}});
function press(sim) {
  sim.dispatch({type: 'primary', pressed: false});
  sim.dispatch({type: 'primary', pressed: true});
  return sim.advance(step);
}

test('every contacted half-metre of the native Hopkins frontage couples at its original depth strength', () => {
  for (const [col, rows, tick] of [[20,[68,69,70,71,72,73,74,75],76],[21,[68,69],104]]) {
    for (const row of rows) {
      const x=col*.5,y=row*.5;
      const sim=fireOnly({id:'neighborhood',width:16,height:44,buildings:[{id:hopkinsId,...hopkins}],
        player:{x:14,y:20},fuelLines:[gasLine(x,y,4)],ignitions:[{x:x+.25,y:y+.25,heat:3,radius:.01}]});
      try {
        let s=sim.snapshot(),first;
        for(let n=0;n<10&&!first;n++){
          s=sim.advance(.25);
          first=s.events.find(event=>event.type==='structure-ignition');
        }
        assert.equal(first?.cause,'ground-heat',`cell:${col},${row}`);
        assert.equal(first.parentSiteId,`cell:${col},${row}`);
        assert.equal(first.tick,tick);
      } finally {sim.dispose();}
    }
  }
});

test('real lawn fire heats the native porch and stairs, and a ground contact can warm the exposed post', () => {
  const lawn=fireOnly(porchScene({patches:[{x:9,y:4,width:10,depth:4,material:'grass'}],
    ignitions:[{x:14.25,y:5.25,heat:3,radius:.05}]}));
  const post=fireOnly(porchScene({fuelLines:[gasLine(10,7.5,4)],
    ignitions:[{x:10.25,y:7.75,heat:3,radius:.01}]}));
  try {
    let s;
    for(let n=0;n<10;n++)s=lawn.advance(.25);
    for(const [id,tick] of [['h12/deck:stairs',111],['h12/deck:porch',117]]){
      const event=s.events.find(event=>event.type==='structure-ignition'&&event.siteId===id);
      assert.equal(event?.cause,'ground-heat');
      assert.equal(event.tick,tick);
      assert.ok(event.parentSiteId.startsWith('cell:'));
    }
    const warm=post.advance(.25);
    assert.ok(!warm.events.some(event=>event.type==='structure-ignition'));
    const postSample=warm.structureFire.find(site=>site.id==='h12/porch-post');
    assert.ok(postSample?.heatFraction>0&&postSample.ignitionTime===null);
  } finally {lawn.dispose();post.dispose();}
});

test('the clipped facing cone lights low porch fuel only while it is visible and in range', () => {
  const screen={id:'short-porch-screen',x:12.5,y:7.3,width:6,depth:.08,height:.30,material:'masonry'};
  const cases=[
    {x:12.5,y:6.2,heading:Math.PI/2,target:'porch'},
    {x:15.5,y:5.9,heading:Math.PI/2,target:'stairs'},
    {x:12.5,y:6.2,heading:Math.PI/2,screen},
    {x:12.5,y:6.2,heading:-Math.PI/2},
    {x:12.5,y:3,heading:Math.PI/2}
  ];
  for(const {x,y,heading,target,screen:cover} of cases){
    const sim=fireOnly(porchScene({player:{x,y,heading,tool:'flamethrower'},obstacles:cover?[cover]:[]}));
    try {
      sim.dispatch({type:'aim',x,y:9,hover:true});
      sim.dispatch({type:'primary',pressed:true});
      const s=sim.advance(.25);
      assert.equal(s.discharge.range,DEFAULT_CONFIG.tools.flamethrower.range);
      assert.ok(s.discharge.rays.every(ray=>ray.h===DEFAULT_CONFIG.tools.presentationHeight));
      const ignitions=s.events.filter(event=>event.type==='structure-ignition');
      if(target){
        assert.ok(s.discharge.rays.some(ray=>ray.obstacleId==='h12:'+target));
        assert.deepEqual(ignitions.map(event=>[event.siteId,event.cause]),[['h12/deck:'+target,'flamethrower']]);
      }else{
        assert.deepEqual(ignitions,[]);
        assert.deepEqual(s.structureFire,[]);
        if(cover)assert.ok(s.discharge.rays.some(ray=>ray.obstacleId===cover.id));
      }
    } finally {sim.dispose();}
  }
});

test('ordinary siding can ignite adjacent lawn while the same fuel across bare ground stays cold', () => {
  for(const gap of [0,1.5]){
    const sim=fireOnly(porchScene({patches:[{x:6-gap,y:9,width:4,depth:10,material:'grass'}],
      player:{x:18.82,y:13.5,heading:Math.PI,tool:'matches'}}));
    try {
      sim.dispatch({type:'aim',x:17.9,y:13.5});
      let s=press(sim),first;
      assert.equal(action(s)?.result,'ignited');
      assert.ok(action(s).cellIds[0].startsWith('h12/wall:'));
      sim.dispatch({type:'primary',pressed:false});
      for(let n=0;n<64&&!first;n++){
        s=sim.advance(.25);
        first=s.events.find(event=>event.type==='ignition');
      }
      if(gap)assert.equal(first,undefined);
      else assert.equal(first?.cause,'structure-siding');
    } finally {sim.dispose();}
  }
});

function trace({kind, shielded = false, cottage = false, passes = 4}) {
  const x = cottage ? 52.5 : 10.5, y = cottage ? 13.5 : 34.5;
  const sourceId = cottage ? 'cell:105,27' : 'cell:21,69';
  const receiverId = cottage ? 'right:3,0' : 'hopkins-nine/wall:0:7,4|7,5:0';
  const base = cottage ? COTTAGE_PAIR_SCENARIO : {id: 'neighborhood', width: 16, height: 44,
    buildings: [{id: hopkinsId, ...hopkins}]};
  const scenario = {...base, patches: kind === 'gas' ? [] : [patch(x, y, kind)],
    obstacles: shielded ? [wall(x - .01, y + .25)] : [], pickups: [], actors: [],
    player: {x: x + 1.2, y: y + .25, tool: 'torch'}, fuelLines: kind === 'gas' ? [gasLine(x, y, passes)] : []};
  const sim = createSimulation({scenario, cottageWind: calmCottageWind, config: {fire: {damagePerSecond: 0}}});
  const threshold = cottage ? sim.snapshot().cottageFire.diagnostics.sidingIgnitionHeat : fire.ignition.wood;
  let start = null, end = null, arrival = null, ignitionHeat = null, peak = 0, peakTime = null, cooled = null, final = 0;
  try {
    const lit = press(sim);
    assert.equal(action(lit).result, 'lit');
    assert.ok(lit.cells.every(cell => cell.heat === 0));
    sim.dispatch({type: 'aim', x: x + .44, y: y + .25});
    let snapshot = press(sim);
    assert.deepEqual(action(snapshot).cellIds, [sourceId], 'only the real source is lit by the tool');
    const interval = .05;
    for (let i = 0; i <= 15 / interval; i++) {
      const source = findCell(snapshot, sourceId), time = snapshot.clocks.world;
      const sourceStart = snapshot.events.find(event => event.type === 'ignition' && event.cellId === sourceId);
      const sourceEnd = snapshot.events.find(event => event.type === 'burnout' && event.cellId === sourceId);
      if (start === null && sourceStart) start = sourceStart.tick * step;
      if (end === null && sourceEnd) end = sourceEnd.tick * step;
      const first = cottage ? snapshot.events.find(event => event.type === 'cottage-ignition' && event.buildingId === 'ashland-cottage')
        : snapshot.events.find(event => event.type === 'structure-ignition' && event.siteId === receiverId);
      const sample = snapshot.structureFire.find(site => site.id === receiverId && site.ignitionTime === null);
      const heating = cottage ? snapshot.cottageFire.diagnostics.warmingSiding?.find(site => site.cellId === receiverId)?.heat
        : (sample?.heatFraction ?? 0) * threshold;
      if (first && arrival === null) {
        assert.equal(first.cellId ?? first.siteId, receiverId);
        if (!cottage) assert.equal(first.parentSiteId, sourceId);
        arrival = first.worldTime;
        ignitionHeat = first.heat;
      }
      if (arrival === null && (heating ?? 0) > peak) { peak = heating; peakTime = time; }
      final = heating ?? 0;
      if (arrival === null && peak > 0 && end !== null && final < .001) cooled ??= time;
      assert.ok(source.surfaceFuel >= 0 && source.depositedFuel >= 0);
      if (i < 15 / interval) snapshot = sim.advance(interval);
    }
    assert.ok(start !== null && end !== null && end > start, 'finite source ignited and burnt out');
    return {kind, shielded, sourceId, receiverId, sourceDuration: round(end - start), threshold,
      peakBeforeIgnition: round(peak), peakAfter: round(peakTime === null ? null : peakTime - start),
      receiverIgnition: round(arrival === null ? null : arrival - start), ignitionHeat: round(ignitionHeat),
      cooledAfter: round(cooled === null ? null : cooled - start), finalHeat: arrival === null ? round(final) : null};
  } finally { sim.dispose(); }
}

test('real Hopkins siding warms and cools beside one grass flame, then catches from stronger gas or timber', t => {
  const grass = trace({kind: 'grass'}), gas = trace({kind: 'gas'}), timber = trace({kind: 'wood'}), blocked = trace({kind: 'gas', shielded: true});
  t.diagnostic(JSON.stringify({grass, gas, timber, blocked}));
  assert.equal(grass.receiverIgnition, null);
  assert.ok(grass.peakBeforeIgnition > .05 && grass.peakBeforeIgnition < grass.threshold);
  assert.equal(grass.finalHeat, 0);
  assert.ok(grass.cooledAfter > grass.sourceDuration);
  for (const hotter of [gas, timber]) {
    assert.ok(hotter.receiverIgnition > 0 && hotter.receiverIgnition < hotter.sourceDuration);
    assert.ok(hotter.ignitionHeat >= hotter.threshold);
  }
  assert.ok(timber.sourceDuration > gas.sourceDuration && gas.sourceDuration > grass.sourceDuration);
  assert.equal(blocked.receiverIgnition, null);
  assert.equal(blocked.peakBeforeIgnition, 0);
});

test('the native Ashland siding uses finite grass and gas exposure through the same outward contact', t => {
  const grass = trace({kind: 'grass', cottage: true}), shortGas = trace({kind: 'gas', cottage: true, passes: .5});
  const gas = trace({kind: 'gas', cottage: true}), blocked = trace({kind: 'gas', shielded: true, cottage: true});
  t.diagnostic(JSON.stringify({grass, shortGas, gas, blocked}));
  assert.equal(grass.receiverIgnition, null);
  assert.ok(grass.peakBeforeIgnition > .015 && grass.peakBeforeIgnition < grass.threshold);
  assert.equal(grass.finalHeat, 0);
  assert.ok(grass.cooledAfter > grass.sourceDuration);
  assert.equal(shortGas.receiverIgnition, null);
  assert.ok(shortGas.peakBeforeIgnition > grass.peakBeforeIgnition && shortGas.peakBeforeIgnition < shortGas.threshold);
  assert.equal(shortGas.finalHeat, 0);
  assert.ok(shortGas.cooledAfter > shortGas.sourceDuration);
  assert.ok(gas.receiverIgnition > 0 && gas.receiverIgnition < gas.sourceDuration);
  assert.ok(gas.ignitionHeat >= gas.threshold);
  assert.equal(blocked.receiverIgnition, null);
  assert.equal(blocked.peakBeforeIgnition, 0);
});

test('lit Ashland siding transfers heat into existing exterior grass, with no new fuel in the paved gap', () => {
  const scenario = {...COTTAGE_PAIR_SCENARIO, patches: [...COTTAGE_PAIR_SCENARIO.patches, patch(52.5, 13.5, 'grass')]};
  const sim = createSimulation({scenario, cottageWind: calmCottageWind});
  try {
    const struck = press(sim);
    assert.deepEqual(action(struck).cellIds, ['right:3,0']);
    assert.equal(findCell(struck, 'cell:105,27').heat, 0);
    let snapshot = struck;
    for (let i = 0; i < 20; i++) {
      snapshot = sim.advance(.25);
      if (snapshot.events.some(event => event.type === 'ignition' && event.cellId === 'cell:105,27')) break;
    }
    const ignition = snapshot.events.find(event => event.type === 'ignition' && event.cellId === 'cell:105,27');
    assert.equal(ignition?.cause, 'cottage-siding');
    assert.equal(snapshot.diagnostics.fuel.burnedDepositedFuel, 0);
    assert.equal(snapshot.cottageFire.buildings[1].firstIgnition, null);
    assert.ok(snapshot.cells.filter(cell => cell.material === 'paving').every(cell => cell.surfaceFuel === 0 && cell.depositedFuel === 0));
  } finally { sim.dispose(); }
});
