/** Pure source-owned geometry; no reader, solver, renderer or field mutation. */
import {buildSupportPrisms,prismGeometry,footprintContains,prismOwnsHeight} from '../../../../assets/art/fire-realism/fluid-contact/support.js';
import {scalarBoundsToGame} from '../../../../assets/art/fire-realism/fluid-contact/space.js';
import {floorPrism} from '../mantaflow-surface-source/asset-v5/templates/floor.js';
const need=(ok,m)=>{if(!ok)throw Error(m);};
export function pairSupport(current,next,grid,check=()=>{}){
 const raw=buildSupportPrisms(current,next,grid),render=raw.map(floorPrism).filter(Boolean),[nx,ny,nz]=grid.resolution,[hx,hy,hz]=grid.spacing;
 for(let i=1;i<render.length;i++)need(render[i-1].upper<=render[i].lower,'Repeated/overlapping integration band');
 let rows=0,centres=0,haloCorners=0;
 for(const frame of[current,next])for(const channel of['density','flame']){
  const a=frame[channel];
  for(let z=0;z<nz;z++){check();const height=grid.origin[2]+z*hz;
   for(let y=0;y<ny;y++){
    let lo=nx,hi=-1,count=0;for(let x=0;x<nx;x++)if(a[x+nx*(y+ny*z)]>0){lo=Math.min(lo,x);hi=Math.max(hi,x);count++;}
    if(hi<0)continue;rows++;centres+=count;need(height>=0,'Positive centre excluded by floor');
    need(render.filter(p=>prismOwnsHeight(p,height)).length===1,'Positive centre requires exactly one half-open owner');
    const x0=grid.origin[0]+lo*hx-hx,x1=grid.origin[0]+hi*hx+hx,y0=grid.origin[1]+y*hy-hy,y1=grid.origin[1]+y*hy+hy;
    for(const band of[z-1,z]){const prism=raw.find(p=>p.band===band);need(prism,'Missing current/next one-voxel halo band');
     need(prism.lower===grid.origin[2]+band*hz&&prism.upper===grid.origin[2]+(band+1)*hz,'Shifted support endpoints');
     for(const p of[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]){need(footprintContains(prism,p),'Current/next halo escaped convex support');haloCorners++;}
    }
   }
  }
 }
 let moved=0,discarded=0,vertices=0,triangles=0,maxHull=0;const negative=[];
 for(const p of raw){check();if(p.lower<0){const mesh=prismGeometry(p);negative.push({band:p.band,lower:p.lower,upper:p.upper,vertices:mesh.vertices.filter((v,i)=>i%3===2&&v<0).length});}
  const clipped=floorPrism(p);if(!clipped){discarded++;continue;}if(clipped.lower!==p.lower)moved+=p.hull.length;
  const mesh=prismGeometry(clipped);need(mesh.vertices.every((v,i)=>i%3!==2||v>=0),'Render geometry below physical floor');vertices+=mesh.vertices.length/3;triangles+=mesh.indices.length/3;maxHull=Math.max(maxHull,p.hull.length);
 }
 const bounds=raw.length?{min:[Math.min(...raw.flatMap(p=>p.hull.map(x=>x[0]))),Math.min(...raw.flatMap(p=>p.hull.map(x=>x[1]))),raw[0].lower],max:[Math.max(...raw.flatMap(p=>p.hull.map(x=>x[0]))),Math.max(...raw.flatMap(p=>p.hull.map(x=>x[1]))),raw.at(-1).upper]}:null;
 return{raw,render,metrics:{rawPrisms:raw.length,renderPrisms:render.length,maxHullVertices:maxHull,vertices,triangles,coverage:{sourceFrames:2,channels:['density','flame'],positiveRowWitnesses:rows,positiveCentreWitnesses:centres,oneVoxelHaloCornerWitnesses:haloCorners,eachPositiveCentreHasOneOwner:true,bothCurrentNextContained:true},boundsBlender:bounds,boundsNative:bounds?scalarBoundsToGame(bounds):null,floor:{nativeY:0,movedVertices:moved,discardedPrisms:discarded,rawNegativeHalo:negative,minimumRawLower:raw.length?raw[0].lower:null,excludedReconstructedContributionBelowFloor:true},upperOverhangApproved:false}};
}
