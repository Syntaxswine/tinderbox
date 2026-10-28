import {WINDOW_KIT,WINDOW_BAYS,compileWindowBay} from '../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/window-kit/index.js';
import {createWindowBayModel} from '../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/window-kit/three.js';
export {WINDOW_KIT,WINDOW_BAYS,compileWindowBay};
export const NAUTILUS_WINDOW_COMMIT='90054d07134116a5d9661f8318a76fe68f922aad';
const edgeKey=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
// Replace two adjacent exterior unit edges with one explicitly centred art bay.
// The original room polygons, door edges and other window edges are unchanged.
export function mergeCenteredWindowEdges(edges,bays=[]){
 let result=edges;
 for(const bay of bays){
  const {a,b,profile}=bay,dx=b[0]-a[0],dz=b[1]-a[1];
  if(Math.abs(Math.hypot(dx,dz)-WINDOW_KIT.span)>1e-8||dx&&dz)throw Error('Window bay needs two metres of straight exterior wall');
  if(!WINDOW_BAYS.some(p=>p.id===profile))throw Error('Unknown centred window profile');
  const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],ids=[edgeKey(a,mid),edgeKey(mid,b)],parts=ids.map(id=>result.find(e=>e.id===id));
  if(parts.some(e=>!e||e.rooms.length!==1||e.opening&&e.opening!=='window')||parts[0].rooms[0]!==parts[1].rooms[0])throw Error('Window bay overlaps a door, interior wall or room boundary');
  // Keep the room boundary's direction so siding stays outside and wallpaper inside.
  const sameDirection=(parts[0].b[0]-parts[0].a[0])*dx+(parts[0].b[1]-parts[0].a[1])*dz>0;
  const merged={id:edgeKey(a,b),a:[...(sameDirection?a:b)],b:[...(sameDirection?b:a)],rooms:[...parts[0].rooms],opening:'window',windowProfile:profile,windowBayId:bay.id,sourceEdges:ids};
  const first=Math.min(...parts.map(e=>result.indexOf(e)));result=result.flatMap((e,i)=>i===first?[merged]:ids.includes(e.id)?[]:[e]);
 }
 return result;
}
export function addCenteredWindow(T,parent,pool,profile,materials){
 if(WINDOW_KIT.span!==2||WINDOW_KIT.segmentWidth!==.5)throw Error('Unexpected Nautilus window dimensions');
 for(const kind of ['wall','inside','trim','sash','brass','glass'])if(!materials[kind])throw Error('Host window palette is incomplete: '+kind);
 const model=createWindowBayModel(T,profile,{materials:{wall:materials.wall,trim:materials.trim,sash:materials.sash,brass:materials.brass,glass:materials.glass}});
 // Nautilus front is +Z; the existing house-wall exterior is local -Z.
 model.root.rotation.y=Math.PI;model.root.name='Nautilus centered window bay';model.root.userData.sourceCommit=NAUTILUS_WINDOW_COMMIT;
 for(const mesh of model.parts.values()){
  const g=mesh.geometry;g.setAttribute('grossUV',g.attributes.uv.clone());
  mesh.name='Nautilus window / '+mesh.name;
  if(mesh.userData.group==='walls'){
   // Preserve source vertices, normals and UVs. Only draw groups and host skin
   // assignments are added, so the house interior keeps its existing wallpaper.
   mesh.material=[materials.wall,materials.inside,materials.trim];g.clearGroups();const n=g.attributes.normal;
   for(let i=0;i<n.count;i+=3)g.addGroup(i,3,Math.abs(n.getZ(i))>.7?(n.getZ(i)>0?0:1):2);
  }
 }
 parent.add(model.root);pool.object(model);return model;
}
