// Painted surfaces are shared by a visit; garments borrow them.
export const STOCKYARD_PAINT_FILES=Object.freeze(Object.fromEntries(['yard-hand','packing-worker','yard-foreman'].map(id=>[id,new URL('../../assets/art/stockyard-workers/'+id+'-paint-v2.png',import.meta.url).href])));
export async function loadStockyardWorkerPaint(T,{signal,loadTexture=url=>new T.TextureLoader().loadAsync(url)}={}){
 if(signal?.aborted)throw new DOMException('Worker paint load cancelled','AbortError');
 const entries=Object.entries(STOCKYARD_PAINT_FILES),results=await Promise.allSettled(entries.map(([,url])=>Promise.resolve().then(()=>loadTexture(url))));
 const loaded=results.filter(r=>r.status==='fulfilled').map(r=>r.value),failed=results.find(r=>r.status==='rejected');
 if(failed||signal?.aborted){for(const t of loaded)t.dispose();if(signal?.aborted)throw new DOMException('Worker paint load cancelled','AbortError');throw new Error('Stockyard worker painting could not load',{cause:failed.reason});}
 const textures=new Map(entries.map(([id],i)=>[id,results[i].value]));let disposed=false;
 for(const [id,t]of textures){t.name='Stockyard painted cloth / '+id;t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.anisotropy=4;}
 return{get(id){if(disposed||!textures.has(id))throw Error('Worker painting is unavailable');return textures.get(id);},diagnostics:()=>({version:2,disposed,textures:disposed?0:textures.size,ids:[...textures.keys()]}),dispose(){if(disposed)return;disposed=true;for(const t of textures.values())t.dispose();}};
}
export function createStockyardClothMaterial(T,pool,{skin,texture,part,variant,species,cap}){
 if(!texture?.isTexture)throw Error('Stockyard workwear requires its painted texture');
 const material=pool.material(new T.MeshStandardMaterial({name:'Painted stockyard '+skin+' / '+part,map:texture,color:new T.Color(0xffffff).multiplyScalar([1,.91,1.055,.97][variant]),roughness:.97,side:T.DoubleSide}));
 const partId={shirt:0,trousers:1,cap:2,apron:3}[part],half=species==='bear'?.262:.216;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{uWorkerAtlas:{value:texture},uWorkerPart:{value:partId},uWorkerHalf:{value:half},uWorkerCapBase:{value:cap.y-.023},uWorkerCapHeight:{value:cap.height+.023},uWorkerPacking:{value:skin==='packing-worker'?1:0}});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWorkerPosition,vWorkerNormal;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWorkerPosition=position;vWorkerNormal=normal;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vWorkerPosition,vWorkerNormal;
   uniform sampler2D uWorkerAtlas;
   uniform float uWorkerPart,uWorkerHalf,uWorkerCapBase,uWorkerCapHeight,uWorkerPacking;
   vec4 workerPanel(float col,float row,vec2 uv){return texture2D(uWorkerAtlas,(vec2(col,2.-row)+clamp(uv,vec2(.009),vec2(.991)))/vec2(2.,3.));}
   vec4 workerPaint(){
    vec3 p=vWorkerPosition,n=normalize(vWorkerNormal);float facing=smoothstep(-.28,.28,n.x);
    if(uWorkerPart<.5){
     float y=(p.y-.925)/.375;
     vec4 front=workerPanel(0.,0.,vec2(.5-p.z/(2.*uWorkerHalf),y));
     vec4 back=workerPanel(1.,0.,vec2(.5+p.z/(2.*uWorkerHalf),y));
     vec4 sleeve=workerPanel(0.,2.,vec2(clamp((abs(p.z)-.19)*3.,.06,.94),clamp((p.y-.90)/.40,.04,.96)));
     float arm=smoothstep(uWorkerHalf-.012,uWorkerHalf+.025,abs(p.z));
     return mix(mix(back,front,facing),sleeve,arm);
    }
    if(uWorkerPart<1.5){
     float y=(p.y-.14)/.828;
     return mix(workerPanel(1.,1.,vec2(.5+p.z/.49,y)),workerPanel(0.,1.,vec2(.5-p.z/.49,y)),facing);
    }
    if(uWorkerPart<2.5){
     float phi=atan(n.z,n.x)/6.28318530718+.5,y=clamp((p.y-uWorkerCapBase)/uWorkerCapHeight,0.,1.);
     return uWorkerPacking>.5?workerPanel(0.,1.,vec2(.08+.30*phi,.08+.25*y)):workerPanel(1.,2.,vec2(phi,y));
    }
    return workerPanel(1.,2.,vec2(.5-p.z/.38,(p.y-.47)/.735));
   }
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','diffuseColor *= workerPaint();');
 };
 material.customProgramCacheKey=()=> 'stockyard-painted-v2/'+part;
 material.userData.stockyardPaint={version:2,part,skin,borrowedTexture:true};
 return material;
}
