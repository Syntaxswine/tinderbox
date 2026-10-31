/** Verify existing numerical transcripts/inputs; never execute raw analysis. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),base=path.join(root,'workbenches/art/fire-realism/color-transfer-trial/evidence'),index=JSON.parse(fs.readFileSync(path.join(base,'diagnosis-index.json'))),sha=b=>createHash('sha256').update(b).digest('hex');
for(const r of index.archives){const b=fs.readFileSync(path.join(root,r.path));assert.equal(b.length,r.bytes);assert.equal(sha(b),r.sha256);}
const rawFile=process.argv[2]?path.resolve(process.argv[2]):path.join(root,index.rawManifest.path);if(!fs.existsSync(rawFile))throw Error('Pass the preserved original V5 raw-manifest.json path; no raw calculation is required');const bytes=fs.readFileSync(rawFile);assert.equal(bytes.length,index.rawManifest.bytes);assert.equal(sha(bytes),index.rawManifest.sha256);const raw=JSON.parse(bytes);
assert.equal(index.fieldInputs.length,20);assert.equal(new Set(index.fieldInputs.map(r=>r.frame+':'+r.channel)).size,20);for(const r of index.fieldInputs){const actual=raw.samples[r.frame-1].channels[r.channel];assert.equal(r.path,actual.path);assert.equal(r.bytes,actual.bytes);assert.equal(r.sha256,actual.sha256);}
assert.equal(index.cameraInputs.length,4);for(const r of index.cameraInputs){assert.equal(r.sourceTree,'architect-primary-QA');assert.equal(r.camera.kind,'orthographic');assert.equal(r.camera.matrixWorld.length,16);}
const warm=JSON.parse(fs.readFileSync(path.join(base,'diagnosis-temperature-gradient-results.json')));assert.deepEqual(warm.records.map(r=>r.nativeTick),[30,60,120,180]);for(const r of warm.records){assert.equal(r.FweightedTempClampFraction,0);assert(r.FweightedWarmPlateauFraction>.5&&r.FweightedWarmPlateauFraction<.55);assert(r.maxTempWhereFlame<3);assert(r.analyticTrilinearCellMidpointGradient.basalEnergyFraction>.86);assert.equal(r.mix,.5);}
const paths=JSON.parse(fs.readFileSync(path.join(base,'diagnosis-path-depth-results.json')));assert.equal(paths.records.length,4);for(const r of paths.records)assert.equal(r.rays.length,9);assert.equal(paths.records[0].rays[0].tauFlame,2.21242221699748);assert.equal(paths.records[2].rays[0].tauFlame,2.4558812580172473);
assert(index.archivalConventions.some(s=>s.includes('no pre-existing filesystem')));assert(index.interpretationLimits.some(s=>s.includes('diagnostic F>.001')));
console.log('PASS diagnosis archive: source/result transcript hashes, original raw-manifest and20field input identities,4recorded camera inputs, plateau/clamp/path/gradient numerical witnesses; no raw-array rerun or rendered acceptance.');
