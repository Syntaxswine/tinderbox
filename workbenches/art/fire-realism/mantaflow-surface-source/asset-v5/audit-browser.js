/** Small host review entry; all asset reads/imports go through the real loader. */
const byId=id=>document.getElementById(id),status=byId('status'),report=byId('report'),start=byId('start'),cancel=byId('cancel'),root=new URL('../../../../../',import.meta.url);
let controller;
cancel.onclick=()=>controller?.abort(new DOMException('Review cancelled','AbortError'));
start.onclick=async()=>{
 start.disabled=true;cancel.disabled=false;controller=new AbortController();const timer=setTimeout(()=>controller.abort(new DOMException('Audit deadline','TimeoutError')),180000);let scratch=null;
 try{
  status.textContent='Verifying the architect descriptor, every source and binary resource before artist import…';
  const tools=await import(new URL('tools/fire-realism/delivery.js',root).href),load=tools.createFireReviewDeliveryLoader({projectUrl:root.href,descriptorUrl:new URL('workbenches/fire-realism/delivery.json',root).href});
  const loaded=await load({signal:controller.signal}),selected=loaded.artistDelivery?.byMode?.reference;
  if(selected?.factoryModule!=='assets/art/fire-realism/fluid-contact-surface/index.js'||selected.factoryExport!=='createFluidSurfaceContactReference'||selected.prepareExport!=='prepareFluidSurfaceContactData')throw Error('Architect descriptor does not select the V5 finite surface CFD candidate');
  const fingerprint=tools.verifiedFireDeliveryFingerprint(selected),metadata=tools.verifiedFireDeliveryMetadata(selected);if(!fingerprint||!metadata)throw Error('Selected entry lost its loader-issued identity proof');
  // Loader has already made the FIRST native import. This is the same immutable
  // canonical module URL/cache, not an earlier import or a warm-load retry.
  const namespace=await import(new URL(selected.factoryModule,root).href);if(namespace[selected.factoryExport]!==selected.createFireRealism)throw Error('Selected own factory identity changed');
  const response=await fetch(new URL('./expected-f32-hashes.json',import.meta.url));if(!response.ok)throw Error('Missing original-field hash dossier');const expected=await response.json();
  if(expected.rawManifestSha256!==metadata.manifest.sourceRawManifestSha256||expected.hashes?.length!==579)throw Error('Original-field dossier does not match the selected source');
  const hashes=new Map(expected.hashes.map(r=>[r.frame+':'+r.channel,r])),results=[];let frames=0;
  await namespace.auditFluidSurfaceContactRGBA(async frame=>{
   if(controller.signal.aborted)throw controller.signal.reason;
   const count=frame.resolution.reduce((a,b)=>a*b,1);if(!scratch)scratch=new Uint8Array(count*4);if(scratch.byteLength!==count*4||frame.rgba.byteLength!==count*16)throw Error('Unexpected dense layout');
   const source=new DataView(frame.rgba.buffer,frame.rgba.byteOffset,frame.rgba.byteLength),out=new DataView(scratch.buffer);
   for(const [lane,channel]of ['density','temperature','flame'].entries()){
    for(let i=0;i<count;i++)out.setUint32(i*4,source.getUint32(i*16+lane*4,true),true);
    const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',scratch))).map(n=>n.toString(16).padStart(2,'0')).join(''),original=hashes.get(frame.frame+':'+channel);
    if(!original||sha256!==original.sha256||scratch.byteLength!==original.bytes)throw Error('Independent RGBA mismatch:'+frame.frame+':'+channel);results.push({frame:frame.frame,channel,bytes:scratch.byteLength,sha256});
   }
   frames++;if(frame.frame%16===0)status.textContent='Actual browser RGBA audit: '+frames+'/193 frames, '+results.length+'/579 hashes';
  },{signal:controller.signal});
  const evidence=namespace.fluidSurfaceContactPayloadEvidence();if(frames!==193||results.length!==579||evidence.metrics.denseBytes!==0)throw Error('Incomplete audit or unreleased dense slots');
  const data={version:1,status:'actual-browser-V5-579-RGBA-audit-pass',scope:'Data/loader/API proof only. No renderer, WebGL shader compilation, image/motion/cost or quality acceptance.',fingerprint,manifestRecord:metadata.manifestRecord,loaderSetup:metadata.coldLoad,preparation:metadata.preparation,rawManifestSha256:expected.rawManifestSha256,actualFrames:frames,originalChannelHashes:results.length,all579Matches:true,twoRGBAbytesPeak:evidence.metrics.peakDenseBytes,denseBytesAfterAudit:evidence.metrics.denseBytes,sharedSparseBytes:evidence.metrics.sharedSparseBytes,verificationScratchBytes:scratch.byteLength,hashes:results};
  report.value=JSON.stringify(data,null,2);status.textContent='PASS: all 579 original channels match. Both RGBA slots disposed; shared sparse data remains document-lived. Native images are the next gate.';
  const link=byId('json');link.href='data:application/json;base64,'+btoa(unescape(encodeURIComponent(report.value)));link.hidden=false;
 }catch(error){report.value=JSON.stringify({status:'failed-or-cancelled-no-hot-retry',error:String(error),stack:error.stack},null,2);status.textContent='Stopped: '+error.message+'\nReload a cold page before another attempt.';}
 finally{scratch=null;clearTimeout(timer);cancel.disabled=true;}
};
