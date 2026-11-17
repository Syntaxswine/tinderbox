import {inside} from '../runtime/place-navigation.js';

// The landmark's existing native terrain polygons and water rectangle. No full
// tile raster or new grass plane replaces these source boundaries.
export function createSourceTerrain(T,{navigation,manifest}){
  const root=new T.Group(),geometries=new Set(),materials=new Set();root.name='Native source terrain';
  const ground=new T.MeshStandardMaterial({color:0x878365,roughness:1,side:T.DoubleSide});materials.add(ground);
  for(const surface of navigation.surfaces.filter(s=>s.terrain))for(const polygon of surface.polygons){
    const shape=new T.Shape(polygon.map(p=>new T.Vector2(p[0],-p[1])));for(const hole of surface.holes||[])if(inside({x:hole[0][0],y:hole[0][1]},polygon))shape.holes.push(new T.Path(hole.map(p=>new T.Vector2(p[0],-p[1]))));
    const geometry=new T.ShapeGeometry(shape),mesh=new T.Mesh(geometry,ground);geometries.add(geometry);mesh.rotation.x=-Math.PI/2;mesh.position.y=surface.height;mesh.receiveShadow=true;root.add(mesh);
  }
  if(manifest.water){const w=manifest.water,geometry=new T.PlaneGeometry(w.width,w.depth),material=new T.MeshStandardMaterial({color:0x49696a,roughness:.5,metalness:.15}),mesh=new T.Mesh(geometry,material);geometries.add(geometry);materials.add(material);mesh.rotation.x=-Math.PI/2;mesh.position.set(w.x,w.height,w.y);root.add(mesh);}
  return {root,diagnostics:()=>({geometries:geometries.size,materials:materials.size}),dispose(){root.removeFromParent();root.clear();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();}};
}
