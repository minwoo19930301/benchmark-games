export const BENCHMARK_VERSION = 'reference-rebuild-2026-09-21' as const;
export class FrameSamples {
  private frames: number[] = [];
  private costs: number[] = [];
  add(interval: number, cost: number) {
    if (
      !Number.isFinite(interval) ||
      interval <= 0 ||
      !Number.isFinite(cost) ||
      cost < 0
    )
      return;
    if (this.frames.length >= 36000) return;
    this.frames.push(interval);
    this.costs.push(cost);
  }
  summary() {
    const sorted = [...this.frames].sort((a, b) => a - b);
    const elapsedMs = this.frames.reduce((a, b) => a + b, 0);
    const meanWorkMs = this.costs.length
      ? this.costs.reduce((a, b) => a + b, 0) / this.costs.length
      : 0;
    return {
      frames: this.frames.length,
      elapsedMs,
      averageFps: elapsedMs ? (1000 * this.frames.length) / elapsedMs : 0,
      p95FrameMs: sorted.length
        ? sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)]
        : 0,
      meanWorkMs,
    };
  }
}
export type BenchmarkRecord = ReturnType<FrameSamples['summary']> & {
  benchmarkVersion: typeof BENCHMARK_VERSION;
  game: string;
  title: string;
  recordedAt: string;
  outcome: 'won' | 'lost';
  simulationSeconds: number;
  score: number;
  viewport: string;
  pixelRatio: number;
  browser: string;
  drawCalls: number;
  entities: number;
};
const recordKey = 'benchmark-games:retro-results:v2';
export function readRecords(): BenchmarkRecord[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(recordKey) || '[]');
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (entry): entry is BenchmarkRecord =>
          !!entry &&
          typeof entry === 'object' &&
          entry.benchmarkVersion === BENCHMARK_VERSION &&
          typeof entry.game === 'string' &&
          typeof entry.title === 'string' &&
          typeof entry.recordedAt === 'string' &&
          typeof entry.viewport === 'string' &&
          typeof entry.browser === 'string' &&
          (entry.outcome === 'won' || entry.outcome === 'lost') &&
          [
            'averageFps',
            'p95FrameMs',
            'meanWorkMs',
            'frames',
            'simulationSeconds',
            'elapsedMs',
            'score',
            'pixelRatio',
            'drawCalls',
            'entities',
          ].every((key) => Number.isFinite(entry[key]) && entry[key] >= 0),
      )
      .slice(0, 30);
  } catch {
    return [];
  }
}
export function saveRecord(record: BenchmarkRecord) {
  const records = [record, ...readRecords()].slice(0, 30);
  try {
    localStorage.setItem(recordKey, JSON.stringify(records));
  } catch {
    /* Optional local history. */
  }
  return records;
}
