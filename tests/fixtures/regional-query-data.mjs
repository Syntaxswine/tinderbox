import {bounds} from '../../workbenches/furnished-house/geometry.js';
export const grid=()=>({origin:[0,0,0],pitch:[1,1,1]});
export function boxTriangles(min,max){const a=min,b=max,v=[[a[0],a[1],a[2]],[b[0],a[1],a[2]],[b[0],b[1],a[2]],[a[0],b[1],a[2]],[a[0],a[1],b[2]],[b[0],a[1],b[2]],[b[0],b[1],b[2]],[a[0],b[1],b[2]]];return [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]].flatMap(f=>[[v[f[0]],v[f[1]],v[f[2]]],[v[f[0]],v[f[2]],v[f[3]]]]);}
export function boxFixture(size=4){
  const min=[.1,.1,.1],max=[size-.1,size-.1,size-.1],solid=boxTriangles(min,max),partRef={id:'box',carrierId:'owner',geometry:'manual-original-box',closed:true},rayRecord={id:'cold-box',sourceSurfaceId:'owner',sourceCarrierId:'owner',nativePartId:'box',intact:true,normal:[0,1,0],transmission:.02,openFraction:0,triangles:solid,bounds:bounds(solid.flat())};
  const source={partRef,surfaceTriangles:solid,solidTriangles:solid,closed:true,rayRecord},inventory=[],cells=[];
  for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++)cells.push([x,y,z]);
  // Manual exterior rectangles only. No caps or compiler, including interior cells.
  for(let axis=0;axis<3;axis++)for(const side of [0,1])for(let a=0;a<size;a++)for(let b=0;b<size;b++){
    const i=(axis+1)%3,j=(axis+2)%3,c=[0,0,0];c[axis]=side?size-1:0;c[i]=a;c[j]=b;const points=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>{const p=[0,0,0];p[axis]=side?max[axis]:min[axis];p[i]=u?Math.min(a+1,max[i]):Math.max(a,min[i]);p[j]=v?Math.min(b+1,max[j]):Math.max(b,min[j]);return p;}),ts=[[points[0],points[1],points[2]],[points[0],points[2],points[3]]],n=[0,0,0];n[axis]=side?1:-1;
    if(!side)for(const t of ts)t.reverse();inventory.push({cell:c,record:{id:`native/${axis}/${side}@${c}`,sourceSurfaceId:`face/${axis}/${side}`,sourceCarrierId:'owner',nativePartId:'box',triangles:ts,solidTriangles:ts,closedShape:false,intact:true,normal:n,transmission:.02,openFraction:0,bounds:bounds(ts.flat())}});
  }
  return {grid:grid(),sources:[source],nativeInventory:inventory,sourceRevision:'manual-fixed-box',cells,min,max};
}
export function activate(kernel,input,cells=input.cells){const wanted=new Set(cells.map(c=>c.join(','))),records=input.nativeInventory.filter(n=>wanted.has(n.cell.join(','))).map(n=>n.record.id),token=kernel.coverage({partId:input.sources[0].partRef.id,cells,records,complete:true}),v=kernel.view();return kernel.prepare({expectedGeneration:v.generation,expectedRevision:v.revision,native:[token]}).commit();}
export const hitValues=hits=>hits.map(h=>({id:h.surface.id,t:h.t,normal:h.normal}));
export function planeFixture(){const quad=(lo,hi)=>[[[lo,.5,.1],[hi,.5,.9],[hi,.5,.1]],[[lo,.5,.1],[lo,.5,.9],[hi,.5,.9]]],ts=quad(.1,3.9),partRef={id:'plane',carrierId:'owner',geometry:'manual-original-plane',closed:false},record=(id,triangles)=>({id,sourceSurfaceId:'plane-face',sheetKey:'one-original-sheet',sourceCarrierId:'owner',nativePartId:'plane',intact:true,normal:[0,1,0],transmission:.02,openFraction:0,closedShape:false,triangles,solidTriangles:triangles,bounds:bounds(triangles.flat())});return {grid:grid(),sources:[{partRef,closed:false,surfaceTriangles:ts,solidTriangles:ts,rayRecord:record('cold-plane',ts)}],nativeInventory:[0,1,2,3].map(x=>({cell:[x,0,0],record:record('plane@'+x,quad(Math.max(.1,x),Math.min(3.9,x+1)))})),sourceRevision:'manual-fixed-plane',cells:[0,1,2,3].map(x=>[x,0,0])};}
