import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../../../src/runtime/three.js';
import {createStockyardAsset,STOCKYARD_PIECES,STOCKYARD_SLOTS} from '../../../assets/art/stockyards/index.js';
const reports=[],check=(name,run)=>{run();reports.push({name,passed:true});};
const actual=a=>{const box=new T.Box3(),v=new T.Vector3();a.root.updateMatrixWorld(true);a.root.traverseVisible(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));}});return box;};
const point=(a,p)=>new T.Vector3(...p).applyMatrix4(a.root.matrixWorld);
const ray=(a,from,to)=>{const origin=point(a,from),end=point(a,to),delta=end.clone().sub(origin);return new T.Raycaster(origin,delta.clone().normalize(),0,delta.length()).intersectObject(a.root,true).filter(h=>{let p=h.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});};
for(const id of STOCKYARD_PIECES)check('piece finite UV, geometry, measured bounds and disposal / '+id,()=>{
 const a=createStockyardAsset(T,{id}),geo=new Set(),mat=new Set();let releases=0;
 try{const box=actual(a),m=a.metadata;assert(box.min.toArray().every(Number.isFinite));assert(a.diagnostics().triangles>0);
 a.root.traverse(o=>{if(!o.isMesh)return;assert.equal(o.geometry.attributes.position.count,o.geometry.attributes.uv.count);for(const name of ['position','normal','uv','color'])assert([...o.geometry.attributes[name].array].every(Number.isFinite));geo.add(o.geometry);mat.add(o.material);});
 for(const resource of [...geo,...mat])resource.addEventListener('dispose',()=>releases++);
 a.dispose();a.dispose();assert.equal(releases,geo.size+mat.size);assert.equal(a.root.children.length,0);
 assert.throws(()=>a.setSkin('jubilee'),/disposed/);
 }finally{a.dispose();}
});
for(let q=0;q<4;q++)for(const config of [{id:'covered-swine-pen',bays:1},{id:'covered-swine-pen',bays:2},{id:'union-stockyard-gate'}])for(const skin of ['working','jubilee']){
 const label=config.id+'/'+(config.bays||1)+'/'+q+'/'+skin;
 check('rotated assembly bounds, surfaces and connectors / '+label,()=>{
  const a=createStockyardAsset(T,{...config,skin,quarterTurns:q,position:[12,2.12,8],gateAngles:[Math.PI/2,0]});
  try{const box=actual(a),m=a.metadata;for(let i=0;i<3;i++){assert(Math.abs(m.bounds.min[i]-box.min.getComponent(i))<1e-5);assert(Math.abs(m.bounds.max[i]-box.max.getComponent(i))<1e-5);}
   assert.equal(new Set(m.parts.map(p=>p.instanceId)).size,m.parts.length);
   for(const p of m.parts){assert(p.bounds);assert(STOCKYARD_PIECES.includes(p.assetId));assert(p.skinSlots.every(s=>STOCKYARD_SLOTS.includes(s)));}
   for(const s of m.surfaces){assert(s.polygon.length>=3);assert(s.polygon.flat().every(Number.isFinite));assert.equal(s.holes.length,0);if(s.kind==='floor')assert(s.polygon.every(p=>p[1]===2.12));}
   for(const f of m.groundFootprints){assert(f.polygon.length>=3);assert(f.polygon.every(p=>Math.abs(p[1]-2.12)<1e-5));assert(f.polygon.flat().every(Number.isFinite));}
   assert(m.dressingAttachments.every(d=>d.anchors.length>0&&d.position.every(Number.isFinite)));
   for(const c of m.connectors)assert(Math.abs(Math.hypot(...c.outward)-1)<1e-6);
   if(config.bays){assert.equal(m.postCount,5*(config.bays+1)+5*config.bays);assert.equal(m.partitions.length,config.bays+1);assert.equal(m.partitions.filter(p=>p.shared).length,config.bays-1);
    assert.equal(m.parts.filter(p=>/^partition\//.test(p.instanceId)).length,4*(config.bays+1));
    assert.equal(m.parts.filter(p=>/^roof\/\d/.test(p.instanceId)).length,4*config.bays);
    assert.equal(m.parts.filter(p=>/roof\/(left|right) end/.test(p.instanceId)).length,2);
    assert.equal(m.surfaces.filter(s=>s.kind==='floor').length,20*config.bays);
    assert.equal(ray(a,[2,.9,-3.5],[2,.9,.35]).length,0);
    a.setGateAngle(0,0);assert(ray(a,[2,.9,-3.5],[2,.9,.35]).length>0);a.setGateAngle(0,Math.PI/2);
    if(config.bays===2)for(const x of [3.99,4,4.01])for(const z of [.1,1,2,3,3.9]){
      const hit=ray(a,[x,6,z],[x,1.8,z])[0];assert(hit);assert(hit.point.y>2.12+2.2);
    }
   }else{
    for(const x of [-5.25,0,5])for(const dx of [-.62,0,.62])for(const h of [.05,.85,1.70])assert.equal(ray(a,[x+dx,h,-3.5],[x+dx,h,3.5]).length,0,'native character corridor blocked');
    assert(ray(a,[3.5,1,-3.5],[3.5,1,3.5]).length>0,'piers must be solid');
    assert.equal(m.passages.length,3);
   }
   const count=a.diagnostics().geometries;for(let i=0;i<4;i++){a.setSkin('working');a.setSkin('jubilee');}assert.equal(a.diagnostics().geometries,count);
  }finally{a.dispose();}
 });
}
check('host material and texture remain borrowed',()=>{
 const material=new T.MeshStandardMaterial({color:0x553322}),tex=new T.Texture();let md=0,td=0;material.addEventListener('dispose',()=>md++);tex.addEventListener('dispose',()=>td++);
 const a=createStockyardAsset(T,{id:'fence-straight-1m',materials:{timber:material},textures:{timber:tex}});a.dispose();assert.equal(md,0);assert.equal(td,0);assert.equal(material.vertexColors,false);material.dispose();tex.dispose();
});
check('bad construction releases all allocated materials',()=>{
 const made=[];class Observed extends T.MeshStandardMaterial{constructor(o){super(o);this.released=0;this.addEventListener('dispose',()=>this.released++);made.push(this);}}
 assert.throws(()=>createStockyardAsset({...T,MeshStandardMaterial:Observed},{materials:{stone:{}}}),/material/);
 assert(made.length>0);assert(made.every(m=>m.released===1));
});
check('input schema rejects invalid grid and gate state',()=>{
 for(const options of [{quarterTurns:4},{position:[.5,0,0]},{position:[0,1,0]},{skin:'unknown'},{gateAngles:[-1]},{id:'unknown'},{materials:{unknown:{}}}])assert.throws(()=>createStockyardAsset(T,options));
});
const result={passed:true,groups:reports.length,three:T.REVISION,reports};
fs.mkdirSync('docs/art/stockyards',{recursive:true});fs.writeFileSync('docs/art/stockyards/checks.json',JSON.stringify(result,null,2)+'\n');console.log('Passed '+reports.length+' stockyard geometry, joint, clearance, rotation and ownership groups.');
