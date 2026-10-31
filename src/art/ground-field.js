
import {Resources,clamp} from './resources.js';
import {CONSUMED_CHAR_SURFACE_GLSL} from '../../assets/art/fire-realism/consumed-char-surface.js';

// Prototype soot/coverage scale: litres per square metre, unrelated to pouring.
// Call only after classifyCharEvidence has validated the whole detached frame.
export function consumedFuelChar(cell){
  const surface=cell.initialSurfaceFuel>0?clamp((cell.initialSurfaceFuel-cell.surfaceFuel)/cell.initialSurfaceFuel):0;
  const gas=1-Math.exp(-cell.consumedDepositedFuel/(.16*cell.size*cell.size));
  return 1-(1-surface)*(1-gas);
}
export function classifyCharEvidence(cells){
  if(!Array.isArray(cells))throw Error('Ground char requires a cell array');
  if(!cells.length)return 'empty';
  let evidence=0,legacy=0;
  for(const cell of cells){
    if(!cell||typeof cell!=='object'||Array.isArray(cell))throw Error('Malformed ground char cell');
    const initial=Object.hasOwn(cell,'initialSurfaceFuel'),consumed=Object.hasOwn(cell,'consumedDepositedFuel');
    if(initial!==consumed)throw Error('Partial ground char evidence');
    if(!initial){legacy++;continue;}
    evidence++;
    if(![cell.initialSurfaceFuel,cell.consumedDepositedFuel,cell.surfaceFuel,cell.size,cell.x,cell.y].every(Number.isFinite)||
       cell.initialSurfaceFuel<0||cell.consumedDepositedFuel<0||cell.surfaceFuel<0||cell.surfaceFuel>cell.initialSurfaceFuel||cell.size<=0||
       !Number.isFinite(.16*cell.size*cell.size)||.16*cell.size*cell.size<=0)throw Error('Malformed ground char evidence');
  }
  if(evidence&&legacy)throw Error('Mixed legacy and consumed-fuel ground char evidence');
  return evidence?'consumed-fuel-v1':'legacy-phase';
}
function gridPlan(world,strict){
  const size=strict?world.fireCellSize:world.fireCellSize||.5,width=world.width,height=world.height;
  if(![width,height,size].every(Number.isFinite)||width<=0||height<=0||size<=0)throw Error('Malformed ground char grid');
  const columns=width/size,lines=height/size;
  // Same authoring limits/alignment as simulation/fixtures.js. Round the
  // accepted aligned grid exactly as HeatField does, including decimal pitch.
  if(strict&&(width>64||height>64||size<.125||size>1||Math.abs(columns-Math.round(columns))>1e-8||
      Math.abs(lines-Math.round(lines))>1e-8||columns*lines>65536))throw Error('Ground char grid exceeds authoritative native bounds');
  const cols=strict?Math.round(columns):Math.max(1,Math.ceil(columns)),rows=strict?Math.round(lines):Math.max(1,Math.ceil(lines));
  const cells=cols*rows,lanes=cells*4,bytes=lanes*Float32Array.BYTES_PER_ELEMENT;
  // Check the ACTUAL allocation arithmetic, also for legacy/empty masks.
  if(![cols,rows,cells,lanes,bytes].every(Number.isSafeInteger)||cols<1||rows<1||cells>65536||
     lanes>65536*4||bytes>65536*4*4)throw Error('Ground char grid has unsafe allocation arithmetic');
  return {size,cols,rows,lanes,bytes};
}
export function createGroundField(T){
  const pool=new Resources(),root=new T.Group();root.name='Authoritative gas / heat / char mask';
  let cols=1,rows=1,size=.5,data=new Float32Array(4),texture,geometry,mesh;
  let charMode='empty',cellCount=0;
  const uniforms={field:{value:null},grid:{value:new T.Vector2(1,1)},cellSize:{value:.5},charVersion:{value:1}};
  const material=pool.material(new T.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,uniforms,
    vertexShader:`varying vec3 fieldWorld;void main(){vec4 w=modelMatrix*vec4(position,1.);fieldWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`
      uniform sampler2D field;uniform vec2 grid;uniform float cellSize;uniform float charVersion;varying vec3 fieldWorld;
      float noise(vec2 p){return fract(sin(dot(floor(p),vec2(127.1,311.7)))*43758.5453);}
      vec4 sampleCell(vec2 p){if(any(lessThan(p,vec2(0.)))||any(greaterThanEqual(p,grid)))return vec4(0.);return texture2D(field,(p+.5)/grid);}
      float segment(vec2 p,vec2 b){float t=clamp(dot(p,b)/max(dot(b,b),.00001),0.,1.);return length(p-b*t);}
      ${CONSUMED_CHAR_SURFACE_GLSL}
      void main(){
        vec2 c=floor(fieldWorld.xz/cellSize),p=fract(fieldWorld.xz/cellSize)-.5;
        vec4 state=sampleCell(c);float d=length(p);
        if(sampleCell(c+vec2(1,0)).r>.001)d=min(d,segment(p,vec2(.5,0)));
        if(sampleCell(c+vec2(-1,0)).r>.001)d=min(d,segment(p,vec2(-.5,0)));
        if(sampleCell(c+vec2(0,1)).r>.001)d=min(d,segment(p,vec2(0,.5)));
        if(sampleCell(c+vec2(0,-1)).r>.001)d=min(d,segment(p,vec2(0,-.5)));
        for(int x=-1;x<=1;x+=2)for(int y=-1;y<=1;y+=2){
          vec2 n=vec2(float(x),float(y));if(sampleCell(c+n).r>.001)d=min(d,segment(p,n*.5));
        }
        float grain=noise(fieldWorld.xz*65.);
        float edge=.27+.025*sin(fieldWorld.x*28.+sin(fieldWorld.z*17.))+.02*grain;
        float gas=(1.-smoothstep(edge-.025,edge+.035,d))*step(.001,state.r)*(.70+.12*state.r);
        float ds=length(p);
        float charWidth;float scar;vec3 charPigment;
        if(charVersion<.5){
          if(sampleCell(c+vec2(1,0)).b>.01)ds=min(ds,segment(p,vec2(.5,0)));
          if(sampleCell(c+vec2(-1,0)).b>.01)ds=min(ds,segment(p,vec2(-.5,0)));
          if(sampleCell(c+vec2(0,1)).b>.01)ds=min(ds,segment(p,vec2(0,.5)));
          if(sampleCell(c+vec2(0,-1)).b>.01)ds=min(ds,segment(p,vec2(0,-.5)));
          charWidth=state.b>.9?.50:.29;
          scar=state.b*(1.-smoothstep(charWidth-.035,charWidth+.055,ds+.018*sin(fieldWorld.x*24.+fieldWorld.z*31.)));
          charPigment=vec3(.065,.070,.058);
        }else{
          ds=min(ds,mix(length(p),segment(p,vec2(.5,0)),sampleCell(c+vec2(1,0)).b));
          ds=min(ds,mix(length(p),segment(p,vec2(-.5,0)),sampleCell(c+vec2(-1,0)).b));
          ds=min(ds,mix(length(p),segment(p,vec2(0,.5)),sampleCell(c+vec2(0,1)).b));
          ds=min(ds,mix(length(p),segment(p,vec2(0,-.5)),sampleCell(c+vec2(0,-1)).b));
          charWidth=mix(.29,.50,state.b);
          // charVersion is a material uniform. Reach derivatives even on cold
          // fragments, before any per-fragment eligibility/discard below.
          scar=consumedCharScar(fieldWorld.xz,ds,charWidth,state.b,cellSize);
          charPigment=consumedCharPigment(fieldWorld.xz,state.b);
        }
        float warmth=state.g*(1.-smoothstep(.12,.56,length(p)));
        float a=max(gas,max(scar*.78,warmth*.42));
        if(a<.008)discard;
        vec3 col=vec3(.12,.145,.095)*(1.+.14*grain);
        float sheen=pow(max(0.,sin(fieldWorld.x*34.+fieldWorld.z*17.)),18.)*.045;
        col+=vec3(.18,.20,.08)*sheen;
        col=mix(col,charPigment,scar);
        col=mix(col,vec3(.88,.28,.035),warmth*.52);
        gl_FragColor=vec4(col,a);
        #include <colorspace_fragment>
      }`
  }));
  function resize({size:nextSize,cols:nextCols,rows:nextRows,lanes,bytes}){
    if(texture&&cols===nextCols&&rows===nextRows&&size===nextSize)return;
    let nextData,nextTexture,nextGeometry,nextMesh;
    try{
      nextData=new Float32Array(lanes);if(nextData.byteLength!==bytes)throw Error('Ground char allocation extent differs');
      nextTexture=new T.DataTexture(nextData,nextCols,nextRows,T.RGBAFormat,T.FloatType);
      nextTexture.minFilter=nextTexture.magFilter=T.NearestFilter;nextTexture.generateMipmaps=false;
      nextGeometry=new T.PlaneGeometry(nextCols*nextSize,nextRows*nextSize);nextGeometry.rotateX(-Math.PI/2);
      nextMesh=new T.Mesh(nextGeometry,material);nextMesh.position.set(nextCols*nextSize/2,.018,nextRows*nextSize/2);nextMesh.renderOrder=-1;
      root.add(nextMesh);
    }catch(primary){
      const failures=[];
      for(const clean of [()=>nextMesh?.removeFromParent(),()=>nextGeometry?.dispose(),()=>nextTexture?.dispose()]){
        try{clean();}catch(error){failures.push(error);}
      }
      if(failures.length)throw new AggregateError([primary,...failures],'Ground field preparation and candidate cleanup failed',{cause:primary});
      throw primary;
    }
    // No borrowed uniform, active data, ownership set or old resource is touched
    // until buffer/texture/geometry/mesh/settings are fully prepared.
    const previousTexture=texture,previousGeometry=geometry,previousMesh=mesh;
    cols=nextCols;rows=nextRows;size=nextSize;data=nextData;
    texture=pool.texture(nextTexture);geometry=pool.geometry(nextGeometry);mesh=nextMesh;
    uniforms.field.value=texture;uniforms.grid.value.set(cols,rows);uniforms.cellSize.value=size;
    if(previousTexture){
      pool.textures.delete(previousTexture);pool.geometries.delete(previousGeometry);
      const failures=[];
      for(const clean of [()=>previousTexture.dispose(),()=>previousGeometry.dispose(),()=>previousMesh.removeFromParent()]){
        try{clean();}catch(error){failures.push(error);}
      }
      if(failures.length)throw new AggregateError(failures,'Ground field previous-resource retirement failed');
    }
  }
  return {root,uniforms,update(snapshot){
    const cells=snapshot.cells===undefined?[]:snapshot.cells,mode=classifyCharEvidence(cells);
    const plan=gridPlan(snapshot.world,mode==='consumed-fuel-v1');
    // Validate new evidence before resizing/clearing an existing borrowed mask.
    // The explicit legacy path retains its historical outside-grid omission.
    if(mode==='consumed-fuel-v1'){
      const {size:nextSize,cols:nextCols,rows:nextRows}=plan;
      const occupied=new Set();
      for(const cell of cells){
        const x=Math.floor(cell.x/nextSize),y=Math.floor(cell.y/nextSize),key=y*nextCols+x;
        if(cell.size!==nextSize||x<0||y<0||x>=nextCols||y>=nextRows||occupied.has(key))throw Error('Ground char evidence must occupy unique cells in its native grid');
        occupied.add(key);
      }
    }
    resize(plan);data.fill(0);
    for(const cell of cells){
      const x=Math.floor(cell.x/size),y=Math.floor(cell.y/size);
      if(x<0||y<0||x>=cols||y>=rows)continue;
      const i=(y*cols+x)*4;
      data[i]=Math.min(1,Math.sqrt(Math.max(0,cell.depositedFuel||0))*2);
      data[i+1]=cell.phase==='heating'?.24+clamp(cell.heat)*.55:cell.phase==='burning'?clamp(cell.intensity)*.75:0;
      data[i+2]=mode==='legacy-phase'?(cell.phase==='spent'?(/grass|wood/.test(cell.material)?1:.85):cell.phase==='burning'?.27:0):consumedFuelChar(cell);
      data[i+3]=cell.phase==='burning'?1:0;
    }
    charMode=mode;cellCount=cells.length;uniforms.charVersion.value=mode==='legacy-phase'?0:1;
    texture.needsUpdate=true;
  },diagnostics:()=>({charMode,charVersion:uniforms.charVersion.value,cells:cellCount}),dispose(){root.removeFromParent();root.clear();pool.dispose();},counts:()=>pool.counts()};
}
