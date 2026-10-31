/** Original CFD optical presentation. Geometry and fields share native metres. */
export function makeFluidShaders(maxPlanes){
  if(!Number.isInteger(maxPlanes)||maxPlanes<3||maxPlanes>128)throw Error('Invalid measured convex contour bound');
  const vertexShader=`
    varying vec3 worldPosition;
    void main(){worldPosition=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldPosition,1.);}
  `;
  const fragmentShader=`
    precision highp sampler3D;
    uniform sampler3D field0,field1;
    uniform sampler2D nativeField,opaqueDepth;
    uniform vec3 scalarOrigin,voxelSize,fieldResolution,patchTranslation,cameraPositionWorld,cameraForwardWorld,playerPosition;
    uniform vec2 nativeGrid,opaqueDepthSize;
    uniform mat4 opaqueViewProjection;
    uniform float temporalMix,reactionGain,densityGain,contactHeight,fieldEnabled,nativeCellSize,opaqueDepthEnabled,orthographic,playerRadius;
    uniform int planeCount;uniform vec4 planes[${maxPlanes}];uniform vec2 slab;
    varying vec3 worldPosition;
    vec3 toScalarWorld(vec3 p){return vec3(p.x-patchTranslation.x,-(p.z-patchTranslation.z),p.y-patchTranslation.y);}
    vec3 toNativeWorld(vec3 p){return vec3(p.x+patchTranslation.x,p.z+patchTranslation.y,-p.y+patchTranslation.z);}
    vec4 voxel(sampler3D data,ivec3 cell){if(any(lessThan(cell,ivec3(0)))||any(greaterThanEqual(cell,ivec3(fieldResolution))))return vec4(0.);return texelFetch(data,cell,0);}
    vec3 tri(sampler3D data,vec3 p){
      vec3 q=(p-scalarOrigin)/voxelSize;ivec3 i=ivec3(floor(q));vec3 f=fract(q);
      return mix(mix(mix(voxel(data,i).rgb,voxel(data,i+ivec3(1,0,0)).rgb,f.x),mix(voxel(data,i+ivec3(0,1,0)).rgb,voxel(data,i+ivec3(1,1,0)).rgb,f.x),f.y),mix(mix(voxel(data,i+ivec3(0,0,1)).rgb,voxel(data,i+ivec3(1,0,1)).rgb,f.x),mix(voxel(data,i+ivec3(0,1,1)).rgb,voxel(data,i+ivec3(1,1,1)).rgb,f.x),f.y),f.z);
    }
    float nativeA(vec2 xz){
      if(fieldEnabled<.5)return 0.;vec2 cell=floor(xz/nativeCellSize);if(any(lessThan(cell,vec2(0.)))||any(greaterThanEqual(cell,nativeGrid)))return 0.;return texture2D(nativeField,(cell+.5)/nativeGrid).a;
    }
    float livePatchA(){return min(min(nativeA(vec2(5.25,8.25)),nativeA(vec2(5.75,8.25))),min(nativeA(vec2(5.25,8.75)),nativeA(vec2(5.75,8.75))));}
    bool depthStops(vec3 p,float sceneDepth){if(opaqueDepthEnabled<.5)return false;vec4 q=opaqueViewProjection*vec4(p,1.);if(q.w<=0.)return true;return q.z/q.w*.5+.5>sceneDepth+2.e-6;}
    bool clipPlane(vec3 n,float c,vec3 origin,vec3 direction,inout float entry,inout float exit){
      float den=dot(n,direction),num=c-dot(n,origin);if(abs(den)<1.e-7){return num>=0.;}float t=num/den;if(den>0.)exit=min(exit,t);else entry=max(entry,t);return exit>entry;
    }
    void main(){
      vec3 worldDirection=orthographic>.5?normalize(cameraForwardWorld):normalize(worldPosition-cameraPositionWorld);
      vec3 worldOrigin=orthographic>.5?worldPosition:cameraPositionWorld;
      vec3 origin=toScalarWorld(worldOrigin),direction=vec3(worldDirection.x,-worldDirection.z,worldDirection.y);
      float entry=0.,exit=1.e6;
      for(int j=0;j<${maxPlanes};j++){if(j>=planeCount)break;if(!clipPlane(vec3(planes[j].xy,0.),planes[j].w,origin,direction,entry,exit))discard;}
      if(!clipPlane(vec3(0,0,-1),-slab.x,origin,direction,entry,exit)||!clipPlane(vec3(0,0,1),slab.y,origin,direction,entry,exit))discard;
      float marchStep=min(voxelSize.x,min(voxelSize.y,voxelSize.z))*.5;
      int steps=int(ceil((exit-entry)/marchStep));if(steps<1||steps>128)discard;float distanceStep=(exit-entry)/float(steps);
      float sceneDepth=opaqueDepthEnabled>.5?texture2D(opaqueDepth,gl_FragCoord.xy/opaqueDepthSize).r:1.;
      float alpha=0.;vec3 emission=vec3(0.);float sourceA=livePatchA();
      for(int j=0;j<128;j++){
        if(j>=steps)break;vec3 p=origin+direction*(entry+(float(j)+.5)*distanceStep),native=toNativeWorld(p);if(depthStops(native,sceneDepth))break;
        vec3 value=max(vec3(0.),mix(tri(field0,p),tri(field1,p),temporalMix));
        float reacting=value.z*reactionGain*sourceA;
        float edge=min(min(native.x-5.,6.-native.x),min(native.z-8.,9.-native.z));
        float baseAllowed=nativeA(native.xz)*smoothstep(0.,max(voxelSize.x,voxelSize.y),max(0.,edge));
        float contactRelease=smoothstep(contactHeight,contactHeight+2.*max(voxelSize.x,voxelSize.y),p.z);
        reacting*=mix(baseAllowed,1.,contactRelease);
        // Upper reaction is the architect-approved source/pair support, not new
        // ground fuel. Actual source burnout multiplies ALL heights by zero.
        float heat=clamp(value.y/3.,0.,1.);float flameSigma=reacting*6.;
        float smoke=value.x*densityGain*mix(1.,.18,clamp(value.z*heat,0.,1.));float smokeSigma=smoke*1.8;
        float extinction=flameSigma+smokeSigma;if(extinction<=0.)continue;
        vec3 warm=mix(vec3(1.30,.19,.018),vec3(1.65,.78,.19),smoothstep(.20,.82,heat));
        warm=mix(warm,vec3(1.65,1.45,.95),pow(heat,8.)*smoothstep(.70,.97,value.z)*.18);
        vec3 soot=mix(vec3(.045,.037,.030),vec3(.22,.205,.18),clamp(p.z/4.+.3,0.,1.));
        vec3 color=(warm*flameSigma+soot*smokeSigma)/extinction;
        float a=1.-exp(-extinction*distanceStep);emission+=(1.-alpha)*a*color;alpha+=(1.-alpha)*a;
        if(alpha>.995)break;
      }
      float legibility=mix(.48,1.,smoothstep(playerRadius+.15,playerRadius+.9,length(worldPosition.xz-playerPosition.xz)));
      float finalAlpha=alpha*legibility;if(finalAlpha<=0.)discard;
      gl_FragColor=vec4(emission/max(alpha,1.e-6),finalAlpha);
      #include <colorspace_fragment>
      gl_FragColor.rgb*=gl_FragColor.a;
    }
  `;
  return{vertexShader,fragmentShader};
}
