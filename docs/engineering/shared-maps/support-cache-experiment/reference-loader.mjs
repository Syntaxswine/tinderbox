
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath}from 'node:url';import {execFileSync}from 'node:child_process';import {createHash}from 'node:crypto';
const pins={"src/simulation/source-support.js":{"beforeLfSha256":"34371c2a50e753b67e944ca9a4da645887013023cec327611a91215e3720351b","afterLfSha256":"db60fb30155200292eb11e0d002c67f1c4beab39b096bc51636a9aad0709b476"},"workbenches/furnished-house/simulation.js":{"beforeLfSha256":"75a6d2c1eaa1f7c956e5345fdabc3761cc374e0daf5a25e2d62efbd9f2c78012","afterLfSha256":"54842b18146ee6f4d8353e4844d741d2dd86138015f83c2f22729dae698525f9"}},root=process.cwd(),lane=process.env.TINDERBOX_CACHE_LANE,out=process.env.TINDERBOX_CACHE_RUN_DIRECTORY,loaded=[];
assert.ok(['reference','candidate'].includes(lane));assert.ok(path.resolve(out).startsWith(path.resolve('artifacts')+path.sep));
export async function load(url,context,next){
 if(!url.startsWith('file:'))return next(url,context);const relative=path.relative(root,fileURLToPath(url)).split(path.sep).join('/');
 if(!Object.hasOwn(pins,relative))return next(url,context);
 const source=(lane==='reference'?execFileSync('git',['show','cd443ccdd9cbbb38cf4c338ef697d902739726d6:'+relative],{encoding:'utf8',windowsHide:true}):fs.readFileSync(fileURLToPath(url),'utf8')).replace(/\r\n/g,'\n');
 const hash=createHash('sha256').update(source).digest('hex');assert.equal(hash,pins[relative][lane==='reference'?'beforeLfSha256':'afterLfSha256']);
 loaded.push({path:relative,lfSha256:hash,origin:lane==='reference'?'immutable cd443 Git object':'pinned candidate working tree'});
 fs.writeFileSync(path.join(out,'loaded-sources.json'),JSON.stringify({lane,loaded},null,2)+'\n');
 return {format:'module',source,shortCircuit:true};
}
