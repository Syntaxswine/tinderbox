// Disabled source support pilot. No world, fuel, renderer or clock ownership.
import * as T from '../runtime/three.js';
import {bounds,segmentTriangle,triangleArea,cross,sub} from '../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
import {sweptCylinderClear} from '../runtime/collision.js';
import {SOURCE_SUPPORT_TOLERANCE} from './source-support-calculations.js';

const vector=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),key=p=>p.join(','),freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
const normal=t=>{const n=cross(sub(t[1],t[0]),sub(t[2],t[0])),l=Math.hypot(...n);return n.map(v=>v/l);};
const shape=ts=>({triangles:ts,solidTriangles:ts,bounds:bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0});
const inside=(p,ts)=>!sweptCylinderClear({x:p[0],y:p[2]},{x:p[0],y:p[2]},0,p[1],p[1],{triangles:ts,closed:true});
const closest=(p,t)=>new T.Triangle(...t.map(v=>new T.Vector3(...v))).closestPointToPoint(new T.Vector3(...p),new T.Vector3()).toArray();
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export const ORIGINAL_SUPPORT_LIMITS=Object.freeze({parts:14000,bonds:20000,fragments:65536,triangles:400000});

export function originalMaterialComponents(triangles){
  const edgeMap=new Map(),links=triangles.map(()=>[]);
  for(const [i,t]of triangles.entries()){if(!Array.isArray(t)||t.length!==3||!t.every(vector)||!(triangleArea(t)>0))throw Error('Finite original physical triangles required');for(let j=0;j<3;j++){const edge=[key(t[j]),key(t[(j+1)%3])].sort().join('|');if(!edgeMap.has(edge))edgeMap.set(edge,[]);edgeMap.get(edge).push(i);}}
  for(const ids of edgeMap.values())for(const a of ids)for(const b of ids)if(a!==b)links[a].push(b);
  const seen=new Set(),out=[];for(let i=0;i<triangles.length;i++)if(!seen.has(i)){const ids=[i];seen.add(i);for(let n=0;n<ids.length;n++)for(const j of links[ids[n]])if(!seen.has(j)){seen.add(j);ids.push(j);}ids.sort((a,b)=>a-b);const set=new Set(ids),closed=[...edgeMap.values()].filter(list=>list.some(id=>set.has(id))).every(list=>list.length===2);out.push({id:out.length,primitives:ids,closed});}return out;
}

export function createOriginalSupportPorts({parts,bonds,requirements=[],anchors=[]}){
  if(!Array.isArray(parts)||parts.length>ORIGINAL_SUPPORT_LIMITS.parts||!Array.isArray(bonds)||bonds.length>ORIGINAL_SUPPORT_LIMITS.bonds)throw Error('Bounded original support data required');
  const originals=new Map(),bindings=[],groups=[],roots=[];let closed=false,generation=0,triangleCount=0;
  for(const p of parts){if(!p.id||!p.ownerId||originals.has(p.id)||!Array.isArray(p.triangles)||!p.triangles.length)throw Error('Unique original physical part required');triangleCount+=p.triangles.length;if(triangleCount>ORIGINAL_SUPPORT_LIMITS.triangles)throw Error('Original support triangle ceiling');const components=originalMaterialComponents(p.triangles);originals.set(p.id,{...p,components});freeze(p);}
  if(!Array.isArray(anchors))throw Error('Original anchor records required');
  for(const r of anchors){const {partId,elevation,component}=r||{},p=originals.get(partId);if(!p||!Number.isFinite(elevation)||component!==undefined&&(!Number.isSafeInteger(component)||!p.components[component]))throw Error('Original anchor part/elevation/component required');roots.push(freeze({partId,elevation,...component===undefined?{}:{component}}));}
  function bindEndpoint(spec,strict){
    const part=originals.get(spec.partId);if(!part||!vector(spec.point))throw Error('Named original part and physical witness required');
    if(strict&&!inside(spec.point,part.triangles))throw Error('Strict embed witness is outside original material or inside a void: '+spec.partId);
    const allowed=spec.primitives||part.triangles.map((_,i)=>i),candidates=[];
    for(const c of part.components){if(strict&&(!c.closed||!inside(spec.point,c.primitives.map(i=>part.triangles[i]))))continue;
      for(const i of c.primitives)if(allowed.includes(i)){const p=closest(spec.point,part.triangles[i]);candidates.push({partId:part.id,ownerId:part.ownerId,component:c.id,primitive:i,point:p,distance:distance(p,spec.point),originalWitness:[...spec.point],nativeRecordId:spec.nativeRecordId??null,cell:spec.cell&&[...spec.cell]});}}
    candidates.sort((a,b)=>a.distance-b.distance||a.component-b.component||a.primitive-b.primitive);const selected=candidates[0];
    if(!selected||!strict&&selected.distance>SOURCE_SUPPORT_TOLERANCE)throw Error('Unrepresentable original port: '+spec.partId+' has no local physical witness');
    if(strict){const ts=part.components[selected.component].primitives.map(i=>part.triangles[i]);if(selected.distance<=SOURCE_SUPPORT_TOLERANCE||ts.some(t=>{const hit=segmentTriangle(spec.point,selected.point,t);return hit!==null&&hit>0&&hit<1-1e-7;}))throw Error('Unrepresentable strict embed path: '+spec.partId);}
    return freeze(selected);
  }
  const bondIds=new Set();for(const b of bonds){if(!b.id||bondIds.has(b.id)||!['parent-to-child','symmetric-structural'].includes(b.direction))throw Error('Conflicting original support bond');bondIds.add(b.id);const strict=b.kind==='fixed-embed',parent=bindEndpoint(b.parent,strict),child=bindEndpoint(b.child,strict);
    if(strict&&distance(b.parent.point,b.child.point)!==0)throw Error('Strict embed needs one common original interior witness');
    if(!strict&&distance(parent.point,child.point)>SOURCE_SUPPORT_TOLERANCE)throw Error('Separated original bearing ports: '+b.id);
    if(!strict&&!supportSurfacesTouch(shape([originals.get(parent.partId).triangles[parent.primitive]]),shape([originals.get(child.partId).triangles[child.primitive]])))throw Error('Original native contact rejects bearing: '+b.id);
    bindings.push(freeze({...b,parent,child}));
  }
  const groupIds=new Set();for(const g of requirements){if(!g.id||groupIds.has(g.id)||g.portIds?.length!==2||new Set(g.portIds).size!==2||g.portIds.some(id=>!bondIds.has(id)))throw Error('Both fixed lower ports required');const ports=g.portIds.map(id=>bindings.find(b=>b.id===id)),upper=bindings.find(b=>b.id===g.upperBondId);if(ports.some(b=>b.child.ownerId!==g.ownerId||b.direction!=='parent-to-child')||!upper||upper.parent.ownerId!==g.ownerId||upper.direction!=='parent-to-child')throw Error('Invalid all-required fitting or directed top port');if(bindings.some(b=>b.child.ownerId===g.ownerId&&!g.portIds.includes(b.id)))throw Error('Incoming edge bypasses both required fitting ports');groupIds.add(g.id);groups.push(freeze({...g}));}
  function live(){if(closed)throw Error('Original support ports disposed');}
  const api=Object.freeze({bindings:()=>{live();return bindings.map(b=>b);},evaluate({expectedGeneration=generation,revision,fragments,bornRecordIds=[]}){
    live();if(expectedGeneration!==generation||!Number.isSafeInteger(revision)||revision<0||!Array.isArray(fragments)||fragments.length>ORIGINAL_SUPPORT_LIMITS.fragments)throw Error('Stale/bounded effective support fragments required');
    const nodes=new Map(),links=new Map(),material=new Map(),directed=new Map(),byPart=new Map(),closedMaterials=new Map(),unresolved=[],portNodes=new Map(),resolved=[],conflicts=[];
    for(const f of fragments){const p=originals.get(f.partId);if(!p||p.ownerId!==f.ownerId||!p.components[f.component]||!f.id||nodes.has(f.id)||!f.triangles?.length||!f.primitives?.length)throw Error('Original fragment part/component identity required');for(const i of f.primitives)if(!p.components[f.component].primitives.includes(i))throw Error('Foreign original fragment face');const node={...f,physical:shape(f.triangles)};nodes.set(f.id,node);links.set(f.id,new Set());material.set(f.id,new Set());directed.set(f.id,new Set());if(!byPart.has(f.partId))byPart.set(f.partId,[]);byPart.get(f.partId).push(node);}
    const edge=(a,b,both=false,continuity=false)=>{if(a===b)return;links.get(a).add(b);if(both){links.get(b).add(a);if(continuity){material.get(a).add(b);material.get(b).add(a);}}else directed.get(a).add(b);};
    // Material continuity is actual surviving geometry, within one original
    // component. There is no cold parent node spanning disconnected remnants.
    for(const list of byPart.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(list[i].component===list[j].component&&supportSurfacesTouch(list[i].physical,list[j].physical))edge(list[i].id,list[j].id,true,true);
    function endpoint(port,strict,bondId,side){const list=(byPart.get(port.partId)||[]).filter(f=>f.component===port.component&&(!port.cell||f.cell&&key(f.cell)===key(port.cell))&&(f.mode==='cold'||port.nativeRecordId&&f.recordId===port.nativeRecordId)&&(strict?embedEndpoint(f.id,port,bondId,side):f.primitives.includes(port.primitive)&&f.triangles.some(t=>segmentTriangle(port.point,port.point,t)!==null)));
      if(list.length!==1){if(list.length>1)unresolved.push({partId:port.partId,primitive:port.primitive,reason:'ambiguous-original-port-owner',candidates:list.map(f=>f.id)});return null;}return list[0].id;}
    // The fixed common interior witness is the embed joint. Exterior proxies
    // remain bearing evidence only. Borrow actual current connected material;
    // never close facets, infer shell nesting or reuse the original parent.
    function embedEndpoint(id,port,bondId,side){if(!id)return null;const f=nodes.get(id);
      if(!closedMaterials.has(id)){const ts=f.solidTriangles===undefined?f.triangles:f.solidTriangles,finite=Array.isArray(ts)&&ts.length>0&&ts.length<=ORIGINAL_SUPPORT_LIMITS.triangles&&ts.every(t=>Array.isArray(t)&&t.length===3&&t.every(vector)&&triangleArea(t)>0),components=finite?originalMaterialComponents(ts):[];closedMaterials.set(id,components.length&&components.every(c=>c.closed)?{ts,components}:null);}
      const proof=closedMaterials.get(id),ts=proof?.ts,w=port.originalWitness;let reason=null;
      if(!ts)reason='strict-embed-effective-solid-unproven';
      else if(!inside(w,ts)||ts.some(t=>distance(w,closest(w,t))<=SOURCE_SUPPORT_TOLERANCE))reason='strict-embed-witness-not-in-surviving-interior';
      else if(proof.components.length!==1)reason='strict-embed-effective-component-unproven';
      if(reason){unresolved.push({bondId,side,partId:port.partId,fragmentId:id,primitive:port.primitive,reason});return null;}return id;
    }
    const required=new Set(groups.flatMap(g=>g.portIds));for(const b of bindings){const strict=b.kind==='fixed-embed',a=endpoint(b.parent,strict,b.id,'parent'),c=endpoint(b.child,strict,b.id,'child');portNodes.set(b.id,{parent:a,child:c});resolved.push({id:b.id,parent:a,child:c,live:!!a&&!!c});if(a&&c&&!required.has(b.id))edge(a,c,b.direction==='symmetric-structural');}
    const rootIds=new Set();for(const r of roots)for(const f of byPart.get(r.partId)||[]){if(r.component!==undefined&&f.component!==r.component)continue;if(f.triangles.some(t=>Math.min(...t.map(p=>p[1]))<=r.elevation+SOURCE_SUPPORT_TOLERANCE&&Math.max(...t.map(p=>p[1]))>=r.elevation-SOURCE_SUPPORT_TOLERANCE))rootIds.add(f.id);}
    const descend=(start)=>{const seen=new Set(start),queue=[...seen];for(let i=0;i<queue.length;i++)for(const id of directed.get(queue[i])||[])if(!seen.has(id)){seen.add(id);queue.push(id);}return seen;};
    const sameMaterial=(a,b)=>{const seen=new Set([a]),queue=[a];for(let i=0;i<queue.length;i++)for(const id of material.get(queue[i])||[])if(!seen.has(id)){seen.add(id);queue.push(id);}return seen.has(b);};
    function reach(excluded=new Set(),disabledGroups=new Set()){const seen=new Set([...rootIds].filter(id=>!excluded.has(id)));let changed=true;while(changed){changed=false;for(const id of [...seen])for(const next of links.get(id)||[])if(!seen.has(next)&&!excluded.has(next)){seen.add(next);changed=true;}for(const g of groups){if(disabledGroups.has(g.id))continue;const ports=g.portIds.map(id=>portNodes.get(id));if(ports.some(p=>!p.parent||!p.child)||ports.some(p=>!seen.has(p.parent)||excluded.has(p.child))||!sameMaterial(ports[0].child,ports[1].child))continue;
          const parents=new Set(ports.map(p=>p.parent)),upper=bindings.filter(b=>b.parent.ownerId===g.ownerId).map(b=>portNodes.get(b.id).child).filter(Boolean),blocked=descend([...ports.map(p=>p.child),...upper]);for(const id of parents)blocked.delete(id);for(const id of excluded)blocked.add(id);const independent=reach(blocked,new Set([...disabledGroups,g.id]));
          if([...parents].every(id=>independent.has(id)))for(const p of ports)if(!seen.has(p.child)){seen.add(p.child);changed=true;}
        }}return seen;}
    const supported=reach();for(const g of groups){const parents=g.portIds.map(id=>portNodes.get(id).parent).filter(Boolean),upper=bindings.filter(b=>b.parent.ownerId===g.ownerId).map(b=>portNodes.get(b.id).child).filter(Boolean);for(const a of upper)for(const p of parents)if(descend([a]).has(p))conflicts.push({requirement:g.id,upper:a,lower:p,kind:'old-directed-descendant-path-retained'});}
    const unrooted=[...nodes.keys()].filter(id=>!supported.has(id)).sort(),births=fragments.filter(f=>f.mode==='native'&&bornRecordIds.includes(f.recordId)).map(f=>({id:f.id,recordId:f.recordId,partId:f.partId,component:f.component,state:supported.has(f.id)?'supported':'unrooted'}));
    return freeze({generation,revision,supportedIds:[...supported].sort(),unrootedIds:unrooted,births,ports:resolved,unresolvedBindings:unresolved,oldEdgeConflicts:conflicts});
  },reset(){live();generation++;return generation;},dispose(){if(closed)return;closed=true;generation++;originals.clear();bindings.length=0;groups.length=0;roots.length=0;},diagnostics:()=>({productionEnabled:false,closed,generation,parts:originals.size,bindings:bindings.length,requirements:groups.length})});return api;
}
