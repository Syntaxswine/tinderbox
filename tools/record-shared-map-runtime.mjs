import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const baseline='6d1061cd3ab7e6c9bff212381193376473413b30';
const sha=s=>createHash('sha256').update(s).digest('hex');
const lf=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true});
const lines=s=>s.trim().split(/\r?\n/).filter(Boolean);
const reasons={
  'src/main.js':'Select the shared New York engineering-pilot host and accepted Catalogue module; preserve explicit legacy, cottage and witness compatibility routes.',
  'src/art/fire.js':'Share the bounded source-ground field and its world origin with the common fire presentation.',
  'src/art/ground-field.js':'Limit source-map ground residue to a local 32 m field and actual ground-height cells.',
  'src/art/index.js':'Retain the sole native character, tools, night and six-light services while delegating source sections to the shared structural owner.',
  'src/art/tool-props.js':'End source-map pouring detail at the actual supported elevation and hide it while airborne.',
  'src/art/world.js':'Apply native elevation to existing NPC presentation.',
  'src/runtime/application.js':'Publish authoritative factory capabilities in active visit state.',
  'src/runtime/camera.js':'Keep source-map overview at original world bounds independently of player elevation.',
  'src/runtime/index.js':'Forward frozen capabilities and the shared map/picker to one gameplay/presentation core; dispose the compiled owner and callbacks.',
  'src/runtime/navigation.js':'Extract pure native movement/support/door queries; preserve diagnostic exploration clocks.',
  'src/runtime/sections.js':'Prepare owned source-section views before residency, preserve late-load cleanup and opt into bounded source overview.',
  'src/simulation/index.js':'Rehost sparse map data in the existing five-tool gameplay loop with native elevations and standard stock/clocks.',
  'src/simulation/config.js':'Resolve validated visit defaults once so New York camera and input share its front-side orientation; preserve global defaults.',
  'src/simulation/catalogue-thermal.js':'Compatibility entry delegates to the single scene-thermal provider; Catalogue remains the control.',
  'workbenches/furnished-house/geometry.js':'Extract the unchanged native gravity step and prevalidate atomic physical-index batches.',
  'workbenches/furnished-house/scene.js':'Stage sparse sources with the unchanged compiler/clipper/profiles, derive a separate local quantity envelope and preserve exact rigid door hardware.',
  'workbenches/furnished-house/simulation.js':'Commit native source batches without resetting heat/time; reuse native local support, inert falls, real rubble and pane retirement without fuel creation.',
  'workbenches/furnished-house/support.js':'Recognize shared-scene instance scope for the existing explicit native stair/support graph.',
  'tools/review/catalogue-browser.mjs':'Record task identity/deadline/server port before launch and verify cleanup even when browser launch fails; QA tooling only.'
};
const baselinePaths=new Set(lines(git('ls-tree','-r','--name-only',baseline)));
const changed=lines(git('diff','--name-only',baseline)).filter(p=>/^(src|tools|workbenches)\//.test(p)&&/\.(js|mjs)$/.test(p));
const runtimeFiles=changed.filter(p=>baselinePaths.has(p)).map(p=>{const reason=reasons[p]??(p.startsWith('src/ui/')?'Exact accepted UI capability intake 2c866a6b; presentation follows authoritative host state.':null);if(!reason)throw Error('Declare the runtime change reason: '+p);return {path:p,beforeLfSha256:sha(git('show',baseline+':'+p).replace(/\r\n/g,'\n')),afterLfSha256:sha(lf(p)),reason};});
const added=new Set([...changed.filter(p=>!baselinePaths.has(p)),...lines(git('ls-files','--others','--exclude-standard')).filter(p=>/^(src|tools|workbenches)\//.test(p)&&/\.(js|mjs)$/.test(p))]);
const frozenPath='docs/engineering/house-traversal/runtime-integration.json';
const packages=['assets/runtime/map-sources/new-york/index.json','assets/runtime/map-sources/new-york/library.json'];
const data={version:1,scope:'Source/CPU-checked New York engineering-pilot runtime/presentation candidate; no renderer, finished-map, other-landmark or Pages acceptance.',baselineCommit:baseline,sourceIntakes:{uiCapabilities:'2c866a6bf173e1549c54d34c124a9d055febda3d',uiPresentation:'47f87fb01fe922b1085c05e3082986c50b04a5c7',artistPilot:'59b9373f47d51531c7e505613f67dd1e426b37f1',artistComplete:'82b7fc604eb183d65e7569366c47f45e5f07c1b5',artistCheckerContext:'90c226f674d51a2d030fcdd4679e61a3bdd9ebfe',artistFirstSupportControls:'9a88959d2011d182377a9eeb95d5ed9d222e46b1'},frozenM28:{path:frozenPath,lfSha256:sha(lf(frozenPath))},runtimePackages:packages.map(p=>({path:p,bytes:fs.statSync(p).size,sha256:sha(fs.readFileSync(p))})),runtimeFiles,addedFiles:[...added].sort().map(p=>({path:p,lfSha256:sha(lf(p))}))};
const output='docs/engineering/shared-maps/runtime-integration.json',text=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check')){if(lf(output)!==text)throw Error('M29 runtime declaration is stale');}
else{fs.mkdirSync('docs/engineering/shared-maps',{recursive:true});fs.writeFileSync(output,text);}
console.log(JSON.stringify({runtimeFiles:runtimeFiles.length,addedFiles:added.size}));
