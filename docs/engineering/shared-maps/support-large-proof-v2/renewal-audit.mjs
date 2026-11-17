// Static renewal audit. No geometry imports or explanatory process.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),previous=path.resolve(here,'../support-large-proof-v1'),hash=b=>createHash('sha256').update(b).digest('hex');
const priorPlan=JSON.parse(fs.readFileSync(path.join(previous,'plan.json'))),plan=JSON.parse(fs.readFileSync(path.join(here,'plan.json'))),rows=[];
const oldAuthority='4f57ccd6879b7e8f2086be1ae21e3ff154ea0d22',authority='89d4073103f436187236ee0272c1ceac6067fe02';
for(const p of JSON.parse(fs.readFileSync(path.join(previous,'manifest.json'))).files)assert.equal(hash(fs.readFileSync(path.resolve(here,'../../../..',p.path))),p.sha256,p.path);
for(const pin of priorPlan.harnessPins){
  const before=fs.readFileSync(path.join(previous,pin.file),'utf8'),actual=fs.readFileSync(path.join(here,pin.file),'utf8'),changes=[];
  let expected=before;
  for(const [from,to,reason]of [[oldAuthority,authority,'New architect authority'],['support-large-proof-v1/','support-large-proof-v2/','Distinct fence path']])if(expected.includes(from)){changes.push({from,to,reason,occurrences:expected.split(from).length-1});expected=expected.replaceAll(from,to);}
  if(pin.file==='launch.ps1'){
    const from="$proofNode = (Get-Command node -CommandType Application).Source",to="$proofNode = 'C:\\Program Files\\nodejs\\node.exe'\n$proofNodeLeaf = Get-Item -LiteralPath $proofNode -ErrorAction Stop\n$proofNodeVersion = $proofNodeLeaf.VersionInfo.FileVersion\nif ($proofNodeLeaf -isnot [IO.FileInfo] -or $proofNodeVersion -ne '24.15.0') { throw 'Verified scalar Node leaf/version differs; no proof process launched' }";
    assert.equal(expected.split(from).length-1,1);expected=expected.replace(from,to);changes.push({from,to,reason:'Literal scalar executable with one leaf/version check',occurrences:1});
    const oldReceipt='cwd = $proofRoot; executable = $proofNode; arguments =',newReceipt='cwd = $proofRoot; executable = $proofNode; executableLeafVersion = $proofNodeVersion; arguments =';
    assert.equal(expected.split(oldReceipt).length-1,1);expected=expected.replace(oldReceipt,newReceipt);changes.push({from:oldReceipt,to:newReceipt,reason:'Record checked executable version',occurrences:1});
  }
  assert.equal(actual,expected,'Only declared launcher/path/authority changes: '+pin.file);
  rows.push({file:pin.file,beforeSha256:hash(before),afterSha256:hash(actual),byteIdentical:actual===before,changes});
}
const expectedPlan={...priorPlan,authority,harnessPins:rows.map(r=>{const raw=fs.readFileSync(path.join(here,r.file));return {file:r.file,bytes:raw.length,sha256:hash(raw)};})};
assert.deepEqual(plan,expectedPlan,'Plan differs only by authority and adapted harness hashes');
assert.ok(rows.filter(r=>['original-calculation.mjs','native-preparation.mjs','adaptation-audit.json'].includes(r.file)).every(r=>r.byteIdentical));
const result={version:1,authority,previousAttempt:'3ba1c01395ee86f1eded888d890a9fd964bb659d',v1RawFilesUnchanged:20,v1ManifestSha256:hash(fs.readFileSync(path.join(previous,'manifest.json'))),harnessFiles:rows.length,exactDeclaredAdaptations:true,calculationAndPreparationBytesUnchanged:true,limitsSourceAndPlanUnchanged:true,rows};
fs.writeFileSync(path.join(here,'renewal-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,v1RawFilesUnchanged:20,harnessFiles:rows.length,changedHarnessFiles:rows.filter(r=>!r.byteIdentical).map(r=>r.file),calculationAndPreparationBytesUnchanged:true}));
