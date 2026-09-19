import type { SoundCue } from './types.ts';

/** Original short synthesized effects. AudioContext exists only after the sound button is pressed. */
export class ArcadeAudio {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private enabled = false;
  private disposed = false;
  private seen: Partial<Record<SoundCue, number>> = {};
  private voices = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer | null = null;
  async enable(enabled: boolean) {
    if (this.disposed) return false;
    this.enabled = enabled;
    if (!enabled) {
      this.quiet();
      return false;
    }
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = 0.15;
        this.gain.connect(this.context.destination);
        this.noise = this.context.createBuffer(
          1,
          this.context.sampleRate * 0.3,
          this.context.sampleRate,
        );
        const data = this.noise.getChannelData(0);
        let seed = 193;
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          data[i] = seed / 2147483648 - 1;
        }
      }
      await this.context.resume();
      return this.enabled && !this.disposed;
    } catch {
      this.enabled = false;
      return false;
    }
  }
  sync(cues: Partial<Record<SoundCue, number>> = {}) {
    this.seen = { ...cues };
  }
  update(cues: Partial<Record<SoundCue, number>> = {}) {
    for (const [name, count] of Object.entries(cues)) {
      const key = name as SoundCue;
      if (count > (this.seen[key] || 0)) this.play(key);
    }
    this.sync(cues);
  }
  private play(kind: SoundCue) {
    if (
      !this.enabled ||
      !this.context ||
      !this.gain ||
      this.context.state !== 'running' ||
      this.voices.size > 20
    )
      return;
    const ctx = this.context,
      now = ctx.currentTime;
    const envelope = ctx.createGain();
    envelope.connect(this.gain);
    const noisy = kind === 'shot' || kind === 'explosion' || kind === 'dash';
    const duration =
      kind === 'explosion' ? 0.25 : kind === 'ability' ? 0.22 : 0.09;
    envelope.gain.setValueAtTime(kind === 'shot' ? 0.7 : 0.5, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    let source: AudioScheduledSourceNode;
    if (noisy) {
      const node = ctx.createBufferSource();
      node.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        kind === 'explosion' ? 950 : kind === 'dash' ? 1800 : 6500,
        now,
      );
      filter.frequency.exponentialRampToValueAtTime(100, now + duration);
      node.connect(filter);
      filter.connect(envelope);
      source = node;
    } else {
      const node = ctx.createOscillator();
      node.type = kind === 'hit' ? 'square' : 'triangle';
      const frequencies = {
        jump: [280, 750],
        pickup: [780, 1560],
        hit: [180, 60],
        ability: [190, 1100],
      };
      const [from, to] = frequencies[kind as keyof typeof frequencies];
      node.frequency.setValueAtTime(from, now);
      node.frequency.exponentialRampToValueAtTime(to, now + duration);
      node.connect(envelope);
      source = node;
    }
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      envelope.disconnect();
    };
    source.start(now);
    source.stop(now + duration);
  }
  quiet() {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* already stopped */
      }
    }
    this.voices.clear();
  }
  dispose() {
    this.disposed = true;
    this.enabled = false;
    this.quiet();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
