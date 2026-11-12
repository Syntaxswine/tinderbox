export const ENGINE_COMMIT='6a9d93c0a5fceefe5799448da4e69c83b65e3ce9';
export const ART_COMMIT='e98e46f11f818857a2f08054e9d1071e023cc2d3';
export const ENGINE_ROOT=new URL('../../artifacts/helpers/stockyard-map/engine-source/dist/',import.meta.url);
export const MAP_URL=new URL('../../maps/stockyard/stockyard-1893.map.json',import.meta.url);
export const FIELD='tinderboxStockyard';
export function validateLayout(value){
 if(value?.format!=='tinderbox-stockyard-layout'||value.version!==1||!Array.isArray(value.instances))throw Error('Expected Tinderbox stockyard layout version 1.');
 if(value.instances.length>100)throw Error('Keep this blockout under 100 stockyard assemblies.');
 const ids=new Set();for(const p of value.instances){
  if(!/^[a-z0-9-]{1,70}$/.test(p.id)||ids.has(p.id))throw Error('Stockyard instance IDs must be unique.');ids.add(p.id);
  if(!['covered-swine-pen','union-stockyard-gate'].includes(p.asset))throw Error('Unsupported stockyard asset.');
  if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x>239||p.y>239)throw Error('Choose integer metre coordinates inside the map.');
  if(!Number.isInteger(p.quarterTurns)||p.quarterTurns<0||p.quarterTurns>3)throw Error('Choose one of four native rotations.');
  if(!Number.isInteger(p.bays)||p.bays<1||p.bays>16||!['working','jubilee'].includes(p.skin))throw Error('Invalid bay count or skin.');
  if(p.asset==='covered-swine-pen'){
   const w=4*p.bays,h=4,corners=[[0,0],[w,0],[0,h],[w,h]],a=p.quarterTurns*Math.PI/2;
   if(corners.some(([x,y])=>{const X=p.x+Math.cos(a)*x+Math.sin(a)*y,Y=p.y-Math.sin(a)*x+Math.cos(a)*y;return X<0||Y<0||X>239||Y>239;}))throw Error('The complete pen row must fit the map.');
  }
 }
 return value;
}
