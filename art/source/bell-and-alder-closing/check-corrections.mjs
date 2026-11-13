import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {compileScene} from '../../../workbenches/furnished-house/scene.js';
import {createNavigation} from '../../../workbenches/furnished-house/navigation.js';
import {CHARACTER_PROFILES} from '../../../src/content/characters.js';
import {CHICAGO_PATROL} from '../../../src/content/exterior-kit.js';
const raw=fs.readFileSync('workbenches/bell-and-alder-closing/scene-data.json'),d=JSON.parse(raw),A=d.closingTime.anchors;
function walk(nav,names){let points=0;for(const name of names){const target=A[name].position;for(let step=0;step<2000;step++){const s=nav.snapshot(),dx=target[0]-s.x,dz=target[2]-s.y,range=Math.hypot(dx,dz);if(range<.01&&Math.abs(s.elevation-target[1])<.03)break;if(range<1e-8)return {passed:false,anchor:name,reason:'Wrong support',at:s.position};const next=nav.move(dx/range,dz/range,Math.min(.02,range)/9);points++;if(next.lastBlock)return {passed:false,anchor:name,at:next.position,...next.lastBlock};if(step===1999)return {passed:false,anchor:name,reason:'Bounded timeout'};}}return {passed:true,samples:points};}
const checks=[];
for(const [profile,p]of [...Object.entries(CHARACTER_PROFILES),['native-civilian-officer',CHICAGO_PATROL]]){
 const scene=compileScene(d),trial={scene};
 const closed=createNavigation(trial,{...p,start:A.entryOutside.position}),closedResult=walk(closed,['entryInside']);
 for(const b of scene.index.surfaces.values())if(b.actualDoorPose)scene.poseDoor(b,1);
 const ground=createNavigation(trial,{...p,start:A.playerStart.position}),groundResult=walk(ground,['entryOutside','entryInside','shopAisle','aisleRear','lanternReach','shopAisle','entryInside','entryOutside','entryTurn','lanternSight','entryTurn','entryOutside','entryInside','heroStance','entryInside','entryOutside','entryTurn','directTurn','directStance','directTurn','entryTurn','entryOutside','entryInside','coverStance','entryInside','entryOutside','entryTurn','alleyApproach','stairFoot','alleyApproach','safeExit']);
 const service=createNavigation(trial,{...p,start:A.landing.position}),serviceResult=walk(service,['serviceOutside','serviceInside','upstairsHall','residentRest','upstairsHall','residentView','upstairsHall','serviceInside','serviceOutside','landing']);
 checks.push({profile,radius:p.radius,height:p.height,closedEntryBlocks:!closedResult.passed&&!!closedResult.id,ground:groundResult,service:serviceResult,passed:!closedResult.passed&&!!closedResult.id&&groundResult.passed&&serviceResult.passed});
}
const stance=A.directStance.position,strike=A.directStrike.position,planarRange=Math.hypot(stance[0]-strike[0],stance[2]-strike[2]);
const report={version:1,scope:'Changed ground routes, outer service hinges and match stance. Selected6m composed flight is separately checked by the full native preflight; original3c842b20 remains the unchanged diagnostic control.',dataSha256:createHash('sha256').update(raw).digest('hex'),checks,directControl:{stance,strike,planarRange,existingMatchReach:.85,withinPlanarReach:planarRange<=.85,runtimeContactQuery:'See direct-contact-query.json: unchanged runtime accepted the contact and ignited the finite lacquer finish'},stair:{rise:d.navigation.stair.rise,run:d.navigation.stair.run,going:d.navigation.stair.going,selectedComposedVariant:true},passed:checks.every(r=>r.passed)&&planarRange<=.85,limitations:['These changed-route cylinder checks do not establish full stair traversal or posed body/equipment clearance.']};fs.writeFileSync('docs/art/bell-and-alder-closing/correction-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
