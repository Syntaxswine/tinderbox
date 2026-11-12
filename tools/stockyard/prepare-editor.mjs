import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ENGINE_COMMIT} from '../../workbenches/stockyard/contract.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const target=path.join(root,'artifacts/helpers/stockyard-map'),source=path.join(target,'engine-source');
const marker=path.join(target,'engine-commit.txt'),donor=process.argv[2];
if(fs.existsSync(marker)&&fs.readFileSync(marker,'utf8').trim()===ENGINE_COMMIT&&fs.existsSync(path.join(source,'dist/index.html'))){console.log('Reusing pinned Nautilus editor '+ENGINE_COMMIT);process.exit(0);}
if(!donor)throw Error('Pass the read-only Nautilus checkout path. No donor checkout or branch is changed.');
fs.mkdirSync(source,{recursive:true});
const archive=path.join(target,'nautilus-'+ENGINE_COMMIT.slice(0,8)+'.tar');
execFileSync('git',['-C',path.resolve(donor),'archive','--format=tar','--output='+archive,ENGINE_COMMIT],{stdio:'inherit'});
execFileSync('tar',['-xf',archive,'-C',source],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(source,'tools/build.mjs')],{cwd:source,stdio:'inherit'});
fs.writeFileSync(marker,ENGINE_COMMIT+'\n');
console.log('Prepared native Nautilus editor. Only the ignored Tinderbox task snapshot was written.');
