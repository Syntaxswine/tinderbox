import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {nativeExteriorSource} from '../../src/content/catalogue-native-exteriors.js';
import {nativeStructuralSource} from '../../src/content/catalogue-native-structure.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {compileScene} from '../../workbenches/furnished-house/scene.js';
import {preparePhysicalInstance} from '../../workbenches/bell-and-alder-sandbox/compose.js';
import {HOUSING_PLANS} from '../../src/content/housing-plans.js';
import {exteriorPlanEdges} from '../../src/content/housing-envelope.js';
const host=scenarioDefinition('neighborhood');
const source=id=>{const b=host.buildings.find(b=>b.id===id),full=nativeExteriorSource(T,b,{sourceMetadata:true});return {b,full,data:nativeStructuralSource(full,b)};};

test('structural registration preserves all native visual vertices/materials/UVs and each finite profile quantity',()=>{
 for(const id of ['hopkins-thirteen','monroe-row-middle']){const {full,data}=source(id);assert.equal(data.render,full.render);assert.equal(data.sourceMeshes,full.sourceMeshes);assert.ok(data.surfaces.length<full.surfaces.length);assert.ok(data.sourceRepresentation.detailContactPairs>0);
   for(const [cls,before]of Object.entries(data.sourceRepresentation.before))assert.ok(Math.abs(before.fuel-(data.sourceRepresentation.after[cls]?.fuel||0))<1e-5,cls);
   const ids=new Set(data.surfaces.map(s=>s.id));for(const s of data.surfaces)for(const ref of [...s.supportSurfaceIds,...(s.attachmentHostSurfaceIds||[])])assert.ok(ids.has(ref),ref);
   assert.ok(data.surfaces.some(s=>s.material==='masonry'&&!s.fuelAmount));assert.ok(data.surfaces.filter(s=>s.kind==='attachment').every(s=>s.nativeCell&&s.sourceMeshBindings.length&&s.renderAppearanceIds.length));
 }
});
test('native wall thickness, actual glazing aperture and transformed material/normal bindings remain physical',()=>{
 const {data,full}=source('hopkins-thirteen'),scene=compileScene(data),wall=data.surfaces.find(s=>s.nativeRole==='Native wall unit'&&s.thickness>.15&&s.thickness<.17),point=wall.triangles[0].reduce((a,p)=>a.map((v,i)=>v+p[i]/3),[0,0,0]),from=point.map((v,i)=>v+wall.normal[i]*.4),to=point.map((v,i)=>v-wall.normal[i]*.4),hits=scene.index.crossings(from,to).filter(h=>h.surface.sourceSurfaceId===wall.id);
 assert.ok(hits.length);assert.ok(Math.abs(hits[0].t-(.4-wall.thickness/2)/.8)<1e-5);
 const mesh=data.sourceMeshes.find(m=>/Nautilus window \/ Glass 1:1/.test(m.name)),glass=data.surfaces.filter(s=>s.sourceMeshBindings.includes(mesh.id)),pane=glass.filter(s=>s.kind==='window').sort((a,b)=>b.area-a.area)[0];assert.ok(pane);const p=mesh.bounds.min.map((v,i)=>(v+mesh.bounds.max[i])/2),n=pane.normal,a=p.map((v,i)=>v+n[i]*.3),z=p.map((v,i)=>v-n[i]*.3);
 assert.ok(scene.index.crossings(a,z).some(h=>h.surface.material==='glass'));for(const b of scene.index.surfaces.values())if(b.material==='glass')scene.index.change(b.id,{intact:false,openFraction:1});assert.ok(!scene.index.crossings(a,z).some(h=>h.surface.intact&&scene.index.pass(h.surface)<.99),'No phantom wall fills a real native pane');
 const placed=preparePhysicalInstance(data,{id:'turned',kind:'exterior',source:'native',translation:[20,0,15],quarterTurns:1});const raw=data.surfaces.find(s=>s.renderNormal),view=placed.data.surfaces.find(s=>s.nativeId===raw.id);assert.ok(Math.abs(view.renderNormal[0]-raw.renderNormal[2])<1e-6);assert.ok(Math.abs(view.renderNormal[2]+raw.renderNormal[0])<1e-6);assert.ok(view.renderAppearanceIds.every(id=>id.startsWith('turned::')));
 const reference=compileScene(full);assert.ok(Math.abs(scene.initialFuel-reference.initialFuel)<reference.initialFuel*1e-6,'Grid-boundary facets cannot become an extra positive-area fuel layer');
 const plan=HOUSING_PLANS['hopkins-4-13'],stairs=plan.floors[0].stairs,upper=plan.plinth+2.12;assert.equal(scene.index.supportAt(stairs.x+.5,stairs.z+1.5,upper+.01,upper-.13),undefined,'Native upper stair hole stays open');
 const roof=data.surfaces.find(s=>s.kind==='roof'&&s.normal[1]>.2),r=roof.triangles[0].reduce((a,p)=>a.map((v,i)=>v+p[i]/3),[0,0,0]),support=scene.index.supportAt(r[0],r[2],r[1]+.01,r[1]-.01);assert.ok(support&&Math.abs((r[1]+.01-support.t*.02)-r[1])<.011,'Native sloped roof contact remains at its authored plane');
 const edges=exteriorPlanEdges(plan.floors[0]).filter(e=>!e.opening),left=edges.find(e=>edges.some(o=>o!==e&&Math.abs(e.nx*o.nx+e.nz*o.nz)<.1&&[e.a,e.b].some(p=>[o.a,o.b].some(q=>p[0]===q[0]&&p[1]===q[1])))),right=edges.find(o=>o!==left&&Math.abs(left.nx*o.nx+left.nz*o.nz)<.1&&[left.a,left.b].some(p=>[o.a,o.b].some(q=>p[0]===q[0]&&p[1]===q[1]))),corner=[left.a,left.b].find(p=>[right.a,right.b].some(q=>p[0]===q[0]&&p[1]===q[1])),nx=left.nx+right.nx,nz=left.nz+right.nz;
 assert.ok(scene.index.crossings([corner[0]+nx*.5,plan.plinth+1,corner[1]+nz*.5],[corner[0]-nx*.5,plan.plinth+1,corner[1]-nz*.5]).some(h=>h.surface.intact&&scene.index.pass(h.surface)<.99),'A real opaque native corner does not become a diagonal air path');
});
