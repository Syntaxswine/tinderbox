import {createSplatPatch} from '../../../src/reuse/ashland/splats.js';
// Display current runtime source->opening->clear-rise signals. No perception input.
export function createClosingVentSmoke(T,{data}){
 const batch=createSplatPatch(T,{maxPatches:0,extraCapacity:16}),root=batch.root,wind=new Float64Array(3),cold=new T.Color(0x8c887a),warm=new T.Color(0x987244);root.name='Current physical vent smoke';let last=[],hasCurrentCollection=false;
 return {root,update(frame,view={}){
  hasCurrentCollection=Array.isArray(frame.closingTime.smokeSignals);
  const signals=frame.closingTime.smokeSignals||[],signal=signals.find(s=>data.closingTime.smokeVents.some(v=>v.id===s.ventId)),source=signal&&(frame.fireSamples||[]).find(s=>s.id===signal.sourceId),vent=signal&&data.closingTime.smokeVents.find(v=>v.id===signal.ventId),splats=[];last=[];
  // A current collection is authoritative. Missing/empty/closed/blocked/reset
  // removes this plume even if a resident still remembers seeing its source.
  if(view.effects?.smoke!==false&&view.camera&&source?.smoke>0&&vent&&Array.isArray(signal.position)&&signal.position.length===3&&signal.position.every(Number.isFinite)){
   const end=signal.position,base=vent.position.map((p,i)=>p+vent.outward[i]*.2),strength=Math.min(1,source.smoke,signal.strength),time=frame.worldTime;
   for(let i=0;i<12;i++){const t=(i+.5)/12,rise=(end[1]-base[1])*t,age=t*.28,phase=time*.8+i*2.399;wind.fill(0);view.sampleWind?.(base[0],base[1]+rise,base[2],wind);splats.push({x:base[0]+wind[0]*age*.24+Math.cos(phase)*.025,y:base[1]+rise,z:base[2]+wind[2]*age*.24+Math.sin(phase)*.025,sx:.075+t*.10,sy:.14+t*.045,sz:.065+t*.08,leanX:wind[0]*.08,leanZ:wind[2]*.08,heading:phase,color:cold.clone().lerp(warm,Math.min(.65,source.flame*.65)),alpha:strength*.19*Math.sin(Math.PI*(.1+.8*t)),smoke:true});}
   last=[{sourceId:source.id,ventId:vent.id,sourcePosition:[source.x,source.y,source.z],base,observationPoint:end,strength,signals:'Current observer-independent runtime smokeSignals',splats:splats.length}];
  }
  root.visible=splats.length>0;if(view.camera)batch.update({time:frame.worldTime,camera:view.camera,extraSplats:splats});
 },diagnostics:()=>({proxy:'Current physical path, not a fluid solver',hasCurrentCollection,signals:last,submitted:batch.stats(),capacity:16}),dispose(){batch.dispose();last=[];}};
}
