import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRegionalQueryKernel as create} from '../../../../src/runtime/regional-effective-query.js';
import {bounds} from '../../../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear as ordinarySweep} from '../../../../src/runtime/collision.js';
import {boxFixture,boxTriangles,activate} from '../../../../tests/fixtures/regional-query-data.mjs';
const results=[];
for(const native of [false,true]){
 const input=boxFixture(1),ts=boxTriangles([0,0,0],[1,1,1]),s=input.sources[0];
 input.nativeInventory=[];s.surfaceTriangles=ts;s.solidTriangles=ts;s.rayRecord.triangles=ts;s.rayRecord.bounds=bounds(ts.flat());
 if(native)input.nativeInventory=[{cell:[0,0,0],record:{...s.rayRecord,id:'native-unit',sourceSurfaceId:'native-unit',triangles:ts,solidTriangles:ts,closedShape:true,bounds:bounds(ts.flat())}}];
 const k=create(input),p={x:.5,y:1.01},radius=.1,low=1.0000003,high=1.0000007;
 try{
  if(native)activate(k,input);
  results.push({case:native?'additional-2-native':'additional-1-cold',sourceBounds:{min:[0,0,0],max:[1,1,1]},
   from:p,to:p,radius,minY:low,maxY:high,
   actualVerticalGap:low-1,
   regionalClear:k.sweptCylinderClear(k.view(),p,p,radius,low,high),
   ordinaryClear:ordinarySweep(p,p,radius,low,high,{triangles:ts,closed:true}),
   rationale:'New bodyProbeBounds moves the parity witness into the capsule footprint while the original endpoint centre is outside the solid. The band is wholly above every actual face.'});
 }finally{k.dispose();}
}
writeFileSync('docs/engineering/shared-maps/regional-query-witness-v1/additional-successor-results.json',JSON.stringify({base:'68b6e3995bc4bad5f270275578a630fb2646c501',pid:process.pid,executable:process.execPath,queryLfSha256:createHash('sha256').update(readFileSync('src/runtime/regional-effective-query.js','utf8').replace(/\r\n/g,'\n')).digest('hex'),additionalCases:2,nativeCompilerCalls:0,worldTrials:0,results},null,2)+'\n');
for(const r of results)console.log(JSON.stringify(r));
