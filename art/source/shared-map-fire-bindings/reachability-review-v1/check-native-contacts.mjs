// CPU/source contact controls only. No actors, thermal cells or renderer.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {supportSurfacesTouch} from '../../../../workbenches/furnished-house/support.js';
import {bounds,overlaps,unit,cross,sub} from '../../../../workbenches/furnished-house/geometry.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const sha=data=>createHash('sha256').update(data).digest('hex'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const review=read('art/source/shared-map-fire-bindings/reachability-review-v1/review-evidence.json');
const bindingsPath='assets/art/shared-map-fire-bindings/new-york-complete-v1.json',raw=fs.readFileSync(path.join(root,bindingsPath));
if(sha(raw)!=='407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba')throw Error('Completed art changed');
const carriers=new Map(JSON.parse(raw).carriers.map(c=>[c.id,c])),geometries=new Map();
const point=(p,m)=>[0,1,2].map(k=>m[k]*p[0]+m[4+k]*p[1]+m[8+k]*p[2]+m[12+k]);
function triangles(id,open=false){const out=[];for(const b of carriers.get(id).renderBindings){if(b.physicalContribution!=='carrier-solid')continue;let g=geometries.get(b.geometryPath);if(!g){g=read(b.geometryPath);geometries.set(b.geometryPath,g);}const a=g.attributes.position.array,indices=g.index?.array??Array.from({length:a.length/3},(_,i)=>i),start=b.sourceRange?.start??0,count=b.sourceRange?.count??indices.length,m=open?(b.openMatrix??b.matrix):b.matrix;for(let i=start;i<start+count;i+=3)out.push(indices.slice(i,i+3).map(j=>point(a.slice(j*3,j*3+3),m)));}return out;}
const facets=ts=>ts.map(t=>({kind:'wall',triangles:[t],bounds:bounds(t),normal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0]))),thickness:0}));
function touching(a,b){return a.some(t=>b.some(s=>overlaps(t.bounds,s.bounds,.00001)&&supportSurfacesTouch(t,s)));}
const currentSupport=fs.readFileSync(path.join(root,'workbenches/furnished-house/support.js'),'utf8').replace(/\r\n/g,'\n');
const snapshotPath='docs/engineering/shared-maps/support-diagnostic-source-v2.json',snapshotRaw=execFileSync('git',['show','51a386449c4f36ca72a8a7a51da6ea4abcd25586:'+snapshotPath],{cwd:root,windowsHide:true});
if(sha(snapshotRaw)!=='3309e34f0b55deee7cb20c72012fcae67f73e999dcbeb0fbf024860c0393ea21')throw Error('Source evidence changed');
const supportSnapshot=JSON.parse(snapshotRaw).files.find(f=>f.path==='workbenches/furnished-house/support.js'),snapshotText=(supportSnapshot.text??supportSnapshot.source??supportSnapshot.content).replace(/\r\n/g,'\n');
const contactFunction=s=>s.slice(s.indexOf('function touching(a,b) {'),s.indexOf('// Read-only geometry query'));
if(contactFunction(currentSupport)!==contactFunction(snapshotText))throw Error('Native contact function differs from diagnostic');
const results=review.targetPairEvidence.map(e=>{const a=facets(triangles(e.source)),b=facets(triangles(e.candidate)),nativeContact=touching(a,b);if(e.geometricGapProven&&nativeContact)throw Error('Positive separation contradicts native contact '+e.case);return {case:e.case,source:e.source,candidate:e.candidate,sourceTriangleCount:a.length,candidateTriangleCount:b.length,nativeContact,positiveVolumeProof:e.positiveVolumeProof,geometricGapProven:e.geometricGapProven,acceptedAsSupport:false};});
for(const open of [false,true]){const source='carrier/ny-front/header',candidate='carrier/ny-front/leaf--1';results.push({case:(open?'open':'closed')+'-header-to-moving-leaf',source,candidate,nativeContact:touching(facets(triangles(source)),facets(triangles(candidate,open))),acceptedAsSupport:false,meaning:'Observed contact is not permanent fixed-frame/hinge ownership.'});}
const byCase=new Map(results.map(r=>[r.case,r]));
if(byCase.get('parapet-base-to-roof').nativeContact)throw Error('Actual parapet/roof gap was lost');
if(!byCase.get('closure-cap-to-actual-deck').nativeContact)throw Error('Actual shared cap/deck seam was lost');
const result={version:1,result:'PASS',scope:'Exact native triangle-contact controls on existing source geometry; does not establish bearing, fastening or approved graph direction.',bindingsSha256:sha(raw),reviewEvidenceSha256:sha(fs.readFileSync(path.join(here,'review-evidence.json'))),producerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),unchangedNativeTouchingFunctionMatchesEvidenceSnapshot:true,nativeTouchingFunctionSha256:sha(contactFunction(currentSupport)),geometrySourceCount:geometries.size,controls:results,rendererStarted:false,newLinksApplied:0};
if(process.argv.includes('--record'))fs.writeFileSync(path.join(here,'native-contact-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
