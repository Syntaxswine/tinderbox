// Disabled isolated receipt bridge. No live factory, world or consumer imports it.
import {createRegionalStockParticipant} from '../simulation/regional-source-pilot.js';
import {createRegionalQueryParticipant} from './regional-effective-query.js';

export function createRegionalReceiptBridge({producer,grid,sources,sourceRevision}){
  const stock=createRegionalStockParticipant(producer);let queries;
  try{
    const context=stock.context();
    if(sourceRevision!==context.sourceRevision||!['origin','pitch'].every(key=>Array.isArray(grid?.[key])&&grid[key].length===3&&grid[key].every((v,i)=>v===context.grid[key][i]))||sources.length!==context.parts.length||context.parts.some(p=>typeof p.id!=='string'||!sources.some(s=>s.partRef.id===p.id&&s.partRef.carrierId===p.ownerId)))throw Error('Bridge source revision/grid/owner/part mismatch');
    queries=createRegionalQueryParticipant({grid,sources,sourceRevision},{generation:context.generation,authenticate:stock.inspect});
  }catch(error){stock.dispose({advance:false});throw error;}
  const held=new Set(),pending=new Set();let closed=false,current;
  function live(){if(closed)throw Error('Regional receipt bridge disposed');stock.context();}
  const state=(stockSnapshot,queryView)=>Object.freeze({generation:stockSnapshot.generation,revision:queryView.revision,stockSnapshot,queryView});
  current=state(stock.initial(),queries.query.view());held.add(current);
  function read(snapshot){live();if(!held.has(snapshot)||snapshot.generation!==current.generation)throw Error('Unknown/released/stale complete bridge state');return snapshot.queryView;}
  const bridge=Object.freeze({state(){live();return current;},slice(receipt){live();return stock.slice(receipt);},prepare({expectedGeneration,expectedRevision,receipts=[],retireRecords=[]}){
    live();if(!Array.isArray(receipts)||receipts.length>320||!Array.isArray(retireRecords))throw Error('Bounded receipt/retirement batch required');
    const original=current,captured=[...receipts];let stockStage,queryStage,next,done=false,plan;
    function unchanged(){if(done||current!==original||expectedGeneration!==current.generation||expectedRevision!==current.revision)throw Error('Stale bridge publication');}
    // Receipt guards inspect caller-owned records. Recheck the coordinator
    // after those reads as well, so reentrant publication cannot be overwritten.
    function validate(){live();unchanged();stockStage.validate();queryStage.validate();live();unchanged();}
    try{
      if(expectedGeneration!==original.generation||expectedRevision!==original.revision)throw Error('Stale bridge publication');
      stockStage=stock.prepare(original.stockSnapshot,captured);
      queryStage=queries.prepare(original.queryView,captured.map(r=>stock.slice(r)),retireRecords);
      next=state(stockStage.snapshot,queryStage.view);validate();
      plan=Object.freeze({validate,publish(){
        validate();
        // Both complete next states already exist. No participant commit or
        // external callback follows final validation; this is the only swap.
        held.add(next);current=next;done=true;pending.delete(plan);stockStage=null;queryStage=null;captured.length=0;return current;
      },dispose(){if(done)return;done=true;queryStage?.dispose();stockStage?.dispose();queryStage=null;stockStage=null;captured.length=0;pending.delete(plan);}});
      pending.add(plan);return plan;
    }catch(error){queryStage?.dispose();stockStage?.dispose();captured.length=0;throw error;}
  },release(snapshot){const view=read(snapshot);if(snapshot===current)throw Error('Cannot release current complete bridge state');queries.release(view);stock.release(snapshot.stockSnapshot);held.delete(snapshot);},
    segment(snapshot,...args){return queries.query.segment(read(snapshot),...args);},trace(snapshot,...args){return queries.query.trace(read(snapshot),...args);},
    faces(snapshot,...args){return queries.query.faces(read(snapshot),...args);},sweptCylinderClear(snapshot,...args){return queries.query.sweptCylinderClear(read(snapshot),...args);},
    reset(){live();for(const plan of pending)plan.dispose();const stockSnapshot=stock.reset(),view=queries.query.reset();held.clear();current=state(stockSnapshot,view);held.add(current);return current;},
    dispose(){if(closed)return;for(const plan of pending)plan.dispose();queries.query.dispose();stock.dispose();held.clear();closed=true;current=null;},
    diagnostics(){return {productionEnabled:false,closed,heldStates:held.size,pendingStages:pending.size,stock:stock.diagnostics(),query:queries.query.diagnostics(),...(closed?{}:queries.count(current.queryView))};}
  });return bridge;
}
