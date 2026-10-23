class CelebrationAudio {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx && AudioCtx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  playCelebrationSound(isFirstLucid: boolean = false): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Confetti Burst Pop (Soft filtered noise)
      try {
        const bufferSize = Math.floor(ctx.sampleRate * 0.08);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(850, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.08);

        const popGain = ctx.createGain();
        popGain.gain.setValueAtTime(0.3, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(filter);
        filter.connect(popGain);
        popGain.connect(ctx.destination);
        noise.start(now);
      } catch {
        // audio buffer creation ignored in mock environments
      }

      // 2. Celebratory Chime Fanfare (Ascending harmonic chord)
      // Notes: C5 (523.25), E5 (659.25), G5 (783.99), B5 (987.77), C6 (1046.50), E6 (1318.51)
      const frequencies = isFirstLucid
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
        : [523.25, 659.25, 783.99, 1046.5];

      frequencies.forEach((freq, idx) => {
        try {
          const noteTime = now + 0.04 + idx * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.0001, noteTime);
          gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + 1.25);
        } catch {
          // ignore oscillator errors
        }
      });

      // 3. Shimmering High Sparkle Twinkle
      const sparkles = [2093.0, 2637.02, 3135.96, 4186.01];
      sparkles.forEach((freq, idx) => {
        try {
          const t = now + 0.35 + idx * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(0.08, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.5);
        } catch {
          // ignore
        }
      });
    } catch {
      // AudioContext failure gracefully caught
    }
  }
}

export const celebrationAudio = new CelebrationAudio();
