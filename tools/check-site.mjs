import fs from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL(process.argv[2]||'http://127.0.0.1:4553/tinderbox/');
if(!base.pathname.endsWith('/'))throw Error('Site URL must end with /');
const expected=JSON.parse(fs.readFileSync('dist/build-manifest.json','utf8'));
const response=await fetch(new URL('build-manifest.json',base));
if(!response.ok)throw Error(`Build manifest HTTP ${response.status}`);
const actual=await response.json();
if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Hosted manifest does not match the reviewed package');
const queue=expected.files.filter(file=>!file.path.startsWith('.'));
let verified=0;
await Promise.all(Array.from({length:4},async()=>{
  while(queue.length){
    const file=queue.shift(),response=await fetch(new URL(file.path,base));
    if(!response.ok)throw Error(`${file.path}: HTTP ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Hosted bytes differ: '+file.path);
    if(file.path.endsWith('.js')&&!/(?:text|application)\/javascript/.test(response.headers.get('content-type')||''))throw Error('Incorrect module MIME: '+file.path);
    verified++;
  }
}));
const privateProbe=await fetch(new URL('workbenches/integration/',base));
if(privateProbe.status!==404)throw Error('QA workbench unexpectedly exists in public package');
console.log(`PASS: ${verified} hosted files match the reviewed hashes and module MIME types; QA workbench is absent. ${base.href}`);
