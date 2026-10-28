import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js';
import {createHopkinsHouse as createGrossHouse} from '../../src/art/hopkins-housing.js';
import {planEdges,pointInRoom} from '../../src/art/gross-housing.js';
const base='assets/art/hopkins-housing-v1/',catalogue=JSON.parse(fs.readFileSync(base+'houses.json','utf8'));
const manifest=JSON.parse(fs.readFileSync(base+'manifest.json','utf8')),sources=JSON.parse(fs.readFileSync('art/source/hopkins-housing-v1/sources.json','utf8'));
const textures=Object.fromEntries(['clapboard','cedar','oak','paper','brick','slate'].map(id=>[id,new T.Texture()]));
let levels=0,rooms=0,units=0,diagonals=0,meshes=0,vertices=0,nativeAttributeChecks=0,roofCoverageSamples=0;
const nativeGeometry=new Map();
assert.equal(catalogue.houses.length,12);assert.equal(new Set(catalogue.houses.map(h=>h.id)).size,12);
for(const asset of manifest.materials){const bytes=fs.readFileSync(base+asset.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.readUInt32BE(16),bytes.readUInt32BE(20));}
for(const source of sources.plates){const bytes=fs.readFileSync(source.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);}
for(const h of catalogue.houses){
 assert(sources.plates.some(p=>p.leaf===h.source.leaf&&p.kind==='exterior-and-floor-plans'));assert(h.sourceDimensions.overallFeet.length===2);assert.deepEqual(h.nativeContract.wall,[1,2,.16]);assert.deepEqual(h.nativeContract.door,[1,1.65,.12]);assert.equal(h.integration.nautilusImported,false);
 assert.deepEqual(JSON.parse(fs.readFileSync(base+'prefabs/'+h.id+'.json','utf8')),h);
 const floors=[...(h.basementFloor?[h.basementFloor]:[]),...h.floors];
 for(const floor of floors){
  levels++;rooms+=floor.rooms.length;const edges=planEdges(floor);
  for(const room of floor.rooms){
   const area=room.polygon.reduce((s,a,i)=>{const b=room.polygon[(i+1)%room.polygon.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;assert(area>0,h.id+' negative room winding '+room.id);
   const xs=room.polygon.map(p=>p[0]),zs=room.polygon.map(p=>p[1]);
   for(let x=Math.min(...xs)+.25;x<Math.max(...xs);x+=.5)for(let z=Math.min(...zs)+.25;z<Math.max(...zs);z+=.5){
    // Offset avoids counting shared edges as overlapping room interiors.
    const p=[x+.013,z+.017];if(!pointInRoom(p,room.polygon))continue;
    assert.equal(floor.rooms.filter(other=>pointInRoom(p,other.polygon)).length,1,h.id+'/'+floor.label+' overlaps at '+p);
   }
  }
  if(floor.stairs){const stair=floor.stairs;for(let x=stair.x+.1;x<stair.x+1;x+=.25)for(let z=stair.z+.1;z<stair.z+3;z+=.25)assert(floor.rooms.some(r=>pointInRoom([x,z],r.polygon)),h.id+' stair shaft outside interior '+floor.label);}
  const connected=new Set([floor.rooms[0].id]);let changed=true;while(changed){changed=false;for(const pair of floor.connections)if(pair.some(x=>connected.has(x)))for(const x of pair)if(!connected.has(x)){connected.add(x);changed=true;}}
  assert.equal(connected.size,floor.rooms.length,h.id+'/'+floor.label+' disconnected rooms');assert(edges.every(e=>e.rooms.length<=2));
 }
 const model=createGrossHouse(T,{catalogue,textures},h.id),d=model.diagnostics();units+=d.wallUnits;diagonals+=d.diagonalUnits;
 model.root.updateMatrixWorld(true);
 const roofs=model.root.getObjectByName('Removable roofs'),ray=new T.Raycaster();
 for(let level=0;level<h.floors.length;level++){
  const floor=h.floors[level],points=floor.rooms.flatMap(r=>r.polygon),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  for(let x=Math.min(...xs)+.37;x<Math.max(...xs);x+=1)for(let z=Math.min(...zs)+.41;z<Math.max(...zs);z+=1){
   if(!floor.rooms.some(r=>pointInRoom([x,z],r.polygon))||h.floors.slice(level+1).some(f=>f.rooms.some(r=>pointInRoom([x,z],r.polygon))))continue;
   ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(roofs,true)[0];assert(hit&&hit.point.y>=h.plinth+level*2.12+2-.001,h.id+' roof gap at '+[x,z]);roofCoverageSamples++;
  }
 }
 let nativeWalls=0,nativeDoors=0;
 model.root.traverse(o=>{assert.deepEqual(o.scale.toArray(),[1,1,1],h.id+' stretched mesh');if(!o.isMesh)return;meshes++;const g=o.geometry,p=g.attributes.position;vertices+=p.count;assert(g.attributes.grossUV,'Missing physical-density coordinates');
  for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)),'Nonfinite geometry');
  if(['Native wall unit','Native closed-door leaf','Native door lintel','Native window sill','Native window lintel'].includes(o.name)){
   const dimensions=o.userData.nativeDimensions,k=dimensions.join('/');if(!nativeGeometry.has(k))nativeGeometry.set(k,new T.BoxGeometry(...dimensions));const expected=nativeGeometry.get(k);
   for(const name of ['position','normal','uv'])assert.deepEqual(g.attributes[name].array,expected.attributes[name].array,h.id+' changed native '+name);
   assert.deepEqual(g.index.array,expected.index.array,h.id+' changed native index');nativeAttributeChecks++;
  }
  if(o.name==='Nautilus cut-end wall panel')assert(o.userData.nativeDimensions[0]<1,'Cut panel was stretched');
  if(o.name==='Native wall unit'){
assert.deepEqual(o.userData.nativeDimensions,[1,2,.16]);nativeWalls++;}
  if(o.name==='Native closed-door leaf'){assert.deepEqual(o.userData.nativeDimensions,[1,1.65,.12]);nativeDoors++;}
 });assert(nativeWalls&&nativeDoors,h.id+' missing native modules');
 for(const l of model.levels){model.setView({view:'cutaway',level:l.index});assert.equal(model.diagnostics().selected,l.index);}
 model.dispose();model.dispose();assert.deepEqual(model.diagnostics().resources,{geometries:0,materials:0,textures:0,objects:0});
}
for(const geometry of nativeGeometry.values())geometry.dispose();
const report={passed:true,houses:12,levels,rooms,units,diagonals,meshes,vertices,nativeAttributeChecks,roofCoverageSamples,sourcePlates:sources.plates.length,materialHashes:manifest.materials.length,nativeScale:true,disposal:true};
fs.writeFileSync('docs/art/hopkins-housing-v1/geometry-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));