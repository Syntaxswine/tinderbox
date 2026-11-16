import assert from 'node:assert/strict';

// Tool-owned pages share one bounded browser, but their document/GL lifetimes
// can end independently. No production module imports this QA helper.
export function createPageContextOwner({browser,origin,onPage=()=>{},bounded=operation=>operation()}){
  const live=new Map(),pending=new Set();let stopping=false,created=0,closed=0,maxLive=0,shutdown;
  async function create(){
    if(stopping)throw Error('Review page owner is closing');
    const operation=(async()=>{
      const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1}),id=++created;
      const release=()=>{if(live.delete(context))closed++;};let closing;
      const lease={context,page:null,close:()=>closing??=(async()=>{await bounded(()=>context.close(),'context-'+id);release();})()};
      live.set(context,lease);maxLive=Math.max(maxLive,live.size);context.on('close',release);
      try{
        if(stopping)throw Error('Review page owner closed during creation');
        await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
        lease.page=await context.newPage();await onPage(lease.page);
        if(stopping)throw Error('Review page owner closed during creation');return lease;
      }catch(error){try{await lease.close();}catch(cleanup){throw new AggregateError([error,cleanup],'Review page creation and cleanup failed');}throw error;}
    })();
    pending.add(operation);try{return await operation;}finally{pending.delete(operation);}
  }
  function closeAll(){
    stopping=true;return shutdown??=(async()=>{
      const failures=[];
      async function drain(){for(const result of await Promise.allSettled([...live.values()].map(lease=>lease.close())))if(result.status==='rejected')failures.push(result.reason);}
      await drain();await Promise.allSettled([...pending]);await drain();
      if(failures.length)throw new AggregateError(failures,'Review context cleanup failed');
    })();
  }
  return {create,closeAll,diagnostics:()=>({created,closed,remaining:live.size,pending:pending.size,maxLive,stopping})};
}

export async function runIsolatedLanes(order,{first,create,run}){
  const results=[];
  for(let index=0;index<order.length;index++){
    const lease=index===0&&first?first:await create();let failure;
    try{results.push(await run({index,lane:order[index],lease}));}
    catch(error){failure=error;throw error;}
    finally{try{await lease.close();if(!lease.page.isClosed())throw Error('Review lane page remained open');}catch(cleanup){if(failure)throw new AggregateError([failure,cleanup],'Review lane and cleanup failed');throw cleanup;}}
  }
  return results;
}

// Self-contained for page.evaluate, and independently checked with Node SHA.
// This runs once only AFTER a lane's final timed frame, never in its prefix.
export async function endpointStateSha256({base,snapshot=globalThis.qa.snap}){
  const copy={...snapshot,diagnostics:{...snapshot.diagnostics,thermal:{...snapshot.diagnostics.thermal}}};delete copy.diagnostics.thermal.timing;
  const text=JSON.stringify(copy).split(base).join('<PACKAGE>/'),bytes=new TextEncoder().encode(text);
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function scalarWorkload(row){
  return Object.fromEntries(['window','generation','hostTick','primary','nativeTick','worldTime','paused','dropped','drawCalls','geometries','textures','uploadCalls','uploadBytes','sourceCount','positiveFlames','positiveRoofFlames','groundFlames','activeCharacters'].map(key=>[key,row[key]]));
}

export function assertScalarWorkload(rows,expected){
  assert.deepEqual(rows.map(scalarWorkload),expected.map(scalarWorkload),'Unchanged scalar clocks, drawn/uploaded work and fire sources');
}
