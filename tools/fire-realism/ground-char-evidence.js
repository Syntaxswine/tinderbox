import {classifyCharEvidence,consumedFuelChar} from '../../src/art/ground-field.js';
import {clamp} from '../../src/art/resources.js';

export const GROUND_CHAR_REVIEW_LIMIT=32;
const ascii=value=>typeof value==='string'&&/^[\x20-\x7e]{1,128}$/.test(value);
const clock=value=>Number.isFinite(value)?value:null;

// Public state/capture observation only. Never called by update/beforeRender and
// never owns a snapshot, texture or history. RGBA is NOT a texture readback.
export function groundCharReviewEvidence(snapshot,model){
  const field=model?.groundChar,last=model?.lastSnapshot;
  const record={version:1,status:'unavailable',reason:null,
    basis:'Authoritative snapshot plus computed CPU float32 expectation; not GPU texture readback or upload proof',
    gpuTextureReadback:false,uploadProved:false,
    mode:field?.charMode??null,charVersion:field?.charVersion??null,
    snapshot:snapshot?{tick:clock(snapshot.tick),worldTime:clock(snapshot.clocks?.world),playerTime:clock(snapshot.clocks?.player)}:null,
    modelUpdate:last?{tick:clock(last.tick),worldTime:clock(last.worldTime),playerTime:clock(last.playerTime)}:null,
    clocksMatch:null,coverage:{maxCells:GROUND_CHAR_REVIEW_LIMIT,sourceCells:Array.isArray(snapshot?.cells)?snapshot.cells.length:null,
      modelCells:Number.isSafeInteger(field?.cells)?field.cells:null,candidates:null,selected:0,omitted:null,truncated:null},cells:[]};
  if(!snapshot||!Array.isArray(snapshot.cells)){record.reason='Authoritative cell snapshot unavailable';return record;}
  if(!field||!last||model.disposed){record.reason='Ground model diagnostics or last successful model update unavailable';return record;}
  if(Object.values(record.snapshot).includes(null)||Object.values(record.modelUpdate).includes(null)){
    record.reason='Snapshot/model clock evidence unavailable';return record;
  }
  record.clocksMatch=record.snapshot.tick===record.modelUpdate.tick&&record.snapshot.worldTime===record.modelUpdate.worldTime&&record.snapshot.playerTime===record.modelUpdate.playerTime;
  let mode;
  try{mode=classifyCharEvidence(snapshot.cells);}catch{record.reason='Invalid or mixed authoritative char evidence';return record;}
  if(mode==='legacy-phase'){
    record.status='legacy';record.reason='Legacy phase presentation has no measured consumed-fuel evidence';
    if(!record.clocksMatch)record.reason+='; snapshot/model clocks differ';return record;
  }
  const selected=[];let candidates=0;
  for(const cell of snapshot.cells){
    if(cell.phase!=='burning'&&cell.surfaceFuel===cell.initialSurfaceFuel&&cell.consumedDepositedFuel===0)continue;
    if(!ascii(cell.id)||!['cold','heating','burning','spent'].includes(cell.phase)||
       ![cell.depositedFuel,cell.heat,cell.intensity].every(Number.isFinite)){
      record.reason='Candidate ID/phase/fuel/heat/intensity evidence is malformed';return record;
    }
    candidates++;
    // Only 32 source references are kept, in ASCII order; never clone/sort the
    // whole field or retain its references beyond this observation.
    const index=selected.findIndex(other=>other.id>=cell.id);
    if(index!==-1&&selected[index].id===cell.id){record.reason='Duplicate candidate cell ID';return record;}
    if(index!==-1)selected.splice(index,0,cell);else if(selected.length<GROUND_CHAR_REVIEW_LIMIT)selected.push(cell);
    if(selected.length>GROUND_CHAR_REVIEW_LIMIT)selected.pop();
  }
  record.coverage={...record.coverage,candidates,selected:selected.length,omitted:candidates-selected.length,truncated:candidates>selected.length};
  record.cells=selected.map(cell=>({id:cell.id,phase:cell.phase,x:cell.x,y:cell.y,size:cell.size,nativePosition:[cell.x,0,cell.y],
    initialSurfaceFuel:cell.initialSurfaceFuel,surfaceFuel:cell.surfaceFuel,consumedDepositedFuel:cell.consumedDepositedFuel,
    depositedFuel:cell.depositedFuel,heat:cell.heat,intensity:cell.intensity,
    expectedFloat32RGBA:[Math.fround(Math.min(1,Math.sqrt(Math.max(0,cell.depositedFuel||0))*2)),
      Math.fround(cell.phase==='heating'?.24+clamp(cell.heat)*.55:cell.phase==='burning'?clamp(cell.intensity)*.75:0),
      Math.fround(consumedFuelChar(cell)),cell.phase==='burning'?1:0]}));
  const matches=field.charMode===mode&&field.charVersion===1&&field.cells===snapshot.cells.length;
  record.status=!record.clocksMatch?'clock-mismatch':!matches?'model-mismatch':'available';
  record.reason=!record.clocksMatch?'Current snapshot differs from last successful model-update clocks':!matches?'Actual ground mode/version/count differs from current snapshot':null;
  return record;
}
