import {createRegionalQueryParticipant} from './regional-effective-query.js';
import {triangleArea} from '../../workbenches/furnished-house/geometry.js';

// Borrowed source geometry and scoped projections use the same registry budget.
export function createHybridSourceQueries({reader,sources,reserve,working}){
  const context=reader.context(),pins=[],loans=new Set(),touchedViews=new WeakMap();let current,closed=false,projectionCalls=0,projectedParts=0;
  const live=()=>{if(closed)throw Error('Hybrid queries disposed');reader.context();};
  try{for(const s of sources){pins.push(reserve('hybrid-surface/'+s.partRef.id,s.surfaceTriangles));if(s.solidTriangles!==s.surfaceTriangles)pins.push(reserve('hybrid-solid/'+s.partRef.id,s.solidTriangles));}
    const participant=createRegionalQueryParticipant({grid:context.grid,sources,sourceRevision:context.sourceRevision},{generation:context.generation,authenticate:reader.inspect});current=participant.query.view();touchedViews.set(current,new Set());
    const coldIds=new Map(sources.map(s=>[s.partRef.id,s.rayRecord.id]));
    function acquire(view,partId){
      live();const budget=working(partId?1:coldIds.size),pieces=[],triangles=[];let released=false;
      const loan={view,pieces,triangles,release(){if(released)return;released=true;for(const p of pieces)p.triangles.length=0;pieces.length=triangles.length=0;budget.release();loans.delete(loan);}};
      try{
        projectionCalls++;projectedParts+=partId?1:coldIds.size;
        participant.query.faces(view,{channel:'solid',partId,domain:'cold',visit(p){
          // Reserve fan slots before allocating them. Collinear slots can make
          // this conservative; only positive material enters support queries.
          budget.grow(Math.max(0,p.polygon.length-2));const ts=[];
          for(let i=1;i<p.polygon.length-1;i++){const t=[p.polygon[0],p.polygon[i],p.polygon[i+1]];if(triangleArea(t)>0)ts.push(t);}
          if(ts.length){pieces.push({...p,triangles:ts});triangles.push(...ts);}
        }});loans.add(loan);return loan;
      }catch(error){loan.release();throw error;}
    }
    function withPieces(view,consume,{partId}={}){const loan=acquire(view,partId);try{return consume(loan.pieces);}finally{loan.release();}}
    const sweep=(...args)=>{live();return participant.query.sweptCylinderClear(current,...args);};
    return {has:id=>coldIds.has(id),view:()=>current,touched:id=>touchedViews.get(current).has(id),sweep,
      // Sweeps allocate no projection. Reading triangles owns a budgeted loan
      // until release() or registry disposal; it is never an untracked copy.
      shape(id){live();let loan,released=false;return {closed:false,sweep,get triangles(){live();if(released)throw Error('Regional shape loan released');loan??=acquire(current,id);return loan.triangles;},release(){if(released)return;released=true;loan?.release();}};},
      crossings(id,a,b,options){live();return participant.query.segment(current,a,b,options).filter(h=>h.surface.id===coldIds.get(id));},
      withPieces:(consume,options)=>withPieces(current,consume,options),
      prepare(slices,retired=[]){live();const before=current,stage=participant.prepare(before,slices,retired),touched=new Set(touchedViews.get(before));for(const s of slices)for(const p of reader.inspect(s).parts)touched.add(p.partId);touchedViews.set(stage.view,touched);let done=false;return {view:stage.view,has:id=>coldIds.has(id),touched:id=>touched.has(id),withPieces:(consume,options)=>withPieces(stage.view,consume,options),validate(){live();if(done||current!==before)throw Error('Stale hybrid query stage');if(loans.size)throw Error('Release regional geometry loans before publication');stage.validate();},seal(){this.validate();return ()=>{if(done||current!==before)throw Error('Stale hybrid query stage');current=stage.view;done=true;participant.release(before);};},dispose(){if(done)return;done=true;stage.dispose();}};},
      diagnostics:()=>({...participant.query.diagnostics(),...participant.count(current),projectionCalls,projectedParts,liveProjectionLoans:loans.size}),
      dispose(){if(closed)return;for(const loan of [...loans])loan.release();closed=true;participant.query.dispose();for(const pin of pins)pin.release();pins.length=0;}
    };
  }catch(error){for(const pin of pins)pin.release();throw error;}
}
