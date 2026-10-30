// Original procedural density and emission. No photographic pixels or copied shader code.
const noise = `
  float h3(vec3 p) { return fract(sin(dot(p,vec3(39.3467,11.1351,83.1559)))*47453.5453); }
  float n3(vec3 p) {
    vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fb(vec3 p) { return n3(p)*.57+n3(p*2.07+13.7)*.28+n3(p*4.19-7.4)*.15; }
`;
export const vertexShader = noise + `
  attribute vec3 iOrigin,iAxis; attribute vec4 iShape; attribute float iMask;
  uniform float clock,smoke; varying vec3 local,world,base,axis,right,forward;
  varying vec4 shape; varying float mask;
  void main() {
    shape=iShape; mask=iMask; base=iOrigin; axis=normalize(iAxis);
    right=normalize(cross(axis,abs(axis.y)>.94?vec3(0,0,1):vec3(0,1,0)));
    forward=cross(right,axis);
    vec3 p=position; float y=p.y;
    float phase=iShape.w*83.71;
    vec3 flow=vec3(p.x*2.+phase,y*3.-clock*(smoke>.5?.34:1.8),p.z*2.-phase);
    float wave=n3(flow)*2.-1.;
    float bend=pow(y,1.6)*(smoke>.5?.30:.34);
    p.x+=bend*(n3(vec3(phase,y*2.-clock*.71,0.))*2.-1.);
    p.z+=bend*(n3(vec3(0.,phase,y*2.-clock*.63))*2.-1.);
    p.xz*=1.+wave*(smoke>.5?.13:.22)*sqrt(y);
    local=p;
    world=iOrigin+right*p.x*iShape.x+axis*p.y*iShape.y+forward*p.z*iShape.x;
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
  }
`;
export const fragmentShader = noise + `
  uniform float clock,smoke,orthographic,fieldEnabled,cellSize,clipJet,rayCount,connected,jetHeading;
  uniform sampler2D field,rayTable; uniform vec2 grid,shapeOrigin;
  uniform vec3 player; uniform float playerRadius;
  varying vec3 local,world,base,axis,right,forward; varying vec4 shape; varying float mask;
  float cross2(vec2 a,vec2 b) { return a.x*b.y-a.y*b.x; }
  bool fanAllowed(vec2 p) {
    vec2 q=p-shapeOrigin;
    if(dot(q,q)<1.e-12)return true;
    float a=atan(q.y,q.x)-jetHeading; a=atan(sin(a),cos(a));
    float lowAngle=texelFetch(rayTable,ivec2(0,0),0).z;
    float highAngle=texelFetch(rayTable,ivec2(int(rayCount)-1,0),0).z;
    if(rayCount<2.||a<lowAngle||a>highAngle)return false;
    int lo=0,hi=int(rayCount)-1;
    for(int j=0;j<9;j++) {int mid=(lo+hi)/2; if(texelFetch(rayTable,ivec2(mid,0),0).z<=a)lo=mid;else hi=mid;}
    vec2 left=texelFetch(rayTable,ivec2(lo,0),0).xy-shapeOrigin;
    vec2 rightEdge=texelFetch(rayTable,ivec2(min(lo+1,int(rayCount)-1),0),0).xy-shapeOrigin;
    return cross2(left,rightEdge)>1.e-9&&cross2(left,q)>=0.&&cross2(q,rightEdge)>=0.&&cross2(rightEdge-left,q-left)>=0.;
  }
  float radiusAt(float y) {
    if(y<0.||y>1.)return 0.;
    return smoke>.5 ? .035+pow(max(0.,sin(3.14159265*y)),.66)*.96
      : max(.006,(.72+.24*sin(y*4.3))*pow(1.-y,.64));
  }
  float density(vec3 p) {
    if(p.y<.001||p.y>.999)return 0.;
    float seed=shape.w*83.71;
    vec3 flow=vec3(p.x*2.3+seed,p.y*3.4-clock*(smoke>.5?.42:1.9),p.z*2.3-seed);
    float coarse=fb(flow),fine=n3(flow*3.3+clock*.14);
    vec2 bend=vec2(n3(vec3(seed,p.y*2.-clock*.71,0.)),n3(vec3(0.,seed,p.y*2.-clock*.63)))*2.-1.;
    vec2 radial=p.xz-pow(p.y,1.6)*(smoke>.5?.30:.34)*bend;
    float edge=length(radial)/max(.006,radiusAt(p.y));
    if(smoke>.5) return (1.-smoothstep(.38,1.05,edge))*smoothstep(.23,.69,coarse)*
      smoothstep(0.,.12,p.y)*(1.-smoothstep(.74,1.,p.y));
    float front=(1.-edge)*.80+(coarse-.49)*1.15+(fine-.5)*.10;
    float gaps=smoothstep(-.13,.17,front);
    return gaps*(.55+coarse*.8)*(1.-smoothstep(.68,1.,p.y));
  }
  void main() {
    vec3 viewDir=orthographic>.5 ? -vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]) : normalize(world-cameraPosition);
    vec3 d=normalize(vec3(dot(viewDir,right)/shape.x,dot(viewDir,axis)/shape.y,dot(viewDir,forward)/shape.x));
    vec3 p=local+d*.004; float stepSize=.112; float alpha=0.; vec3 emission=vec3(0.);
    // Eighteen interior density samples supply real depth, beyond the sculpted silhouette.
    for(int j=0;j<18;j++) {
      vec3 wp=base+right*p.x*shape.x+axis*p.y*shape.y+forward*p.z*shape.x;
      float allowed=1.;
      if(clipJet>.5&&connected>.5&&!fanAllowed(wp.xz))allowed=0.;
      if(mask>.5&&fieldEnabled>.5) {
        vec2 cell=floor(wp.xz/cellSize);
        if(any(lessThan(cell,vec2(0.)))||any(greaterThanEqual(cell,grid)))allowed=0.;
        else allowed*=texture2D(field,(cell+.5)/grid).a;
      }
      float den=density(p)*shape.z*allowed;
      float a=1.-exp(-den*stepSize*(smoke>.5?2.3:4.6));
      vec3 color;
      if(smoke>.5) {
        float light=clamp(.50+(density(p)-density(p+vec3(-.13,.08,.09)))*1.1,.19,.85);
        color=mix(vec3(.095,.073,.060),vec3(.36,.32,.27),light);
        color+=vec3(.20,.054,.008)*pow(1.-p.y,3.);
      } else {
        float hot=clamp((1.-p.y)*.70+(1.-length(p.xz))*.38+den*.15,0.,1.);
        color=mix(vec3(1.55,.075,.004),vec3(4.8,1.9,.15),smoothstep(.12,.75,hot));
        color=mix(color,vec3(6.0,4.2,1.35),smoothstep(.79,1.05,hot));
      }
      emission+=(1.-alpha)*a*color; alpha+=(1.-alpha)*a;
      if(alpha>.985)break; p+=d*stepSize;
    }
    float legibility=mix(.48,1.,smoothstep(playerRadius+.15,playerRadius+.9,length(world.xz-player.xz)));
    alpha*=legibility; if(alpha<.005)discard;
    gl_FragColor=vec4(emission/max(.0001,alpha/legibility),alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
