import {Resources} from './resources.js';

export const CHICAGO_1893_BEAT = Object.freeze({
  id: 'chicago-1893-city-beat',
  species: 'goat',
  nativeSourceCommit: '30a3b8cae5f36bb0c1df3685b7fba16f701c2083',
  pieces: Object.freeze(['helmet', 'coat', 'trousers', 'footwear', 'belt', 'badge'])
});

const SHIRT = 'connected shirt and sleeves';
const LEGS = 'connected overalls seat and legs';
const SIDES = [-1, 1];

// Horizontal rings are cut in the native bind space. Theta zero faces +X.
function loft(T, rows, steps, locate) {
  const positions = [], indices = [];
  for (const [row, ring] of rows.entries()) {
    for (let j = 0; j <= steps; j++) {
      positions.push(...locate(ring, j / steps));
      if (row === 0 || j === steps) continue;
      const lower = (row - 1) * (steps + 1) + j, upper = lower + steps + 1;
      indices.push(lower, upper, lower + 1, lower + 1, upper, upper + 1);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function profile(ring, angle) {
  const [y, x, front, side] = ring;
  return [x + front * Math.cos(angle), y, side * Math.sin(angle)];
}

function dye(T, geometry, amount) {
  const points = geometry.getAttribute('position'), shades = new Float32Array(points.count * 3);
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
    const grain = Math.sin(x * 102.7 + y * 76.3) * Math.sin(z * 109.9 - y * 52.1);
    const tone = .96 + grain * amount;
    shades.set([tone, tone, tone], i * 3);
  }
  geometry.setAttribute('color', new T.BufferAttribute(shades, 3));
}

function weight(T, geometry, at) {
  const pos = geometry.getAttribute('position'), indices = new Uint16Array(pos.count * 4), weights = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    for (const [slot, [bone, amount]] of at(pos.getY(i)).entries()) {
      indices[i * 4 + slot] = bone;
      weights[i * 4 + slot] = amount;
    }
  }
  geometry.setAttribute('skinIndex', new T.BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new T.BufferAttribute(weights, 4));
}

function retainedTriangles(geometry, keep) {
  const pos = geometry.getAttribute('position'), input = geometry.getIndex().array, selected = [];
  for (let i = 0; i < input.length; i += 3) {
    const a = input[i], b = input[i + 1], c = input[i + 2];
    if ([a, b, c].every(vertex => keep(pos.getY(vertex)))) selected.push(a, b, c);
  }
  geometry.setIndex(selected);
}

function sleeve(source, side) {
  const geometry = source.geometry.clone(), p = geometry.getAttribute('position');
  retainedTriangles(geometry, y => y >= .767);
  // A few millimetres of cloth over the same weighted arm leaves the bare hand below the cuff.
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = Math.max(0, Math.min(1, (y - .77) / .24));
    const x = .058 - t * .037, z = side * (.355 - t * .011);
    p.setXYZ(i, x + (p.getX(i) - x) * 1.12, y, z + (p.getZ(i) - z) * 1.12);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// A single indexed draw is unnecessary for the little pieces of hardware.
function mergeDetails(T, parts) {
  const positions = [], normals = [];
  for (const part of parts) {
    const flat = part.index ? part.toNonIndexed() : part;
    positions.push(...flat.getAttribute('position').array);
    normals.push(...flat.getAttribute('normal').array);
    if (flat !== part) flat.dispose();
    part.dispose();
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  return geometry;
}

export function createChicago1893BeatUniform(T, civilian) {
  const actor = civilian?.root;
  if (actor?.userData.species !== CHICAGO_1893_BEAT.species) throw Error('The Chicago beat uniform is fitted to the native goat.');
  if (actor.getObjectByName(CHICAGO_1893_BEAT.id)) throw Error('This civilian is already wearing the Chicago beat uniform.');
  const shirt = actor.getObjectByName(SHIRT), trousers = actor.getObjectByName(LEGS);
  const arms = SIDES.map(side => actor.getObjectByName('forearm and hand ' + side));
  const hooves = SIDES.map(side => actor.getObjectByName('exposed cloven hoof ' + side));
  const native = [shirt, trousers, ...arms, ...hooves], skeleton = shirt?.skeleton;
  if (!skeleton || native.some(mesh => !mesh?.isSkinnedMesh || mesh.skeleton !== skeleton)) {
    throw Error('The Chicago beat uniform needs the pinned goat clothing meshes and shared skeleton.');
  }

  const pool = new Resources(), root = new T.Group();
  root.name = CHICAGO_1893_BEAT.id;
  const pieces = Object.freeze(Object.fromEntries(CHICAGO_1893_BEAT.pieces.map(name => {
    const group = new T.Group();
    group.name = name;
    root.add(group);
    return [name, group];
  })));
  const replaced = new Map([['coat', [shirt]], ['trousers', [trousers]], ['footwear', hooves]]);
  const originalVisibility = new Map([...replaced.values()].flat().map(mesh => [mesh, mesh.visible]));
  const boneIndex = name => skeleton.bones.findIndex(bone => bone.name === name);
  const hips = boneIndex('hips'), spine = boneIndex('spine'), head = boneIndex('head');
  const thighs = SIDES.map(side => boneIndex('thigh' + side)), elbows = SIDES.map(side => boneIndex('forearm' + side));
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const [mesh, visible] of originalVisibility) mesh.visible = visible;
    root.removeFromParent();
    Object.values(pieces).forEach(group => group.clear());
    root.clear();
    pool.dispose();
  }

  try {
    if ([hips, spine, head, ...thighs, ...elbows].some(i => i < 0)) throw Error('Missing native uniform fitting bone.');
    const wool = color => pool.material(new T.MeshStandardMaterial({color, roughness:.92, vertexColors:true, side:T.DoubleSide}));
    const coat = wool(0x31455c), collar = wool(0x26384b), pant = wool(0x2a3b50), felt = wool(0x34485c);
    const leather = wool(0x24282c);
    const brass = pool.material(new T.MeshStandardMaterial({color:0xb7955b, metalness:.24, roughness:.49}));
    const silver = pool.material(new T.MeshStandardMaterial({color:0xcbd3d6, metalness:.27, roughness:.43}));
    const engraving = pool.material(new T.MeshStandardMaterial({color:0x4e5860, roughness:.86}));

    function add(piece, geometry, material, label, at) {
      pool.geometry(geometry);
      if (at) weight(T, geometry, at);
      if (material.vertexColors) dye(T, geometry, .05);
      const mesh = new T.SkinnedMesh(geometry, material);
      mesh.name = label;
      mesh.frustumCulled = false;
      mesh.castShadow = mesh.receiveShadow = true;
      pieces[piece].add(mesh);
      mesh.bind(skeleton, shirt.bindMatrix);
    }
    const rigid = bone => () => [[bone, 1]];
    const torsoWeight = y => {
      const upper = Math.max(0, Math.min(1, (y - .89) / .22));
      return [[hips, 1 - upper], [spine, upper]];
    };
    const closed = (rows, steps = 32) => loft(T, rows, steps, (r, u) => profile(r, 2 * Math.PI * u));
    const box = (size, at) => new T.BoxGeometry(...size).translate(...at);

    add('coat', shirt.geometry.clone(), coat, 'Fitted frock shoulders and upper sleeves');
    for (const [i, side] of SIDES.entries()) {
      add('coat', sleeve(arms[i], side), coat, 'Weighted forearm wool ' + side);
      const cuff = loft(T, [[.774, .056, .070, .067], [.805, .051, .074, .072]], 18,
        (r, u) => { const p = profile(r, 2 * Math.PI * u); p[2] += side * .355; return p; });
      add('coat', cuff, collar, 'Turned cuff ' + side, rigid(elbows[i]));
      const skirt = loft(T, [
        [.596, -.037, .178, .292, .35], [.660, -.040, .192, .289, .24],
        [.745, -.036, .193, .275, .15], [.834, -.029, .171, .234, .08],
        [.912, -.023, .142, .198, .01], [.965, -.022, .134, .177, 0]
      ], 20, (r, u) => {
        const a = r[4] + (Math.PI - 1.7 * r[4]) * u, p = profile(r, side * a);
        p[1] += r[4] * .12 * Math.abs(Math.cos(a));
        return p;
      });
      add('coat', skirt, coat, 'Parted frock skirt ' + side, y => {
        const leg = Math.max(0, Math.min(.60, (.90 - y) * 2.12));
        const upper = Math.max(0, (y - .91) * 1.4);
        return [[hips, 1 - leg - upper], [thighs[i], leg], [spine, upper]];
      });
    }
    add('coat', closed([[1.267, -.035, .098, .098], [1.309, -.041, .088, .089]], 26),
      collar, 'Standing collar', rigid(spine));
    const buttons = [];
    for (const z of [-.059, .059]) for (const [y, x] of [[.963,.114],[1.016,.119],[1.072,.122],[1.128,.115],[1.184,.106],[1.232,.091]]) {
      buttons.push(new T.SphereGeometry(.012, 8, 4).scale(.40, 1, 1).translate(x, y, z));
    }
    add('coat', mergeDetails(T, buttons), brass, 'Two rows of period buttons', torsoWeight);

    const legGeometry = trousers.geometry.clone();
    retainedTriangles(legGeometry, y => y <= .957);
    add('trousers', legGeometry, pant, 'Plain trousers using the native leg weights');
    for (const hoof of hooves) add('footwear', hoof.geometry.clone(), leather, 'Black leather cloven footwear');

    add('belt', closed([[.890, -.021, .153, .212], [.935, -.021, .152, .204]]), leather, 'Black waist belt', torsoWeight);
    add('belt', box([.010, .033, .056], [.133, .914, 0]), brass, 'Buckle plate', torsoWeight);
    add('belt', box([.005, .015, .032], [.140, .914, 0]), engraving, 'Buckle inset', torsoWeight);

    const star = new T.Shape();
    for (let i = 0; i < 12; i++) {
      const angle = Math.PI / 2 + Math.PI * i / 6, radius = i % 2 ? .025 : .041;
      star[i ? 'lineTo' : 'moveTo'](radius * Math.cos(angle), radius * Math.sin(angle));
    }
    star.closePath();
    add('badge', new T.ExtrudeGeometry(star, {depth:.004, bevelEnabled:false})
      .rotateY(Math.PI / 2).translate(.114, 1.147, -.114), silver, 'Six-point municipal breast star', torsoWeight);
    add('badge', new T.CircleGeometry(.013, 16).rotateY(Math.PI / 2).translate(.119, 1.147, -.114),
      engraving, 'Recessed center of the star', torsoWeight);

    // The back of the crown tapers ahead of the goat's swept horns. The rim
    // rises at the back and over the native ears without moving their bones.
    const crown = loft(T, [
      [1.526,.043,.086,.092], [1.550,.040,.087,.090], [1.584,.038,.076,.078],
      [1.620,.035,.052,.056], [1.643,.031,.023,.027], [1.647,.030,.001,.001]
    ], 32, (r, u) => {
      const a = 2 * Math.PI * u, p = profile(r, a);
      p[1] += Math.max(0, 1.580 - r[0]) * .24 * Math.max(0, -Math.cos(a));
      return p;
    });
    add('helmet', crown, felt, 'Rounded patrol helmet', rigid(head));
    add('helmet', closed([[1.521,.044,.087,.093], [1.538,.044,.088,.092]], 32), collar, 'Helmet band', rigid(head));
    const visor = loft(T, [[1.526,.048,.087,.093],[1.505,.052,.125,.109]], 22,
      (r, u) => profile(r, (u - .5) * 2.67));
    add('helmet', visor, leather, 'Short black helmet brim', rigid(head));
    add('helmet', new T.CircleGeometry(.019, 16).rotateY(Math.PI / 2).translate(.125, 1.565, 0),
      silver, 'Number tablet', rigid(head));
    add('helmet', mergeDetails(T, [
      box([.002,.016,.003], [.126,1.563,-.004]), box([.002,.003,.013], [.126,1.571,.002]),
      box([.002,.015,.003], [.126,1.563,.008])
    ]), engraving, 'Simplified number marks', rigid(head));

    shirt.parent.add(root);
    for (const mesh of originalVisibility.keys()) mesh.visible = false;
  } catch (error) {
    dispose();
    throw error;
  }

  function setPieceVisible(name, visible) {
    if (disposed || !Object.hasOwn(pieces, name) || typeof visible !== 'boolean') throw Error('Invalid uniform piece state.');
    pieces[name].visible = visible;
    for (const mesh of replaced.get(name) ?? []) mesh.visible = !visible && originalVisibility.get(mesh);
  }

  return {
    root, pieces, setPieceVisible, dispose,
    diagnostics: () => ({
      id: CHICAGO_1893_BEAT.id, disposed, species: CHICAGO_1893_BEAT.species,
      pieces: Object.fromEntries(Object.entries(pieces).map(([name, group]) => [name, group.visible])),
      triangles: Object.values(pieces).flatMap(group => group.children).reduce((sum, mesh) =>
        sum + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0)
    })
  };
}
