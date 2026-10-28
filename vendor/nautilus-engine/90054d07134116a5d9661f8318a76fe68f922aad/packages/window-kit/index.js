import {WALL_KIT} from '../map-core/wall-runs.js';

const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze);Object.freeze(value);}
  return value;
};

export const WINDOW_KIT = freeze({
  version: 1, metresPerUnit: 1, wallWidth: WALL_KIT.panel,
  wallHeight: WALL_KIT.height, wallThickness: WALL_KIT.thickness,
  floorSpacing: WALL_KIT.floorSpacing, openingWidth: 1,
  frameWidth: .04, span: 2, segmentWidth: .5
});

export const WINDOW_BAYS = freeze([
  {id: 'window-bay-compact', name: 'Centered window · compact sash', bottom: .85, top: 1.55,
    columns: 2, rows: 1, description: 'A compact four-pane sash in the existing tactical window opening.'},
  {id: 'window-bay-period', name: 'Centered window · period sash', bottom: .35, top: 1.55,
    columns: 3, rows: 2, description: 'A taller six-over-six sash with a projecting sill, apron and drip cap.'}
]);

export const WINDOW_SOURCES = freeze({
  dimensions: {commit: '781246a668c723d5a4c5463e70534cc04b6a5641', path: 'dist/tactics/hybrid-geometry.js',
    detail: 'Native 2 m wall height, 0.16 m thickness, 1 m window width, 0.85–1.55 m compact aperture.'},
  periodProfile: {commit: '6693bfa3fea2edec77649d830de5ac68ba4c1a50', path: 'src/art/gross-housing.js',
    detail: 'Preserved 0.35–1.55 m tall sash aperture. New independent window-bay sculpture; no donor geometry altered.'}
});

// Local coordinates are Three-style metres: X along the wall, Y up, Z through it.
// This is an art assembly, not a map feature, collision solver or traversal rule.
export function compileWindowBay(id) {
  const profile = WINDOW_BAYS.find(p => p.id === id);
  if (!profile) throw Error('Unknown window sculpture: ' + id);
  const {bottom, top, columns, rows} = profile, height = top - bottom;
  const {span, segmentWidth, openingWidth, wallHeight, wallThickness} = WINDOW_KIT;
  const segmentCenter = (span-segmentWidth)/2;
  const parts = [], add = (name, group, material, center, size, bevel = 0) => {
    parts.push({name, group, material, shape: 'box', center, size, bevel});
  };
  // Cut half-metre flanks; preserve the opening, frame and metre texture scale.
  add('Left wall segment', 'walls', 'wall', [-segmentCenter,wallHeight/2,0], [segmentWidth,wallHeight,wallThickness]);
  add('Right wall segment', 'walls', 'wall', [segmentCenter,wallHeight/2,0], [segmentWidth,wallHeight,wallThickness]);
  add('Wall below window', 'walls', 'wall', [0,bottom/2,0], [openingWidth,bottom,wallThickness]);
  add('Wall lintel', 'walls', 'wall', [0,(top+wallHeight)/2,0], [openingWidth,wallHeight-top,wallThickness]);

  // Fixed jambs line the actual aperture. Face casings sit outside its edges.
  for (const sign of [-1,1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    add(side + ' jamb', 'frame', 'trim', [sign*.48,(bottom+top)/2,0], [.04,height,.16], .003);
    for (const face of [-1,1]) add(side + (face < 0 ? ' inner casing' : ' outer casing'), 'frame', 'trim',
      [sign*.545,(bottom+top)/2,face*.1], [.09,height,.05], .004);
  }
  add('Frame head', 'frame', 'trim', [0,top-.02,0], [.92,.04,.16], .003);
  add('Frame seat', 'frame', 'trim', [0,bottom+.02,0], [.92,.04,.16], .003);
  for (const face of [-1,1]) {
    const side = face < 0 ? 'Interior' : 'Exterior';
    add(side + ' head casing', 'frame', 'trim', [0,top+.0375,face*.1], [1.18,.075,.05], .004);
    add(side + ' apron', 'frame', 'trim', [0,bottom-.105,face*.095], [1.14,.09,.045], .003);
  }
  add('Window sill and stool', 'frame', 'trim', [0,bottom-.0275,0], [1.22,.055,.28], .005);
  add('Exterior drip cap', 'frame', 'trim', [0,top+.09,.0275], [1.24,.035,.245], .004);

  const clearBottom = bottom + .04, clearTop = top - .04, mid = (bottom+top)/2;
  const sash = (group, lo, hi, depth) => {
    const width = .92, rail = .033, mullion = .014, h = hi-lo;
    for (const sign of [-1,1]) add((sign < 0 ? 'Left' : 'Right') + ' sash stile', group, 'sash',
      [sign*(width-rail)/2,(lo+hi)/2,depth], [rail,h,.038], .002);
    for (const [name,y] of [['Bottom',lo+rail/2],['Top',hi-rail/2]]) add(name + ' sash rail', group, 'sash',
      [0,y,depth], [width-rail*2,rail,.038], .002);
    const innerWidth = width-rail*2, innerHeight = h-rail*2;
    const paneWidth = (innerWidth-(columns-1)*mullion)/columns;
    const paneHeight = (innerHeight-(rows-1)*mullion)/rows;
    for (let col=1; col<columns; col++) add('Vertical glazing bar ' + col, group, 'sash',
      [-innerWidth/2+col*paneWidth+(col-.5)*mullion,(lo+hi)/2,depth], [mullion,innerHeight,.032], .0015);
    for (let row=1; row<rows; row++) add('Horizontal glazing bar ' + row, group, 'sash',
      [0,lo+rail+row*paneHeight+(row-.5)*mullion,depth], [innerWidth,mullion,.032], .0015);
    for (let row=0; row<rows; row++) for (let col=0; col<columns; col++) add(`Glass ${row+1}:${col+1}`, group, 'glass',
      [-innerWidth/2+paneWidth/2+col*(paneWidth+mullion),lo+rail+paneHeight/2+row*(paneHeight+mullion),depth], [paneWidth,paneHeight,.008]);
  };
  // Separate, overlapping meeting rails and tracks; panes belong to their sash.
  sash('lower-sash', clearBottom, mid+.012, .027);
  sash('upper-sash', mid-.012, clearTop, -.027);
  add('Sash lock base', 'lower-sash', 'brass', [0,mid-.007,-.002], [.066,.013,.025], .002);
  add('Sash lock catch', 'upper-sash', 'brass', [0,mid+.005,-.002], [.028,.013,.025], .002);
  add('Lower sash lift', 'lower-sash', 'brass', [0,clearBottom+.016,-.003], [.075,.012,.02], .002);

  return {
    format: 'nautilus-window-sculpture-v1', id, name: profile.name, description: profile.description,
    metresPerUnit: 1, axes: {along: 'x', up: 'y', through: 'z'},
    wall: {width: span, height: wallHeight, thickness: wallThickness, segmentWidth},
    opening: {center: [0,(bottom+top)/2,0], width: openingWidth, bottom, top, height,
      clear: {width: .92, bottom: clearBottom, top: clearTop, height: clearTop-clearBottom}},
    anchors: {leftJoin: [-span/2,0,0], rightJoin: [span/2,0,0], sill: [0,bottom,0],
      head: [0,top,0], frontNormal: [0,0,1], backNormal: [0,0,-1]},
    traversal: {status: 'deferred', consumerIntegrated: false}, sources: structuredClone(WINDOW_SOURCES), parts
  };
}
