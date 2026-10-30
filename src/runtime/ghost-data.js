const MAX_SEGMENTS=12000;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function ghostDescriptor(manifest){
  const descriptor=manifest.exteriorGhost;
  if(!descriptor||descriptor.url!=='../../exterior-ghost/'+manifest.placeId+'.json'||!/^[a-f0-9]{64}$/.test(descriptor.sha256||''))throw Error('Invalid exterior ghost descriptor');
  return descriptor;
}
async function hash(value){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function validateExteriorGhost(manifest,data){
  const descriptor=ghostDescriptor(manifest),positions=data?.positions;
  if(data?.version!==1||data.placeId!==manifest.placeId||!Array.isArray(positions)||!positions.length||positions.length%6||positions.length/6>MAX_SEGMENTS||!positions.every(Number.isFinite)||data.segments!==positions.length/6||!same(data.sourcePins,manifest.sourcePins)||!same(data.sourceAccess,manifest.sourceAccess))throw Error('Mismatched or invalid exterior ghost data');
  let end=0;
  if(!Array.isArray(data.groups)||!data.groups.length)throw Error('Invalid exterior ghost groups');
  for(const group of data.groups){
    if(!['native-wall-run','native-deck-perimeter','native-roof-mesh'].includes(group.kind)||typeof group.id!=='string'||!group.id||group.start!==end||!Number.isInteger(group.count)||group.count<=0)throw Error('Invalid exterior ghost groups');
    end+=group.count;
  }
  if(end!==data.segments)throw Error('Invalid exterior ghost group coverage');
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(let i=0;i<positions.length;i++){const axis=i%3;bounds.min[axis]=Math.min(bounds.min[axis],positions[i]);bounds.max[axis]=Math.max(bounds.max[axis],positions[i]);}
  if(!same(bounds,data.bounds))throw Error('Invalid exterior ghost bounds');
  const {exteriorGhost,...sourceManifest}=manifest;
  const [dataHash,sourceHash]=await Promise.all([hash(data),hash(sourceManifest)]);
  if(dataHash!==descriptor.sha256||sourceHash!==data.sourceManifestSha256)throw Error('Exterior ghost source/hash mismatch; recompile the frozen outline');
  return data;
}
