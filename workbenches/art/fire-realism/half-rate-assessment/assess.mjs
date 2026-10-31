/** One future read-only assessment; source delivery is not execution authorization. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {CHANNELS,need,equal,validateSamples,scanField,connectivity,terminalReport,compareTerminal} from './metrics.mjs';
export const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const here=path.dirname(fileURLToPath(import.meta.url)),project=path.resolve(here,'../../../..');
export function plain(file){
 const absolute=path.resolve(file),parsed=path.parse(absolute);let current=parsed.root;
 for(const p of absolute.slice(parsed.root.length).split(path.sep)){current=path.join(current,p);const s=fs.lstatSync(current);need(!s.isSymbolicLink(),'Linked input refused: '+current);}
 const s=fs.lstatSync(absolute);need(s.isFile()&&s.nlink===1,'Nonregular/hardlinked input refused: '+absolute);return s;
}
const identity=s=>({dev:s.dev,ino:s.ino,size:s.size,mtimeMs:s.mtimeMs,ctimeMs:s.ctimeMs});
export function readInto(file,buffer,record,check=()=>{}){
 check();const before=plain(file);need(before.size===record.bytes&&buffer.length===record.bytes,'Input byte count mismatch');
 const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
 try{need(equal(identity(fs.fstatSync(fd)),identity(before)),'Input changed before open');let offset=0;
  while(offset<buffer.length){check();const got=fs.readSync(fd,buffer,offset,buffer.length-offset,null);need(got>0,'Truncated input');offset+=got;}
  need(equal(identity(fs.fstatSync(fd)),identity(before))&&equal(identity(plain(file)),identity(before)),'Input changed during read');
 }finally{fs.closeSync(fd);}
 need(sha(buffer)===record.sha256,'Input SHA-256 mismatch: '+file);return identity(before);
}
export function readPinned(root,record,check=()=>{}){
 need(record&&Number.isSafeInteger(record.bytes)&&record.bytes>=0&&record.bytes<=8*1024**2&&/^[a-f0-9]{64}$/.test(record.sha256),'Invalid bounded metadata pin');
 const file=path.resolve(root,record.path);need(path.relative(root,file)!==''&&!path.relative(root,file).startsWith('..')&&!path.isAbsolute(path.relative(root,file)),'Escaping input pin');
 const buffer=Buffer.alloc(record.bytes);readInto(file,buffer,record,check);return buffer;
}
export function exactInventory(directory,expected){
 const s=fs.lstatSync(directory);need(s.isDirectory()&&!s.isSymbolicLink(),'Plain fields directory required');
 const actual=fs.readdirSync(directory).sort();need(equal(actual,expected)&&new Set(expected).size===expected.length,'Absent/extra field inventory');
 for(const name of actual){need(!name.includes('/')&&!name.includes('\\')&&name!=='.'&&name!=='..','Unsafe inventory');plain(path.join(directory,name));}
}
export function parseArgs(args){
 need(args.length===2&&args[0]==='--output'&&path.isAbsolute(args[1]),'Only --output ABSOLUTE_FRESH_PATH is supported');return args[1];
}
export function run(output){
 need(process.execArgv.includes('--max-old-space-size=256'),'Use the fixed --max-old-space-size=256 foreground command');
 const startUtc=Date.now(),start=performance.now(),deadline=start+180000,deadlineUtc=startUtc+180000;
 const qa=path.join(project,'artifacts/qa/fire-realism/half-rate-assessment'),out=path.resolve(output),rel=path.relative(qa,out);
 need(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel)&&!fs.existsSync(out),'Fresh own-QA output required');
 fs.mkdirSync(qa,{recursive:true});need(!fs.lstatSync(qa).isSymbolicLink(),'Linked QA root');fs.mkdirSync(out);let written=0,peakRss=0,peakArrayBuffers=0,hashed=0;
 const check=()=>{const m=process.memoryUsage();peakRss=Math.max(peakRss,m.rss);peakArrayBuffers=Math.max(peakArrayBuffers,m.arrayBuffers);need(performance.now()<deadline&&Date.now()<deadlineUtc,'180-second assessment deadline');need(!fs.existsSync(path.join(out,'assessment.stop')),'Private assessment.stop requested');need(m.rss<=512*1024**2,'512MiB polled RSS bound');};
 const save=(name,value)=>{const raw=Buffer.from(JSON.stringify(value,null,2)+'\n');need(written+raw.length<=2*1024**2,'2MiB aggregate output cap');fs.writeFileSync(path.join(out,name),raw,{flag:'wx'});written+=raw.length;};
 const records=[];
 const pinned=record=>{check();const raw=readPinned(project,record,check);records.push({...record});return raw;};
 try{
  const specRaw=fs.readFileSync(path.join(here,'inputs.json')),spec=JSON.parse(specRaw),stage=path.join(project,spec.stage);
  const sources=['assess.mjs','metrics.mjs','inputs.json','provenance.json'].map(name=>{const b=fs.readFileSync(path.join(here,name));return{name,bytes:b.length,sha256:sha(b)};});
  save('started.json',{scope:'Source-authorized future read-only numeric assessment; no admission/quality/render',pid:process.pid,executable:process.execPath,startedUtc:new Date(startUtc).toISOString(),deadlineUtc:new Date(deadlineUtc).toISOString(),sources,limits:{wallSeconds:180,polledRssBytes:512*1024**2,nodeOldSpaceMiB:256,aggregateOutputBytes:2*1024**2},retainedHelper:false,ports:[]});
  const manifest=JSON.parse(pinned(spec.manifest)),validation=JSON.parse(pinned(spec.validation)),prepared=JSON.parse(pinned(spec.prepare)),settings=JSON.parse(pinned(spec.settings));
  pinned(spec.scene);for(const r of spec.sourceSnapshots)pinned(r);for(const r of spec.controls)pinned(r);
  const grid=JSON.parse(pinned(spec.grid));grid.contactBandHeight=settings.source.contactBandHeight;
  need(equal(grid.resolution,[48,48,96])&&equal(grid.voxelSize,spec.gridMapping.voxelSize)&&equal(grid.gridOrigin,spec.gridMapping.gridOrigin)&&equal(grid.domainBounds,spec.gridMapping.domainBounds),'Frozen scalar mapping changed');
  need(equal(manifest.sourcePins,spec.sourcePins)&&equal(prepared.sourcePins,spec.sourcePins),'Source map mismatch');
  need(manifest.sourceBlendSha256===spec.scene.sha256&&prepared.preparedBlendSha256===spec.scene.sha256&&prepared.observedValid===true,'Prepared scene/report mismatch');
  need(manifest.originalBlendSha256===settings.original.blendSha256&&equal(manifest.controlV5,settings.controlV5)&&equal(manifest.canonicalSource,settings.source),'Original/control/source recipe mismatch');
  need(equal(manifest.burningRateCounterfactual,{property:'burning_rate',baseline:.75,target:.375})&&equal(manifest.ageRange,[0,6.4])&&equal(manifest.burnAgeRange,[0,3.2])&&manifest.tailMaximum===3.2,'Source/clocks changed');
  need(manifest.status==='raw-export-failed-preserved'&&validation.rawGatesPassed===false&&equal(manifest.terminalValidation,validation),'Failed qualification must remain frozen');
  need(manifest.scalarFormat==='Original observed f32LE Xfastest,YthenZ; no quantization/crop/terminal overwrite'&&manifest.scalarOrigin==='Actual domainMin+cell_size/2; no mesh modifier offset'&&equal(manifest.cachePrecision,{requested:'32',observed:'32'}),'Endianness/precision/origin mismatch');
  const names=validateSamples(manifest,grid),fields=path.join(stage,'fields');exactInventory(fields,names);
  const buffer=Buffer.alloc(884736),rows=[],flameRows=[],selected=[],hashes=[],statBindings=[];let initial=true,boundary=false,below=false;
  for(const s of manifest.samples){
   check();const row={frame:s.frame,age:s.ageSeconds,channels:{}};
   for(const channel of CHANNELS){
    const r=s.channels[channel],file=path.join(stage,r.path),stat=readInto(file,buffer,r,check);hashed++;statBindings.push({file,stat});
    const profile=channel==='flame'&&[31,61,96,97,98].includes(s.frame),m=scanField(buffer,grid,{profile,check});
    for(const k of['min','max','nonzero','positive'])need(m[k]===r[k],'Saved field statistic mismatch: '+r.path+':'+k);
    need(m.negative===0,'Negative exported density/derived-T/F');if(channel==='flame')need(m.max<=1,'F outside [0,1]');if(channel==='temperature')need(m.max<=3,'Derived T outside [0,3]');
    if(channel!=='temperature')need(equal(m.support,s.support[channel]),'Saved exact positive support mismatch: '+r.path);
    if(s.frame===1&&m.nonzero)initial=false;
    const {support,profile:p,...stats}=m;delete stats.sum;
    row.channels[channel]={...stats,positiveCentreBoundsBlender:support.positiveCentreBoundsBlender,oneVoxelHaloBoundsBlender:support.oneVoxelHaloBoundsBlender,lowerBandOutsidePatchVoxels:support.lowerBandOutsidePatchVoxels};
    if(channel==='flame'){
     flameRows.push({frame:s.frame,age:s.ageSeconds,min:m.min,max:m.max,nonzero:m.nonzero,positive:m.positive,integral:m.integral,belowGroundPositive:m.belowGroundPositive,boundaryPositive:m.boundaryPositive});boundary||=m.boundaryPositive>0;below||=m.belowGroundPositive>0;
     if(profile)selected.push({frame:s.frame,age:s.ageSeconds,input:r,profile:p,support,connectivity:connectivity(buffer,grid.resolution,check)});
    }
    hashes.push({frame:s.frame,channel,...r});check();
   }
   rows.push(row);if(s.frame%32===0)console.log(JSON.stringify({completedFrames:s.frame,hashedFields:hashed,elapsedMs:performance.now()-start}));
  }
  const terminal=terminalReport(flameRows,initial);compareTerminal(terminal,validation);compareTerminal(terminal,manifest.terminalValidation);
  need(manifest.initialConditionObservedZero===initial&&manifest.boundaryReactionFailed===boundary&&manifest.belowGroundReactionFailed===below,'Saved sequence conditions disagree');
  need(terminal.rawGatesPassed===false&&equal(terminal.failures,['raw flame not exactly zero at/after3.2 frame97']),'Known failure did not reconcile');
  const oldManifest=JSON.parse(pinned(spec.controlManifest)),oldProfile=JSON.parse(pinned(spec.controlProfile));
  exactInventory(path.join(project,spec.controlStage,'fields'),validateSamples(oldManifest,grid));
  need(oldProfile.inputs.manifest.sha256===spec.controlManifest.sha256&&oldProfile.inputs.manifest.bytes===spec.controlManifest.bytes,'Baseline profile manifest linkage mismatch');
  const comparisons=[];
  for(const frame of[31,61]){
   check();const s=oldManifest.samples[frame-1],r=s.channels.flame,old=oldProfile.frames.find(x=>x.frame===frame);
   need(old?.input.sha256===r.sha256&&old.input.bytes===r.bytes,'Pinned V5 profile input mismatch');
   const file=path.join(project,spec.controlStage,r.path),stat=readInto(file,buffer,r,check);statBindings.push({file,stat});
   const m=scanField(buffer,grid,{profile:true,check}),p=m.profile;
   for(const k of['positiveVoxels','maxF','sumF','thresholds','weightedQuantiles','fractionsAbove'])need(equal(p[k],old[k]),'Existing V5 profile disagreement: '+k);
   comparisons.push({frame,age:s.ageSeconds,baselineInput:r,baselineProfile:p,candidateProfile:selected.find(x=>x.frame===frame).profile,meaning:'Proxy-weighted F=sqrt(react) distribution only; not fuel mass, energy, radiance or visible folds'});
  }
  exactInventory(fields,names);for(const {file,stat}of statBindings)need(equal(identity(plain(file)),stat),'Input identity/stat changed after scan');
  for(const r of records)readPinned(project,r,check);for(const r of sources){const b=fs.readFileSync(path.join(here,r.name));need(b.length===r.bytes&&sha(b)===r.sha256,'Assessment source changed');}
  check();save('hashes.json',{candidateFields:hashes,all579RawHashesVerified:true,baselineSelectedFields:comparisons.map(x=>x.baselineInput)});
  save('report.json',{status:'complete-bytes-reconciled-raw-gates-still-failed',rawGatesPassed:false,admitted:false,inputs:records,sources,terminal,frames:rows,selectedFlame:selected,comparisonToV5:comparisons,resources:{elapsedMs:performance.now()-start,peakRss,peakArrayBuffers,singleReusableFieldBufferBytes:884736,selectedConnectivityTemporaryBytes:221184*5,candidateBytes:579*884736,baselineFieldBytes:2*884736,outputBytesBeforeReport:written,hardRssEnforcement:false},limitations:['F=sqrt(react); sums times voxel volume and weighted heights are proxy statistics, not fuel mass, energy or radiance.','No VDB access or VDB-to-F32 bit proof. Exported temperature is the recorded flame-derived proxy, not H/Kelvin.','All positive original scalar values remain unmodified. Descriptive thresholds never filter stored fields or grant a pass.','Strict positive support, point-weighted percentiles and 6-face centre connectivity are distinct; none proves interpolated folds, appearance or radiometry.','Only integral comparisons permit relative 1e-12 cross-language summation error; zero/positive counts, byte hashes and support remain exact.','Upper interpolation halos are reported uncut; reconstructed density below the floor is not disproved by zero negative centres.','This assessment cannot admit data, extend livePatchA/reactionGain/source/tail time, change R29 underlay, approve R/O or measure rendering cost. Native ticks192â€“196 and un-gained-F smoke coupling remain future review.','One 884736-byte field buffer plus bounded selected connectivity scratch; no retained dense frames. Memory is polled, not an OS hard cap.']});
  console.log(JSON.stringify({status:'complete-bytes-reconciled-raw-gates-still-failed',hashedFields:hashed,output:out,outputBytes:written,elapsedMs:performance.now()-start}));
 }catch(error){save('failure.json',{error:String(error),stack:error.stack,hashedFields:hashed,elapsedMs:performance.now()-start,rawGatesPassed:false,admitted:false,partial:true});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))run(parseArgs(process.argv.slice(2)));
