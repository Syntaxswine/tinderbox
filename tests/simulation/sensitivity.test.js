import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../../src/simulation/index.js';

test('held-out diagonal and half-resolution fire fronts remain finite with documented tolerance', t => {
  const measurements = [];
  for (const cellSize of [0.5, 0.25]) for (const heading of [0, Math.PI / 4]) {
    const origin = {x: 1.25, y: 1.25}, direction = {x: Math.cos(heading), y: Math.sin(heading)};
    const sim = createSimulation({scenario: {id: 'sensitivity', width: 12, height: 12, fireCellSize: cellSize,
      player: {x: 10, y: 1}, obstacles: [], actors: [],
      fuelLines: [{from: origin, to: {x: origin.x + direction.x * 8, y: origin.y + direction.y * 8}, litresPerMetre: 0.08}],
      ignitions: [{...origin, radius: 0.01, heat: 3}]}});
    let arrival = null;
    for (let tick = 1; tick <= 240; tick++) {
      const s = sim.advance(1 / 60);
      const front = Math.max(0, ...s.cells.filter(c => c.phase === 'burning').map(c => (c.x - origin.x) * direction.x + (c.y - origin.y) * direction.y));
      assert.ok(front <= 4 * s.clocks.world + Math.SQRT2 * cellSize, 'Front cannot outrun capped travel plus one cell quantization');
      const ledger = s.diagnostics.fuel;
      assert.ok(Math.abs(ledger.fixtureFuel - ledger.remainingDepositedFuel - ledger.burnedDepositedFuel) < 1e-8);
      if (front >= 4) { arrival = s.clocks.world; break; }
    }
    assert.ok(arrival !== null, 'Fire must actually reach the target');
    measurements.push({cellSize, headingDegrees: Math.round(heading * 180 / Math.PI), arrivalSeconds: +arrival.toFixed(4)});
    sim.dispose();
  }
  const times = measurements.map(m => m.arrivalSeconds);
  assert.ok(Math.max(...times) / Math.min(...times) <= 1.25, 'Prototype direction/resolution sensitivity must remain within 25%');
  t.diagnostic('4 m front arrival: ' + JSON.stringify(measurements));
});
