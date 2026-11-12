// Optional whole-building visual approximation. Reuses the reference point pool;
// finite intensity/area sets power, never thermal state or gameplay.
export function createBuildingGlow(data) {
 const floors=data.surfaces.filter(s=>s.kind==='floor'&&s.level===0),points=floors.flatMap(s=>s.triangles.flat());
 if(!points.length)throw Error('Building glow requires measured floor geometry');
 const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
 const x=(min[0]+max[0])/2,z=(min[2]+max[2])/2,reach=Math.min(28,Math.max(8,Math.hypot(max[0]-min[0],max[2]-min[2])+4));
 const levels=data.levels.slice().sort((a,b)=>a.index-b.index);
 let record={mode:'building',terrainSites:0,surfaceSites:0,candidates:0,capacity:6,powerCap:215,activeArea:0,activeEnergy:0,lights:[]};
 return {
  update(lights,sources,time){
   let energy=0,area=0,weightedHeight=0;
   // Visible roof support can relocate q.y; aggregation uses the original frame height.
   for(const q of sources){const e=q.area*q.flame;energy+=e;area+=q.area;weightedHeight+=(q.authoritativeY??q.y)*e;}
   const low=levels[0].floorY+.6,high=levels.at(-1).floorY+1.8,height=Math.max(low,Math.min(high,energy?weightedHeight/energy+.36:low));
   // Four exterior positions face the facades; two spread light over native storeys.
   const positions=[[min[0]-1,height,z],[max[0]+1,height,z],[x,height,min[2]-1],[x,height,max[2]+1],[x,levels[0].floorY+.9,z],[x,levels.at(-1).floorY+.9,z]];
   const power=energy>0?Math.min(215,19*energy**.82)*(.96+.04*Math.sin(time*7.1)):0;
   const pool=lights.filter(l=>l.isPointLight).slice(0,6),selected=[];
   for(let i=0;i<pool.length;i++){
    const light=pool[i];light.intensity=power/pool.length;light.distance=reach;light.decay=2;light.position.fromArray(positions[i]);
    if(light.intensity>0)selected.push({kind:'building',buildingId:data.buildingId,position:light.position.toArray(),intensity:light.intensity,reach:light.distance});
   }
   record={mode:'building',terrainSites:0,surfaceSites:sources.length,candidates:energy>0?pool.length:0,capacity:6,powerCap:215,activeArea:area,activeEnergy:energy,lights:selected};
  },
  diagnostics(){return {...record,lights:record.lights.map(l=>({...l,position:[...l.position]}))};}
 };
}
