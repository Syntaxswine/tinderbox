import fs from 'node:fs';
import * as T from '../../../src/runtime/three.js';
import {createInteriorProp,PROP_CATALOGUE} from '../../../assets/art/landmark-interiors/index.js';
const q=n=>Math.round(n*1e6)/1e6,all={};
for(const p of PROP_CATALOGUE){const m=createInteriorProp(T,{assetId:p.id});try{const b=m.bounds;all[p.id]={bounds:{min:b.min.toArray().map(q),max:b.max.toArray().map(q)},measuredSize:b.getSize(new T.Vector3()).toArray().map(q),prototypeTriangles:m.diagnostics().triangles,sourceParts:m.diagnostics().sourceParts};}finally{m.dispose();}}
fs.writeFileSync('assets/art/landmark-interiors/prop-metrics.js','// Measured actual factory meshes; regenerate with art/source/landmark-interiors/bake-prop-metrics.mjs.\nexport const PROP_METRICS = '+JSON.stringify(all,null,2)+';\n');console.log('Measured '+Object.keys(all).length+' reusable furnishing prototypes.');
