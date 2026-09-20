import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameSamples, readRecords, saveRecord } from '../lib/retro/metrics.ts';
test('Frame samples retain foreground stalls in average FPS and p95', () => {
  const samples = new FrameSamples();
  for (let i = 0; i < 18; i++) samples.add(10, 2);
  samples.add(40, 3);
  samples.add(60, 4);
  const result = samples.summary();
  assert.equal(result.frames, 20);
  assert.equal(result.elapsedMs, 280);
  assert.equal(result.averageFps, 1000 / 14);
  assert.equal(result.p95FrameMs, 40);
  assert.equal(result.meanWorkMs, 2.15);
});
test('Frame samples reject invalid measurements and safely represent an unrun scene', () => {
  const samples = new FrameSamples();
  for (const invalid of [0, -1, NaN, Infinity]) samples.add(invalid, 2);
  samples.add(20, -2);
  samples.add(20, NaN);
  assert.deepEqual(samples.summary(), {
    frames: 0,
    elapsedMs: 0,
    averageFps: 0,
    p95FrameMs: 0,
    meanWorkMs: 0,
  });
});
test('Malformed optional local records cannot crash the library, history caps at30', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let data = 'broken';
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => data,
      setItem: (_key, value) => {
        data = value;
      },
    },
  });
  try {
    assert.deepEqual(readRecords(), []);
    data = JSON.stringify([
      {
        game: 'smash',
        title: 'Partial',
        recordedAt: 'now',
        outcome: 'won',
        frames: 1,
        averageFps: 60,
        p95FrameMs: 16,
        meanWorkMs: 2,
      },
    ]);
    assert.deepEqual(readRecords(), []);
    const record = {
      game: 'smash',
      title: 'Super Smash Bros.',
      benchmarkVersion: 'reference-rebuild-2026-09-21',
      recordedAt: 'now',
      outcome: 'won',
      simulationSeconds: 40,
      score: 100,
      viewport: '1000×600',
      pixelRatio: 1,
      browser: 'test',
      drawCalls: 5,
      entities: 10,
      frames: 1,
      elapsedMs: 16,
      averageFps: 62.5,
      p95FrameMs: 16,
      meanWorkMs: 2,
    };
    for (let i = 0; i < 35; i++) saveRecord({ ...record, score: i });
    assert.equal(readRecords().length, 30);
    assert.equal(readRecords()[0].score, 34);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem() {
          throw new Error('private storage');
        },
        setItem() {
          throw new Error('quota');
        },
      },
    });
    assert.deepEqual(readRecords(), []);
    assert.equal(saveRecord(record).length, 1);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('Previous parody records are preserved outside the current benchmark store', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map([
    ['benchmark-games:retro-results:v1', '[{"game":"smash","score":999}]'],
  ]);
  const keys = [];
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key) {
        keys.push(key);
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, value);
      },
    },
  });
  try {
    assert.deepEqual(readRecords(), []);
    assert.deepEqual(keys, ['benchmark-games:retro-results:v2']);
    assert.equal(
      storage.get('benchmark-games:retro-results:v1'),
      '[{"game":"smash","score":999}]',
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});
