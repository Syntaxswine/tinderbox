// M30 private package patcher. Importing this file performs no copies or execution.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const SHADOW_REFERENCE_SHA256='a26316d6366f0f9fedb9a2e799b3b1aadc594894d5a8309b8383a0a99b53f5bc';
export const SHADOW_THREE_SHA256='96cc39e18fde90e5a3896252775a71e8f3d3e946da0035ee27f3ecce09c60e8c';
export const SHADOW_THREE_PATH='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js';
export const SHADOW_COLLECTOR_PATH=SHADOW_THREE_PATH.replace('three.module.js','tinderbox-m30-shadow-probe.js');
export const SHADOW_REASONS=Object.freeze([
  'lights-state','output-colour-space','batching-on','batching-off','batch-colour-off','batch-colour-on',
  'instancing-on','instancing-off','skinning-on','skinning-off','instance-colour-off','instance-colour-on',
  'instance-morph-off','instance-morph-on','environment','fog','clipping','vertex-alpha','vertex-tangent','morph-position','morph-normal','morph-colour',
  'tone-mapping','morph-count','material-version'
]);
export const shadowSha=value=>createHash('sha256').update(value).digest('hex');
function requireThat(value,message){if(!value)throw Error(message);}
function unique(source,needle){
  const at=source.indexOf(needle);requireThat(at>=0&&source.indexOf(needle,at+needle.length)<0,'SHADOW_PATCH_MATCH '+needle.slice(0,100));return at;
}
export function stripShadowInstrumentation(source){
  return source.replace(/\/\*M30_SHADOW_PROBE:([a-z0-9-]+):BEGIN\*\/[\s\S]*?\/\*M30_SHADOW_PROBE:\1:END\*\//g,'');
}
export function instrumentShadowModule(source){
  requireThat(shadowSha(source)===SHADOW_THREE_SHA256,'SHADOW_THREE_HASH_MISMATCH');
  const additions=[],nl=source.includes('\r\n')?'\r\n':'\n';
  const add=(id,at,code)=>{
    requireThat(!additions.some(p=>p.id===id||p.at===at),'SHADOW_DUPLICATE_SEAM '+id);
    const text='/*M30_SHADOW_PROBE:'+id+':BEGIN*/\n'+code+'\n/*M30_SHADOW_PROBE:'+id+':END*/';
    additions.push({id,at,line:source.slice(0,at).split('\n').length,text});
  };
  const after=(id,needle,code)=>add(id,unique(source,needle)+needle.length,code);
  add('module',0,"import {shadowProbe as __m30ShadowProbe} from './tinderbox-m30-shadow-probe.js';\nglobalThis.__tinderboxM30ShadowProbe=__m30ShadowProbe;");
  after('direct-enter','this.renderBufferDirect = function ( camera, scene, geometry, material, object, group ) {',
    'const __m30Direct=__m30ShadowProbe.enterDirect(object.isSkinnedMesh===true,material.id);\ntry {');
  add('direct-leave',unique(source,nl+'\t\t};'+nl+nl+'\t\t// Compile'),
    '} finally { __m30ShadowProbe.leaveDirect(__m30Direct); }');
  for(const [id,group]of [['shadow-group','group'],['shadow-single','null']]){
    const call='renderer.renderBufferDirect( shadowCamera, null, geometry, depthMaterial, object, '+group+' );';
    const at=unique(source,call);
    add(id+'-enter',at,'const __m30Shadow=__m30ShadowProbe.enterShadow(light.isPointLight===true);\ntry {');
    add(id+'-leave',at+call.length,'} finally { __m30ShadowProbe.leaveShadow(__m30Shadow); }');
  }
  const first=unique(source,'let needsProgramChange = false;');
  const last=unique(source,'let program = materialProperties.currentProgram;');
  const decision=source.slice(first,last),matches=[...decision.matchAll(/needsProgramChange = true;/g)];
  requireThat(matches.length===SHADOW_REASONS.length,'SHADOW_REASON_SITE_COUNT');
  matches.forEach((m,i)=>add('reason-'+SHADOW_REASONS[i],first+m.index,
    "__m30ShadowProbe.reason('"+SHADOW_REASONS[i]+"');"));
  after('parameters','function getParameters( material, lights, shadows, scene, object ) {',"__m30ShadowProbe.hit('getParameters');");
  after('program-lookup','function getProgram( material, scene, object ) {',"__m30ShadowProbe.hit('getProgram');");
  after('program-switch','if ( state.useProgram( program.program ) ) {',"__m30ShadowProbe.hit('program-switches');");
  after('material-switch','if ( material.id !== _currentMaterialId ) {',"__m30ShadowProbe.hit('material-switches');");
  after('binding-check','function needsUpdate( object, geometry, program, index ) {',"__m30ShadowProbe.hit('binding-checks');");
  after('vao-switch','currentState = state;',"__m30ShadowProbe.hit('vao-switches');");
  after('actual-draw','function update( count, mode, instanceCount ) {','__m30ShadowProbe.draw(count,instanceCount);');
  additions.sort((a,b)=>a.at-b.at);
  let patched=source;for(const p of [...additions].reverse())patched=patched.slice(0,p.at)+p.text+patched.slice(p.at);
  requireThat(stripShadowInstrumentation(patched)===source,'SHADOW_SOURCE_ROUNDTRIP');
  return {source:patched,metadata:{version:1,diagnosticOnly:true,sourceSha256:shadowSha(source),patchedSha256:shadowSha(patched),
    reasonSites:matches.length,sourceRoundtrip:true,seams:additions.map(({id,at,line,text})=>({id,offset:at,line,bytes:Buffer.byteLength(text),sha256:shadowSha(text)}))}};
}
function within(root,target){return target.startsWith(root+path.sep);}
function noLinks(root,target){
  requireThat(within(root,target),'SHADOW_PATH_OUTSIDE_ROOT');
  for(let p=target;p!==root;p=path.dirname(p))if(fs.existsSync(p))requireThat(!fs.lstatSync(p).isSymbolicLink(),'SHADOW_LINK_FORBIDDEN '+p);
}
function safeFile(root,relative){
  requireThat(typeof relative==='string'&&!path.isAbsolute(relative)&&!relative.split(/[\\/]/).includes('..'),'SHADOW_BAD_MANIFEST_PATH');
  const resolved=path.resolve(root,relative);noLinks(root,resolved);return resolved;
}
export function prepareShadowProbeCopy({referenceDirectory,outputDirectory,workspace=process.cwd()}){
  const root=fs.realpathSync(workspace),reference=fs.realpathSync(referenceDirectory),output=path.resolve(outputDirectory);
  const qa=path.join(root,'artifacts','qa','visual-half-cost');
  requireThat(within(qa,output),'SHADOW_OUTPUT_NOT_PRIVATE_QA');
  noLinks(root,output);requireThat(!fs.existsSync(output),'SHADOW_OUTPUT_ALREADY_EXISTS');
  requireThat(!within(reference,output)&&!within(output,reference)&&output!==reference,'SHADOW_OUTPUT_REFERENCE_OVERLAP');
  const manifest=JSON.parse(fs.readFileSync(path.join(reference,'build-manifest.json'),'utf8'));
  requireThat(Array.isArray(manifest.files)&&manifest.files.length===3676,'SHADOW_REFERENCE_FILE_COUNT');
  const entries=[...manifest.files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  requireThat(shadowSha(JSON.stringify(entries))===SHADOW_REFERENCE_SHA256,'SHADOW_REFERENCE_CANONICAL_MISMATCH');
  requireThat(new Set(entries.map(f=>f.path)).size===entries.length,'SHADOW_DUPLICATE_MANIFEST_PATH');
  for(const f of entries){
    const p=safeFile(reference,f.path);requireThat(fs.lstatSync(p).isFile(),'SHADOW_REFERENCE_NOT_FILE');
    const bytes=fs.readFileSync(p);requireThat(bytes.length===f.bytes&&shadowSha(bytes)===f.sha256,'SHADOW_REFERENCE_FILE_MISMATCH '+f.path);
  }
  const original=fs.readFileSync(safeFile(reference,SHADOW_THREE_PATH),'utf8'),patched=instrumentShadowModule(original);
  const collector=fs.readFileSync(new URL('./visual-shadow-probe-collector.mjs',import.meta.url));
  const destination=path.join(output,'instrumented-package');fs.mkdirSync(destination,{recursive:true});
  const outputEntries=[];
  for(const f of entries){
    const source=safeFile(reference,f.path),target=safeFile(destination,f.path);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    const bytes=f.path===SHADOW_THREE_PATH?Buffer.from(patched.source):fs.readFileSync(source);
    fs.writeFileSync(target,bytes,{flag:'wx'});const written=fs.readFileSync(target);
    requireThat(bytes.equals(written),'SHADOW_COPY_VERIFY '+f.path);
    outputEntries.push({path:f.path,bytes:written.length,sha256:shadowSha(written)});
  }
  const collectorFile=safeFile(destination,SHADOW_COLLECTOR_PATH);
  fs.writeFileSync(collectorFile,collector,{flag:'wx'});
  outputEntries.push({path:SHADOW_COLLECTOR_PATH,bytes:collector.length,sha256:shadowSha(collector)});
  outputEntries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const delta=outputEntries.filter(f=>entries.find(e=>e.path===f.path)?.sha256!==f.sha256).map(f=>f.path);
  requireThat(JSON.stringify([...delta].sort())===JSON.stringify([SHADOW_THREE_PATH,SHADOW_COLLECTOR_PATH].sort()),'SHADOW_PACKAGE_DELTA');
  const nextManifest={...manifest,files:outputEntries,qaDiagnostic:{name:'m30-shadow-attribution',untimedOnly:true,referenceCanonicalSha256:SHADOW_REFERENCE_SHA256}};
  const manifestBytes=JSON.stringify(nextManifest,null,2)+'\n';
  fs.writeFileSync(path.join(destination,'build-manifest.json'),manifestBytes,{flag:'wx'});
  const record={...patched.metadata,referenceDirectory:reference,packageDirectory:destination,referenceCanonicalSha256:SHADOW_REFERENCE_SHA256,
    collectorSha256:shadowSha(collector),packageCanonicalSha256:shadowSha(JSON.stringify(outputEntries)),manifestSha256:shadowSha(manifestBytes),
    fileCount:outputEntries.length,codeDelta:delta,referenceWrites:0,browserRuns:0,productionEdits:0};
  fs.writeFileSync(path.join(output,'preparation.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});return record;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);
  requireThat(args.length===5&&args[0]==='--prepare-copy'&&args[1]==='--reference'&&args[3]==='--output',
    'Usage: node tools/review/visual-shadow-probe.mjs --prepare-copy --reference REFERENCE --output FRESH_PRIVATE_QA_DIRECTORY');
  const result=prepareShadowProbeCopy({referenceDirectory:args[2],outputDirectory:args[4]});
  console.log(JSON.stringify({packageDirectory:result.packageDirectory,packageCanonicalSha256:result.packageCanonicalSha256,codeDelta:result.codeDelta}));
}
