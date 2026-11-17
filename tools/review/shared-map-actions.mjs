import assert from 'node:assert/strict';

// Observe the first outcome, including a wrong tool or a truthful rejection.
// Waiting only for the desired positive can hide an unintended action.
export function firstPrimaryReceipt(events,afterId){return events.find(e=>e.id>afterId&&['tool-use','tool-rejected'].includes(e.type))||null;}
export function requirePrimaryTool(receipt,tool){assert.ok(receipt,'A new primary action receipt is required');assert.equal(receipt.tool,tool,'The actual primary action must use the requested tool');return receipt;}

export function requireHeldFlameAttempt({initialFuel,observations,inputEvents,releaseAfterMs}){
  assert.ok(Number.isFinite(releaseAfterMs)&&releaseAfterMs>0&&releaseAfterMs<=2000,'Held release must be scheduled within two seconds');
  const down=inputEvents.find(e=>e.type==='keydown'&&e.code==='Space'),up=down&&inputEvents.find(e=>e.type==='keyup'&&e.code==='Space'&&e.at>=down.at);
  assert.ok(down?.trusted&&up?.trusted,'Actual trusted held-key down/up receipts are required');
  const actualHoldMs=up.at-down.at;assert.ok(Number.isFinite(actualHoldMs)&&actualHoldMs>=0&&actualHoldMs<=2000,'Actual held input exceeded its two-second limit');
  assert.ok(observations.some(o=>o.tool==='flamethrower'),'Actual flamethrower selection must be observed');
  const receipt=observations.find(o=>o.tool==='flamethrower'&&(o.usingTool===true||o.dischargeActive===true&&o.dischargeTool==='flamethrower'||Number.isFinite(o.fuel)&&o.fuel<initialFuel));
  assert.ok(receipt,'A real active discharge, usingTool or stock-debit receipt is required');return {receipt,actualHoldMs,releaseAfterMs,keydown:down,keyup:up};
}
