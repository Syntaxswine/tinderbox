import {planEdges} from '../../src/art/gross-housing.js';
// Static review keeps the artist collection inspectable when WebGL is unavailable.
// Images are offline renders of the same exported meshes, UVs and cut planes.
export async function openStaticHousingReview({catalogueUrl,error}){
 const $=id=>document.getElementById(id),response=await fetch(catalogueUrl);if(!response.ok)throw Error('Catalogue '+response.status);
 const catalogue=await response.json();let house=catalogue.houses.find(h=>h.id===new URLSearchParams(location.search).get('house'))||catalogue.houses.find(h=>h.id==='hopkins-4-13'),view='exterior',level=0;
 document.documentElement.dataset.reviewMode='static';$('stage').setAttribute('aria-label','Saved three-dimensional house renders');
 const preview=document.createElement('img');preview.id='static-preview';preview.style.cssText='width:100%;height:100%;object-fit:contain;display:block';$('stage').prepend(preview);$('loading')?.remove();
 $('rotate').disabled=true;$('rotate').title='Rotation is available in the live 3D view';$('furniture').disabled=true;
 const notice=document.createElement('p');notice.className='limits';notice.textContent='Static mesh renders are shown because live 3D is unavailable in this browser. Each image uses the same prefab geometry and materials. Rotation and furnishing changes require the live 3D view.';$('stage').after(notice);
 function plan(){
  const f=house.floors[level],all=f.rooms.flatMap(r=>r.polygon),xs=all.map(p=>p[0]),zs=all.map(p=>p[1]),minX=Math.min(...xs)-.5,minZ=Math.min(...zs)-.5,w=Math.max(...xs)-minX+.5,d=Math.max(...zs)-minZ+.5;
  const palette={bedroom:'#c5cbae',parlor:'#d6bd94',sitting:'#d6bd94',dining:'#c5b493',kitchen:'#b8c6bd',hall:'#e3d9be',pantry:'#ded1b3',service:'#c8c4b3'};
  let svg=`<svg viewBox="${minX} ${minZ} ${w} ${d}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${f.label} adapted room layout"><defs><pattern id="static-stair" width=".25" height=".25" patternUnits="userSpaceOnUse"><path d="M0 0H.25" stroke="#6d644e" stroke-width=".04"/></pattern></defs>`;
  for(const r of f.rooms){const cx=r.polygon.reduce((s,p)=>s+p[0],0)/r.polygon.length,cz=r.polygon.reduce((s,p)=>s+p[1],0)/r.polygon.length;svg+=`<polygon points="${r.polygon.map(p=>p.join(',')).join(' ')}" fill="${palette[r.type]||'#ddd1b5'}" stroke="#605744" stroke-width=".055"/><text x="${cx}" y="${cz}" text-anchor="middle" font-family="system-ui" font-size=".25" fill="#514a3b">${r.label}</text>`;}
  for(const e of planEdges(f).filter(e=>e.opening))svg+=`<line x1="${e.a[0]}" y1="${e.a[1]}" x2="${e.b[0]}" y2="${e.b[1]}" stroke="#faf3de" stroke-width=".16"/>`;
  if(f.stairs)svg+=`<rect x="${f.stairs.x}" y="${f.stairs.z}" width="1" height="3" fill="url(#static-stair)" stroke="#605744" stroke-width=".05"/>`;
  svg+='</svg>';$('plan').innerHTML=svg;$('plan-title').textContent=f.label+' · adapted plan';
 }
 function draw(){
  preview.src=new URL(`../../docs/art/hopkins-housing-v1/previews/${house.id}-${view}-${view==='exterior'?0:level}.jpg`,import.meta.url).href;preview.alt=house.label+' / '+(view==='exterior'?'exterior':house.floors[level].label+' cutaway');
  $('house-title').textContent=house.label;$('source-label').textContent='HOPKINS BOOK 4 · 1891 / DESIGN '+house.designNumber;
  $('view-caption').textContent=(view==='exterior'?'EXTERIOR':house.floors[level].label.toUpperCase()+' / CUTAWAY')+' · STATIC RENDER';
  $('exterior').setAttribute('aria-pressed',String(view==='exterior'));$('cutaway').setAttribute('aria-pressed',String(view==='cutaway'));$('level').value=level;
  $('prefab').href=new URL('prefabs/'+house.id+'.json',catalogueUrl).href;$('source-link').href=house.source.url;$('plate').src=new URL(house.source.plate,catalogueUrl).href;$('plate-link').href=$('plate').src;
  $('notes').textContent=house.notes.join(' ');$('stats').textContent=house.floors.length+' levels · '+house.floors.reduce((n,f)=>n+f.rooms.length,0)+' labeled spaces';
  for(const button of $('houses').children)button.setAttribute('aria-current',String(button.dataset.house===house.id));plan();
 }
 function select(id){house=catalogue.houses.find(h=>h.id===id);$('level').replaceChildren(...house.floors.map((f,i)=>{const o=document.createElement('option');o.value=i;o.textContent=f.label;return o;}));level=Math.min(level,house.floors.length-1);draw();}
 for(const h of catalogue.houses){const button=document.createElement('button');button.dataset.house=h.id;button.innerHTML='<strong>'+h.label.split(' / ')[1]+'</strong><small>No. '+h.designNumber+' · Book 4</small>';button.onclick=()=>select(h.id);$('houses').append(button);}
 $('exterior').onclick=()=>{view='exterior';draw();};$('cutaway').onclick=()=>{view='cutaway';draw();};$('level').onchange=()=>{view='cutaway';level=Number($('level').value);draw();};
 $('review').textContent='Show collection review';$('review').onclick=async()=>{
  const paths=['geometry-review.json','offline-review.json','nautilus-compatibility.json'],records={};for(const p of paths){const r=await fetch(new URL('../../docs/art/hopkins-housing-v1/'+p,import.meta.url));records[p]=r.ok?await r.json():{status:'not yet available'};}
  const result={scope:'static render and geometry review',webgl:{status:'unavailable',reason:String(error?.message||error)},records};$('review-output').textContent=JSON.stringify(result,null,2);$('review-download').href=URL.createObjectURL(new Blob([JSON.stringify(result)],{type:'application/json'}));$('review-download').hidden=false;
 };
 select(house.id);window.hopkinsLab={mode:'static',ready:Promise.resolve(true),catalogue,webglUnavailable:String(error?.message||error)};
}
