import fs from 'node:fs';
import assert from 'node:assert/strict';
import {triangleArea} from './geometry.mjs';
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
const roofGeometry=d.render.geometry.filter(g=>d.sourceMeshes.find(m=>m.id===g.id)?.name==='New roof envelope');
for(const g of roofGeometry)for(const t of g.triangles){const c=[0,1,2].map(i=>t.vertices.reduce((n,v)=>n+v[i],0)/3);assert.ok(!(c[0]>4&&c[0]<6&&c[2]>-1&&c[2]<.15&&c[1]<2.8));}
pass('Buried porch roof faces no longer cross the upper front chamber');
fs.writeFileSync('docs/art/furnished-house/geometry-checks.json',JSON.stringify({passed:groups.length,failed:0,groups,counts:{surfaces:d.surfaces.length,floorPatches:floors.length,items:d.items.length,parts:d.furnitureParts.length},navigation:d.navigation},null,2)+'\n');
console.log(JSON.stringify({passed:groups.length,failed:0,bytes:fs.statSync('workbenches/furnished-house/house-data.json').size}));
