import {runCadenceExperiment} from './experiment.js';
const get=id=>document.getElementById(id);let begun=false,controller;
get('cancel').onclick=()=>controller?.abort(new DOMException('Visible diagnostic cancellation','AbortError'));
get('run').onclick=async()=>{
 if(begun)return;begun=true;controller=new AbortController();get('run').disabled=true;get('cancel').disabled=false;
 try{const report=await runCadenceExperiment({root:get('cadence-review'),signal:controller.signal,onStatus:text=>{get('status').textContent=text;}}),start=performance.now(),preparationJson=JSON.stringify(report),preparedAt=performance.now();report.hostFinalization={preparationSerializationWallMs:preparedAt-start,preparationUtf8Bytes:new TextEncoder().encode(preparationJson).length,scope:'Measured preparation pass after live/cache work. Final self-containing JSON/DOM/data-link encoding is additional post-window work; no live CPU/GPU attribution.'};const raw=JSON.stringify(report)+'\n',bytes=new TextEncoder().encode(raw).length;
  if(bytes>8*1024*1024)throw Error('Diagnostic JSON exceeded8 MiB');get('report').value=raw;get('status').textContent=report.status.toUpperCase()+': '+report.documentOwnership+' Final host serialization '+(performance.now()-start).toFixed(1)+'ms; '+bytes+'B.';get('export').href='data:application/json;charset=utf-8,'+encodeURIComponent(raw);get('export').download='V5-finite-cadence-diagnostic.json';get('export').hidden=false;
 }catch(error){get('status').textContent=error.name+': '+error.message;get('report').value=JSON.stringify({status:'failed',error:{name:error.name,message:error.message}})+'\n';}
 finally{get('cancel').disabled=true;}
};
