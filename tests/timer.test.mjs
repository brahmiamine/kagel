import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimer, advanceTimer, skipPhase, progressPercent } from '../lib/timer.ts';

const conf = { holdSec: 6, restSec: 6, reps: 2, prepSec: 3 };

test('starts with preparation and advances to contraction', () => {
  const s = advanceTimer({ ...createTimer(conf), running: true }, conf, 4);
  assert.equal(s.phase, 'hold');
  assert.equal(s.secondsLeft, 5);
});

test('pausing and resuming does not restart preparation', () => {
  const partial = advanceTimer({ ...createTimer(conf), running: true }, conf, 2);
  assert.equal(partial.secondsLeft, 1);
  const paused = advanceTimer({ ...partial, running: false }, conf, 10);
  assert.equal(paused.secondsLeft, 1);
  const resumed = advanceTimer({ ...paused, running: true }, conf, 1.2);
  assert.equal(resumed.phase, 'hold');
  assert.ok(resumed.secondsLeft < 6);
});

test('large elapsed times finish the entire session correctly', () => {
  const s = advanceTimer({ ...createTimer(conf), running: true }, conf, 999);
  assert.deepEqual(s, { phase: 'done', secondsLeft: 0, completed: 2, running: false });
  assert.equal(progressPercent(s, conf), 100);
});

test('skipping phases completes one repetition after rest', () => {
  const a = skipPhase(createTimer(conf), conf);
  assert.equal(a.phase, 'hold');
  const b = skipPhase(a, conf);
  assert.equal(b.phase, 'rest');
  const c = skipPhase(b, conf);
  assert.equal(c.phase, 'hold');
  assert.equal(c.completed, 1);
});

test('zero preparation begins with hold', () => {
  assert.deepEqual(createTimer({ ...conf, prepSec: 0 }).phase, 'hold');
});

test('progress advances smoothly within a repetition', () => {
  const s = advanceTimer({ ...createTimer(conf), running: true }, conf, 6);
  assert.ok(progressPercent(s, conf) > 0);
  assert.ok(progressPercent(s, conf) < 50);
});
