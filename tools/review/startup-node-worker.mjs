import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadCatalogueModules} from '../../src/runtime/catalogue-modules.js';
import {createSimulation} from '../../src/simulation/index.js';

const out=path.resolve(process.argv[2]),started=performance.now();let compiled,sim,first;
const phases=[],save=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
function phase(info){const record={...info,elapsedMs:performance.now()-started,memory:process.memoryUsage(),maxRSS:process.resourceUsage().maxRSS};phases.push(record);fs.appendFileSync(path.join(out,'node-phases.jsonl'),JSON.stringify(record)+'\n');if(fs.existsSync(path.join(out,'STOP')))throw Error('Owned startup probe STOP');}
// The owning parent records exact identity and arms the real deadline before GO.
await new Promise(resolve=>process.stdin.once('data',resolve));
try{
 phase({phase:'node-start'});
 compiled=await loadCatalogueModules({onLoadPhase:phase,fetcher:async url=>({ok:true,json:async()=>{const text=fs.readFileSync(url,'utf8');phase({phase:'source-text-loaded',source:path.basename(url.pathname),utf8Bytes:Buffer.byteLength(text)});return JSON.parse(text);}})});
 phase({phase:'host-simulation-begin'});sim=createSimulation({scenario:'neighborhood',seed:1893,characterId:'goat',catalogueModules:compiled,onLoadPhase:phase});phase({phase:'host-simulation-ready'});
 first=sim.snapshot();phase({phase:'initial-publication-ready'});
 const audit=sim.thermalAudit(),physical={boundaries:first.catalogueModules.boundaries.length,supports:first.catalogueModules.supports.length,items:first.catalogueModules.items.length,parts:first.catalogueModules.parts.length},quiet=[];
 for(let i=0;i<12;i++){const before=performance.now();sim.advance(1/60);quiet.push(performance.now()-before);}phase({phase:'quiet-ready'});
 // Measurement ends before hashing/export. Never stringify/gzip a world state.
 save('node-measured-phases.json',phases);const hash=createHash('sha256');
 function digest(value){if(value===null){hash.update('null;');return;}if(Array.isArray(value)){hash.update('[');for(const v of value)digest(v);hash.update(']');return;}if(typeof value==='object'){hash.update('{');for(const key of Object.keys(value)){hash.update(key+':');digest(value[key]);}hash.update('}');return;}hash.update(typeof value+':'+String(value)+';');}
 digest(compiled.data);const sourceDigest=hash.digest('hex');
 save('node-summary.json',{version:1,scope:'Cold Node24 source/physics; no WebGL or full snapshot export. Phase RSS/heap and platform maxRSS are not Safari/device limits.',physical,grid:audit.grid,groups:audit.groups,sourceConversions:audit.sourceConversions,profiles:first.diagnostics.thermal.profiles,sourceDigest,quietCpuMs:quiet,peakObservedRss:Math.max(...phases.map(p=>p.memory.rss)),peakObservedHeap:Math.max(...phases.map(p=>p.memory.heapUsed))});
 sim.dispose();first=null;compiled=null;global.gc?.();phase({phase:'disposed-handle-retained-gc'});sim=null;global.gc?.();phase({phase:'all-owned-handles-released-gc'});save('node-phases.json',phases);
}catch(error){save('node-failure.json',{stack:error.stack,phase:phases.at(-1)});throw error;}
finally{sim?.dispose();first=null;compiled=null;sim=null;save('node-cleanup.json',{closedAt:new Date().toISOString(),ports:[],simulationDisposed:true,phases:phases.length});process.stdin.destroy();}
