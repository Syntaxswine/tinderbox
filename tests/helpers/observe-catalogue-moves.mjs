import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createCatalogueThermal as createNativeProvider} from '../../src/simulation/catalogue-thermal.js';

let recorder=null;
// Test-only import seam: record actual provider returns without changing their
// values, production modules, public snapshot cadence or movement clocks.
export function createCatalogueThermal(options){
  const provider=createNativeProvider(options);
  return {...provider,move(...args){const path=provider.move(...args);recorder?.(structuredClone(path));return path;}};
}
export function observeCatalogueMoves(record,operation){
  assert.equal(recorder,null);recorder=record;try{return operation();}finally{recorder=null;}
}
export async function observedSimulationFactory(){
  const url=new URL('../../src/simulation/index.js',import.meta.url),source=await fs.readFile(url,'utf8');
  const imports=[...source.matchAll(/from (['"])(\.{1,2}\/[^'"]+)\1/g)];
  assert.equal(imports.filter(m=>m[2]==='./catalogue-thermal.js').length,1);
  const instrumented=source.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,quote,relative)=>'from '+JSON.stringify(relative==='./catalogue-thermal.js'?import.meta.url:new URL(relative,url).href));
  return (await import('data:text/javascript;base64,'+Buffer.from(instrumented).toString('base64'))).createSimulation;
}
