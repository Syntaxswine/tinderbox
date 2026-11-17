import * as T from '../runtime/three.js';
import {sourceGeometryTriangles,nativePanel} from './map-source-shapes.js';
import {bounds,triangleArea,unit,cross,sub,dot} from '../../workbenches/furnished-house/geometry.js';
const TYPES={Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array};
const area=triangles=>triangles.reduce((n,t)=>n+triangleArea(t),0);

export function createMapSourceGeometry(model){
  const attributes=new Map(),blueprints=new Map(),order=new Map(model.carriers.map((c,i)=>[c.id,i])),portalCarriers=new Map(),bins=new Map();
  let transformedQueries=0,renderExpansions=0,nativeSourceExpansions=0,nativePartTransforms=0,presentationBlueprints=0,presentationPartTransforms=0;
  for(const c of model.carriers){
    for(let x=Math.floor(c.bounds.min[0]/8);x<=Math.floor(c.bounds.max[0]/8);x++)for(let y=Math.floor(c.bounds.min[1]/8);y<=Math.floor(c.bounds.max[1]/8);y++)for(let z=Math.floor(c.bounds.min[2]/8);z<=Math.floor(c.bounds.max[2]/8);z++){const key=[x,y,z].join(',');if(!bins.has(key))bins.set(key,[]);bins.get(key).push(c.id);}
    for(const n of c.parts){const p=model.parts[n];if(p.portalId&&p.openMatrix){if(!portalCarriers.has(p.portalId))portalCarriers.set(p.portalId,new Set());portalCarriers.get(p.portalId).add(c.id);}}
  }
  function part(id){const p=model.partById.get(id);if(!p)throw Error('Unknown native part '+id);return p;}
  function triangles(p,open=false){const g=model.library.geometries[p.geometry];return sourceGeometryTriangles({matrix:open&&p.openMatrix?p.openMatrix:p.matrix,triangleCount:(g.index?.array.length??g.attributes.position.array.length/g.attributes.position.itemSize)/3},g);}
  function readAttributes(key){
    if(attributes.has(key))return attributes.get(key);const g=model.library.geometries[key],result={};
    for(const [name,a]of Object.entries(g.attributes)){const Type=TYPES[a.type];if(!Type)throw Error('Unsupported native source attribute');result[name]=new T.BufferAttribute(new Type(a.array),a.itemSize,a.normalized);}
    attributes.set(key,result);return result;
  }
  function renderGeometry(id){
    const p=part(id),g=model.library.geometries[p.geometry],a=readAttributes(p.geometry),matrix=new T.Matrix4().fromArray(p.matrix),normalMatrix=new T.Matrix3().getNormalMatrix(matrix),out=[],point=new T.Vector3(),normal=new T.Vector3(),count=g.index?.array.length??a.position.count;
    for(let i=0;i<count;i+=3){const vertices=[0,1,2].map(k=>{const j=g.index?g.index.array[i+k]:i+k;point.fromBufferAttribute(a.position,j).applyMatrix4(matrix);if(a.normal)normal.fromBufferAttribute(a.normal,j).applyMatrix3(normalMatrix).normalize();else normal.set(0,1,0);
      return [...point.toArray(),...normal.toArray(),a.uv?.getX(j)??0,a.uv?.getY(j)??0,a.grossUV?.getX(j)??a.uv?.getX(j)??0,a.grossUV?.getY(j)??a.uv?.getY(j)??0,a.color?.getX(j)??1,a.color?.getY(j)??1,a.color?.getZ(j)??1];});out.push({vertices,materialId:p.appearance});}
    renderExpansions++;return {id:p.id,triangles:out};
  }
  function doorPose(p){
    if(!p.openMatrix)return null;
    const m=new T.Matrix4().fromArray(p.openMatrix).multiply(new T.Matrix4().fromArray(p.matrix).invert()).elements,c=m[0],s=m[8],den=(1-c)**2+s*s;
    if(den<1e-10||Math.abs(m[5]-1)>1e-5||Math.abs(m[13])>1e-5)throw Error('Native door needs its exact vertical rigid hinge transform');
    const pivot=[((1-c)*m[12]+s*m[14])/den,p.bounds.min[1],(-s*m[12]+(1-c)*m[14])/den];
    return {pivot,maxOpenAngle:Math.atan2(s,c)};
  }
  function sourceBlueprint(id,presentation=false){
    if(!presentation&&blueprints.has(id))return blueprints.get(id);const c=model.carrierById.get(id);if(!c)throw Error('Unknown canonical source '+id);
    const surfaces=[],openings=[];
    for(const number of c.parts){const p=model.parts[number];if(!p.physical)continue;if(presentation)presentationPartTransforms++;else nativePartTransforms++;const ts=triangles(p),prefix=id+'/part/'+number,pose=doorPose(p),level=c.level??Math.floor(p.bounds.min[1]/2.12+1e-5);let plane;
      if(['wall-area','top-area','leaf-area'].includes(c.quantityRule)||c.material==='glass'){
        try{plane=nativePanel({quantityBasis:{rule:c.quantityRule},physicalMaterial:c.material,fuelAmount:0},ts);}catch{/* Non-box and diagonal sources retain their exact facets. */}
      }
      const definitions=[];
      if(plane)definitions.push({...plane,id:prefix+'/plane',weight:area(plane.triangles)});
      else{
        const facets=new Map();for(const t of ts){const a=triangleArea(t);if(a<1e-10)continue;const normal=unit(cross(sub(t[1],t[0]),sub(t[2],t[0]))),key=[...normal.map(n=>Math.round(n*1e6)),Math.round(dot(normal,t[0])*1e6)].join(',');if(!facets.has(key))facets.set(key,{normal,triangles:[]});facets.get(key).triangles.push(t);}
        let i=0;for(const f of facets.values())definitions.push({...f,id:prefix+'/face/'+i++,bounds:bounds(f.triangles.flat()),weight:area(f.triangles),kind:c.material==='glass'?'window':c.quantityRule==='weather-area'&&f.normal[1]>.2?'roof':'wall',renderNormal:f.normal,solidTriangles:f.triangles,closedShape:false,thickness:0,sourceRigidPose:!!pose});
      }
      for(const d of definitions){const surface={...d,instanceId:model.placeId,sourceCarrierId:id,nativePartId:p.id,sourceMeshBindings:[p.id],renderAppearanceIds:[p.appearance],material:c.material,fuelClass:c.fuelClass,fuelAmount:0,level,supports:true,supportFromMesh:true,nativeInertBody:!c.fuelClass,role:c.role,...(c.material==='glass'?{breakGroupId:id}:{})};
        surfaces.push(surface);if(pose)openings.push({id:surface.id+'/opening',surfaceId:surface.id,kind:'door',portalId:p.portalId,...pose,sourceMeshBindings:[p.id],level});}
    }
    const total=surfaces.reduce((n,s)=>n+s.weight,0);if(!(total>0))throw Error('A canonical carrier needs real source surfaces');
    for(const s of surfaces){s.fuelAmount=c.fuelAmount*s.weight/total;if(c.finish)s.finish={fuelClass:c.finish.fuelClass,amount:c.finish.amount*s.weight/total};}
    const result={surfaces,openings};if(presentation)presentationBlueprints++;else{blueprints.set(id,result);nativeSourceExpansions++;}return result;
  }
  return {model,order:id=>order.get(id),portalCarriers:id=>[...(portalCarriers.get(id)||[])],
    near(point,radius){const ids=new Set();for(let x=Math.floor((point[0]-radius)/8);x<=Math.floor((point[0]+radius)/8);x++)for(let y=Math.floor((point[1]-radius)/8);y<=Math.floor((point[1]+radius)/8);y++)for(let z=Math.floor((point[2]-radius)/8);z<=Math.floor((point[2]+radius)/8);z++)for(const id of bins.get([x,y,z].join(','))||[])ids.add(id);return [...ids].filter(id=>{const b=model.carrierById.get(id).bounds;return Math.hypot(...point.map((v,i)=>Math.max(b.min[i]-v,v-b.max[i],0)))<=radius;});},
    shapeForPart(id,open){const p=part(id);transformedQueries++;return {triangles:triangles(p,open),closed:p.closed};},renderGeometry,
    sourcesForCarrier(id,portalStates={}){const source=sourceBlueprint(id);return {surfaces:source.surfaces,openings:source.openings.map(o=>({...o,initialOpenFraction:portalStates[o.portalId]?1:0}))};},
    presentationSourcesForCarrier(id,portalStates={}){const source=sourceBlueprint(id,true);return {surfaces:source.surfaces,openings:source.openings.map(o=>({...o,initialOpenFraction:portalStates[o.portalId]?1:0}))};},
    metrics:()=>({...model.metrics(),decodedAttributeGeometries:attributes.size,transformedQueries,renderExpansions,nativeSourceExpansions,nativePartTransforms,presentationBlueprints,presentationPartTransforms,staticIndexBins:bins.size}),
    dispose(){attributes.clear();blueprints.clear();bins.clear();portalCarriers.clear();}};
}
