/**
 * @class AlmanacAudio
 * @description Modular WebAudio engine for generating notification chimes without external assets.
 */
export class AlmanacAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.context = null;
  }

  /**
   * Initializes or resumes the AudioContext to comply with browser autoplay policies.
   * @returns {Promise<void>}
   * @private
   */
  async _ensureContext() {
    if (!this.context) {
      // Fallback for older WebKit browsers
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Plays a clean two-tone harmonic chime (~600Hz to 900Hz).
   * Features a smooth gain decay over 1.2s.
   * @returns {Promise<void>}
   */
  async playTimerComplete() {
    await this._ensureContext();
    const ctx = this.context;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';

    // Frequency envelope: Starts at 600Hz, glides to 900Hz
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);

    // Gain envelope: Smooth decay over 1.2 seconds
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2); // Decay

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 1.2);
  }

  /**
   * Plays a quick ascending notification chirp.
   * @returns {Promise<void>}
   */
  async playDropAlert() {
    await this._ensureContext();
    const ctx = this.context;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';

    // Frequency envelope: Ascending chirp
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);

    // Gain envelope: Very quick attack and short decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  }
}
