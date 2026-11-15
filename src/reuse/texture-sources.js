import {loadOwnedBatch} from './loading.js';

// One visit owns immutable image/pixel Sources. Every borrower gets its own
// Texture (UV transform, sampler, colour space and material remain private).
// Three shares the GPU image only when Source AND sampler/upload keys match.
export function createTextureSourcePool({signal}={}){
  const entries=new Map(),loans=new Set(),controller=new AbortController();
  let disposed=false,created=0,released=0;
  const check=()=>{if(disposed||signal?.aborted)throw new DOMException('Texture sources retired','AbortError');};
  function retire(entry){
    if(entry.waiters||entry.loans.size)return;
    if(entries.get(entry.key)===entry)entries.delete(entry.key);
    if(entry.base){entry.base.dispose();entry.base=null;released++;}
  }
  function clone(entry){
    const texture=entry.base.clone();entry.loans.add(texture);loans.add(texture);
    texture.addEventListener('dispose',function release(){
      texture.removeEventListener('dispose',release);loans.delete(texture);entry.loans.delete(texture);retire(entry);
    });
    return texture;
  }
  async function borrow(key,load){
    check();let entry=entries.get(key);
    if(!entry){
      entry={key,base:null,waiters:0,loans:new Set()};entries.set(key,entry);
      entry.ready=loadOwnedBatch([Promise.resolve().then(()=>{check();return load();})],{signal:controller.signal}).then(([base])=>{
        if(disposed){base.dispose();throw new DOMException('Texture sources retired','AbortError');}
        entry.base=base;created++;return base;
      },error=>{if(entries.get(key)===entry)entries.delete(key);throw error;});
    }
    entry.waiters++;
    try{
      await entry.ready;check();return clone(entry);
    }finally{entry.waiters--;retire(entry);}
  }
  function borrowNow(key,create){
    check();let entry=entries.get(key);
    if(!entry){entry={key,base:create(),waiters:0,loans:new Set()};entries.set(key,entry);created++;}
    if(!entry.base)throw Error('Texture source is still loading: '+key);
    return clone(entry);
  }
  function dispose(){
    if(disposed)return;disposed=true;signal?.removeEventListener('abort',dispose);controller.abort();
    const errors=[];for(const texture of [...loans])try{texture.dispose();}catch(error){errors.push(error);}
    for(const entry of [...entries.values()])try{retire(entry);}catch(error){errors.push(error);}
    if(errors.length)throw new AggregateError(errors,'Texture source cleanup failed');
  }
  signal?.addEventListener('abort',dispose,{once:true});if(signal?.aborted)dispose();
  return {borrow,borrowNow,dispose,diagnostics:()=>({disposed,sources:entries.size,borrowers:loans.size,created,released})};
}
