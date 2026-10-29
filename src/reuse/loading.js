// Native TextureLoader images may finish after navigation has been cancelled.
// Retire fulfilled and late resources without waiting for an unrelated request.
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
