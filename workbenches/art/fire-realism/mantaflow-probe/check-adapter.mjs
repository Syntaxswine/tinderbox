import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adapterProof,createProbeMeshAdapter,transformPoint,multiply4} from './blender-mesh-adapter.mjs';
const observed=JSON.parse(fs.readFileSync(new URL('./observed-stage1.json',import.meta.url),'utf8'));
const settings=JSON.parse(fs.readFileSync(new URL('./settings.json',import.meta.url),'utf8'));
const context={settings,metadata:observed.readOnlyMetadata,manifest:{tool:{version:observed.tool.version,buildHash:observed.tool.buildHash},vdb:observed.actualVdb,frames:[{frame:13,resolution:adapterProof.resolution,voxelSize:adapterProof.voxelSize,voxelCentreOriginBlenderWorld:adapterProof.scalarCentreOrigin}]}};
const before=JSON.stringify(context),adapter=createProbeMeshAdapter(context);assert.equal(JSON.stringify(context),before);
assert(adapter.offsetTargetMetres.every((n,i)=>n>0&&n<.044&&n===Math.fround(adapter.transformP[i][i]/2)));
const native=Float32Array.from([0,.125,.5,.7,-.2,.33]),saved=Buffer.from(native.buffer).toString('hex'),result=adapter.adaptVertices(native);
assert.equal(Buffer.from(native.buffer).toString('hex'),saved);assert(result instanceof Float64Array);assert.notEqual(result.buffer,native.buffer);
for(let i=0;i<native.length;i++)assert.equal(result[i],native[i]-adapter.offsetTargetMetres[i%3]);assert.throws(()=>adapter.adaptVertices(result),/adapted twice/);
for(const witness of adapter.witnesses){for(let i=0;i<3;i++){assert(Math.abs(witness.readerAdapterPointTarget[i]-witness.gridPointTarget[i])<1e-12);assert(Math.abs(witness.scalarIndexAfterAdapter[i]-witness.index[i])<2.5e-6);}}
assert.deepEqual(transformPoint(multiply4(adapterProof.targetMatrixWorld,adapterProof.nativeGridMatrix),[0,0,0]),[0,0,0]);
const reject=(change,pattern)=>{const copy=structuredClone(context);change(copy);assert.throws(()=>createProbeMeshAdapter(copy),pattern);};
reject(c=>c.manifest.tool.buildHash='other',/build/);reject(c=>c.settings.tool.exeSha256='0'.repeat(64),/exeSha256/);reject(c=>c.manifest.vdb.alignmentMatrix[0][0]=2,/Volume transform/);
reject(c=>c.manifest.vdb.rawGridMatrixObject[0][1]=.0875,/native grid transform/);reject(c=>c.manifest.vdb.rawGridMatrixObject[0][0]=-.0875,/native grid transform/);
reject(c=>c.targetMatrixWorld=[[0,-1,0,0],[1,0,0,0],[0,0,1,0],[0,0,0,1]],/nonidentity target/);reject(c=>c.manifest.frames[0].voxelCentreOriginBlenderWorld[0]+=.01,/scalar centre origin/);
reject(c=>c.metadata.namedGrids.find(g=>g.name==='density').matrixObject[0][0]+=.01,/density native grid/);reject(c=>c.metadata.sourceVdb.sha256After='0'.repeat(64),/unchanged VDB/);
console.log('PASS: exact modifier adapter pins, positive-diagonal transform/index witnesses, no data mutation/double adaptation, unsupported tool/rotation/scale/sign/origin/grid rejection');
