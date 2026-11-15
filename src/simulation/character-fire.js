import {clamp} from './geometry.js';

const inactive=()=>({version:1,active:false,mode:'none',intensity:0,age:0});

// Presentation epochs only: this store never ignites, extends a burn or hurts
// an entity. Existing timed NPC burns and proven current contact own activation.
export function createCharacterFirePresentation(){
  let states=new WeakMap();
  return {
    update(entity,directFlame,worldTime){
      const contact=clamp(directFlame,0,1),timed=!!entity.burn;
      if(entity.hp<=0||!timed&&contact<=0){states.delete(entity);return;}
      const previous=states.get(entity),since=previous&&previous.since<=worldTime?previous.since:worldTime;
      states.set(entity,{since,mode:timed?contact>0?'both':'timed':'contact',intensity:Math.max(contact,timed?1:0)});
    },
    snapshot(entity,worldTime){
      const value=entity.hp>0?states.get(entity):null;
      return value?{version:1,active:true,mode:value.mode,intensity:value.intensity,age:Math.max(0,worldTime-value.since)}:inactive();
    },
    reset(){states=new WeakMap();}
  };
}
