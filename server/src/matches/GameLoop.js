/**
 * Snake Nexus — Fixed-Interval Authoritative Simulation GameLoop
 */

export class GameLoop {
  /**
   * @param {number} tickRateMs - Interval between simulation updates
   * @param {Function} onTick - Callback executed on each tick
   */
  constructor(tickRateMs, onTick) {
    this.tickRateMs = tickRateMs;
    this.onTick = onTick;
    this.timerId = null;
    this.running = false;
    this.tickCount = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.tickCount = 0;

    let expected = Date.now() + this.tickRateMs;

    const step = () => {
      if (!this.running) return;

      this.tickCount++;
      try {
        this.onTick(this.tickCount);
      } catch (err) {
        console.error('GameLoop tick execution error:', err);
      }

      // Drift compensation
      const drift = Date.now() - expected;
      expected += this.tickRateMs;
      const nextInterval = Math.max(0, this.tickRateMs - drift);

      this.timerId = setTimeout(step, nextInterval);
    };

    this.timerId = setTimeout(step, this.tickRateMs);
  }

  stop() {
    this.running = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

