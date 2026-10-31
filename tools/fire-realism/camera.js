// Review-only camera policy. It never changes production follow/overview cameras.
const GAS_ENVELOPE={min:[-.75,-.05,6.25],max:[17.25,5.5,10.75]};
const TORCH_ENVELOPE={min:[2.5,-.05,6.25],max:[9,5.5,10.75]};
// Measured native Ashland structure and stationary AFT bear/matches, including
// source porch/stairs/roof and the full 253-cell authored wood footprint. These
// review supports are independent of effect mode and currently burning count.
const STREET_STRUCTURE={min:[26.69,-.13,2.69],max:[33.31,6.37,13.67]};
const STREET_ANIMAL={min:[30.55,-.05,16.35],max:[31.65,2.1,17.65]};
const STREET_WOOD_HULL=[[26.5,2.5],[33.5,2.5],[33.5,10.5],[28.5,14],[26.5,14]];
function streetSupport(T){
  const points=[];
  for(const bounds of [STREET_STRUCTURE,STREET_ANIMAL])for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push(new T.Vector3(x,y,z));
  // Declared representative source-smoke allowance: 2m laterally and 6.5m high.
  for(const [x,z]of STREET_WOOD_HULL)for(const dx of [-2,2])for(const dz of [-2,2])for(const y of [0,6.5])points.push(new T.Vector3(x+dx,y,z+dz));
  return points;
}
export function placeFireReviewCamera(T,camera,{scenario,view,viewport}){
  const {width,height}=viewport,aspect=width/height;
  // Shared normal/powder framing covers the actual accepted x5.25..15.15 walk,
  // initial gasoline back to x1.25, native body/tools and declared smoke support.
  // Torch framing also covers its separately accepted x4.25..6.95 review walk.
  const envelope=scenario.startsWith('gasoline')?GAS_ENVELOPE:scenario==='carried-torch'?TORCH_ENVELOPE:null;
  const focus=envelope?new T.Vector3(...envelope.min).add(new T.Vector3(...envelope.max)).multiplyScalar(.5):scenario==='street-fire'?new T.Vector3(30,1.5,10):new T.Vector3(5.7,.9,8.25);
  const street=scenario==='street-fire';let streetBounds=null;
  let span=street?15:scenario==='wall-clipped-jet'?10:8;
  // The real wall is east of the bear. Observe from the muzzle side, rather than
  // making the opaque wall disappear or moving the authoritative discharge.
  const offset=new T.Vector3(scenario==='wall-clipped-jet'?-10:10,view==='oblique'?5:14,12);
  camera.position.copy(focus).add(offset);camera.lookAt(focus);camera.updateMatrixWorld();
  if(envelope){
    let horizontal=0,vertical=0;
    for(const x of [envelope.min[0],envelope.max[0]])for(const y of [envelope.min[1],envelope.max[1]])for(const z of [envelope.min[2],envelope.max[2]]){
      const point=new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);horizontal=Math.max(horizontal,Math.abs(point.x));vertical=Math.max(vertical,Math.abs(point.y));
    }
    span=Math.max(span,horizontal*2/aspect,vertical*2)*1.08;
  }
  if(street){
    const support=streetSupport(T),projected=support.map(point=>point.clone().applyMatrix4(camera.matrixWorldInverse));
    const minX=Math.min(...projected.map(p=>p.x)),maxX=Math.max(...projected.map(p=>p.x)),minY=Math.min(...projected.map(p=>p.y)),maxY=Math.max(...projected.map(p=>p.y));
    // Fit separate native/source supports in the camera plane, rather than
    // adding nonexistent corners of a merged world-space building/animal box.
    const shift=new T.Vector3((minX+maxX)/2,(minY+maxY)/2,0).applyQuaternion(camera.quaternion);
    focus.add(shift);camera.position.add(shift);camera.lookAt(focus);camera.updateMatrixWorld();
    span=Math.max(span,(maxX-minX)/aspect,maxY-minY)*1.08;
    const bounds=new T.Box3().setFromPoints(support);streetBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  }
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  return {focus:focus.toArray(),offset:offset.toArray(),span,side:scenario==='wall-clipped-jet'?'muzzle-side':'standard',...(street?{fitBounds:streetBounds,fitMargin:1.08,fitScope:{buildingId:'ashland-cottage',sourceCells:253,smokeLateralMetres:2,smokeCeilingMetres:6.5}}:{}),...(envelope?{fitBounds:{min:[...envelope.min],max:[...envelope.max]},fitMargin:1.08}:{})};
}
