// Native TextureLoader images may finish after navigation has been cancelled.
// Retire fulfilled and late resources without waiting for an unrelated request.
export function loadOwnedBatch(promises,{signal,release=value=>value?.dispose?.()}={}){
  return new Promise((resolve,reject)=>{
    const values=new Array(promises.length),cleanupErrors=[];let remaining=promises.length,finished=false;
    const unlisten=()=>signal?.removeEventListener('abort',abort);
    function retire(value){try{release(value);}catch(error){cleanupErrors.push(error.message||String(error));}}
    function fail(error){if(finished)return;finished=true;unlisten();for(const value of values)if(value!==undefined)retire(value);values.length=0;if(error&&typeof error==='object')error.cleanupErrors=cleanupErrors;reject(error);}
    function abort(){fail(new DOMException('Asset load cancelled','AbortError'));}
    for(let i=0;i<promises.length;i++)Promise.resolve(promises[i]).then(value=>{
      if(finished){retire(value);return;}values[i]=value;
      if(--remaining===0){finished=true;unlisten();resolve(values);}
    },fail);
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    if(!promises.length&&!finished){finished=true;unlisten();resolve(values);}
  });
}
export function loadOwnedPair(modelPromise,texturePromise,signal){
  return new Promise((resolve,reject)=>{
    let model,texture,count=0,finished=false,retired=false;
    const unlisten=()=>signal?.removeEventListener('abort',abort);
    const release=()=>{if(texture&&!retired){texture.dispose();retired=true;}};
    function fail(error){if(finished)return;finished=true;release();unlisten();reject(error);}
    function abort(){fail(new DOMException('Character load cancelled','AbortError'));}
    function complete(){if(++count===2&&!finished){finished=true;unlisten();resolve({model,texture});}}
    Promise.resolve(modelPromise).then(value=>{if(finished)return;model=value;complete();},fail);
    Promise.resolve(texturePromise).then(value=>{texture=value;if(finished){release();return;}complete();},fail);
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
}
