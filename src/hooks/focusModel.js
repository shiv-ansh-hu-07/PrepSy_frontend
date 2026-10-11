// Pure attention model for the focus monitor: turns one frame's face signals
// into a state + score. No DOM or MediaPipe objects in here, so the rules can
// be exercised with plain numbers.
//
// The camera is almost never where the user is looking — it sits above a laptop
// screen, or on a different monitor altogether. So nothing here asks "are they
// facing the camera?". It asks "are they holding the pose they hold while
// working?":
//   • the neutral pose is learned from the user and keeps adapting, so whatever
//     they steadily look at (lower half of the screen, a side monitor) becomes
//     the centre of their "screen cone";
//   • a wide cone around that pose counts as on-screen;
//   • a pose outside the cone only counts as a distraction while it is
//     unsettled — a steady new pose is treated as a second screen and adopted.

export const FOCUS = {
  CALIB_SAMPLES: 3, // frames averaged for the first neutral pose
  CALIB_MAX_ATTEMPTS: 6, // stop waiting for open-eyed frames after this
  YAW_TURN: 0.24, // head turn (nose offset / face width) that leaves the screen cone
  GAZE_SIDE: 0.55, // sideways eye movement (signed blendshape) that leaves it
  PITCH_DOWN: 0.13, // head tilted down from neutral
  GAZE_DOWN: 0.3, // eyes lower than their usual resting height
  DEEP_DOWN: 0.24, // head far down: lap/desk rather than the lower screen
  DOWN_MAX: 12, // deep heads-down frames tolerated before the score decays
  BLINK_CLOSED: 0.6, // eyes closed / heavy droop
  CLOSED_CONFIRM: 2, // consecutive closed frames before it's drowsiness, not a blink
  STEADY_N: 3, // frames a new pose must hold to count as a second screen
  STEADY_YAW: 0.07, // max head-yaw spread across those frames
  STEADY_PITCH: 0.07,
  STEADY_GAZE: 0.25,
  ADAPT: 0.1, // how fast neutral follows the user while on-screen
  ADAPT_PITCH: 0.05, // slower: slouching shouldn't erase "heads-down"
  ADAPT_AWAY: 0.03, // barely moves while they're looking away
  ADAPT_ADOPT: 0.4, // snaps toward a steady second screen
  FOCUS_MAX: 94, // dead-centre in the cone
  FOCUS_EDGE: 80, // at the cone's edge — still on screen, still "high"
  SECOND_SCREEN: 80,
  DOWN_SCORE: 76, // reading the lower screen / writing notes / typing
  DOWN_FLOOR: 45,
  DROWSY_SCORE: 45,
};

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
const spread = (arr) => Math.max(...arr) - Math.min(...arr);

// MediaPipe FaceLandmarker result → the few numbers the model needs.
export function readSignals(result) {
  const faces = result?.faceLandmarks;
  if (!faces || !faces.length) return null;
  const lm = faces[0];
  const map = {};
  const bs = result.faceBlendshapes && result.faceBlendshapes[0];
  if (bs) for (const c of bs.categories) map[c.categoryName] = c.score;
  const g = (n) => map[n] || 0;

  // Signed horizontal gaze: both eyes move the same way when looking sideways
  // (left eye out + right eye in = looking left).
  const lookLeft = (g("eyeLookOutLeft") + g("eyeLookInRight")) / 2;
  const lookRight = (g("eyeLookInLeft") + g("eyeLookOutRight")) / 2;
  const gazeH = lookRight - lookLeft;
  const gazeDown = (g("eyeLookDownLeft") + g("eyeLookDownRight")) / 2;
  const blink = (g("eyeBlinkLeft") + g("eyeBlinkRight")) / 2;

  const nose = lm[1];
  const lf = lm[234];
  const rf = lm[454];
  const eL = lm[33];
  const eR = lm[263];
  const faceW = Math.hypot(rf.x - lf.x, rf.y - lf.y) || 0.001;
  const yaw = (nose.x - (lf.x + rf.x) / 2) / faceW;
  const pitch = (nose.y - (eL.y + eR.y) / 2) / faceW;

  return { yaw, pitch, gazeH, gazeDown, blink };
}

export function createFocusState() {
  return {
    base: { yaw: 0, pitch: 0, gazeH: 0, gazeDown: 0 },
    n: 0,
    attempts: 0,
    ready: false,
    recent: [], // last STEADY_N poses
    closedStreak: 0,
    downStreak: 0,
  };
}

function follow(base, sig, alpha, pitchAlpha = alpha) {
  base.yaw += (sig.yaw - base.yaw) * alpha;
  base.gazeH += (sig.gazeH - base.gazeH) * alpha;
  base.gazeDown += (sig.gazeDown - base.gazeDown) * alpha;
  base.pitch += (sig.pitch - base.pitch) * pitchAlpha;
}

// One frame with a face in it → { state, rawScore, drowsy }. Mutates `st`.
// States: "calibrating" | "focused" | "notetaking" | "drowsy" | "distracted".
export function assess(sig, st) {
  const F = FOCUS;
  const b = st.base;

  if (!st.ready) {
    st.attempts += 1;
    // Any open-eyed frame will do — wherever they're looking as the session
    // starts IS their screen, even if it's nowhere near the camera.
    if (sig.blink < 0.5) {
      const k = st.n + 1;
      b.yaw += (sig.yaw - b.yaw) / k;
      b.pitch += (sig.pitch - b.pitch) / k;
      b.gazeH += (sig.gazeH - b.gazeH) / k;
      b.gazeDown += (sig.gazeDown - b.gazeDown) / k;
      st.n = k;
    }
    if (st.n >= F.CALIB_SAMPLES || (st.n > 0 && st.attempts >= F.CALIB_MAX_ATTEMPTS)) st.ready = true;
    return { state: "calibrating", rawScore: 70, drowsy: false };
  }

  st.recent = [...st.recent, sig].slice(-F.STEADY_N);
  const steady =
    st.recent.length === F.STEADY_N &&
    spread(st.recent.map((s) => s.yaw)) < F.STEADY_YAW &&
    spread(st.recent.map((s) => s.pitch)) < F.STEADY_PITCH &&
    spread(st.recent.map((s) => s.gazeH)) < F.STEADY_GAZE;

  const dYaw = Math.abs(sig.yaw - b.yaw);
  const dGaze = Math.abs(sig.gazeH - b.gazeH);
  const dPitch = sig.pitch - b.pitch;
  const dDown = sig.gazeDown - b.gazeDown;

  // Outside the screen cone.
  if (dYaw > F.YAW_TURN || dGaze > F.GAZE_SIDE) {
    st.downStreak = 0;
    st.closedStreak = 0;
    if (steady) {
      // Held still on something else: a second monitor, a book on a stand.
      follow(b, sig, F.ADAPT_ADOPT, F.ADAPT_PITCH);
      return { state: "focused", rawScore: F.SECOND_SCREEN, drowsy: false };
    }
    follow(b, sig, F.ADAPT_AWAY);
    const over = Math.max((dYaw - F.YAW_TURN) * 100, (dGaze - F.GAZE_SIDE) * 40, 0);
    return { state: "distracted", rawScore: clamp(30 - over), drowsy: false };
  }

  // Looking down: the lower screen, a notebook, the keyboard.
  if (dPitch > F.PITCH_DOWN || dDown > F.GAZE_DOWN) {
    st.closedStreak = 0;
    let rawScore = F.DOWN_SCORE;
    if (dPitch > F.DEEP_DOWN) {
      // Head right down for a minute straight is more likely a phone in the lap.
      st.downStreak += 1;
      if (st.downStreak > F.DOWN_MAX) {
        rawScore = Math.max(F.DOWN_FLOOR, F.DOWN_SCORE - (st.downStreak - F.DOWN_MAX) * 4);
      }
    } else {
      st.downStreak = 0;
    }
    return { state: "notetaking", rawScore, drowsy: false };
  }
  st.downStreak = 0;

  // A single closed-eye frame is a blink; only a run of them is drowsiness.
  if (sig.blink > F.BLINK_CLOSED) {
    st.closedStreak += 1;
    if (st.closedStreak >= F.CLOSED_CONFIRM) {
      return { state: "drowsy", rawScore: F.DROWSY_SCORE, drowsy: true };
    }
  } else {
    st.closedStreak = 0;
  }

  follow(b, sig, F.ADAPT, F.ADAPT_PITCH);
  const edge = Math.min(1, Math.max(dYaw / F.YAW_TURN, dGaze / F.GAZE_SIDE));
  return {
    state: "focused",
    rawScore: clamp(F.FOCUS_MAX - (F.FOCUS_MAX - F.FOCUS_EDGE) * edge),
    drowsy: false,
  };
}

// ── Phone in frame ───────────────────────────────────────────────────────────
// The object detector is unreliable on a hand-held phone: it's small, half
// covered by fingers and often seen from the back, so its confidence is low and
// it comes and goes between frames. One threshold can't work — set it high and
// real phones are missed, set it low and a mug becomes a phone. So the weaker
// the sighting, the more supporting evidence it needs:
//   • strong sighting → a phone, immediately;
//   • medium sighting → a phone if it was also seen just before, or the user
//     isn't looking at their screen right now;
//   • faint sighting  → a phone only if it keeps showing up AND they're looking
//     down or away.
// Once confirmed it stays "phone" for as long as any trace of it is in frame.
export const PHONE = {
  DETECT_MIN: 0.2, // detector floor; anything below is never reported
  STRONG: 0.5,
  MEDIUM: 0.3,
  WINDOW: 3, // samples of history kept
};

// Categories the detector uses for a phone. Seen from the back, a phone is very
// often labelled "remote".
export function phoneConfidence(detections) {
  let best = 0;
  for (const d of detections || []) {
    for (const c of d.categories || []) {
      if (/cell phone|mobile phone|remote/i.test(c.categoryName || "") && c.score > best) best = c.score;
    }
  }
  return best;
}

export function createPhoneState() {
  return { recent: [], active: false };
}

// confidence: best phone confidence since the last sample (0 if none).
// offScreen: the pose model says they're looking down or away right now.
export function assessPhone(confidence, offScreen, st) {
  const P = PHONE;
  const prior = st.recent; // earlier samples, newest last
  const seenBefore = prior.filter((c) => c >= P.DETECT_MIN).length;
  const justSeen = prior.length > 0 && prior[prior.length - 1] >= P.DETECT_MIN;

  let phone;
  if (confidence < P.DETECT_MIN) phone = false;
  else if (st.active) phone = true;
  else if (confidence >= P.STRONG) phone = true;
  else if (confidence >= P.MEDIUM) phone = justSeen || offScreen;
  else phone = offScreen && seenBefore >= 1;

  st.recent = [...prior, confidence].slice(-P.WINDOW);
  st.active = phone;
  return phone;
}
