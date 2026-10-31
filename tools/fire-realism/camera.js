// Review-only camera policy. It never changes production follow/overview cameras.
const GAS_ENVELOPE={min:[-.75,-.05,6.25],max:[17.25,5.5,10.75]};
const TORCH_ENVELOPE={min:[2.5,-.05,6.25],max:[9,5.5,10.75]};
export function placeFireReviewCamera(T,camera,{scenario,view,viewport}){
  const {width,height}=viewport,aspect=width/height;
  // Shared normal/powder framing covers the actual accepted x5.25..15.15 walk,
  // initial gasoline back to x1.25, native body/tools and declared smoke support.
  // Torch framing also covers its separately accepted x4.25..6.95 review walk.
  const envelope=scenario.startsWith('gasoline')?GAS_ENVELOPE:scenario==='carried-torch'?TORCH_ENVELOPE:null;
  const focus=envelope?new T.Vector3(...envelope.min).add(new T.Vector3(...envelope.max)).multiplyScalar(.5):scenario==='street-fire'?new T.Vector3(30,1.5,10):new T.Vector3(5.7,.9,8.25);
  let span=scenario==='street-fire'?15:scenario==='wall-clipped-jet'?10:8;
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
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  return {focus:focus.toArray(),offset:offset.toArray(),span,side:scenario==='wall-clipped-jet'?'muzzle-side':'standard',...(envelope?{fitBounds:{min:[...envelope.min],max:[...envelope.max]},fitMargin:1.08}:{})};
}
