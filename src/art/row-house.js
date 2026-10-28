import {createGrossHouse, housePlanEdges} from './gross-housing.js';
import {Resources} from './resources.js';
const EPS=1e-7;
const sideOf=(edge,width)=>Math.abs(edge.a[0]-edge.b[0])<EPS ? Math.abs(edge.a[0])<EPS?'left':Math.abs(edge.a[0]-width)<EPS?'right':null : null;

// Snapshot adjacency is supplied by content/simulation; art only checks its contract.
export function monroePartyWalls(instance,instances){
  const walls=instance.partyWalls||{left:null,right:null};
  if(instance.prefabId!=='monroe-row')return {left:null,right:null};
  if(![0,1,2,3].includes(instance.quarterTurns))throw Error('Invalid Monroe quarter turn');
  for(const neighbor of instances)if(neighbor.id!==instance.id&&neighbor.prefabId==='monroe-row'&&neighbor.quarterTurns===instance.quarterTurns){const angle=instance.quarterTurns*Math.PI/2,dx=neighbor.x-instance.x,dz=neighbor.y-instance.y,localX=dx*Math.cos(angle)+dz*Math.sin(angle),localZ=-dx*Math.sin(angle)+dz*Math.cos(angle);if(Math.abs(localZ)<EPS&&Math.abs(Math.abs(localX)-7)<EPS&&walls[localX<0?'left':'right']!==neighbor.id)throw Error('Missing authoritative Monroe party wall');}
  if(!walls||!['left','right'].every(s=>walls[s]===null||typeof walls[s]==='string'&&walls[s]!==instance.id))throw Error('Invalid Monroe party-wall descriptor');
  for(const side of ['left','right'])if(walls[side]!==null){
    const neighbor=instances.find(b=>b.id===walls[side]),sign=side==='left'?-1:1,angle=instance.quarterTurns*Math.PI/2;
    if(!neighbor||neighbor.prefabId!=='monroe-row'||neighbor.quarterTurns!==instance.quarterTurns||Math.abs(neighbor.x-instance.x-sign*7*Math.cos(angle))>EPS||Math.abs(neighbor.y-instance.y-sign*7*Math.sin(angle))>EPS||neighbor.partyWalls?.[side==='left'?'right':'left']!==instance.id)throw Error('Misaligned or nonreciprocal Monroe party wall: '+instance.id+'/'+side);
  }
  return {left:walls.left,right:walls.right};
}

export function deriveMonroePlan(source,partyWalls){
  if(source?.id!=='monroe-row'||source.width!==7)throw Error('Expected the pinned seven-metre Monroe source');
  const house=structuredClone(source);
  for(const floor of [...house.floors,...(house.basementFloor?[house.basementFloor]:[])]){
    floor.windows=housePlanEdges(source,floor,{partyWalls:false}).filter(e=>e.opening==='window'&&!partyWalls[sideOf(e,7)]).map(e=>[...e.a,...e.b]);
  }
  return house;
}

function clippedPolygon(poly,axis,bound,sign,intersections){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],av=sign*(a.p[axis]-bound),bv=sign*(b.p[axis]-bound),ai=av>=-EPS,bi=bv>=-EPS;
    if(ai)out.push(a);
    if(ai!==bi){const t=av/(av-bv),v={p:a.p.map((n,k)=>n+(b.p[k]-n)*t),attributes:{}};v.p[axis]=bound;
      for(const [name,values] of Object.entries(a.attributes))v.attributes[name]=values.map((n,k)=>n+(b.attributes[name][k]-n)*t);
      out.push(v);intersections.push(v.p);
    }
  }
  return out;
}
function hullYZ(points){
  const unique=[...new Map(points.map(p=>[p.map(n=>Math.round(n*1e7)).join('/'),p])).values()].sort((a,b)=>a[2]-b[2]||a[1]-b[1]);
  if(unique.length<3)return [];
  const cross=(a,b,c)=>(b[2]-a[2])*(c[1]-a[1])-(b[1]-a[1])*(c[2]-a[2]);
  const half=points=>{const out=[];for(const p of points){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=EPS)out.pop();out.push(p);}return out;};
  const a=half(unique),b=half([...unique].reverse());return [...a.slice(0,-1),...b.slice(0,-1)];
}
function outsideBody(poly,house){
  const low=house.plinth-(house.basementFloor?2.12:0)-.12,high=house.plinth+(house.floors.length-1)*2.12+2;
  const result=[];let inside=poly;
  for(const [axis,bound,sign] of [[1,low,1],[1,high,-1],[2,0,1],[2,house.depth,-1]]){if(inside.length<3)break;const part=clippedPolygon(inside,axis,bound,-sign,[]);if(part.length>=3)result.push(part);inside=clippedPolygon(inside,axis,bound,sign,[]);}
  return result;
}
function ownsBodyFace(mesh,side){
  const x=side==='left'?0:7;
  if(mesh.name==='Floor slab rim')return Math.abs(mesh.position.x-x)<EPS&&Math.abs(Math.cos(mesh.rotation.y))<EPS;
  let wall=mesh.parent;while(wall&&!wall.name.startsWith('wall:'))wall=wall.parent;
  return mesh.name==='Native wall unit'&&wall?.userData.rooms?.length===1&&Math.abs(wall.position.x-x)<EPS;
}
function trimJoins(T,model,walls,pool){
  const caps=[],stats={clippedMeshes:0,capMeshes:0,interpolatedSourceVertices:0};
  model.root.updateMatrixWorld(true);
  const meshes=[];model.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const mesh of meshes){
    const g=mesh.geometry,p=g.attributes.position,relative=new T.Matrix4().multiplyMatrices(model.root.matrixWorld.clone().invert(),mesh.matrixWorld),inverse=relative.clone().invert();
    const rootPoints=Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(relative).toArray());
    const planes=[...(walls.left?[{side:'left',bound:0,sign:1}]:[]),...(walls.right?[{side:'right',bound:7,sign:-1}]:[])].filter(plane=>rootPoints.some(v=>plane.sign*(v[0]-plane.bound)<-EPS||Math.abs(v[0]-plane.bound)<EPS));
    if(!planes.length)continue;
    const arrays=Object.fromEntries(Object.keys(g.attributes).map(name=>[name,[]])),groups=[],cuts=Object.fromEntries(planes.map(p=>[p.side,[]])),index=g.index;
    const ranges=g.groups.length?g.groups:[{start:0,count:index?index.count:p.count,materialIndex:0}];
    for(const range of ranges){const start=arrays.position.length/3;
      for(let at=range.start;at<range.start+range.count;at+=3){let poly=[];
        for(let j=0;j<3;j++){const i=index?index.getX(at+j):at+j;poly.push({p:rootPoints[i],attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,Array.from({length:a.itemSize},(_,k)=>a.array[i*a.itemSize+k])]))});}
        for(const plane of planes)poly=clippedPolygon(poly,0,plane.bound,plane.sign,cuts[plane.side]);
        let polys=poly.length>=3?[poly]:[];for(const plane of planes)if(!ownsBodyFace(mesh,plane.side))polys=polys.flatMap(p=>p.every(v=>Math.abs(v.p[0]-plane.bound)<EPS)?outsideBody(p,model.house):[p]);
        for(const piece of polys)for(let i=1;i<piece.length-1;i++){const tri=[piece[0],piece[i],piece[i+1]],a=new T.Vector3(...tri[0].p);if(new T.Vector3(...tri[1].p).sub(a).cross(new T.Vector3(...tri[2].p).sub(a)).length()<EPS)continue;for(const v of tri){
          const local=new T.Vector3(...v.p).applyMatrix4(inverse);for(const [name,values] of Object.entries(v.attributes))arrays[name].push(...(name==='position'?local.toArray():values));stats.interpolatedSourceVertices++;
        }}
      }
      if(arrays.position.length/3>start)groups.push({start,count:arrays.position.length/3-start,materialIndex:range.materialIndex});
    }
    const result=new T.BufferGeometry();for(const [name,a] of Object.entries(g.attributes))result.setAttribute(name,new T.Float32BufferAttribute(arrays[name],a.itemSize,a.normalized));for(const group of groups)result.addGroup(group.start,group.count,group.materialIndex);result.computeBoundingBox();result.computeBoundingSphere();mesh.geometry=pool.geometry(result);mesh.userData.rowDerived=true;stats.clippedMeshes++;
    for(const plane of planes){const hull=hullYZ(cuts[plane.side]);if(hull.length<3)continue;
      const positions=[],uv=[];
      const capPolys=ownsBodyFace(mesh,plane.side)?[hull.map(p=>({p,attributes:{}}))]:outsideBody(hull.map(p=>({p,attributes:{}})),model.house);
      for(const poly of capPolys)for(let i=1;i<poly.length-1;i++){
        let tri=[poly[0].p,poly[i].p,poly[i+1].p];const normal=new T.Vector3(...tri[1]).sub(new T.Vector3(...tri[0])).cross(new T.Vector3(...tri[2]).sub(new T.Vector3(...tri[0])));
        if(normal.length()<EPS)continue;if(normal.x*plane.sign>0)tri.reverse();
        for(const v of tri){positions.push(...new T.Vector3(...v).applyMatrix4(inverse).toArray());uv.push(v[2],v[1]);}
      }
      if(!positions.length)continue;
      const capGeometry=new T.BufferGeometry();capGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));capGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));capGeometry.setAttribute('grossUV',capGeometry.attributes.uv.clone());capGeometry.computeVertexNormals();
      const materials=[mesh.material].flat(),material=materials.find(m=>['Painted exterior','Brick basement'].includes(m.name))||materials[0];
      const cap=new T.Mesh(pool.geometry(capGeometry),material);cap.name='Monroe sealed join cap';cap.position.copy(mesh.position);cap.quaternion.copy(mesh.quaternion);cap.scale.copy(mesh.scale);cap.castShadow=mesh.castShadow;cap.receiveShadow=mesh.receiveShadow;cap.userData={partySide:plane.side,sourceRole:mesh.name};mesh.parent.add(cap);caps.push(cap);stats.capMeshes++;
    }
  }
  return {caps,stats};
}

// Original catalogues, source assemblies, textures and native templates stay immutable.
export function createMonroeRowHouse(T,library,id,{partyWalls={left:null,right:null},...options}={}){
  if(id!=='monroe-row')throw Error('Monroe adapter requires monroe-row');
  const source=library.catalogue.houses.find(h=>h.id===id),house=deriveMonroePlan(source,partyWalls),pool=new Resources();
  const catalogue={...library.catalogue,houses:library.catalogue.houses.map(h=>h.id===id?house:h)};
  let model;
  try{model=createGrossHouse(T,{...library,catalogue},id,{...options,partyWalls:false});const derived=trimJoins(T,model,partyWalls,pool);let disposed=false;
    function setNeighborsVisible({left=false}={}){for(const cap of derived.caps)cap.visible=cap.userData.partySide==='right'||!left;}
    setNeighborsVisible();
    return {...model,house,setNeighborsVisible,diagnostics:()=>({...model.diagnostics(),rowVariant:{partyWalls:{...partyWalls},...derived.stats,visibleCaps:derived.caps.filter(c=>c.visible).length,resources:pool.counts()}}),dispose(){if(disposed)return;disposed=true;model.dispose();pool.dispose();}};
  }catch(error){model?.dispose();pool.dispose();throw error;}
}
