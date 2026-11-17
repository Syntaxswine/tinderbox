// Original pinned source decoding only; no factory, trial or native compiler.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {decodeMapSources} from '../../../../src/content/map-source-data.js';
import {createMapSourceGeometry} from '../../../../src/content/map-source-geometry.js';
import {bounds} from '../../../../workbenches/furnished-house/geometry.js';
export const roof='new-york::carrier/roof/clerestory',out='docs/engineering/shared-maps/regional-receipt-bridge-v1/';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function loadRoof(){
  const pins=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/support-preparation-v1/source-pins.json')).files,parsed=pins.map(pin=>{const raw=fs.readFileSync(pin.path);assert.equal(sha(raw),pin.sha256);assert.equal(raw.length,pin.bytes);return JSON.parse(raw);});
  const [index,library,navigation]=parsed,model=decodeMapSources(index,library),geometry=createMapSourceGeometry(model),owner=model.carrierById.get(roof);assert.deepEqual(owner.parts,[10387]);
  const part=model.parts[10387],bundle=geometry.sourcesForCarrier(roof),shape=geometry.shapeForPart(part.id),ts=shape.triangles,box=bounds(ts.flat());assert.equal(bundle.surfaces.length,5);assert.equal(bundle.openings.length,0);assert.equal(ts.length,8);assert.equal(shape.closed,true);
  const sourceRevision=sha(JSON.stringify(pins)),data={version:1,runtimeAdapterVersion:1,implicitGround:false,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],groundY:0,sourceBounds:navigation.sourceBounds,surfaces:bundle.surfaces,openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'new-york',bounds:navigation.sourceBounds}],doors:[]}};
  const query={grid:{origin:data.gridOrigin,pitch:data.thermalCell},sourceRevision,sources:[{partRef:{...part,carrierId:roof},closed:shape.closed,surfaceTriangles:ts,solidTriangles:ts,rayRecord:{id:'new-york::cold/'+part.id,sourceSurfaceId:roof,sourceCarrierId:roof,nativePartId:part.id,instanceId:'new-york',kind:'query-solid',normal:[0,1,0],intact:true,openFraction:0,transmission:.02,bounds:box,triangles:ts,solidTriangles:ts}}]};
  return {producerInput:{data,owners:[owner],sourceRevision},query,geometry,pins,part,box};
}
