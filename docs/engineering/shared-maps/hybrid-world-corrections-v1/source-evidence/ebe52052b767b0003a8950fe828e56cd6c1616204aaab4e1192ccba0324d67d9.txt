import {createOriginalSupportPorts,originalMaterialComponents} from './original-support-ports.js';
import {originalContactPatches} from '../content/cornice-wall-contact-pilot.js';
import {segmentTriangle,triangleArea} from '../../workbenches/furnished-house/geometry.js';

// Corrected original-port semantics over bounded borrowed source geometry.
// Only IDs/results survive solves; current fragment meshes are temporary.
export function createHybridSourceSupport({scene,querySource,definition}){
  const pins=[],parts=[],byPart=new Map(),components=new Map();let closed=false,revision=0,state=null,fixed=new Map(),configured=null;
  const live=()=>{if(closed)throw Error('Hybrid support disposed');};
  try{for(const spec of definition.parts){const pin=querySource.pinOriginal(spec.id);pins.push(pin);const p={...spec,triangles:pin.shape.triangles};parts.push(p);byPart.set(p.id,p);components.set(p.id,originalMaterialComponents(p.triangles));}
    if(parts.reduce((n,p)=>n+p.triangles.length,0)>65536)throw Error('Hybrid originals exceed combined source budget');
    function originalCore(bindings){return createOriginalSupportPorts({...definition,parts,bonds:definition.bonds.map(b=>({...b,parent:{...b.parent,cell:undefined,...bindings.get(b.id+'/parent')},child:{...b.child,cell:undefined,...bindings.get(b.id+'/child')}}))});}
    function fragments(records,regional,wholeClaims,coldPieces){
      const coldByPart=new Map();for(const piece of coldPieces){if(!coldByPart.has(piece.partId))coldByPart.set(piece.partId,[]);coldByPart.get(piece.partId).push(piece);}
      const out=[];for(const p of parts){const rs=records.filter(b=>!b.queryOnly&&b.nativePartId===p.id&&b.intact),cs=components.get(p.id);
        for(const b of rs){const ts=b.solidTriangles||b.triangles;if(!ts?.length||ts.some(t=>!Number.isFinite(triangleArea(t))||!(triangleArea(t)>0)))throw Error('Finite positive current support geometry required');const matched=cs.map(c=>({component:c.id,primitives:c.primitives.filter(i=>originalContactPatches(ts,p.triangles[i]).length)})).filter(c=>c.primitives.length);if(matched.length!==1)throw Error('Native original component/face lineage unproved');out.push({id:b.id,recordId:b.id,partId:p.id,ownerId:p.ownerId,mode:'native',cell:b.sourceCell,triangles:ts,solidTriangles:ts,...matched[0]});}
        if(regional?.has(p.id)&&regional.touched(p.id)){
          const groups=new Map();for(const piece of coldByPart.get(p.id)||[]){const component=cs.find(c=>c.primitives.includes(piece.primitive));if(!component)throw Error('Cold source primitive lineage missing');const key=component.id+'/'+piece.cell.join(',');if(!groups.has(key))groups.set(key,{id:'cold:'+p.id+'@'+key,partId:p.id,ownerId:p.ownerId,component:component.id,mode:'cold',cell:piece.cell,originalPrimitives:[],triangles:[]});const g=groups.get(key);g.originalPrimitives.push(...piece.triangles.map(()=>piece.primitive));g.triangles.push(...piece.triangles);}
          // One original component/cell can contain disconnected survivors.
          // Keep current islands separate; the existing material-contact core
          // can join touching fragments, but no shared ID may bridge a gap.
          for(const g of groups.values())for(const island of originalMaterialComponents(g.triangles)){const {originalPrimitives,...fragment}=g;out.push({...fragment,id:g.id+'/island-'+island.id,triangles:island.primitives.map(i=>g.triangles[i]),primitives:[...new Set(island.primitives.map(i=>originalPrimitives[i]))]});}
        }else if(!wholeClaims.has(p.ownerId)&&!rs.length)for(const c of cs)out.push({id:'cold:'+p.id+'/'+c.id,partId:p.id,ownerId:p.ownerId,component:c.id,mode:'cold',primitives:c.primitives,triangles:c.primitives.map(i=>p.triangles[i])});
      }return out;
    }
    function solve(records,regional,wholeClaims,nextFixed=new Map(fixed)){
      const evaluate=coldPieces=>{const fs=fragments(records,regional,wholeClaims,coldPieces),basis=originalCore(new Map());try{
        for(const b of basis.bindings())for(const side of ['parent','child']){const key=b.id+'/'+side;if(nextFixed.has(key))continue;const endpoint=b[side],authored=definition.bonds.find(v=>v.id===b.id)[side];if(!authored.sourceSurfaceId||!authored.cell)throw Error('Fixed source surface/cell lineage required');const candidates=fs.filter(f=>f.mode==='native'&&f.partId===endpoint.partId&&f.component===endpoint.component&&f.primitives.includes(endpoint.primitive)&&JSON.stringify(f.cell)===JSON.stringify(authored.cell)&&records.find(r=>r.id===f.recordId)?.sourceSurfaceId===authored.sourceSurfaceId);if(candidates.length>1)throw Error('Ambiguous fixed native support owner');if(candidates.length===1)nextFixed.set(key,{nativeRecordId:candidates[0].recordId,cell:[...authored.cell]});}
      }finally{basis.dispose();}
      const core=originalCore(nextFixed);try{return {result:core.evaluate({revision,fragments:fs}),fixed:nextFixed};}finally{core.dispose();}};
      return parts.some(p=>regional?.has(p.id)&&regional.touched(p.id))?regional.withPieces(evaluate):evaluate([]);
    }
    const api={nodes:new Map(),links:new Map(),
      configure(fn){configured=fn;},
      prepare(records,regional,wholeClaims){live();const expected=revision,next=solve(records,regional,wholeClaims),ids=records.filter(b=>!b.queryOnly).map(b=>b.id);let done=false;return {result:next.result,validate(){live();if(done||revision!==expected)throw Error('Stale support stage');},commit(){this.validate();fixed=next.fixed;state=next.result;for(const id of ids)api.nodes.set(id,scene.index.surfaces.get(id));revision++;done=true;},dispose(){done=true;}};},
      sourcesAdded(result){live();for(const b of result.boundaries)api.nodes.set(b.id,b);},
      unsupported(){live();if(!configured)return [];const current=configured();const solved=solve(current.records,current.regional,current.wholeClaims);fixed=solved.fixed;state=solved.result;return state.unrootedIds.flatMap(id=>{const b=scene.index.surfaces.get(id);return b?.intact&&!b.queryOnly?[b]:[];});},
      pendingSources:()=>[],snapshot:()=>state,rootingEvidence:()=>({originalPorts:true,approvedMounts:definition.approvedMounts||[]}),
      diagnostics:()=>({productionEnabled:false,originalParts:parts.length,originalTriangles:parts.reduce((n,p)=>n+p.triangles.length,0),fixedNativePorts:fixed.size,revision,unresolvedBindings:state?.unresolvedBindings||[],retainedCurrentMeshes:0}),
      dispose(){if(closed)return;closed=true;for(const p of pins)p.release();pins.length=0;parts.length=0;byPart.clear();components.clear();fixed.clear();api.nodes.clear();state=null;configured=null;}
    };return api;
  }catch(error){for(const p of pins)p.release();throw error;}
}
