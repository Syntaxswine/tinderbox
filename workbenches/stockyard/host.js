import {ENGINE_ROOT} from './contract.js';
const frame=document.getElementById('editor'),error=document.getElementById('error');
async function start(){
 const url=new URL('index.html?stockyard=1',ENGINE_ROOT),response=await fetch(url);if(!response.ok)throw Error('Prepare the existing Nautilus editor first: node tools/stockyard/prepare-editor.mjs "PATH TO NAUTILUS CHECKOUT".');
 frame.addEventListener('load',()=>{const script=frame.contentDocument.createElement('script');script.type='module';script.src=new URL('./editor-layer.js',import.meta.url).href;frame.contentDocument.body.append(script);},{once:true});frame.src=url.href;
}
start().catch(e=>{frame.hidden=true;error.hidden=false;error.textContent=e.message;});
