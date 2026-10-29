// Immutable, selective art intake. Never reads a moving worktree or writes a donor.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const PLACE_SOURCES = Object.freeze([
  {id:'new-york', directory:'exposition-new-york-tile', commit:'b689f5501ab06f54822f2aa724ac77de106e3b71', preservation:'preserved-original.json'},
  {id:'administration', directory:'exposition-administration', commit:'43337a33ddfe4dff6849654c827c56e1f24e1acc', preservation:'preserved-and-engine.json'},
  {id:'waterfront', directory:'horticulture-waterfront', commit:'c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9', preservation:'preserved.json'},
  {id:'horticulture', directory:'exposition-horticulture', commit:'c4287338ff93907900a94a86b6c7e3bed0ae7c2f', preservation:'preserved-and-engine.json'}
]);
const root = fs.realpathSync(process.cwd()), records = new Map(), publicFiles = new Set();
const previous=fs.existsSync('assets/art/places-intake.json')?JSON.parse(fs.readFileSync('assets/art/places-intake.json')):null;
const additions=[
  {key:'access',directory:'exploration-access',record:'accessSource',purpose:'Additive native entry/stair/landing/floor-opening geometry; raw landmarks remain frozen'},
  {key:'medicine',directory:'medicine-pickups',record:'medicineSource',purpose:'Ground presentation for authoritative Catalogue Street walk-over medicine/drugs'}
].map(source=>({...source,argument:process.argv.find(arg=>arg.startsWith('--'+source.key+'='))?.slice(source.key.length+3)}));
const belongs=(source,file)=>['assets/art/','art/source/','docs/art/'].some(prefix=>file.startsWith(prefix+source.directory+'/'))||file==='workbenches/art/check-'+source.directory+'.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function original(commit, file) { return execFileSync('git',['show',commit+':'+file],{maxBuffer:64*1024*1024}); }
function copy(commit, file, kind) {
  if (!/^(?:assets\/art\/|art\/source\/|docs\/art\/|workbenches\/art\/check-|vendor\/nautilus-engine\/)/.test(file) || file.includes('..')) throw Error('Unexpected intake path: '+file);
  const target=path.resolve(root,file);
  if (!target.startsWith(root+path.sep)) throw Error('Intake escaped workspace');
  const bytes=original(commit,file), hash=sha(bytes), prior=records.get(file);
  if(prior){if(prior.sha256!==hash)throw Error('Conflicting immutable source: '+file);return;}
  if(fs.existsSync(target) && sha(fs.readFileSync(target))!==hash){
    const before=previous?.files.find(record=>record.installedPath===file);
    if(!additions.some(source=>source.argument&&belongs(source,file))||!before||sha(fs.readFileSync(target))!==before.sha256)throw Error('Refusing to overwrite an existing adaptation: '+file);
  }
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  records.set(file,{installedPath:file,sourcePath:file,sourceCommit:commit,bytes:bytes.length,sha256:hash,kind});
}
for(const source of additions){
  source.commit=source.argument||previous?.[source.record]?.commit;if(!source.commit)continue;
  if(!/^[a-f0-9]{40}$/.test(source.commit))throw Error(source.key+' intake requires an exact immutable commit');
  const files=execFileSync('git',['ls-tree','-r','--name-only',source.commit,'--','assets/art/'+source.directory,'art/source/'+source.directory,'docs/art/'+source.directory,'workbenches/art/check-'+source.directory+'.mjs'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  if(!files.includes('assets/art/'+source.directory+'/index.js'))throw Error('Frozen '+source.key+' commit lacks the agreed factory');
  for(const file of files){copy(source.commit,file,source.key+'-source');if(file.startsWith('assets/art/')&&!file.endsWith('/.gitattributes'))publicFiles.add(file);}
  if(source.argument)for(const record of previous?.files||[])if(belongs(source,record.installedPath)&&!records.has(record.installedPath)){
    const target=path.resolve(root,record.installedPath);if(!target.startsWith(root+path.sep)||sha(fs.readFileSync(target))!==record.sha256)throw Error('Cannot retire modified former access intake: '+record.installedPath);fs.rmSync(target);
  }
}
for(const source of PLACE_SOURCES){
  const get=file=>JSON.parse(original(source.commit,file));
  const manifestPath='assets/art/'+source.directory+'/manifest.json', manifest=get(manifestPath);
  for(const record of [...manifest.runtimeFiles,...manifest.dependencies]){
    copy(source.commit,record.path,'runtime');publicFiles.add(record.path);
    if(records.get(record.path).sha256!==record.sha256)throw Error('Original manifest hash mismatch: '+record.path);
  }
  copy(source.commit,manifestPath,'source-manifest');publicFiles.add(manifestPath);
  copy(source.commit,'assets/art/'+source.directory+'/.gitattributes','source-attributes');
  // The original focused checkers explicitly verify preservation records. Their
  // historical file closure belongs in source control, outside the public build.
  const preservationPath='art/source/'+source.directory+'/'+source.preservation;
  copy(source.commit,preservationPath,'source-evidence');
  for(const record of get(preservationPath).files)copy(source.commit,record.path,'checker-preservation-dependency');
  const tree=execFileSync('git',['ls-tree','-r','--name-only',source.commit,'--','art/source/'+source.directory,'docs/art/'+source.directory],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  for(const file of tree)copy(source.commit,file,'source-evidence');
  copy(source.commit,'workbenches/art/check-'+source.directory+'.mjs','original-checker');
}
// NY's preservation record includes the detailed edition; it is checker evidence,
// while only its unmodified forms/native-contract dependencies enter the build.
const report={task:'TB-024',repository:'https://github.com/Syntaxswine/tinderbox.git',sources:PLACE_SOURCES,
  policy:'Immutable Git-object intake. Original focused checker/preservation closure retained; only selected runtime dependencies are public. No Hopkins v2 or moving donor imports.',
  ...Object.fromEntries(additions.filter(source=>source.commit).map(source=>[source.record,{commit:source.commit,path:'assets/art/'+source.directory+'/index.js',purpose:source.purpose}])),
  publicFiles:[...publicFiles].sort(),files:[...records.values()].sort((a,b)=>a.installedPath.localeCompare(b.installedPath)),
  adaptations:['Application, navigation and streamed-scene adapters live separately under src/runtime and src/content; generated scene data records its source hashes.'],
  rights:'Original source rights/uncertainties and notices are preserved in each source manifest; provenance does not grant a license.'};
fs.mkdirSync('docs/engineering/explorable-places',{recursive:true});
fs.writeFileSync('assets/art/places-intake.json',JSON.stringify(report,null,2)+'\n');
console.log('Imported '+records.size+' immutable runtime/checker/source files; '+publicFiles.size+' selected public dependencies.');
