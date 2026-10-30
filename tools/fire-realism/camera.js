// Review-only camera policy. It never changes production follow/overview cameras.
export function placeFireReviewCamera(T,camera,{scenario,view,viewport}){
  const {width,height}=viewport,aspect=width/height;
  const focus=scenario==='street-fire'?new T.Vector3(30,1.5,10):scenario.startsWith('gasoline')?new T.Vector3(7,.6,8.25):new T.Vector3(5.7,.9,8.25);
  const span=scenario==='street-fire'?15:scenario==='wall-clipped-jet'?10:8;
  // The real wall is east of the bear. Observe from the muzzle side, rather than
  // making the opaque wall disappear or moving the authoritative discharge.
  const offset=new T.Vector3(scenario==='wall-clipped-jet'?-10:10,view==='oblique'?5:14,12);
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
  camera.position.copy(focus).add(offset);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  return {focus:focus.toArray(),offset:offset.toArray(),span,side:scenario==='wall-clipped-jet'?'muzzle-side':'standard'};
}
