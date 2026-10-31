// Test-only wall deadline. The driver VM has a separate, manually advanced clock.
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';

export async function waitForFireApi(promise, {operation, pump, diagnostics, timeoutMs=10000}) {
  const started=performance.now(), deadline=started+timeoutMs;
  let done=false, failed=false, result, failure, polls=0;
  Promise.resolve(promise).then(value=>{result=value;done=true;}, cause=>{failure=cause;failed=true;done=true;});
  while (!done && performance.now()<deadline) {
    // Yield to timers and native asynchronous work instead of treating event-loop
    // turns as elapsed time. Pump only the fixture's existing single RAF queue.
    await delay(1);
    if (!done && performance.now()<deadline) {pump();polls++;}
  }
  if (!done) {
    const diagnostic={operation,timeoutMs,elapsedMs:performance.now()-started,polls,pending:diagnostics()};
    const error=new Error('Finite API operation timed out: '+JSON.stringify(diagnostic));
    error.code='ERR_FIRE_FIXTURE_TIMEOUT';error.diagnostic=diagnostic;throw error;
  }
  if (failed) throw failure;
  return result;
}
