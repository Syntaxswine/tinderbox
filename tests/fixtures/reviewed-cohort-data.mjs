import {inputFixture,proof} from './shared-map-input-data.mjs';
export function reviewedCohortFixture(options={}){
  const f=inputFixture(options),part=structuredClone(f.index.parts[0]),carrier=structuredClone(f.index.carriers[0]);part.id='outside';part.carrier=3;part.geometry='outside';part.matrix[12]=10;part.bounds={min:part.bounds.min.map((v,i)=>v+(i===0?10:0)),max:part.bounds.max.map((v,i)=>v+(i===0?10:0))};carrier.id='outside';carrier.parts=[3];carrier.bounds=part.bounds;carrier.fuelAmount=0;carrier.fuelClass=null;f.index.parts.push(part);f.index.carriers.push(carrier);f.library.geometries.outside=structuredClone(f.library.geometries.floor);f.index.carriers[1].supports=[0,3];
  if(options.wideColdRoof){
    // Two complete neighboring cold cells meet at the unchanged 1.5 m port.
    // The ordinary boundary fixture has a shorter leftmost cell instead.
    const position=f.library.geometries.roof.attributes.position.array;
    for(let i=0;i<position.length;i+=3)if(position[i]===1.125)position[i]=.125;
    f.index.parts[2].bounds.min[0]=.125;f.index.carriers[2].bounds.min[0]=.125;
    f.descriptor.parts.find(p=>p.id==='roof').bounds.min[0]=.125;
    f.logicalCells=f.parts.reduce((n,p)=>n+p.bounds.max.reduce((count,v,i)=>{const pitch=[.5,1.06,.5][i],first=Math.floor(p.bounds.min[i]/pitch+1e-7),last=v-p.bounds.min[i]<1e-7?first:Math.ceil(v/pitch-1e-7)-1;return count*(last-first+1);},1),0);
    if(f.logicalCells>64||f.thermalTriangles>256)throw Error('Wide cold fixture exceeds synthetic bounds');
  }
  f.descriptor.projections[0].part.globalIndex=4;f.descriptor.projections[0].owner.globalIndex=4;f.descriptor.parts.find(p=>p.id==='upper').globalIndex=4;f.policy.approvedProjections=structuredClone(f.descriptor.projections);
  const ordinary=[{ownerId:'fixture::fit',semantics:'OR',parentIds:['fixture::floor','fixture::outside'],bondIds:[],proofRef:null}];f.descriptor.support.ordinaryAlternatives=structuredClone(ordinary);f.descriptor.cohort={kind:'reviewed-positive-cohort-v1',id:'fixture-reviewed-v1',approvalRef:proof,reviewRef:proof};
  f.policy.reviewedCohort={header:structuredClone(f.descriptor.cohort),ownerIds:['fixture::floor','fixture::fit','fixture::roof','fixture::upper'],partIds:['floor','fit','roof','upper'],bondIds:['floor-port','roof-port','upper-port'],anchorIds:['floor-root','roof-root'],requirements:structuredClone(f.descriptor.support.requirements),rootTraces:structuredClone(f.descriptor.support.rootTraces),ordinaryAlternatives:structuredClone(ordinary)};
  return f;
}
