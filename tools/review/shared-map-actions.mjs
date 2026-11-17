import assert from 'node:assert/strict';

// Observe the first outcome, including a wrong tool or a truthful rejection.
// Waiting only for the desired positive can hide an unintended action.
export function firstPrimaryReceipt(events,afterId){return events.find(e=>e.id>afterId&&['tool-use','tool-rejected'].includes(e.type))||null;}
export function requirePrimaryTool(receipt,tool){assert.ok(receipt,'A new primary action receipt is required');assert.equal(receipt.tool,tool,'The actual primary action must use the requested tool');return receipt;}
