import {createV5BrowserLifecycleAudit} from './audit.js';
const get=id=>document.getElementById(id),audit=createV5BrowserLifecycleAudit();
let begun=false,controller=null;
const caseName=new URL(location.href).searchParams.get('case')||'cancel-staging';
get('case').textContent=caseName;
get('cancel').onclick=()=>controller?.abort(new DOMException('Visible host cancellation','AbortError'));
get('run').onclick=async()=>{
 if(begun)return;begun=true;get('run').disabled=true;get('cancel').disabled=false;controller=new AbortController();
 try{
  const report=await audit({caseName,projectUrl:new URL('../../../',import.meta.url),signal:controller.signal,onStatus:text=>{get('status').textContent=text;}});
  const raw=JSON.stringify(report,null,2)+'\n';
  if(new TextEncoder().encode(raw).length>524288)throw Error('Bounded report exceeded512 KiB');
  get('report').value=raw;get('status').textContent=report.status.toUpperCase()+': '+report.case+'; '+Math.round(report.elapsedMs)+'ms. '+report.ownership;
  get('export').href='data:application/json;charset=utf-8,'+encodeURIComponent(raw);get('export').download='V5-'+caseName+'-lifecycle.json';get('export').hidden=false;
 }catch(error){get('status').textContent=error.name+': '+error.message;get('report').value=JSON.stringify({status:'failed',error:{name:error.name,message:error.message}},null,2)+'\n';}
 finally{get('cancel').disabled=true;}
};
