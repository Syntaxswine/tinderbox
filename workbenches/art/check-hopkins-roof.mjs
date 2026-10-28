import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js';
import {createHopkinsHouse} from '../../src/art/hopkins-housing.js';
import {pointInRoom,housePlanEdges} from '../../src/art/gross-housing.js';
const catalogue=JSON.parse(fs.readFileSync('assets/art/hopkins-housing-v1/houses.json','utf8')),h=catalogue.houses.find(h=>h.designNumber===15);
const accepted=JSON.parse(fs.readFileSync('art/source/nautilus-windows-v1/adoption-baseline.json','utf8')).houses[h.id];
const floors=structuredClone(h.floors);
assert.equal(floors[1].windowBays.length,1);assert.deepEqual(floors[1].windowBays[0].a,[4,-1]);assert.deepEqual(floors[1].windowBays[0].b,[6,-1]);
assert.deepEqual(floors[1].windows,accepted.floors[1].windows.filter(w=>JSON.stringify(w)!==JSON.stringify([4,-1,5,-1])));
delete floors[1].windowBays;floors[1].windows=accepted.floors[1].windows;
const body={width:h.width,depth:h.depth,plinth:h.plinth,floors,nativeContract:h.nativeContract};
const bodyHash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
assert.equal(bodyHash,'8c5623c27330a1616aa75086123f9953fc7c9384975931588c26e6b8045d09b7','No. 15 native body changed beyond the recorded centered window adoption');
const textures=Object.fromEntries(['clapboard','cedar','oak','paper','brick','slate'].map(k=>[k,new T.Texture()]));
const model=createHopkinsHouse(T,{catalogue,textures},h.id);model.root.updateMatrixWorld(true);
const roofs=model.root.getObjectByName('Removable roofs'),panels=[],gableSkins=[];roofs.traverse(o=>{if(o.userData.roofTile)panels.push(o);if(o.name==='Removable gambrel gable siding')gableSkins.push(o);});
assert(panels.length>40);assert.equal(gableSkins.length,3);
for(const skin of gableSkins)assert.equal(skin.material.map,textures.clapboard,'Vertical gables must use horizontal clapboard');
for(const mesh of panels)assert.equal(mesh.material.map,textures.cedar,'Sloped roofs must retain cedar shingles');
let physicalUVEdges=0;const pitches={};
for(const mesh of panels){
 assert.deepEqual(mesh.scale.toArray(),[1,1,1]);const tile=mesh.userData.roofTile;assert(tile.runLength>0&&tile.runLength<=1);assert.equal(tile.cutEnd,tile.runLength<1-1e-8);
 const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.grossUV,n=mesh.geometry.attributes.normal;
 for(let i=0;i<p.count;i+=3){
  const normal=new T.Vector3().fromBufferAttribute(n,i);assert(normal.y>0,'Roof face points down');const angle=Math.round(Math.acos(Math.min(1,normal.y))*180/Math.PI*100)/100;(pitches[tile.piece]??=new Set()).add(angle);
  for(let k=0;k<3;k++){const a=i+k,b=i+(k+1)%3,world=new T.Vector3().fromBufferAttribute(p,a).distanceTo(new T.Vector3().fromBufferAttribute(p,b)),texture=Math.hypot(uv.getX(a)-uv.getX(b),uv.getY(a)-uv.getY(b));assert(Math.abs(world-texture)<1e-5,'Stretched roof texture coordinates');physicalUVEdges++;}
 }
}
for(const [piece,values] of Object.entries(pitches)){const angles=[...values];assert(angles.some(a=>a>65),piece+' missing steep skirt');assert(angles.some(a=>a<40),piece+' missing shallow crown');}
assert(panels.some(m=>m.userData.roofTile.valleyCut),'No real valley cuts');
const ray=new T.Raycaster();let clearanceSamples=0,windowApertures=0;
for(let x=.137;x<10;x+=.25)for(let z=-.843;z<7;z+=.25){
 if(!h.floors[1].rooms.some(r=>pointInRoom([x,z],r.polygon)))continue;
 ray.set(new T.Vector3(x,20,z),new T.Vector3(0,-1,0));ray.far=Infinity;
 const hits=ray.intersectObjects(panels,false),heights=[...new Set(hits.map(hit=>Math.round(hit.point.y*1e5)/1e5))];
 assert.equal(heights.length,1,'Buried face or hole over upper interior at '+[x,z]);assert(heights[0]>=h.plinth+4.12-.001,'Roof crosses native room headroom');clearanceSamples++;
}
// The front ridge rises at the centre instead of dipping into the old W notch.
const frontHeight=x=>{ray.set(new T.Vector3(x,20,-1.05),new T.Vector3(0,-1,0));ray.far=Infinity;return ray.intersectObjects(panels,false)[0]?.point.y;};
assert(frontHeight(5)>5.8);assert(frontHeight(5)>frontHeight(4)&&frontHeight(5)>frontHeight(6));
for(const edge of housePlanEdges(h,h.floors[1]).filter(e=>e.opening==='window')){
 const w=[...edge.a,...edge.b];
 const x=(w[0]+w[2])/2,z=(w[1]+w[3])/2;let direction,origin;
 if(w[0]===w[2]&&(x===0||x===10)){direction=new T.Vector3(x===0?1:-1,0,0);origin=new T.Vector3(x+(x===0?-.236:.236),h.plinth+2.12+.95,z);}
 else if(w[1]===-1&&w[3]===-1){direction=new T.Vector3(0,0,1);origin=new T.Vector3(x,h.plinth+2.12+.95,z-.236);}else continue;
 ray.set(origin,direction);ray.far=.2;assert.equal(ray.intersectObjects(gableSkins,false).length,0,'New gable facing covers a native sash');windowApertures++;
}
model.setView({view:'cutaway',level:1});assert.equal(roofs.visible,false);model.dispose();model.dispose();assert.deepEqual(model.diagnostics().resources,{geometries:0,materials:0,textures:0,objects:0});
const report={passed:true,asset:h.id,baselineCommit:'e49465128970ea02d2a3a1b9040548d4d136cda3',unchangedBodySha256:bodyHash,roofPanels:panels.length,oneMetrePanels:panels.filter(m=>!m.userData.roofTile.cutEnd).length,cutEndPanels:panels.filter(m=>m.userData.roofTile.cutEnd).length,valleyCutPanels:panels.filter(m=>m.userData.roofTile.valleyCut).length,pitchesDegrees:Object.fromEntries(Object.entries(pitches).map(([k,v])=>[k,[...v].sort((a,b)=>a-b)])),physicalUVEdges,clearanceSamples,gableWindowAperturesPreserved:windowApertures,verticalGablesMaterial:'horizontal clapboard',slopedRoofMaterial:'cedar shingles',centerRidgeInsteadOfNotch:true,cutawayHidesEntireRoof:true,disposal:true,windowRequest:'Nautilus period sash: centered 1 m aperture in a 2 m bay from 90054d07134116a5d9661f8318a76fe68f922aad; traversal deferred.',bodyComparison:'Original native body hash after normalizing only the explicitly recorded centered-window declaration.'};
fs.writeFileSync('docs/art/hopkins-housing-v1/roof-15-geometry-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
