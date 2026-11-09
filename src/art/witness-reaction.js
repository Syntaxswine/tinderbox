import {Resources} from './resources.js';

const signs = {
  suspicious: {glyph: '?', color: '#ffc167', size: .82},
  alarmed: {glyph: '!', color: '#ff6956', size: 1.05}
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
  const root = new T.Sprite(materials.get('suspicious'));
  root.name = 'Bell & Alder witness reaction';
  root.renderOrder = 7;
  return {
    root,
    update(actor, reaction) {
      const sign = signs[reaction?.kind];
      root.visible = !!sign && actor?.hp > 0;
      if (!root.visible) return;
      root.material = materials.get(reaction.kind);
      root.position.set(actor.x, actor.height + .52, actor.y);
      root.scale.setScalar(sign.size);
    },
    dispose() { root.removeFromParent(); pool.dispose(); }
  };
}
