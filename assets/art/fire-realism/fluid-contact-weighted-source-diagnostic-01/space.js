/** Native scalar coordinates, not VolumeToMesh modifier coordinates. */
export function validateGrid(grid){
  const {resolution,origin,spacing}=grid??{};
  if(!Array.isArray(resolution)||resolution.length!==3||resolution.some(n=>!Number.isInteger(n)||n<1||n>96)||!Array.isArray(origin)||origin.length!==3||origin.some(v=>!Number.isFinite(v))||!Array.isArray(spacing)||spacing.length!==3||spacing.some(v=>!Number.isFinite(v)||v<=0))throw Error('Invalid bounded scalar grid');
  return resolution.reduce((a,b)=>a*b,1);
}
export function voxelIndex(ijk,grid){
  validateGrid(grid);const [nx,ny,nz]=grid.resolution;
  if(ijk.length!==3||ijk.some((v,i)=>!Number.isInteger(v)||v<0||v>=grid.resolution[i]))throw Error('Voxel landmark outside grid');
  return ijk[0]+nx*(ijk[1]+ny*ijk[2]);
}
export function scalarCentre(index,grid){
  const count=validateGrid(grid),[nx,ny]=grid.resolution;
  if(!Number.isInteger(index)||index<0||index>=count)throw Error('Scalar index outside grid');
  return [index%nx,Math.floor(index/nx)%ny,Math.floor(index/(nx*ny))].map((v,i)=>grid.origin[i]+v*grid.spacing[i]);
}
export function blenderToGame(p,translation=[5.5,0,8.5]){return[p[0]+translation[0],p[2]+translation[1],-p[1]+translation[2]];}
export function gameToBlender(p,translation=[5.5,0,8.5]){return[p[0]-translation[0],-(p[2]-translation[2]),p[1]-translation[1]];}
export function scalarBoundsToGame(bounds,translation=[5.5,0,8.5]){
  return {min:blenderToGame([bounds.min[0],bounds.max[1],bounds.min[2]],translation),max:blenderToGame([bounds.max[0],bounds.min[1],bounds.max[2]],translation)};
}
