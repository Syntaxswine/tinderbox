import {createModelPaint} from './horse-model-paint.js';
import {BEAR_PAINT_FRAME} from './bear-worker.js';
// Unseen cuff rims borrow a small, clean patch of the same painted shirt.
// The outfit texture supplies the color; the regular and faction faces stay native.
export function bearPaintLayers(){
 return {uniforms:{},declarations:'',dispose(){},application:`
  if(vPaintPart<1.5){
   vec3 cloth=texture2D(uModelPaint,vec2((2.5+clamp(p.x*.10,-.02,.02)/1.18)/4.,.5+(1.105+clamp(p.y-1.,-.02,.02)-.84)/2.36)).rgb;
   float missing=(1.-coverage)*(1.-filled);
   float cuff=smoothstep(.28,.34,abs(p.z))*smoothstep(.97,.995,p.y)*(1.-smoothstep(1.04,1.07,p.y));
   float chroma=max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b)-min(min(diffuseColor.r,diffuseColor.g),diffuseColor.b);
   float rim=cuff*max(1.-coverage,1.-smoothstep(.025,.075,chroma));
   float useCloth=max(missing,rim);
   diffuseColor.rgb=mix(diffuseColor.rgb,cloth*(.87+.13*abs(n.y)),useCloth);coverage*=1.-useCloth;filled=max(filled,useCloth);
  }
  // Both paintings place the fur bob below its original grey reference.
  // Clear that flat copy from the trousers with adjacent rear cloth, then
  // reuse the painted fur on the separately fitted tail. No extra texture.
  if(abs(vPaintPart-2.)<.1){
   float oldTail=(1.-smoothstep(.85,1.2,length(vec2(p.z/.068,(p.y-.745)/.077))))*(1.-smoothstep(-.11,-.06,p.x));
   vec2 clothUV=vec2((2.5+(p.z*.2+.08)/1.18)/4.,.5+(p.y-.84)/2.36);
   vec3 cloth=.5*(texture2D(uModelPaint,clothUV).rgb+texture2D(uModelPaint,clothUV-vec2(.16/(1.18*4.),0.)).rgb);
   diffuseColor.rgb=mix(diffuseColor.rgb,cloth,oldTail);coverage*=1.-oldTail;filled=max(filled,oldTail);
  }
  if(vPaintPart>7.5){
   vec2 furUV=vec2((2.5+p.z*.8/1.18)/4.,.5+(.745+(p.y-.836)*.68-.84)/2.36);
   diffuseColor.rgb=texture2D(uModelPaint,furUV).rgb*(.78+.22*max(0.,-n.x));coverage=0.;filled=1.;
  }
 `};
}
export function createBearPaint(renderer,worker,texture,options={}){
 return createModelPaint(renderer,worker,texture,{...options,species:'bear',frame:BEAR_PAINT_FRAME,paintLayers:bearPaintLayers()});
}
