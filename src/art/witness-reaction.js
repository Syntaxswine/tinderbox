import {Resources} from './resources.js';

const signs = {
  suspicious: {glyph: '?', color: '#ffc167', size: .82},
  aggressive: {glyph: '!', color: '#ff6956', size: 1.05}
};

export function createWitnessReaction(T) {
  const pool = new Resources();
  const materials = new Map(Object.entries(signs).map(([kind, {glyph, color}]) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(64, 64, 53, 0, 2 * Math.PI);
    ctx.fillStyle = '#241913';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.stroke();
    ctx.font = 'bold 88px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, 64, 68);
    const map = pool.texture(new T.CanvasTexture(canvas));
    map.colorSpace = T.SRGBColorSpace;
    return [kind, pool.material(new T.SpriteMaterial({map, depthWrite: false, toneMapped: false}))];
  }));
  const root = new T.Group(), cue = new T.Sprite(materials.get('suspicious'));
  root.name = 'Bell & Alder officer reaction';
  cue.renderOrder = 7;
  const flash = new T.Mesh(pool.geometry(new T.ConeGeometry(.094, .23, 8).translate(0, .115, 0)),
    pool.material(new T.MeshBasicMaterial({color: 0xffe39d, transparent: true, depthWrite: false, toneMapped: false})));
  const trace = new T.Mesh(pool.geometry(new T.CylinderGeometry(.012, .018, 1, 6)),
    pool.material(new T.MeshBasicMaterial({color: 0xffc67a, transparent: true, depthWrite: false, toneMapped: false})));
  const from = new T.Vector3(), to = new T.Vector3(), direction = new T.Vector3(), up = new T.Vector3(0, 1, 0);
  root.add(cue, flash, trace);
  let kind, shotId;
  return {
    root,
    update(actor, reaction, shot, worldTime) {
      const sign = signs[reaction?.kind];
      cue.visible = !!sign && actor?.hp > 0;
      kind = cue.visible ? reaction.kind : null;
      if (cue.visible) {
        cue.material = materials.get(kind);
        cue.position.set(actor.x, actor.height + .52, actor.y);
        cue.scale.setScalar(sign.size);
      }
      const age = shot ? Math.max(0, worldTime - shot.worldTime) : Infinity;
      trace.visible = age < (shot?.duration ?? 0);
      flash.visible = age < .085;
      shotId = trace.visible ? shot.id : null;
      if (!trace.visible) return;
      from.set(shot.muzzle.x, shot.muzzle.h, shot.muzzle.y);
      to.set(shot.target.x, shot.target.h, shot.target.y);
      direction.subVectors(to, from);
      trace.scale.y = direction.length();
      trace.quaternion.setFromUnitVectors(up, direction.normalize());
      trace.position.copy(from).lerp(to, .5);
      trace.material.opacity = .86 * (1 - age / shot.duration);
      flash.position.copy(from);
      flash.quaternion.copy(trace.quaternion);
      flash.material.opacity = Math.max(0, 1 - age / .085);
    },
    diagnostics: () => ({cue: kind, shotId, flash: flash.visible, muzzle: shotId ? from.toArray() : null}),
    dispose() { root.removeFromParent(); pool.dispose(); }
  };
}
