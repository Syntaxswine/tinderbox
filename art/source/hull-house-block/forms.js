// Original Tinderbox sculpting helpers. Metre UVs and owned, batched geometry.
export function makeSculpt(T, root, materials, seed = 1893) {
  const geometries = new Set(), pending = new Map(), contacts = new Map();
  const hash = s => { let h = seed; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
  function group(name, parent = root, position = [0, 0, 0], yaw = 0) {
    const g = new T.Group(); g.name = name; g.position.fromArray(position); g.rotation.y = yaw; parent.add(g); return g;
  }
  function add(parent, name, geometry, slot, position = [0, 0, 0], quaternion, preserveUV = false) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    const m = new T.Matrix4().compose(new T.Vector3(...position), quaternion || new T.Quaternion(), new T.Vector3(1, 1, 1));
    g.applyMatrix4(m); g.computeVertexNormals();
    const sourceUV = preserveUV ? g.attributes.uv : null;
    const p = g.attributes.position, n = g.attributes.normal, uv = [], colors = [], shade = .84 + .27 * hash(name);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
      if (sourceUV) uv.push(sourceUV.getX(i),sourceUV.getY(i));
      else if (slot === 'roof') {
        const normal = new T.Vector3(n.getX(i),n.getY(i),n.getZ(i)),u = new T.Vector3(0,0,1);
        if(Math.abs(normal.z)>.95)u.set(1,0,0);
        u.addScaledVector(normal,-u.dot(normal)).normalize();
        const v = normal.clone().cross(u),point=new T.Vector3(x,y,z);
        uv.push(point.dot(u),point.dot(v));
      } else if (ny >= nx && ny >= nz) uv.push(x, z); else if (nz >= nx) uv.push(x, y); else uv.push(z, y);
      const v = shade * (.965 + .035 * Math.sin(x * 59.7 + y * 43.3 + z * 67.1)); colors.push(v, v, v);
    }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    if (!pending.has(parent)) pending.set(parent, new Map());
    const slots = pending.get(parent); if (!slots.has(slot)) slots.set(slot, []); slots.get(slot).push(g);
  }
  function box(parent, name, size, position, slot = 'timber', yaw = 0) {
    add(parent, name, new T.BoxGeometry(...size), slot, position, new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw));
  }
  function profile(parent, name, points, depth, position, slot) {
    const shape = new T.Shape(points.map(p => new T.Vector2(...p)));
    const g = new T.ExtrudeGeometry(shape, {depth, bevelEnabled: false, steps: 1, curveSegments: 16});
    g.translate(0, 0, -depth / 2); add(parent, name, g, slot, position);
  }
  function beam(parent, name, a, b, width, depth, slot = 'timber') {
    const v = new T.Vector3(...b).sub(new T.Vector3(...a));
    add(parent, name, new T.BoxGeometry(width, v.length(), depth), slot, a.map((x, i) => (x + b[i]) / 2),
      new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()));
  }
  function cylinder(parent, name, top, bottom, height, position, slot, segments = 12) {
    add(parent, name, new T.CylinderGeometry(top, bottom, height, segments), slot, position);
  }
  function sphere(parent, name, size, position, slot) {
    const g = new T.SphereGeometry(1, 12, 8); g.scale(...size); add(parent, name, g, slot, position);
  }
  function surface(parent, name, points, slot, indices) {
    const g = new T.BufferGeometry(), triangles = [], is = indices || points.slice(1, -1).flatMap((_, i) => [0, i + 1, i + 2]);
    for (const i of is) triangles.push(...points[i]);
    g.setAttribute('position', new T.Float32BufferAttribute(triangles, 3)); add(parent, name, g, slot);
  }
  function finalize() {
    root.updateMatrixWorld(true);
    const batched = new Map();
    for (const [parent, slots] of pending) {
      let top = parent; while (top.parent && top.parent !== root) top = top.parent;
      const matrix = new T.Matrix4().copy(top.matrixWorld).invert().multiply(parent.matrixWorld);
      if (!batched.has(top)) batched.set(top, new Map());
      for (const [slot, gs] of slots) {
        if (!batched.get(top).has(slot)) batched.get(top).set(slot, []);
        for (const g of gs) { g.applyMatrix4(matrix); batched.get(top).get(slot).push(g); }
      }
    }
    for (const [parent, slots] of batched) for (const [slot, gs] of slots) {
      if (!contacts.has(parent)) contacts.set(parent, []);
      const plane = root.position.y, inverse = parent.matrixWorld.clone().invert();
      for (const g of gs) {
        const pts = [], p = g.attributes.position, a = new T.Vector3(), c = new T.Vector3();
        for (let i = 0; i < p.count; i += 3) for (let j = 0; j < 3; j++) {
          a.fromBufferAttribute(p, i + j).applyMatrix4(parent.matrixWorld);
          c.fromBufferAttribute(p, i + (j + 1) % 3).applyMatrix4(parent.matrixWorld);
          if (Math.abs(a.y - plane) < 1e-7) pts.push([a.x, a.z]);
          if ((a.y - plane) * (c.y - plane) < 0) { const t=(plane-a.y)/(c.y-a.y); pts.push([a.x+t*(c.x-a.x),a.z+t*(c.z-a.z)]); }
        }
        const sorted = [...new Map(pts.map(p=>[p.map(n=>n.toFixed(6)).join('/'),p])).values()].sort((a,c)=>a[0]-c[0]||a[1]-c[1]);
        if(sorted.length<3)continue;
        const cross=(o,a,c)=>(a[0]-o[0])*(c[1]-o[1])-(a[1]-o[1])*(c[0]-o[0]);
        const hull=[];
        for(const p of sorted){while(hull.length>1&&cross(hull.at(-2),hull.at(-1),p)<=1e-10)hull.pop();hull.push(p);}
        const lower=hull.length;
        for(const p of [...sorted].reverse().slice(1)){while(hull.length>lower&&cross(hull.at(-2),hull.at(-1),p)<=1e-10)hull.pop();hull.push(p);}
        hull.pop();if(hull.length<3)continue;
        contacts.get(parent).push(hull.map(([x,z])=>new T.Vector3(x,plane,z).applyMatrix4(inverse).toArray()));
      }
      const merged = new T.BufferGeometry();
      for (const [key, size] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
        const array = new Float32Array(gs.reduce((n, g) => n + g.attributes[key].array.length, 0)); let offset = 0;
        for (const g of gs) { array.set(g.attributes[key].array, offset); offset += g.attributes[key].array.length; }
        merged.setAttribute(key, new T.BufferAttribute(array, size));
      }
      merged.computeBoundingBox(); merged.computeBoundingSphere(); geometries.add(merged);
      const mesh = new T.Mesh(merged, materials[slot]); mesh.name = parent.name + '/' + slot; mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
      for (const g of gs) g.dispose();
    }
    pending.clear();
  }
  return {group, add, box, profile, beam, cylinder, sphere, surface, finalize, hash,
    dispose() { for (const slots of pending.values()) for (const gs of slots.values()) for (const g of gs) g.dispose(); pending.clear(); for (const g of geometries) g.dispose(); geometries.clear(); contacts.clear(); },
    contactFootprints: parent => {
      const polygons=(contacts.get(parent)||[]).map(poly=>poly.map(p=>new T.Vector3(...p).applyMatrix4(parent.matrixWorld).toArray()));
      const area=p=>p.reduce((n,a,i)=>{const c=p[(i+1)%p.length];return n+a[0]*c[2]-a[2]*c[0];},0);
      const inside=(p,q)=>{const sign=Math.sign(area(q));return q.every((a,i)=>{const c=q[(i+1)%q.length];return sign*((c[0]-a[0])*(p[2]-a[2])-(c[2]-a[2])*(p[0]-a[0]))>=-1e-7;});};
      // Remove contacts wholly covered by a larger contact from the same part.
      // Separate trough feet remain separate; no convex bridge is added between them.
      return polygons.filter((p,i)=>!polygons.some((q,j)=>j!==i&&(Math.abs(area(q))>Math.abs(area(p))+1e-7||j<i)&&p.every(v=>inside(v,q))));
    },
    resources: () => [...geometries]};
}
