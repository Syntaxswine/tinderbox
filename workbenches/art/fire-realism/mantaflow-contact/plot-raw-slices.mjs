/** Fixed scientific field slices. No renderer, solver, threshold or fire art. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openRawFields} from './read-fields.mjs';
import {createContactSourceClock} from '../../../../assets/art/fire-realism/fluid-contact/source-clock.js';
const sourcePath=process.argv[2];if(!sourcePath||process.argv.length!==3)throw Error('Usage: node --experimental-vm-modules plot-raw-slices.mjs ACTUAL/raw-manifest.json');
if(!vm.SourceTextModule)throw Error('Use --experimental-vm-modules');
const source=openRawFields(sourcePath),sha=b=>createHash('sha256').update(b).digest('hex'),here=path.dirname(fileURLToPath(import.meta.url)),output=path.join(here,'diagnostic-slices');
if(source.manifestSha256!=='2b4ee8b0728f0d6c21fade690770ada1bfc0bf817d2af86000a9fd346105ea59'||fs.existsSync(output))throw Error('Expected unchanged actual source and fresh diagnostic output');
const sourceCommit='aca30cd910a326918b1599ce6665803cf64739e0',modules=new Map(),sourceHashes={};
function frozen(file){if(!modules.has(file)){const bytes=execFileSync('git',['show',sourceCommit+':'+file],{maxBuffer:1024*1024});sourceHashes[file]=sha(bytes);modules.set(file,new vm.SourceTextModule(bytes.toString('utf8'),{identifier:file}));}return modules.get(file);}
const engine=frozen('tools/fire-realism/scenarios.js');await engine.link((specifier,parent)=>frozen(path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier),specifier))));await engine.evaluate();
const simulation=engine.namespace.createFireReviewSimulation({scenario:'match-contact',seed:1893,characterId:'bear'}),clock=createContactSourceClock(),phases=[];let ignitionWorld=null,ignitions=[];
try{for(let tick=1;tick<=120;tick++){
 simulation.advance();if(tick!==1&&![30,60,120].includes(tick))continue;
 const snapshot=simulation.snapshot();if(tick===1){ignitionWorld=snapshot.clocks.world;ignitions=snapshot.events.filter(e=>e.type==='ignition');if(ignitions.length!==4||ignitions.some(e=>e.tick!==1))throw Error('Canonical ignition changed');}
 const input={...snapshot,worldTime:snapshot.clocks.world,eventReceipts:{generation:0,primed:true,reset:false,highestId:snapshot.events.at(-1)?.id??null,events:tick===1?ignitions.map(e=>({...e,receivedWorldTime:ignitionWorld})):[]},discharge:{active:false},torch:{phase:'unlit'},buildingVisuals:[]};
 const state=clock.update(input);if(tick!==1)phases.push({nativeFrame:tick,tick:snapshot.tick,worldTime:snapshot.clocks.world,observedIgnitionWorldTime:ignitionWorld,sourceAge:state.age,sample0:state.sample0,sample1:state.sample1,cacheFrames:[state.sample0+1,state.sample1+1],mix:state.mix,gpuUniformMix:Math.fround(state.mix),sourceIds:state.sourceIds,reactionGain:state.reactionGain});
}}finally{simulation.dispose();}
const heights=[6,11,27],channels=[{name:'flame',range:[0,1],unit:'uncalibrated flame proxy',palette:'fixed linear grayscale'},{name:'temperature',range:[0,3],unit:'uncalibrated solver temperature proxy (NOT kelvin)',palette:'fixed linear purple/teal/yellow'}],grid=source.grid,[nx,ny]=grid.resolution;
if(nx!==48||ny!==48||phases.some((p,i)=>p.cacheFrames[0]!==[15,30,60][i]))throw Error('Phase clocks/grid no longer match the declared diagnostic');
const color=(channel,value)=>{
 const u=Math.max(0,Math.min(1,value/channel.range[1]));if(channel.name==='flame'){const v=Math.round(u*255);return `rgb(${v},${v},${v})`;}
 const colors=[[68,1,84],[33,145,140],[253,231,37]],segment=u<.5?0:1,t=u<.5?u*2:u*2-1;return 'rgb('+colors[segment].map((v,k)=>Math.round(v+(colors[segment+1][k]-v)*t)).join(',')+')';
};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
function figure(phase){
 const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1300" viewBox="0 0 1100 1300"><rect width="1100" height="1300" fill="white"/><g font-family="Arial,sans-serif" fill="#111">`,
 `<text x="35" y="32" font-size="22">RAW scalar slices — native phase ${phase.nativeFrame} (not a fire rendering)</text>`,
 `<text x="35" y="57" font-size="14">World ${phase.worldTime} − observed ignition ${phase.observedIgnitionWorldTime} = age ${phase.sourceAge} s</text>`,
 `<text x="35" y="79" font-size="14">Cache frames ${phase.cacheFrames.join(' / ')}; mix ${phase.mix}; fixed scales: flame 0–1, temperature 0–3 (uncalibrated solver proxy, NOT kelvin)</text>`,
 `<text x="35" y="101" font-size="13">Full 48×48 planes; no mask, optical mapping, phase normalization, smoothing or scalar threshold. Dashed square: real fuel footprint.</text>`];
 for(let row=0;row<3;row++)for(let col=0;col<2;col++){
  const field=phase.fields[col],slice=field.slices[row],left=72+col*542,top=146+row*374,size=288,cell=size/nx;
  parts.push(`<text x="${left}" y="${top-13}" font-size="16">${escape(field.name)} — measured height ${slice.height.toFixed(8)} m (index ${slice.zIndex})</text>`);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)parts.push(`<rect x="${left+x*cell}" y="${top+(ny-1-y)*cell}" width="${cell}" height="${cell}" fill="${color(field,slice.values[x+nx*y])}"/>`);
  parts.push(`<rect x="${left}" y="${top}" width="${size}" height="${size}" fill="none" stroke="#222"/>`,
  `<rect x="${left+size/4}" y="${top+size/4}" width="${size/2}" height="${size/2}" fill="none" stroke="${col===0?'#fa5555':'#fff'}" stroke-width="1.3" stroke-dasharray="5 4"/>`);
  for(const tick of [-1,-.5,0,.5,1]){const px=left+(tick+1)/2*size,py=top+(1-tick)/2*size;parts.push(`<path d="M${px},${top+size}v5 M${left-5},${py}h5" stroke="#222"/><text x="${px}" y="${top+size+19}" text-anchor="middle" font-size="11">${tick}</text><text x="${left-9}" y="${py+4}" text-anchor="end" font-size="11">${tick}</text>`);}
  parts.push(`<text x="${left+size/2}" y="${top+size+37}" text-anchor="middle" font-size="11">Blender X (m); native X = 5.5 + X</text>`,
  `<text transform="translate(${left-43},${top+size/2}) rotate(-90)" text-anchor="middle" font-size="11">Blender Y (m); native Z = 8.5 − Y</text>`);
  for(let i=0;i<256;i++)parts.push(`<rect x="${left+size+18}" y="${top+(255-i)*size/256}" width="18" height="${size/256+.05}" fill="${color(field,i/255*field.range[1])}"/>`);
  for(const fraction of [0,.5,1])parts.push(`<text x="${left+size+42}" y="${top+(1-fraction)*size+4}" font-size="11">${fraction*field.range[1]}</text>`);
 }
 parts.push(`<text x="35" y="1262" font-size="12">Raw source SHA-256 ${source.manifestSha256}</text><text x="35" y="1282" font-size="12">Linear display quantizes color, not source data. Exact blended values/hashes/clocks accompany these plots. No native quality claim.</text></g></svg>`);return parts.join('\n')+'\n';
}
fs.mkdirSync(output);
for(const phase of phases){
 phase.fields=[];
 for(const channel of channels){const a=source.read(phase.sample0,channel.name),b=source.read(phase.sample1,channel.name),field={...channel,originals:[a.record,b.record],slices:[]};
  for(const zIndex of heights){const values=[];for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=x+nx*(y+ny*zIndex);values.push(a.values[i]+(b.values[i]-a.values[i])*phase.mix);}
   field.slices.push({zIndex,height:grid.origin[2]+zIndex*grid.spacing[2],width:nx,heightCells:ny,values,positiveValues:values.filter(v=>v>0).length,min:Math.min(...values),max:Math.max(...values)});
  }phase.fields.push(field);
 }
 fs.writeFileSync(path.join(output,'phase-'+String(phase.nativeFrame).padStart(3,'0')+'.svg'),figure(phase));
}
const report={version:1,status:'raw-scientific-slices-no-native-render-or-quality-claim',baselineArtistCommit:'edb3f44262cf2d401c37cdc3c783cf1356452767',rawManifestSha256:source.manifestSha256,sourceCommit,sourceModuleHashes:sourceHashes,plotScriptSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),grid,observedIgnition:{tick:1,worldTime:ignitionWorld,events:ignitions},phaseClock:'Actual pinned canonical simulation clocks minus its observed first-step ignition; unchanged contact source clock chooses adjacent30Hz samples. Native phase is NOT a cache frame.',interpolation:'Raw f32 inputs, JavaScript-double temporal interpolation at exact measured voxel centres. GPU uniform mix is separately recorded; these scientific values are not a GPU readback.',plotting:'Self-contained fixed-scale SVG; linear color quantization is display only. No source threshold, optical transfer, mask or smoothing. Temperature is an uncalibrated solver proxy, not kelvin.',phases};
fs.writeFileSync(path.join(output,'slices.json'),JSON.stringify(report)+'\n');
const files=fs.readdirSync(output).sort().map(name=>{const b=fs.readFileSync(path.join(output,name));return{path:name,bytes:b.length,sha256:sha(b)};});fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify({version:1,scope:report.status,files},null,2)+'\n');
console.log(JSON.stringify({output,rawManifestSha256:source.manifestSha256,phases:phases.map(({nativeFrame,worldTime,observedIgnitionWorldTime,sourceAge,cacheFrames,mix})=>({nativeFrame,worldTime,observedIgnitionWorldTime,sourceAge,cacheFrames,mix})),figures:3,channels:2,measuredZIndices:heights,bytes:files.reduce((n,f)=>n+f.bytes,0),newBake:false}));
