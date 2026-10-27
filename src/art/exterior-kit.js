
import {Resources} from './resources.js';

// Adapted from pinned AFT hybrid-materials.surfaceUV and hybrid-room-art's
// vertical-face/cap assignment. Raw surface imports stay in coder city.json.
function surfaceUV(position,normal){
  if(Math.abs(normal[1])>.5)return [position[0],position[2]];
  return [Math.abs(normal[0])>.5?position[2]:position[0],position[1]];
}
export function createExteriorKit(T,materials,assets,renderer){
  const root=new T.Group();root.name='Exposition construction kit';
  const materialPool=new Resources();let geometryPool=new Resources(),signature='',builds=0,closed=false;
  const specs={
    'inherited-brick':{map:assets.kitBrick,color:0xd7c4ad,period:2},
    'inherited-plaster':{map:assets.kitPlaster,color:0xd4cfbe,period:2},
    'inherited-wood':{map:assets.kitWood,color:0xffffff,period:1},
    'inherited-cream':{material:materials.creamWood,period:1},
    'inherited-roof':{material:materials.oliveWood,period:1}
  };
  for(const value of Object.values(specs)){
    if(value.map){
      value.map.wrapS=value.map.wrapT=T.RepeatWrapping;
      value.map.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||2);
      value.material=materialPool.material(new T.MeshStandardMaterial({map:value.map,color:value.color,roughness:.95,side:T.DoubleSide}));
    }
  }
  let records=[],state={modules:0,survivingSolidParts:[],suppressedSolidParts:[],suppressedCosmeticParts:[],visibleRoofParts:[]};
  function spec(id){const value=specs[id];if(!value)throw new Error('Unsupported exterior skin '+id);return value;}
  function applySkin(record,module){
    const slots=module.skinSlots,style=JSON.stringify(slots);if(record.style===style)return;
    const {mesh,part,roof}=record,geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
    let faces;
    if(roof)faces=[spec(slots.roof)];
    else if(part.skinSlot==='door')faces=Array(6).fill(spec(slots.door));
    else if(part.skinSlot==='trim')faces=Array(6).fill(spec(slots.trim));
    else{
      const facade=spec(slots.facade),trim=spec(slots.trim),east=part.width<part.depth;
      faces=east?[facade,facade,trim,trim,trim,trim]:[trim,trim,trim,trim,facade,facade];
    }
    mesh.material=roof?faces[0].material:faces.map(face=>face.material);
    for(let i=0;i<p.count;i++){
      const point=[p.getX(i)+mesh.position.x,p.getY(i)+mesh.position.y,p.getZ(i)+mesh.position.z],normal=[n.getX(i),n.getY(i),n.getZ(i)];
      const q=surfaceUV(point,normal),period=faces[roof?0:Math.floor(i/4)].period;
      uv.setXY(i,q[0]/period,q[1]/period);
    }
    uv.needsUpdate=true;record.style=style;mesh.userData.skinSlots={...slots};
  }
  function roofGeometry(module){
    const hip=module.form==='roof-hip',swap=hip&&module.depth>module.width;
    const width=swap?module.depth:module.width,depth=swap?module.width:module.depth,w=width/2,d=depth/2,h=module.height;
    const a=[-w,0,-d],b=[w,0,-d],c=[w,0,d],e=[-w,0,d],positions=[];
    function triangle(p,q,r){
      const u=new T.Vector3(...q).sub(new T.Vector3(...p)),v=new T.Vector3(...r).sub(new T.Vector3(...p));
      if(u.cross(v).lengthSq()<1e-16)return;
      positions.push(...p,...q,...r);
    }
    function quad(p,q,r,s){triangle(p,q,r);triangle(p,r,s);}
    if(hip){
      const ridge=(width-depth)/2,left=[-ridge,h,0],right=[ridge,h,0];
      quad(a,left,right,b);quad(e,c,right,left);triangle(a,e,left);triangle(b,right,c);
    }else{
      const left=[-w,h,0],right=[w,h,0];
      quad(a,left,right,b);quad(e,c,right,left);triangle(a,e,left);triangle(b,right,c);
    }
    quad(a,b,c,e);
    const geometry=geometryPool.geometry(new T.BufferGeometry());
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));
    geometry.computeVertexNormals();
    geometry.rotateY(-module.heading+(swap?Math.PI/2:0));geometry.translate(module.x,module.baseHeight,module.y);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
  }
  function rebuild(modules,surviving){
    geometryPool.dispose();geometryPool=new Resources();root.clear();records=[];builds++;
    state={modules:modules.length,survivingSolidParts:[],suppressedSolidParts:[],suppressedCosmeticParts:[],visibleRoofParts:[]};
    for(const module of modules){
      if(!Array.isArray(module.parts))throw new Error('Exterior art requires compiled module parts');
      // The model has already resolved frame/roof support liveness.
      for(const part of module.parts){
        const roof=module.form.startsWith('roof-');
        if(module.destroyed||part.destroyed||(part.solid&&!surviving.has(part.id))){
          (part.solid?state.suppressedSolidParts:state.suppressedCosmeticParts).push(part.id);continue;
        }
        let geometry,mesh;
        if(roof){geometry=roofGeometry(module);mesh=new T.Mesh(geometry,spec(module.skinSlots.roof).material);state.visibleRoofParts.push(part.id);}
        else{
          geometry=geometryPool.geometry(new T.BoxGeometry(part.width,part.height,part.depth));
          mesh=new T.Mesh(geometry,spec(module.skinSlots.facade).material);mesh.position.set(part.x,part.h,part.y);
        }
        mesh.name='module-part:'+part.id;mesh.castShadow=mesh.receiveShadow=true;
        mesh.userData={moduleId:module.id,partId:part.id,role:part.role,solid:part.solid,physicalMaterial:module.physicalMaterial,researchBasedKit:true};
        root.add(mesh);const record={moduleId:module.id,part,roof,mesh,style:null};records.push(record);applySkin(record,module);
        if(part.solid)state.survivingSolidParts.push(part.id);
      }
    }
  }
  return{root,update(world){
    if(closed)return;const modules=world.modules||[];if(!Array.isArray(modules)||modules.length>128)throw new Error('Exterior module budget exceeded');
    const surviving=new Set((world.obstacles||[]).filter(o=>!o.destroyed).map(o=>o.id));
    const next=JSON.stringify(modules.map(m=>[m.id,m.form,m.x,m.y,m.width,m.depth,m.height,m.heading,m.baseHeight,m.destroyed,m.parts?.map(p=>[p.id,p.x,p.y,p.h,p.width,p.depth,p.height,p.solid,p.skinSlot,p.destroyed,surviving.has(p.id)])]));
    if(next!==signature){signature=next;rebuild(modules,surviving);}
    const byId=new Map(modules.map(m=>[m.id,m]));for(const record of records)applySkin(record,byId.get(record.moduleId));
  },dispose(){if(closed)return;closed=true;root.removeFromParent();root.clear();records=[];state={modules:0,survivingSolidParts:[],suppressedSolidParts:[],suppressedCosmeticParts:[],visibleRoofParts:[]};geometryPool.dispose();materialPool.dispose();},
  diagnostics:()=>({...state,disposed:closed,renderedModuleIds:[...new Set(records.map(r=>r.moduleId))],renderedPartIds:records.map(r=>r.part.id),roofIds:records.filter(r=>r.roof).map(r=>r.moduleId),skinBindings:Object.fromEntries(records.map(r=>[r.part.id,{...r.mesh.userData.skinSlots}])),builds,meshes:records.length,geometries:geometryPool.geometries.size,materials:materialPool.materials.size,textures:0,roofPolicy:'Consumes authoritative support/destroyed flags; no inferred collapse or roof fire',lintelPolicy:'Consumes authoritative pier-support/destroyed flags'})};
}
