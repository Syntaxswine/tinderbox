import fs from 'node:fs';
import {createHash} from 'node:crypto';
const html=fs.readFileSync('artifacts/helpers/bell-and-alder-closing-review/browser-output.html','utf8');
const match=html.match(/<script id="capture-packet" type="application\/json">([\s\S]*?)<\/script>/);
if(!match){console.error(html.slice(-3000));throw Error('No exported-asset capture packet');}
const packet=JSON.parse(match[1]),out='docs/art/bell-and-alder-closing/previews';
fs.mkdirSync(out,{recursive:true});
for(const v of packet.views)fs.writeFileSync(out+'/'+v.name+'.jpg',Buffer.from(v.jpeg.split(',')[1],'base64'));
packet.receipt.inputData={path:'workbenches/bell-and-alder-closing/scene-data.json',sha256:createHash('sha256').update(fs.readFileSync('workbenches/bell-and-alder-closing/scene-data.json')).digest('hex')};
packet.receipt.reviewScriptSha256=createHash('sha256').update(fs.readFileSync('art/source/bell-and-alder-closing/review.js')).digest('hex');
packet.receipt.jpgs=packet.views.map(v=>{const b=fs.readFileSync(out+'/'+v.name+'.jpg');return{path:out+'/'+v.name+'.jpg',bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};});
fs.writeFileSync('docs/art/bell-and-alder-closing/webgl.json',JSON.stringify(packet.receipt,null,2)+'\n');
if(packet.receipt.errors.length||packet.receipt.programResults.some(p=>!p.linked||p.log)||packet.receipt.shaderResults.some(s=>!s.compiled||s.log))throw Error('Native WebGL capture logs failed');
console.log(JSON.stringify({views:packet.views.map(v=>v.name),gpu:packet.receipt.gpu,programs:packet.receipt.programResults.length,errors:packet.receipt.errors},null,2));
