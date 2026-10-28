import * as T from '../runtime/three.js';
import {Resources} from '../art/resources.js';
import {createWeaponModel} from '../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/weapon-models.js';
// Existing Tinderbox prop forms fitted to the native palm; the flamethrower is
// the original AFT geometry, tank, hose and hand/muzzle anchors.
export function createBearTools(borrowedMaterials) {
  const pool=new Resources(),materials=borrowedMaterials||Object.fromEntries(Object.entries({wood:0x79502f,darkFur:0x32251e,brass:0xb79954,drum:0xaf3b28,creamWood:0xd9cda1,oliveWood:0x666c3e,steel:0x6b7775,glass:0x354c37,shirt:0xdacda9,leather:0x3b3027,dark:0x292c29}).map(([id,color])=>[id,pool.material(new T.MeshStandardMaterial({color,roughness:.9}))]));
  const tools={},up=new T.Vector3(0,1,0),V=a=>new T.Vector3(...a);
  const box=(root,size,p,mat)=>{const mesh=new T.Mesh(pool.geometry(new T.BoxGeometry(...size)),materials[mat]);mesh.position.fromArray(p);root.add(mesh);return mesh;};
  const rod=(root,a,b,r,mat)=>{const axis=V(b).sub(V(a)),mesh=new T.Mesh(pool.geometry(new T.CylinderGeometry(r,r,axis.length(),10)),materials[mat]);mesh.position.copy(V(a).add(V(b)).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(up,axis.normalize());root.add(mesh);return mesh;};
  function custom(id,build){const root=new T.Group(),anchors={};root.name='Tinderbox '+id;const anchor=(name,p)=>{const node=new T.Object3D();node.name=id+':'+name;node.position.fromArray(p);root.add(node);anchors[name]=node;};anchor('grip',[0,0,0]);build(root,anchor);tools[id]={id,root,anchors,carry:{position:[.22,1,.30],axis:[1,0,0],hands:[1]},dispose(){root.clear();}};}
  custom('matches',(r,a)=>{rod(r,[0,0,0],[.20,.03,0],.011,'wood');box(r,[.035,.038,.033],[.20,.03,0],'drum');box(r,[.13,.075,.09],[-.02,-.05,.015],'creamWood');a('muzzle',[.20,.03,0]);});
  custom('jerry-can',(r,a)=>{box(r,[.30,.39,.20],[0,-.24,0],'oliveWood');rod(r,[-.09,0,0],[.09,0,0],.022,'leather');for(const y of [-.34,-.13])box(r,[.20,.019,.009],[0,y,.105],'steel');const brace=box(r,[.015,.25,.009],[0,-.24,.107],'steel');brace.rotation.z=.65;rod(r,[.13,-.11,0],[.23,-.16,0],.025,'brass');a('spout',[.23,-.16,0]);a('muzzle',[.23,-.16,0]);});
  custom('molotov',(r,a)=>{const bottle=new T.Mesh(pool.geometry(new T.CylinderGeometry(.065,.065,.23,12)),materials.glass);bottle.position.y=-.11;r.add(bottle);const neck=new T.Mesh(pool.geometry(new T.CylinderGeometry(.025,.025,.12,10)),materials.glass);neck.position.y=.065;r.add(neck);box(r,[.033,.07,.035],[0,.155,0],'shirt');box(r,[.017,.11,.09],[.062,-.10,0],'creamWood');a('muzzle',[0,.19,0]);});
  custom('torch',(r,a)=>{rod(r,[0,0,0],[.65,.05,0],.026,'wood');rod(r,[.57,.044,0],[.68,.054,0],.063,'shirt');a('muzzle',[.68,.054,0]);});
  const flame=createWeaponModel('flamethrower');flame.carry={...flame.carry,position:[.04,1.05,0],axis:[1,0,0],hands:[1,-1]};tools.flamethrower=flame;
  let closed=false;return {tools,counts:()=>pool.counts(),dispose(){if(closed)return;closed=true;for(const a of Object.values(tools)){a.root.removeFromParent();a.mount?.removeFromParent();a.hose?.removeFromParent();a.dispose();}pool.dispose();}};
}
