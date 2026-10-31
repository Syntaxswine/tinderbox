import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {CONSUMED_CHAR_SURFACE_GLSL} from '../../assets/art/fire-realism/consumed-char-surface.js';

const withoutComments=source=>source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
function block(source,open){
  assert.equal(source[open],'{');let depth=1,end=open+1;
  for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  assert.equal(depth,0,'Actual composed shader block must close');
  return {body:source.slice(open+1,end-1),end};
}
function actualBranches(shader){
  const source=withoutComments(shader),mainAt=source.indexOf('void main()'),main=block(source,source.indexOf('{',mainAt));
  const uniformAt=main.body.indexOf('if(charVersion<.5)'),legacy=block(main.body,main.body.indexOf('{',uniformAt));
  assert.equal(main.body.slice(legacy.end).trimStart().slice(0,4),'else');
  const current=block(main.body,main.body.indexOf('{',legacy.end));
  return {main:main.body,legacy:legacy.body,current:current.body,uniformAt};
}
const cell=(size,extra={})=>({id:'burned',x:size*.5,y:size*.5,size,material:'grass',phase:'spent',initialSurfaceFuel:.3,surfaceFuel:0,consumedDepositedFuel:0,depositedFuel:0,heat:0,intensity:0,...extra});

test('actual shared material contains exactly the reviewed LF module and both local functions once',()=>{
  const raw=fs.readFileSync(new URL('../../assets/art/fire-realism/consumed-char-surface.js',import.meta.url));
  assert.equal(raw.includes(13),false);
  // This is the architect-pinned imported artifact, not a golden of our shader.
  assert.equal(raw.length,3402);assert.equal(createHash('sha256').update(raw).digest('hex'),'0a8b2ea290e4aea955879b8f21da551d52e9515cd34aaeb1635b468cff84e468');
  const field=createGroundField(T);
  try{
    field.update({world:{width:1,height:.5,fireCellSize:.5},cells:[cell(.5)]});
    const material=field.root.children[0].material,shader=material.fragmentShader;
    assert.equal(shader.split(CONSUMED_CHAR_SURFACE_GLSL).length-1,1);
    assert.equal((shader.match(/float consumedCharScar\s*\(/g)||[]).length,1);
    assert.equal((shader.match(/vec3 consumedCharPigment\s*\(/g)||[]).length,1);
    assert.deepEqual(Object.keys(material.uniforms).sort(),['cellSize','charVersion','field','grid']);
    assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);assert.equal(material.depthTest,true);assert.equal(material.side,T.DoubleSide);
  }finally{field.dispose();}
});

test('actual composition reaches derivatives under only the uniform version branch and retains legacy/gas/heat/alpha formulas',()=>{
  const field=createGroundField(T);
  try{
    field.update({world:{width:1,height:.5,fireCellSize:.5},cells:[cell(.5)]});
    const shader=field.root.children[0].material.fragmentShader,{main,legacy,current}=actualBranches(shader);
    assert.equal((main.match(/consumedCharScar\s*\(/g)||[]).length,1);
    assert.equal((main.match(/consumedCharPigment\s*\(/g)||[]).length,1);
    assert.match(current,/scar=consumedCharScar\(fieldWorld\.xz,ds,charWidth,state\.b,cellSize\);/);
    assert.match(current,/charPigment=consumedCharPigment\(fieldWorld\.xz,state\.b\);/);
    assert.doesNotMatch(current,/\b(?:if|return|discard)\b/,'No varying eligibility caller may surround either function');
    const scarCall=main.indexOf('scar=consumedCharScar('),discard=main.indexOf('discard');
    assert.ok(scarCall>=0&&discard>scarCall);
    assert.doesNotMatch(main.slice(0,scarCall),/\b(?:return|discard)\b/,'Cold fragments still reach coverage derivatives');
    assert.ok(CONSUMED_CHAR_SURFACE_GLSL.indexOf('fwidth(fine)')<CONSUMED_CHAR_SURFACE_GLSL.indexOf('if (c <= 0.'));
    assert.equal((legacy.match(/\.b>\.01/g)||[]).length,4);
    assert.ok(legacy.includes('charWidth=state.b>.9?.50:.29;'));
    assert.ok(legacy.includes('scar=state.b*(1.-smoothstep(charWidth-.035,charWidth+.055,ds+.018*sin(fieldWorld.x*24.+fieldWorld.z*31.)));'));
    assert.ok(legacy.includes('charPigment=vec3(.065,.070,.058);'));assert.doesNotMatch(legacy,/consumedChar/);
    assert.ok(main.includes('float gas=(1.-smoothstep(edge-.025,edge+.035,d))*step(.001,state.r)*(.70+.12*state.r);'));
    assert.ok(main.includes('float warmth=state.g*(1.-smoothstep(.12,.56,length(p)));'));
    assert.ok(main.includes('float a=max(gas,max(scar*.78,warmth*.42));'));
    assert.ok(main.includes('col=mix(col,charPigment,scar);'),'Pigment reaches the surface only through coverage');
    assert.ok(main.includes('col=mix(col,vec3(.88,.28,.035),warmth*.52);'));
    assert.ok(main.includes('gl_FragColor=vec4(col,a);'));assert.ok(main.includes('#include <colorspace_fragment>'));
    assert.equal((current.match(/mix\(length\(p\),segment\(p,/g)||[]).length,4);
    assert.ok(current.includes('charWidth=mix(.29,.50,state.b);'));
    // Composition/contract evidence only. No second CPU shader implementation,
    // GLSL compiler, GPU callback trace, derivative or native-pixel claim.
  }finally{field.dispose();}
});

test('actual native masks retain zero cold-neighbour eligibility and one resource set through new/legacy/rewind/empty updates',()=>{
  for(const size of [.125,.25,.5,1]){
    const field=createGroundField(T),snapshot={world:{width:size*2,height:size,fireCellSize:size},cells:[cell(size),cell(size,{id:'cold',x:size*1.5,phase:'cold',surfaceFuel:.3,depositedFuel:.0625})]},before=structuredClone(snapshot);
    let textureDisposals=0,geometryDisposals=0,materialDisposals=0;
    try{
      field.update(snapshot);const mesh=field.root.children[0],material=mesh.material,texture=field.uniforms.field.value;
      texture.addEventListener('dispose',()=>textureDisposals++);mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);material.addEventListener('dispose',()=>materialDisposals++);
      assert.deepEqual(texture.image.data,new Float32Array([0,0,1,0,.5,0,0,0]));
      assert.equal(texture.image.data[6],0,'A charred neighbour cannot write blue into an authoritative cold cell');
      assert.deepEqual(snapshot,before);assert.deepEqual([mesh.geometry.parameters.width,mesh.geometry.parameters.height],[size*2,size]);
      assert.deepEqual(mesh.position.toArray(),[size,.018,size/2]);assert.equal(mesh.renderOrder,-1);
      assert.equal(texture.minFilter,T.NearestFilter);assert.equal(texture.magFilter,T.NearestFilter);assert.equal(texture.generateMipmaps,false);
      const version=material.version,data=texture.image.data.slice();
      const legacy={...snapshot,cells:snapshot.cells.map(({initialSurfaceFuel,consumedDepositedFuel,...c})=>c)};
      for(const replay of [legacy,{...snapshot,paused:true},{...snapshot,cells:[]},snapshot]){
        field.update(replay);assert.equal(field.root.children[0],mesh);assert.equal(mesh.material,material);assert.equal(field.uniforms.field.value,texture);assert.equal(material.version,version);
        assert.deepEqual(field.counts(),{geometries:1,materials:1,textures:1,objects:0});
        assert.equal(field.uniforms.charVersion.value,replay===legacy?0:1);
      }
      assert.deepEqual(texture.image.data,data);assert.deepEqual(snapshot,before);
      assert.equal(textureDisposals,0);assert.equal(geometryDisposals,0);assert.equal(materialDisposals,0);
    }finally{field.dispose();field.dispose();}
    assert.equal(textureDisposals,1);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1);assert.deepEqual(field.counts(),{geometries:0,materials:0,textures:0,objects:0});
  }
});
