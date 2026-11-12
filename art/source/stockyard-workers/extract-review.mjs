import fs from 'node:fs';import {createHash} from 'node:crypto';
const root='artifacts/helpers/stockyard-workers-review',html=fs.readFileSync(root+'/browser-output.html','utf8');
function payload(id){const marker='<script id="'+id+'" type="application/json">',start=html.indexOf(marker);if(start<0)return null;const from=start+marker.length,to=html.indexOf('</script>',from);return html.slice(from,to);}
const hit=payload('capture-packet');
if(!hit)throw Error('Missing worker capture packet: '+(payload('capture-failure')||html.slice(-1800)));
const packet=JSON.parse(hit);if(packet.receipt.errors.length||packet.receipt.programs.some(p=>!p.linked)||packet.receipt.shaders.some(s=>!s.compiled))throw Error('Worker WebGL failure');
const directory='docs/art/stockyard-workers/previews';fs.mkdirSync(directory,{recursive:true});
const files=[];for(const view of packet.views){const bytes=Buffer.from(view.jpeg.split(',')[1],'base64'),path=directory+'/'+view.name+'.jpg';fs.writeFileSync(path,bytes);files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const textures=['yard-hand','packing-worker','yard-foreman'].map(id=>{const path='assets/art/stockyard-workers/'+id+'-paint-v2.png',bytes=fs.readFileSync(path);return{path,sha256:createHash('sha256').update(bytes).digest('hex'),dimensions:[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]};});
const sources=['src/art/stockyard-worker-skins.js','src/art/index.js','src/art/stockyard-worker-paint.js','art/source/stockyard-workers/review.js'].map(path=>{const raw=fs.readFileSync(path),canonical=raw.toString('utf8').replace(/\r\n/g,'\n');return{path,sha256:createHash('sha256').update(raw).digest('hex'),canonicalSha256:createHash('sha256').update(canonical).digest('hex'),hashEncoding:'sha256: captured checkout bytes; canonicalSha256: UTF-8 LF matching Git'};});
fs.writeFileSync('docs/art/stockyard-workers/webgl.json',JSON.stringify({...packet.receipt,files,sources,textures},null,2)+String.fromCharCode(10));
console.log(JSON.stringify({views:files.length,programs:packet.receipt.programs.length,errors:0,artUpdateIsolation:packet.receipt.artUpdateIsolation}));
