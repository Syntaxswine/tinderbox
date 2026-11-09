import {createSplatPatch} from '../reuse/ashland/splats.js';
import {clamp,seedOf} from './resources.js';

const ONSET=.43,PEAK=.98,MAX_SITES=12,SPLATS_PER_SITE=3,MAX_SPLATS=MAX_SITES*SPLATS_PER_SITE;
const smooth=(a,b,value)=>{const t=clamp((value-a)/(b-a));return t*t*(3-2*t);};
const finite=Number.isFinite;

// These are brief warning wisps, sampled from the current heat rather than accumulated particles.
// The host supplies only intact, unignited exterior siding sites in world metres.
export function createSidingPreheat(T){
  const batch=createSplatPatch(T,{maxPatches:0,extraCapacity:MAX_SPLATS});
  const {root}=batch;root.name='Siding preheat smoke';root.visible=false;
  for(const mesh of root.children)mesh.renderOrder=-1; // Normal burning effects draw over the warning.
  const rootTint=new T.Color(0xada397),puffTint=new T.Color(0x9c968f);
  const frustum=new T.Frustum(),projection=new T.Matrix4(),extent=new T.Sphere();extent.radius=1.3;
  const wind=new Float64Array(3),splats=[],ranked=[],selected=new Set();
  let activeSites=0,disposed=false;

  function update({sites=[],time=0,camera,player,sampleWind}={}){
    if(disposed)return;
    root.visible=false;activeSites=0;
    if(!camera||!finite(time)||!sites.length)return;
    camera.updateWorldMatrix(true,false);
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),camera.coordinateSystem,camera.reversedDepth);
    ranked.length=0;
    for(const site of sites){
      if(typeof site?.id!=='string'||![site.x,site.y,site.z,site.nx,site.nz,site.heatFraction].every(finite)||site.heatFraction<=ONSET)continue;
      const normalLength=Math.hypot(site.nx,site.nz);
      extent.center.set(site.x,site.y+.35,site.z);
      if(normalLength<.5||!frustum.intersectsSphere(extent))continue;
      const distance=player&&finite(player.x)&&finite(player.y)?(site.x-player.x)**2+(site.z-player.y)**2:0;
      ranked.push({site,normalLength,distance});
    }
    ranked.sort((a,b)=>b.site.heatFraction-a.site.heatFraction||a.distance-b.distance||(a.site.id<b.site.id?-1:a.site.id>b.site.id?1:0));
    splats.length=0;selected.clear();
    for(const {site,normalLength} of ranked){
      if(activeSites===MAX_SITES)break;
      const {id,x,y,z,heatFraction}=site;
      if(selected.has(id))continue;
      selected.add(id);activeSites++;
      const warmth=smooth(ONSET,PEAK,heatFraction);
      const heat=warmth*(1+.70*(1-warmth)); // Lift the middle without increasing the peak.
      const nx=site.nx/normalLength,nz=site.nz/normalLength,tx=-nz,tz=nx;
      const phase=seedOf(id),heading=Math.atan2(tz,tx);
      wind.fill(0);const velocity=sampleWind?.(x+nx*.14,y+.25,z+nz*.14,wind)??wind;
      const vx=finite(velocity[0])?velocity[0]:0,vz=finite(velocity[2])?velocity[2]:0;
      const along=clamp(vx*tx+vz*tz,-.58,.58),out=clamp(vx*nx+vz*nz,0,.34);
      const up=clamp(finite(velocity[1])?velocity[1]:0,-.25,.5);
      const driftX=.46*(along*tx+out*nx),driftZ=.46*(along*tz+out*nz);
      splats.push({x:x+nx*.047,y:y+.11+.15*heat,z:z+nz*.047,sx:.063+.039*heat,sy:.092+.071*heat,sz:.031+.035*heat,
        leanX:driftX*.45,leanZ:driftZ*.45,heading,color:rootTint,alpha:.30*heat,smoke:true});
      for(let i=0;i<2;i++){
        const cycle=time/1.36+phase+i*.5,age=cycle-Math.floor(cycle);
        const opacity=smooth(0,.16,age)*(1-smooth(.48,1,age));
        const sway=(.025+.061*age)*Math.sin(phase*6.283+age*5.1+i*2.1),outward=.065+.064*age;
        const rise=.24+age*(.31+.40*heat+up*.16),growth=(.79+.21*heat);
        splats.push({x:x+nx*outward+driftX*age+tx*sway,y:y+rise,z:z+nz*outward+driftZ*age+tz*sway,
          sx:(.071+.070*age)*growth,sy:(.094+.056*age)*growth,sz:(.046+.045*age)*growth,
          leanX:driftX*.42+tx*sway,leanZ:driftZ*.42+tz*sway,heading,color:puffTint,alpha:.24*heat*opacity,smoke:true});
      }
    }
    if(!activeSites)return;
    batch.update({time,camera,extraSplats:splats});
    root.visible=batch.stats().smokeSplats>0;
  }

  return {root,update,stats:()=>({sites:activeSites,splats:root.visible?batch.stats().smokeSplats:0,maxSites:MAX_SITES,maxSplats:MAX_SPLATS}),
    dispose(){if(disposed)return;disposed=true;activeSites=0;root.visible=false;batch.dispose();}};
}
