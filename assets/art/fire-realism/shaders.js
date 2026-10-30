// Original TB-034 procedural density/emission. No photographic texture pixels.
const noise = `
  float h3(vec3 p) {return fract(sin(dot(p,vec3(39.3467,11.1351,83.1559)))*47453.5453);}
  float n3(vec3 p) {
    vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fb(vec3 p) {return n3(p)*.57+n3(p*2.07+13.7)*.28+n3(p*4.19-7.4)*.15;}
  float profile(float y,float smoke) {
    if(y<0.||y>1.)return 0.;
    return smoke>.5?.035+pow(max(0.,sin(3.14159265*y)),.66)*.96:max(.006,(.72+.24*sin(y*4.3))*pow(1.-y,.64));
  }
  float streamProfile(float y) {
    return (.10+.87*pow(clamp(y,0.,1.),.76))*(1.-smoothstep(.98,1.,y))+.006;
  }
`;
export const vertexShader = noise + `
  attribute vec3 iOrigin,iAxis,iPolicy; attribute vec4 iShape;
  uniform float clock,fuelJet; uniform vec3 jetAxisOrigin; uniform vec2 sourceDirection;
  varying vec3 local,world,base,axis,right,forward,policy; varying vec4 shape;
  void main() {
    shape=iShape; policy=iPolicy; base=iOrigin; axis=normalize(iAxis);
    right=normalize(cross(axis,abs(axis.y)>.94?vec3(0,0,1):vec3(0,1,0))); forward=cross(right,axis);
    vec3 p=position; float y=p.y,smoke=iPolicy.x,phase=iShape.w*83.71;
    if(iPolicy.y>=1.5) {
      // Disconnected authoritative rays cannot safely support any filled fan.
      // Keep their entire ground-plane support on the exact clipped line. Only
      // vertical silhouette varies; the second half-ring degenerates harmlessly.
      p.x=0.; p.z=(min(uv.x,.5)*4.-1.)*sin(y*3.14159265);
      p.z*=.85+.15*n3(vec3(phase,y*4.-clock*1.8,0.));
    } else {
      bool stream=fuelJet>.5&&iPolicy.y>.5&&iPolicy.y<1.5;
      p.xz*=stream?streamProfile(y):profile(y,smoke);
      vec3 flow=vec3(p.x*2.+phase,y*3.-clock*(smoke>.5?.34:1.8),p.z*2.-phase);
      float wave=n3(flow)*2.-1.,bend=pow(y,1.6)*(smoke>.5?.30:.34);
      if(stream) {
        vec3 centre=iOrigin+axis*y*iShape.y;
        float distanceAlong=dot(centre.xz-jetAxisOrigin.xz,sourceDirection);
        vec3 roll=vec3(centre.x*1.3,centre.z*1.3,distanceAlong*1.7-clock*3.8);
        p.x+=pow(y,1.25)*.38*(n3(roll+5.3)*2.-1.);
        p.z+=pow(y,1.5)*(.20+.31*(n3(roll-9.1)*2.-1.));
        p.xz*=.85+.31*fb(roll*1.7);
      } else {
        p.x+=bend*(n3(vec3(phase,y*2.-clock*.71,0.))*2.-1.);
        p.z+=bend*(n3(vec3(0.,phase,y*2.-clock*.63))*2.-1.);
        p.xz*=1.+wave*(smoke>.5?.13:.43)*sqrt(y);
      }
    }
    local=p; world=iOrigin+right*p.x*iShape.x+axis*p.y*iShape.y+forward*p.z*iShape.x;
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
  }
`;
export const fragmentShader = noise + `
  uniform float clock,orthographic,fieldEnabled,cellSize,rayCount,connected,jetHeading,forwardStart,opaqueDepthEnabled,fuelJet,jetExtent,jetTipHeight;
  uniform sampler2D field,rayTable,opaqueDepth; uniform vec2 grid,shapeOrigin,sourceOrigin,sourceDirection,opaqueDepthSize;
  uniform mat4 opaqueViewProjection; uniform vec3 player,jetAxisOrigin; uniform float playerRadius;
  varying vec3 local,world,base,axis,right,forward,policy; varying vec4 shape;
  float cross2(vec2 a,vec2 b) {return a.x*b.y-a.y*b.x;}
  bool fanAllowed(vec2 p) {
    vec2 q=p-shapeOrigin; if(dot(q,q)<1.e-12)return true;
    float a=atan(q.y,q.x)-jetHeading; a=atan(sin(a),cos(a));
    float loAngle=texelFetch(rayTable,ivec2(0,0),0).z,hiAngle=texelFetch(rayTable,ivec2(int(rayCount)-1,0),0).z;
    if(rayCount<2.||a<loAngle||a>hiAngle)return false;
    int lo=0,hi=int(rayCount)-1;
    for(int j=0;j<9;j++) {int mid=(lo+hi)/2; if(texelFetch(rayTable,ivec2(mid,0),0).z<=a)lo=mid;else hi=mid;}
    vec2 left=texelFetch(rayTable,ivec2(lo,0),0).xy-shapeOrigin;
    vec2 edge=texelFetch(rayTable,ivec2(min(lo+1,int(rayCount)-1),0),0).xy-shapeOrigin;
    return cross2(left,edge)>1.e-9&&cross2(left,q)>=-1.e-7&&cross2(q,edge)>=-1.e-7&&cross2(edge-left,q-left)>=-1.e-7;
  }
  bool opaqueStops(vec3 p,float sceneDepth) {
    if(opaqueDepthEnabled<.5)return false;
    vec4 projected=opaqueViewProjection*vec4(p,1.);
    if(projected.w<=0.)return true;
    // The march follows this camera ray. Compare every sample, not merely the
    // visible entry shell: a foreground wall may intersect the interior volume.
    float sampleDepth=projected.z/projected.w*.5+.5;
    return sampleDepth>sceneDepth+2.e-6;
  }
  float allowed(vec3 p) {
    if(policy.y>.5&&policy.y<1.5) {
      if(connected<.5||!fanAllowed(p.xz)||dot(p.xz-sourceOrigin,sourceDirection)<forwardStart)return 0.;
    }
    if(policy.z>.5&&fieldEnabled>.5) {
      vec2 cell=floor(p.xz/cellSize);
      if(any(lessThan(cell,vec2(0.)))||any(greaterThanEqual(cell,grid)))return 0.;
      return texture2D(field,(cell+.5)/grid).a;
    }
    return 1.;
  }
  vec3 worldPoint(vec3 p) {return base+right*p.x*shape.x+axis*p.y*shape.y+forward*p.z*shape.x;}
  bool streamField() {return fuelJet>.5&&policy.y>.5;}
  float volumeProfile(float y) {return streamField()&&policy.y<1.5?streamProfile(y):profile(y,policy.x);}
  // Common world-space reaction sheets and voids survive overlap between rays
  // and ground tongues. Independent per-instance noise used to refill each
  // other's gaps; axial segment seeds also exposed a repeated cone lattice.
  vec4 reaction(vec3 p) {
    vec3 wp=worldPoint(p),q,macro; float core=0.,progress=p.y;
    if(streamField()) {
      vec3 delta=wp-jetAxisOrigin;
      float along=dot(delta.xz,sourceDirection),side=dot(delta.xz,vec2(-sourceDirection.y,sourceDirection.x));
      progress=clamp(along/max(.001,jetExtent),0.,1.);
      float centre=mix(jetAxisOrigin.y,jetTipHeight,progress)+.06*pow(progress,1.5);
      float vertical=wp.y-centre;
      q=vec3(side*5.,vertical*5.,along*2.7-clock*5.5);
      macro=vec3(side*2.3,vertical*2.3,along*1.3-clock*2.0);
      float radius=.026+.12*pow(progress,.75);
      core=exp(-(side*side+vertical*vertical)/max(.0001,radius*radius))*(1.-smoothstep(.55,.88,progress));
    } else {
      q=wp*6.2-vec3(0.,clock*2.7,0.);
      macro=wp*2.35-vec3(0.,clock*.92,0.);
      core=(1.-smoothstep(.02,.22,length(p.xz)))*(1.-smoothstep(.02,.16,p.y));
    }
    q+=vec3(n3(q*.46+3.7),n3(q*.46-9.4),n3(q*.46+18.6))*.75;
    float coarse=fb(q),voids=smoothstep(.38,.65,fb(macro+vec3(7.1,-2.3,11.8)));
    float sheets=1.-smoothstep(.045,.14,abs(coarse-.53));
    return vec4(sheets,voids,core,coarse);
  }
  float density(vec3 p,vec4 f) {
    if(p.y<.001||p.y>.999)return 0.;
    float smoke=policy.x,seed=shape.w*83.71;
    vec2 bend=vec2(n3(vec3(seed,p.y*2.-clock*.71,0.)),n3(vec3(0.,seed,p.y*2.-clock*.63)))*2.-1.;
    vec2 radial=streamField()?p.xz-vec2(0.,.18*pow(p.y,1.5)):p.xz-pow(p.y,1.6)*(smoke>.5?.30:.34)*bend;
    float edge=length(radial)/max(.006,volumeProfile(p.y));
    if(smoke>.5) {
      vec3 flow=vec3(p.x*2.3+seed,p.y*3.4-clock*.42,p.z*2.3-seed);
      return (1.-smoothstep(.38,1.05,edge))*smoothstep(.23,.69,fb(flow))*smoothstep(0.,.12,p.y)*(1.-smoothstep(.74,1.,p.y));
    }
    float envelope=1.-smoothstep(.45,1.04,edge);
    float contact=f.z*(.15+.22*f.x);
    float termination=streamField()?1.-smoothstep(.97,1.,p.y):1.-smoothstep(.78,1.,p.y);
    return envelope*(f.x*f.y*.95+contact)*termination;
  }
  vec3 colorAt(vec3 p,float den,vec4 f) {
    if(policy.x>.5) {
      float light=clamp(.50+(density(p,vec4(0.))-density(p+vec3(-.13,.08,.09),vec4(0.)))*1.1,.19,.85);
      vec3 color=mix(vec3(.008,.006,.005),vec3(.17,.15,.125),light);
      if(policy.x>1.5)color*=.48;
      return color+vec3(.060,.012,.001)*pow(1.-p.y,3.);
    }
    float hot=clamp(.22+f.w*.66+den*.12,0.,1.);
    vec3 color=mix(vec3(.80,.018,.001),vec3(1.,.44,.020),smoothstep(.40,.76,hot));
    float white=f.z*(.65+f.x*.35);
    return mix(color,vec3(1.,1.,.82),smoothstep(.61,.94,white));
  }
  void main() {
    bool ribbon=policy.y>=1.5;
    vec3 eye=cameraPosition-base;
    vec3 eyeLocal=vec3(dot(eye,right)/shape.x,dot(eye,axis)/shape.y,dot(eye,forward)/shape.x);
    bool cameraInside=orthographic<.5&&eyeLocal.y>=0.&&eyeLocal.y<=1.&&length(eyeLocal.xz)<volumeProfile(eyeLocal.y);
    if(!ribbon&&!gl_FrontFacing&&!cameraInside)discard;
    vec2 depthUV=clamp(gl_FragCoord.xy/opaqueDepthSize,vec2(0.),vec2(1.));
    float sceneDepth=opaqueDepthEnabled>.5?texture2D(opaqueDepth,depthUV).r:1.;
    vec3 emission=vec3(0.); float alpha=0.;
    if(ribbon) {
      // Surface fallback preserves the exact safe old-ray support. No invented
      // volume/fan is hidden behind a claim of full 3D compatibility.
      if(opaqueStops(world,sceneDepth))discard;
      vec4 f=reaction(local); float den=density(local,f)*shape.z; alpha=1.-exp(-den*.95); emission=alpha*colorAt(local,den,f);
    } else {
      vec3 viewDir=orthographic>.5?-vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]):normalize(world-cameraPosition);
      vec3 d=normalize(vec3(dot(viewDir,right)/shape.x,dot(viewDir,axis)/shape.y,dot(viewDir,forward)/shape.x));
      vec3 p=cameraInside?eyeLocal:local+d*.004; float stepSize=.14;
      for(int j=0;j<18;j++) {
        vec3 wp=base+right*p.x*shape.x+axis*p.y*shape.y+forward*p.z*shape.x;
        if(opaqueStops(wp,sceneDepth))break;
        vec4 f=policy.x>.5?vec4(0.):reaction(p);
        float den=density(p,f)*shape.z*allowed(wp);
        float a=1.-exp(-den*stepSize*(policy.x>.5?2.3:4.6));
        emission+=(1.-alpha)*a*colorAt(p,den,f); alpha+=(1.-alpha)*a;
        if(alpha>.985)break; p+=d*stepSize;
      }
    }
    float legibility=mix(.48,1.,smoothstep(playerRadius+.15,playerRadius+.9,length(world.xz-player.xz)));
    if(alpha*legibility<.005)discard;
    gl_FragColor=vec4(emission/max(.0001,alpha),alpha*legibility);
    // Deliberately matches the published NoToneMapping renderer. No global
    // exposure/tone mapping change is needed to hide a preview mismatch.
    #include <colorspace_fragment>
  }
`;
