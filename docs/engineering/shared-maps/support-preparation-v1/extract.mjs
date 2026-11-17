import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const p='src/simulation/source-support.js',base=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
assert.equal(createHash('sha256').update(base).digest('hex'),'1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c');
const between=(start,end)=>base.slice(base.indexOf(start),base.indexOf(end,base.indexOf(start))),helpers=between('const TOLERANCE=', '// The full metadata graph is cold;'),cold=between('  function coldPieces(id,near){','  function assemblyRegions(r){'),regions=between('  function assemblyRegions(r){','  function rebuild(){');
const relationBody=between('  function relation(child,parent,record){','  for(const c of model.carriers){');
const continuity=between("      const temporary=visitSourceContinuityCandidates",'    });\n    for(let i=0;i<adjacency.length;i++)');
const declared=between("        if(r.kind==='coplanar-horizontal-triangle-contact')",'      });\n      if(!found)');
const imports=base.split('\n').slice(0,3).join('\n');
const math=imports+"\nimport {sourceSupportClass} from '../content/map-source-support-data.js';\n\n"+helpers.replace('const TOLERANCE=','export const SOURCE_SUPPORT_TOLERANCE=').replace('const triangles=', 'const TOLERANCE=SOURCE_SUPPORT_TOLERANCE;\nconst triangles=')+
"export function createSourceEdgeCapture(){return {edges:[],seen:new Map()};}\nexport function recordSourceEdge(capture,a,b){if(capture){if(!capture.seen.has(a))capture.seen.set(a,new Set());const seen=capture.seen.get(a);if(!seen.has(b)){seen.add(b);capture.edges.push([a,b]);}}}\n"+
"export function captureSourceCalculation(build){const capture=createSourceEdgeCapture(),directed=(a,b)=>recordSourceEdge(capture,a,b),add=(a,b,both=false)=>{if(a===b)return;directed(a,b);if(both)directed(b,a);};return {edges:capture.edges,result:build(add)};}\n"+
"export function sourceSupportRelation(child,parent,record,carriers){"+relationBody.slice(relationBody.indexOf('if(record.direction'),relationBody.indexOf('relations.push('))+"return {child,parent,...record,symmetric};}\n\n"+
"// Exact accepted 55cd calculation math; graph scheduling and live decisions stay outside.\nexport function createSourceSupportCalculations({index,model,querySource,nodes,active,onContinuityBuild=()=>{}}){\n  const carriers=model.carrierById;\n  function cold(id){return 'cold:'+id;}\n"+
cold.replace('function connectContact(a,b,directed){','function connectContact(a,b,directed,add){')+regions+
"  function continuity(id,add){const list=active.get(id);\n"+continuity.replace('continuityBuilds++;peakTemporaryRecords=Math.max(peakTemporaryRecords,temporary.records);peakTemporaryMemberships=Math.max(peakTemporaryMemberships,temporary.memberships);','onContinuityBuild(temporary);')+"  }\n  function declaredRegion(r,add){\n"+declared.replace('connectContact(r.parent,r.child,!r.symmetric)','connectContact(r.parent,r.child,!r.symmetric,add)')+"  }\n  function run(calculation,add){if(calculation.kind==='continuity')return continuity(calculation.carrier,add);if(calculation.kind==='contact')return connectContact(calculation.a,calculation.b,calculation.directed,add);if(calculation.kind==='declared-region')return declaredRegion(calculation.relation,add);throw Error('Unknown source calculation kind');}\n  return {continuity,contact:connectContact,declaredRegion,run};\n}\n";
fs.writeFileSync('src/simulation/source-support-calculations.js',math);
let code=base;
code=code.replace(imports+"\nimport {sourceSupportClass} from '../content/map-source-support-data.js';\n\n"+helpers,"import {createSourceSupportCalculations,sourceSupportRelation,createSourceEdgeCapture,recordSourceEdge,SOURCE_SUPPORT_TOLERANCE as TOLERANCE} from './source-support-calculations.js';\nexport {visitSourceContinuityCandidates} from './source-support-calculations.js';\n\n");
code=code.replace('  let continuityBuilds=0,peakTemporaryRecords=0,peakTemporaryMemberships=0;','  let continuityBuilds=0,peakTemporaryRecords=0,peakTemporaryMemberships=0;\n  const math=createSourceSupportCalculations({index,model,querySource,nodes,active,onContinuityBuild(temporary){continuityBuilds++;peakTemporaryRecords=Math.max(peakTemporaryRecords,temporary.records);peakTemporaryMemberships=Math.max(peakTemporaryMemberships,temporary.memberships);}});');
code=code.replace('capture={edges:[],seen:new Map()};','capture=createSourceEdgeCapture();');
code=code.replace('    if(capture){if(!capture.seen.has(a))capture.seen.set(a,new Set());const seen=capture.seen.get(a);if(!seen.has(b)){seen.add(b);capture.edges.push([a,b]);}}','    recordSourceEdge(capture,a,b);');
code=code.replace(relationBody,'  function relation(child,parent,record){const r=sourceSupportRelation(child,parent,record,carriers);relations.push(r);metadataLinks.get(parent).add(child);if(r.symmetric)metadataLinks.get(child).add(parent);}\n');
code=code.replace(cold+regions,'  function connectContact(a,b,directed){return math.contact(a,b,directed,add);}\n');
code=code.replace(continuity,'      math.continuity(id,add);\n');
code=code.replace(declared,'        return math.declaredRegion(r,add);\n');
fs.writeFileSync(p,code);
fs.writeFileSync('artifacts/qa/shared-map-runtime/support-preparation-v1/extraction.json',JSON.stringify({baseline:'55cd9b597744244fbd0168939b13fbc66662d7b3',baselineLfSha256:createHash('sha256').update(base).digest('hex'),moved:{helpers,cold,regions,relationBody,continuity,declared},mathLfSha256:createHash('sha256').update(math).digest('hex')},null,2)+'\n');
console.log(JSON.stringify({module:'src/simulation/source-support-calculations.js',graph:p,extractedOnly:true}));
