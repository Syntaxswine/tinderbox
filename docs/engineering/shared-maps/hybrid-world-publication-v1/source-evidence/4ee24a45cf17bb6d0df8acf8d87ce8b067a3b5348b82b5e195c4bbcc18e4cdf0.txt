import {createRegionalQueryParticipant} from './regional-effective-query.js';
import {triangleArea} from '../../workbenches/furnished-house/geometry.js';

// Bounded regional query participant, borrowing the registry's pinned geometry.
// It shares the world's source cache; it is not another production mesh store.
export function createHybridSourceQueries({reader,sources,reserve,working}){
  const context=reader.context(),pins=[],touchedViews=new WeakMap();let current,closed=false;
  const live=()=>{if(closed)throw Error('Hybrid queries disposed');reader.context();};
  try{for(const s of sources){pins.push(reserve('hybrid-surface/'+s.partRef.id,s.surfaceTriangles));if(s.solidTriangles!==s.surfaceTriangles)pins.push(reserve('hybrid-solid/'+s.partRef.id,s.solidTriangles));}
    const participant=createRegionalQueryParticipant({grid:context.grid,sources,sourceRevision:context.sourceRevision},{generation:context.generation,authenticate:reader.inspect});current=participant.query.view();touchedViews.set(current,new Set());
    const coldIds=new Map(sources.map(s=>[s.partRef.id,s.rayRecord.id]));
    function pieces(view=current,partId){live();const out=participant.query.faces(view,{channel:'solid',partId}).filter(p=>p.recordId===coldIds.get(p.partId)).flatMap(p=>{const triangles=p.polygon.slice(1,-1).map((_,i)=>[p.polygon[0],p.polygon[i+1],p.polygon[i+2]]).filter(t=>triangleArea(t)>0);return triangles.length?[{...p,triangles}]:[];});working(out.reduce((n,p)=>n+p.triangles.length,0));return out;}
    return {has:id=>coldIds.has(id),view:()=>current,touched:id=>touchedViews.get(current).has(id),
      shape(id){const triangles=pieces(current,id).flatMap(p=>p.triangles);return {triangles,closed:false,sweep:(...args)=>{live();return participant.query.sweptCylinderClear(current,...args);}};},
      crossings(id,a,b,options){live();return participant.query.segment(current,a,b,options).filter(h=>h.surface.id===coldIds.get(id));},
      pieces,
      prepare(slices,retired=[]){live();const before=current,stage=participant.prepare(before,slices,retired),touched=new Set(touchedViews.get(before));for(const s of slices)for(const p of reader.inspect(s).parts)touched.add(p.partId);touchedViews.set(stage.view,touched);let done=false;return {view:stage.view,has:id=>coldIds.has(id),touched:id=>touched.has(id),pieces:()=>pieces(stage.view),validate(){live();if(done||current!==before)throw Error('Stale hybrid query stage');stage.validate();},seal(){this.validate();return ()=>{if(done||current!==before)throw Error('Stale hybrid query stage');current=stage.view;done=true;participant.release(before);};},dispose(){if(done)return;done=true;stage.dispose();}};},
      diagnostics:()=>({...participant.query.diagnostics(),...participant.count(current)}),
      dispose(){if(closed)return;closed=true;participant.query.dispose();for(const pin of pins)pin.release();pins.length=0;}
    };
  }catch(error){for(const pin of pins)pin.release();throw error;}
}
