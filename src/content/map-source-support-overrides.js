const BASE='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba',OVERLAY='f1252c7364adfeb025f573fc4650020e71915a3e17e71bcf2e725e56c3f1c941';
export const FIRST_SUPPORT_CONTROLS=Object.freeze([
  ['carrier/ny-front/jamb--1','carrier/main-floor/tile--2-0','fixed-embed'],
  ['carrier/ny-front/jamb-1','carrier/main-floor/tile-1-0','fixed-embed'],
  ['carrier/ny-front/header','carrier/ny-front/jamb--1','fixed-embed'],
  ['carrier/ny-front/header','carrier/ny-front/jamb-1','fixed-embed'],
  ['carrier/main/0/frieze-1/jamb--1','carrier/main/0/cell-7-7/1','fixed-embed'],
  ['carrier/edge-0/cornice-1','carrier/main/0/cell-3-0/1','fixed-embed'],
  ['carrier/clerestory/front-rail/base','carrier/clerestory/cornice','fixed-embed'],
  ['carrier/ny-main-flight-2/handrail--1','carrier/ny-main-flight-2/post--1-10','fixed-embed'],
  ['carrier/visit-cap/ny-side-approach--1/7','carrier/porch-west-1','structural-seam'],
  ['carrier/upper-terrace/rail-front/cap-2','carrier/upper-terrace/rail-front/pier-2','carpentry-butt-joint']
].map(row=>Object.freeze(row)));
const copyBox=b=>({min:[...b.min],max:[...b.max]});
function region(r){if(r?.frame!=='emitted-world'||!r.bounds||!['min','max'].every(k=>r.bounds[k]?.length===3&&r.bounds[k].every(Number.isFinite))||r.bounds.min.some((v,i)=>v>r.bounds.max[i])||r.witnessPoint&&(!Array.isArray(r.witnessPoint)||r.witnessPoint.length!==3||!r.witnessPoint.every(Number.isFinite)))throw Error('Invalid local support control region');return {bounds:copyBox(r.bounds),point:r.witnessPoint&&[...r.witnessPoint]};}

// Offline additive graph projection only. Original bindings, geometry, material
// quantities and observed moving-leaf contact evidence remain immutable inputs.
export function applyFirstSupportControls(index,descriptor){
  if(index.placeId!=='new-york'||descriptor?.version!==1||descriptor.placeId!==index.placeId||descriptor.baseBindings?.sha256!==BASE||descriptor.effectiveGeometryOverlay?.sha256!==OVERLAY||descriptor.coordinateFrame?.frame!=='emitted-world'||descriptor.coordinateFrame?.sourceOffsetAlreadyApplied!==true||JSON.stringify(descriptor.coordinateFrame.sourceOffset)!=='[56,0,26]'||descriptor.coordinateFrame.levelPitch!==2.12||descriptor.coordinateFrame.units!=='metres'||descriptor.coordinateFrame.upAxis!=='+Y')throw Error('Mismatched first-control source pins/frame');
  if(['fuelChanges','geometryAdditions','groundAnchorAdditions','profileChanges'].some(k=>descriptor[k]!==0))throw Error('Support controls cannot change geometry, fuel, anchors or profiles');
  const numbers=new Map(index.carriers.map((c,i)=>[c.id,i])),expected=new Map(FIRST_SUPPORT_CONTROLS.map(row=>[row[0]+' -> '+row[1],row[2]])),seen=new Set(),joins=[];
  if(descriptor.joins?.length!==10||descriptor.retiredSupportInterpretations?.length!==2)throw Error('Exactly ten accepted support controls and two retired interpretations required');
  for(const j of descriptor.joins){const key=j.childCarrierId+' -> '+j.parentCarrierId,kind=expected.get(key),child=numbers.get(j.childCarrierId),parent=numbers.get(j.parentCarrierId);
    if(!kind||kind!==j.kind||seen.has(key)||child===undefined||parent===undefined||child===parent||j.groundAnchor!==false||j.wholeCarrierRetirement!==false||j.direction!==(kind==='structural-seam'?'symmetric-structural':'parent-to-child'))throw Error('Unaccepted support control or direction '+key);
    seen.add(key);joins.push({child,parent,kind,direction:j.direction,childRegion:region(j.childRegion),parentRegion:region(j.parentRegion)});
  }
  const retired=[],retiredSeen=new Set();for(const r of descriptor.retiredSupportInterpretations){const child=numbers.get(r.childCarrierId),parent=numbers.get(r.parentCarrierId);
    if(r.childCarrierId!=='carrier/ny-front/header'||!['carrier/ny-front/leaf--1','carrier/ny-front/leaf-1'].includes(r.parentCarrierId)||retiredSeen.has(parent)||r.originalEvidenceKind!=='coplanar-horizontal-triangle-contact'||r.geometryEvidenceRetained!==true||!index.carriers[child]?.supportEvidence.some(e=>e.parent===parent&&e.kind===r.originalEvidenceKind))throw Error('Only the two original moving-leaf/header interpretations may retire');
    retiredSeen.add(parent);retired.push({child,parent,kind:r.originalEvidenceKind,geometryEvidenceRetained:true});
  }
  // Validate the entire descriptor before mutating its compact graph projection.
  for(const r of retired){const c=index.carriers[r.child];c.supports=c.supports.filter(p=>p!==r.parent);c.supportEvidence=c.supportEvidence.filter(e=>e.parent!==r.parent||e.kind!==r.kind);}
  for(const j of joins){const c=index.carriers[j.child];if(!c.supports.includes(j.parent))c.supports.push(j.parent);c.supportEvidence.push({parent:j.parent,kind:j.kind});c.attachments=c.attachments.filter(a=>a.parent!==j.parent);c.attachments.push({parent:j.parent,kind:j.kind,direction:j.direction,childRegion:j.childRegion,parentRegion:j.parentRegion});}
  index.supportOverrides={version:1,scope:'Exactly ten accepted first controls; no global role/direction/grounding policy change.',joins:joins.map(j=>({child:j.child,parent:j.parent,kind:j.kind,direction:j.direction})),retired};return index;
}
