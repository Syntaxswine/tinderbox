import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const baseline='6d1061cd3ab7e6c9bff212381193376473413b30';
const sha=s=>createHash('sha256').update(s).digest('hex');
const lf=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true});
const lines=s=>s.trim().split(/\r?\n/).filter(Boolean);
const reasons={
  'src/main.js':'Select the accepted Catalogue module host by default; explicit legacy, cottage and witness query compatibility retained.',
  'src/runtime/application.js':'Publish authoritative factory capabilities in active visit state.',
  'src/runtime/index.js':'Forward the same frozen capabilities to UI and reject snapshot grants above the factory ceiling.',
  'src/runtime/navigation.js':'Extract pure native movement/support/door queries; preserve diagnostic exploration clocks.',
  'src/simulation/index.js':'Rehost sparse map data in the existing five-tool gameplay loop with native elevations and standard stock/clocks.',
  'src/simulation/catalogue-thermal.js':'Compatibility entry delegates to the single scene-thermal provider; Catalogue remains the control.',
  'workbenches/furnished-house/scene.js':'Install lazy inert queries, explicit sparse support bounds/ground policy and finite source coatings; coefficients unchanged.',
  'workbenches/furnished-house/simulation.js':'Exclude inert query publication copies; retain coatings with their parent in falls and exposed-face samples.',
  'workbenches/furnished-house/support.js':'Recognize shared-scene instance scope for the existing explicit native stair/support graph.'
};
const baselinePaths=new Set(lines(git('ls-tree','-r','--name-only',baseline)));
const changed=lines(git('diff','--name-only',baseline)).filter(p=>/^(src|tools|workbenches)\//.test(p)&&/\.(js|mjs)$/.test(p));
const runtimeFiles=changed.filter(p=>baselinePaths.has(p)).map(p=>({path:p,beforeLfSha256:sha(git('show',baseline+':'+p).replace(/\r\n/g,'\n')),afterLfSha256:sha(lf(p)),reason:reasons[p]??'Exact accepted UI capability intake 2c866a6b; presentation follows authoritative host state.'}));
const added=new Set([...changed.filter(p=>!baselinePaths.has(p)),...lines(git('ls-files','--others','--exclude-standard')).filter(p=>/^(src|tools)\//.test(p)&&/\.(js|mjs)$/.test(p))]);
const frozenPath='docs/engineering/house-traversal/runtime-integration.json';
const data={version:1,scope:'CPU/source checkpoint only; not a finished landmark gameplay map, renderer or Pages acceptance.',baselineCommit:baseline,sourceIntakes:{ui:'2c866a6bf173e1549c54d34c124a9d055febda3d',artist:'59b9373f47d51531c7e505613f67dd1e426b37f1'},frozenM28:{path:frozenPath,lfSha256:sha(lf(frozenPath))},runtimeFiles,addedFiles:[...added].sort().map(p=>({path:p,lfSha256:sha(lf(p))}))};
const output='docs/engineering/shared-maps/runtime-integration.json',text=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(output,'utf8')!==text)throw Error('M29 runtime declaration is stale');}
else{fs.mkdirSync('docs/engineering/shared-maps',{recursive:true});fs.writeFileSync(output,text);}
console.log(JSON.stringify({runtimeFiles:runtimeFiles.length,addedFiles:added.size}));
