const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
export function validateClosingData(data){
  if(data?.version!==1||!Array.isArray(data.surfaces)||data.closingTime?.version!==1)throw Error('Expected physical and closingTime version1');
  const c=data.closingTime,anchors=c.anchors||{},openings=new Set((data.openings||[]).map(o=>o.id)),ids=new Set();
  for(const [id,a]of Object.entries(anchors))if(!point(a.position))throw Error('Invalid anchor '+id);
  for(const a of c.actors||[]){if(ids.has(a.id)||!anchors[a.anchor])throw Error('Duplicate actor/missing initial anchor '+a.id);ids.add(a.id);for(const step of a.routine||[])if(!anchors[step.anchor])throw Error('Missing routine anchor '+step.anchor);for(const id of a.exitRoute||[])if(!anchors[id])throw Error('Missing exit anchor '+id);}
  for(const role of ['player','resident','officer'])if((c.actors||[]).filter(a=>a.role===role).length!==1)throw Error('Exactly one '+role+' is required');
  for(const d of c.doors||[])if(!anchors[d.anchor]||!d.openingIds?.length||d.openingIds.some(id=>!openings.has(id)))throw Error('Invalid door group '+d.id);
  if(!c.lantern?.id||!anchors[c.lantern.anchor])throw Error('Missing placed lantern anchor');
  for(const v of c.smokeVents||[])if(!point(v.position)||!point(v.outward)||!v.openingIds?.length||v.openingIds.some(id=>!openings.has(id)))throw Error('Invalid smoke vent '+v.id);
  return data;
}
