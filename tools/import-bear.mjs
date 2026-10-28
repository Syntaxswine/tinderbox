import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const source=process.argv[process.argv.indexOf('--source')+1];
if(!process.argv.includes('--source')||!source)throw Error('Usage: node tools/import-bear.mjs --source READ_ONLY_AFT_REPOSITORY');
const pin='4f5f53917990ec03b2f14c65f067e4b99ec8fcaa',vendor='vendor/animal-factory-tactics-3d/'+pin;
const modules=['bear-worker','bear-paint','clothing-weights','dog-motion','grenade-model','hen-motion','horse-graphic-paint','horse-grip-hand-data','horse-grip-hand','horse-light-model','horse-model-paint','horse-rifle','one-handed','roof-mantle-equipment','weapon-models','worker-locomotion'];
const selected=[...modules.map(name=>'dist/tactics/'+name+'.js'),'dist/tactics/bear-10k-data.json','dist/assets/characters/lowpoly-proof/bear-worker-model-paint-v1.png','dist/tactics/vendor/THREE-LICENSE.txt'];
const read=file=>execFileSync('git',['-c','safe.directory='+path.resolve(source).replaceAll('\\','/'),'-C',source,'show',pin+':'+file],{maxBuffer:32*1024*1024});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function install(file,bytes){if(fs.existsSync(file)&&hash(fs.readFileSync(file))!==hash(bytes))throw Error('Refusing to overwrite changed intake file: '+file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}
const files=selected.map(sourcePath=>{const bytes=read(sourcePath),installedPath=vendor+'/'+sourcePath;install(installedPath,bytes);return {sourcePath,installedPath,sourceCommit:pin,bytes:bytes.length,sha256:hash(bytes),adaptations:[],license:sourcePath.endsWith('THREE-LICENSE.txt')?'Three MIT notice':'Upstream game/art license not declared; user-directed reuse; rights remain unresolved'};});
const facadePath=vendor+'/dist/tactics/vendor/three.module.js',target='src/runtime/three.js',relative=path.relative(path.dirname(facadePath),target).replaceAll('\\','/');
const facade=Buffer.from('// TB-012 adapter, not an upstream Three implementation.\n// Source and consumer use Three r180; compatibility is tested explicitly.\nexport * from '+JSON.stringify(relative)+';\n');install(facadePath,facade);
const rendererReferences=['three.module.js','three.core.js'].map(name=>{const sourcePath='dist/tactics/vendor/'+name,bytes=read(sourcePath);return {sourcePath,sourceCommit:pin,bytes:bytes.length,sha256:hash(bytes),imported:false,reason:'Use the existing Tinderbox r180 implementation through the recorded facade; byte identity is not claimed'};});
const evidence=['docs/tactics/BEAR-WORKER-ARTIST-DELIVERY-2026-10-28.md','docs/tactics/BEAR-ANIMATION-INTEGRATION-2026-10-28.md','docs/tactics/BEAR-WORKER-PAINT-PROMPTS-2026-10-28.md','docs/tactics/review-images/bear/validation.json','docs/tactics/review-images/bear/animation-integration-validation.json','dist/tactics/bear-author-data.json'].map(sourcePath=>{const bytes=read(sourcePath);return {sourcePath,sourceCommit:pin,bytes:bytes.length,sha256:hash(bytes),imported:false};});
const manifest={schemaVersion:1,owner:'coder',task:'TB-012',sourceRepository:'https://github.com/Syntaxswine/animal-factory-tactics-3d.git',sourceCommit:pin,files,
  adaptations:[{kind:'three-facade',installedPath:facadePath,target,bytes:facade.length,sha256:hash(facade),note:'The only added file in the source layout; all listed raw files remain byte-identical.'}],rendererReferences,evidence,
  adapters:['src/reuse/bear.js','src/reuse/bear-tools.js','src/art/bear.js'],notes:['Original AFT provenance, not a completed Nautilus intake.','Normal worker painting only. No Red Hat painting, cap, speaking head or tactical game runtime imported.','One shared Three implementation; facade identity, source rig behavior and browser paint compatibility require QC.']};
fs.mkdirSync(vendor+'/provenance',{recursive:true});fs.writeFileSync(vendor+'/provenance/bear.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Imported '+files.length+' immutable bear dependencies ('+files.reduce((n,f)=>n+f.bytes,0)+' bytes) and one explicit Three facade from '+pin+'.');
