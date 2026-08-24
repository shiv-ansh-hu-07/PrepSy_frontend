import { useEffect, useRef } from "react";

/**
 * Procedural ambient sound for the study-room stage — no audio files.
 *
 * Each scene's soundscape is synthesised live with the Web Audio API:
 *   rainy-night  → steady rain (filtered noise) + a faint hiss, gently swelling
 *   starry-night → soft night breeze + sparse cricket chirps
 *   lofi-dusk    → warm evening breeze
 *
 * Audio only starts on an explicit user gesture (the speaker toggle sets
 * `enabled`), which is also what browser autoplay policies require. Everything
 * fades in/out and tears down cleanly on scene change / disable / unmount.
 */

const MASTER_VOLUME = 0.32;

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

  if (scene === "rainy-night") {
    // Main rain body: white noise through a lowpass.
    const src = track(makeNoise(ctx, buf));
    const lp = track(ctx.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = 1250;
    lp.Q.value = 0.6;
    const g = track(ctx.createGain());
    g.gain.value = 0.9;
    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start();

    // Fine hiss on top.
    const src2 = track(makeNoise(ctx, buf));
    const hp = track(ctx.createBiquadFilter());
    hp.type = "highpass";
    hp.frequency.value = 3200;
    const g2 = track(ctx.createGain());
    g2.gain.value = 0.12;
    src2.connect(hp);
    hp.connect(g2);
    g2.connect(master);
    src2.start();

    // Slow swell so it breathes instead of sitting flat.
    const lfo = track(ctx.createOscillator());
    lfo.frequency.value = 0.08;
    const lfoGain = track(ctx.createGain());
    lfoGain.gain.value = 0.18;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    lfo.start();
  } else if (scene === "starry-night") {
    // Soft, airy night breeze.
    const src = track(makeNoise(ctx, buf));
    const lp = track(ctx.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = 520;
    const g = track(ctx.createGain());
    g.gain.value = 0.5;
    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start();

    const lfo = track(ctx.createOscillator());
    lfo.frequency.value = 0.06;
    const lfoGain = track(ctx.createGain());
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    lfo.start();

    // Sparse cricket chirps.
    const chirp = () => {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 4200 + Math.random() * 500;
      const cg = ctx.createGain();
      cg.gain.value = 0;
      osc.connect(cg);
      cg.connect(master);
      let t = t0;
      for (let i = 0; i < 3; i += 1) {
        cg.gain.setValueAtTime(0, t);
        cg.gain.linearRampToValueAtTime(0.03, t + 0.008);
        cg.gain.linearRampToValueAtTime(0, t + 0.03);
        t += 0.05;
      }
      osc.start(t0);
      osc.stop(t + 0.05);
    };
    const id = window.setInterval(() => {
      if (Math.random() < 0.55) chirp();
    }, 1600);
    cleanups.push(() => window.clearInterval(id));
  } else {
    // lofi-dusk: warm, low evening breeze.
    const src = track(makeNoise(ctx, buf));
    const lp = track(ctx.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = 720;
    const g = track(ctx.createGain());
    g.gain.value = 0.55;
    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start();

    const lfo = track(ctx.createOscillator());
    lfo.frequency.value = 0.05;
    const lfoGain = track(ctx.createGain());
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    lfo.start();
  }

  return cleanups;
}
