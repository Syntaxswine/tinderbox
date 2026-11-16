import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compileCatalogueModules} from '../../src/content/catalogue-modules.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {traversalPlan,physicalDriver,walkRoundTrip,pairedOccupancyControls,unsupportedControl} from './house-traversal-controls.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{maxBuffer:96*1024*1024,windowsHide:true});
export function pinnedTraversalSource(commit){
  assert.match(commit||'',/^[a-f0-9]{40}$/,'A delivered full immutable artist commit is required');git('cat-file','-e',commit+'^{commit}');
  const records=[],read=relative=>{
    assert.ok(relative.startsWith('workbenches/')&&!relative.split('/').includes('..'),'Pinned source must stay inside the repository workbenches');
    const bytes=git('show',commit+':'+relative),working=fs.readFileSync(relative),normalized=Buffer.from(working.toString().replace(/\r\n/g,'\n'));
    assert.ok(working.equals(bytes)||normalized.equals(bytes),'Working source differs from the pinned intake: '+relative);
    records.push({path:relative,bytes:bytes.length,sha256:sha(bytes),workingBytes:working.length,workingSha256:sha(working),workingDifference:working.equals(bytes)?'none':'CRLF checkout only; normalized bytes exactly equal Git object'});return JSON.parse(bytes);
  };
  const manifestPath='workbenches/catalogue-modular/scene-data.json',manifest=read(manifestPath),sources=new Map();
  for(const instance of manifest.instances)if(!sources.has(instance.source))sources.set(instance.source,read(path.posix.normalize(path.posix.join(path.posix.dirname(manifestPath),instance.source))));
  const definition=scenarioDefinition('neighborhood'),compiled=compileCatalogueModules(manifest,sources,definition),plan=traversalPlan(compiled);
  return {commit,records,definition,compiled,plan};
}

export function physicalMatrix(){
  const cases=[{characterId:'bear',mode:'analog',magnitude:1,offset:0,regression:'bear-porch'},{characterId:'goat',mode:'analog',magnitude:1,offset:0,goatExitRegression:true,regression:'goat20mm-exit'}];
  for(const characterId of Object.keys(CHARACTER_PROFILES))for(const mode of ['keyboard','analog'])for(const magnitude of mode==='keyboard'?[1]:[1,.5,.2])for(const offset of [0,-.05,.05,-.1,.1]){
    if(cases.some(row=>!row.goatExitRegression&&row.characterId===characterId&&row.mode===mode&&row.magnitude===magnitude&&row.offset===offset))continue;
    cases.push({characterId,mode,magnitude,offset});
  }
  for(const characterId of Object.keys(CHARACTER_PROFILES))for(const control of ['pair-occupancy','unsupported'])cases.push({characterId,control});
  return cases.map((row,index)=>({index,...row,status:'not-run'}));
}

export function runPhysicalControls({source,output,lifetimeMs=900000,startedAt=Date.now()-Math.floor(process.uptime()*1000)}){
  const root=fs.realpathSync(process.cwd()),out=path.resolve(output);assert.ok(out.startsWith(path.join(root,'artifacts')+path.sep),'Evidence must remain in task-owned artifacts');assert.ok(!fs.existsSync(out),'Use a fresh evidence directory');fs.mkdirSync(out,{recursive:true});
  const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n'),started=startedAt,expires=started+Math.min(lifetimeMs,900000),matrix=physicalMatrix();
  const guard=()=>{if(Date.now()>=expires||fs.existsSync(path.join(out,'STOP')))throw Error('Physical-control deadline/STOP');};
  const scripts=['tools/review/house-traversal-physical.mjs','tools/review/house-traversal-controls.mjs'];
  for(const relative of scripts){const dest=path.join(out,'restart-source',relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(relative,dest);}
  save('source-pin.json',{artistCommit:source.commit,files:source.records,coderHead:git('rev-parse','HEAD').toString().trim(),scripts:scripts.map(p=>({path:p,sha256:sha(fs.readFileSync(p))})),bodies:CHARACTER_PROFILES,scope:'Pinned H15/shop physical sources through the actual Catalogue provider. No other lots, rendering, fire trajectory or wall-clock performance acceptance.'});
  const identity=process.platform==='win32'?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','$p=Get-Process -Id '+process.pid+';[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true})):{pid:process.pid,startedAt:new Date(started).toISOString(),executable:process.execPath};
  save('restart.json',{owner:'Coder Tinderbox',process:identity,project:'Tinderbox M28',purpose:'Short-lived pinned physical traversal and paired occupancy controls',startedAt:new Date(started).toISOString(),expiresAt:new Date(expires).toISOString(),cwd:root,executable:process.execPath,args:process.argv.slice(1),runtime:process.version,dependencies:'Repository-native ES modules and pinned vendored Three; no browser/server',inputs:source.records,sourceCommit:source.commit,outputs:out,automaticRestart:false,stop:'STOP file or in-loop wall deadline; finally disposes the current provider',ports:[]});
  save('plan.json',{route:source.plan.route,interpolatedStances:source.plan.interpolatedStances,front:source.plan.front,outsideIndex:source.plan.outside,insideIndex:source.plan.inside,flights:source.plan.flights,bodies:CHARACTER_PROFILES,matrix});
  let driver,current,rows=0,disposed=0;
  try{
    for(const item of matrix){
      guard();current=item;item.status='running';save('matrix.json',matrix);const startedCase=Date.now();
      driver=physicalDriver({...source,...item,guard,record:row=>{if(++rows>250000)throw Error('Finite evidence row bound exceeded');fs.appendFileSync(path.join(out,'frames.jsonl'),JSON.stringify({caseIndex:item.index,at:new Date().toISOString(),...row})+'\n');}});
      try{
        const result=item.control==='pair-occupancy'?pairedOccupancyControls(driver,source.plan):item.control==='unsupported'?unsupportedControl(driver,source.plan):walkRoundTrip(driver,source.plan,item);
        save('case-'+item.index+'.json',{case:item,result});item.status='passed';item.elapsedMs=Date.now()-startedCase;
      }catch(error){item.status='failed';item.error=error.message;save('first-failure.json',{case:item,error:error.stack,finding:error.finding,last:driver.snapshot()});throw error;}
      finally{driver.dispose();driver=null;disposed++;save('matrix.json',matrix);}
    }
    save('result.json',{pass:true,matrix,rows,scope:'Static source/body/support and public contextual-group physical controls; keyboard input is a quantized command model, not DOM input. Native physics advances for actual accepted door actions. Ordinary browser and world-clock acceptance remain separate.'});
  }catch(error){save('result.json',{pass:false,error:error.stack,current,matrix,rows});throw error;}
  finally{driver?.dispose();save('cleanup.json',{closedAt:new Date().toISOString(),disposedCases:disposed,remainingProviders:0,ports:[],processLifetime:'Synchronous short-lived checker; no retained helper'});}
  return {output:out,matrix};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const option=name=>process.argv.slice(2).find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3),commit=option('art-commit');
  const source=pinnedTraversalSource(commit),output=option('output')||'artifacts/qa/house-traversal-physical/'+commit.slice(0,12);
  const result=runPhysicalControls({source,output});console.log(JSON.stringify({output:result.output,passed:result.matrix.filter(c=>c.status==='passed').length}));
}
