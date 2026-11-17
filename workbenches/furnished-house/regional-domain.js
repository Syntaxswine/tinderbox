// Capability for the isolated compiler pilot, never supplied by map factories.
const domains=new WeakMap();
export function createRegionalCompileDomain(data,min,trace){
  if(!Array.isArray(min)||min.length!==3||!min.every(Number.isSafeInteger)||min[0]%4||min[2]%4)throw Error('Off-grid regional compiler domain');
  if(!min.map((v,i)=>v+[4,1,4][i]).every(Number.isSafeInteger))throw Error('Unsafe regional compiler exclusive end');
  const token=Object.freeze({kind:'isolated-regional-compiler-v1'});
  domains.set(token,{data,min:[...min],max:[min[0]+3,min[1],min[2]+3],trace});return token;
}
export function readRegionalCompileDomain(token,data){
  const domain=token&&domains.get(token);if(!domain||domain.data!==data)throw Error('Unknown or stale regional compiler capability');return domain;
}
