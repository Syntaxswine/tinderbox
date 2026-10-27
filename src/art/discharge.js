
import {Resources,hash} from './resources.js';
const MAX_RAYS=256, STEPS=10, MAX_VERTICES=18000, MAX_INDICES=52000, MAX_PLUMES=128;
const finitePoint=p=>p&&[p.x,p.y,p.h].every(Number.isFinite);
const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
function insideFan(point,origin,rays){
  const px=point.x-origin.x,py=point.y-origin.y;
  if(px*px+py*py<1e-12)return true;
  for(let i=0;i<rays.length-1;i++){
    const ax=rays[i].x-origin.x,ay=rays[i].y-origin.y,bx=rays[i+1].x-origin.x,by=rays[i+1].y-origin.y;
    const area=cross(ax,ay,bx,by);if(area<1e-10)continue;
    if(cross(ax,ay,px,py)>=0&&cross(px,py,bx,by)>=0&&cross(bx-ax,by-ay,px-ax,py-ay)>=0)return true;
  }
  return false;
}
export function createDischarge(T,flameTexture){
  const pool=new Resources(),root=new T.Group();root.name='Resolved tool discharge';root.visible=false;
  const rayData=new Float32Array(MAX_RAYS*4),rayTexture=pool.texture(new T.DataTexture(rayData,MAX_RAYS,1,T.RGBAFormat,T.FloatType));
  rayTexture.minFilter=rayTexture.magFilter=T.NearestFilter;rayTexture.generateMipmaps=false;
  const uniforms={map:{value:flameTexture},clock:{value:0},rayTable:{value:rayTexture},rayCount:{value:0},
    shapeOrigin:{value:new T.Vector2()},sourceOrigin:{value:new T.Vector2()},direction:{value:new T.Vector2(1,0)},heading:{value:0},
    minAngle:{value:0},maxAngle:{value:0},start:{value:0},bear:{value:new T.Vector2()}};
  const position=new Float32Array(MAX_VERTICES*3),uv=new Float32Array(MAX_VERTICES*2),cut=new Float32Array(MAX_VERTICES),reach=new Float32Array(MAX_VERTICES),seed=new Float32Array(MAX_VERTICES),opacity=new Float32Array(MAX_VERTICES),indices=new Uint16Array(MAX_INDICES);
  const geometry=pool.geometry(new T.BufferGeometry());
  for(const [name,array,count]of [['position',position,3],['uv',uv,2],['cut',cut,1],['reach',reach,1],['seed',seed,1],['opacity',opacity,1]])geometry.setAttribute(name,new T.BufferAttribute(array,count).setUsage(T.DynamicDrawUsage));
  geometry.setIndex(new T.BufferAttribute(indices,1).setUsage(T.DynamicDrawUsage));geometry.setDrawRange(0,0);
  const atlasCode=`
    vec4 frame(float n,vec2 p){n=mod(n,4.);vec2 cell=vec2(mod(n,2.),1.-floor(n/2.));return texture2D(map,(cell+clamp(p,.012,.988))*.5);}
  `;
  const fanMaterial=pool.material(new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false,
    vertexShader:`
      attribute float cut,reach,seed,opacity;uniform float clock;
      varying vec2 paintUv;varying vec3 paintWorld;varying float paintCut,paintReach,paintSeed,paintOpacity;
      void main(){
        paintUv=uv;paintCut=cut;paintReach=reach;paintSeed=seed;paintOpacity=opacity;
        vec3 p=position;p.y+=.025*sin(clock*6.4+uv.y*11.+seed*4.)*sin(uv.y*3.14159265);
        paintWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(paintWorld,1.);
      }`,
    fragmentShader:`
      uniform sampler2D map;uniform float clock,start;uniform vec2 sourceOrigin,direction,bear;
      varying vec2 paintUv;varying vec3 paintWorld;varying float paintCut,paintReach,paintSeed,paintOpacity;
    `+atlasCode+`
      void main(){
        float forward=dot(paintWorld.xz-sourceOrigin,direction);
        if(paintCut>.5&&forward<start)discard;
        vec2 p=paintUv;if(paintCut>.5)p.y=(forward-start)/max(.025,paintReach-start);
        if(p.y<0.||p.y>1.)discard;
        p.x+=.015*sin(clock*5.+p.y*14.+paintSeed*5.);
        float phase=clock*4.8+paintSeed*3.;vec4 c=mix(frame(floor(phase),vec2(p.x,.08+.80*p.y)),frame(floor(phase)+1.,vec2(p.x,.08+.80*p.y)),smoothstep(0.,1.,fract(phase)));
        c.a*=paintOpacity*smoothstep(0.,.055,p.y)*(1.-smoothstep(.92,1.,p.y));
        c.a*=mix(.38,1.,smoothstep(.42,1.05,length(paintWorld.xz-bear)));
        if(c.a<.012)discard;gl_FragColor=c;
        #include <colorspace_fragment>
      }`
  }));
  const ribbon=new T.Mesh(geometry,fanMaterial);ribbon.name='Resolved discharge ribbons';ribbon.frustumCulled=false;ribbon.renderOrder=3;root.add(ribbon);
  const base=new T.PlaneGeometry(1,1);base.translate(0,.5,0);
  const plumeGeometry=pool.geometry(new T.InstancedBufferGeometry().copy(base));base.dispose();plumeGeometry.instanceCount=0;
  const offsets=new Float32Array(MAX_PLUMES*3),shapes=new Float32Array(MAX_PLUMES*4);
  plumeGeometry.setAttribute('iOffset',new T.InstancedBufferAttribute(offsets,3).setUsage(T.DynamicDrawUsage));
  plumeGeometry.setAttribute('iShape',new T.InstancedBufferAttribute(shapes,4).setUsage(T.DynamicDrawUsage));
  const plumeMaterial=pool.material(new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false,
    vertexShader:`
      attribute vec3 iOffset;attribute vec4 iShape;uniform float clock;
      varying vec2 paintUv;varying vec3 paintWorld;varying vec4 paintShape;
      void main(){
        paintUv=uv;paintShape=iShape;
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
        vec3 p=iOffset+right*(position.x*iShape.x)+vec3(0.,position.y*iShape.y+.018*sin(clock*5.+iShape.w*19.)*position.y,0.);
        paintWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(paintWorld,1.);
      }`,
    fragmentShader:`
      uniform sampler2D map,rayTable;uniform float clock,rayCount,heading,minAngle,maxAngle,start;
      uniform vec2 shapeOrigin,sourceOrigin,direction,bear;
      varying vec2 paintUv;varying vec3 paintWorld;varying vec4 paintShape;
    `+atlasCode+`
      // Exact level-zero data fetch: no implicit derivatives in the varying search.
      vec4 ray(float i){return texelFetch(rayTable,ivec2(int(i),0),0);}
      bool allowed(vec2 p){
        vec2 delta=p-shapeOrigin;if(dot(delta,delta)<.00000001)return true;
        float a=atan(delta.y,delta.x)-heading;a=atan(sin(a),cos(a));
        if(a<minAngle||a>maxAngle||rayCount<2.)return false;
        float lo=0.,hi=rayCount-1.;
        for(int i=0;i<9;i++){float mid=floor((lo+hi)*.5);if(ray(mid).z<=a)lo=mid;else hi=mid;}
        vec2 left=ray(lo).xy,right=ray(min(lo+1.,rayCount-1.)).xy,edge=right-left;
        float lengthEdge=length(edge);if(lengthEdge<.0000001)return false;
        return edge.x*(p.y-left.y)-edge.y*(p.x-left.x)>=lengthEdge*.0000001;
      }
      void main(){
        if(!allowed(paintWorld.xz)||dot(paintWorld.xz-sourceOrigin,direction)<start)discard;
        vec2 p=paintUv;if(paintShape.w>.5)p.x=1.-p.x;
        float phase=clock*4.8+paintShape.w*7.;vec4 c=mix(frame(floor(phase),p),frame(floor(phase)+1.,p),smoothstep(0.,1.,fract(phase)));
        c.a*=paintShape.z*smoothstep(0.,.07,p.y)*(1.-smoothstep(.91,1.,p.y));
        c.a*=mix(.38,1.,smoothstep(.42,1.05,length(paintWorld.xz-bear)));
        if(c.a<.012)discard;gl_FragColor=c;
        #include <colorspace_fragment>
      }`
  }));
  const plumes=new T.Mesh(plumeGeometry,plumeMaterial);plumes.name='Resolved discharge plumes';plumes.frustumCulled=false;plumes.renderOrder=3;root.add(plumes);
  let vertices=0,indexCount=0,plumeCount=0,signature='',builds=0,closed=false;
  let state={active:false,rayCount:0,connectRays:false,triangles:0,plumeCards:0,capped:false,muzzleInsideShape:false,visualForwardStart:0};
  function vertex(p,u,v,cutValue,outerReach,seedValue,alpha){
    const i=vertices++;position.set([p.x,p.h,p.y],i*3);uv.set([u,v],i*2);cut[i]=cutValue;reach[i]=outerReach;seed[i]=seedValue;opacity[i]=alpha;return i;
  }
  function quad(a,b,c,d){indices.set([a,b,c,b,d,c],indexCount);indexCount+=6;}
  function strip(from,to,seedValue,alpha,cutValue,direction,sourceOrigin,height=.17){
    const startVertex=vertices,outer=(to.x-sourceOrigin.x)*direction.x+(to.y-sourceOrigin.y)*direction.y;
    for(let j=0;j<=STEPS;j++){const t=j/STEPS,p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,h:from.h+(to.h-from.h)*t};
      vertex({...p,h:p.h-height*Math.sin(Math.PI*t)},0,t,cutValue,outer,seedValue,alpha);
      vertex({...p,h:p.h+height*Math.sin(Math.PI*t)},1,t,cutValue,outer,seedValue,alpha);
      if(j>0){const a=startVertex+(j-1)*2;quad(a,a+1,a+2,a+3);}
    }
  }
  function build(d,muzzle){
    const all=d.rays;
    const valid=finitePoint(d.origin)&&finitePoint(d.shapeOrigin)&&Number.isFinite(d.heading)&&Array.isArray(all)&&all.every(r=>finitePoint(r)&&Number.isFinite(r.angle)&&Number.isFinite(r.distance)&&r.distance>=0);
    if(!valid){state={...state,active:false,invalid:'Invalid resolved discharge'};root.visible=false;return;}
    const rays=all.slice(0,MAX_RAYS),connected=d.connectRays===true&&all.length<=MAX_RAYS&&rays.length>1;
    if(connected&&rays.some((r,i)=>i>0&&r.angle<rays[i-1].angle)){state={...state,active:false,invalid:'Unordered resolved fan'};root.visible=false;return;}
    const o=d.shapeOrigin,source=d.origin,dir={x:Math.cos(d.heading),y:Math.sin(d.heading)};
    const muzzleGround=muzzle?{x:muzzle.x,y:muzzle.z}:null;
    const muzzleInside=!!(muzzleGround&&connected&&insideFan(muzzleGround,o,rays));
    const start=muzzleInside?Math.max(0,(muzzle.x-source.x)*dir.x+(muzzle.z-source.y)*dir.y):0;
    const fanCut=d.tool==='flamethrower'?1:0;
    uniforms.shapeOrigin.value.set(o.x,o.y);uniforms.sourceOrigin.value.set(source.x,source.y);uniforms.direction.value.set(dir.x,dir.y);
    uniforms.heading.value=d.heading;uniforms.rayCount.value=rays.length;uniforms.start.value=d.tool==='torch'?0:start;
    uniforms.minAngle.value=rays.length?rays[0].angle-d.heading:0;uniforms.maxAngle.value=rays.length?rays.at(-1).angle-d.heading:0;
    rayData.fill(0);rays.forEach((r,i)=>rayData.set([r.x,r.y,r.angle-d.heading,r.distance],i*4));rayTexture.needsUpdate=true;
    vertices=indexCount=plumeCount=0;
    if(connected){
      for(let layer=0;layer<3;layer++)for(let i=0;i<rays.length-1;i++){
        const a=rays[i],b=rays[i+1],base=vertices;
        for(let j=0;j<=STEPS;j++){
          const t=j/STEPS;
          for(const [r,side]of [[a,i],[b,i+1]]){
            const outer=(r.x-source.x)*dir.x+(r.y-source.y)*dir.y;
            vertex({x:o.x+(r.x-o.x)*t,y:o.y+(r.y-o.y)*t,h:o.h+(r.h-o.h)*t+(layer-1)*.19*Math.sin(Math.PI*t)},side/(rays.length-1),t,fanCut,outer,layer*.43,d.tool==='torch'?.13:.24);
          }
          if(j>0){const at=base+(j-1)*2;quad(at,at+1,at+2,at+3);}
        }
      }
      const stride=Math.max(1,Math.floor(rays.length/(d.tool==='torch'?8:11)));
      for(let i=0;i<rays.length&&plumeCount<MAX_PLUMES;i+=stride){
        const r=rays[i],outer=(r.x-source.x)*dir.x+(r.y-source.y)*dir.y;
        const first=fanCut?Math.min(1,(start+.035)/Math.max(.0001,outer)):.2;
        const samples=d.tool==='torch'?2:9;
        for(let j=0;j<samples&&plumeCount<MAX_PLUMES;j++){
          const seedValue=hash(i*13+j*7+1);
          const progress=d.tool==='torch'?(j+.35)/samples:j===samples-1?.995:(j+.2+seedValue*.6)/(samples-1);
          const t=first+(1-first)*progress;
          if(t>=1||first>=1)continue;
          const k=plumeCount++,width=d.tool==='torch'?.19:.27+t*.50;
          offsets.set([o.x+(r.x-o.x)*t,o.h+(r.h-o.h)*t-.12,o.y+(r.y-o.y)*t],k*3);
          shapes.set([width,d.tool==='torch'?.38:.30+t*.30,.64,seedValue],k*4);
        }
      }
    }else{
      for(let i=0;i<rays.length;i++)strip(o,rays[i],hash(i+1),.57,fanCut,dir,source,.16);
    }
    if(d.lead&&finitePoint(d.lead.from)&&finitePoint(d.lead.to))strip(d.lead.from,d.lead.to,.32,.58,0,dir,source,.055);
    for(const name of ['position','uv','cut','reach','seed','opacity'])geometry.getAttribute(name).needsUpdate=true;
    geometry.index.needsUpdate=true;geometry.setDrawRange(0,indexCount);
    plumeGeometry.getAttribute('iOffset').needsUpdate=true;plumeGeometry.getAttribute('iShape').needsUpdate=true;plumeGeometry.instanceCount=plumeCount;
    root.visible=true;builds++;
    state={active:true,tool:d.tool,connectRays:connected,rayCount:rays.length,triangles:indexCount/3,plumeCards:plumeCount,
      longestRay:rays.reduce((m,r)=>Math.max(m,r.distance),0),capped:all.length>MAX_RAYS,muzzleInsideShape:muzzleInside,
      visualForwardStart:fanCut?start:0,invalid:null};
  }
  return {root,update(d,time,anchors={}){
    if(closed)return;uniforms.clock.value=Number.isFinite(time)?time:0;
    if(!d||d.version!==1||!d.active||!['torch','flamethrower'].includes(d.tool)){root.visible=false;geometry.setDrawRange(0,0);plumeGeometry.instanceCount=0;signature='';state={...state,active:false,rayCount:0,triangles:0,plumeCards:0};return;}
    const m=anchors.muzzle;uniforms.bear.value.set(d.origin?.x||0,d.origin?.y||0);
    const next=JSON.stringify([d.tool,d.origin,d.shapeOrigin,d.heading,d.connectRays,d.rays,d.lead,m?.x,m?.z]);
    if(next!==signature){signature=next;build(d,m);}
  },dispose(){if(closed)return;closed=true;root.removeFromParent();root.clear();pool.dispose();},
    diagnostics:()=>({...state,geometryBuilds:builds,worldTime:uniforms.clock.value,...pool.counts()})};
}
