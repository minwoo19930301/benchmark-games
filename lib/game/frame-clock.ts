/** Uses only RAF timestamps: performance.now() can be ahead of a queued frame. */
export class FrameClock {
  private previous: number | null = null;

  reset() {
    this.previous = null;
  }

  tick(timestamp: number) {
    if (!Number.isFinite(timestamp)) {
      this.reset();
      return 0;
    }

    const previous = this.previous;
    this.previous = timestamp;
    if (previous === null || timestamp <= previous) return 0;

    // Drop accumulated wall time after stalls instead of simulating a catch-up.
    return Math.min(0.05, (timestamp - previous) / 1000);
  }
}
