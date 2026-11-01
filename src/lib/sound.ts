/** A kitchen-timer chime made with the Web Audio API, so there's no audio file to ship. */

let context: AudioContext | null = null;

/** Call from a click so the browser lets the alarm play later. */
export function primeAudio(): AudioContext | null {
  try {
    if (!context) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

export function playChime(): void {
  const ctx = primeAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  [0, 0.26, 0.52, 1.1, 1.36, 1.62].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = i % 3 === 2 ? 1318.5 : 987.8;
    gain.gain.setValueAtTime(0.0001, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.28, t + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.23);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.25);
  });
}
