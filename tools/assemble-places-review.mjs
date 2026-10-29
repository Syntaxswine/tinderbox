import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
// A generated, private verification snapshot, not another Git worktree or a
// promotion. UI originals stay untouched in both worker checkouts.
const project=fs.realpathSync(process.cwd()),uiCommit=process.argv.find(arg=>arg.startsWith('--ui='))?.slice(5);
if(!/^[a-f0-9]{40}$/.test(uiCommit||''))throw Error('Pass the architect-approved exact --ui=<40-character-SHA>');
const root=path.resolve('artifacts/TB-024');fs.mkdirSync(root,{recursive:true});
const output=fs.mkdtempSync(path.join(root,'combined-review-'));
if(!output.startsWith(project+path.sep)||fs.realpathSync(output)!==output)throw Error('Unsafe private review output');
const own=['src','assets','vendor','tools','tests','workbenches','art/source','docs','index.html','package.json','.gitattributes'];
for(const name of own){const source=path.join(project,name);if(fs.existsSync(source))fs.cpSync(source,path.join(output,name),{recursive:true,dereference:false,filter:file=>{if(fs.lstatSync(file).isSymbolicLink())throw Error('Review snapshot cannot follow a symbolic link');return true;}});}
const allowed=['src/ui/','assets/art/ui/','assets/art/place-previews/','tests/ui/','workbenches/ui/','docs/ui/'];
const paths=execFileSync('git',['ls-tree','-r','--name-only',uiCommit,'--','src/ui','assets/art/ui','assets/art/place-previews','tests/ui','workbenches/ui','docs/ui'],{encoding:'utf8'}).trim().split('\n').filter(Boolean),uiFiles=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const file of paths){
  if(!allowed.some(prefix=>file.startsWith(prefix))||file.includes('..'))throw Error('Unexpected UI overlay path: '+file);
  const bytes=execFileSync('git',['show',uiCommit+':'+file],{maxBuffer:64e6}),target=path.join(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);uiFiles.push({path:file,sourceCommit:uiCommit,bytes:bytes.length,sha256:hash(bytes)});
}
if(!paths.includes('src/ui/title-screen.js')||!paths.includes('src/ui/main-menu.js'))throw Error('Chosen UI commit lacks the agreed title/menu API');
const codeFiles=[];function inventory(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const target=path.join(directory,entry.name);if(entry.isDirectory())inventory(target);else{const relative=path.relative(output,target).split(path.sep).join('/');if(!uiFiles.some(record=>record.path===relative)){const bytes=fs.readFileSync(target);codeFiles.push({path:relative,bytes:bytes.length,sha256:hash(bytes)});}}}}inventory(output);
const report={task:'TB-024',purpose:'Private combined code/UI source and package verification; no promotion or publishing',project,output,workerBranch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingSource:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),uiCommit,uiFiles,codeFiles,
  limitations:'Contains the coder working source plus only the frozen UI closure. Architect still reconciles prior row art and owns final combined real-WebGL acceptance. No helper is launched by this assembly.'};
fs.writeFileSync(path.join(output,'.tinderbox-review-source'),'Owned private TB-024 verification snapshot\n');fs.writeFileSync(path.join(output,'review-intake.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/engineering/explorable-places/review-assembly.json',JSON.stringify({task:'TB-024',output,uiCommit,codeFiles:codeFiles.length,uiFiles:uiFiles.length,sourceFingerprint:hash(JSON.stringify(codeFiles)),workingSource:report.workingSource,purpose:report.purpose},null,2)+'\n');console.log(output);
