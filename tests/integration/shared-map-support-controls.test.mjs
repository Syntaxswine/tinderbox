import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {FIRST_SUPPORT_CONTROLS,applyFirstSupportControls} from '../../src/content/map-source-support-overrides.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
import {DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {createSourceSupportGraph} from '../../src/simulation/source-support.js';
import {createBoundaryIndex} from '../../workbenches/furnished-house/geometry.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url))),index=read('assets/runtime/map-sources/new-york/index.json'),library=read('assets/runtime/map-sources/new-york/library.json'),nav=read('assets/art/place-scenes/new-york/navigation.json'),descriptor=read('assets/art/shared-map-support-overrides/new-york-controls-v1.json'),q=id=>'new-york::'+id;
function fixture(){const compiled=compileSharedMap(index,library,nav),create=compiled.createActivation;let activation;compiled.createActivation=options=>(activation=create(options));const state={player:{id:'source-control',x:56,y:14,elevation:0,height:1.66,radius:.5,hp:100},actors:[],tick:0,clocks:{world:0}},provider=createSceneThermal({compiled,state,definition:compiled.definition,config:DEFAULT_CONFIG,event:()=>{}});return {compiled,provider,activation,trial:provider.trial,dispose(){provider.dispose();compiled.dispose();}};}
const pieces=(f,id)=>f.activation.sourceForCarrier(id).surfaces.flatMap(s=>f.trial.boundariesForSource(s.id));

test('the exact ten control pairs preserve cold/active rooting and canonical stock, without applying the separate parapet proposal',()=>{
  const f=fixture();try{
    const graph=f.trial.supportGraph.rootingEvidence(),before=f.trial.supportGraph.diagnostics().unresolvedInitial,ids=[...new Set(FIRST_SUPPORT_CONTROLS.flatMap(row=>row.slice(0,2)).map(q))];
    assert.equal(f.compiled.model.index.supportOverrides.joins.length,10);assert.equal(f.compiled.model.index.supportOverrides.retired.length,2);assert.equal(f.compiled.model.carriers.length,12446);assert.ok(!f.compiled.model.carriers.some(c=>c.id.includes('blocking')));
    for(const [child,parent,kind]of FIRST_SUPPORT_CONTROLS){const r=graph.relations.find(r=>r.child===q(child)&&r.parent===q(parent));assert.equal(r.kind,kind);assert.equal(r.symmetric,kind==='structural-seam');}
    const initial=f.provider.diagnostics().carriers.staticInitial;f.activation.ensure(ids);f.trial.step();assert.equal(f.trial.supportGraph.diagnostics().unresolvedInitial,before,'No new unresolved active patches may be hidden during replacement');assert.equal(f.trial.supportGraph.unsupported({force:true}).length,0);assert.equal(f.provider.diagnostics().carriers.staticInitial,initial);assert.ok(Math.abs(f.provider.diagnostics().carriers.world.added)<1e-10);
  }finally{f.dispose();}
});

test('the fixed header survives opening and loss of both moving leaves, but falls after both real fixed-jamb parents are lost',()=>{
  const f=fixture(),header=q('carrier/ny-front/header'),jambs=[q('carrier/ny-front/jamb--1'),q('carrier/ny-front/jamb-1')];try{
    const relations=f.trial.supportGraph.rootingEvidence().relations.filter(r=>r.child===header);assert.ok(relations.some(r=>jambs.includes(r.parent)));assert.ok(relations.every(r=>!r.parent.includes('/leaf')));
    f.activation.ensure([header,...jambs]);const openingIds=f.activation.ensurePortal('ny-front');for(const id of openingIds)f.trial.command({type:'opening',id,open:true});f.trial.step();assert.ok(pieces(f,header).every(b=>b.intact));
    const leafIds=f.compiled.model.carriers.filter(c=>c.portalId==='ny-front'&&c.role==='door').map(c=>c.id);assert.equal(leafIds.length,2);for(const id of leafIds)for(const b of pieces(f,id))f.trial.scene.index.change(b.id,{intact:false});f.trial.step();assert.ok(pieces(f,header).every(b=>b.intact));
    for(const b of pieces(f,jambs[0]))f.trial.scene.index.change(b.id,{intact:false});f.trial.step();assert.ok(pieces(f,header).every(b=>b.intact));
    for(const b of pieces(f,jambs[1]))f.trial.scene.index.change(b.id,{intact:false});f.trial.step();assert.ok(pieces(f,header).every(b=>!b.intact));assert.ok(f.trial.events.some(e=>e.type==='mechanical-support-loss'&&e.sourceSurfaceId.startsWith(header+'/')));
  }finally{f.dispose();}
});

test('a header/jamb dependency cycle has no earth path, and malformed override scope fails before modifying its graph',()=>{
  const ids=[q('carrier/ny-front/header'),q('carrier/ny-front/jamb--1')],box={min:[0,2,0],max:[1,3,1]},carriers=ids.map((id,i)=>({id,role:'window-or-portal-frame',bounds:box,parts:[],supports:[ids[1-i]],supportEvidence:[{parent:ids[1-i],kind:'native-opening-assembly-attachment'}],attachments:[],anchors:[],adjacency:[]})),model={carriers,carrierById:new Map(carriers.map(c=>[c.id,c])),parts:[],index:{contacts:[]}},graph=createSourceSupportGraph({scene:{index:createBoundaryIndex([])},model,querySource:{}});
  assert.equal(graph.rootingEvidence().supported.size,0);assert.equal(graph.diagnostics().unresolvedInitial,2);
  const f=fixture();try{for(const mutate of [d=>d.joins.push({...d.joins[0]}),d=>d.joins[0].groundAnchor=true,d=>d.joins[8].direction='parent-to-child',d=>d.fuelChanges=1,d=>d.retiredSupportInterpretations[0].parentCarrierId='carrier/ny-front/jamb--1']){
    const raw=structuredClone(f.compiled.model.index),before=JSON.stringify(raw),bad=structuredClone(descriptor);mutate(bad);assert.throws(()=>applyFirstSupportControls(raw,bad));assert.equal(JSON.stringify(raw),before);
  }}finally{f.dispose();}
});
