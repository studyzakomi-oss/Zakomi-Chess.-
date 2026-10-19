/** Small synthesized effects (no audio files) — played only when the user enables sound. */
let ctx: AudioContext | null = null;

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.06, delay = 0) {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch {
    /* audio unavailable */
  }
}

export type Sfx = 'move' | 'capture' | 'check' | 'success' | 'fail' | 'end';

export function play(sfx: Sfx, enabled: boolean) {
  if (!enabled) return;
  switch (sfx) {
    case 'move':
      return tone(420, 0.08, 'triangle');
    case 'capture':
      return tone(260, 0.12, 'square', 0.04);
    case 'check':
      tone(660, 0.1, 'sawtooth', 0.03);
      return tone(880, 0.12, 'sawtooth', 0.03, 0.08);
    case 'success':
      tone(523, 0.1);
      tone(659, 0.1, 'sine', 0.06, 0.09);
      return tone(784, 0.18, 'sine', 0.06, 0.18);
    case 'fail':
      return tone(196, 0.25, 'triangle', 0.05);
    case 'end':
      tone(392, 0.15);
      return tone(523, 0.3, 'sine', 0.06, 0.14);
  }
}
