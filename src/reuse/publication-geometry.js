// Proof of ownership belongs to the copy-producing factory, never to a flag
// supplied by a caller. Weak membership cannot retain old geometry snapshots.
const ownedGeometry=new WeakSet();

export function createOwnedPublicationGeometry(value){
  const copy=structuredClone(value),seen=new WeakSet();let stable=Array.isArray(copy);
  function freeze(node){
    if(node&&typeof node==='object'){
      if(seen.has(node))return;seen.add(node);
      if(!Array.isArray(node)||Object.getPrototypeOf(node)!==Array.prototype)stable=false;
      else for(let i=0;i<node.length;i++)if(!Object.hasOwn(node,i))stable=false;
      for(const child of Object.values(node))freeze(child);Object.freeze(node);
    }else if(typeof node!=='number')stable=false;
  }
  // Sparse arrays can still read mutable prototype slots; Map/Date internals
  // also remain mutable after Object.freeze. Such copies retain the generic
  // consumer path instead of receiving this narrower immutable-array proof.
  freeze(copy);if(stable)ownedGeometry.add(copy);return copy;
}

export const isOwnedPublicationGeometry=value=>ownedGeometry.has(value);
