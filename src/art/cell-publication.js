const BURNING = 1;
const SPENT = 2;
const DEPOSITED = 4;

const immutableLists = new WeakMap();

export function isImmutableRecordArray(array) {
  if (!Array.isArray(array) || !Object.isFrozen(array)) return false;
  if (!immutableLists.has(array)) immutableLists.set(array, array.every(record => Object.isFrozen(record)));
  return immutableLists.get(array);
}

// Each scene shares this reader. Its published order also preserves draw caps
// and equal-distance ties in the original cell loops.
export function createCellReader() {
  let current = null;
  let labels = new Uint8Array(0);
  return function readCells(cells) {
    if (!Array.isArray(cells) || !Object.isFrozen(cells)) {
      current = null;
      return null;
    }
    if (current?.cells === cells) return current;

    const previous = current?.cells;
    const changes = [];
    const fire = [], burning = [], deposited = [];
    let sameOrder = previous?.length === cells.length;
    const reuseLabels = labels.length === cells.length;
    if (!reuseLabels) labels = new Uint8Array(cells.length);
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      const old = previous?.[i];
      if (!reuseLabels || !previous || old !== cell) {
        if (!Object.isFrozen(cell)) {
          current = null;
          return null;
        }
        const phase = cell.phase;
        const fireLabel = phase === 'burning' ? BURNING : phase === 'spent' ? SPENT : 0;
        labels[i] = fireLabel | (cell.depositedFuel > 0 ? DEPOSITED : 0);
        if (previous) changes.push(i);
        if (sameOrder && old.id !== cell.id) sameOrder = false;
      }
      const label = labels[i];
      if (label & (BURNING | SPENT)) fire.push(cell);
      if (label & BURNING) burning.push(cell);
      if (label & DEPOSITED) deposited.push(cell);
    }
    current = {cells, previous, changes, sameOrder, fire, burning, deposited};
    return current;
  };
}

export function createTrailReader(readCells = createCellReader()) {
  let previous, x, y, trail;
  return function nearbyTrail(cells, player) {
    const view = readCells(cells);
    if (view && previous === cells && x === player.x && y === player.y) return trail;
    x = player.x;
    y = player.y;
    const distance = cell => Math.hypot(cell.x - x, cell.y - y);
    trail = (view?.deposited ?? cells).filter(cell => cell.depositedFuel > 0 && distance(cell) < 2.5)
      .sort((a, b) => distance(a) - distance(b));
    previous = view ? cells : null;
    return trail;
  };
}
