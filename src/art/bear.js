
import {Resources,clamp,removeTree} from './resources.js';
export const BEAR_SPEC=Object.freeze({height:2.02,shoulderWidth:1.06,neutralForward:'+X',provisional:true,
  anchors:['grip','support','muzzle','spout','backpack']});
export function createBear(T,materials){
  const pool=new Resources(),root=new T.Group();root.name='Provisional Tinderbox bear';
  const sphere=pool.geometry(new T.SphereGeometry(1,14,10)),box=pool.geometry(new T.BoxGeometry(1,1,1));
  const cylinder=pool.geometry(new T.CylinderGeometry(1,1,1,12)),ring=pool.geometry(new T.TorusGeometry(1,.16,5,16));
  const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),up=V(0,1,0);
  function mesh(geometry,material,position,scale,parent=root,name=''){
    const m=new T.Mesh(geometry,material);m.position.fromArray(position);m.scale.fromArray(scale);
    m.castShadow=m.receiveShadow=true;m.name=name;parent.add(m);return m;
  }
  const ball=(mat,p,s,parent=root,name='')=>mesh(sphere,mat,p,s,parent,name);
  const cube=(mat,p,s,parent=root,name='')=>mesh(box,mat,p,s,parent,name);
  function rod(a,b,r,mat,parent=root){
    const av=V(...a),bv=V(...b),d=bv.clone().sub(av),m=mesh(cylinder,mat,av.clone().add(bv).multiplyScalar(.5).toArray(),[r,d.length(),r],parent);
    m.quaternion.setFromUnitVectors(up,d.normalize());return m;
  }
  ball(materials.canvas,[0,1.02,0],[.34,.47,.35],root,'Canvas overalls');
  ball(materials.canvas,[-.03,.64,0],[.33,.22,.31]);
  ball(materials.fur,[.015,1.34,0],[.35,.25,.36]);
  cube(materials.canvas,[.264,1.11,0],[.07,.34,.43]);
  for(const side of [-1,1]){
    cube(materials.leather,[.22,1.30,.22*side],[.055,.28,.045]);
    ball(materials.brass,[.27,1.29,.22*side],[.026,.026,.018]);
  }
  const head=new T.Group();head.position.set(.025,1.61,0);root.add(head);
  ball(materials.fur,[0,0,0],[.33,.32,.31],head,'Bear head');
  for(const side of [-1,1]){
    ball(materials.fur,[-.025,.25,.237*side],[.14,.16,.125],head,'Rounded bear ear');
    ball(materials.darkFur,[.055,.26,.242*side],[.047,.095,.070],head);
    ball(materials.darkFur,[.235,.059,.167*side],[.073,.074,.040],head);
    ball(materials.eye,[.272,.064,.180*side],[.034,.036,.026],head);
    ball(materials.ivory,[.293,.078,.180*side],[.010,.011,.009],head);
    const brow=ball(materials.fur,[.254,.12,.18*side],[.08,.036,.048],head);brow.rotation.x=side*.2;
    ball(materials.fur,[-.19,-.13,.25*side],[.13,.13,.10],head);
  }
  ball(materials.muzzle,[.28,-.105,0],[.22,.15,.205],head,'Short tan muzzle');
  ball(materials.eye,[.458,-.057,0],[.075,.061,.095],head,'Broad black nose');
  rod([.445,-.12,-.08],[.445,-.12,.08],.009,materials.darkFur,head);
  const legs=[];
  for(const side of [-1,1]){
    const g=new T.Group();g.position.set(0,.63,.19*side);root.add(g);
    ball(materials.canvas,[0,-.19,0],[.155,.29,.15],g);
    ball(materials.darkFur,[.015,-.41,0],[.135,.14,.14],g);
    ball(materials.leather,[.08,-.51,0],[.22,.105,.17],g,'Broad bear boot');
    cube(materials.dark, [.08,-.565,0],[.33,.035,.26],g);
    legs.push(g);
  }
  const armParts=[-1,1].map(side=>({
    side,upper:mesh(cylinder,materials.fur,[0,0,0],[.12,.35,.12]),
    lower:mesh(cylinder,materials.fur,[0,0,0],[.115,.33,.115]),
    sleeve:ball(materials.shirt,[.005,1.36,.37*side],[.16,.17,.16]),
    paw:ball(materials.darkFur,[0,0,0],[.12,.115,.12])
  }));
  function segment(part,a,b,r){const d=b.clone().sub(a);part.position.copy(a).add(b).multiplyScalar(.5);part.scale.set(r,d.length(),r);part.quaternion.setFromUnitVectors(up,d.normalize());}
  const anchors={};
  for(const name of BEAR_SPEC.anchors){const a=new T.Object3D();a.name='bear:'+name;root.add(a);anchors[name]=a;}
  const equipment={},heldParts={};
  for(const tool of ['matches','jerry-can','molotov','torch','flamethrower']){const g=new T.Group();g.name=tool;g.scale.z=-1;root.add(g);equipment[tool]=g;}
  const grip=[.46,1.03,-.29];
  {
    const g=equipment.matches;
    rod(grip,[.70,1.07,-.29],.011,materials.wood,g);
    ball(materials.drum,[.71,1.073,-.29],[.025,.027,.025],g);
    cube(materials.creamWood,[.43,1.00,.24],[.13,.075,.09],g);
  }
  {
    const g=equipment['jerry-can'];cube(materials.oliveWood,[.47,.74,-.34],[.30,.39,.20],g);
    rod([.38,.955,-.34],[.55,.955,-.34],.022,materials.leather,g);
    for(const y of [.62,.83])cube(materials.steel,[.474,y,-.445],[.20,.019,.009],g);
    const brace=cube(materials.steel,[.475,.74,-.447],[.015,.25,.009],g);brace.rotation.z=.65;
    rod([.60,.88,-.34],[.70,.83,-.34],.025,materials.brass,g);
  }
  {
    const g=equipment.molotov;
    mesh(cylinder,materials.glass,[.48,1.11,-.29],[.065,.23,.065],g);
    ball(materials.glass,[.48,1.24,-.29],[.065,.065,.065],g);
    mesh(cylinder,materials.glass,[.48,1.30,-.29],[.025,.10,.025],g);
    cube(materials.shirt,[.48,1.38,-.29],[.033,.07,.035],g);
    cube(materials.creamWood,[.52,1.10,-.29],[.017,.11,.09],g);
  }
  {
    const g=equipment.torch;heldParts.torch=g;rod(grip,[.95,1.08,-.29],.026,materials.wood,g);
    rod([.88,1.073,-.29],[1.01,1.09,-.29],.063,materials.shirt,g);
  }
  {
    const g=equipment.flamethrower,lance=new T.Group();lance.name='Cosmetic lance';g.add(lance);heldParts.flamethrower=lance;
    rod([.39,1.05,-.29],[1.03,1.05,-.29],.026,materials.dark,lance);
    rod([.51,1.04,-.29],[.51,.96,-.29],.023,materials.leather,lance);
    rod([.96,1.05,-.29],[1.06,1.05,-.29],.045,materials.steel,lance);
    rod([.96,1.015,-.31],[1.07,1.015,-.31],.009,materials.brass,lance);
    for(const side of [-1,1]){
      mesh(cylinder,materials.oliveWood,[-.36,1.16,.115*side],[.10,.48,.10],g);
      for(const h of [.96,1.34]){const band=mesh(ring,materials.steel,[-.36,h,.115*side],[.103,.103,.103],g);band.rotation.x=Math.PI/2;}
      rod([-.36,1.40,.115*side],[-.36,1.47,.115*side],.018,materials.brass,g);
      cube(materials.leather,[-.17,1.24,.27*side],[.045,.42,.04],g);
    }
    const curve=new T.CatmullRomCurve3([V(-.37,.98,-.11),V(-.35,.78,-.36),V(.15,.80,-.43),V(.39,1.05,-.29)]);
    const tube=pool.geometry(new T.TubeGeometry(curve,14,.018,6,false));mesh(tube,materials.dark,[0,0,0],[1,1,1],g);
  }
  let lastTool='';
  function update(player,time){
    const tool=equipment[player.tool]?player.tool:'matches';
    if(tool!==lastTool){for(const [id,g]of Object.entries(equipment))g.visible=id===tool;lastTool=tool;}
    const phase=time*8.5,walk=player.moving?1:0,sway=Math.sin(phase)*walk;
    root.position.set(player.x,Math.abs(Math.sin(phase*2))*.022*walk,player.y);
    root.rotation.y=-(player.heading||0);
    legs[0].rotation.z=sway*.43;legs[1].rotation.z=-sway*.43;
    head.rotation.z=-.035+Math.sin(time*1.6)*.012;head.rotation.y=Math.sin(time*.7)*.025;
    const right=tool==='jerry-can'?V(.47,.98,.34):V(grip[0],grip[1],-grip[2]);
    const left=tool==='flamethrower'?V(.78,1.02,.26):tool==='torch'?V(.75,1.05,.26):V(.07+sway*.13,.88,-.36);
    for(const arm of armParts){
      const shoulder=V(.01,1.36,.38*arm.side),hand=arm.side>0?right:left;
      const elbow=V(.12,1.05,.42*arm.side);
      segment(arm.upper,shoulder,elbow,.12);segment(arm.lower,elbow,hand,.105);arm.paw.position.copy(hand);
    }
    anchors.grip.position.copy(right);anchors.support.position.copy(left);
    const muzzle=tool==='flamethrower'?[1.07,1.05,-.29]:tool==='torch'?[1.01,1.09,-.29]:tool==='molotov'?[.48,1.38,-.29]:[.71,1.073,-.29];
    anchors.muzzle.position.set(muzzle[0],muzzle[1],-muzzle[2]);anchors.spout.position.set(.70,.83,.34);anchors.backpack.position.set(-.36,1.16,0);
    root.updateMatrixWorld(true);
  }
  update({x:0,y:0,heading:0,moving:false,tool:'matches'},0);
  return {root,anchors,update,setHeldVisible(visible){const part=heldParts[lastTool];if(part)part.visible=visible;},dispose(){removeTree(root);pool.dispose();},counts:()=>pool.counts()};
}
