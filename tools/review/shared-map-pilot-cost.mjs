import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileSharedMapPilot} from '../../src/content/shared-map-pilot.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
const output=process.argv.find(s=>s.startsWith('--output='))?.slice(9);
assert.ok(output?.startsWith('artifacts/qa/shared-map-pilot/')&&!output.split('/').includes('..'));
assert.ok(!fs.existsSync(output),'Preserve previous measurement outputs');
const read=p=>JSON.parse(fs.readFileSync(p));
const pilotPath='assets/runtime/shared-map-pilots/new-york.json',pilot=read(pilotPath),navigation=read('assets/art/place-scenes/new-york/navigation.json');
const state={player:{id:'fixture',x:54.5,y:25.2,elevation:2.12,height:1.66,radius:.5,hp:100},actors:[],tick:0,generation:0,clocks:{world:0}};
let provider;const phases=[];try{
  const started=performance.now();provider=createSceneThermal({compiled:compileSharedMapPilot(pilot,navigation),state,definition:{...navigation,fireCellSize:.5},config:DEFAULT_CONFIG,event:()=>{}});
  const startupMs=performance.now()-started,idle=provider.diagnostics();
  provider.heatTool('matches',state.player,{x:54.5,y:26,h:3.02},DEFAULT_CONFIG.tools.matches);
  for(let i=0;i<135;i++){const before=performance.now();provider.step(1/30,(i+1)/30);phases.push(performance.now()-before);state.tick++;}
  const final=provider.diagnostics(),sorted=[...phases].sort((a,b)=>a-b);
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/counts.json',JSON.stringify({version:1,scope:'One 4.5-world-second direct source-contact CPU fixture, three active sources. Not representative whole-building performance, graphics, normal-input traversal or phone acceptance.',node:process.version,inputs:{pilotSha256:createHash('sha256').update(fs.readFileSync(pilotPath)).digest('hex')},startupMs,advanceMs:{mean:phases.reduce((a,b)=>a+b,0)/phases.length,p95:sorted[Math.floor((sorted.length-1)*.95)],max:sorted.at(-1)},idle,final,helpers:{ports:[],retained:false,stop:'Synchronous finite 135-step command; provider disposed in finally'}},null,2)+'\n');
  console.log(JSON.stringify({startupMs,idleCells:idle.gridCells,finalCells:final.gridCells,querySurfaces:final.query.querySurfaces,peakQueryShapes:final.query.peakShapes,peakQueryTriangles:final.query.peakTriangles,activeCarriers:final.carriers.activeCarriers,coldReserve:final.carriers.coldReserve,advanceMeanMs:phases.reduce((a,b)=>a+b,0)/phases.length,worldTime:final.nativeWorldTime}));
}finally{provider?.dispose();}
