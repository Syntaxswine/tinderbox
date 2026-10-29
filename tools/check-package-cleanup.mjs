import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {connect} from 'node:net';
// An explicit API failure fixture. It does not validate production assets or GPU rendering.
const project=process.cwd();fs.mkdirSync('artifacts/TB-024',{recursive:true});
const fixture=fs.mkdtempSync(path.resolve('artifacts/TB-024/package-cleanup-')),dist=path.join(fixture,'dist'),runtime=path.join(dist,'src/runtime');
fs.mkdirSync(runtime,{recursive:true});fs.writeFileSync(path.join(fixture,'.owned-cleanup-fixture'),'TB-024 disposable HTTP/API failure fixture\n');fs.writeFileSync(path.join(fixture,'package.json'),'{"type":"module"}\n');
const files=[
  ['src/runtime/three.js','export class Group { children=[]; }\n'],
  ['src/runtime/landmark.js',"export async function loadLandmark(){return {manifest:{},navigation:{spawn:{x:0,y:0,elevation:0}},baseUrl:'https://fixture.invalid/'};}\n"],
  ['src/runtime/sections.js',"export function createSectionStreamer(){return {update(){},settled(){return Promise.reject(Error('Intentional section load/cleanup failure fixture'));},dispose(){}};}\n"]
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [file,source]of files)fs.writeFileSync(path.join(dist,file),source);
fs.writeFileSync(path.join(dist,'build-manifest.json'),JSON.stringify({files:files.map(([file,source])=>({path:file,bytes:Buffer.byteLength(source),sha256:sha(source)}))}));
let status=0,stderr='';try{execFileSync(process.execPath,[path.join(project,'tools/smoke-places-package.mjs')],{cwd:fixture,timeout:15000,windowsHide:true,stdio:'pipe'});}catch(error){status=error.status;stderr=String(error.stderr||'');}
const receiptPath=path.join(fixture,'docs/engineering/explorable-places/package-smoke.json'),receipt=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath)):null;
const released=receipt?.port?await new Promise(resolve=>{const socket=connect(receipt.port,'127.0.0.1');socket.setTimeout(2000);socket.once('error',error=>{socket.destroy();resolve(error.code==='ECONNREFUSED');});socket.once('connect',()=>{socket.destroy();resolve(false);});socket.once('timeout',()=>{socket.destroy();resolve(false);});}):false;
const passed=status===1&&receipt?.passed===false&&receipt.serverClosed&&receipt.portReleased===true&&receipt.cleanupError?.includes('Intentional section')&&released;
const report={task:'TB-024',method:'Explicit HTTP/API failure fixture. Section load and subsequent settled cleanup both reject. The smoke must record failure, exit with code 1, and still close its owned server. No production-asset or WebGL acceptance is claimed.',fixture,source:'tools/smoke-places-package.mjs',sourceSha256:sha(fs.readFileSync('tools/smoke-places-package.mjs')),expectedExitCode:1,actualExitCode:status,childProcessExited:status!==null,parentVerifiedPortReleased:released,receipt,...(!passed?{stderr}:{}),passed};
fs.writeFileSync('docs/engineering/explorable-places/package-cleanup-fixture.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed,expectedFailure:receipt?.error,cleanupError:receipt?.cleanupError,port:receipt?.port,actualExitCode:status,childProcessExited:status!==null,portReleased:released}));
if(!passed)process.exitCode=1;
