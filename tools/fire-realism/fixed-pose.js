export const FIRE_POSE_FRAMES=Object.freeze({'match-contact':45,'carried-torch':90,'gasoline-front':60,'gasoline-front-powder':60,'wall-clipped-jet':60,'street-fire':60});
export async function fingerprint(value){
  if(!globalThis.crypto?.subtle)throw Error('Web Crypto is required for exact benchmark fingerprints');
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function createFixedFirePose(snapshot,{frameIndex,anchors,sourceAppearance,eventTimes=[]}={}){
  const source=structuredClone(snapshot),poseFingerprint=await fingerprint({snapshot:source,anchors,sourceAppearance});
  const worldScale=source.clocks.worldScale??1,playerScale=source.clocks.playerScale??1;
  const initialBurning=source.cells.filter(cell=>cell.phase==='burning'&&cell.intensity>0).length;
  const activeTorch=source.player.tool==='torch'&&source.player.torch?.phase==='lit'&&source.player.torch.remainingSeconds>0;
  if(initialBurning===0&&!source.discharge?.active&&!activeTorch)throw Error('Canonical pose has no active fire/tool emission; reject empty benchmark');
  const receipts=eventTimes.filter(e=>['explosion','barrel-explosion','barrel-exploded','molotov-impact'].includes(e.type));
  const record={kind:'fixed-authoritative-pose',frameIndex,tick:source.tick,poseFingerprint,initialBurning,activeDischarge:!!source.discharge?.active,activeTorch,
    worldTime:source.clocks.world,playerTime:source.clocks.player,worldScale,playerScale,anchors:structuredClone(anchors),sourceAppearance:structuredClone(sourceAppearance),
    adaptation:'Fuel, tool state, native pose, masks and source appearance are frozen from this actual simulation frame. Only identical presentation clocks advance. Sustained emission is a benchmark adaptation, not played gameplay.'};
  return {source,record,async frame(index){
    const realSeconds=index/60,worldTime=source.clocks.world+realSeconds*worldScale,playerTime=source.clocks.player+realSeconds*playerScale;
    const activeTransientIds=receipts.filter(e=>worldTime-e.receivedWorldTime>=0&&worldTime-e.receivedWorldTime<1.5).map(e=>e.id);
    const workload={poseFingerprint,tick:source.tick,worldTime,playerTime,burning:initialBurning,jet:!!source.discharge?.active,rays:source.discharge?.rays.length||0,torch:source.player.torch?.phase,activeTransientIds};
    return {snapshot:source,worldTime,playerTime,workload:{...workload,fingerprint:await fingerprint(workload)}};
  }};
}
