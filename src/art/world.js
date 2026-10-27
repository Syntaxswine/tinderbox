
import {Resources,seedOf,removeTree} from './resources.js';
export function createWorld(T,materials){
  const root=new T.Group();root.name='Snapshot exterior';
  let pool=new Resources(),signature='',builds=0;
  const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  function build(world){
    pool.dispose();pool=new Resources();root.clear();builds++;
    const cube=pool.geometry(new T.BoxGeometry(1,1,1)),ball=pool.geometry(new T.SphereGeometry(1,10,7));
    const cylinder=pool.geometry(new T.CylinderGeometry(1,1,1,18));
    function mesh(geo,mat,p,s,parent=root){const m=new T.Mesh(geo,mat);m.position.fromArray(p);m.scale.fromArray(s);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
    const box=(mat,p,s,parent=root)=>mesh(cube,mat,p,s,parent);
    const width=world.width||20,height=world.height||16;
    box(materials.grass,[width/2,-.20,height/2],[width,.23,height]);
    const groups=new Map();
    for(const tile of world.tiles||[]){
      const type=String(tile.material||'grass').toLowerCase();
      const key=/road|asphalt/.test(type)?'road':/grass|yard/.test(type)?'grass':/wood/.test(type)?'wood':'paving';
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(tile);
    }
    const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3(),color=new T.Color();
    for(const [key,tiles]of groups){
      const batch=pool.object(new T.InstancedMesh(cube,materials[key],tiles.length));
      tiles.forEach((tile,i)=>{const size=tile.size||world.tileSize||1;p.set(tile.x,-.07,tile.y);s.set(size,.12,size);matrix.compose(p,q,s);batch.setMatrixAt(i,matrix);color.setScalar(.95+seedOf(tile.x+','+tile.y)*.1);batch.setColorAt(i,color);});
      batch.receiveShadow=true;batch.instanceMatrix.needsUpdate=true;root.add(batch);
    }
    for(const obstacle of world.obstacles||[]){
      if(obstacle.destroyed)continue;
      const g=new T.Group();g.name='obstacle:'+obstacle.id;g.position.set(obstacle.x,0,obstacle.y);root.add(g);
      const w=obstacle.width||1,d=obstacle.depth||1,h=obstacle.height||1;
      const kind=String(obstacle.kind||obstacle.material||'').toLowerCase();
      if(/barrel|drum/.test(kind)){
        const radius=Math.min(w,d)/2,mat=/blue|water/.test(obstacle.material||'')?materials.blueDrum:materials.drum;
        mesh(cylinder,mat,[0,h/2,0],[radius,h,radius],g);
        for(const y of [h*.14,h*.85]){
          mesh(cylinder,materials.dark,[0,y,0],[radius*1.018,.025,radius*1.018],g);
          mesh(cylinder,materials.steel,[0,y+.013,0],[radius*1.02,.008,radius*1.02],g);
        }
        mesh(cylinder,materials.steel,[radius*.4,h+.008,0],[radius*.17,.026,radius*.17],g);
        const labelGeo=pool.geometry(new T.CylinderGeometry(radius*1.006,radius*1.006,h*.44,16,1,true,-.66,1.32));
        const label=mesh(labelGeo,materials.hazard,[0,h*.55,0],[1,1,1],g);label.receiveShadow=false;
      }else if(/fence/.test(kind)){
        const alongX=w>=d,length=alongX?w:d,thin=Math.min(w,d);
        for(let i=0;i<=Math.ceil(length/.6);i++){
          const a=-length/2+i*length/Math.ceil(length/.6);
          box(materials.creamWood,alongX?[a,h/2,0]:[0,h/2,a],alongX?[.12,h,thin]:[thin,h,.12],g);
        }
        for(const y of [h*.24,h*.76])box(materials.wood,[0,y,0],alongX?[length,.10,thin*.7]:[thin*.7,.10,length],g);
      }else if(/building|house|wall/.test(kind)){
        box(materials.plaster,[0,h/2,0],[w,h,d],g);
        box(materials.roof,[0,h-.035,0],[w+.12,.18,d+.12],g);
        box(materials.creamWood,[0,.12,d/2+.012],[w,.24,.035],g);
        if(/building|house/.test(kind)){
          box(materials.oliveWood,[-w*.22,.94,d/2+.018],[Math.min(.80,w*.3),1.85,.035],g);
          box(materials.creamWood,[-w*.22,.08,d/2+.10],[Math.min(1.05,w*.4),.12,.24],g);
          for(const x of [w*.17,w*.37]){
            const ww=Math.min(.60,w*.18);
            box(materials.dark,[x,h*.61,d/2+.025],[ww+.10,.89,.045],g);
            box(materials.glass,[x,h*.61,d/2+.052],[ww,.78,.025],g);
            box(materials.creamWood,[x,h*.61,d/2+.07],[.035,.80,.026],g);
            box(materials.creamWood,[x,h*.61,d/2+.07],[ww,.035,.026],g);
          }
          box(materials.wood,[0,h*.87,d/2+.17],[w+.07,.10,.35],g);
        }
      }else{
        box(materials.wood,[0,h/2,0],[w,h,d],g);
        for(const y of [.10,h-.10])box(materials.dark,[0,y,d/2+.015],[w,.055,.025],g);
        for(const x of [-w*.40,w*.40])box(materials.creamWood,[x,h/2,d/2+.026],[.065,h,.026],g);
        const brace=box(materials.creamWood,[0,h/2,d/2+.027],[.065,Math.hypot(w*.6,h*.7),.025],g);brace.rotation.z=-Math.atan2(w*.6,h*.7);
      }
    }
  }
  return {root,update(world){
    const next=JSON.stringify([world.width,world.height,world.tiles,world.obstacles]);
    if(next!==signature){signature=next;build(world);}
  },counts:()=>({...pool.counts(),builds}),dispose(){removeTree(root);pool.dispose();}};
}
export function createActor(T,materials){
  const pool=new Resources(),root=new T.Group();root.name='Provisional neighbor';
  const sphere=pool.geometry(new T.SphereGeometry(1,10,8)),cube=pool.geometry(new T.BoxGeometry(1,1,1));
  function add(geo,mat,p,s,parent=root){const m=new T.Mesh(geo,mat);m.position.fromArray(p);m.scale.fromArray(s);m.castShadow=true;parent.add(m);return m;}
  add(sphere,materials.creamWood,[0,1.53,0],[.18,.23,.17]);add(sphere,materials.dark,[0,1.73,0],[.23,.08,.20]);
  add(sphere,materials.oliveWood,[0,1.05,0],[.24,.43,.26]);
  const legs=[];
  for(const side of [-1,1]){const g=new T.Group();g.position.set(0,.68,.13*side);root.add(g);add(cube,materials.leather,[0,-.27,0],[.16,.54,.17],g);add(sphere,materials.dark,[.07,-.57,0],[.16,.10,.13],g);legs.push(g);}
  return {root,update(a,time){root.position.set(a.x,0,a.y);root.rotation.y=-(a.heading||0);root.visible=a.hp>0;legs.forEach((g,i)=>g.rotation.z=(a.moving?Math.sin(time*8+i*Math.PI)*.35:0));},
    dispose(){removeTree(root);pool.dispose();},counts:()=>pool.counts()};
}
