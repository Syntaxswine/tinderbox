import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createClosingAssembly} from './assembly.js';
import {BELL_AND_ALDER} from '../../../src/content/bell-and-alder-layout.js';
const file='workbenches/bell-and-alder-closing/scene-data.json',d=JSON.parse(fs.readFileSync(file)),layout=JSON.parse(fs.readFileSync('art/source/bell-and-alder-closing/layout.json')),a=createClosingAssembly(T,{layout});
const unique=(rows,label)=>{assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,label+' IDs');};
try{
 for(const key of ['surfaces','sourceMeshes','openings','items','furnitureParts'])unique(d[key],key);
 const sourceIds=new Set(d.sourceMeshes.map(s=>s.id)),surfaces=new Map(d.surfaces.map(s=>[s.id,s])),supportIds=new Set([...surfaces.keys(),...d.items.map(i=>i.id),...d.furnitureParts.map(p=>p.id)]),boundSources=new Set([...d.surfaces.flatMap(s=>s.sourceMeshBindings),...d.furnitureParts.map(p=>p.sourceMeshBinding)]);
 for(const mesh of d.sourceMeshes)assert(boundSources.has(mesh.id),'Unbound render mesh '+mesh.id);
 for(const s of d.surfaces){assert(s.triangles.length&&s.triangles.flat(2).every(Number.isFinite));assert(Number.isFinite(s.fuelAmount)&&s.fuelAmount>=0);if(['glass','iron','masonry','stone'].includes(s.material))assert.equal(s.fuelAmount,0,s.id);for(const id of s.sourceMeshBindings)assert(sourceIds.has(id),id);for(const id of s.supportSurfaceIds)assert(supportIds.has(id),id);}
 for(const p of d.furnitureParts){assert(p.fuelAmount>=0&&Number.isFinite(p.fuelAmount));assert(sourceIds.has(p.sourceMeshBinding));}
 for(const i of d.items){assert(i.partIds.length);assert(i.supportContacts.length,'Native item lacks measured support: '+i.id);}
 for(const r of d.render.geometry)for(const t of r.triangles)for(const v of t.vertices)assert.equal(v.length,13);
 for(const m of d.render.materials)if(m.texture)assert(fs.existsSync(path.resolve('workbenches/bell-and-alder-closing',m.texture)),m.texture);
 for(const o of a.objects)assert.deepEqual(o.scale.toArray(),[1,1,1],o.name);
 for(const original of BELL_AND_ALDER.props){const parts=a.objects.filter(o=>o.userData.export.itemId===original.id);assert(parts.length,original.id);for(const o of parts){assert.deepEqual(o.position.toArray(),[original.x-36,0,original.y-9]);assert(Math.abs(o.rotation.y+original.quarterTurns*Math.PI/2)<1e-8);}}
 assert.deepEqual(d.levels.map(l=>l.floorY),[0,2.12]);assert.deepEqual(d.module,[1,1,2.12]);
 const treads=d.surfaces.filter(s=>s.supportType==='stair-tread').sort((a,b)=>a.bounds.max[1]-b.bounds.max[1]);assert.equal(treads.length,12);for(const [i,s]of treads.entries())assert(Math.abs(s.bounds.max[1]-(i+1)*2.12/12)<1e-6);
 const rails=a.objects.filter(o=>o.name.startsWith('stair/handrail/')).map(o=>new T.Box3().setFromObject(o));assert(Math.abs(rails[1].min.x-rails[0].max.x-1.9)<1e-6);
 for(const prefix of ['entry-left','entry-right','service-left','service-right']){const parts=d.surfaces.filter(s=>s.kind==='door'&&s.id.startsWith(prefix+'/')),b=new T.Box3();for(const s of parts)b.expandByPoint(new T.Vector3(...s.bounds.min)).expandByPoint(new T.Vector3(...s.bounds.max));assert(Math.abs(b.max.y-b.min.y-1.65)<1e-6,prefix);assert(Math.abs(Math.max(b.max.x-b.min.x,b.max.z-b.min.z)-1)<1e-6,prefix);}
 assert(d.items.some(i=>i.id===d.closingTime.lantern.supportSourceId));assert(![...d.surfaces,...d.furnitureParts].some(s=>s.id.includes('hand-lantern')));
 const openings=new Set(d.openings.map(o=>o.id));for(const door of d.closingTime.doors){assert(d.closingTime.anchors[door.anchor]);for(const id of door.openingIds)assert(openings.has(id));}
 for(const [name,replay]of Object.entries(d.closingTime.replays))for(const list of Object.values(replay))for(const id of Array.isArray(list)?list:[list])assert(d.closingTime.anchors[id],name+':'+id);
 for(const source of d.sourceHashes)assert.equal(createHash('sha256').update(fs.readFileSync(source.path)).digest('hex'),source.sha256,source.path);
 const report={passed:true,checks:['Unique canonical IDs and complete physical/render/support references','Original25 native shop prop transforms preserved','Meters, zero-based floors0/2.12, native one-meter leaves, 12 measured treads and1.90m rail clearance','Finite fuel/material separation, measured item contacts, one excluded-from-static portable lantern','Local texture closure and source hashes','Complete hero/direct anchor routes'],sourceHash:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),counts:{surfaces:d.surfaces.length,items:d.items.length,parts:d.furnitureParts.length,openings:d.openings.length,triangles:d.render.geometry.reduce((n,g)=>n+g.triangles.length,0)},limitations:['Continuous native-body route and causal combined replay remain coder/architect acceptance.']};fs.writeFileSync('docs/art/bell-and-alder-closing/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{a.dispose();}
