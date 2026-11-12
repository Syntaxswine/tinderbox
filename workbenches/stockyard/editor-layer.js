import {ENGINE_ROOT,MAP_URL,FIELD,validateLayout} from './contract.js';
import {createStockyardAsset} from '../../assets/art/stockyards/index.js';
const T=await import(new URL('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js',ENGINE_ROOT));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;!window.nautilus?.document||!window.editor3d?.scene||window.editor3d.loading;i++){if(i>900)throw Error('Native editor did not initialize.');await sleep(100);}
const editor=window.editor3d,scene=editor.scene,models=new Map();
const group=new T.Group();group.name='tinderbox-stockyard-layer';scene.scene.add(group);
const style=document.createElement('style');style.textContent='#stockyard-tools{position:absolute;right:12px;top:75px;z-index:25;width:258px;background:#2b2117;color:#f1d7aa;padding:12px;border:1px solid #9f8257;border-radius:5px;font:14px Georgia,serif;max-height:78vh;overflow:auto}#stockyard-tools label{display:block;margin:8px 0}#stockyard-tools select{width:100%}#stockyard-tools input{width:62px}#stockyard-tools button,#stockyard-tools select,#stockyard-tools input{background:#51402c;color:#ffe7ba;border:1px solid #9f8257;padding:7px;font:inherit}#stockyard-tools .row{display:flex;gap:5px;flex-wrap:wrap}#stockyard-tools p{font-size:12px;line-height:1.4}#stockyard-tools h2{font-size:18px;margin:0 0 10px}';document.head.append(style);
const panel=document.createElement('section');panel.id='stockyard-tools';panel.setAttribute('aria-label','Stockyard assemblies');panel.innerHTML='<h2>Stockyard assemblies</h2><label>Assembly<select id="sy-selection"></select></label><div class="row"><label>East X <input id="sy-x" type="number" min="0" max="239"></label><label>South Y <input id="sy-y" type="number" min="0" max="239"></label></div><label>Covered bays <input id="sy-bays" type="number" min="1" max="16"></label><label>Skin<select id="sy-skin"><option value="working">Working</option><option value="jubilee">Jubilee</option></select></label><div class="row"><button id="sy-apply">Move / update</button><button id="sy-turn">Turn 90°</button><button id="sy-copy">Copy</button><button id="sy-remove">Remove</button></div><div class="row" style="margin-top:8px"><button id="sy-undo">Undo</button><button id="sy-redo">Redo</button><button id="sy-fit">Frame yard</button></div><div class="row" style="margin-top:8px"><button id="sy-roofs">Show / hide pen roofs</button><button id="sy-export">Export edited map</button></div><p id="sy-message" role="status"></p><p>Native map tools edit lanes, masonry, open pens and rails. These controls edit the existing stockyard models in the same document and history.</p><p>Sketch only: specialist livestock, clothing and clutter are separate. No stockyard fire, collision or AI wiring is claimed.</p>';
document.body.append(panel);const launch=document.createElement('button');launch.textContent='Stockyard layer';launch.onclick=()=>{panel.hidden=!panel.hidden;};document.querySelector('.nautilus-header nav').append(launch);const $=id=>document.getElementById('sy-'+id);let selected='exchange-entrance',revision=-1,docIdentity,roofVisible=true,lastError='';
function current(){return validateLayout(editor.document.map[FIELD]);}
function message(s){$('message').textContent=s;}
function sync(){
 if(docIdentity===editor.document&&revision===editor.document.revision)return;docIdentity=editor.document;revision=docIdentity.revision;
 try{const layout=current(),keep=new Set(layout.instances.map(p=>p.id));
  for(const [id,m]of models)if(!keep.has(id)){m.model.dispose();models.delete(id);}
  for(const p of layout.instances){const key=JSON.stringify(p),old=models.get(p.id);if(old?.key===key)continue;old?.model.dispose();const model=createStockyardAsset(T,{id:p.asset,bays:p.bays,skin:p.skin,quarterTurns:p.quarterTurns,position:[p.x,0,p.y],ground:true});model.root.userData.stockyardId=p.id;group.add(model.root);models.set(p.id,{model,key});}
  for(const m of models.values()){m.model.root.visible=true;m.model.root.traverse(n=>{if(/^roof\//.test(n.name)||/^roof-end/.test(n.name))n.visible=roofVisible;});}
  if(!keep.has(selected))selected=layout.instances[0]?.id;
  $('selection').replaceChildren(...layout.instances.map(p=>new Option(p.name||p.id,p.id)));$('selection').value=selected||'';fill();
  message(`${layout.instances.length} assemblies · ${layout.instances.filter(p=>p.asset==='covered-swine-pen').reduce((n,p)=>n+p.bays,0)} covered bays · native metres`);lastError='';scene.changed();
 }catch(e){lastError=e.message;for(const m of models.values())m.model.root.visible=false;message('Stockyard layer: '+e.message);}
}
function fill(){const p=current().instances.find(p=>p.id===selected);for(const key of ['x','y','bays','skin'])$(key).value=p?.[key]??'';$('bays').disabled=p?.asset!=='covered-swine-pen';}
async function commit(change){try{const map=structuredClone(editor.document.map),layout=validateLayout(map[FIELD]);change(layout);validateLayout(layout);editor.document.replace(map);await editor.changed();sync();}catch(e){message(e.message);}}
$('selection').onchange=()=>{selected=$('selection').value;fill();};
$('apply').onclick=()=>commit(l=>{const p=l.instances.find(p=>p.id===selected);if(!p)throw Error('Select an assembly.');p.x=Number($('x').value);p.y=Number($('y').value);p.bays=Number($('bays').value);p.skin=$('skin').value;});
$('turn').onclick=()=>commit(l=>{const p=l.instances.find(p=>p.id===selected);p.quarterTurns=(p.quarterTurns+1)%4;});
$('copy').onclick=()=>commit(l=>{const p=structuredClone(l.instances.find(p=>p.id===selected));let i=1;while(l.instances.some(q=>q.id===p.id+'-copy-'+i))i++;p.id+='-copy-'+i;p.name+=' copy';p.y+=8;l.instances.push(p);selected=p.id;});
$('remove').onclick=()=>commit(l=>{l.instances=l.instances.filter(p=>p.id!==selected);});
for(const key of ['undo','redo'])$(key).onclick=async()=>{editor.document[key]();await editor.changed();sync();};
$('fit').onclick=async()=>{Object.assign(editor.view,current().view||{x:147,y:123,span:102});await editor.changed();};
$('roofs').onclick=async()=>{roofVisible=!roofVisible;revision=-1;sync();await editor.changed();};
$('export').onclick=()=>{const blob=new Blob([window.nautilus.export()],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='tinderbox-stockyard-edited.map.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
await window.nautilus.open(await (await fetch(MAP_URL)).text());Object.assign(editor.view,current().view);await editor.changed();sync();
const timer=setInterval(sync,200);window.addEventListener('pagehide',()=>{clearInterval(timer);for(const m of models.values())m.model.dispose();group.removeFromParent();},{once:true});
window.__stockyard={version:1,ready:true,sync,models,export:()=>window.nautilus.export(),async open(text){const raw=JSON.parse(text);validateLayout(raw[FIELD]);await window.nautilus.open(text);await editor.changed();sync();},diagnostics:()=>({instances:models.size,bays:current().instances.filter(p=>p.asset==='covered-swine-pen').reduce((n,p)=>n+p.bays,0),errors:lastError?[lastError]:[],nativeErrors:scene.diagnostics,revision:editor.document.revision,roofVisible})};
