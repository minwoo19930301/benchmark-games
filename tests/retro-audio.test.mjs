import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeAudio } from '../lib/retro/audio.ts';
function audioEnvironment(t, reject = false) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const contexts = [];
  class Node {
    gain = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    frequency = this.gain;
    connect() {}
    disconnect() {}
    start() {
      this.started = true;
    }
    stop() {
      this.stopped = true;
      this.onended?.();
    }
  }
  class Context {
    currentTime = 0;
    sampleRate = 1000;
    state = 'suspended';
    destination = {};
    sources = [];
    constructor() {
      contexts.push(this);
    }
    async resume() {
      if (reject) throw Error('blocked');
      this.state = 'running';
    }
    createGain() {
      return new Node();
    }
    createBiquadFilter() {
      return new Node();
    }
    createBuffer(_channels, length) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      const source = new Node();
      this.sources.push(source);
      return source;
    }
    createOscillator() {
      return this.createBufferSource();
    }
    async close() {
      this.state = 'closed';
    }
  }
  Object.defineProperty(globalThis, 'AudioContext', {
    value: Context,
    configurable: true,
  });
  t.after(() => {
    if (old) Object.defineProperty(globalThis, 'AudioContext', old);
    else delete globalThis.AudioContext;
  });
  return contexts;
}
test('audio remains uninitialized until explicit opt-in and never replays muted history', async (t) => {
  const contexts = audioEnvironment(t),
    a = new ArcadeAudio();
  a.update({ shot: 7 });
  assert.equal(contexts.length, 0);
  assert.equal(await a.enable(true), true);
  a.update({ shot: 7 });
  assert.equal(contexts[0].sources.length, 0);
  a.update({ shot: 8 });
  assert.equal(contexts[0].sources.length, 1);
  a.update({ shot: 8 });
  assert.equal(contexts[0].sources.length, 1);
  a.dispose();
  assert.equal(contexts[0].state, 'closed');
});
test('muting and disposal stop sound sources, and disposed audio cannot reactivate', async (t) => {
  const contexts = audioEnvironment(t),
    a = new ArcadeAudio();
  await a.enable(true);
  a.update({ jump: 1, hit: 1 });
  assert.equal(contexts[0].sources.length, 2);
  await a.enable(false);
  assert.ok(contexts[0].sources.every((s) => s.stopped));
  a.update({ jump: 2 });
  assert.equal(contexts[0].sources.length, 2);
  a.dispose();
  assert.equal(await a.enable(true), false);
});
test('browser autoplay rejection degrades to mute without throwing', async (t) => {
  const contexts = audioEnvironment(t, true),
    a = new ArcadeAudio();
  assert.equal(await a.enable(true), false);
  a.update({ shot: 1 });
  assert.equal(contexts[0].sources.length, 0);
  a.dispose();
});
