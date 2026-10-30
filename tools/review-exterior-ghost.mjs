// Finite source-data/resource review and an explicitly labelled vector study.
// This does not substitute a renderer for the game's real WebGL path.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../src/runtime/three.js';
import {loadLandmark} from '../src/runtime/landmark.js';
import {createSectionStreamer} from '../src/runtime/sections.js';
import {createExteriorGhost,GHOST_OPACITY} from '../src/runtime/exterior-ghost.js';
import {createCameraRig} from '../src/runtime/camera.js';
const output='docs/engineering/exterior-ghost';fs.mkdirSync(output,{recursive:true});
const reports=[],datasets=[];
function statistics(root){let batches=0,triangles=0;root.traverse(node=>{if(node.isInstancedMesh){batches++;triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3*node.count;}});return{batches,triangles};}
for(const id of ['new-york','administration','horticulture']){
  const cache=new Map(),read=async url=>{if(!cache.has(url))cache.set(url,JSON.parse(fs.readFileSync(fileURLToPath(url))));return cache.get(url);},data=await loadLandmark(id,{loadJSON:read});datasets.push(data);
  const root=new T.Group(),details=new T.Group(),control=new T.Group();root.add(details);
  const ghost=createExteriorGhost({THREE:T,root,data:data.ghost,renderer:{getPixelRatio:()=>1.75}});
  const options={THREE:T,manifest:data.manifest,baseUrl:data.baseUrl,loadJSON:read},stream=createSectionStreamer({...options,root:details,presentation:ghost}),baseline=createSectionStreamer({...options,root:control});
  const trace=[],nav=data.navigation,targets=nav.targets,points=[nav.spawn,...[0,.25,.5,.75,1].map(r=>{const t=targets[Math.floor((targets.length-1)*r)];return{x:t.polygon.reduce((n,p)=>n+p[0],0)/t.polygon.length,y:t.polygon.reduce((n,p)=>n+p[1],0)/t.polygon.length,elevation:t.elevation};}),nav.spawn];
  try{
    for(const point of points){
      const player={...point,height:1.65},rig=createCameraRig({clientWidth:844,clientHeight:390},{setSize(){}},nav);rig.update(player);
      ghost.update(player,{camera:rig.camera,viewport:{width:844,height:390}});stream.update(player,{interior:true});baseline.update(player,{interior:true});await Promise.all([stream.settled(),baseline.settled()]);
      const m=stream.metrics(),b=baseline.metrics(),g=ghost.diagnostics(),draws=statistics(details),original=statistics(control);
      if(m.activeSections!==b.activeSections||m.geometries!==b.geometries||draws.triangles!==original.triangles||stream.isReadyAt(player)!==baseline.isReadyAt(player))throw Error('Ghost changed native section/geometry/readiness: '+id);
      if(m.activeSections>192||m.haloMaterials>Object.keys(data.manifest.materials).length||g.materialVariants!==m.haloMaterials||g.lineDraws!==1)throw Error('Unbounded ghost ownership: '+id);
      trace.push({point,streaming:m,baselineBatches:original.batches,haloBatches:draws.batches,nativeTriangles:draws.triangles,ghost:g});
    }
    stream.update(nav.spawn,{viewMode:'overview'});baseline.update(nav.spawn,{viewMode:'overview'});ghost.update({...nav.spawn,height:1.65},{viewMode:'overview'});await Promise.all([stream.settled(),baseline.settled()]);
    if(stream.metrics().materials||stream.metrics().geometries||ghost.diagnostics().materialVariants||details.children.length||ghost.diagnostics().visible)throw Error('Overview did not release ghost variants/native sections');
    reports.push({placeId:id,samples:trace,afterOverview:{streaming:stream.metrics(),ghost:ghost.diagnostics()}});
  }finally{stream.dispose();baseline.dispose();await Promise.all([stream.settled(),baseline.settled()]);ghost.dispose();}
  if(root.children.length!==1||details.children.length||control.children.length)throw Error('Review ownership survived exit');
}
const receipt={task:'exterior-ghost',method:'Seven source-position/height samples per building at 844x390 and DPR 1.75; compare real section instances/triangle totals with and without the presentation, then release overview/exit. Samples are renderer resource probes, not navigated player routes or WebGL performance acceptance.',reports,passed:true};
fs.writeFileSync(output+'/streaming.json',JSON.stringify(receipt,null,2)+'\n');

// Plot the actual generated line positions with the same orthographic maths.
const n=x=>x.toFixed(2),project=(c,p,w,h)=>{const v=new T.Vector3(...p).project(c);return[(v.x+1)*w/2,(1-v.y)*h/2];};
function lines(data,c,w,h){const p=data.ghost.positions;return Array.from({length:p.length/6},(_,i)=>{const a=project(c,p.slice(i*6,i*6+3),w,h),b=project(c,p.slice(i*6+3,i*6+6),w,h);return'M'+a.map(n).join(' ')+'L'+b.map(n).join(' ');}).join('');}
function overview(data,w,h){const b=data.ghost.bounds,target=new T.Vector3(...b.min).add(new T.Vector3(...b.max)).multiplyScalar(.5),c=new T.OrthographicCamera(-1,1,1,-1,.1,2000);c.position.copy(target).add(new T.Vector3(300,420,360));c.lookAt(target);c.updateMatrixWorld();let x=0,y=0;
  for(const px of [b.min[0],b.max[0]])for(const py of [b.min[1],b.max[1]])for(const pz of [b.min[2],b.max[2]]){const p=new T.Vector3(px,py,pz).applyMatrix4(c.matrixWorldInverse);x=Math.max(x,Math.abs(p.x));y=Math.max(y,Math.abs(p.y));}
  const half=Math.max(y,x/(w/h))*1.06;c.top=half;c.bottom=-half;c.left=-half*w/h;c.right=half*w/h;c.updateProjectionMatrix();return c;
}
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#211c18"/><g fill="#efe1c1" font-family="Arial,sans-serif"><text x="28" y="38" font-size="24">Tinderbox · sparse exterior outline + clear halo</text><text x="28" y="64" font-size="14">Source-data study. Original native positions; this is not a WebGL game screenshot.</text></g>';
for(let i=0;i<datasets.length;i++){const d=datasets[i],c=overview(d,364,250),title=['New York State','Administration','Horticulture'][i];svg+='<g transform="translate('+(28+i*392)+' 90)"><rect width="364" height="250" rx="8" fill="#35281e"/><path d="'+lines(d,c,364,250)+'" stroke="#c2ab7d" stroke-width="1" stroke-opacity="'+GHOST_OPACITY+'" fill="none"/><text x="8" y="275" fill="#efe1c1" font-size="17" font-family="Arial">'+title+'</text><text x="8" y="297" fill="#c9bca6" font-size="13" font-family="Arial">'+d.ghost.segments+' native line segments · one line draw</text></g>';}
const d=datasets[0],w=550,h=265,first=d.ghost.positions,animal={x:first[0]+.5,y:first[2]+.5,elevation:2.12,height:1.65},rig=createCameraRig({clientWidth:w,clientHeight:h},{setSize(){}},d.navigation);rig.update(animal);
const center=project(rig.camera,[animal.x,animal.elevation+animal.height*.55,animal.y],w,h),radius=2.5*h/(rig.camera.top-rig.camera.bottom),outer=radius*5/3;
svg+='<defs><radialGradient id="halo"><stop offset="0" stop-color="black"/><stop offset="60%" stop-color="black"/><stop offset="70%" stop-color="#282828"/><stop offset="80%" stop-color="#808080"/><stop offset="90%" stop-color="#d7d7d7"/><stop offset="100%" stop-color="white"/></radialGradient><mask id="clear"><rect width="550" height="265" fill="white"/><circle cx="'+n(center[0])+'" cy="'+n(center[1])+'" r="'+n(outer)+'" fill="url(#halo)"/></mask><clipPath id="close"><rect width="550" height="265" rx="8"/></clipPath></defs><g transform="translate(28 428)" clip-path="url(#close)"><rect width="550" height="265" fill="#35281e"/><g mask="url(#clear)"><path d="'+lines(d,rig.camera,w,h)+'" stroke="#c2ab7d" stroke-width="1.3" stroke-opacity="'+GHOST_OPACITY+'" fill="none"/></g><circle cx="'+n(center[0])+'" cy="'+n(center[1])+'" r="4" fill="#f1d48f"/><circle cx="'+n(center[0])+'" cy="'+n(center[1])+'" r="'+n(radius)+'" fill="none" stroke="#c2ab7d" stroke-opacity=".3" stroke-dasharray="3 6"/></g>';
svg+='<g fill="#efe1c1" font-family="Arial,sans-serif"><text x="608" y="458" font-size="20">Clear around the animal</text><text x="608" y="492" font-size="15">5 m clear diameter at native scale.</text><text x="608" y="518" font-size="15">AFT’s smooth feather reaches 8⅓ m overall.</text><text x="608" y="554" font-size="15">Point = projected animal anchor.</text><text x="608" y="580" font-size="15">Dashed circle marks the clear radius for review only.</text><text x="608" y="616" font-size="15">Detailed walls above the feet share this halo.</text><text x="608" y="642" font-size="15">The supporting floor stays solid.</text><text x="28" y="733" font-size="13">Line-only source evidence omits solid geometry, animals, lighting, depth occlusion and HUD. Runtime/browser acceptance remains separate.</text></g></svg>';
fs.writeFileSync(output+'/outline-study.svg',svg+'\n');
console.log(JSON.stringify({passed:true,reports:reports.map(r=>({placeId:r.placeId,samples:r.samples.length,maxHaloMaterials:Math.max(...r.samples.map(s=>s.streaming.haloMaterials)),maxExtraBatches:Math.max(...r.samples.map(s=>s.haloBatches-s.baselineBatches)),nativeTrianglesUnchanged:true})),study:output+'/outline-study.svg'}));
