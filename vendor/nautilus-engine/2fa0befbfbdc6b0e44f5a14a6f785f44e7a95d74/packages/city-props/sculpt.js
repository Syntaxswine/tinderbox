import {TRIM_PAINTS, TRIM_COLUMNS, TRIM_ROWS} from './trim-paint.js';

// Continuous turnings and bevels share their control points across both mesh densities.
export const PAINTS = Object.freeze({
  walnut: 0, ebony: 1, oak: 2, sage: 3, wine: 4, olive: 5, ticking: 6, marble: 7,
  brass: 8, iron: 9, paper: 10, bottle: 11, canvas: 12, leather: 13, ceramic: 14, blue: 15
});
export const FINISHES = Object.freeze(['paint', 'trim', 'glass', 'store-glass', 'amber', 'mirror', 'flame']);
const empty = () => ({positions: [], normals: [], colors: [], uvs: [], indices: []});
const inset = .036; // Keep bilinear sampling inside the original swatches.

export class Sculpt {
  constructor(THREE, detail) {
    this.T = THREE;
    this.radial = detail === 'sculpt' ? 28 : 10;
    this.small = detail === 'sculpt' ? 20 : 8;
    this.bevel = detail === 'sculpt' ? 3 : 1;
    this.path = detail === 'sculpt' ? 18 : 8;
    this.parts = new Map();
  }

  add(geometry, paint, at = [0, 0, 0], {rotation, quaternion, shade = 1, grain = false, localUV = false} = {}) {
    const T = this.T;
    const isTrim = Object.hasOwn(TRIM_PAINTS, paint);
    const family = isTrim ? 'trim' : Object.hasOwn(PAINTS, paint) ? 'paint' : paint;
    if (!FINISHES.includes(family)) throw new Error('Unknown city finish: ' + paint);
    if (!this.parts.has(family)) this.parts.set(family, empty());
    const output = this.parts.get(family);
    const start = output.positions.length / 3;
    const q = quaternion ?? new T.Quaternion().setFromEuler(new T.Euler(...(rotation ?? [0, 0, 0])));
    const p = new T.Vector3(), n = new T.Vector3(), offset = new T.Vector3(...at);
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
    if (localUV) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const cell = (isTrim ? TRIM_PAINTS[paint] : PAINTS[paint]) ?? 0;
    const columns = isTrim ? TRIM_COLUMNS : 4;
    const rows = isTrim ? TRIM_ROWS : 4;
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i);
      n.fromBufferAttribute(normal, i);
      let u = uv.getX(i), v = uv.getY(i);
      if (localUV) {
        const x = Math.abs(n.x), y = Math.abs(n.y), z = Math.abs(n.z);
        const across = x > y && x > z ? 'z' : 'x';
        const along = y > x && y > z ? 'z' : 'y';
        u = (p[across] - box.min[across]) / Math.max(.001, box.max[across] - box.min[across]);
        v = (p[along] - box.min[along]) / Math.max(.001, box.max[along] - box.min[along]);
      }
      if (grain) [u, v] = [v, u];
      u = Math.min(1, Math.max(0, u));
      v = Math.min(1, Math.max(0, v));
      const tint = Array.isArray(shade) ? shade : [shade, shade, shade];
      output.positions.push(...p.applyQuaternion(q).add(offset).toArray());
      output.normals.push(...n.applyQuaternion(q).normalize().toArray());
      output.colors.push(...tint);
      output.uvs.push(
        (cell % columns + inset + u * (1 - 2 * inset)) / columns,
        1 - (Math.floor(cell / columns) + inset + (1 - v) * (1 - 2 * inset)) / rows
      );
    }
    const indices = geometry.getIndex();
    for (let i = 0; i < (indices?.count ?? position.count); i++) {
      output.indices.push(start + (indices ? indices.getX(i) : i));
    }
    geometry.dispose();
  }

  box(at, size, paint, options) {
    this.add(new this.T.BoxGeometry(...size), paint, at, options);
  }

  face(at, size, paint, options) {
    this.add(new this.T.PlaneGeometry(...size), paint, at, options);
  }

  // Chamfer a plate in XY, then extrude along Z. The stated dimensions include the bevel.
  soft(at, [w, h, d], paint, radius, options = {}) {
    const T = this.T;
    const r = Math.min(radius, w * .22, h * .22, d * .45);
    const x = w / 2 - r, y = h / 2 - r;
    const shape = new T.Shape().moveTo(-x, -y).lineTo(x, -y).lineTo(x, y).lineTo(-x, y).closePath();
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: this.bevel,
      curveSegments: 1
    });
    geometry.translate(0, 0, -d / 2 + r);
    this.add(geometry, paint, at, {...options, localUV: true});
  }

  plate(at, outline, depth, paint, {bevel = 0, ...options} = {}) {
    const T = this.T;
    const shape = new T.Shape().moveTo(...outline[0]);
    for (const point of outline.slice(1)) shape.lineTo(...point);
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, {depth: depth - 2 * bevel, bevelEnabled: bevel > 0,
      bevelSize: bevel, bevelThickness: bevel, bevelSegments: this.bevel, curveSegments: 1});
    geometry.translate(0, 0, -depth / 2 + bevel);
    this.add(geometry, paint, at, {...options, localUV: true});
  }

  turn(at, profile, paint, options = {}) {
    const T = this.T;
    const points = profile.map(([height, radius]) => new T.Vector2(radius, height));
    this.add(new T.LatheGeometry(points, options.small ? this.small : this.radial), paint, at, options);
  }

  rod(a, b, radius, paint, options) {
    const T = this.T;
    const from = new T.Vector3(...a), to = new T.Vector3(...b);
    const delta = to.clone().sub(from);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize());
    this.add(new T.CylinderGeometry(radius, radius, delta.length(), this.small), paint,
      from.add(to).multiplyScalar(.5).toArray(), {...options, quaternion: q});
  }

  sweep(points, radius, paint, options) {
    const T = this.T;
    const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    this.add(new T.TubeGeometry(path, this.path, radius, this.small, false), paint, [0, 0, 0], options);
  }

  ring(at, radius, wire, paint, options) {
    this.add(new this.T.TorusGeometry(radius, wire, this.small, this.radial), paint, at, options);
  }

  // Flat brush marks on a finished face keep incisions and labels readable from the editor camera.
  mark(a, b, z, width, paint, shade = 1) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const rotation = [0, 0, Math.atan2(b[1] - a[1], b[0] - a[0])];
    this.add(new this.T.PlaneGeometry(length, width), paint,
      [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], {rotation, shade});
  }

  geometry() {
    const T = this.T;
    return new Map([...this.parts].map(([finish, data]) => {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(data.positions, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(data.normals, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(data.colors, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(data.uvs, 2));
      geometry.setIndex(data.indices);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return [finish, geometry];
    }));
  }
}
