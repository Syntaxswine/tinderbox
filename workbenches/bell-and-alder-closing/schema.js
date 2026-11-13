import {bounds} from '../furnished-house/geometry.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {CIVILIAN_PROFILES} from '../../src/content/exterior-kit.js';
const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const unique=(rows,label)=>{const ids=new Set();for(const row of rows){if(!row.id||ids.has(row.id))throw Error('Duplicate/missing '+label+' ID '+row.id);ids.add(row.id);}return ids;};
export function validateClosingData(data){
  if(data?.version!==1||!Array.isArray(data.surfaces)||data.closingTime?.version!==1)throw Error('Expected physical and closingTime version1');
  const c=data.closingTime,anchors=c.anchors||{},openings=unique(data.openings||[],'opening'),ids=new Set(),doorIds=unique(c.doors||[],'door');unique(c.smokeVents||[],'vent');unique(c.pickups||[],'pickup');const supports=new Set([...data.surfaces,...(data.items||[]),...(data.furnitureParts||[])].map(s=>s.id));
  if(!point(c.origin?.translation)||!point(c.bounds?.min)||!point(c.bounds?.max)||c.bounds.min.some((n,i)=>n>=c.bounds.max[i]))throw Error('Finite ordered scene bounds and origin are required');
  for(const opening of data.openings||[])if(!data.surfaces.some(s=>s.id===opening.surfaceId))throw Error('Missing physical opening surface '+opening.id);
  for(const [id,a]of Object.entries(anchors))if(!point(a.position))throw Error('Invalid anchor '+id);
  for(const a of c.actors||[]){if(!a.id||ids.has(a.id)||!anchors[a.anchor])throw Error('Duplicate actor/missing initial anchor '+a.id);ids.add(a.id);if(a.role==='player'&&!CHARACTER_PROFILES[a.characterId||'goat']||a.role==='resident'&&!CIVILIAN_PROFILES[a.characterId||'goat'])throw Error('Unsupported native actor '+a.id);if(a.viewAnchor&&!anchors[a.viewAnchor])throw Error('Missing resident view anchor '+a.viewAnchor);for(const step of a.routine||[]){if(!anchors[step.anchor])throw Error('Missing routine anchor '+step.anchor);if(step.door&&(!doorIds.has(step.door.id)||typeof step.door.open!=='boolean'))throw Error('Invalid routine door '+step.door.id);if(step.hold!==undefined&&(!Number.isFinite(step.hold)||step.hold<0))throw Error('Invalid routine hold '+a.id);}for(const id of a.exitRoute||[])if(!anchors[id])throw Error('Missing exit anchor '+id);}
  for(const role of ['player','resident','officer'])if((c.actors||[]).filter(a=>a.role===role).length!==1)throw Error('Exactly one '+role+' is required');
  for(const d of c.doors||[])if(!anchors[d.anchor]||!d.openingIds?.length||d.openingIds.some(id=>!openings.has(id)))throw Error('Invalid door group '+d.id);
  if(!c.lantern?.id||!anchors[c.lantern.anchor])throw Error('Missing placed lantern anchor');if(!supports.has(c.lantern.supportSourceId))throw Error('Missing lantern support '+c.lantern.supportSourceId);
  for(const v of c.smokeVents||[])if(!point(v.position)||!point(v.outward)||Math.hypot(...v.outward)<1e-8||!v.openingIds?.length||v.openingIds.some(id=>!openings.has(id)))throw Error('Invalid smoke vent '+v.id);
  for(const p of c.pickups||[])if(!point(p.position)||!['powder','inversion','healing'].includes(p.kind))throw Error('Invalid automatic pickup '+p.id);
  for(const [mode,replay]of Object.entries(c.replays||{})){if(!['hero','direct','quiet'].includes(mode))throw Error('Unknown replay '+mode);for(const key of ['approach','toLantern','toSighting','toStrike','escape','toCover'])if(replay[key]&&(!Array.isArray(replay[key])||replay[key].some(id=>!anchors[id])))throw Error('Missing replay route anchor '+mode+'.'+key);if(replay.strike&&!anchors[replay.strike])throw Error('Missing replay strike '+mode);}
  return data;
}
export function validateClosingGeometry(trial){
  const {scene}=trial,records=[];
  for(const v of scene.data.closingTime.smokeVents||[]){const openings=[...scene.index.surfaces.values()].filter(b=>v.openingIds.includes(b.openingId));if(!openings.length)throw Error('Vent has no measured opening '+v.id);const boxes=openings.map(b=>bounds((b.closedTriangles||b.triangles).flat()));const near=boxes.some(b=>v.position.every((p,i)=>p>=b.min[i]-.12&&p<=b.max[i]+.12));if(!near)throw Error('Vent is outside measured opening '+v.id);const length=Math.hypot(...v.outward),outside=v.position.map((p,i)=>p+v.outward[i]/length*.2),high=[outside[0],outside[1]+1.6,outside[2]],hits=scene.index.crossings(outside,high).filter(h=>h.surface.intact&&scene.index.pass(h.surface)<.99);if(hits.length)throw Error('Vent rise path intersects solid geometry '+v.id+':'+hits[0].surface.id);records.push({id:v.id,measuredOpeningPatches:openings.length,outside,high,clear:true});}
  return records;
}
