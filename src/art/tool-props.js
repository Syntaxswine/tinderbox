
import {Resources,removeTree} from './resources.js';
export function createToolProps(T,materials){
  const pool=new Resources(),root=new T.Group();root.name='Snapshot projectiles and pouring detail';
  const sphere=pool.geometry(new T.SphereGeometry(1,8,6)),cylinder=pool.geometry(new T.CylinderGeometry(1,1,1,8)),projectiles=new Map();
  const drops=Array.from({length:2},()=>{const m=new T.Mesh(sphere,materials.brass);m.scale.set(.014,.032,.014);root.add(m);return m;});
  const origin=new T.Vector3();
  function projectileModel(){
    const g=new T.Group(),body=new T.Mesh(cylinder,materials.glass),neck=new T.Mesh(cylinder,materials.shirt);
    body.scale.set(.045,.17,.045);neck.scale.set(.016,.07,.016);neck.position.y=.12;g.add(body,neck);root.add(g);return g;
  }
  return {root,update(snapshot,time,anchors){
    const player=snapshot.player,show=player.pouring&&player.moving&&player.hp>0&&(player.inventory?.gas||0)>0;
    if(show)anchors.spout.getWorldPosition(origin);
    drops.forEach((m,i)=>{m.visible=!!show;if(show){const f=(time*4+i*.5)%1;m.position.set(origin.x,origin.y*(1-f)+.03,origin.z);}});
    const ids=new Set();
    for(const item of (snapshot.projectiles||[]).slice(0,64)){
      ids.add(item.id);let g=projectiles.get(item.id);if(!g){g=projectileModel();projectiles.set(item.id,g);}
      g.position.set(item.x,Number.isFinite(item.h)?item.h:.25,item.y);g.rotation.z=(Number.isFinite(item.progress)?item.progress:0)*Math.PI*3;
    }
    for(const [id,g]of projectiles)if(!ids.has(id)){g.removeFromParent();g.clear();projectiles.delete(id);}
  },diagnostics:()=>({projectiles:projectiles.size,...pool.counts()}),dispose(){projectiles.clear();removeTree(root);pool.dispose();}};
}
