import {createReviewShell,MODES,createMotionClipReader,createTimingReportEvidence,MAX_TIMING_REPORT_BYTES} from '../../workbenches/fire-realism/review.js';
import {mountUI} from '../../src/ui/index.js';
import {fixture} from '../../workbenches/ui/fixtures.js';
export function fixtureState(patch={}){
  return {connected:true,version:1,phase:'ready',reason:'DOM control fixture only; no WebGL or hardware timing.',configuration:{mode:'current',scenario:'match-contact',view:'isometric',lighting:'bright',population:null,seed:1893,characterId:'bear',viewport:{width:1280,height:800,pixelRatio:1}},
    availability:Object.fromEntries(MODES.map(m=>[m.id,{available:m.id!=='optimized',reason:m.id==='optimized'?'Optimized export not delivered':null,sourceCommit:'DOM-test-fixture'}])),
    capabilities:{gpuTimer:{available:true},populations:[]},frameIndex:45,tick:45,worldTime:.75,playerTime:.75,referenceAcceptance:'missing',workload:{actualBurningCells:4},diagnostics:{sourceFingerprints:{publishedControl:'DOM-test-fixture'}},references:[],captures:[],...patch};
}
const ok=(value,message)=>{if(!value)throw Error(message);};
const equal=(a,b,message='Values differ')=>ok(JSON.stringify(a)===JSON.stringify(b),message+': '+JSON.stringify(a));
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
async function stylesReady(link){
  if(link.sheet)return;
  await new Promise((resolve,reject)=>{const finish=error=>{clearTimeout(timer);link.removeEventListener('load',loaded);link.removeEventListener('error',failed);error?reject(error):resolve();},loaded=()=>finish(),failed=()=>finish(Error('Real HUD stylesheet failed to load')),timer=setTimeout(()=>finish(Error('Real HUD stylesheet load timed out')),5000);link.addEventListener('load',loaded,{once:true});link.addEventListener('error',failed,{once:true});});
}
export async function runFireReviewChecks(host){
  await document.fonts.ready;const results=[];
  async function check(name,run){
    const root=document.createElement('div');host.append(root);const intents=[],exports=[];let handler=intent=>intents.push(intent);
    const ui=createReviewShell({root,onIntent:i=>handler(i),onExport:r=>exports.push(r)}),state=fixtureState();
    const s={root,ui,state,intents,exports,find:q=>root.querySelector(q),all:q=>[...root.querySelectorAll(q)],update:()=>ui.update(state),handler:fn=>{handler=fn;}};
    try{const evidence=await run(s);results.push({name,status:'pass',...(evidence?{evidence}:{})});}catch(error){results.push({name,status:'fail',message:error.message});}finally{ui.dispose();root.remove();}
  }
  await check('Unavailable backend keeps controls disabled, with no fake canvas or timing',s=>{
    for(const el of s.all('[data-mode],[data-choice],[data-action],[data-seed],[data-dpr],[data-seek]'))ok(el.disabled,'Unavailable control enabled');
    equal(s.all('canvas').length,0);equal(s.find('[data-evidence-state]').textContent,'Unavailable');equal(s.find('[data-frame="tick"]').textContent,'Unavailable');
  });
  await check('There is one render slot, one real HUD slot, four fire modes and six scenarios',s=>{
    equal(s.all('[data-render-root]').length,1);equal(s.all('[data-ui-root]').length,1);equal(s.all('[data-mode]').length,4);s.update();equal(s.all('[data-choice="scenario"] option').length,6);ok(s.all('[data-choice="scenario"] option').some(o=>o.value==='gasoline-front-powder'),'Powder absent');
  });
  await check('Mode intent calls the driver once and never optimistically changes the selection',async s=>{
    s.update();s.find('[data-mode="reference"]').click();await flush();equal(s.intents,[{type:'configure',patch:{mode:'reference'}}]);equal(s.find('[data-mode="current"]').getAttribute('aria-pressed'),'true');ok(!s.find('[data-render-empty]').hidden,'DOM fixture claims actual render');
  });
  await check('Real HUD plus ready shell hides only the placeholder by computed style and restores genuine unavailable states',async s=>{
    const hud=mountUI({root:s.ui.uiRoot,onCommand:()=>{},autoOpenPauseMenu:false}),observations=[];
    try{
      hud.update(fixture('paused'));await stylesReady(s.ui.uiRoot.querySelector('link[rel="stylesheet"]'));await new Promise(resolve=>requestAnimationFrame(resolve));
      s.state.diagnostics={...s.state.diagnostics,renderer:{width:1280,height:800,pixelRatio:1,outputColorSpace:'srgb',toneMapping:0}};s.update();
      const placeholder=s.find('[data-render-empty]'),hudShell=s.ui.uiRoot.querySelector('.tb-ui'),matches=s.ui.uiRoot.querySelector('[data-tool="matches"]');
      ok(s.ui.uiRoot.querySelector('[data-empty]')===matches,'Real HUD stock marker did not reproduce the shared selector');
      equal(getComputedStyle(placeholder).display,'none','Ready placeholder still paints');equal(placeholder.getClientRects().length,0,'Ready overlay keeps a painted box');
      for(const button of s.ui.uiRoot.querySelectorAll('.left-controls button,.right-controls button')){ok(!button.hidden,'Shell hid a borrowed HUD button');ok(getComputedStyle(button).display!=='none','Borrowed HUD button lost its display');}
      equal(hudShell.dataset.mode,'gameplay');equal(hudShell.getAttribute('aria-pressed'),null,'Shell changed borrowed data-mode semantics');
      observations.push({phase:'ready',placeholderHidden:placeholder.hidden,placeholderDisplay:getComputedStyle(placeholder).display,matchesHidden:matches.hidden,matchesDisplay:getComputedStyle(matches).display,hudAriaPressed:hudShell.getAttribute('aria-pressed')});
      for(const phase of ['initializing','error','unavailable']){
        s.state.phase=phase;s.state.error=phase==='error'?{message:'Explicit DOM error fixture'}:null;s.state.availability.current.available=phase!=='unavailable';s.update();
        ok(!placeholder.hidden,'Unavailable placeholder was hidden');ok(getComputedStyle(placeholder).display!=='none','Unavailable explanation cannot paint');ok(placeholder.getClientRects().length>0,'Unavailable overlay has no painted box');equal(getComputedStyle(s.ui.uiRoot).display,'none','Unavailable HUD stays visible');
        observations.push({phase,placeholderHidden:placeholder.hidden,placeholderDisplay:getComputedStyle(placeholder).display,hudDisplay:getComputedStyle(s.ui.uiRoot).display});
      }
      s.state.phase='ready';s.state.error=null;s.state.availability.current.available=true;s.update();equal(getComputedStyle(placeholder).display,'none','Recovered render keeps stale overlay');ok(!matches.hidden,'Recovered shell hid matches');
      return {kind:'DOM visibility with real HUD and detached renderer metadata; no WebGL claim',observations};
    }finally{hud.dispose();}
  });
  await check('Powder is a scenario request and no clock multiplier control exists',async s=>{
    s.update();const q=s.find('[data-choice="scenario"]');q.value='gasoline-front-powder';q.dispatchEvent(new Event('change'));await flush();equal(s.intents,[{type:'configure-choice',key:'scenario',value:'gasoline-front-powder'}]);equal(s.all('[data-clock]').length,0);equal(s.state.worldTime,.75);
  });
  await check('Seed Enter commits once, ignoring keyboard repeat and acknowledged blur',async s=>{
    s.handler(i=>{s.intents.push(i);s.state.configuration.seed=i.value;s.update();});s.update();const input=s.find('[data-seed]');input.focus();input.value='7';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await flush();input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true}));input.dispatchEvent(new Event('change'));await flush();equal(s.intents,[{type:'configure-number',key:'seed',value:7}]);
  });
  await check('Step, seek, reset and capture remain explicit public method intents',async s=>{
    s.update();s.find('[data-seek]').value='120';for(const type of ['step','seek','reset','capture']){s.find('[data-action="'+type+'"]').click();await flush();}equal(s.intents,[{type:'step'},{type:'seek',frame:120},{type:'reset'},{type:'capture'}]);
  });
  await check('Cancel stays operable while the measure promise is unresolved',async s=>{
    let release;s.handler(i=>{s.intents.push(i);if(i.type==='measure'){s.state.phase='measuring';s.update();return new Promise(r=>{release=r;});}if(i.type==='cancel'){s.state.phase='cancelling';s.update();release();}});s.update();s.find('[data-action="measure"]').click();
    ok(!s.find('[data-action="cancel"]').disabled,'Pending measure disabled cancellation');ok(s.find('[data-mode="reference"]').disabled,'Mode can change mid-query');s.find('[data-action="cancel"]').click();await flush();equal(s.intents.map(i=>i.type),['measure','cancel']);
  });
  await check('Measuring state locks configuration and transport, preserving a single cancel path',s=>{
    s.state.phase='measuring';s.state.progress={passIndex:1,passCount:12,mode:'reference',phase:'sampling',phaseFrame:4,phaseFrames:600,validSamples:3,rejectedSamples:0};s.update();
    for(const el of s.all('[data-mode],[data-choice],[data-seed],[data-dpr],[data-seek]'))ok(el.disabled,'Configuration active during timing');for(const el of s.all('[data-action]'))equal(el.disabled,el.dataset.action!=='cancel','Busy action state');ok(s.find('[data-progress]').textContent.includes('reference'),'Progress mode absent');
  });
  await check('Missing canvas encoder leaves recording unavailable without invented motion',s=>{s.update();ok(s.find('[data-action="record"]').disabled,'Unavailable encoder enabled');ok(s.find('[data-action="stop-record"]').disabled,'No recording can stop');ok(s.find('[data-recording-status]').textContent.includes('unavailable'),'Missing unavailable message');});
  await check('Active recording permits stop/discard and locks GPU measurement plus scene edits',s=>{s.state.phase='playing';s.state.recording={available:true,active:true,stopping:false};s.update();ok(!s.find('[data-action="stop-record"]').disabled,'Stop disabled');ok(!s.find('[data-action="cancel-record"]').disabled,'Discard disabled');ok(s.find('[data-action="measure"]').disabled,'Recording contaminates timing');ok(s.find('[data-choice="scenario"]').disabled,'Recording scene can change');ok(s.find('[data-action="record"]').disabled,'Duplicate recording enabled');});
  await check('Unavailable optimized mode retains its reason and cannot be selected',s=>{s.update();const button=s.find('[data-mode="optimized"]');ok(button.disabled,'Unavailable optimized enabled');ok(button.title.includes('not delivered'),'Unavailable reason absent');button.click();equal(s.intents,[]);});
  await check('A connected shader error keeps configuration available for recovery, while render controls lock',s=>{s.state.phase='error';s.state.error={message:'Fixture shader failure'};s.update();ok(!s.find('[data-mode="current"]').disabled,'Published-mode recovery blocked');ok(s.find('[data-action="play"]').disabled,'Error can play');ok(!s.find('[data-render-empty]').hidden,'Error claims render');});
  await check('JPEG and evidence JSON use separate explicit controls and one intent per gesture',async s=>{
    s.state.captures=[{id:'fixture',mimeType:'image/jpeg',dataUrl:'data:image/jpeg;base64,dGVzdA==',frameIndex:45,configuration:s.state.configuration,sourceFingerprints:{publishedControl:'DOM fixture only'},hardware:{renderer:'No renderer in DOM fixture'}}];s.update();const metadata=s.find('[data-capture-metadata]'),details=metadata.closest('details');ok(!details.open,'JPEG metadata must start collapsed');details.querySelector('summary').click();ok(details.open,'JPEG evidence cannot expand');equal(JSON.parse(metadata.textContent),{id:'fixture',mimeType:'image/jpeg',frameIndex:45,configuration:s.state.configuration,sourceFingerprints:{publishedControl:'DOM fixture only'},hardware:{renderer:'No renderer in DOM fixture'}});ok(!metadata.textContent.includes('base64'),'JPEG payload leaked into metadata');const buttons=s.all('[data-captures] button');equal(buttons.map(b=>b.textContent),['Save JPEG','Save evidence JSON']);buttons[0].click();await flush();equal(s.intents,[{type:'save-capture',id:'fixture'}]);buttons[1].click();await flush();equal(s.intents,[{type:'save-capture',id:'fixture'},{type:'save-capture-metadata',id:'fixture'}]);
  });
  await check('Latest Blob-derived motion link is explicit, paused, bounded and detached during measurement',async s=>{
    const bytes=new Blob(['DOM encoded-byte fixture only; not a real recorded fire'],{type:'video/webm'}),reader=createMotionClipReader({blob:bytes}),clip=await reader.finished;
    const metadata={status:'complete',reason:'DOM media-control fixture only',sourceFingerprints:{reference:'DOM fixture'},hardware:{renderer:'No renderer'},recording:{wallDurationMs:10153,nominalStopAfterMs:10000,schedulingOverrunMs:28,encoderDrainMs:125}};
    s.state.recording={active:false,available:true,lastResult:metadata,clip:{...clip,id:'DOM-clip-1',name:'DOM-control-fixture.webm'}};s.update();
    const link=s.find('[data-motion-save]'),video=s.find('[data-motion-preview]');equal(s.all('[data-motion-save]').length,1);equal(link.getAttribute('href'),clip.href);equal(link.download,'DOM-control-fixture.webm');equal(video.preload,'none');ok(video.paused&&!video.autoplay,'Clip autoplayed');equal(JSON.parse(s.find('[data-motion-metadata]').textContent),metadata);equal(s.intents,[],'Completion attempted an export');
    let clicks=0;link.addEventListener('click',event=>{event.preventDefault();clicks++;},{once:true});link.click();equal(clicks,1,'One explicit save gesture did not reach the native link once');equal(s.intents,[],'Native save link routed a second download intent');
    s.state.reviewEvidenceLocked=true;s.update();equal(video.getAttribute('src'),null,'Pending measurement retains decoder source');equal(link.getAttribute('href'),null,'Pending measurement retains download');ok(!video.controls,'Measurement retains playback controls');equal(link.getAttribute('aria-disabled'),'true');ok(!link.dispatchEvent(new MouseEvent('click',{cancelable:true})),'Locked native link did not cancel');
    s.state.reviewEvidenceLocked=false;s.state.phase='measuring';s.update();equal(video.getAttribute('src'),null);s.state.phase='ready';s.update();equal(video.getAttribute('src'),clip.href);ok(video.paused,'Measurement recovery autoplayed');
    s.state.recording.clip={...s.state.recording.clip,id:'DOM-clip-2'};s.update();equal(video.getAttribute('src'),null,'Replaced preview keeps bytes');equal(link.getAttribute('href'),null,'Replaced link keeps bytes');equal(s.all('[data-motion-save]').length,1,'Multiple clips retained');
    const latest=s.find('[data-motion-preview]');s.state.recording={active:false,available:true,lastResult:null,clip:null};s.update();equal(latest.getAttribute('src'),null);equal(s.all('[data-motion-save]').length,0,'Reset keeps prior download');
  });
  await check('Remote or malformed video evidence cannot become a preview or save link',s=>{
    for(const href of ['https://example.org/not-verified.webm','data:text/html;base64,PGgxPg==','data:video/webm;base64,AAAA']){s.state.recording={lastResult:{status:'complete'},clip:{id:href,bytes:7,mimeType:'video/webm',href,name:'rejected.webm'}};s.update();equal(s.all('[data-motion-preview],[data-motion-save]').length,0,'Unverified video acquired a media control');}
  });
  await check('Motion metadata is explicitly saved once and disabled when no completed record exists',async s=>{
    s.update();ok(s.find('[data-action="motion-metadata"]').disabled,'Missing metadata can download');s.state.recording={active:false,available:true,lastResult:{status:'complete',reason:'DOM route fixture only'}};s.update();s.find('[data-action="motion-metadata"]').click();await flush();equal(s.intents,[{type:'motion-metadata'}]);
  });
  await check('Unsupported populations are not offered for ordinary scenarios',s=>{s.update();equal(s.all('[data-choice="population"] option').map(o=>o.value),['auto']);s.state.capabilities.populations=[32,128,512];s.update();equal(s.all('[data-choice="population"] option').map(o=>o.value),['auto','32','128','512']);});
  await check('Unchanged updates preserve focused inputs, options and edited notes',s=>{
    s.update();const seed=s.find('[data-seed]'),option=s.find('[data-choice="scenario"]').firstChild,note=s.find('textarea');seed.focus();seed.value='17';note.value='Observed gap';note.dispatchEvent(new Event('input'));s.update();equal(seed.value,'17');ok(document.activeElement===seed,'Focus lost');ok(option===s.find('[data-choice="scenario"]').firstChild,'Catalogue churn');equal(note.value,'Observed gap');
  });
  await check('Driver errors recover controls after a rejected request',async s=>{s.handler(()=>Promise.reject(Error('Fixture rejected')));s.update();s.find('[data-action="reset"]').click();await flush();ok(s.find('[data-export-status]').textContent.includes('Fixture rejected'),'Failure hidden');ok(!s.find('[data-action="reset"]').disabled,'Lock remained');});
  await check('Exact raw report exposes one native JSON link, byte/hash record and unchanged expandable body',async s=>{
    const report={status:'inconclusive',reason:'DOM report fixture; no hardware timing',hardware:{renderer:'Fixture only',note:'fumée 🔥'},gpu:{trials:[{gpu:[{index:0,gpuMs:2.5}]}]},comparison:{targetMet:null}},task=createTimingReportEvidence({report}),evidence=await task.finished;equal(evidence.status,'available');s.state.results=report;s.state.reportEvidence=evidence;s.update();
    const link=s.find('[data-report-save]'),pre=s.find('[data-report-json]'),details=pre.closest('details');equal(s.all('[data-report-save]').length,1);equal(link.download,'tinderbox-fire-cost-report.json');equal(link.getAttribute('href'),evidence.href);equal(pre.textContent,JSON.stringify(report,null,2)+'\n');ok(s.find('[data-report-evidence-status]').textContent.includes(evidence.sha256),'Exact report digest missing');ok(s.find('[data-report-evidence-status]').textContent.includes(String(evidence.bytes)),'UTF-8 byte count missing');ok(!details.open,'Raw JSON starts expanded');details.querySelector('summary').click();ok(details.open,'Exact JSON cannot expand');equal(s.intents,[],'Preparation attempted a download');
    let clicks=0;link.addEventListener('click',event=>{event.preventDefault();clicks++;},{once:true});link.click();equal(clicks,1);equal(s.intents,[],'Native link caused a second export route');
    s.state.phase='measuring';s.state.results={...report,toJSON(){throw Error('Prior raw report serialized during sampling');}};s.update();equal(link.getAttribute('href'),null,'Old report href survives sampling');equal(pre.textContent,'','Old JSON body survives sampling');equal(s.all('[data-report-save],[data-report-json]').length,0);ok(s.find('[data-action="report"]').disabled,'JSON preparation enabled during sampling');ok(s.find('[data-notes] button[type="submit"]').disabled,'Critique can encode a prior report during sampling');s.find('[data-notes]').dispatchEvent(new Event('submit',{cancelable:true}));equal(s.exports.length,0);ok(s.find('[data-export-status]').textContent.includes('unavailable'),'Critique timing lock missing');
    s.state.phase='ready';s.state.results=report;s.state.reportEvidence={status:'preparing',reason:'DOM preparation fixture'};s.update();ok(!s.find('[data-action="cancel"]').disabled,'Pending evidence preparation cannot cancel');equal(s.find('[data-action="cancel"]').textContent,'Cancel report preparation');s.find('[data-action="cancel"]').click();await flush();equal(s.intents,[{type:'cancel'}]);task.dispose();
  });
  await check('Raw report failure or oversize shows an explicit reason with no substituted resource',s=>{
    for(const evidence of [{status:'oversized',bytes:MAX_TIMING_REPORT_BYTES+1,reason:'Exact report exceeds limit'}, {status:'unavailable',reason:'SHA-256 unavailable'}, {status:'available',bytes:10,sha256:'a'.repeat(64),text:'{}',href:'https://example.org/report.json'}]){s.state.reportEvidence=evidence;s.update();equal(s.all('[data-report-save],[data-report-json]').length,0,'Failed raw report acquired a resource');ok(s.find('[data-report-evidence-status]').textContent.length>0,'Failure not explained');}
  });
  await check('Inconclusive raw numbers remain inconclusive and never approve a target',s=>{
    s.state.results={status:'inconclusive',reason:'Fixture disjoint query',gpu:{absoluteSceneMs:{reference:{median:1,p95:2,variance:.1}}},comparison:{optimizedReferenceRatio:.25,targetMet:null}};s.update();equal(s.find('[data-evidence-state]').textContent,'Inconclusive');ok(s.all('[data-metrics] td').every(c=>c.textContent==='Inconclusive'),'Rejected number shown as valid');ok(s.find('[data-target]').textContent.includes('No cost-target'),'Inferred target acceptance');
  });
  await check('A valid numerical ratio without external acceptance grants no visual or cost approval',s=>{
    s.state.results={status:'complete',comparison:{optimizedReferenceRatio:.25,targetMet:null},gpu:{incrementalFireMs:{reference:{median:2}}}};s.update();ok(s.find('[data-metrics]').textContent.includes('0.25'),'Driver ratio missing');ok(s.find('[data-target]').textContent.includes('No cost-target'),'UI accepted ratio');ok(s.find('[data-baseline]').textContent.includes('not yet accepted'),'UI accepted visual baseline');
  });
  await check('Critique export is detached, includes source and workload, and has six observations',s=>{
    const latestCpu={simulationMs:.125,updateMs:2.5,renderSubmissionMs:1.25,liveCallback:{advancedFrames:3,presentations:1}},playbackClock={droppedRealSeconds:.25,backlogSeconds:.1};s.state.diagnostics={...s.state.diagnostics,latestCpu,playbackClock,fire:{toJSON(){throw Error('Large fire diagnostics must not be serialized into the visible source disclosure');}}};s.update();let disclosure=JSON.parse(s.find('[data-source-record]').textContent);equal(disclosure.latestCpu,latestCpu);equal(disclosure.playbackClock,playbackClock);ok(!Object.hasOwn(disclosure,'fire'),'Full fire diagnostics were forwarded');s.state.phase='measuring';s.update();disclosure=JSON.parse(s.find('[data-source-record]').textContent);equal(disclosure.latestCpu,latestCpu);equal(disclosure.playbackClock,playbackClock);s.state.phase='ready';s.update();const note=s.find('textarea[name="shape"]');note.value='Contact gap';note.dispatchEvent(new Event('input'));s.find('[data-notes]').dispatchEvent(new Event('submit',{cancelable:true}));equal(s.exports.length,1);equal(s.exports[0].notes.shape,'Contact gap');equal(Object.keys(s.exports[0].notes).length,6);equal(s.exports[0].context.workload.actualBurningCells,4);s.state.configuration.seed=5;equal(s.exports[0].context.configuration.seed,1893);ok(s.exports[0].acceptance.includes('do not approve'),'Export implies approval');
  });
  await check('External text cannot inject markup into statuses or catalogues',s=>{
    s.state.reason='<img id="injected" src=x onerror=alert(1)>';s.update();ok(!s.root.querySelector('#injected'),'Injected HTML');ok(s.find('[data-status]').textContent.includes('<img'),'Literal text lost');
  });
  await check('Unverified or remote image assets are withheld, while institutional links work',s=>{
    s.state.references=[{id:'fixture',label:'Fixture',verified:false,asset:'../../index.html',record:'https://catalog.archives.gov/id/6349328'}];s.update();ok(s.find('[data-reference-figure]').hidden,'Unverified photo loaded');ok(!s.find('[data-reference-link]').hidden,'Record link absent');s.state.references=[{...s.state.references[0],verified:true,asset:'https://example.org/photo.jpg'}];s.update();ok(s.find('[data-reference-figure]').hidden,'Remote photo loaded');
  });
  await check('Reference failure is explained and precise metadata stays visible',s=>{
    s.state.references=[{id:'fixture',label:'Source atlas fixture, not a fire photograph',verified:true,asset:'../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/effects/painted-fire/flame-atlas-v1.png',metadata:{sha256:'fixture'},limitations:['Not motion evidence']}];s.update();ok(!s.find('[data-reference-figure]').hidden,'Local plate absent');s.find('[data-reference-image]').dispatchEvent(new Event('error'));ok(s.find('[data-reference-figure]').hidden,'Broken image visible');ok(s.find('[data-reference-reason]').textContent.includes('could not be loaded'),'Failure hidden');ok(s.find('[data-reference-metadata]').textContent.includes('fixture'),'Metadata dropped');
  });
  await check('Actual-size inspection is reversible and does not configure the driver',s=>{s.update();s.find('[data-size]').click();equal(s.find('[data-size]').getAttribute('aria-pressed'),'true');s.find('[data-size]').click();equal(s.find('[data-size]').getAttribute('aria-pressed'),'false');equal(s.intents,[]);});
  await check('Page fits its viewport and enabled review controls meet 44 px targets',s=>{
    s.update();ok(document.documentElement.scrollWidth<=document.documentElement.clientWidth,'Horizontal page overflow');for(const el of s.all('button,input,select,summary')){if(el.disabled||!el.getClientRects().length||el.closest('[data-ui-root]'))continue;const r=el.getBoundingClientRect();ok(r.width>=44&&r.height>=44,'Small control: '+el.outerHTML.slice(0,90));}
  });
  await check('Disposal removes the tree and prevents a pending response from restoring it',async s=>{let release;s.handler(()=>new Promise(r=>{release=r;}));s.update();const button=s.find('[data-action="reset"]');button.click();s.ui.dispose();release();await flush();button.click();s.ui.update(fixtureState());equal(s.root.childElementCount,0);});
  async function hudCheck(name,options,run){const root=document.createElement('div');root.style.cssText='position:relative;width:390px;height:844px';host.append(root);const commands=[],ui=mountUI({root,onCommand:c=>commands.push(c),...options});try{await run({root,ui,commands,find:q=>root.querySelector(q)});results.push({name,status:'pass'});}catch(error){results.push({name,status:'fail',message:error.message});}finally{ui.dispose();root.remove();}}
  await hudCheck('Production default still automatically opens the pause dialog on a paused snapshot',{},s=>{const snap=fixture('paused');s.ui.update(snap);ok(!s.find('[data-menu]').hidden,'Default pause dialog regressed');equal(s.find('[data-pause]').getAttribute('aria-expanded'),'true');equal(snap.paused,true);});
  await hudCheck('Review opt-out keeps paused controls locked and all six buttons visible without the dialog',{autoOpenPauseMenu:false},s=>{
    const snap=fixture('paused');s.ui.update(snap);ok(s.find('[data-menu]').hidden,'Review auto-opened dialog');equal(s.find('[data-loadout-state]').textContent,'PAUSED');equal(s.root.querySelectorAll('.left-controls button,.right-controls button').length,6);for(const b of s.root.querySelectorAll('[data-tool],[data-stick]'))ok(b.disabled,'Paused input enabled');equal(snap.paused,true);s.find('[data-pause]').click();ok(!s.find('[data-menu]').hidden,'Explicit menu broken');
  });
  return results;
}
