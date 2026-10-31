/** Finite offline source derivation only; never imports a runtime factory. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openRawFields,auditAllFields} from './read-fields.mjs';
import {buildSupportPrisms,prismGeometry} from '../../../../assets/art/fire-realism/fluid-contact/support.js';
const input=process.argv[2];if(!input)throw Error('Usage: node derive-support.mjs ACTUAL/raw-manifest.json');
const source=openRawFields(input),dest=path.join(source.root,'support-derived');if(fs.existsSync(dest))throw Error('Preserve existing support evidence; destination exists');fs.mkdirSync(dest);
const run=JSON.parse(fs.readFileSync(path.join(source.root,'run.json'),'utf8'));if(!run.rawExportComplete)throw Error('Authoring export did not finish');
const guard=()=>{if(Date.now()/1000>=run.deadlineEpoch)throw Error('Original authoring deadline expired; no extension');};
const save=(file,data)=>{const text=JSON.stringify(data)+'\n';fs.writeFileSync(path.join(dest,file),text);return{path:'support-derived/'+file,bytes:Buffer.byteLength(text),sha256:crypto.createHash('sha256').update(text).digest('hex')};};
const startedAt=new Date().toISOString();guard();const audit=auditAllFields(source);const auditFile=save('positive-field-audit.json',audit),pairs=[];let geometryBytes=0,peakVertices=0,peakTriangles=0,peakPrisms=0;
const readPairFrame=index=>({density:source.read(index,'density').values,flame:source.read(index,'flame').values});
let current=readPairFrame(0);
for(let index=0;index<192;index++){
  guard();const next=readPairFrame(index+1),prisms=buildSupportPrisms(current,next,source.grid);let vertices=0,triangles=0;
  for(const prism of prisms){const geometry=prismGeometry(prism);vertices+=geometry.vertices.length/3;triangles+=geometry.indices.length/3;}
  const record=save('pair-'+String(index).padStart(3,'0')+'.json',{pair:index,frames:[index+1,index+2],ageInterval:[index/30,(index+1)/30],scalarGrid:source.grid,prisms,vertices,triangles,ownership:'Convex half-open disjoint bands; each ray/band integrated once. Scalar geometry has no VolumeToMesh offset.'});
  geometryBytes+=record.bytes;peakVertices=Math.max(peakVertices,vertices);peakTriangles=Math.max(peakTriangles,triangles);peakPrisms=Math.max(peakPrisms,prisms.length);pairs.push({...record,pair:index,vertices,triangles,prisms:prisms.length});current=next;
  if(index%24===0)console.log(JSON.stringify({derivedPair:index+1,total:192,vertices,triangles,prisms:prisms.length}));
}
const report={version:1,status:audit.anyReactionBoundary?'source-derived-reaction-boundary-failed':'source-derived-bounds-await-architect',scope:'Actual offline fields/prisms only; no native render, upper-overhang permission, R freeze or cost credit',startedAt,completedAt:new Date().toISOString(),rawManifestSha256:source.manifestSha256,derivationSourceSha256:crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),grid:source.grid,audit:auditFile,pairs,geometryJsonBytes:geometryBytes,peakPrisms,peakVertices,peakTriangles,upperOverhangApproved:false,reactiveBoundaryFailed:audit.anyReactionBoundary,densityBoundaryObserved:audit.anyDensityBoundary,scalarOriginUnchanged:true,spatialHaloVoxels:1,positiveThreshold:0,fullTemporalUnion:true,resourceNote:'Derivation retains current/next source fields and one pair geometry, not all dense frames. Source-geometry JSON is measured independently; not yet a verified runtime payload.'};
save('support-manifest.json',report);console.log(JSON.stringify({status:report.status,pairs:pairs.length,geometryJsonBytes:geometryBytes,peakPrisms,peakVertices,peakTriangles,reactiveBoundaryFailed:report.reactiveBoundaryFailed,densityBoundaryObserved:report.densityBoundaryObserved}));
