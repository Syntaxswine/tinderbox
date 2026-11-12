import fs from 'node:fs';
import assert from 'node:assert/strict';
import {triangleArea} from './geometry.js';
const d=JSON.parse(fs.readFileSync('workbenches/furnished-house/house-data.json'));
const groups=[];const pass=s=>groups.push(s);
assert.equal(d.version,1);assert.deepEqual(d.module,[1,1,2.12]);assert.deepEqual(d.levels.map(l=>l.floorY),[.48,2.6]);assert.deepEqual(d.levels.map(l=>l.area),[100,68]);pass('Native module, exact level planes and actual floor union areas');
assert.equal(new Set(d.surfaces.map(s=>s.id)).size,d.surfaces.length);assert.equal(new Set(d.furnitureParts.map(s=>s.id)).size,d.furnitureParts.length);pass('Stable surface and component identities are unique');
for(const s of d.surfaces){assert.ok(s.area>0&&Number.isFinite(s.area));assert.ok(s.triangles.every(t=>t.every(p=>p.every(Number.isFinite))));assert.ok(s.triangles.reduce((n,t)=>n+triangleArea(t),0)>0);assert.ok(s.fuelAmount>=0);if(['iron','brick','stone','glass','air'].includes(s.material))assert.equal(s.fuelAmount,0);}
pass('Measured physical faces and inert material fuel boundaries');
const floors=d.surfaces.filter(s=>s.kind==='floor'&&!s.supportType);assert.equal(floors.length,672);
for(const f of floors){assert.equal(f.thickness,.12);assert.ok(f.derivedClosedSlab);assert.ok(Math.abs(f.floorY-f.undersideY-.12)<1e-7);for(const t of f.triangles){const x=t.reduce((n,p)=>n+p[0],0)/3,z=t.reduce((n,p)=>n+p[2],0)/3;assert.ok(!(f.level===1&&x>5&&x<6&&z>3&&z<7));}}
pass('Closed derived slabs preserve the real upper stair notch and support planes');
assert.equal(d.stores.length,2);for(const s of d.stores){assert.ok(s.amount>0&&s.supportSurfaceIds.length);const p=d.furnitureParts.filter(p=>p.id===s.fuelPartId);assert.equal(p.length,1);assert.equal(p[0].fuelAmount,s.amount);}pass('Finite oil/coal stores have actual floor support and one fuel record each');
const adapted=d.openings.filter(o=>o.prototypeAdapted&&o.kind==='door');assert.equal(adapted.length,1);for(const o of adapted){assert.equal(o.clearHeightWhenOpen,2);assert.equal(o.leafHeight,1.65);assert.ok(o.transomSurfaceId);assert.ok(d.surfaces.find(s=>s.id===o.transomSurfaceId).alwaysOpen);assert.ok(Math.abs(o.topY-o.bottomY-2)<1e-6);}
pass('Authorized full-height route openings retain native leaves and separate always-open transom boundaries');
const entry=d.openings.find(o=>o.entry),entrySurface=d.surfaces.find(s=>s.id===entry.surfaceId),xs=entrySurface.triangles.flat().map(p=>p[0]);
assert.ok(Math.abs(Math.min(...xs)-4.5)<1e-7&&Math.abs(Math.max(...xs)-5.5)<1e-7);
assert.ok(d.surfaces.some(s=>s.kind==='wall'&&s.level===0&&s.bounds.min[0]===5.92&&s.bounds.min[2]===0&&s.bounds.max[2]===.5));
const composition=d.navigation.routeAdaptations.find(a=>a.type==='centred-native-entry');assert.equal(composition.actualClearWidth,1.015);assert.deepEqual(composition.translation,[-.5,0,0]);
const entrySteps=d.surfaces.filter(s=>s.supportType==='entry-step');assert.equal(entrySteps.length,6);for(const s of entrySteps){assert.ok(Math.abs((s.bounds.min[0]+s.bounds.max[0])/2-5)<1e-6);assert.ok(Math.abs(s.bounds.max[0]-s.bounds.min[0]-1.16)<1e-6);}
pass('Centred native entry retains the exterior return and six unchanged step widths; measured jamb clearance1.015m');

const physical=new Set([...d.surfaces.flatMap(s=>s.sourceMeshBindings),...d.furnitureParts.map(p=>p.sourceMeshBinding).filter(Boolean)]);
for(const g of d.render.geometry)assert.ok(physical.has(g.id),'No declared physical identity for '+g.id);
const fittings=d.surfaces.filter(s=>s.kind==='attachment');assert.ok(fittings.length>400);
for(const a of fittings){assert.equal(a.physicalShape,'source-closed-mesh');assert.ok(a.attachmentHostSurfaceIds.length+a.supportSurfaceIds.length>0);if(a.material==='iron')assert.equal(a.fuelAmount,0);else{assert.equal(a.fuelClass,'frame');assert.ok(a.fuelAmount>0&&a.volume>0);}}
assert.ok(d.render.omittedSourceMeshes.every(m=>d.sourceMeshes.find(s=>s.id===m.id).name==='Floor slab rim'));
pass('Every visible source has a physical identity; exact finite timber fittings and inert metal hosts replace guessed orphan bindings');
const workTable=d.items.find(i=>i.id==='item/l0/kitchen/work-table');assert.equal(new Set(workTable.supportContacts.map(c=>c.sourcePartId)).size,4);
const area=c=>c.polygon.slice(1,-1).reduce((n,_,i)=>n+triangleArea([c.polygon[0],c.polygon[i+1],c.polygon[i+2]]),0);
assert.ok(Math.abs(workTable.supportContacts.reduce((n,c)=>n+area(c),0)-.01)<1e-6);
for(const item of d.items)for(const c of item.supportContacts){assert.ok(Math.abs(c.gap)<=.03);assert.ok(c.polygon.every(p=>Math.abs(p[1]-c.contactY)<1e-7));assert.ok(c.supportSurfaceIds.every(id=>d.surfaces.find(s=>s.id===id)?.kind==='floor'));}
assert.ok(d.surfaces.some(s=>s.kind==='plinth'&&s.supports&&Math.abs(s.bounds.max[1]-.36)<1e-7));
pass('Measured bottom facets preserve the four actual table feet and inert plinth bearing atY.36');
const roofGeometry=d.render.geometry.filter(g=>d.sourceMeshes.find(m=>m.id===g.id)?.name==='New roof envelope');
for(const g of roofGeometry)for(const t of g.triangles){const c=[0,1,2].map(i=>t.vertices.reduce((n,v)=>n+v[i],0)/3);assert.ok(!(c[0]>4&&c[0]<6&&c[2]>-1&&c[2]<.15&&c[1]<2.8));}
pass('Buried porch roof faces no longer cross the upper front chamber');
fs.writeFileSync('docs/art/furnished-house/geometry-checks.json',JSON.stringify({passed:groups.length,failed:0,groups,counts:{surfaces:d.surfaces.length,floorPatches:floors.length,items:d.items.length,parts:d.furnitureParts.length},navigation:d.navigation},null,2)+'\n');
console.log(JSON.stringify({passed:groups.length,failed:0,bytes:fs.statSync('workbenches/furnished-house/house-data.json').size}));
