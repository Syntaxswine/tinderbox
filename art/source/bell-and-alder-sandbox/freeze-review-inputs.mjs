import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const donor=process.argv[2];if(!donor)throw Error('Supply the read-only matching coder checkout explicitly');
const root=fs.realpathSync(donor),destination='artifacts/qa/bell-and-alder-sandbox/runtime-inputs';
const files=['workbenches/furnished-house/scene.js','workbenches/furnished-house/simulation.js','workbenches/furnished-house/support.js','workbenches/bell-and-alder-sandbox/compose.js','workbenches/bell-and-alder-sandbox/runtime.js'];
const rows=files.map(file=>{const bytes=fs.readFileSync(path.join(root,file)),target=path.join(destination,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);return {path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
const result={version:1,scope:'Read-only frozen coder inputs for artist combined WebGL QA; no runtime code intake or promotion.',sourceBranch:'codex/bell-and-alder-sandbox-runtime',sourceCommit:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingFiles:true,capturedAt:new Date().toISOString(),files:rows};fs.writeFileSync('artifacts/qa/bell-and-alder-sandbox/runtime-inputs.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({files:files.length,sourceCommit:result.sourceCommit,workingFiles:result.workingFiles}));
