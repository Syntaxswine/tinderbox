export const DEFAULT_EFFECTS=Object.freeze({flames:true,smoke:true,lighting:true});
const keys=Object.keys(DEFAULT_EFFECTS),storageKey='tinderbox.furnished-house.effects.v1';

function boolean(value,key,fallback){
  try{if(value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,key)){const entry=value[key];if(typeof entry==='boolean')return entry;}}catch{/* Ignore a malformed value/getter just like another invalid patch key. */}
  return fallback;
}

export function normalizeEffects(value){
  return Object.fromEntries(keys.map(key=>[key,boolean(value,key,DEFAULT_EFFECTS[key])]));
}

export function createEffectPreferences({storage}={}){
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  let value={...DEFAULT_EFFECTS},disposed=false;
  const listeners=new Set(),snapshot=()=>({...value});
  try{value=normalizeEffects(JSON.parse(storage?.getItem(storageKey)));}catch{/* Private/blocked/corrupt storage keeps the defaults. */}
  return {
    snapshot,
    set(patch){
      if(disposed)return snapshot();
      const next=Object.fromEntries(keys.map(key=>[key,boolean(patch,key,value[key])]));
      if(keys.every(key=>next[key]===value[key]))return snapshot();
      value=next;
      try{storage?.setItem(storageKey,JSON.stringify(value));}catch{/* In-memory settings remain usable when persistence fails. */}
      for(const listener of [...listeners])if(listeners.has(listener))listener(snapshot());
      return snapshot();
    },
    subscribe(listener){
      if(typeof listener!=='function')throw new TypeError('An effect preference listener is required.');
      if(disposed)return ()=>{};
      listeners.add(listener);listener(snapshot());
      return ()=>listeners.delete(listener);
    },
    dispose(){disposed=true;listeners.clear();}
  };
}
