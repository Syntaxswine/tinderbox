import {compileWindowBay} from './index.js';
import {surfacePixels} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js';

const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub = (a,b) => a.map((v,i) => v-b[i]);

function boxGeometry(T, part) {
  const half = part.size.map(v => v/2), r = part.bevel, positions = [], normals = [], uvs = [];
  const face = points => {
    const center = points[0].map((_,i) => points.reduce((sum,p) => sum+p[i],0)/points.length);
    let n = cross(sub(points[1],points[0]),sub(points[2],points[0]));
    if (n.reduce((sum,v,i) => sum+v*center[i],0) < 0) {points.reverse();n = n.map(v => -v);}
    const len = Math.hypot(...n);n = n.map(v => v/len);
    const axis = Math.abs(n[1]) > .7 ? 1 : Math.abs(n[0]) > .7 ? 0 : 2;
    for (let i=1; i<points.length-1; i++) for (const p of [points[0],points[i],points[i+1]]) {
      const world = p.map((v,j) => v+part.center[j]);positions.push(...world);normals.push(...n);
      // One repeat per metre; masonry phase continues across sill and piers.
      uvs.push(...(axis===1 ? [world[0],world[2]] : axis===0 ? [world[2],world[1]] : [world[0],world[1]]));
    }
  };
  for (let axis=0; axis<3; axis++) for (const sign of [-1,1]) {
    const a=(axis+1)%3,b=(axis+2)%3,points=[];
    for (const [sa,sb] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
      const p=[0,0,0];p[axis]=sign*half[axis];p[a]=sa*(half[a]-r);p[b]=sb*(half[b]-r);points.push(p);
    }
    face(points);
  }
  if (r) {
    for (let axis=0; axis<3; axis++) {
      const a=(axis+1)%3,b=(axis+2)%3;
      for (const sa of [-1,1]) for (const sb of [-1,1]) {
        const points=[];
        for (const [end,t] of [[-1,0],[1,0],[1,1],[-1,1]]) {
          const p=[0,0,0];p[axis]=end*(half[axis]-r);p[a]=sa*(half[a]-(t?r:0));p[b]=sb*(half[b]-(t?0:r));points.push(p);
        }
        face(points);
      }
    }
    for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1]) face([
      [x*half[0],y*(half[1]-r),z*(half[2]-r)],
      [x*(half[0]-r),y*half[1],z*(half[2]-r)],
      [x*(half[0]-r),y*(half[1]-r),z*half[2]]
    ]);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

// The caller supplies the same Three instance used by its scene. Injected
// materials and textures are borrowed; only defaults are owned by this model.
export function createWindowBayModel(T, id, {wall='wood',finish='painted',materials={}}={}) {
  if (!T?.BufferGeometry || !['wood','brick','concrete'].includes(wall) || !['painted','clay'].includes(finish)) throw Error('Supply the host Three.js instance and a supported window finish.');
  const sculpture=compileWindowBay(id),owned=new Set(),textures=new Set(),palette=new Map();
  for (const [kind,color] of [['wall',0xffffff],['trim',0xd8cdb5],['sash',0x526a5e],['brass',0xa88a4f],['glass',0x9dbbb5]]) {
    if (materials[kind]) {palette.set(kind,materials[kind]);continue;}
    let map=null;
    if (kind==='wall' && finish==='painted') {
      const p=surfacePixels(wall);map=new T.DataTexture(p.data,p.width,p.height);map.colorSpace=T.SRGBColorSpace;
      map.wrapS=map.wrapT=T.RepeatWrapping;map.needsUpdate=true;textures.add(map);
    }
    const material=new T.MeshStandardMaterial({color:finish==='clay' ? kind==='glass'?0x7e9291:0xb8b4a9 : color,
      map,roughness:kind==='glass'?.22:kind==='brass'?.5:.92,metalness:kind==='brass'?.45:0,
      transparent:kind==='glass',opacity:kind==='glass'?.3:1,depthWrite:kind!=='glass',side:kind==='glass'?T.DoubleSide:T.FrontSide});
    owned.add(material);palette.set(kind,material);
  }
  const root=new T.Group();root.name=sculpture.name;
  root.userData={assetId:id,format:sculpture.format,metresPerUnit:1,consumerIntegrated:false};
  const groups=new Map(),parts=new Map(),panes=[];
  for (const part of sculpture.parts) {
    if (!groups.has(part.group)) {const group=new T.Group();group.name=part.group;root.add(group);groups.set(part.group,group);}
    const mesh=new T.Mesh(boxGeometry(T,part),palette.get(part.material));mesh.name=part.name;
    mesh.userData={part:part.name,group:part.group,material:part.material};mesh.castShadow=part.material!=='glass';mesh.receiveShadow=true;
    groups.get(part.group).add(mesh);parts.set(part.group+':'+part.name,mesh);if(part.material==='glass')panes.push(mesh);
  }
  root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),bounds={min:box.min.toArray(),max:box.max.toArray()};
  let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=o.geometry.attributes.position.count/3;});
  let disposed=false;
  return {root,sculpture,parts,groups,panes,materials:palette,bounds,triangles,
    setView({sashes=true,glass=true,walls=true}={}) {
      groups.get('walls').visible=walls;for(const key of ['lower-sash','upper-sash'])groups.get(key).visible=sashes;
      for(const pane of panes)pane.visible=glass;
    },
    dispose() {if(disposed)return;disposed=true;for(const mesh of parts.values())mesh.geometry.dispose();for(const material of owned)material.dispose();for(const texture of textures)texture.dispose();root.removeFromParent();}
  };
}
