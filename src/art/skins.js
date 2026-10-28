// Tinderbox-authored appearances. No geometry, collision or vendor source changes.
export const SKIN_SETS=Object.freeze(['inherited','exposition-v1']);
export const EXPOSITION_ASSETS=Object.freeze(Object.fromEntries(Object.entries({
  staff:'staff-ivory-v1.png',bay:'staff-window-bay-v1.png',timber:'timber-ochre-v1.png',
  brick:'brick-sienna-v1.png',roof:'roof-slate-v1.png',
  horse:'horse-exposition-worker-v1.png',goat:'goat-exposition-worker-v1.png'
}).map(([key,file])=>[key,new URL('../../assets/art/exposition-skins-v1/'+file,import.meta.url).href])));
export function validateSkinSet(id){if(!SKIN_SETS.includes(id))throw new Error('Unknown Tinderbox skin set '+id);return id;}

// Whole-module coordinates make piers and the tall lintel share a continuous
// facade. Original position, normal and surfaceUV data remain unchanged.
export function addFacadeCoordinates(T,geometry,mesh,module,part){
  const p=geometry.attributes.position,n=geometry.attributes.normal,coords=[],decor=[],portals=[],spans=[];
  const c=Math.cos(module.heading),s=Math.sin(module.heading),story=module.storyHeight||(module.stories?module.height/module.stories:module.height),spacing=module.floorSpacing||story;
  for(let i=0;i<p.count;i++){
    const wx=p.getX(i)+mesh.position.x-module.x,wz=p.getZ(i)+mesh.position.z-module.y;
    const x=c*wx+s*wz,z=-s*wx+c*wz,y=p.getY(i)+mesh.position.y;
    const nx=c*n.getX(i)+s*n.getZ(i),side=Math.abs(nx)>.5,across=side?z:x,span=side?module.depth:module.width;
    // Each unchanged 2m wall samples a whole story; slab intervals hold the edge colour.
    const level=Math.floor((y+1e-6)/spacing),storyY=level+Math.max(0,Math.min(1,(y-level*spacing)/story));
    coords.push(across+span/2,storyY,y,module.height);spans.push(span);
    const broad=Math.abs(n.getY(i))<.5&&(part.width<part.depth?Math.abs(n.getX(i))>.5:Math.abs(n.getZ(i))>.5);
    const panel=['wall','corner','doorway'].includes(module.form)&&part.skinSlot!=='door'&&broad;
    decor.push(panel?1:0,module.form==='doorway'?1:0,module.form==='pilaster'?1:0);
    portals.push(across/span,(module.opening?.width||1)/span,(module.opening?.height||1.65)/story,module.stories||module.height/story);
  }
  geometry.setAttribute('tbFacadeCoord',new T.Float32BufferAttribute(coords,4));
  geometry.setAttribute('tbFacadeDecor',new T.Float32BufferAttribute(decor,3));
  geometry.setAttribute('tbPortalCoord',new T.Float32BufferAttribute(portals,4));
  geometry.setAttribute('tbFacadeSpan',new T.Float32BufferAttribute(spans,1));
}
export function makeExpositionMaterials(T,pool,assets,renderer,style={}){
  const anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||2);
  for(const texture of Object.values(assets)){texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=anisotropy;}
  for(const key of ['staff','timber','brick','roof','bay'])assets[key].wrapS=assets[key].wrapT=T.RepeatWrapping;
  // Keep the existing surfaceUV convention; map density is an appearance choice.
  assets.brick.repeat.set(2/1.2,2/1.2);assets.roof.repeat.set(1/2.4,1/2.4);
  const result={};
  for(const [id,key,color,windows]of [
    ['inherited-plaster','staff',style.field||0xffffff,true],['inherited-cream','staff',style.trim||0xf2dfb8,true],
    ['inherited-brick','brick',0xffffff,false],['inherited-wood','timber',0xffffff,false],
    ['inherited-roof','roof',0xffffff,false]
  ]){
    const material=pool.material(new T.MeshStandardMaterial({map:assets[key],color,roughness:.95,side:T.DoubleSide}));
    material.name='Tinderbox Exposition / '+(style.id||'generic')+' / '+key;
    if(id!=='inherited-roof'){
      material.onBeforeCompile=shader=>{
        shader.uniforms.tbWindowBay={value:assets.bay};
        shader.uniforms.tbFacadeWidths={value:new T.Vector2(style.bayWidth||2.5,style.portalWidth||3)};
        if(style.entrance){shader.uniforms.tbEntrance={value:style.entrance};shader.uniforms.tbPortalUV={value:new T.Vector4(...style.openingUV)};shader.uniforms.tbPortalStories={value:style.portalStories};}
        shader.uniforms.tbTrimColor={value:new T.Color(style.trim||0xf2dfb8)};
        shader.vertexShader=shader.vertexShader.replace('#include <common>',
          '#include <common>\nattribute vec4 tbFacadeCoord; attribute vec3 tbFacadeDecor; varying vec4 vTbFacade; varying vec3 vTbDecor;'+(style.entrance?'attribute vec4 tbPortalCoord; attribute float tbFacadeSpan; varying vec4 vTbPortal; varying float vTbSpan;':''))
          .replace('#include <begin_vertex>','#include <begin_vertex>\nvTbFacade=tbFacadeCoord;vTbDecor=tbFacadeDecor;'+(style.entrance?'vTbPortal=tbPortalCoord;vTbSpan=tbFacadeSpan;':''));
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
          '#include <common>\nuniform sampler2D tbWindowBay; uniform vec2 tbFacadeWidths; uniform vec3 tbTrimColor; varying vec4 vTbFacade; varying vec3 vTbDecor;'+(style.entrance?'uniform sampler2D tbEntrance; uniform vec4 tbPortalUV; uniform float tbPortalStories; varying vec4 vTbPortal; varying float vTbSpan;':''));
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          float tbY=vTbFacade.z,tbTop=vTbFacade.w-tbY,tbPortalActive=0.;
          ${windows?`if(vTbDecor.x>.5){
            float tbBayX=vTbFacade.x/tbFacadeWidths.x,tbWing=0.;
            ${style.entrance?`float tbPanelSpan=min(vTbSpan,tbFacadeWidths.y),tbAcross=vTbPortal.x*vTbSpan;
            tbWing=step(tbPanelSpan*.5,abs(tbAcross))*vTbDecor.y;
            if(tbWing>.5)tbBayX=(tbAcross-sign(tbAcross)*tbPanelSpan*.5)/tbFacadeWidths.x;
            if(vTbDecor.y>.5&&tbWing<.5&&vTbPortal.w+.001>=tbPortalStories&&vTbFacade.y<tbPortalStories){
              float x=tbAcross/tbPanelSpan,halfOpening=vTbPortal.y*vTbSpan/tbPanelSpan*.5,u;
              if(x < -halfOpening)u=mix(0.,tbPortalUV.x,clamp((x+.5)/(.5-halfOpening),0.,1.));
              else if(x > halfOpening)u=mix(tbPortalUV.y,1.,clamp((x-halfOpening)/(.5-halfOpening),0.,1.));
              else u=mix(tbPortalUV.x,tbPortalUV.y,(x/halfOpening+1.)*.5);
              float v=vTbFacade.y<=vTbPortal.z?mix(tbPortalUV.z,tbPortalUV.w,vTbFacade.y/vTbPortal.z):mix(tbPortalUV.w,1.,(vTbFacade.y-vTbPortal.z)/(tbPortalStories-vTbPortal.z));
              diffuseColor.rgb=texture2D(tbEntrance,vec2(u,v)).rgb;tbPortalActive=1.;
            }else`:''}
            if(vTbFacade.y>=vTbDecor.y||tbWing>.5){
              vec2 tbUV=vec2(tbBayX,fract(vTbFacade.y));
              diffuseColor.rgb=texture2D(tbWindowBay,tbUV).rgb;
            }
          }`:''}
          // Physical metre-sized top cornice; floor divisions repeat per story.
          float tbCourse=min(fract(vTbFacade.y),1.-fract(vTbFacade.y));
          if(tbY>.12&&tbCourse<.024&&tbPortalActive<.5)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.57,.40),.32);
          if(tbTop<.175){
            float tbLip=step(.047,tbTop)*step(tbTop,.066)+step(.12,tbTop)*step(tbTop,.14);
            diffuseColor.rgb=${style.id?'mix(tbTrimColor,tbTrimColor*.48,tbLip*.58)':'mix(vec3(.86,.78,.62),vec3(.40,.33,.23),tbLip*.58)'};
          }
          if(tbY<.125)diffuseColor.rgb*=.83;
          if(vTbDecor.z>.5&&tbY>.175&&tbTop>.21){
            float tbFlute=pow(.5+.5*cos(vTbFacade.x*95.),8.);
            diffuseColor.rgb*=1.-.10*tbFlute;
          }
        `);
      };
      material.customProgramCacheKey=()=> 'tinderbox-exposition-facade-v3-'+Number(windows)+'-'+(style.id||'generic');
    }
    result[id]=material;
  }
  return result;
}

// Preserve the original projection, visibility atlas and gray-background mask.
// Edited paint is sampled on clothes only; head/fur/hooves remain the originals.
export function bindCivilianSkin(root,species,texture,enabled){
  const materials=new Set(),flag={value:enabled?1:0},skin={value:texture},restores=[];
  root.traverse(o=>{if(o.isSkinnedMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])
    if(m.customProgramCacheKey().startsWith('worker-model-projection-v4-'))materials.add(m);});
  if(materials.size!==1)throw new Error('Expected one original projected-paint material for '+species);
  for(const material of materials){
    const original=material.onBeforeCompile,cache=material.customProgramCacheKey,budget=material.userData.textureBudget;
    material.userData.textureBudget={...budget,fragment:(budget?.fragment||4)+1};
    material.onBeforeCompile=(shader,renderer)=>{
      original.call(material,shader,renderer);
      shader.uniforms.tbCivilianSkin=skin;shader.uniforms.tbCivilianEnabled=flag;
      const marker='varying vec3 vPaintPosition,vPaintNormal; varying float vPaintPart;';
      if(!shader.fragmentShader.includes(marker))throw new Error('Original civilian paint contract changed');
      shader.fragmentShader=shader.fragmentShader.replace(/texture2D\(uModelPaint\s*,/g,'tbCivilianSample(')
        .replaceAll('fallbackPaint(vPaintPart)','tbCivilianFallback(fallbackPaint(vPaintPart),vPaintPart)');
      shader.fragmentShader=shader.fragmentShader.replace(marker,marker+`
        uniform sampler2D tbCivilianSkin; uniform float tbCivilianEnabled;
        float tbClothPart(){
          float body=1.-step(2.5,vPaintPart);
          float cuffs=(1.-step(.1,abs(vPaintPart-3.)) + 1.-step(.1,abs(vPaintPart-5.)))*step(.918,vPaintPosition.y);
          return clamp(body+cuffs,0.,1.);
        }
        vec4 tbCivilianSample(vec2 uv){
          vec4 source=texture2D(uModelPaint,uv),paint=texture2D(tbCivilianSkin,uv);
          float neck=step(6.5,vPaintPart)*step(vPaintPart,7.5)*step(1.245,vPaintPosition.y)*step(vPaintPosition.y,1.305);
          float red=step(source.g*2.,source.r)*step(source.b*2.3,source.r);
          return mix(source,paint,tbCivilianEnabled*max(tbClothPart(),neck*red));
        }
        vec3 tbCivilianFallback(vec3 source,float part){
          vec3 shirt=${species==='goat'?'vec3(.42,.57,.68)':'vec3(.67,.61,.43)'};
          vec3 bib=${species==='goat'?'vec3(.24,.115,.045)':'vec3(.055,.095,.15)'};
          vec3 cloth=part<1.5?shirt:part<2.5?bib:shirt;
          return mix(source,cloth,tbCivilianEnabled*tbClothPart());
        }
      `);
    };
    material.customProgramCacheKey=()=>cache.call(material)+'-tinderbox-cloth-v1';
    material.userData.tinderboxClothOnly=true;material.needsUpdate=true;
    restores.push(()=>{material.onBeforeCompile=original;material.customProgramCacheKey=cache;material.userData.textureBudget=budget;delete material.userData.tinderboxClothOnly;});
  }
  root.userData.skinSet=enabled?'exposition-v1':'inherited';
  return{set(value){flag.value=value?1:0;root.userData.skinSet=value?'exposition-v1':'inherited';},
    diagnostics:()=>({species,skinSet:root.userData.skinSet,clothOnly:true,projection:'original PAINT_FRAME',originalIdentityParts:[4,6,8],editedClothParts:[1,2],cuffParts:[3,5],scarfPart:7,protectedRegions:['head above 1.305m','forearms below 0.918m','hooves','mane, horns and beard'],paintSize:[texture.image.width,texture.image.height]}),
    dispose(){for(const restore of restores.splice(0))restore();}};
}
