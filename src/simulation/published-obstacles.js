function isPlainData(value, parents = new Set()) {
  if (!value || typeof value !== 'object') return true;
  if ((!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) || parents.has(value)) return false;
  parents.add(value);
  const plain = Object.values(value).every(child => isPlainData(child, parents));
  parents.delete(value);
  return plain;
}

function freezeData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeData(child);
  }
  return value;
}

function sameData(a,b) {
  if (Object.is(a,b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' ||
    Array.isArray(a) !== Array.isArray(b) || Array.isArray(a) && a.length !== b.length) return false;
  const keys = Object.keys(a), otherKeys = Object.keys(b);
  return keys.length === otherKeys.length && keys.every((key,i) => key === otherKeys[i] && sameData(a[key],b[key]));
}

export function createObstaclePublisher() {
  let published = Object.freeze([]);
  const views = new WeakMap();
  return obstacles => {
    let next, index = 0;
    for (const box of obstacles) {
      if (box.destroyed) continue;
      let view = views.get(box);
      // Door poses and house fragments are replaced. The cottage column
      // height is the sole in-place edit of visible obstacle data.
      if (!view || !Object.is(view.height,box.height)) {
        const {destroyed,...data} = box;
        const copy = structuredClone(data);
        const plain = isPlainData(copy);
        const previous = published[index];
        const record = plain ? (previous && Object.isFrozen(previous) && sameData(copy,previous) ? previous : freezeData(copy)) : copy;
        view = {height:box.height,record};
        // Custom fixtures can carry native mutable values such as typed
        // arrays. Preserve the old detached-clone behavior for those.
        if (plain) views.set(box,view);
      }
      if (!next && view.record !== published[index]) next = published.slice(0,index);
      if (next) next.push(view.record);
      index++;
    }
    if (next) published = Object.freeze(next);
    else if (index !== published.length) published = Object.freeze(published.slice(0,index));
    return published;
  };
}
