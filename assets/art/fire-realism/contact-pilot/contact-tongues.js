// Original contact-only morphology pilot. No simulation, new smoke or source history.
export const CONTACT_PILOT_VERSION = '0.10.0-contact-tongue-pilot';
export const CONTACT_ROOT_COUNT = 3;
const clamp = x => Math.max(0,Math.min(1,x));
const smooth = (a,b,x) => {const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function seed(word){let n=2166136261;for(const c of word)n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0)/4294967296;}
export function prepareContactTongues(frame){
  if(frame?.version!==1||!Number.isFinite(frame.worldTime)||!Number.isInteger(frame.tick))throw TypeError('Contact pilot requires the detached v1 frame');
  if(frame.discharge?.active===true||frame.player?.tool==='torch'&&frame.torch?.phase==='lit'&&frame.torch.remainingSeconds>0||frame.buildingVisuals?.length)throw RangeError('Contact pilot supports no emitting jet, torch or building');
  const active=(Array.isArray(frame.cells)?frame.cells:[]).filter(c=>c?.phase==='burning'&&Number.isFinite(c.intensity)&&c.intensity>0).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(!active.length)return {count:0,worldTime:frame.worldTime,sources:[],roots:[],bounds:null};
  if(active.length!==4||new Set(active.map(c=>c.id)).size!==4)throw RangeError('Contact pilot requires exactly four unique burning cells or zero live cells');
  if(active.some(c=>c.id===undefined||c.size!==.5||c.material!=='grass'||c.depositedFuel>0||!Number.isFinite(c.x)||!Number.isFinite(c.y)||!Number.isFinite(c.surfaceFuel)||!(c.surfaceFuel>0)||!Number.isFinite(c.elevation??0)||Math.abs((c.x-.25)/.5-Math.round((c.x-.25)/.5))>1e-7||Math.abs((c.y-.25)/.5-Math.round((c.y-.25)/.5))>1e-7))throw RangeError('Contact pilot requires four native half-metre grass cells with actual surface fuel');
  const minX=Math.min(...active.map(c=>c.x))-.25,minZ=Math.min(...active.map(c=>c.y))-.25,elevation=active[0].elevation??0,locations=new Set(active.map(c=>`${c.x}:${c.y}`));
  if(active.some(c=>Math.abs((c.elevation??0)-elevation)>1e-8)||![0,1].every(x=>[0,1].every(z=>locations.has(`${minX+.25+x*.5}:${minZ+.25+z*.5}`))))throw RangeError('Contact pilot only supports one complete native2x2 grass patch');
  const mean=active.reduce((n,c)=>n+clamp(c.intensity),0)/4,key=`${minX}:${minZ}:${elevation}`,layouts=[[.24,.28,.19,.82],[.73,.34,.14,1.06],[.49,.75,.17,.68]],roots=layouts.map(([x,z,r,height],i)=>{
    const a=seed(`${key}:root:${i}`),phase=a*6.28318530718+i*2.09439510239;
    const origin=[minX+x+(seed(`${key}:x:${i}`)-.5)*.04,elevation+.018,minZ+z+(seed(`${key}:z:${i}`)-.5)*.04];
    return {origin,radius:r,height:height*(.86+.14*Math.sin(frame.worldTime*4.2+phase))*(.55+.45*mean),phase,
      lean:[r*.25*Math.cos(frame.worldTime*1.6+phase),r*.25*Math.sin(frame.worldTime*1.4+phase)],sourceIds:active.map(c=>c.id)};
  });
  for(const r of roots)if(r.origin[0]-r.radius<minX||r.origin[0]+r.radius>minX+1||r.origin[2]-r.radius<minZ||r.origin[2]+r.radius>minZ+1)throw Error('Pilot root support escaped actual eligible footprint');
  return {count:3,worldTime:frame.worldTime,sources:active.map(c=>c.id),bounds:{min:[minX,elevation,minZ],max:[minX+1,elevation,minZ+1]},roots};
}
// Shared equations for conservative support and reaction. The centre derivative
// is bounded below the radial taper: nested cross-sections stay inside each root
// disk, and support's upper bisection bracket encloses the actual field.
export function contactCentre(root,u,time){const q=Math.sin(u*6.28318530718+time*.7+root.phase)*u*(1-u)*root.radius*.03;return[root.lean[0]*u*u+Math.cos(root.phase)*q,root.lean[1]*u*u+Math.sin(root.phase)*q];}
export function contactSupportHeight(prepared,x,z){
  let result=0;for(const r of prepared.roots){const q=[x-r.origin[0],z-r.origin[2]];if(Math.hypot(...q)>r.radius)continue;let lo=0,hi=1;for(let j=0;j<8;j++){const u=(lo+hi)*.5,c=contactCentre(r,u,prepared.worldTime);if(Math.hypot(q[0]-c[0],q[1]-c[1])<=r.radius*(1-u))lo=u;else hi=u;}result=Math.max(result,hi*r.height);}return result;
}
// CPU audit uses a bounded supplied noise value; it is not a GPU noise/image.
export function contactRootReaction(prepared,index,point,noise=.5){
  const r=prepared.roots[index],u=(point[1]-r.origin[1])/r.height;if(u<0||u>=1)return[0,0,0,0];
  const c=contactCentre(r,u,prepared.worldTime),x=point[0]-r.origin[0]-c[0],z=point[2]-r.origin[2]-c[1],rho=Math.hypot(x,z),radius=r.radius*(1-u),angle=Math.atan2(z,x),clock=prepared.worldTime;
  const inward=.07+.05*Math.sin(angle*2+u*7-clock*2+r.phase)+.025*clamp(noise),reactionRadius=radius*(1-inward),sheet=1-smooth(.006,.018,Math.abs(rho-reactionRadius));
  const aperture=1-smooth(.1,.65,Math.cos(angle+r.phase+u*2.7+clock*.35)),guard=smooth(0,.01,radius-rho),tip=1-smooth(.92,1,u),den=sheet*aperture*guard*tip*.95;
  const hot=Math.pow(Math.max(0,Math.cos(angle+r.phase*1.7)),12)*(1-smooth(.06,.30,u))*sheet*.45;
  return[den,.45+.33*sheet-.10*u,hot,aperture];
}
export function sampleContactReaction(prepared,point,coverage=1,noise=.5){
  if(!prepared.bounds||point[0]<prepared.bounds.min[0]||point[0]>=prepared.bounds.max[0]||point[2]<prepared.bounds.min[2]||point[2]>=prepared.bounds.max[2]||coverage<=.5)return[0,0,0,0];
  if(point[1]<prepared.bounds.min[1]+.018||point[1]-prepared.bounds.min[1]-.018>=contactSupportHeight(prepared,point[0],point[2])*Math.pow(smooth(.5,1,coverage),.75))return[0,0,0,0];
  let result=[0,0,0,0];for(let i=0;i<prepared.roots.length;i++){const f=contactRootReaction(prepared,i,point,noise);if(f[0]>result[0])result=f;}
  result[0]*=Math.pow(smooth(.5,1,coverage),.55);return result;
}
export const contactTongueGLSL = `
  uniform int pilotRootCount;
  uniform vec4 pilotOrigins[3],pilotMotions[3];
  vec2 pilotCentre(int i,float u) {
    vec4 o=pilotOrigins[i],m=pilotMotions[i];
    float q=sin(u*6.28318530718+clock*.7+m.y)*u*(1.-u)*o.w*.03;
    return m.zw*u*u+vec2(cos(m.y),sin(m.y))*q;
  }
  float pilotSupportHeight(vec2 p) {
    float result=0.;
    for(int i=0;i<3;i++) {
      if(i>=pilotRootCount)break;
      vec4 o=pilotOrigins[i],m=pilotMotions[i];vec2 q=p-o.xz;
      if(length(q)>o.w)continue;
      float lo=0.,hi=1.;
      for(int j=0;j<8;j++) {float u=(lo+hi)*.5;if(length(q-pilotCentre(i,u))<=o.w*(1.-u))lo=u;else hi=u;}
      result=max(result,hi*m.x);
    }
    return result;
  }
  float groundHeight(vec2 p,vec4 source) {
    if(source.a<=.5)return 0.;
    return pilotSupportHeight(p)*pow(groundEdgeCoverage(source.a),.75);
  }
  vec4 pilotRootReaction(vec3 wp,int i) {
    vec4 o=pilotOrigins[i],m=pilotMotions[i];float u=(wp.y-o.y)/m.x;
    if(u<0.||u>=1.)return vec4(0.);
    vec2 q=wp.xz-o.xz-pilotCentre(i,u);float rho=length(q),radius=o.w*(1.-u),angle=atan(q.y,q.x);
    // Noise wrinkles an already-attached surface. It cannot erase its topology.
    float detail=n3(vec3(wp.x*13.+m.y,u*8.-clock*2.1,wp.z*13.-m.y));
    float inward=.07+.05*sin(angle*2.+u*7.-clock*2.+m.y)+.025*detail;
    float reactionRadius=radius*(1.-inward),sheet=1.-smoothstep(.006,.018,abs(rho-reactionRadius));
    float aperture=1.-smoothstep(.1,.65,cos(angle+m.y+u*2.7+clock*.35));
    float guard=smoothstep(0.,.01,radius-rho),tip=1.-smoothstep(.92,1.,u);
    float den=sheet*aperture*guard*tip*.95;
    float hot=pow(max(0.,cos(angle+m.y*1.7)),12.)*(1.-smoothstep(.06,.30,u))*sheet*.45;
    return vec4(den,.45+.33*sheet-.10*u,hot,aperture);
  }
  vec4 groundReaction(vec3 wp) {
    vec4 source=groundSample(wp.xz);float edge=groundEdgeCoverage(source.a);
    if(edge<=0.||wp.y<base.y||wp.y-base.y>=groundHeight(wp.xz,source))return vec4(0.);
    vec4 result=vec4(0.);
    for(int i=0;i<3;i++) {if(i>=pilotRootCount)break;vec4 f=pilotRootReaction(wp,i);if(f.x>result.x)result=f;}
    result.x*=source.x*pow(edge,.55);return result;
  }
`;
export function assembleContactField(source){
  const start=source.indexOf('  // The actual curved upper support'),end=source.indexOf('  vec3 groundEmission(');
  if(start<0||end<=start||source.indexOf('  float groundHeight(')!==source.lastIndexOf('  float groundHeight('))throw Error('Unknown frozen R09 field layout');
  return source.slice(0,start)+contactTongueGLSL+source.slice(end);
}
