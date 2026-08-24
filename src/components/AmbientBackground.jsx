/**
 * Ambient stage wallpaper.
 *
 * Fills the study-room stage behind the participant/screen content so an empty
 * room feels like a *place* instead of a black void. Rendered absolutely inside
 * `RoomLayout`'s stage; it is decorative only (`aria-hidden`, no pointer events).
 *
 * `scene` selects a wallpaper (see SCENES / SCENE_LIST in ./ambientScenes.js).
 * Motion is gentle and calm (drifting clouds, a pulsing moon/sun, the odd
 * shooting star, fireflies) and every animation honours prefers-reduced-motion.
 * Ambient SOUND is handled separately by ../hooks/useAmbientSound.
 */

// Scene id → component. Ids must match SCENE_LIST in ./ambientScenes.js
// (the picker metadata lives there so this file only exports components).
const SCENES = {
  "rainy-night": RainyNight,
  "starry-night": StarryNight,
  "lofi-dusk": LofiDusk,
};

export default function AmbientBackground({ scene = "rainy-night" }) {
  const Scene = SCENES[scene] || RainyNight;
  return (
    <div aria-hidden="true" style={styles.root}>
      <style>{keyframes}</style>
      <Scene />
    </div>
  );
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function Skyline() {
  return (
    <svg
      viewBox="0 0 1280 260"
      preserveAspectRatio="xMidYMax slice"
      style={styles.skyline}
    >
      <g fill="#070b16">
        <rect x="0" y="140" width="120" height="120" />
        <rect x="120" y="90" width="90" height="170" />
        <rect x="210" y="160" width="110" height="100" />
        <rect x="320" y="110" width="80" height="150" />
        <rect x="400" y="175" width="130" height="85" />
        <rect x="530" y="70" width="70" height="190" />
        <rect x="600" y="130" width="120" height="130" />
        <rect x="720" y="100" width="95" height="160" />
        <rect x="815" y="165" width="120" height="95" />
        <rect x="935" y="85" width="85" height="175" />
        <rect x="1020" y="150" width="110" height="110" />
        <rect x="1130" y="115" width="90" height="145" />
        <rect x="1220" y="170" width="60" height="90" />
      </g>
      <g>
        <rect x="140" y="110" width="5" height="6" fill="rgba(255,196,120,0.42)" />
        <rect x="345" y="140" width="5" height="6" fill="rgba(255,196,120,0.38)" />
        <rect x="560" y="150" width="5" height="6" fill="rgba(150,180,255,0.28)" />
        <rect x="745" y="140" width="5" height="6" fill="rgba(255,196,120,0.40)" />
        <rect x="960" y="120" width="5" height="6" fill="rgba(150,180,255,0.26)" />
      </g>
    </svg>
  );
}

function Cloud({ className, top, left, w, h, tint }) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top,
        left,
        width: w,
        height: h,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${tint}, transparent 70%)`,
        filter: "blur(22px)",
        pointerEvents: "none",
      }}
    />
  );
}

// ── Scenes ───────────────────────────────────────────────────────────────────

function RainyNight() {
  return (
    <>
      <div style={styles.rainySky} />
      <div className="ambient-moon" style={styles.moon} />
      <Cloud className="ambient-cloud-1" top="14%" left="8%" w={280} h={90} tint="rgba(180,190,225,0.10)" />
      <Cloud className="ambient-cloud-2" top="26%" left="52%" w={340} h={100} tint="rgba(170,180,215,0.08)" />
      <Skyline />
      <div className="ambient-rain ambient-rain-2" style={styles.rain} />
      <div className="ambient-rain ambient-rain-1" style={styles.rain} />
      <div style={styles.vignette} />
    </>
  );
}

function StarryNight() {
  return (
    <>
      <div style={styles.starrySky} />
      <div className="ambient-moon" style={{ ...styles.moon, top: "12%", right: "14%", width: 92 }} />
      <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" style={styles.fill}>
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#eef2ff"
            opacity={s.o}
            className={s.tw ? "ambient-star" : undefined}
            style={s.tw ? { animationDelay: `${s.d}s` } : undefined}
          />
        ))}
      </svg>
      <div className="ambient-shoot ambient-shoot-1" style={styles.shoot} />
      <div className="ambient-shoot ambient-shoot-2" style={{ ...styles.shoot, top: "26%", left: "8%" }} />
      <Skyline />
      <div style={styles.vignette} />
    </>
  );
}

function LofiDusk() {
  return (
    <>
      <div style={styles.duskSky} />
      <div className="ambient-sun" style={styles.duskSun} />
      <Cloud className="ambient-cloud-1" top="20%" left="6%" w={300} h={80} tint="rgba(255,190,150,0.14)" />
      <Cloud className="ambient-cloud-2" top="34%" left="56%" w={360} h={90} tint="rgba(220,160,170,0.12)" />
      <svg viewBox="0 0 1280 260" preserveAspectRatio="xMidYMax slice" style={styles.skyline}>
        <path d="M0 150 Q 320 90 640 140 T 1280 120 L1280 260 L0 260 Z" fill="#241a3a" opacity="0.85" />
        <path d="M0 200 Q 360 150 720 190 T 1280 180 L1280 260 L0 260 Z" fill="#140e26" />
      </svg>
      {FIREFLIES.map((f, i) => (
        <div
          key={i}
          className="ambient-fly"
          style={{ ...styles.firefly, left: f.left, top: f.top, animationDelay: `${f.d}s` }}
        />
      ))}
      <div style={styles.vignetteWarm} />
    </>
  );
}

// Deterministic star field (x,y in a 1280×720 box; r radius, o opacity,
// tw = twinkles, d = animation delay).
const STARS = [
  { x: 90, y: 70, r: 1.4, o: 0.9, tw: true, d: 0 },
  { x: 180, y: 140, r: 1.0, o: 0.7 },
  { x: 260, y: 60, r: 1.6, o: 0.95, tw: true, d: 1.2 },
  { x: 330, y: 180, r: 0.9, o: 0.6 },
  { x: 410, y: 90, r: 1.2, o: 0.85, tw: true, d: 0.6 },
  { x: 500, y: 50, r: 1.0, o: 0.7 },
  { x: 560, y: 150, r: 1.5, o: 0.9, tw: true, d: 2.0 },
  { x: 640, y: 80, r: 0.8, o: 0.55 },
  { x: 720, y: 130, r: 1.3, o: 0.85, tw: true, d: 1.6 },
  { x: 800, y: 60, r: 1.1, o: 0.75 },
  { x: 880, y: 160, r: 1.6, o: 0.95, tw: true, d: 0.3 },
  { x: 960, y: 90, r: 0.9, o: 0.6 },
  { x: 1040, y: 140, r: 1.2, o: 0.8, tw: true, d: 2.4 },
  { x: 1120, y: 70, r: 1.0, o: 0.7 },
  { x: 1200, y: 150, r: 1.4, o: 0.9, tw: true, d: 1.0 },
  { x: 140, y: 220, r: 1.0, o: 0.65 },
  { x: 300, y: 260, r: 1.3, o: 0.8, tw: true, d: 1.8 },
  { x: 470, y: 230, r: 0.9, o: 0.55 },
  { x: 630, y: 270, r: 1.1, o: 0.75, tw: true, d: 0.9 },
  { x: 790, y: 240, r: 1.0, o: 0.65 },
  { x: 950, y: 275, r: 1.4, o: 0.85, tw: true, d: 2.2 },
  { x: 1110, y: 235, r: 1.0, o: 0.7 },
  { x: 220, y: 320, r: 1.2, o: 0.75, tw: true, d: 1.4 },
  { x: 560, y: 330, r: 0.9, o: 0.55 },
  { x: 880, y: 340, r: 1.1, o: 0.7, tw: true, d: 0.5 },
];

const FIREFLIES = [
  { left: "16%", top: "60%", d: 0 },
  { left: "27%", top: "72%", d: 2.4 },
  { left: "36%", top: "52%", d: 4.1 },
  { left: "45%", top: "68%", d: 1.2 },
  { left: "54%", top: "58%", d: 3.3 },
  { left: "63%", top: "74%", d: 5.0 },
  { left: "72%", top: "54%", d: 0.8 },
  { left: "81%", top: "66%", d: 2.9 },
  { left: "88%", top: "60%", d: 4.5 },
];

const keyframes = `
@keyframes ambientRainFall { to { transform: translateY(42px); } }
@keyframes ambientTwinkle { 0%,100% { opacity: 0.9; } 50% { opacity: 0.25; } }
@keyframes ambientMoon { 0%,100% { opacity: 0.82; } 50% { opacity: 1; } }
@keyframes ambientSun { 0%,100% { opacity: 0.82; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.1); } }
@keyframes ambientDriftA { 0% { transform: translateX(-9%); } 100% { transform: translateX(10%); } }
@keyframes ambientDriftB { 0% { transform: translateX(9%); } 100% { transform: translateX(-10%); } }
@keyframes ambientShoot { 0% { opacity: 0; transform: translate(0,0) rotate(18deg); } 3% { opacity: 0.9; } 9% { opacity: 0; transform: translate(260px,110px) rotate(18deg); } 100% { opacity: 0; } }
@keyframes ambientFly { 0% { opacity: 0; transform: translate(0,0); } 20% { opacity: 1; } 70% { opacity: 0.85; } 100% { opacity: 0; transform: translate(22px,-95px); } }
@keyframes ambientFlyStatic { 0%,100% { opacity: 0; } 50% { opacity: 0.9; } }
.ambient-rain-1 {
  background-image: repeating-linear-gradient(101deg, rgba(255,255,255,0) 0 6px, rgba(200,215,255,0.06) 6px 7px);
  animation: ambientRainFall 0.65s linear infinite;
}
.ambient-rain-2 {
  background-image: repeating-linear-gradient(99deg, rgba(255,255,255,0) 0 10px, rgba(190,205,255,0.04) 10px 11px);
  animation: ambientRainFall 0.95s linear infinite;
}
.ambient-star { animation: ambientTwinkle 3.2s ease-in-out infinite; }
.ambient-moon { animation: ambientMoon 7s ease-in-out infinite; }
.ambient-sun { animation: ambientSun 8s ease-in-out infinite; }
.ambient-cloud-1 { animation: ambientDriftA 48s ease-in-out infinite alternate; }
.ambient-cloud-2 { animation: ambientDriftB 62s ease-in-out infinite alternate; }
.ambient-shoot-1 { animation: ambientShoot 9s linear infinite; animation-delay: 3s; }
.ambient-shoot-2 { animation: ambientShoot 12s linear infinite; animation-delay: 7s; }
.ambient-fly { animation: ambientFly 7s ease-in-out infinite; }
/* Reduce motion: drop travelling/repetitive motion, but keep gentle opacity
   life so the scene never goes fully static. */
@media (prefers-reduced-motion: reduce) {
  .ambient-rain-1, .ambient-rain-2, .ambient-cloud-1, .ambient-cloud-2 { animation: none; }
  .ambient-shoot-1, .ambient-shoot-2 { animation: none; opacity: 0; }
  .ambient-sun { animation: ambientMoon 7s ease-in-out infinite; }
  .ambient-fly { animation: ambientFlyStatic 4.5s ease-in-out infinite; }
}
`;

const styles = {
  root: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    overflow: "hidden",
    pointerEvents: "none",
    background: "#05070b",
  },
  fill: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  rainySky: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(120% 85% at 72% 12%, rgba(124,58,237,0.22), transparent 52%)," +
      "radial-gradient(80% 60% at 22% 8%, rgba(120,150,220,0.14), transparent 55%)," +
      "linear-gradient(180deg, #0a0e1a 0%, #0e1327 52%, #0a0f1c 100%)",
  },
  starrySky: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(120% 80% at 78% 10%, rgba(124,58,237,0.18), transparent 55%)," +
      "linear-gradient(180deg, #070a17 0%, #0b1024 58%, #0a0f1c 100%)",
  },
  duskSky: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, #241a3a 0%, #3a2a4e 38%, #7a4f63 72%, #c9885a 100%)",
  },
  duskSun: {
    position: "absolute",
    bottom: "22%",
    left: "50%",
    transform: "translateX(-50%)",
    width: 150,
    height: 150,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,214,160,0.95), rgba(255,180,120,0.35) 45%, transparent 72%)",
    filter: "blur(1px)",
  },
  moon: {
    position: "absolute",
    top: "10%",
    right: "16%",
    width: 110,
    height: 110,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(226,232,240,0.85), rgba(226,232,240,0.12) 45%, transparent 70%)",
    filter: "blur(2px)",
  },
  skyline: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    height: "34%",
    minHeight: 160,
  },
  rain: { position: "absolute", inset: "-30%", pointerEvents: "none" },
  shoot: {
    position: "absolute",
    top: "16%",
    left: "62%",
    width: 120,
    height: 2,
    borderRadius: 2,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9))",
    pointerEvents: "none",
    opacity: 0,
  },
  firefly: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,228,150,1), rgba(255,210,120,0.5) 45%, transparent 72%)",
    boxShadow: "0 0 8px rgba(255,214,140,0.8)",
    pointerEvents: "none",
    opacity: 0,
  },
  vignette: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(120% 100% at 50% 45%, transparent 55%, rgba(2,4,10,0.5) 100%)",
  },
  vignetteWarm: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(120% 100% at 50% 40%, transparent 58%, rgba(10,6,20,0.45) 100%)",
  },
};
