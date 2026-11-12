// Explicit inert bearing geometry for numerical fixtures. These are closed
// masonry piers, not privileged fixture/room/level rules in the simulation.
export function bearingPiers(height=2,size=2,width=.2) {
  const surfaces=[];
  for(const [x,z]of [[0,0],[0,size-width],[size-width,0],[size-width,size-width]]) {
    const p=[[x,0,z],[x+width,0,z],[x+width,0,z+width],[x,0,z+width],[x,height,z],[x+width,height,z],[x+width,height,z+width],[x,height,z+width]],faces=[[[4,7,6,5],[0,1,0]],[[0,1,2,3],[0,-1,0]],[[0,3,7,4],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[0,4,5,1],[0,0,-1]],[[3,2,6,7],[0,0,1]]];
    for(let i=0;i<faces.length;i++){const [f,normal]=faces[i];surfaces.push({id:`pier:${x}:${z}:${i}`,kind:i===0?'floor':'plinth',material:'masonry',normal,thickness:0,triangles:[[p[f[0]],p[f[1]],p[f[2]]],[p[f[0]],p[f[2]],p[f[3]]]],fuelAmount:0});}
  }
  return surfaces;
}
