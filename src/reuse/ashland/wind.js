import {makeHouseWindSampler} from './wind-sampler.js';
import {COTTAGE_ORIGIN} from '../../content/cottage-pair.js';

export const NAUTILUS_WIND_COMMIT='4ef13e738845f9bd35aed35ea982ea4f0cbc210a';
export const PAIR_WIND_SHA256='458314f7ef202d32481a48f4447b46a9e7693080d21c73aadbf87123ef88761b';
export const PAIR_WIND_URL=new URL('../../../assets/art/ashland-pair/pair-wind.json',import.meta.url);
export const calmCottageWind=(_x,_y,_z,out=[0,0,0])=>(out[0]=out[1]=out[2]=0,out);
export function translateCottageWind(bake){
  const local=makeHouseWindSampler(bake);
  return (x,y,z,out)=>local(x-COTTAGE_ORIGIN.x,y,z-COTTAGE_ORIGIN.z,out);
}
// One checked payload serves both the fire's local sampler and the HUD's prevailing flow.
export async function loadCottageWeather(mode,signal){
  if(mode==='calm')return {sampleWind:calmCottageWind,prevailing:{x:0,y:0}};
  if(mode!=='wind')throw Error('Unknown cottage wind mode');
  const response=await fetch(PAIR_WIND_URL,{signal});
  if(!response.ok)throw Error('The Ashland wind field could not be loaded.');
  const raw=(await response.text()).replaceAll('\r\n','\n');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==PAIR_WIND_SHA256)throw Error('Unexpected Ashland wind bake.');
  if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');
  const bake=JSON.parse(raw),flow=bake.unobstructedInflowAt3m;
  const prevailing=Array.isArray(flow)&&Number.isFinite(flow[0])&&Number.isFinite(flow[2])?
    {x:flow[0],y:flow[2]}:null;
  return {sampleWind:translateCottageWind(bake),prevailing};
}
export async function loadCottageWind(mode,signal){
  return (await loadCottageWeather(mode,signal)).sampleWind;
}
