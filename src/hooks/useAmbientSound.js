import { useEffect, useRef } from "react";

/**
 * Procedural ambient sound for the study-room stage — no audio files.
 *
 * Peaceful, calming soundscapes synthesised live with the Web Audio API. Each
 * scene layers a soft warm harmonic pad (quiet sine chord with a slow tremolo)
 * under a gentle filtered-noise texture:
 *   rainy-night  → warm pad + soft rain, slowly breathing
 *   starry-night → airy pad + faint breeze + occasional soft chime
 *   lofi-dusk    → low warm pad + mellow evening breeze
 *
 * Audio only starts on an explicit user gesture (the speaker toggle sets
 * `enabled`), which is also what browser autoplay policies require. Everything
 * fades in/out and tears down cleanly on scene change / disable / unmount.
 */

const MASTER_VOLUME = 0.3;

export default function useAmbientSound(scene, enabled) {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const noiseBufRef = useRef(null);
  const cleanupsRef = useRef([]);

  const stopScene = () => {
    cleanupsRef.current.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
    cleanupsRef.current = [];
  };

  useEffect(() => {
    // Disabled: fade the master gain down, then stop the scene nodes.
    if (!enabled) {
      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (ctx && master) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.4);
      }
      const t = window.setTimeout(stopScene, 480);
      return () => window.clearTimeout(t);
    }

    // Enabled: lazily create the context on first use (inside the gesture).
    let ctx = ctxRef.current;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return undefined;
      ctx = new AudioCtx();
      ctxRef.current = ctx;

      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      masterRef.current = master;

      const len = Math.floor(ctx.sampleRate * 2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      noiseBufRef.current = buf;
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    stopScene();
    cleanupsRef.current = buildScene(ctx, masterRef.current, noiseBufRef.current, scene);

    const master = masterRef.current;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(MASTER_VOLUME, now + 0.6);

    return undefined;
  }, [enabled, scene]);

  // Tear everything down when the room unmounts.
  useEffect(() => {
    return () => {
      stopScene();
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);
}

// ── Scene synthesis ──────────────────────────────────────────────────────────

function makeNoise(ctx, buf) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

// Returns an array of cleanup functions that stop/disconnect the scene's nodes.
function buildScene(ctx, master, buf, scene) {
  const cleanups = [];
  const track = (node) => {
    cleanups.push(() => {
      try {
        node.stop?.();
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect?.();
      } catch {
        /* ignore */
      }
    });
    return node;
  };

  // Soft warm harmonic pad — a quiet sine chord with a gentle tremolo. This is
  // what makes each scene feel calm rather than like static hiss.
  const addPad = (freqs, level) => {
    const padGain = track(ctx.createGain());
    padGain.gain.value = level;
    const lp = track(ctx.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.connect(padGain);
    padGain.connect(master);

    freqs.forEach((f, i) => {
      const osc = track(ctx.createOscillator());
      osc.type = "sine";
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 4; // slight spread for warmth
      const og = track(ctx.createGain());
      og.gain.value = 1 / freqs.length;
      osc.connect(og);
      og.connect(lp);
      osc.start();
    });

    const lfo = track(ctx.createOscillator());
    lfo.frequency.value = 0.035; // slow, calm tremolo
    const lfoGain = track(ctx.createGain());
    lfoGain.gain.value = level * 0.45;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);
    lfo.start();
  };

  // Gentle filtered-noise bed (rain / breeze) that slowly swells like a soft
  // breeze — a slow filter sweep (changing colour) plus a slow amplitude gust.
  const addBreeze = (cutoff, level, sweep) => {
    const src = track(makeNoise(ctx, buf));
    const lp = track(ctx.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    const g = track(ctx.createGain());
    g.gain.value = level;
    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start();

    // Slow colour sweep.
    const fLfo = track(ctx.createOscillator());
    fLfo.frequency.value = 0.025;
    const fLfoGain = track(ctx.createGain());
    fLfoGain.gain.value = sweep;
    fLfo.connect(fLfoGain);
    fLfoGain.connect(lp.frequency);
    fLfo.start();

    // Slow gusts — the breeze gently rises and falls.
    const aLfo = track(ctx.createOscillator());
    aLfo.frequency.value = 0.04;
    const aLfoGain = track(ctx.createGain());
    aLfoGain.gain.value = level * 0.45;
    aLfo.connect(aLfoGain);
    aLfoGain.connect(g.gain);
    aLfo.start();
  };

  if (scene === "rainy-night") {
    addPad([110, 164.81, 220], 0.05); // A2 · E3 · A3
    addBreeze(900, 0.5, 120); // soft rain body
  } else if (scene === "starry-night") {
    addPad([164.81, 220, 246.94], 0.045); // E3 · A3 · B3
    addBreeze(430, 0.28, 150); // faint airy breeze

    // Occasional soft bell chime — a sine with a long, calm decay.
    const chime = () => {
      const notes = [880, 1108.73, 1318.51]; // A5 · C#6 · E6
      const f = notes[Math.floor(Math.random() * notes.length)];
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(master);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
      osc.start(t0);
      osc.stop(t0 + 3.6);
    };
    const id = window.setInterval(() => {
      if (Math.random() < 0.4) chime();
    }, 6000);
    cleanups.push(() => window.clearInterval(id));
  } else {
    // lofi-dusk
    addPad([98, 146.83, 196], 0.05); // G2 · D3 · G3
    addBreeze(560, 0.32, 200); // mellow evening breeze
  }

  return cleanups;
}
