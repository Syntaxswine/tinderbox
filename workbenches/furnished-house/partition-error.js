import {EPS,bounds,triangleArea} from './geometry.js';

// Independent zero-tolerance clipping measures a source-local envelope around
// the native clipper's two epsilon bands: its expanded cell and its inside test.
// This measures numeric partition error only; it never changes a fuel amount.
export function sourcePartitionAllowance(surface,{origin,pitch}){
  const ts=surface.triangles,box=bounds(ts.flat()),amount=surface.fuelAmount+(surface.finish?.amount||0),sourceArea=ts.reduce((n,t)=>n+triangleArea(t),0);
  const lo=box.min.map((v,i)=>Math.floor((v-origin[i])/pitch[i]+EPS)),hi=box.max.map((v,i)=>box.max[i]-box.min[i]<EPS?lo[i]:Math.ceil((v-origin[i])/pitch[i]-EPS)-1),skip=box.min.map((v,i)=>box.max[i]-v<EPS);
  const coordinateScale=Math.max(1,...ts.flat().flat().map(Math.abs),...pitch),u=Number.EPSILON/2;let lowerArea=0,upperArea=0,roundoffArea=0,candidateTriangleCells=0,minCrossingDelta=Infinity;
  function strictArea(t,cellBox){
    let poly=t.map(p=>({p:[...p],error:[0,0,0]}));
    for(let axis=0;axis<3;axis++)if(!skip[axis])for(const [value,above]of [[cellBox.min[axis],true],[cellBox.max[axis],false]]){
      const out=[];for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],ia=above?a.p[axis]>=value:a.p[axis]<=value,ib=above?b.p[axis]>=value:b.p[axis]<=value;if(ia)out.push(a);
        if(ia!==ib){const numerator=value-a.p[axis],denominator=b.p[axis]-a.p[axis],fraction=numerator/denominator;
          minCrossingDelta=Math.min(minCrossingDelta,Math.abs(denominator));
          const numeratorError=4*u*coordinateScale+a.error[axis]+u*Math.abs(numerator),denominatorError=a.error[axis]+b.error[axis]+u*Math.abs(denominator),safeDenominator=Math.abs(denominator)-denominatorError;
          if(safeDenominator<=0)throw Error('Unbounded source partition roundoff '+surface.id);
          const fractionError=(numeratorError+Math.abs(fraction)*denominatorError)/safeDenominator+u*Math.abs(fraction),p=a.p.map((v,j)=>v+(b.p[j]-v)*fraction),error=p.map((v,j)=>{
            const delta=b.p[j]-a.p[j],deltaError=a.error[j]+b.error[j]+u*Math.abs(delta);
            return a.error[j]+Math.abs(fraction)*deltaError+Math.abs(delta)*fractionError+deltaError*fractionError+u*Math.abs(delta*fraction)+u*Math.abs(v);
          });out.push({p,error});
        }
      }poly=out;
    }
    const area=poly.slice(1,-1).reduce((n,_,i)=>n+triangleArea([poly[0].p,poly[i+1].p,poly[i+2].p]),0),perimeter=poly.reduce((n,v,i)=>n+Math.hypot(...v.p.map((p,j)=>p-poly[(i+1)%poly.length].p[j])),0);
    // Propagate every subtraction/division/multiply/add through successive
    // intersections. Euclidean vertex uncertainty sweeps edge strips and corner
    // disks; 64u*N*scale² also covers cross products, lengths and the area sum.
    const e=Math.max(0,...poly.map(v=>Math.hypot(...v.error))),roundoff=perimeter*e+Math.PI*poly.length*e*e+64*u*poly.length*coordinateScale**2;
    return {area,roundoff};
  }
  for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++)for(const t of ts){
    const cell=[x,y,z],outer={min:cell.map((v,i)=>origin[i]+v*pitch[i]-2*EPS),max:cell.map((v,i)=>origin[i]+(v+1)*pitch[i]+2*EPS)},inner={min:cell.map((v,i)=>origin[i]+v*pitch[i]+2*EPS),max:cell.map((v,i)=>origin[i]+(v+1)*pitch[i]-2*EPS)},a=strictArea(t,outer),b=strictArea(t,inner);
    upperArea+=a.area;lowerArea+=b.area;roundoffArea+=a.roundoff+b.roundoff;candidateTriangleCells++;
  }
  const areaDiscardBound=7*EPS*candidateTriangleCells,coreThresholdLoss=EPS*candidateTriangleCells*(1+(surface.finish?.amount||0)/(surface.fuelAmount||1)),roundoffBound=amount*roundoffArea/sourceArea;
  return {epsilon:EPS,sourceArea,lowerArea,upperArea,candidateTriangleCells,areaDiscardBound,coordinateScale,minCrossingDelta:Number.isFinite(minCrossingDelta)?minCrossingDelta:null,
    positive:amount*Math.max(0,upperArea/sourceArea-1)+roundoffBound,negative:amount*Math.max(0,1-lowerArea/sourceArea)+amount*areaDiscardBound/sourceArea+coreThresholdLoss+roundoffBound,roundoffBound};
}
