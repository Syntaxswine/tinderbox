import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createTrial} from '../furnished-house/simulation.js';
import {createNavigation} from '../furnished-house/navigation.js';
import {bounds} from '../furnished-house/geometry.js';
const pin='3c842b20aa9ebc8f0ec0b447282cfd17f9d6e2e1',raw=execFileSync('git',['show',pin+':workbenches/bell-and-alder-closing/scene-data.json'],{maxBuffer:64*1024*1024,windowsHide:true}),data=JSON.parse(raw),records=[];
for(const [name,radius,height]of [['goat',.5,1.66],['bear',.56,1.68],['native-civilian',.62,1.7]]){
  const trial=createTrial(data),nav=createNavigation(trial,{radius,height,maxStep:.22,start:data.closingTime.anchors.stairFoot.position}),probes=[];
  const treads=['01','02','03'].map(n=>{const s=data.surfaces.find(s=>s.id==='stair/tread-'+n);return {id:s.id,elevation:Math.max(...s.triangles.flat().map(p=>p[1])),bounds:bounds(s.triangles.flat())};});
  try{for(let n=0;n<80;n++){
    const before=nav.snapshot(),proposed=[before.x,before.elevation,before.y-.02],centreSupport=nav.support(proposed,before.elevation),to=[proposed[0],centreSupport?.y??before.elevation,proposed[2]],near=trial.scene.index.candidates({min:[to[0]-radius,Math.min(before.elevation,to[1])-.2,to[2]-radius],max:[to[0]+radius,Math.max(before.elevation,to[1])+.5,to[2]+radius]}),onStairs=near.some(s=>s.intact&&['stair-tread','entry-step'].includes(s.supportType)),low=(onStairs?Math.max(before.elevation,to[1]):Math.min(before.elevation,to[1]))+(onStairs?.45:.025),high=Math.max(before.elevation,to[1])+height-1e-7;
    const footprintProbes=[0,.125,.25,.375,.5,radius].filter((v,i,a)=>v<=radius&&a.indexOf(v)===i).map(forward=>{const p=[to[0],to[1],to[2]-forward],s=nav.support(p,before.elevation);return {forward,point:p,support:s,insideNativeFootprint:forward<=radius};});
    const moved=nav.move(0,-1,.02/9),record={previous:before.position,proposed:to,previousSupport:nav.support(before.position,before.elevation),centreSupport,low,high,onStairs,footprintProbes,actual:moved.position,block:moved.lastBlock};probes.push(record);
    if(moved.lastBlock){const first=footprintProbes.find(p=>p.support?.id.startsWith('stair/tread-01')&&p.support.y-before.elevation<=.22);record.reachableFirstStep=first||null;if(first){const alternate=[to[0],first.support.y,to[2]];record.diagnosticOnly={proposedFirstStep:alternate,low:Math.max(before.elevation,alternate[1])+.45,high:Math.max(before.elevation,alternate[1])+height-1e-7,clearWithSameNativeBody:nav.clear(before.position,alternate),note:'Pure clearance probe, not accepted movement. Centre still has ground bearing; footprint support is outside the current centre-only adapter policy.'};}break;}
    if(moved.elevation>.17&&moved.y<=6.875)break;
  }records.push({name,radius,height,maxStep:.22,gaitClearance:.45,treads,probes,final:nav.snapshot()});}finally{trial.dispose();}
}
const report={version:1,artistCommit:pin,dataSha256:createHash('sha256').update(raw).digest('hex'),createdAt:new Date().toISOString(),scope:'Unchanged3m/12-tread flight, cold geometry only; no authored movement or collision policy changes.',records,interpretation:'Compare centreSupport, reachableFirstStep and diagnosticOnly at the blocked contact. A reachable tread inside a body footprint does not itself authorize raising an unsupported centre or chaining steps; that would require its own gap/high-obstacle/ceiling/descent controls. A longer native stair variant can preserve conservative centre-bearing semantics, but is not proof the original source scale was wrong.'};
const target=path.resolve(process.argv[2]||'artifacts/qa/bell-and-alder-closing/preflight/original3m-stair-diagnostic.json');if(!target.startsWith(path.join(process.cwd(),'artifacts')+path.sep))throw Error('Evidence must stay under artifacts');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,records:records.map(r=>({...r,probes:r.probes.slice(-2)}))}));
