/* TB-036-H. Presentation and public driver binding; no simulation or timing rules. */
export const MODES = Object.freeze([
  {id:'current',label:'Published fire'}, {id:'reference',label:'Detailed reference'},
  {id:'optimized',label:'Optimized'}, {id:'no-fire',label:'No fire control'}
]);
export const SCENARIOS = Object.freeze([
  {id:'match-contact',label:'Match · fuel contact'}, {id:'carried-torch',label:'Carried torch'},
  {id:'gasoline-front',label:'Gasoline front'}, {id:'gasoline-front-powder',label:'Gasoline front · powder'},
  {id:'wall-clipped-jet',label:'Wall-clipped flamethrower'}, {id:'street-fire',label:'Catalogue Street fire'}
]);
export const RUBRIC = Object.freeze([
  ['shape','Silhouette & depth'], ['flow','Flow & breakup'], ['colour','Colour & opacity'],
  ['contact','Smoke, contact & light'], ['artefacts','Repetition, pop & aliasing'], ['readability','Animal & HUD readability']
]);
const PLANS = Object.freeze({'current-reference':['current','reference'],'reference-optimized':['reference','optimized'],all:['current','reference','optimized']});
const VIEWS=[{id:'isometric',label:'Isometric gameplay'},{id:'oblique',label:'Closer oblique'}];
const LIGHTING=[{id:'bright',label:'Bright surroundings'},{id:'dim',label:'Dim surroundings'}];
const CHARACTERS=[{id:'bear',label:'AFT bear'},{id:'goat',label:'Goat'},{id:'horse',label:'Horse'}];
const VIEWPORTS=Object.freeze({desktop:{width:1280,height:800},phone:{width:390,height:844}});
const EMPTY=Object.freeze({connected:false,phase:'unavailable',reason:'The actual scene driver has not connected.',configuration:{},availability:{},capabilities:{},references:[],captures:[]});
const json=value=>JSON.stringify(value,null,2);
export function evidenceLabel(status){return ({complete:'Measured',measured:'Measured',inconclusive:'Inconclusive',cancelled:'Cancelled'})[status]||'Unavailable';}
export function metricText(metric){
  if(!['measured','complete'].includes(metric?.state))return evidenceLabel(metric?.state);
  if(!Number.isFinite(metric.value)||metric.value<0)return 'Inconclusive';
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(metric.value)+(metric.unit?' '+metric.unit:'');
}
export function safeUrl(value,base){
  if(typeof value!=='string'||!value.trim())return null;
  try{const url=new URL(value,base);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
export function localAsset(value,base){const url=safeUrl(value,base);return url&&new URL(url).origin===new URL(base).origin?url:null;}
export function reviewRecord(state,notes,createdAt){
  return {version:2,kind:'independent-ui-critique',createdAt,acceptance:'Reviewer notes do not approve a baseline or prove the cost target.',
    context:structuredClone({phase:state.phase??null,configuration:state.configuration??{},frameIndex:state.frameIndex??null,tick:state.tick??null,
      worldTime:state.worldTime??null,playerTime:state.playerTime??null,availability:state.availability??{},referenceAcceptance:state.referenceAcceptance??'missing',
      workload:state.workload??null,sourceFingerprints:state.diagnostics?.sourceFingerprints??null,renderer:state.diagnostics?.renderer??null,results:state.results??null,motionEvidence:state.recording?.lastResult??null}),notes:{...notes}};
}
export function photoReferences(dossier){
  if(!Array.isArray(dossier?.references))throw TypeError('Verified reference dossier is unavailable.');
  return dossier.references.map(ref=>({id:ref.id,label:ref.title,asset:'../../'+ref.path,record:ref.record,
    rights:ref.rights,rightsBasis:ref.rightsBasis,verified:!!(ref.sha256&&ref.rightsBasis&&ref.path),alt:ref.title+' · '+ref.kind,
    caption:[ref.institution,ref.creator,ref.date,ref.kind].filter(Boolean).join(' · '),
    limitations:[ref.dateCaution,ref.originalOrDerivative,ref.color,...(ref.observations||[]),dossier.endorsementDisclaimer].filter(Boolean),
    metadata:structuredClone({...ref,rightsPolicy:dossier.policyURL??null})}));
}
export function measurementRows(report){
  if(!report)return [{label:'GPU elapsed',state:'unavailable'}];
  const rows=[],state=report.status==='complete'?'measured':report.status;
  for(const mode of ['current','reference','optimized','no-fire']){
    const label=MODES.find(m=>m.id===mode).label;
    for(const [name,stats,unit,key]of [
      ['absolute GPU median',report.gpu?.absoluteSceneMs?.[mode],'ms','median'],['absolute GPU p95',report.gpu?.absoluteSceneMs?.[mode],'ms','p95'],
      ['incremental fire GPU median',report.gpu?.incrementalFireMs?.[mode],'ms','median'],['GPU variance',report.gpu?.absoluteSceneMs?.[mode],'ms²','variance'],
      ['CPU update median',report.cpu?.[mode]?.updateMs,'ms','median'],['CPU submission median',report.cpu?.[mode]?.renderSubmissionMs,'ms','median'],
      ['frame interval p95',report.frames?.[mode],'ms','p95'],['draw calls median',report.draws?.[mode]?.calls,'','median'],['triangles median',report.draws?.[mode]?.triangles,'','median']
    ])if(stats)rows.push({label:label+' · '+name,state,value:stats[key],unit});
  }
  if(report.comparison?.optimizedReferenceRatio!==null&&report.comparison?.optimizedReferenceRatio!==undefined)
    rows.push({label:'Optimized / reference incremental GPU ratio',state,value:report.comparison.optimizedReferenceRatio,unit:'×'});
  return rows.length?rows:[{label:'GPU elapsed',state}];
}
function download(doc,value,name,type='application/json',onReleased=()=>{}){
  const isData=typeof value==='string'&&value.startsWith('data:image/jpeg;'),url=isData?null:URL.createObjectURL(value instanceof Blob?value:new Blob([typeof value==='string'?value:json(value)+'\n'],{type}));
  let timer=null,released=false;const release=()=>{if(released)return;released=true;if(timer!==null)clearTimeout(timer);if(url)URL.revokeObjectURL(url);onReleased();};
  try{const a=doc.createElement('a');a.href=url||value;a.download=name;doc.body.append(a);try{a.click();}finally{a.remove();}if(url)timer=setTimeout(release,1000);}
  catch(error){release();throw error;}return url?release:null;
}
/** Records only the owned canvas stream. Never requests a camera, microphone or display. */
export function createCanvasMotionRecorder({canvas,MediaRecorderCtor=globalThis.MediaRecorder,maxDurationMs=10000,
  schedule=setTimeout,cancelSchedule=clearTimeout,now=()=>performance.now(),onStopping=()=>{}}={}){
  if(typeof canvas?.captureStream!=='function'||typeof MediaRecorderCtor!=='function')throw Error('Canvas motion recording is unavailable in this browser.');
  if(!Number.isFinite(maxDurationMs)||maxDurationMs<=0||maxDurationMs>10000)throw RangeError('Motion capture must stop within ten seconds.');
  const stream=canvas.captureStream(60),tracks=stream.getTracks(),chunks=[];let recorder,ttl=null,drain=null,settled=false,stopping=false,tracksStopped=false,stopReason='manual',failure=null,bytes=0;
  const startedAt=now();let resolve;const finished=new Promise(r=>{resolve=r;});
  const stopTracks=()=>{if(tracksStopped)return;tracksStopped=true;for(const track of tracks)try{track.stop();}catch(cause){failure ||= cause;}};
  function cleanup(){if(ttl!==null)cancelSchedule(ttl);if(drain!==null)cancelSchedule(drain);stopTracks();recorder?.removeEventListener('dataavailable',data);recorder?.removeEventListener('stop',complete);recorder?.removeEventListener('error',error);}
  function complete(){
    if(settled)return;settled=true;cleanup();const cancelled=['cancelled','disposed','aborted'].includes(stopReason),mimeType=recorder?.mimeType||'video/webm';
    const blob=!failure&&!cancelled&&bytes?new Blob(chunks,{type:mimeType}):null;chunks.length=0;
    resolve({status:cancelled?'cancelled':blob?'complete':'unavailable',reason:failure?.message||(cancelled?'Recording discarded':blob?stopReason:'No encoded canvas frames were received'),mimeType,blob,
      bytes:blob?.size||0,wallDurationMs:Math.max(0,now()-startedAt),maximumDurationMs:maxDurationMs,requestedCaptureFps:60,canvas:{width:canvas.width,height:canvas.height}});
  }
  function stop(reason='manual'){
    if(settled||stopping)return finished;stopping=true;stopReason=reason;if(ttl!==null)cancelSchedule(ttl);try{onStopping(reason);}catch(cause){failure=cause;}
    try{if(recorder?.state!=='inactive')recorder.stop();else complete();}catch(cause){failure=cause;complete();}
    finally{stopTracks();if(!settled)drain=schedule(()=>{failure=Error('Recorder did not finish after stop; no valid motion export.');complete();},5000);}return finished;
  }
  function data(event){if(settled||!event.data?.size)return;if(bytes+event.data.size>64*1024*1024){failure=Error('Recording reached its 64 MiB safety bound.');void stop('size-limit');return;}chunks.push(event.data);bytes+=event.data.size;}
  function error(event){failure=event.error||Error('Canvas encoder failed.');void stop('encoder-error');}
  try{
    const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(type=>MediaRecorderCtor.isTypeSupported?.(type));
    recorder=new MediaRecorderCtor(stream,mimeType?{mimeType}:undefined);recorder.addEventListener('dataavailable',data);recorder.addEventListener('stop',complete);recorder.addEventListener('error',error);recorder.start(250);if(!settled)ttl=schedule(()=>{void stop('ten-second-limit');},maxDurationMs);
  }catch(cause){failure=cause;cleanup();throw cause;}
  return {finished,stop,dispose:()=>stop('disposed')};
}
export function createReviewShell({root,onIntent,initialState=EMPTY,onExport,baseUrl}={}){
  if(!root?.ownerDocument)throw TypeError('Review shell needs a DOM root.');
  const doc=root.ownerDocument,base=baseUrl||doc.baseURI,abort=new AbortController();
  let state=initialState,pending=null,disposed=false,lastReference='',lastCaptures='',nativeSize=false;
  const notes=Object.fromEntries(RUBRIC.map(([id])=>[id,'']));root.classList.add('fire-review');
  root.innerHTML=`
    <header class="masthead"><div><p class="eyebrow">Tinderbox · Development review workbench</p><h1>Fire studies</h1><p class="deck">Observe the flame. Preserve the scene. Measure the cost.</p></div><p class="edition">Review ledger<br><span>TB–036–H · Vol. II</span></p></header>
    <main><div class="notice" role="status" aria-live="polite" data-status>Driver unavailable. No rendered or measured evidence.</div>
      <section class="study" aria-labelledby="study-title"><div class="section-heading"><h2 id="study-title">The comparison</h2><p>One actual WebGL render · diagnostic scenarios</p></div>
        <div class="mode-row" role="group" aria-label="Live fire mode">${MODES.map(m=>`<button type="button" data-mode="${m.id}" aria-pressed="false" disabled>${m.label}</button>`).join('')}</div><p class="small-print" data-mode-reason>Mode availability has not been established.</p>
        <div class="study-grid"><div class="live-column">
          <div class="render-viewport" data-render-viewport><div class="render-stage" data-stage><div data-render-root aria-label="Actual selected fire scene"></div><div data-ui-root aria-label="Existing Tinderbox six-button HUD"></div></div><div class="empty-render" data-render-empty><span class="printer-mark" aria-hidden="true">✦</span><h3 data-render-title>Renderer unavailable</h3><p data-render-reason>No WebGL scene is connected. This space contains no rendered fire.</p></div></div>
          <div class="preview-line"><p class="render-caption" data-render-caption>No actual frame or motion evidence.</p><button type="button" data-size aria-pressed="false">Inspect at actual size</button></div>
          <p class="small-print">A fitted preview scales the scene and HUD together. Use actual size and a matching browser viewport for readability review; a phone-shaped canvas is not phone hardware.</p>
          <dl class="frame-record"><div><dt>Tick / frame</dt><dd data-frame="tick">Unavailable</dd></div><div><dt>World clock</dt><dd data-frame="world">Unavailable</dd></div><div><dt>Player clock</dt><dd data-frame="player">Unavailable</dd></div><div><dt>Canvas / DPR</dt><dd data-frame="canvas">Unavailable</dd></div></dl><dl class="method-record" data-live-record></dl>
        </div><aside class="reference-column" aria-labelledby="source-title"><p class="eyebrow">I. The sources</p><h3 id="source-title">A photographic standard</h3><label>Verified reference plate<select data-reference disabled><option>Loading tracked source dossier…</option></select></label><figure data-reference-figure hidden><img data-reference-image alt=""><figcaption data-reference-caption></figcaption></figure><p data-reference-reason>No verified reference file is available.</p><a data-reference-link hidden target="_blank" rel="noopener noreferrer">Original institutional record</a><p class="small-print" data-reference-rights></p><details><summary>Source limits & exact file</summary><ul data-reference-limits></ul><pre data-reference-metadata></pre></details><p class="small-print">Photographs establish shape, colour, smoke and visible scale. They do not prove motion, burn rates, or an 1893 reconstruction.</p><details><summary>Published source atlas</summary><figure><img class="atlas" src="../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/effects/painted-fire/flame-atlas-v1.png" alt="Four painted flame silhouettes in the published atlas"><figcaption>Existing four-frame atlas. Source inspection only; this is not a runtime capture.</figcaption></figure></details></aside></div>
        <fieldset class="scene-controls"><legend>Live deterministic scenario</legend><div class="select-grid">${[['scenario','Scene'],['view','Camera'],['lighting','Surroundings'],['population','Initial ignitions'],['characterId','Animal'],['viewport','Canvas preset']].map(([id,label])=>`<label>${label}<select data-choice="${id}" disabled><option>Awaiting driver</option></select></label>`).join('')}<label>Seed<input data-seed type="number" step="1" disabled></label><label>Pixel ratio<input data-dpr type="number" min="0.5" max="1.75" step="0.25" disabled></label></div>
        <div class="transport"><button type="button" data-action="play" disabled>Play</button><button type="button" data-action="pause" disabled>Pause</button><button type="button" data-action="reset" disabled>Reset same seed</button><button type="button" data-action="step" disabled>Step one frame</button><label class="seek-label">Seek to frame<input data-seek type="number" min="0" max="3600" step="1" value="0" disabled></label><button type="button" data-action="seek" disabled>Seek</button><button type="button" data-action="capture" disabled>Capture JPEG</button></div>
        <div class="transport"><button type="button" data-action="record" disabled>Record live motion · 10s</button><button type="button" data-action="stop-record" disabled>Stop & save motion</button><button type="button" data-action="cancel-record" disabled>Discard recording</button><button type="button" data-action="motion-metadata" disabled>Save motion metadata</button></div><p class="small-print" data-recording-status>Motion recording unavailable until an actual canvas and encoder are connected.</p>
        <p class="small-print">Recording starts real live playback and automatically stops after ten seconds. It captures only the actual WebGL canvas; DOM HUD readability needs a separate browser capture. No microphone or desktop is recorded. Recording is disabled during GPU timing. Powder uses the real gasoline-front-powder scenario; the UI never alters clock multipliers. Mode, view and lighting changes replay to the same frame; scenario, animal, seed and initial ignitions reset the run. Manual HUD input changes the run; reset before a matched review.</p></fieldset>
      </section>
      <section class="ledger" aria-labelledby="evidence-title"><div class="section-heading"><h2 id="evidence-title">The evidence</h2><p data-baseline>Detailed baseline not yet accepted.</p></div>
        <div class="benchmark-note"><strong>Fixed authoritative-pose cost benchmark</strong><p>Timing captures an active frame from the real simulation, freezes fuel, tool, native pose and masks, then advances presentation clocks identically. Sustained emission is a benchmark adaptation. Use live playback above to judge spread, burnout and gameplay motion.</p></div>
        <div class="measurement-controls"><label>Matched cost modes<select data-measure-plan><option value="current-reference">Published + detailed reference</option><option value="reference-optimized">Detailed reference + optimized</option><option value="all">All three fire modes</option></select></label><button type="button" data-action="measure" disabled>Run matched cost trial</button><button type="button" data-action="cancel" disabled>Cancel measurement</button><button type="button" data-action="report" disabled>Export raw report</button></div>
        <p class="small-print">Driver defaults: 120 warm-up frames, 600 samples, three interleaved trials, each paired with no fire. Every fire-specific depth pass, light and retained transient is included. Keep the tab visible.</p><p class="measurement-progress" data-progress role="status" aria-live="polite"></p>
        <div class="ledger-grid"><div><p class="eyebrow">II. Rendering cost</p><p class="evidence-state" data-evidence-state>Unavailable</p><p data-evidence-reason>No hardware timing report has been supplied.</p><div class="table-scroll"><table><caption>Driver-supplied values · no UI timing or ratios</caption><thead><tr><th scope="col">Measure</th><th scope="col">Result</th></tr></thead><tbody data-metrics><tr><th scope="row">GPU elapsed</th><td>Unavailable</td></tr></tbody></table></div><dl class="method-record" data-method></dl><p class="small-print">Target: 20–33% of the frozen reference's incremental GPU cost, with accepted visual equivalence. CPU time and triangle counts cannot establish it.</p><p class="small-print" data-target>No cost-target acceptance recorded.</p></div>
        <div class="captures"><p class="eyebrow">III. Actual captures</p><div data-captures><p>No actual JPEG captures yet.</p></div><details><summary>Exact sources, hardware & workload</summary><pre data-source-record>No connected driver record.</pre></details><details><summary>Required motion review</summary><ul><li>Match and carried torch: fuel contact, finite life.</li><li>Gasoline front: normal and powder clocks.</li><li>Flamethrower: actual wall obstruction and native muzzle.</li><li>Street fire: legitimate burning building, smoke, animal and six-button HUD.</li></ul><p class="small-print">Include isometric and oblique views, bright and dim light, camera movement, pause, spent fuel and an occluder. A JPEG cannot prove motion or GPU cost. A recorded sequence still needs independent visual review.</p></details></div></div>
      </section>
      <section class="critique" aria-labelledby="critique-title"><div class="section-heading"><h2 id="critique-title">The independent reading</h2><p>Describe what the evidence shows.</p></div><form data-notes><div class="notes-grid">${RUBRIC.map(([id,label])=>`<label>${label}<textarea name="${id}" rows="2" placeholder="Observation, evidence and next correction…"></textarea></label>`).join('')}</div><div class="notes-footer"><p>Notes stay in this page until exported. An export grants no acceptance.</p><button type="submit">Export critique (.json)</button></div></form><p data-export-status role="status"></p></section>
    </main><footer>Development review workbench · excluded from the public game package · <a href="../../docs/ui/fire-realism/README.md">Handoff and limits</a></footer>`;
  // The borrowed HUD owns descendants of this mount, including data-empty and
  // data-mode. Shell queries must never select or mutate those elements.
  const borrowedUiRoot=root.querySelector('[data-ui-root]');
  const all=q=>[...root.querySelectorAll(q)].filter(el=>el===borrowedUiRoot||!borrowedUiRoot.contains(el));
  const find=q=>all(q)[0]||null,text=(q,value)=>{const el=find(q),v=String(value??'Unavailable');if(el.textContent!==v)el.textContent=v;};
  const busy=()=>['measuring','cancelling'].includes(state.phase);
  function can(action){
    if(disposed||!state.connected||typeof onIntent!=='function')return false;
    if(action==='cancel')return state.phase==='measuring'&&pending!=='cancel';
    if(['stop-record','cancel-record'].includes(action))return state.recording?.active===true&&!state.recording?.stopping;
    if(state.recording?.active)return false;
    if(pending||busy()||['initializing','disposed'].includes(state.phase))return false;
    if(action==='report')return !!state.results;
    if(action==='motion-metadata')return !!state.recording?.lastResult;
    if(action==='select')return true;
    if(state.phase==='error')return false;
    if(action==='measure')return state.capabilities?.gpuTimer?.available===true;
    if(action==='record')return state.recording?.available===true&&state.availability?.[state.configuration?.mode]?.available===true;
    return state.availability?.[state.configuration?.mode]?.available===true;
  }
  function optionList(select,items,value,empty='Unavailable'){
    const entries=(items||[]).filter(x=>typeof x.id==='string'&&typeof x.label==='string'),signature=JSON.stringify(entries);
    if(select.dataset.catalogue!==signature){select.replaceChildren(...(entries.length?entries:[{id:'',label:empty}]).map(x=>{const o=doc.createElement('option');o.value=x.id;o.textContent=x.label;return o;}));select.dataset.catalogue=signature;}
    select.value=entries.some(x=>x.id===String(value))?String(value):(entries[0]?.id??'');return entries.length>0;
  }
  function record(selector,entries){const target=find(selector);target.replaceChildren();for(const [label,value]of entries)if(value!==undefined&&value!==null&&value!==''){const box=doc.createElement('div'),dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=label;dd.textContent=typeof value==='string'?value:json(value);box.append(dt,dd);target.append(box);}}
  function showReference(){
    const ref=(state.references||[]).find(x=>x.id===find('[data-reference]').value),url=ref?.verified?localAsset(ref.asset,base):null,img=find('[data-reference-image]'),link=find('[data-reference-link]');
    find('[data-reference-figure]').hidden=!url;find('[data-reference-reason]').hidden=!!url;
    if(url){if(img.src!==url)img.src=url;img.alt=ref.alt||ref.label;text('[data-reference-caption]',ref.caption||ref.label);}
    else{img.removeAttribute('src');text('[data-reference-reason]',ref?'Reference file or item-level rights verification unavailable.':state.referenceError||'No verified reference file is available.');}
    const href=safeUrl(ref?.record,base);link.hidden=!href;if(href)link.href=href;else link.removeAttribute('href');
    text('[data-reference-rights]',ref?[ref.rights,ref.rightsBasis].filter(Boolean).join(' · '):'');find('[data-reference-limits]').replaceChildren(...(ref?.limitations||[]).map(value=>{const li=doc.createElement('li');li.textContent=value;return li;}));text('[data-reference-metadata]',ref?json(ref.metadata):'No source file record.');
  }
  function fit(){
    if(disposed)return;const stage=find('[data-stage]'),box=find('[data-render-viewport]'),v=state.configuration?.viewport,width=v?.width||1280,height=v?.height||800,scale=nativeSize?1:Math.min(1,box.clientWidth/width||1);
    stage.style.width=width+'px';stage.style.height=height+'px';stage.style.transform=`scale(${scale})`;box.style.height=(nativeSize?Math.min(height,800):height*scale)+'px';box.dataset.nativeSize=String(nativeSize);
  }
  function render(){
    if(disposed)return;const s=state,c=s.configuration||{},r=s.results,renderer=s.diagnostics?.renderer,p=s.progress;
    const reason=s.error?.message||s.reason||(s.phase==='playing'?'Live diagnostic playback.':s.phase==='measuring'?'Measuring a fixed authoritative pose.':s.phase==='cancelling'?'Cancelling and retiring GPU queries.':'Paused diagnostic view; acceptance remains separate.');
    text('[data-status]',(s.connected?'Driver connected · '+s.phase+'. ':'Driver unavailable. ')+reason);root.setAttribute('aria-busy',String(!!(pending||busy()||s.recording?.active)));
    text('[data-recording-status]',s.recording?.active?(s.recording.stopping?'Stopping the encoder and retiring its owned tracks…':'Recording actual live playback · automatic stop within ten seconds.'):s.recording?.lastResult?s.recording.lastResult.status+' · '+s.recording.lastResult.reason:s.recording?.available?'Canvas recording available. Start/end clocks and source metadata accompany the video.':s.recording?.reason||'Motion recording unavailable until an actual canvas and encoder are connected.');
    for(const b of all('[data-mode]')){const a=s.availability?.[b.dataset.mode];b.disabled=!can('select')||a?.available!==true;b.title=a?.reason||a?.sourceCommit||(a?.available?'Available':'Unavailable');b.setAttribute('aria-pressed',String(c.mode===b.dataset.mode));}
    text('[data-mode-reason]',MODES.map(m=>{const a=s.availability?.[m.id];return m.label+': '+(a?.available?'available'+(a.sourceCommit?' · '+a.sourceCommit:' · local source, revision unpinned'):(a?.reason||'unavailable'));}).join(' | '));
    const catalogue={scenario:SCENARIOS,view:VIEWS,lighting:LIGHTING,characterId:CHARACTERS,population:[{id:'auto',label:'Scenario default'},...(s.capabilities?.populations||[]).map(n=>({id:String(n),label:n+' initial cells'}))],viewport:[{id:'desktop',label:'Desktop · 1280 × 800'},{id:'phone',label:'Phone-shaped · 390 × 844'}]};
    for(const q of all('[data-choice]')){const key=q.dataset.choice,value=key==='population'?(c.population??'auto'):key==='viewport'?(c.viewport?.width===390&&c.viewport?.height===844?'phone':'desktop'):c[key];q.disabled=!optionList(q,catalogue[key],value)||!can('select');}
    for(const [q,value]of [['[data-seed]',c.seed],['[data-dpr]',c.viewport?.pixelRatio]]){const input=find(q);input.disabled=!can('select');if(doc.activeElement!==input)input.value=value??'';}
    find('[data-seek]').disabled=!can('seek');find('[data-measure-plan]').disabled=!can('select');for(const b of all('[data-action]'))b.disabled=!can(b.dataset.action);
    find('[data-action="play"]').disabled ||= s.phase==='playing';find('[data-action="pause"]').disabled ||= s.phase!=='playing';
    const hasRender=s.connected&&renderer?.width>0&&s.availability?.[c.mode]?.available===true&&!['initializing','error','disposed'].includes(s.phase);find('[data-render-empty]').hidden=hasRender;find('[data-ui-root]').hidden=!hasRender;
    text('[data-render-title]',s.connected?'Selected render unavailable':'Renderer unavailable');text('[data-render-reason]',s.error?.message||s.availability?.[c.mode]?.reason||s.reason||'No actual WebGL scene is connected.');text('[data-render-caption]',hasRender?(c.mode+' · '+c.scenario+' · '+c.view+' · '+c.lighting+' · preview, not motion evidence'):'No actual frame or motion evidence.');
    text('[data-frame="tick"]',s.connected?String(s.tick)+' / '+s.frameIndex:'Unavailable');text('[data-frame="world"]',s.connected?metricText({state:'measured',value:s.worldTime,unit:'s'}):'Unavailable');text('[data-frame="player"]',s.connected?metricText({state:'measured',value:s.playerTime,unit:'s'}):'Unavailable');text('[data-frame="canvas"]',renderer?.width?renderer.width+' × '+renderer.height+' px · DPR '+renderer.pixelRatio:'Unavailable');
    record('[data-live-record]',[['Requested canvas',c.viewport?c.viewport.width+' × '+c.viewport.height+' CSS px':null],['Actual workload',s.workload],['GPU timer',s.capabilities?.gpuTimer?.available?'Available':s.capabilities?.gpuTimer?.reason||'Unavailable'],['Output / mapping',renderer?.outputColorSpace?renderer.outputColorSpace+' / '+renderer.toneMapping:null]]);
    const refSig=JSON.stringify([s.references,s.referenceError]);if(lastReference!==refSig){lastReference=refSig;const q=find('[data-reference]');q.disabled=!optionList(q,s.references,q.value,'No verified source files');showReference();}
    text('[data-baseline]',s.referenceAcceptance==='accepted'?'Driver validated the architect’s detailed-baseline receipt.':'Detailed baseline not yet accepted · receipt '+(s.referenceAcceptance||'missing')+'.');
    text('[data-evidence-state]',evidenceLabel(r?.status));text('[data-evidence-reason]',r?.reason||(!s.capabilities?.gpuTimer?.available?s.capabilities?.gpuTimer?.reason:'No hardware timing report has been supplied.')||'No hardware timing report has been supplied.');
    find('[data-metrics]').replaceChildren(...measurementRows(r).map(m=>{const tr=doc.createElement('tr'),th=doc.createElement('th'),td=doc.createElement('td');th.scope='row';th.textContent=m.label;td.textContent=metricText(m);tr.append(th,td);return tr;}));
    record('[data-method]',[['Method',r?.protocol?.method],['Workload protocol',r?.protocol?.workload],['Hardware / backend',r?.hardware?.renderer],['Vendor',r?.hardware?.vendor],['Browser',r?.hardware?.userAgent],['Canvas',r?.hardware?.canvas],['Trials / samples',r?.protocol?`${r.protocol.trials} trials · ${r.protocol.sampleFrames} frames · ${r.protocol.warmupFrames} warm-up`:null],['Rejected samples',r?.gpu?.rejectedSamples],['Interpretation',r?.gpu?.reasons]]);
    text('[data-target]',r?.status==='complete'&&r.comparison?.targetMet===true?'Driver reports cost target met with validated quality receipts; architect promotion remains separate.':r?.comparison?.targetMet===false?'Driver reports cost target not met.':'No cost-target acceptance recorded.');
    text('[data-progress]',p?`Pass ${p.passIndex+1} of ${p.passCount} · ${p.mode} · ${p.phase}${p.phaseFrames?' '+p.phaseFrame+' / '+p.phaseFrames:''} · ${p.validSamples} valid samples · ${p.rejectedSamples} rejected`:s.phase==='cancelling'?'Cancellation requested; awaiting query retirement.':'');
    text('[data-source-record]',json({sourceFingerprints:s.diagnostics?.sourceFingerprints??null,renderer:s.diagnostics?.renderer??null,workload:s.workload??null,hardware:r?.hardware??s.captureHardware??null,configuration:c,liveRecording:s.recording?.lastResult??null}));
    const capSig=JSON.stringify((s.captures||[]).map(x=>[x.id,x.frameIndex]));if(lastCaptures!==capSig){lastCaptures=capSig;const target=find('[data-captures]');target.replaceChildren();for(const capture of s.captures||[]){if(capture.mimeType!=='image/jpeg'||!/^data:image\/jpeg;base64,/.test(capture.dataUrl||''))continue;const figure=doc.createElement('figure'),img=doc.createElement('img'),caption=doc.createElement('figcaption');img.src=capture.dataUrl;img.alt='Actual '+capture.configuration.mode+' fire · '+capture.configuration.scenario+' · frame '+capture.frameIndex;caption.textContent=img.alt+' · still only';figure.append(img,caption);for(const [type,label]of [['save-capture','Save JPEG'],['save-capture-metadata','Save evidence JSON']]){const button=doc.createElement('button');button.type='button';button.dataset.captureDownload='';button.textContent=label;button.addEventListener('click',()=>onIntent?.({type,id:capture.id}),{signal:abort.signal});figure.append(button);}target.append(figure);}if(!target.childElementCount){const p=doc.createElement('p');p.textContent='No actual JPEG captures yet.';target.append(p);}}
    for(const button of all('[data-capture-download]'))button.disabled=!!(pending||busy()||s.recording?.active);
    fit();
  }
  async function perform(intent,action){
    if(!can(action))return;
    // A pending measurement promise must never gate cancellation.
    if(action==='cancel'){pending='cancel';render();try{await onIntent(intent);}catch(error){if(!disposed)text('[data-export-status]','Cancel failed: '+error.message);}finally{pending=null;render();}return;}
    pending=action;render();try{await onIntent(intent);}catch(error){if(!disposed)text('[data-export-status]','Review command failed: '+error.message);}finally{pending=null;render();}
  }
  const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:abort.signal});
  for(const b of all('[data-mode]'))listen(b,'click',()=>perform({type:'configure',patch:{mode:b.dataset.mode}},'select'));
  for(const q of all('[data-choice]'))listen(q,'change',()=>perform({type:'configure-choice',key:q.dataset.choice,value:q.value},'select'));
  function numberInput(selector,key){const input=find(selector),commit=()=>{const value=Number(input.value);if(input.value===''||!Number.isFinite(value)){text('[data-export-status]','Enter a finite number.');return;}if(value!==(key==='seed'?state.configuration?.seed:state.configuration?.viewport?.pixelRatio))perform({type:'configure-number',key,value},'select');};listen(input,'change',commit);listen(input,'keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!e.repeat)commit();}});}
  numberInput('[data-seed]','seed');numberInput('[data-dpr]','pixelRatio');
  for(const b of all('[data-action]'))listen(b,'click',()=>{const type=b.dataset.action;perform(type==='seek'?{type,frame:Number(find('[data-seek]').value)}:type==='measure'?{type,modes:PLANS[find('[data-measure-plan]').value]}:{type},type);});
  listen(find('[data-seek]'),'keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!e.repeat)perform({type:'seek',frame:Number(e.currentTarget.value)},'seek');}});
  listen(find('[data-size]'),'click',()=>{nativeSize=!nativeSize;find('[data-size]').setAttribute('aria-pressed',String(nativeSize));find('[data-size]').textContent=nativeSize?'Fit preview':'Inspect at actual size';fit();});
  listen(find('[data-reference]'),'change',showReference);listen(find('[data-reference-image]'),'error',()=>{find('[data-reference-figure]').hidden=true;find('[data-reference-reason]').hidden=false;text('[data-reference-reason]','Reference file could not be loaded.');});
  for(const t of all('textarea'))listen(t,'input',()=>{notes[t.name]=t.value;});
  listen(find('[data-notes]'),'submit',e=>{e.preventDefault();const value=reviewRecord(state,notes,new Date().toISOString());try{if(onExport)onExport(value);else download(doc,value,'tinderbox-fire-critique.json');text('[data-export-status]','Critique exported. Baseline and cost acceptance are unchanged.');}catch(error){text('[data-export-status]','Export failed: '+error.message);}});
  const Observer=doc.defaultView?.ResizeObserver,observer=Observer?new Observer(fit):null;observer?.observe(find('[data-render-viewport]'));listen(doc.defaultView,'resize',fit);render();
  return {renderRoot:find('[data-render-root]'),uiRoot:find('[data-ui-root]'),update(next){if(disposed)return;state=next||EMPTY;render();},dispose(){if(disposed)return;disposed=true;abort.abort();observer?.disconnect();root.replaceChildren();root.classList.remove('fire-review');root.removeAttribute('aria-busy');}};
}
/** UI method routing only. Clocks, GPU statistics and acceptance stay in the driver. */
export async function bindReviewDriver({shell,createDriver,mountUI,signal,artistDelivery=null,referenceAcceptance=null,references=[],referenceError=null,onDownload=()=>{},createMotionRecorder=createCanvasMotionRecorder}={}){
  let driver,closed=false,disposal=null,lastState=EMPTY,captures=[],captureSequence=0,motion=null,motionWork=null,recordingActive=false,recordingStopping=false,lastMotion=null;
  const recorderCtor=shell.renderRoot.ownerDocument?.defaultView?.MediaRecorder||globalThis.MediaRecorder;
  const recordingSupport=()=>{const canvas=shell.renderRoot.querySelector?.('canvas');return {available:typeof canvas?.captureStream==='function'&&typeof recorderCtor==='function',canvas};};
  const publish=next=>{if(closed)return;lastState=next;const support=recordingSupport();shell.update({...next,connected:true,references,referenceError,captures,captureHardware:captures.at(-1)?.hardware??null,
    recording:{available:support.available,reason:support.available?null:'Actual canvas captureStream or MediaRecorder is unavailable.',active:recordingActive,stopping:recordingStopping,lastResult:lastMotion}});};
  const configure=async patch=>{const before=driver.state(),preserve=Object.keys(patch).every(key=>['mode','view','lighting','viewport'].includes(key));const next=await driver.configure(patch);if(preserve&&before.frameIndex>0&&next.availability?.[next.configuration.mode]?.available)await driver.seek(before.frameIndex);publish(driver.state());return driver.state();};
  async function startMotion(){
    const initial=driver.state(),support=recordingSupport();
    if(!support.available)throw Error('Actual canvas recording is unavailable.');
    if(!['ready','playing'].includes(initial.phase)||!initial.availability?.[initial.configuration.mode]?.available)throw Error('Motion recording requires an available live render, outside measurement.');
    const {dataUrl,...firstFrame}=await driver.captureFrame();let endState=null;
    motion=createMotionRecorder({canvas:support.canvas,MediaRecorderCtor:recorderCtor,maxDurationMs:10000,onStopping:()=>{recordingStopping=true;if(!closed){driver.pause();endState=driver.state();publish(endState);}}});
    recordingActive=true;recordingStopping=false;lastMotion=null;
    try{driver.play();}catch(error){recordingActive=false;await motion.dispose();motion=null;publish(driver.state());throw error;}
    const startState=driver.state(),startedAt=new Date().toISOString();publish(startState);
    motionWork=motion.finished.then(report=>{
      const end=endState||driver.state(),advanced=end.frameIndex>startState.frameIndex&&end.tick>startState.tick&&end.worldTime>startState.worldTime;
      const status=report.status==='complete'&&!advanced?'inconclusive':report.status;
      const reason=status==='inconclusive'?'No authoritative live time advanced; a paused still is not motion evidence.':report.reason;
      const metadata={version:1,kind:'actual-canvas-live-recording',status,reason,scope:'Actual WebGL canvas only; DOM HUD excluded; no GPU timing or quality approval.',
        configuration:structuredClone(startState.configuration),sourceFingerprints:structuredClone(firstFrame.sourceFingerprints),hardware:structuredClone(firstFrame.hardware),
        start:{recordedAt:startedAt,frameIndex:startState.frameIndex,tick:startState.tick,worldTime:startState.worldTime,playerTime:startState.playerTime,workload:startState.workload},
        end:{recordedAt:new Date().toISOString(),frameIndex:end.frameIndex,tick:end.tick,worldTime:end.worldTime,playerTime:end.playerTime,workload:end.workload},
        recording:{mimeType:report.mimeType,bytes:report.bytes,canvas:report.canvas,wallDurationMs:report.wallDurationMs,maximumDurationMs:report.maximumDurationMs,requestedCaptureFps:report.requestedCaptureFps}};
      lastMotion=metadata;recordingActive=false;recordingStopping=false;motion=null;
      if(!closed){publish(driver.state());if(status==='complete'&&report.blob){const name='tinderbox-'+startState.configuration.mode+'-'+startState.configuration.scenario+'-motion-'+startState.frameIndex+'-'+end.frameIndex;onDownload(report.blob,name+(report.mimeType.includes('mp4')?'.mp4':'.webm'),report.mimeType);}}
      return metadata;
    }).catch(error=>{recordingActive=false;recordingStopping=false;motion=null;lastMotion={status:'unavailable',reason:error.message};if(!closed)publish(driver.state());return lastMotion;});
  }
  async function intent(command){
    if(closed||!driver)throw Error('The actual review driver is unavailable.');
    if(recordingActive&&!['stop-record','cancel-record'].includes(command.type))throw Error('Stop or discard the live recording before changing review state or measuring GPU cost.');
    switch(command.type){
      case 'configure':return configure(command.patch);
      case 'configure-choice':{const {key,value}=command;if(key==='viewport')return configure({viewport:VIEWPORTS[value]});if(key==='population')return configure({population:value==='auto'?null:Number(value)});if(key==='scenario')return configure({scenario:value,population:null});return configure({[key]:value});}
      case 'configure-number':return configure(command.key==='pixelRatio'?{viewport:{pixelRatio:command.value}}:{seed:command.value});
      case 'play':driver.play();publish(driver.state());return;
      case 'pause':driver.pause();publish(driver.state());return;
      case 'reset':await driver.reset();publish(driver.state());return;
      case 'step':await driver.step(1);publish(driver.state());return;
      case 'seek':await driver.seek(command.frame);publish(driver.state());return;
      case 'measure':try{return await driver.measure({modes:command.modes});}finally{if(!closed)publish(driver.state());}
      case 'cancel':return driver.cancelMeasurement();
      case 'record':await startMotion();return;
      case 'stop-record':if(!motion)throw Error('No live recording is active.');await motion.stop('manual');return motionWork;
      case 'cancel-record':if(!motion)throw Error('No live recording is active.');await motion.stop('cancelled');return motionWork;
      case 'motion-metadata':if(!lastMotion)throw Error('No motion metadata is available.');return onDownload(structuredClone(lastMotion),'tinderbox-fire-motion-metadata.json','application/json');
      case 'capture':{const capture=await driver.captureFrame();if(capture?.mimeType!=='image/jpeg'||!/^data:image\/jpeg;base64,/.test(capture.dataUrl||''))throw Error('Driver did not return an actual JPEG.');captures=[...captures,{...structuredClone(capture),id:'capture-'+(++captureSequence)}].slice(-6);publish(driver.state());return captures.at(-1);}
      case 'save-capture':case 'save-capture-metadata':{const capture=captures.find(x=>x.id===command.id);if(!capture)throw Error('Capture is no longer available.');const {dataUrl,...evidence}=capture,name='tinderbox-'+capture.configuration.mode+'-'+capture.configuration.scenario+'-frame-'+capture.frameIndex;if(command.type==='save-capture')return onDownload(dataUrl,name+'.jpg','image/jpeg');return onDownload(evidence,name+'.json','application/json');}
      case 'report':if(!lastState.results)throw Error('No driver report to export.');return onDownload(structuredClone(lastState.results),'tinderbox-fire-cost-report.json','application/json');
      default:throw Error('Unknown review control: '+command.type);
    }
  }
  const abort=()=>{void dispose();},doc=shell.renderRoot.ownerDocument,hidden=()=>{if(doc.hidden&&motion)void motion.stop('cancelled');};
  signal?.addEventListener('abort',abort,{once:true});doc?.addEventListener('visibilitychange',hidden);
  function dispose(){if(disposal)return disposal;closed=true;signal?.removeEventListener('abort',abort);doc?.removeEventListener('visibilitychange',hidden);disposal=(async()=>{await motion?.dispose();await motionWork;await driver?.dispose();})();return disposal;}
  try{driver=await createDriver({root:shell.renderRoot,uiRoot:shell.uiRoot,mountUI,signal,artistDelivery,referenceAcceptance,onChange:publish});if(closed){await driver.dispose();return {intent,dispose};}publish(driver.state());}
  catch(error){signal?.removeEventListener('abort',abort);doc?.removeEventListener('visibilitychange',hidden);if(!closed)shell.update({...EMPTY,references,referenceError,reason:'Actual WebGL driver failed: '+error.message,error:{message:error.message}});return {intent,dispose,unavailable:error.message};}
  return {intent,state:()=>structuredClone(lastState),dispose};
}
export async function startFireReview(root,{createDriver,mountUI,signal,fetchDossier=async requestSignal=>{const response=await fetch(new URL('../../art/source/fire-realism/references.json',import.meta.url),{signal:requestSignal});if(!response.ok)throw Error('Reference dossier HTTP '+response.status);return response.json();},artistDelivery=null,referenceAcceptance=null,onDownload}={}){
  const controller=new AbortController(),downloadReleases=new Set();let binding,referenceError=null,references=[];
  const externalAbort=()=>controller.abort();if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',externalAbort,{once:true});
  const save=onDownload||((value,name,type)=>{let release;release=download(root.ownerDocument,value,name,type,()=>downloadReleases.delete(release));if(release)downloadReleases.add(release);});
  const shell=createReviewShell({root,onIntent:command=>binding?.intent(command),onExport:value=>save(value,'tinderbox-fire-critique.json','application/json')});
  try{references=photoReferences(await fetchDossier(controller.signal));}catch(error){referenceError=error.message;}
  shell.update({...EMPTY,reason:'Connecting the actual WebGL driver.',references,referenceError});
  binding=await bindReviewDriver({shell,createDriver,mountUI:options=>mountUI({...options,autoOpenPauseMenu:false}),signal:controller.signal,artistDelivery,referenceAcceptance,references,referenceError,onDownload:save});
  let disposal=null;return {shell,binding,dispose(){if(disposal)return disposal;signal?.removeEventListener('abort',externalAbort);controller.abort();disposal=(async()=>{await binding.dispose();for(const release of downloadReleases)release();downloadReleases.clear();shell.dispose();})();return disposal;}};
}
if(typeof document!=='undefined'&&document.querySelector('#fire-review')){
  const root=document.querySelector('#fire-review'),lifetime=new AbortController();let active;
  window.addEventListener('pagehide',()=>{lifetime.abort();void active?.dispose();},{once:true});
  try{const [{createFireReviewDriver},{mountUI}]=await Promise.all([import('./driver.js'),import('../../src/ui/index.js')]);active=await startFireReview(root,{createDriver:createFireReviewDriver,mountUI,signal:lifetime.signal});if(lifetime.signal.aborted)await active.dispose();}
  catch(error){createReviewShell({root,initialState:{...EMPTY,reason:'Review module unavailable: '+error.message}});}
}
