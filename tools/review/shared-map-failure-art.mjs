// Best effort only: diagnostics must never replace the caller's first failure.
// `save` is the existing synchronous review artifact writer.
export async function captureSharedMapFailureArt({stop,readArt,save}){
  let stage='stop';
  try{
    await stop();stage='read-art';const diagnostics=await readArt();stage='save-art';
    save('failure-art.json',{available:diagnostics!==undefined&&diagnostics!==null,diagnostics});
  }catch(error){
    try{save('failure-art-error.json',{stage,error:error?.stack||String(error)});}catch{/* Preserve the original failure even if artifact output is unavailable. */}
  }
}
