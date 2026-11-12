import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createTrial} from './simulation.js';
import {createNavigation} from './navigation.js';

const raw=fs.readFileSync(new URL('./house-data.json',import.meta.url)),data=JSON.parse(raw),entry=data.openings.find(o=>o.entry),route=data.navigation.prototypeRoute,centreX=route[0][0],profile={radius:.5,height:1.66,maxStep:.22};
const trial=createTrial(data),nav=createNavigation(trial,{...profile,start:[centreX,trial.scene.groundY,-3.8]}),pathPoints=[],arrivals=[],failures=[];
function walk(target) {
  for(let i=0;i<3000;i++) {
    const from=nav.snapshot(),dx=target[0]-from.x,dz=target[2]-from.y,distance=Math.hypot(dx,dz);if(distance<1e-7)return true;
    const step=Math.min(.02,distance),next=nav.move(dx/distance,dz/distance,step/9);pathPoints.push({position:next.position,heading:next.heading,travelled:next.travelled});
    if(next.lastBlock){failures.push({target,from:from.position,at:next.position,...next.lastBlock});return false;}
  }
  throw Error('Route step bound exceeded');
}
// Closed control is separate from the continuous open walk. No mid-route
// placement or collision suppression establishes the accepted route.
const closedTrial=createTrial(data),closedNav=createNavigation(closedTrial,{...profile,start:[centreX,.48,-.8]});
let closedBlock=null;for(let i=0;i<150;i++){const state=closedNav.move(0,1,.02/9);if(state.lastBlock){closedBlock=state.lastBlock;break;}}const blocker=closedBlock&&closedTrial.scene.index.surfaces.get(closedBlock.id),closedPass=!!closedBlock&&blocker?.openingId===entry.id;closedTrial.dispose();
for(const o of data.openings.filter(o=>o.entry||o.prototypeAdapted))trial.command({type:'opening',id:o.id,open:true});trial.step();
for(const target of route){if(!walk(target))break;arrivals.push({target,actual:nav.snapshot().position});}
const ascentPassed=arrivals.length===route.length;let reversePassed=false;
if(ascentPassed){reversePassed=true;for(const target of [...route].reverse()){if(!walk(target)){reversePassed=false;break;}}if(reversePassed)reversePassed=walk([centreX,0,-3.8]);}
const report={version:1,sourceDataSha256:createHash('sha256').update(raw).digest('hex'),runtimeAdapterVersion:trial.scene.data.runtimeAdapterVersion,profile,movementMetresPerSecond:9,maximumHorizontalStep:.02,closedEntry:{passed:closedPass,block:closedBlock},ascentPassed,reversePassed,waypoints:route.length,arrivals,failures,final:nav.snapshot(),path:pathPoints,support:trial.supportGraph.diagnostics(),passed:closedPass&&ascentPassed&&reversePassed};
if(process.argv[2]){const target=path.resolve(process.argv[2]);if(!target.startsWith(process.cwd()+path.sep))throw Error('Evidence must stay in this checkout');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,path:undefined,arrivals:undefined,support:{...report.support,stairFlight:undefined}}));trial.dispose();if(!report.passed)process.exitCode=1;
