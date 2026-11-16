import {contactShape,moveWithContacts,CONTACT_PROFILES} from '../../vendor/nautilus-engine/999d97a1c2032f2448a8f71e6eec8c9c025cd577/packages/traversal-core/index.js';
import {cylinderContactPolygons} from '../runtime/collision.js';

export const NATIVE_DISC_SLIDE='nautilus-disc-v1';
export function reachableDiscEnvelope(from,radius,reach,maxStep,height){
  return {min:[from[0]-radius-reach,from[1]-maxStep-.001,from[2]-radius-reach],max:[from[0]+radius+reach,from[1]+maxStep+height,from[2]+radius+reach]};
}

// The upstream kernel sees already height-clipped individual native triangles,
// not mesh AABBs or a hull around a complete house/door/curved obstacle. The
// caller remains authoritative for changing support and every accepted sweep.
export function nativeDiscProposal({from,delta,radius,low,high,shapes,furniture=[],worldBounds}){
  const obstacles=[],aliases=new Map();let ordinal=0;
  const add=(points,id,reason='Native geometry clearance')=>{
    const key='contact-'+String(ordinal++).padStart(6,'0');
    aliases.set(key,{id,reason});obstacles.push(contactShape({id:key,points,radiusM:0,minH:low,maxH:high}));
  };
  for(const shape of shapes)for(const polygon of cylinderContactPolygons(shape,low,high))add(polygon,shape.id);
  // These envelopes are the host's existing furniture authority; retained
  // source meshes above always use their actual triangle fragments instead.
  for(const item of furniture){const {min:a,max:b}=item.bounds;if(b[1]<=low||a[1]>=high)continue;add([{x:a[0],y:a[2]},{x:b[0],y:a[2]},{x:b[0],y:b[2]},{x:a[0],y:b[2]}],item.id,'Furniture');}
  if(worldBounds){const {width,depth}=worldBounds,points=[{x:0,y:0},{x:width,y:0},{x:width,y:depth},{x:0,y:depth}];for(let i=0;i<4;i++)add([points[i],points[(i+1)%4]],'world-edge-'+i,'World bounds');}
  if(obstacles.length>8192)return {segments:[],contacts:[],limitation:{reason:'Native contact candidate limit',count:obstacles.length,maximum:8192}};
  const body=contactShape({id:'native-walking-disc',points:[{x:from[0],y:from[2]}],radiusM:radius,minH:low,maxH:high});
  const result=moveWithContacts(body,{x:delta[0],y:delta[2]},obstacles,{profile:CONTACT_PROFILES.slide,slideFactor:CONTACT_PROFILES.slideFactor});
  return {
    segments:result.segments.map(segment=>({from:[from[0]+segment.from.x,from[1],from[2]+segment.from.y],to:[from[0]+segment.to.x,from[1],from[2]+segment.to.y]})),
    contacts:result.contacts.map(contact=>({...aliases.get(contact.id),normal:[contact.normal.x,0,contact.normal.y],initialOverlap:contact.initialOverlap})),
    distance:result.distanceM
  };
}
