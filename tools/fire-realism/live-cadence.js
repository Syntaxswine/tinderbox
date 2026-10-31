/** Review-only live callback boundary. Fixed-step simulation and commands remain
 * authoritative. Hidden steps observe narrow receipts; the scene/UI presents
 * once and the artist observes exactly one actual draw, including zero-step RAFs.
 * step/seek/measurement intentionally do not use this live batching path. */
export function presentFireReviewCallback({frames,advance,observe,present,draw}){
  if(!Number.isInteger(frames)||frames<0||frames>15)throw RangeError('Live callback requires0..15 fixed steps');
  const began=performance.now();let simulationMs=0,receiptObservationMs=0;
  for(let i=0;i<frames;i++){
    let time=performance.now();const snapshot=advance();simulationMs+=performance.now()-time;
    time=performance.now();observe(snapshot);receiptObservationMs+=performance.now()-time;
  }
  if(frames)present();
  draw();
  return {fixedSteps:frames,presentations:frames?1:0,draws:1,simulationMs,receiptObservationMs,totalCpuMs:performance.now()-began};
}
