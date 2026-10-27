import {mountUI} from '../../src/ui/index.js';
import {createFakeSnapshotAdapter} from './fixtures.js';
const root = document.querySelector('#ui-root');
let ui, commandIndex = 0;
const adapter = createFakeSnapshotAdapter({
  onSnapshot: snapshot => ui?.update(snapshot),
  onCommand: command => {
    const item = document.createElement('li');
    item.textContent = (++commandIndex) + ' ' + JSON.stringify(command);
    const log = document.querySelector('#command-log');
    log.prepend(item); while (log.children.length > 8) log.lastElementChild.remove();
    if (command.type === 'move') {
      document.querySelector('#vector-value').value = command.x.toFixed(2) + ' / ' + command.y.toFixed(2);
      document.querySelector('#vector-arrow').setAttribute('d', 'M70 70 L' + (70 + command.x * 48) + ' ' + (70 - command.y * 48));
    }
    if (command.type === 'primary' || command.type === 'cancel-input') document.querySelector('#trigger-state').textContent = command.pressed ? 'TRIGGER DOWN' : 'TRIGGER UP';
  }
});
ui = mountUI({root, onCommand: command => adapter.dispatch(command)});
ui.update(adapter.snapshot());
document.querySelector('#fixture').addEventListener('change', event => adapter.choose(event.target.value));
window.addEventListener('pagehide', () => ui.dispose(), {once: true});
for (const type of ['error', 'unhandledrejection']) window.addEventListener(type, event => {
  const output = document.querySelector('#bench-error'); output.hidden = false;
  output.textContent = 'WORKBENCH ERROR: ' + (event.message || event.reason?.message || event.reason);
});
