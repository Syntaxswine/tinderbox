// Presentation names stay in the adapter; immutable source IDs/data are kept.
const NAMES=Object.freeze({
  'ny-front':'front doors','ny-east':'east doors','ny-west':'west doors',
  'ny-east-upper':'upper east doors','ny-west-upper':'upper west doors',
  'admin-front':'front doors','admin-east':'east doors','admin-rear':'rear doors','admin-west':'west doors',
  'hort-main':'main doors','hort-court--1-front':'west court front doors','hort-court--1-rear':'west court rear doors',
  'hort-court-1-front':'east court front doors','hort-court-1-rear':'east court rear doors'
});
export function doorName(portal){
  if(Object.hasOwn(NAMES,portal.id))return NAMES[portal.id];
  const label=typeof portal.label==='string'?portal.label.trim():'';
  return label&&!(label===portal.id&&/[-_]/.test(label))?label:'door';
}
