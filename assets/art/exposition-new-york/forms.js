// TB-022 authored forms. Host Three is injected; geometry is in local metres.
// Native BoxGeometry positions, normals, source UVs and origins remain untouched.
export function createForms(T,materials){
  const geometries=new Map(),meshes=[],components=[],columns=[],railPosts=new Set();
  const q=v=>Math.round(v*1e6)/1e6;
  function physicalUV(g,origin=[0,0,0]){
    const p=g.attributes.position,n=g.attributes.normal,a=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i)+origin[0],y=p.getY(i)+origin[1],z=p.getZ(i)+origin[2];
      a.push(...(Math.abs(n.getY(i))>.55?[x,z]:Math.abs(n.getX(i))>.55?[z,y]:[x,y]));
    }
    g.setAttribute('grossUV',new T.Float32BufferAttribute(a,2));return g;
  }
  function flatMetricUV(g){
    const p=g.attributes.position,norm=g.attributes.normal,uv=[];
    for(let i=0;i<p.count;i++){
      const n=new T.Vector3().fromBufferAttribute(norm,i),horizontal=Math.abs(n.y)>.55,target=new T.Vector3(...(Math.abs(n.x)>.55&&!horizontal?[0,0,1]:[1,0,0])),u=target.addScaledVector(n,-target.dot(n)).normalize(),v=new T.Vector3().crossVectors(n,u);
      if(horizontal?v.z<0:v.y<0)v.negate();const point=new T.Vector3().fromBufferAttribute(p,i);uv.push(point.dot(u),point.dot(v));
    }
    g.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));return g;
  }
  function cached(key,create){if(!geometries.has(key)){const g=create();g.computeBoundingBox();g.computeBoundingSphere();geometries.set(key,g);}return geometries.get(key);}
  function mesh(parent,id,g,slot,position=[0,0,0],extra={}){
    const m=new T.Mesh(g,materials[slot]);m.name=id;m.position.fromArray(position);m.castShadow=m.receiveShadow=true;
    m.userData={componentId:id,appearanceSlot:slot,physicalMaterial:'unassigned',...extra};parent.add(m);meshes.push(m);components.push(id);return m;
  }
  function box(parent,id,w,h,d,x,y,z,slot='trim',extra={}){
    if([w,h,d].some(n=>!Number.isFinite(n)||n<=0))throw Error('Invalid form '+id);
    // UV origins repeat every 2 m (the largest inherited texture period).
    const origin=(slot==='facade'?[x,y,z]:[0,0,0]).map(v=>q(((v%2)+2)%2)),key=['box',w,h,d,...origin].join('/');
    return mesh(parent,id,cached(key,()=>physicalUV(new T.BoxGeometry(w,h,d),origin)),slot,[x,y,z],{form:'box',dimensions:[w,h,d],...extra});
  }
  function cylinder(parent,id,rTop,rBottom,h,x,y,z,slot='trim',segments=12){
    const key=['cylinder',rTop,rBottom,h,segments].join('/');
    const g=cached(key,()=>{const g=new T.CylinderGeometry(rTop,rBottom,h,segments),a=g.attributes.uv.clone();for(let i=0;i<a.count;i++)a.setXY(i,a.getX(i)*2*Math.PI*Math.max(rTop,rBottom),a.getY(i)*h);g.setAttribute('grossUV',a);return g;});
    return mesh(parent,id,g,slot,[x,y,z]);
  }
  function lathe(parent,id,profile,x,y,z,slot='trim',segments=10){
    const key=['lathe',segments,JSON.stringify(profile)].join('/');
    return mesh(parent,id,cached(key,()=>physicalUV(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),segments))),slot,[x,y,z]);
  }
  function prismGeometry(points,height){
    const area=points.reduce((n,a,i)=>{const b=points[(i+1)%points.length];return n+a[0]*b[1]-b[0]*a[1];},0);
    if(area>0)points=[...points].reverse();
    const p=[],tris=T.ShapeUtils.triangulateShape(points.map(([x,z])=>new T.Vector2(x,z)),[]);
    function tri(a,b,c){p.push(...a,...b,...c);}
    for(const [a,b,c] of tris){const pt=(i,y)=>[points[i][0],y,points[i][1]];tri(pt(a,height/2),pt(c,height/2),pt(b,height/2));tri(pt(a,-height/2),pt(b,-height/2),pt(c,-height/2));}
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];tri([a[0],-height/2,a[1]],[b[0],-height/2,b[1]],[b[0],height/2,b[1]]);tri([a[0],-height/2,a[1]],[b[0],height/2,b[1]],[a[0],height/2,a[1]]);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();flatMetricUV(g);g.setAttribute('uv',g.attributes.grossUV.clone());return g;
  }
  function prism(parent,id,points,h,x,y,z,slot='trim'){
    return mesh(parent,id,cached(['prism',h,JSON.stringify(points)].join('/'),()=>prismGeometry(points,h)),slot,[x,y,z],{form:'prism'});
  }
  function profile(parent,id,points,depth,x,y,z,slot='trim'){
    const key=['profile',depth,JSON.stringify(points)].join('/');
    const g=cached(key,()=>{const s=new T.Shape(points.map(p=>new T.Vector2(...p))),g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:16});g.translate(0,0,-depth/2);return flatMetricUV(g);});
    return mesh(parent,id,g,slot,[x,y,z],{form:'profile'});
  }
  function arch(parent,id,r,width,depth,x,y,z,slot='trim',rise=r){
    const points=[],n=20;for(let i=0;i<=n;i++){const a=Math.PI*i/n;points.push([(r+width)*Math.cos(a),(rise+width)*Math.sin(a)]);}for(let i=n;i>=0;i--){const a=Math.PI*i/n;points.push([r*Math.cos(a),rise*Math.sin(a)]);}
    return profile(parent,id,points,depth,x,y,z,slot);
  }
  function hip(parent,id,w,d,rise,x,y,z,slot='roof'){
    const key=['hip',w,d,rise].join('/');
    const g=cached(key,()=>{const a=[-w/2,0,-d/2],b=[w/2,0,-d/2],c=[w/2,0,d/2],e=[-w/2,0,d/2],ridge=Math.max(0,(w-d)/2),l=[-ridge,rise,0],r=[ridge,rise,0],p=[];
      const tri=(a,b,c)=>{if(new T.Vector3(...b).sub(new T.Vector3(...a)).cross(new T.Vector3(...c).sub(new T.Vector3(...a))).lengthSq()>1e-12)p.push(...a,...b,...c);};
      tri(a,l,r);tri(a,r,b);tri(e,c,r);tri(e,r,l);tri(a,e,l);tri(b,r,c);tri(a,b,c);tri(a,c,e);
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();
      // Roof UVs are orthonormal surface metres, including the slope distance.
      const pos=g.attributes.position,normal=g.attributes.normal,uv=[];
      for(let i=0;i<pos.count;i++){const n=new T.Vector3().fromBufferAttribute(normal,i),u=new T.Vector3(n.y,-n.x,0).normalize(),v=new T.Vector3().crossVectors(n,u),point=new T.Vector3().fromBufferAttribute(pos,i);uv.push(point.dot(u),point.dot(v));}
      g.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));g.setAttribute('uv',g.attributes.grossUV.clone());return g;});
    return mesh(parent,id,g,slot,[x,y,z],{form:'hip'});
  }
  function group(parent,id,position=[0,0,0],rotation=0,extra={}){const g=new T.Group();g.name=id;g.userData={componentId:id,...extra};g.position.fromArray(position);g.rotation.y=rotation;parent.add(g);components.push(id);return g;}
  const balusterProfile=[[0,0],[.12,0],[.12,.08],[.075,.12],[.105,.26],[.095,.37],[.055,.5],[.065,.66],[.12,.72],[.12,.8],[0,.8]];
  const urnProfile=[[0,0],[.22,0],[.22,.12],[.13,.2],[.14,.3],[.35,.45],[.4,.65],[.35,.8],[.25,.87],[.35,.91],[.35,1],[0,1]];
  function rail(parent,id,a,b,base,height=1.1,spacing=.68){
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=-Math.atan2(b[1]-a[1],b[0]-a[0]),g=group(parent,id,[(a[0]+b[0])/2,0,(a[1]+b[1])/2],angle),n=Math.max(1,Math.floor(len/spacing));
    box(g,id+'/base',len,.16,.25,0,base+.08,0);
    const posts=Math.max(1,Math.round(len/3.5)),step=len/posts;
    for(let i=0;i<posts;i++)box(g,id+'/cap-'+i,step-.42,.16,.29,-len/2+(i+.5)*step,base+height-.08,0);
    for(let i=0;i<n;i++){const x=-len/2+(i+.5)*len/n,nearest=-len/2+Math.round((x+len/2)/step)*step;if(Math.abs(x-nearest)>.23)lathe(g,id+'/baluster-'+i,balusterProfile,x,base+.16,0);}
    g.updateWorldMatrix(true,false);
    for(let i=0;i<=posts;i++){
      const x=-len/2+i*step,point=new T.Vector3(x,base+height/2,0).applyMatrix4(g.matrixWorld),key=point.toArray().map(q).join('/')+'/'+height;
      if(railPosts.has(key))continue;railPosts.add(key);box(g,id+'/pier-'+i,.42,height,.42,x,base+height/2,0);
    }
    return g;
  }
  function urn(parent,id,x,y,z){return lathe(parent,id,urnProfile,x,y,z);}
  function finalize(root){
    // Fuse only authored infill in its face coordinates; native modules retain
    // their original geometry and are instanced, never resized or baked.
    const initial=[...meshes],byFace=new Map();
    for(const m of initial)if(m.userData.form==='explicit-infill'){
      if(!byFace.has(m.parent))byFace.set(m.parent,[]);byFace.get(m.parent).push(m);
    }
    for(const [parent,parts] of byFace){
      const arrays={position:[],normal:[],uv:[],grossUV:[]},ranges=[];
      for(const m of parts){const g=m.geometry,p=g.attributes.position,index=g.index,start=arrays.position.length/3;
        for(let i=0;i<(index?.count||p.count);i++){
          const k=index?index.getX(i):i;
          for(const name of Object.keys(arrays)){const a=g.attributes[name];for(let j=0;j<a.itemSize;j++)arrays[name].push(a.array[k*a.itemSize+j]+(name==='position'?m.position.getComponent(j):0));}
        }
        ranges.push({id:m.name,start,count:arrays.position.length/3-start});m.removeFromParent();meshes.splice(meshes.indexOf(m),1);
      }
      const g=new T.BufferGeometry();for(const [name,a] of Object.entries(arrays))g.setAttribute(name,new T.Float32BufferAttribute(a,name==='position'||name==='normal'?3:2));g.computeBoundingBox();g.computeBoundingSphere();
      geometries.set('merged/'+parent.name,g);mesh(parent,parent.name+'/infill-assembly',g,'facade',[0,0,0],{form:'infill-assembly',parts:ranges});
    }
    root.updateMatrixWorld(true);const repeats=new Map();
    for(const m of meshes){const key=m.geometry.uuid+'/'+m.userData.appearanceSlot;if(!repeats.has(key))repeats.set(key,[]);repeats.get(key).push(m);}
    const instances=[];let n=0;
    for(const parts of repeats.values())if(parts.length>1){
      const first=parts[0],batch=new T.InstancedMesh(first.geometry,first.material,parts.length);batch.name='instances/'+first.userData.appearanceSlot+'/'+n++;batch.castShadow=batch.receiveShadow=true;
      batch.userData={componentId:batch.name,appearanceSlot:first.userData.appearanceSlot,parts:parts.map(m=>({id:m.name,...m.userData}))};
      for(let i=0;i<parts.length;i++){batch.setMatrixAt(i,parts[i].matrixWorld);parts[i].removeFromParent();meshes.splice(meshes.indexOf(parts[i]),1);}
      batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();root.add(batch);meshes.push(batch);instances.push(batch);
    }
    const used=new Set(meshes.map(m=>m.geometry));for(const [key,g] of geometries)if(!used.has(g)){g.dispose();geometries.delete(key);}
    return {instances,sourceParts:initial.length,nativeWalls:initial.filter(m=>m.userData.form==='native-wall').length,nativeDoors:initial.filter(m=>m.userData.form==='native-door').length};
  }
  return {geometries,meshes,components,columns,finalize,box,cylinder,lathe,prism,profile,arch,hip,group,rail,urn,balusterProfile};
}
