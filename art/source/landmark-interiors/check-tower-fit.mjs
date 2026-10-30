// Actual tall-exhibit fit against the unchanged source roof; no renderer or server.
import fs from 'node:fs';
import * as T from '../../../src/runtime/three.js';
import {createInteriorProp} from '../../../assets/art/landmark-interiors/index.js';
import {sourceParts,collectParts} from './review-geometry.mjs';
import {triangleIndex} from '../exploration-access/derived-review.mjs';
const parts=(await sourceParts('horticulture',{bounds:{min:[72,2,27],max:[78,16,33]}})).filter(p=>p.id.includes('front-glass-gallery')||p.data.role==='roof-glass'),index=triangleIndex(parts),m=createInteriorProp(T,{assetId:'orange-tower'});m.root.position.set(75,2.12,30);let minimum=Infinity,samples=0;
try{const seen=new Set();for(const p of collectParts(m.root,'tower'))for(const v of p.vertices){const key=v.slice(0,3).map(n=>n.toFixed(4)).join(',');if(seen.has(key))continue;seen.add(key);const h=index.hits(v.slice(0,3),[0,1,0],20);if(!h.length)throw Error('Tower point has no roof above');minimum=Math.min(minimum,h[0].distance);samples++;}if(minimum<.1)throw Error('Tower roof clearance '+minimum);
const result={passed:true,minimumVerticalRoofClearanceMetres:minimum,uniqueMeshVertexSamples:samples,sourceRoofTriangles:index.triangles,method:'Actual prop vertices raycast upwards against actual pinned front-glass-gallery meshes; no perspective measurement.'};fs.writeFileSync('artifacts/landmark-interiors/tower-clearance.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}finally{m.dispose();}
