import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {housePlanEdges} from '../../../src/art/gross-housing.js';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url))),base=path.join(root,'assets/art/hopkins-housing-v1'),catalogue=JSON.parse(fs.readFileSync(path.join(base,'houses.json'),'utf8'));
const out=path.join(base,'nautilus-traces');fs.mkdirSync(out,{recursive:true});
const source={repository:'https://github.com/Syntaxswine/nautilus-engine',commit:'cc52f89de6333a1d94e2dfe45d47d1317369fac0',contractPath:'packages/map-core/wall-runs.js',documentationPath:'docs/wall-runs.md',feature:'nautilus-wall-runs-v1'};
const round=n=>Math.round(n*1e8)/1e8;
let total=0,apertures=0;
for(const h of catalogue.houses){
 const offset=[12-h.width/2,12-h.depth/2],floorRecords=[...(h.basementFloor?[{index:-1,floor:h.basementFloor}]:[]),...h.floors.map((floor,index)=>({index,floor}))],lowest=floorRecords[0].index;
 const segments=[],openings=[];
 for(const {index,floor} of floorRecords){
  const z=index-lowest;
  housePlanEdges(h,floor).forEach((e,i)=>{
   const a=e.a.map((n,j)=>round(n+offset[j])),b=e.b.map((n,j)=>round(n+offset[j])),length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length;
   const segment=(start,end,suffix)=>segments.push({id:h.id+':L'+z+':W'+i+suffix,a:start,b:end,z,stories:1,material:index<0?'brick':h.style.wall==='brick'?'brick':'wood',sourceAssetId:h.id,sourceFloorIndex:index,sourceRoomIds:e.rooms,sourceEdge:e.id});
   if(!e.opening)segment(a,b,'');
   else{
    const pier=(length-1)/2,left=[round(a[0]+ux*pier),round(a[1]+uy*pier)],right=[round(b[0]-ux*pier),round(b[1]-uy*pier)];
    if(pier>.1){segment(a,left,':a');segment(right,b,':b');}
    openings.push({id:h.id+':L'+z+':O'+i,a:left,b:right,z,kind:e.opening,clearWidth:1,clearHeight:e.opening==='window'?(index<0?.7:1.2):1.65,sillHeight:e.opening==='window'?(index<0?.85:.35):0,lintelHeight:e.opening==='window'?.45:.35,sourceRoomIds:e.rooms,sourceEdge:e.id});
   }
  });
 }
 const trace={kind:'artist-wall-run-extension-fragment',sourceAssetId:h.id,sourcePlate:h.source.url,size:24,levels:floorRecords.length,wallRuns:{version:1,segments,artistOpenings:openings,sourceContract:source},placement:{translationGroundMetres:offset,translationHeightMetres:round(-h.plinth-lowest*2.12),sourceFloorToLayer:floorRecords.map(({index})=>({sourceFloor:index,layer:index-lowest}))},status:{nautilusImported:false,completeMapOrBlock:false,gameplayReady:false},notes:['This is the portable wallRuns extension fragment, not a complete aft-map-v2 or aft-block-v1 document.','One-metre native panels and cut end pieces follow the pinned Nautilus contract.','Door and window apertures are full-height trace gaps. artistOpenings records the separate native lintel, sill and insert work; wallRuns-v1 does not encode those vertical aperture parts.','The complete visible building, furnishings, roofs and cutaway floors are provided by the artist prefab and assembler.']};
 fs.writeFileSync(path.join(out,h.id+'.json'),JSON.stringify(trace,null,2)+'\n');total+=segments.length;apertures+=openings.length;
}
fs.writeFileSync(path.join(root,'art/source/hopkins-housing-v1/nautilus-contract.json'),JSON.stringify({...source,inspection:'Read fixed Git objects only; no donor edits or moving branch imports.',nativeKit:{panel:1,height:2,thickness:.16,floorSpacing:2.12},traces:catalogue.houses.length,segments:total,apertures,consumerStatus:'Editor authoring feature exists on the pinned candidate. Tinderbox consumer integration and full Nautilus house intake are separate.'},null,2)+'\n');
console.log(JSON.stringify({traces:catalogue.houses.length,segments:total,apertures,pinnedContract:source.commit},null,2));