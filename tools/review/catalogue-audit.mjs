import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadCatalogueModules} from '../../src/runtime/catalogue-modules.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {triangleArea} from '../../workbenches/furnished-house/geometry.js';

const output=path.resolve(process.argv[2]||'artifacts/qa/catalogue-modular/final-source-audit');fs.mkdirSync(output,{recursive:true});
const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n'),results={};
const sourceFiles=['workbenches/catalogue-modular/scene-data.json','workbenches/catalogue-modular/shop-data.json','workbenches/catalogue-modular/house-data.json'];
const sources=sourceFiles.map(file=>{const b=fs.readFileSync(file);return {path:file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};});
const identity=process.platform==='win32'?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','$p=Get-Process -Id '+process.pid+';[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true})):{pid:process.pid,executable:process.execPath,createdAt:new Date(Date.now()-process.uptime()*1000).toISOString()};
save('helper.json',{owner:'Coder Tinderbox',project:'Catalogue modular host',purpose:'Static full-map material/fuel/grid registration comparison, with no play loop or burn',...identity,startedAt:new Date().toISOString(),ports:[],endCondition:'Two finite source registrations; dispose each immediately; no retained helper',stopMethod:'Owning command exits after registrations or an error; no background service',restart:{cwd:process.cwd(),executable:process.execPath,args:process.argv.slice(1),sources,output}});
for(const representation of ['facets','structure']){
 let trial;
 try{
  const compiled=await loadCatalogueModules({representation,fetcher:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(url))})});trial=createTrial(compiled.data,{executionCache:true});
  const ids=compiled.instances.map(i=>i.id),owner=id=>ids.find(i=>id?.startsWith(i+'::')||id?.includes(':'+i+'::'))||'unassigned',material=m=>typeof m==='string'?m:m?.physical||m?.id||'unspecified',groups=new Map(),geometry=new Map(compiled.data.render.geometry.map(g=>[g.id,g]));
  const group=(instanceId,physicalMaterial,cls)=>{const key=[instanceId,physicalMaterial,cls||'inert'].join('|');if(!groups.has(key))groups.set(key,{instanceId,material:physicalMaterial,fuelClass:cls||null,fuels:0,boundaries:0,parts:0,area:0,initialFuel:0,potentialEnergy:0,cells:new Set()});return groups.get(key);};
  for(const f of trial.scene.fuels.values()){
   const b=trial.scene.index.surfaces.get(f.boundaryId),part=trial.scene.parts.get(f.coreFuelId||f.id),row=group(owner(f.sourceSurfaceId||f.itemId||f.id),material(b?.material||part?.material||f.cls),f.cls);
   row.fuels++;row.area+=f.area||0;row.initialFuel+=f.initial;row.potentialEnergy+=f.initial*trial.scene.profile[f.cls].energy;if(b)row.boundaries++;else row.parts++;for(const c of f.cells)row.cells.add(c);
  }
  for(const b of trial.scene.index.surfaces.values())if(!b.fuelId&&b.id!=='terrain:ground'){
   const row=group(owner(b.sourceSurfaceId),material(b.material),null);row.boundaries++;row.area+=b.area||0;for(const c of b.heatCells||[])row.cells.add(c);
  }
  for(const part of trial.scene.parts.values())if(!part.fuelId){const row=group(owner(part.itemId),material(part.material),null),mesh=geometry.get(part.sourceMeshBinding);row.parts++;row.area+=mesh?.triangles.reduce((n,t)=>n+triangleArea(t.vertices.map(v=>v.slice(0,3))),0)||0;}
  const {unresolvedIds,...support}=trial.supportGraph.diagnostics();save(representation+'-unresolved-support.json',unresolvedIds);
  const value={representation,sources,profiles:trial.scene.profile,grid:{origin:trial.scene.origin,pitch:trial.scene.pitch,cells:trial.scene.cells.size,totalCapacity:[...trial.scene.cells.values()].reduce((n,c)=>n+c.capacity,0)},counts:{boundaries:trial.scene.index.surfaces.size,fuels:trial.scene.fuels.size,items:trial.scene.items.size,parts:trial.scene.parts.size},support,groups:[...groups.values()].map(({cells,...row})=>({...row,occupiedCells:cells.size,occupiedCapacity:[...cells].reduce((n,c)=>n+c.capacity,0)})),sourceConversions:compiled.instances.filter(i=>i.data.sourceRepresentation).map(i=>({id:i.id,...i.data.sourceRepresentation})),notes:['Capacity is the native allocated grid capacity, not calibrated material mass heat capacity. Group occupied capacities overlap and are not additive.','Inert boundaries use their actual canonical exposed cells. Inert furniture has real obstruction geometry but no dedicated fuel/heat node; it therefore has zero assigned occupied capacity here.','The implicit background support plane is excluded from material areas; global grid capacity still counts every allocated cell once.','Combustible area follows the existing native fuel records, including finite finishes; inert furniture area follows submitted source triangles.']};
  value.totals=value.groups.reduce((sum,row)=>({registeredArea:sum.registeredArea+row.area,initialFuel:sum.initialFuel+row.initialFuel,potentialEnergy:sum.potentialEnergy+row.potentialEnergy}),{registeredArea:0,initialFuel:0,potentialEnergy:0});results[representation]=value;save(representation+'.json',value);console.log(JSON.stringify({representation,counts:value.counts,grid:value.grid,totals:value.totals}));
 }finally{trial?.dispose();}
}
const keyed=rows=>new Map(rows.map(r=>[[r.instanceId,r.material,r.fuelClass||'inert'].join('|'),r])),before=keyed(results.facets.groups),after=keyed(results.structure.groups);
save('comparison.json',{sources,before:results.facets.counts,after:results.structure.counts,gridBefore:results.facets.grid,gridAfter:results.structure.grid,groups:[...new Set([...before.keys(),...after.keys()])].sort().map(key=>({key,before:before.get(key)||null,after:after.get(key)||null}))});save('closed.json',{at:new Date().toISOString(),disposed:true,ports:[]});
