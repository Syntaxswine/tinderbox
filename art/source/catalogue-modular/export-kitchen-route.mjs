import fs from 'node:fs';import {createHash} from 'node:crypto';
import {applyH15KitchenRouteVariant} from './h15-kitchen-route-variant.mjs';
const root='art/source/catalogue-modular/controls/h15-kitchen-route/',read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),reference=read(root+'reference.json');
for(const record of reference.files)if(sha(fs.readFileSync(root+record.file))!==record.sha256)throw Error('Prior 4ce control changed: '+record.file);
if(sha(fs.readFileSync('workbenches/catalogue-modular/shop-data.json'))!==reference.unchangedShopSha256)throw Error('Unrelated shop changed');
const house=read(root+'circulation-v1-house.json'),scene=read(root+'circulation-v1-scene.json'),change=applyH15KitchenRouteVariant(house);
for(const path of ['art/source/catalogue-modular/h15-kitchen-route-variant.mjs','art/source/catalogue-modular/export-kitchen-route.mjs']){const bytes=fs.readFileSync(path);house.sourceHashes.push({path,commit:null,sha256:sha(bytes),bytes:bytes.length});}
house.sourceHashes.push({path:root+'circulation-v1-house.json',commit:change.control.commit,sha256:change.control.sha256});
scene.provenance.activeHouseAccessVariant.id=change.id;scene.provenance.activeHouseAccessVariant.targets.movableFurniturePassage=1.395;scene.provenance.activeHouseAccessVariant.kitchenCorrection=structuredClone(change);scene.provenance.kitchenRouteCorrection=structuredClone(change);
for(const [name,data]of [['house-data.json',house],['scene-data.json',scene]])fs.writeFileSync('workbenches/catalogue-modular/'+name,JSON.stringify(data)+'\n');
const outputs=Object.fromEntries(['house-data.json','scene-data.json','shop-data.json'].map(name=>[name,sha(fs.readFileSync('workbenches/catalogue-modular/'+name))]));
fs.writeFileSync('art/source/catalogue-modular/kitchen-route-export-summary.json',JSON.stringify({version:1,variant:change.id,change,outputs,status:'Local source export; local source checks and coder combined acceptance are separate.'},null,2)+'\n');console.log(JSON.stringify({variant:change.id,outputs,move:{from:change.from,to:change.to},passage:change.movableFurniturePassage.clearWidth}));
