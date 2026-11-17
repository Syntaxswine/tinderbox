import {gravityStep} from '../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear} from '../runtime/collision.js';

// Adapter over the native gravity step and native body/triangle query. It owns
// neither an actor nor a clock and introduces no fall-damage rule.
export function advanceActorSupport(actor,delta,{index,support,event=()=>{}}){
  actor.elevation??=0;
  const standing=support(actor);
  if(standing&&!actor.falling&&Math.abs((standing.elevation??standing.height??standing.y)-actor.elevation)<1e-5){actor.verticalVelocity=0;for(const key of ['level','locationLabel','surfaceId','interior'])if(standing[key]!==undefined)actor[key]=standing[key];return false;}
  const before=actor.elevation,velocity=[0,actor.verticalVelocity||0,0],proposed=gravityStep([actor.x,before,actor.y],velocity,delta)[1];
  const radius=actor.radius??.2,height=actor.height??1.66,box={min:[actor.x-radius,proposed,actor.y-radius],max:[actor.x+radius,before+height,actor.y+radius]};
  const shapes=index.candidates(box).filter(b=>b.intact&&index.pass(b)<.99);
  let contact;
  const clear=y=>{for(const b of shapes)if(!sweptCylinderClear(actor,actor,radius,y+1e-6,before+height-1e-6,{triangles:b.solidTriangles||b.triangles,closed:b.closedShape!==false})){contact=b;return false;}return true;};
  if(clear(proposed)){
    if(!actor.falling)event('actor-fall',actor,{actorId:actor.id,fromElevation:before});
    actor.elevation=proposed;actor.verticalVelocity=velocity[1];actor.falling=true;return true;
  }
  // The swept height band remains continuous even if a long step would pass
  // completely through a thin slab. Find its first body contact, never a lower
  // endpoint reached by tunnelling through intact native geometry.
  let low=proposed,high=before;for(let i=0;i<28;i++){const mid=(low+high)/2;if(clear(mid))high=mid;else low=mid;}
  actor.elevation=high;actor.verticalVelocity=0;
  const wasFalling=actor.falling;actor.falling=false;
  const landing=support(actor);if(landing){actor.elevation=landing.elevation??landing.height??landing.y;for(const key of ['level','locationLabel','surfaceId','interior'])if(landing[key]!==undefined)actor[key]=landing[key];}
  else if(contact)actor.surfaceId=contact.id;
  if(wasFalling)event('actor-landed',actor,{actorId:actor.id,elevation:actor.elevation,surfaceId:actor.surfaceId});return actor.elevation!==before;
}
