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
`;
export const vertexShader = noise + `
  attribute vec3 iOrigin,iAxis,iPolicy; attribute vec4 iShape;
  uniform float clock;
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
      p.xz*=profile(y,smoke);
      vec3 flow=vec3(p.x*2.+phase,y*3.-clock*(smoke>.5?.34:1.8),p.z*2.-phase);
      float wave=n3(flow)*2.-1.,bend=pow(y,1.6)*(smoke>.5?.30:.34);
      p.x+=bend*(n3(vec3(phase,y*2.-clock*.71,0.))*2.-1.);
      p.z+=bend*(n3(vec3(0.,phase,y*2.-clock*.63))*2.-1.);
      p.xz*=1.+wave*(smoke>.5?.13:.22)*sqrt(y);
    }
    local=p; world=iOrigin+right*p.x*iShape.x+axis*p.y*iShape.y+forward*p.z*iShape.x;
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
  }
`;
export const fragmentShader = noise + `
  uniform float clock,orthographic,fieldEnabled,cellSize,rayCount,connected,jetHeading,forwardStart,opaqueDepthEnabled;
  uniform sampler2D field,rayTable,opaqueDepth; uniform vec2 grid,shapeOrigin,sourceOrigin,sourceDirection,opaqueDepthSize;
  uniform mat4 opaqueViewProjection; uniform vec3 player; uniform float playerRadius;
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
  float density(vec3 p) {
    if(p.y<.001||p.y>.999)return 0.;
    float smoke=policy.x,seed=shape.w*83.71;
    vec3 flow=vec3(p.x*2.3+seed,p.y*3.4-clock*(smoke>.5?.42:1.9),p.z*2.3-seed);
    float coarse=fb(flow),fine=n3(flow*3.3+clock*.14);
    vec2 bend=vec2(n3(vec3(seed,p.y*2.-clock*.71,0.)),n3(vec3(0.,seed,p.y*2.-clock*.63)))*2.-1.;
    vec2 radial=p.xz-pow(p.y,1.6)*(smoke>.5?.30:.34)*bend;
    float edge=length(radial)/max(.006,profile(p.y,smoke));
    if(smoke>.5)return (1.-smoothstep(.38,1.05,edge))*smoothstep(.23,.69,coarse)*smoothstep(0.,.12,p.y)*(1.-smoothstep(.74,1.,p.y));
    float front=(1.-edge)*.80+(coarse-.49)*1.15+(fine-.5)*.10;
    return smoothstep(-.13,.17,front)*(.55+coarse*.8)*(1.-smoothstep(.68,1.,p.y));
  }
  vec3 colorAt(vec3 p,float den) {
    if(policy.x>.5) {
      float light=clamp(.50+(density(p)-density(p+vec3(-.13,.08,.09)))*1.1,.19,.85);
      vec3 color=mix(vec3(.008,.006,.005),vec3(.17,.15,.125),light);
      if(policy.x>1.5)color*=.48;
      return color+vec3(.060,.012,.001)*pow(1.-p.y,3.);
    }
    float hot=clamp((1.-p.y)*.70+(1.-length(p.xz))*.38+den*.15,0.,1.);
    vec3 color=mix(vec3(.92,.028,.001),vec3(1.,.39,.018),smoothstep(.12,.75,hot));
    return mix(color,vec3(1.,1.,.82),smoothstep(.79,1.05,hot));
  }
  void main() {
    bool ribbon=policy.y>=1.5;
    vec3 eye=cameraPosition-base;
    vec3 eyeLocal=vec3(dot(eye,right)/shape.x,dot(eye,axis)/shape.y,dot(eye,forward)/shape.x);
    bool cameraInside=orthographic<.5&&eyeLocal.y>=0.&&eyeLocal.y<=1.&&length(eyeLocal.xz)<profile(eyeLocal.y,policy.x);
    if(!ribbon&&!gl_FrontFacing&&!cameraInside)discard;
    vec2 depthUV=clamp(gl_FragCoord.xy/opaqueDepthSize,vec2(0.),vec2(1.));
    float sceneDepth=opaqueDepthEnabled>.5?texture2D(opaqueDepth,depthUV).r:1.;
    vec3 emission=vec3(0.); float alpha=0.;
    if(ribbon) {
      // Surface fallback preserves the exact safe old-ray support. No invented
      // volume/fan is hidden behind a claim of full 3D compatibility.
      if(opaqueStops(world,sceneDepth))discard;
      float den=density(local)*shape.z; alpha=1.-exp(-den*.95); emission=alpha*colorAt(local,den);
    } else {
      vec3 viewDir=orthographic>.5?-vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]):normalize(world-cameraPosition);
      vec3 d=normalize(vec3(dot(viewDir,right)/shape.x,dot(viewDir,axis)/shape.y,dot(viewDir,forward)/shape.x));
      vec3 p=cameraInside?eyeLocal:local+d*.004; float stepSize=.14;
      for(int j=0;j<18;j++) {
        vec3 wp=base+right*p.x*shape.x+axis*p.y*shape.y+forward*p.z*shape.x;
        if(opaqueStops(wp,sceneDepth))break;
        float den=density(p)*shape.z*allowed(wp);
        float a=1.-exp(-den*stepSize*(policy.x>.5?2.3:4.6));
        emission+=(1.-alpha)*a*colorAt(p,den); alpha+=(1.-alpha)*a;
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
