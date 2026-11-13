import fs from 'node:fs';
import * as T from '../../../src/runtime/three.js';
import {createCharacterRig} from '../../../src/reuse/characters.js';
import {createCivilianRig,createChicagoPatrolRig} from '../../../src/reuse/civilians.js';
import {CIVILIAN_PROFILES,CHICAGO_PATROL} from '../../../src/content/exterior-kit.js';
const farm='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/',bear='vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/',rows=[];
const model=id=>JSON.parse(fs.readFileSync((id==='bear'?bear:farm)+id+'-10k-data.json'));
function measure(root){const result=new T.Box3(),v=new T.Vector3();let vertices=0;root.updateMatrixWorld(true);root.traverseVisible(o=>{if(!o.isMesh||!o.geometry?.attributes.position)return;o.skeleton?.update();const indices=o.geometry.index?.array,used=indices?new Set(indices):Array.from({length:o.geometry.attributes.position.count},(_,i)=>i);for(const i of used){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);result.expandByPoint(v);vertices++;}});return {min:result.min.toArray(),max:result.max.toArray(),vertices};}
for(const id of ['goat','horse','bear']){
 const rig=createCharacterRig(id,model(id),{unarmed:true}),samples=[];try{for(const distance of [0,.1,.25,.45,.7,1.05,1.6]){rig.update({x:0,y:0,elevation:0,heading:0,travelled:distance,moving:distance>0,tool:'matches'},distance);rig.setHeldVisible(false);samples.push(measure(rig.root));}}finally{rig.dispose();}
 rows.push({profile:'player-'+id,samples:samples.length,minimumY:Math.min(...samples.map(s=>s.min[1])),maximumY:Math.max(...samples.map(s=>s.max[1])),nativeScale:[1,1,1],equipment:'Unarmed body as in initial lantern scene'});
}
for(const id of ['horse','officer']){
 const officer=id==='officer',species=officer?'goat':id,rig=officer?createChicagoPatrolRig(model('goat')):createCivilianRig(id,model(id)),actor=officer?{...CHICAGO_PATROL}:{...CIVILIAN_PROFILES[id],id:'resident',team:'civilian',headgear:'none',equipment:'none'},samples=[];
 try{for(const distance of [0,.1,.25,.45,.7,1.05,1.6]){rig.update({...actor,x:0,y:0,elevation:0,heading:0,travelled:distance,moving:distance>0,hp:100},distance);samples.push(measure(rig.root));}}finally{rig.dispose();}
 rows.push({profile:officer?'native-uniformed-officer':'native-resident-horse',samples:samples.length,minimumY:Math.min(...samples.map(s=>s.min[1])),maximumY:Math.max(...samples.map(s=>s.max[1])),nativeScale:[1,1,1],equipment:officer?'Original helmet, uniform and belt pistol':'Original unarmed civilian'});
}
const report={version:1,measurement:'Actually evaluated visible skinned/source vertices at seven native gait distances; no renderer or substituted body proxy',headerUnderside:1.71,ceilingUnderside:2,profiles:rows.map(r=>({...r,marginToCurrentTransom:1.71-r.maximumY,marginToCeiling:2-r.maximumY})),limitations:['Numeric height envelope only; actual posed-surface sweep, carried equipment and combined WebGL review remain mandatory.']};fs.writeFileSync('docs/art/bell-and-alder-closing/posed-height-probe.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
