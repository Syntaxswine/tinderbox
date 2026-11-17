const fields=['version','mode','tools','health','interact','overview'];
export function visitCapabilities(value){
  if(!value||Object.keys(value).some(key=>!fields.includes(key))||value.version!==1||!['gameplay','explore'].includes(value.mode)||fields.slice(2).some(key=>typeof value[key]!=='boolean'))throw Error('Invalid authoritative visit capabilities');
  if(value.mode==='explore'&&(value.tools||value.health))throw Error('Exploration cannot advertise gameplay tools or health');
  return Object.isFrozen(value)?value:Object.freeze(Object.fromEntries(fields.map(key=>[key,value[key]])));
}
export function restrictedCapabilities(factory,snapshot){
  visitCapabilities(factory);visitCapabilities(snapshot);
  if(snapshot.mode!==factory.mode||fields.slice(2).some(key=>snapshot[key]&&!factory[key]))throw Error('Snapshot capabilities exceed the factory ceiling');
  return snapshot;
}
export const GAMEPLAY_CAPABILITIES=visitCapabilities({version:1,mode:'gameplay',tools:true,health:true,interact:true,overview:false});
export const SHARED_MAP_CAPABILITIES=visitCapabilities({...GAMEPLAY_CAPABILITIES,overview:true});
export const EXPLORATION_CAPABILITIES=visitCapabilities({version:1,mode:'explore',tools:false,health:false,interact:true,overview:true});
