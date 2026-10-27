
import {Resources,clamp,seedOf,hash} from './resources.js';
import {createDischarge} from './discharge.js';
const MAX_CELLS=4096;
export function createFire(T,assets,fieldUniforms){
  const pool=new Resources(),root=new T.Group();root.name='Painted authoritative fire';
  const worldClock={value:0},bear={value:new T.Vector3()},layers=[];
  function layer(map,kind,capacity){
    const base=new T.PlaneGeometry(1,1);base.translate(0,.5,0);
    const geometry=pool.geometry(new T.InstancedBufferGeometry().copy(base));base.dispose();geometry.instanceCount=0;
    const offsets=new Float32Array(capacity*3),shapes=new Float32Array(capacity*4),info=new Float32Array(capacity*2);
    for(const [name,array,itemSize]of [['iOffset',offsets,3],['iShape',shapes,4],['iInfo',info,2]])geometry.setAttribute(name,new T.InstancedBufferAttribute(array,itemSize).setUsage(T.DynamicDrawUsage));
    const material=pool.material(new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false,
      uniforms:{map:{value:map},clock:worldClock,bear,kind:{value:kind},field:fieldUniforms.field,grid:fieldUniforms.grid,cellSize:fieldUniforms.cellSize},
      vertexShader:`
        attribute vec3 iOffset;attribute vec4 iShape;attribute vec2 iInfo;
        uniform float clock,kind;varying vec2 uvPaint;varying vec4 shape;varying vec2 info;varying vec3 paintWorld;
        void main(){
          uvPaint=uv;shape=iShape;info=iInfo;
          vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
          float sway=sin(clock*(kind>.5?1.1:3.7)+iShape.w*19.+position.y*5.)*position.y*position.y*(kind>.5?.09:.035);
          vec3 p=iOffset+right*((position.x+sway)*iShape.x)+vec3(0.,position.y*iShape.y,0.);
          paintWorld=(modelMatrix*vec4(p,1.)).xyz;
          gl_Position=projectionMatrix*viewMatrix*vec4(paintWorld,1.);
        }`,
      fragmentShader:`
        uniform sampler2D map,field;uniform float clock,kind,cellSize;uniform vec2 grid;uniform vec3 bear;
        varying vec2 uvPaint;varying vec4 shape;varying vec2 info;varying vec3 paintWorld;
        vec4 frame(float n,vec2 p){n=mod(n,4.);vec2 cell=vec2(mod(n,2.),1.-floor(n/2.));return texture2D(map,(cell+clamp(p,.012,.988))*.5);}
        void main(){
          vec2 p=uvPaint;if(shape.w>.5)p.x=1.-p.x;
          p.x+=.012*sin(p.y*8.+clock*(kind>.5?1.1:4.2)+shape.w*13.);
          float phase=kind>1.5&&kind<2.5?info.x:clock*(kind>.5&&kind<1.5?1.25:4.2)+shape.w*7.;
          vec4 c=mix(frame(floor(phase),p),frame(floor(phase)+1.,p),smoothstep(0.,1.,fract(phase)));
          c.a*=shape.z;
          c.a*=smoothstep(0.,.045,p.y)*(1.-smoothstep(.90,1.,p.y));
          float distanceToBear=length(paintWorld.xz-bear.xz);
          float legibility=mix(.33,1.,smoothstep(.43,1.05,distanceToBear));
          c.a*=legibility;
          if(kind>.5&&kind<1.5){
            float lum=dot(c.rgb,vec3(.299,.587,.114));
            c.rgb=mix(vec3(.045,.051,.045),vec3(.25,.26,.23),lum);
            c.a*=smoothstep(0.,.18,p.y);
          }else if(kind<.5){
            vec2 cell=floor(paintWorld.xz/cellSize);
            if(any(lessThan(cell,vec2(0.)))||any(greaterThanEqual(cell,grid)))discard;
            float live=texture2D(field,(cell+.5)/grid).a;
            if(paintWorld.y<.25&&live<.5)c.a*=smoothstep(.02,.25,paintWorld.y);
            c.a*=.86+.10*sin(clock*3.1+shape.w*17.);
          }
          if(c.a<.012)discard;gl_FragColor=c;
          #include <colorspace_fragment>
        }`
    }));
    const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=kind===1?4:3;root.add(mesh);
    const value={mesh,geometry,offsets,shapes,info,count:0,capacity,
      begin(){this.count=0;},
      add(x,y,z,w,h,opacity,seed,phase=0,extra=0){
        if(this.count>=capacity)return false;const i=this.count++;
        offsets.set([x,y,z],i*3);shapes.set([w,h,opacity,seed],i*4);info.set([phase,extra],i*2);return true;
      },
      end(){geometry.instanceCount=this.count;for(const name of ['iOffset','iShape','iInfo'])geometry.getAttribute(name).needsUpdate=true;}
    };layers.push(value);return value;
  }
  const flames=layer(assets.flame,0,MAX_CELLS*2),smoke=layer(assets.smoke,1,MAX_CELLS),bursts=layer(assets.burst,2,64);
  const discharge=createDischarge(T,assets.flame);root.add(discharge.root);
  const history=new Map(),eventsSeen=new Set(),eventOrder=[],explosions=[];
  let lastWorld=-Infinity,lastTick=-1,eventCount=0,capped=false,highestEvent=-Infinity,primed=false;
  const lights=Array.from({length:3},()=>{const light=new T.PointLight(0xffad52,0,4,2);root.add(light);return light;});
  function reset(){history.clear();eventsSeen.clear();eventOrder.length=0;explosions.length=0;highestEvent=-Infinity;primed=false;}
  function update(snapshot,time,anchors={}){
    const clock=Number.isFinite(time)?time:snapshot.clocks?.world||0;
    if(clock<lastWorld-1e-8||snapshot.tick<lastTick)reset();
    lastWorld=clock;lastTick=snapshot.tick;worldClock.value=clock;bear.value.set(snapshot.player.x,1,snapshot.player.y);
    for(const l of layers)l.begin();capped=false;
    const activeIds=new Set(),lightGroups=new Map();
    for(const cell of snapshot.cells||[]){
      activeIds.add(cell.id);const old=history.get(cell.id);
      const entry=old&&old.phase===cell.phase?old:{phase:cell.phase,at:cell.phase==='spent'&&!old?clock-5:clock};
      history.set(cell.id,entry);const seed=seedOf(cell.id),intensity=clamp(cell.intensity);
      if(cell.phase==='burning'&&intensity>0){
        const h=.30+intensity*(cell.depositedFuel>0?1.2:.94),w=(cell.size||snapshot.world.fireCellSize||.5)*1.8;
        for(let i=0;i<2;i++){
          const n=hash(seed*100+i+11);
          if(!flames.add(cell.x+(n-.5)*.14,.025,cell.y+(hash(seed*23+i)-.5)*.12,w*(.78+n*.28),h*(.65+hash(seed*9+i)*.70),.58+intensity*.24,hash(seed*59+i)))capped=true;
        }
        const key=Math.floor(cell.x/2)+','+Math.floor(cell.y/2),g=lightGroups.get(key)||{x:0,y:0,weight:0};
        g.x+=cell.x*intensity;g.y+=cell.y*intensity;g.weight+=intensity;lightGroups.set(key,g);
      }
      const tail=cell.phase==='spent'?Math.max(0,1-(clock-entry.at)/3.2):0;
      if((cell.phase==='burning'||tail>0)&&seed>.38){
        const strength=cell.phase==='burning'?intensity:tail*.45;
        const drift=((clock*.13+seed)%1);
        smoke.add(cell.x+(seed-.5)*.2,.20+drift*.55,cell.y,.55+seed*.35,1.05+strength*.9+drift*.55,.30*strength*(1-drift*.45),seed);
      }
    }
    for(const id of history.keys())if(!activeIds.has(id))history.delete(id);
    for(const event of snapshot.events||[]){
      const key=typeof event.id+':'+event.id;if(eventsSeen.has(key))continue;
      if(typeof event.id==='number'&&event.id<=highestEvent)continue;
      eventsSeen.add(key);eventOrder.push(key);
      if(eventOrder.length>512)eventsSeen.delete(eventOrder.shift());
      eventCount++;
      // Establish a receipt cursor on mount/reset; undated startup history is not a new burst.
      if(!primed&&!Number.isFinite(event.worldTime))continue;
      if(['explosion','barrel-explosion','barrel-exploded','molotov-impact'].includes(event.type)){
        const at=Number.isFinite(event.worldTime)?event.worldTime:clock;
        if(clock-at<1.5){if(explosions.length>=8)explosions.shift();explosions.push({x:event.x,y:event.y,at,radius:clamp(event.radius||1.5,.5,4),seed:seedOf(event.id)});}
      }
    }
    for(const event of snapshot.events||[])if(typeof event.id==='number')highestEvent=Math.max(highestEvent,event.id);
    for(let i=explosions.length-1;i>=0;i--){
      const e=explosions[i],age=clock-e.at;if(age>1.5){explosions.splice(i,1);continue;}
      if(age<0)continue;
      const phase=clamp(age/.90)*2.999,opacity=Math.max(0,1-age/1.5),growth=.35+Math.sqrt(age)*e.radius;
      for(let j=0;j<4;j++){const angle=j*2.399+e.seed*7;bursts.add(e.x+Math.cos(angle)*age*.40,.10+j*.07,e.y+Math.sin(angle)*age*.40,growth,growth*(.85+j*.06),opacity*.73,hash(e.seed*89+j),phase);}
    }
    const groups=[...lightGroups.values()].sort((a,b)=>b.weight-a.weight);
    lights.forEach((light,i)=>{const g=groups[i];light.intensity=g?Math.min(3.5,g.weight*.65):0;if(g)light.position.set(g.x/g.weight,.60,g.y/g.weight);});
    discharge.update(snapshot.discharge,clock,anchors);
    primed=true;for(const l of layers)l.end();
  }
  return {root,update,reset,dispose(){discharge.dispose();root.removeFromParent();root.clear();pool.dispose();for(const l of lights)l.shadow?.dispose();},
    diagnostics:()=>({flameCards:flames.count,smokeCards:smoke.count,burstCards:bursts.count,discharge:discharge.diagnostics(),eventCount,trackedCells:history.size,seenEvents:eventsSeen.size,capped,worldTime:worldClock.value,...pool.counts()})};
}
