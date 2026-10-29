import {characterNameOf} from './model.js';
// Snapshot-only ground plan. Logical +x is right and +y is down, as in v1.
// Warm printed-plan palette; material identity and geometry remain authoritative.
const colors = {paving:'#d3ba87', grass:'#b39352', wood:'#996036', masonry:'#c7a97c', concrete:'#c7a97c', asphalt:'#795236', water:'#9a886b'};
const finitePoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.y);
export function mapView(snapshot) {
  const world = snapshot?.world, player = snapshot?.player;
  if (snapshot?.version !== 1 || !Number.isFinite(world?.width) || !Number.isFinite(world?.height) || world.width <= 0 || world.height <= 0 || !finitePoint(player)) return null;
  const cellSize = Number.isFinite(world.fireCellSize) && world.fireCellSize > 0 ? world.fireCellSize : 0;
  return {
    width:world.width, height:world.height,
    tiles:(world.tiles ?? []).filter(t => finitePoint(t) && t.size > 0).map(t => ({x:t.x-t.size/2,y:t.y-t.size/2,width:t.size,height:t.size,color:colors[t.material] ?? '#ab8c5c'})),
    obstacles:(world.obstacles ?? []).filter(o => finitePoint(o) && o.width > 0 && o.depth > 0 && !o.destroyed).map(o => ({x:o.x-o.width/2,y:o.y-o.depth/2,width:o.width,height:o.depth})),
    fire:(snapshot.cells ?? []).filter(c => cellSize > 0 && c.phase === 'burning' && finitePoint(c)).map(c => ({x:c.x-cellSize/2,y:c.y-cellSize/2,width:cellSize,height:cellSize})),
    player:{x:player.x,y:player.y,heading:Number.isFinite(player.heading) ? player.heading * 180 / Math.PI : 0},
    markerSize:Math.max(world.width,world.height) * 0.045
  };
}
const boxPath = boxes => boxes.map(b => 'M'+b.x+' '+b.y+'h'+b.width+'v'+b.height+'h'+(-b.width)+'Z').join('');
export function mountMap(element,{label='Ground plan',playerLabel='Bear'}={}) {
  const doc = element.ownerDocument, ns = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(ns,'svg'); svg.setAttribute('aria-hidden','true'); svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  const terrain = doc.createElementNS(ns,'g'), buildings = doc.createElementNS(ns,'path'), fire = doc.createElementNS(ns,'path'), player = doc.createElementNS(ns,'path');
  buildings.setAttribute('class','tb-map-buildings'); fire.setAttribute('class','tb-map-fire'); player.setAttribute('class','tb-map-player');
  player.setAttribute('d','M1 0 -0.8 -0.7 -0.45 0 -0.8 0.7Z');
  svg.append(terrain,buildings,fire,player); element.prepend(svg);
  let terrainSignature = '', buildingSignature = '', fireSignature = '';
  function update(snapshot) {
    const map = mapView(snapshot); element.dataset.ready = String(Boolean(map));
    svg.hidden = !map; // SVG hidden is supplemented by CSS for all browsers.
    if (!map) { svg.setAttribute('visibility','hidden'); element.setAttribute('aria-label',label+' loading.'); return; }
    svg.removeAttribute('visibility'); svg.setAttribute('viewBox','0 0 '+map.width+' '+map.height);
    const grouped = new Map();
    for (const tile of map.tiles) { if (!grouped.has(tile.color)) grouped.set(tile.color,[]); grouped.get(tile.color).push(tile); }
    const ground = JSON.stringify([...grouped]);
    if (ground !== terrainSignature) {
      terrainSignature = ground; terrain.replaceChildren();
      for (const [fill,boxes] of grouped) { const path=doc.createElementNS(ns,'path'); path.setAttribute('fill',fill); path.setAttribute('d',boxPath(boxes)); terrain.append(path); }
    }
    const outlines = boxPath(map.obstacles), flames = boxPath(map.fire);
    if (outlines !== buildingSignature) { buildings.setAttribute('d',outlines); buildingSignature=outlines; }
    if (flames !== fireSignature) { fire.setAttribute('d',flames); fireSignature=flames; }
    player.setAttribute('transform','translate('+map.player.x+' '+map.player.y+') rotate('+map.player.heading+') scale('+map.markerSize+')');
    element.dataset.playerX=String(map.player.x); element.dataset.playerY=String(map.player.y); element.dataset.heading=String(map.player.heading); element.dataset.fireCount=String(map.fire.length);
    element.setAttribute('aria-label',label+'. '+(characterNameOf(snapshot.player)||playerLabel)+' at x '+map.player.x.toFixed(1)+', y '+map.player.y.toFixed(1)+'. '+map.fire.length+' burning cells. Logical x right; y down.');
  }
  update(null);
  return {update};
}
