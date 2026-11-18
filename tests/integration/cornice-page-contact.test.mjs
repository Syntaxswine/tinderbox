import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareOriginalContacts,bindOriginalContact} from '../../src/content/original-contact-adapter.js';
import {originalMaterialComponents} from '../../src/simulation/original-support-ports.js';
import {triangleArea} from '../../workbenches/furnished-house/geometry.js';
import {contactSeam} from '../fixtures/original-contact-seam.mjs';

const dir='docs/engineering/shared-maps/cornice-page-mapping-v1/',input=JSON.parse(fs.readFileSync(dir+'input.json')),saved=JSON.parse(fs.readFileSync(dir+'source-result.json')),prior=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/repeated-contact-adapter-v1/source-final.json')).report;
const sha=b=>createHash('sha256').update(b).digest('hex'),fresh=()=>prepareOriginalContacts(input),reject=(fn,reason)=>assert.throws(fn,e=>e.diagnostic?.reason===reason);
const cases=[{id:'c1ad9f00a637e0172ec3c689',parentIndex:7347,parentProjectionX:80,parentCell:[160,7,52],childCell:[159,7,52],childPrimitive:2},{id:'f4a1f689ba409b62112733c1',parentIndex:8218,parentProjectionX:32,parentCell:[64,7,52],childCell:[64,7,52],childPrimitive:0}];
function rotatedSeam(proof){
  for(const side of ['parent','child']){const end=proof.ends[side],part=input.parts.find(p=>p.id===end.partId);assert.ok(originalMaterialComponents(part.triangles)[end.component].primitives.includes(end.primitive));assert.ok(triangleArea(part.triangles[end.primitive])>0);}
  const seam=contactSeam(input,[proof]),id=seam.id(proof,'parent'),entry=seam.entry(id),index=seam.capIndices.get(id),p=proof.point;
  // A generated cut cap orthogonal to the rotated original wall face. It is
  // finite positive material, but cannot inherit the selected original face ID.
  const cap=[[p[0]-.02,p[1]-.02,p[2]],[p[0]+.02,p[1]-.02,p[2]],[p[0],p[1]+.02,p[2]]];assert.ok(triangleArea(cap)>0);entry.record.solidTriangles[index]=cap;
  return {...seam,capIndex:index};
}

test('cached first cornice page privately prepares all 96 proofs, preserving 48 reference snapshots and full histories',()=>{
  const prep=fresh();try{
    const report=prep.report();assert.deepEqual(report.rejected,[]);assert.equal(report.prepared.length,96);assert.equal(report.nativeRecordsBound,0);assert.deepEqual(report.counts,{uniqueParts:50,uniqueSourceDefinitions:55,selectorProofs:96,fixedPorts:192,ownedDictionaryCopies:1,perProofGeometryCopies:0,originalTriangles:600});
    const pins=new Map(saved.proofPins.map(p=>[p.id,p.sha256])),old=new Map(prior.prepared.map(p=>[p.id,p]));let references=0,nonnull=0;const parentPrimitives={},childPrimitives={};
    for(const c of input.contacts){const p=prep.proof(c.id);assert.equal(sha(JSON.stringify(p)),pins.get(c.id));assert.deepEqual(p.historicalVolume,c.historicalVolume);assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.ends.parent)&&Object.isFrozen(p.historicalVolume));parentPrimitives[p.ends.parent.primitive]=(parentPrimitives[p.ends.parent.primitive]||0)+1;childPrimitives[p.ends.child.primitive]=(childPrimitives[p.ends.child.primitive]||0)+1;if(p.historicalVolume.sourceFace!==null){nonnull++;assert.ok(Object.isFrozen(p.historicalVolume.sourceFace)&&Object.isFrozen(p.historicalVolume.sourceFace.actualSurfacePoint));}
      const previous=old.get(p.id);if(previous){const{historicalVolume:oldHistory,...oldRest}=previous,{historicalVolume:history,...rest}=p;assert.deepEqual(rest,oldRest);for(const[k,v]of Object.entries(oldHistory))assert.deepEqual(history[k],v);references++;}
    }
    assert.equal(references,48);assert.equal(nonnull,2);assert.deepEqual(parentPrimitives,{'8':49,'10':47});assert.deepEqual(childPrimitives,{'0':46,'2':50});
  }finally{prep.dispose();}
});

test('both rotated ends use original solid projection/cells and exclude generated cut-cap faces',()=>{
  const prep=fresh();try{for(const c of cases){const proof=prep.proof(c.id),seam=rotatedSeam(proof);let bound;try{
    assert.equal(proof.ends.parent.globalPartIndex,c.parentIndex);assert.equal(proof.ends.parent.channel,'solid');assert.equal(proof.ends.parent.projection[0],c.parentProjectionX);assert.notEqual(proof.ends.parent.projection[0],proof.point[0]);assert.deepEqual(proof.ends.parent.sourceCell,c.parentCell);assert.deepEqual(proof.ends.child.sourceCell,c.childCell);assert.equal(proof.ends.child.primitive,c.childPrimitive);assert.equal(proof.ends.child.channel,'surface');
    bound=bindOriginalContact({proof,...seam.args()});const binding=bound.binding();assert.equal(bound.evaluate({revision:0}).live,true);assert.deepEqual(bound.evaluate({revision:0}).supportedIds,[]);assert.deepEqual(binding.anchors,[]);for(const side of ['parent','child'])assert.equal(binding.ends[side].nativeRecordId,seam.id(proof,side));assert.ok(!binding.ends.parent.nativePrimitives.includes(seam.capIndex));
    const capOnly=rotatedSeam(proof),entry=capOnly.entry(capOnly.id(proof,'parent'));entry.record.solidTriangles=[entry.record.solidTriangles[capOnly.capIndex]];reject(()=>bindOriginalContact({proof,...capOnly.args()}),'original-contact-face-missing');
  }finally{bound?.dispose();}}}finally{prep.dispose();}
});

test('rotated synthetic entries retain exact retirement and reject wrong-cell or stale authority',()=>{
  const prep=fresh();try{for(const c of cases){const proof=prep.proof(c.id),seam=rotatedSeam(proof);let bound;try{
    bound=bindOriginalContact({proof,...seam.args()});assert.equal(bound.evaluate({revision:0}).live,true);assert.equal(bound.evaluate({revision:1,retireRecords:[seam.neighborId]}).live,true);for(const side of ['parent','child'])assert.equal(bound.evaluate({revision:1,retireRecords:[seam.id(proof,side)]}).live,false);
    const wrong=rotatedSeam(proof);wrong.entry(wrong.id(proof,'parent')).cell[0]--;reject(()=>bindOriginalContact({proof,...wrong.args()}),'exact-original-record-missing-or-ambiguous');
    const copied=structuredClone(proof);copied.ends.parent.sourceCell[0]--;reject(()=>bindOriginalContact({proof:copied,...seam.args()}),'validated-original-proof-required');
    seam.advance();reject(()=>bound.evaluate({revision:2}),'stale-source-generation');assert.equal(bound.diagnostics().closed,true);assert.equal(bound.diagnostics().retainedFragments,0);assert.equal(bound.diagnostics().retainedSlices,0);
  }finally{bound?.dispose();}}}finally{prep.dispose();}
});

test('full non-null historical sourceFace records are owned snapshots and serialized metadata cannot issue proofs',()=>{
  const data=structuredClone(input),prep=prepareOriginalContacts(data);let bound;try{
    const proof=prep.proof(cases[0].id),expected=structuredClone(proof),c=data.contacts.find(v=>v.id===proof.id);c.historicalVolume.sourceFace.sourceTriangle=999;c.historicalVolume.sourceFace.actualSurfacePoint[0]=0;c.historicalVolume.worldWitness[0]=0;c.historicalVolume.kind='changed';data.parts.find(p=>p.id===proof.ends.parent.partId).triangles[8][0][0]=0;
    assert.deepEqual(proof,expected);assert.throws(()=>{proof.historicalVolume.sourceFace.actualSurfacePoint[0]=0;},TypeError);const seam=rotatedSeam(proof),serialized=JSON.parse(JSON.stringify(proof));reject(()=>bindOriginalContact({proof:serialized,...seam.args()}),'validated-original-proof-required');
    bound=bindOriginalContact({proof,...seam.args()});assert.equal(bound.evaluate({revision:0}).live,true);prep.dispose();reject(()=>bound.evaluate({revision:1}),'binding-disposed');assert.equal(bound.diagnostics().retainedFragments,0);
  }finally{bound?.dispose();prep.dispose();}
});
