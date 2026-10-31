/** Pure preparation checks; no codec intake, field assembly, renderer or solver. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {floorPrism} from './templates/floor.js';
import {prismGeometry,prismOwnsHeight,prismContains,rayPrismInterval} from '../../../../../assets/art/fire-realism/fluid-contact/support.js';
import {blenderToGame,gameToBlender} from '../../../../../assets/art/fire-realism/fluid-contact/space.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../..'),plan=JSON.parse(fs.readFileSync(path.join(here,'assembly-plan.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
for(const file of ['assemble.mjs','audit-browser.js','templates/floor.js'])execFileSync(process.execPath,['--check',path.join(here,file)],{stdio:'pipe'});
for(const pin of Object.values(plan.pureSources)){const bytes=fs.readFileSync(path.join(root,pin.source));assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.sha256);}
const factory=fs.readFileSync(path.join(here,'templates/index.js.txt'),'utf8');execFileSync(process.execPath,['--input-type=module','--check'],{input:factory,stdio:['pipe','pipe','pipe']});assert.equal((factory.match(/export (?:async )?function/g)||[]).length,4);
for(const name of ['createFluidSurfaceContactReference','prepareFluidSurfaceContactData','fluidSurfaceContactPayloadEvidence','auditFluidSurfaceContactRGBA'])assert(factory.includes('function '+name+'('));
assert(factory.includes("from "+String.fromCharCode(39)+"./payload/payload.js"+String.fromCharCode(39)));assert(!factory.includes('reactionOnly'));assert(!factory.includes('makeReactionDiagnosticShaders'));assert(!factory.includes('FIELD_METADATA.grid'));
assert(factory.includes('rawPair.prisms.map(floorPrism).filter(Boolean)'));assert(factory.includes('prismGeometry(prism)'));assert(factory.includes('slab.value.set(prism.lower,prism.upper)'));assert(factory.includes("quality:'reference'"));
assert(factory.indexOf('bindPresentation(frame)')<factory.indexOf('sourceState=clock.update(frame)'));
// Floor clip has no mutable link to the original slab bounds and never edits
// the raw arrays. Geometry and shader slab use the SAME clipped prism object.
const hull=[[-1,-1],[1,-1],[1,1],[-1,1]],planes=[[0,-1,1],[1,0,1],[0,1,1],[-1,0,1]],raw={band:3,lower:-.020833289250731468,upper:.02083337865769863,hull,planes},snapshot=JSON.stringify(raw),clipped=floorPrism(raw);
assert.equal(JSON.stringify(raw),snapshot);assert.equal(clipped.lower,0);assert.equal(clipped.upper,raw.upper);assert.notEqual(clipped,raw);assert.equal(clipped.hull,raw.hull);assert.equal(floorPrism({...raw,lower:-.1,upper:-.01}),null);const atFloor={...raw,lower:0};assert.equal(floorPrism(atFloor),atFloor);
const above={...raw,band:4,lower:raw.upper,upper:.06250004656612873};assert.equal(floorPrism(above),above);
const geom=prismGeometry(clipped);assert(geom.vertices.every((v,i)=>i%3!==2||v>=0));assert.equal(geom.indices.length,36);
for(const height of [0,.000000001,raw.upper-1e-12,raw.upper,raw.upper+1e-12])assert.equal([clipped,above].filter(p=>prismOwnsHeight(p,height)).length,1);
assert(!prismContains(clipped,[0,0,-1e-12]));assert(prismContains(clipped,[0,0,.01]));assert(prismContains(above,[0,0,.04]));
const interval=rayPrismInterval(clipped,[0,0,1],[0,0,-1]);assert(interval);assert.equal(1-interval[1],0);assert(Math.abs(1-interval[0]-raw.upper)<1e-15);
const landmark=[.10416669957339764,-.47916665114462376,.5208333935588598],native=blenderToGame(landmark);assert.deepEqual(native,[landmark[0]+5.5,landmark[2],-landmark[1]+8.5]);for(let i=0;i<3;i++)assert(Math.abs(gameToBlender(native)[i]-landmark[i])<1e-12);
const expected=JSON.parse(fs.readFileSync(path.join(here,'expected-f32-hashes.json')));assert.equal(expected.hashes.length,579);assert.equal(expected.rawManifestSha256,plan.sourcePins.rawManifestSha256);assert.equal(new Set(expected.hashes.map(r=>r.frame+':'+r.channel)).size,579);
const audit=fs.readFileSync(path.join(here,'audit-browser.js'),'utf8');assert(audit.includes("new URL('../../../../../',import.meta.url)"));assert(audit.indexOf('await load(')<audit.indexOf('const namespace=await import'));assert(audit.includes("assets/art/fire-realism/fluid-contact-surface/index.js"));assert(audit.includes('auditFluidSurfaceContactRGBA'));assert(audit.includes('evidence.metrics.denseBytes!==0'));
const assemble=fs.readFileSync(path.join(here,'assemble.mjs'),'utf8');assert(assemble.indexOf('No exact architect-reviewed production codec intake')<assemble.indexOf('fs.mkdirSync(asset)'));assert(assemble.includes("pin.source!=='assets/art/fire-realism/field-payload-v2/'+name"));assert(assemble.includes('belowfloor')||assemble.includes('BelowFloor'));assert(assemble.includes('all193GzipRoundtrips:true'));
console.log('PASS source preparation:4 exports, source pins, strict codec-intake gate, immutable floor/mesh/slab support, adjacent half-open ownership, signed landmarks and separate579 browser audit. No production-codec or actual-data import, GPU render or quality acceptance.');
