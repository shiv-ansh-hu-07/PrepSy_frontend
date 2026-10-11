import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { saveOnboarding } from "../services/api";
import { track } from "../services/analytics";
import { useWindowWidth } from "../hooks/useBreakpoint";

// First-run intent screen: three taps that feed the matching the rest of the
// app already runs on (profile goals / availability), then ONE concrete next
// step — a cohort or room to join — instead of a feature tour.

// Values are a subset of the Profile page's GOAL_OPTIONS so they stay editable there.
const GOALS = [
  { value: "DSA & Algorithms", icon: "⚡" },
  { value: "Placements", icon: "🎯" },
  { value: "Interview Prep", icon: "🎤" },
  { value: "Competitive Programming", icon: "🏁" },
  { value: "Web Development", icon: "🌐" },
  { value: "System Design", icon: "📐" },
  { value: "Machine Learning / AI", icon: "🤖" },
  { value: "GATE", icon: "📘" },
  { value: "CAT / MBA", icon: "📊" },
  { value: "UPSC / Civil Services", icon: "🏛️" },
];

// Each tap maps onto the Profile page's AVAILABILITY_OPTIONS.
const TIMES = [
  { key: "morning", label: "Mornings", icon: "🌅", values: ["Weekday mornings", "Weekend mornings"] },
  { key: "afternoon", label: "Afternoons", icon: "☀️", values: ["Weekday afternoons", "Weekend afternoons"] },
  { key: "evening", label: "Evenings", icon: "🌆", values: ["Weekday evenings", "Weekend evenings"] },
  { key: "night", label: "Late night", icon: "🌙", values: ["Weekday nights"] },
  { key: "flexible", label: "It varies", icon: "🔄", values: ["Flexible / Any time"] },
];

const STYLES = [
  { key: "match", icon: "🤝", title: "Match me with people", body: "Join a group that's already studying what I am." },
  { key: "friends", icon: "👯", title: "I'll bring my friends", body: "Set up our own group and invite them." },
];

const MAX_GOALS = 3;

function cohortStartLabel(c) {
  if (c.status === "forming" && c.startDate) {
    const day = new Date(c.startDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    return `Starts ${day}${c.dailyTime ? ` · ${c.dailyTime}` : ""}`;
  }
  return c.dailyTime ? `Meets daily · ${c.dailyTime}` : "In progress · join anytime";
}

export default function Welcome() {
  const { user, markTourSeen } = useAuth();
  const navigate = useNavigate();
  const isMobile = useWindowWidth() < 640;

  // Decided once on entry: finishing flips the flag while the last step is
  // still on screen, and that must not bounce the user away mid-flow.
  const [alreadyOnboarded] = useState(() => user?.hasSeenTour === true);

  const [step, setStep] = useState(0); // 0 goals · 1 times · 2 style · 3 next step
  const [goals, setGoals] = useState([]);
  const [times, setTimes] = useState([]);
  const [style, setStyle] = useState("");
  const [saving, setSaving] = useState(false);
  const [cohort, setCohort] = useState(null);
  const [room, setRoom] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (!alreadyOnboarded) track("onboarding_started");
  }, [alreadyOnboarded]);

  if (alreadyOnboarded) return <Navigate to="/dashboard" replace />;

  const firstName = (user?.name || "").trim().split(" ")[0];

  const toggleGoal = (value) =>
    setGoals((prev) =>
      prev.includes(value)
        ? prev.filter((g) => g !== value)
        : prev.length >= MAX_GOALS
          ? prev
          : [...prev, value]
    );

  const toggleTime = (key) =>
    setTimes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));

  // Persist first, then flip the local flag — otherwise a background /auth/me
  // refresh could read the old value and send the user back here.
  const persist = async (answers) => {
    try {
      await saveOnboarding(answers);
    } catch {
      /* non-blocking: markTourSeen below retries the flag on its own */
    }
    markTourSeen();
  };

  const skip = async () => {
    if (saving) return;
    setSaving(true);
    track("onboarding_completed", { skipped: true, atStep: step });
    await persist({});
    navigate("/dashboard", { replace: true });
  };

  const finish = async (chosenStyle) => {
    if (saving) return;
    setStyle(chosenStyle);
    setSaving(true);
    const availability = TIMES.filter((t) => times.includes(t.key)).flatMap((t) => t.values);
    track("onboarding_completed", {
      skipped: false,
      goals: goals.length,
      times: times.length,
      style: chosenStyle,
    });
    await persist({ goals, availability });
    setSaving(false);
    setStep(3);

    // Recommendations read the profile we just saved, so fetch them only now.
    setLoadingNext(true);
    const [cohortsRes, roomsRes] = await Promise.allSettled([
      api.get("/cohorts/recommended"),
      api.get("/rooms/recommended"),
    ]);
    if (cohortsRes.status === "fulfilled" && Array.isArray(cohortsRes.value.data)) {
      setCohort(cohortsRes.value.data[0] || null);
    }
    if (roomsRes.status === "fulfilled") {
      setRoom((roomsRes.value.data?.rooms || [])[0] || null);
    }
    setLoadingNext(false);
  };

  const joinCohort = async () => {
    if (!cohort || joining) return;
    setJoining(true);
    setJoinError("");
    try {
      await api.post(`/cohorts/${cohort.id}/join`);
      track("onboarding_next_step", { action: "cohort_joined" });
      navigate(`/cohort/${cohort.id}`, { replace: true });
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Couldn't join this cohort. Try again.");
      setJoining(false);
    }
  };

  const go = (path, action) => {
    track("onboarding_next_step", { action });
    navigate(path, { replace: true });
  };

  const s = makeStyles(isMobile);

  return (
    <div style={s.page}>
      <div style={s.card}>
        {step < 3 && (
          <div style={s.topRow}>
            <div style={s.dots}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ ...s.dot, ...(i <= step ? s.dotOn : null) }} />
              ))}
            </div>
            <button type="button" onClick={skip} disabled={saving} style={s.skip}>
              Skip
            </button>
          </div>
        )}

        {step === 0 && (
          <>
            <h1 style={s.title}>{firstName ? `Welcome, ${firstName} 👋` : "Welcome to PrepSy 👋"}</h1>
            <p style={s.sub}>What are you preparing for? Pick up to {MAX_GOALS} — we'll find people studying the same thing.</p>
            <div style={s.chips}>
              {GOALS.map((g) => {
                const on = goals.includes(g.value);
                const full = !on && goals.length >= MAX_GOALS;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGoal(g.value)}
                    aria-pressed={on}
                    disabled={full}
                    style={{ ...s.chip, ...(on ? s.chipOn : null), ...(full ? s.chipDisabled : null) }}
                  >
                    <span aria-hidden="true">{g.icon}</span> {g.value}
                  </button>
                );
              })}
            </div>
            <div style={s.actions}>
              <button type="button" onClick={() => setStep(1)} disabled={goals.length === 0} style={{ ...s.primary, ...(goals.length === 0 ? s.primaryDisabled : null) }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 style={s.title}>When do you usually study?</h1>
            <p style={s.sub}>So we can point you to sessions that happen when you're actually free.</p>
            <div style={s.chips}>
              {TIMES.map((t) => {
                const on = times.includes(t.key);
                return (
                  <button key={t.key} type="button" onClick={() => toggleTime(t.key)} aria-pressed={on} style={{ ...s.chip, ...(on ? s.chipOn : null) }}>
                    <span aria-hidden="true">{t.icon}</span> {t.label}
                  </button>
                );
              })}
            </div>
            <div style={s.actions}>
              <button type="button" onClick={() => setStep(0)} style={s.ghost}>← Back</button>
              <button type="button" onClick={() => setStep(2)} disabled={times.length === 0} style={{ ...s.primary, ...(times.length === 0 ? s.primaryDisabled : null) }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={s.title}>How do you want to study?</h1>
            <p style={s.sub}>PrepSy works best with other people in the room. Which sounds like you?</p>
            <div style={s.options}>
              {STYLES.map((o) => (
                <button key={o.key} type="button" onClick={() => finish(o.key)} disabled={saving} style={s.option}>
                  <span style={s.optionIcon} aria-hidden="true">{o.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={s.optionTitle}>{o.title}</span>
                    <span style={s.optionBody}>{o.body}</span>
                  </span>
                </button>
              ))}
            </div>
            <div style={s.actions}>
              <button type="button" onClick={() => setStep(1)} disabled={saving} style={s.ghost}>← Back</button>
              {saving && <span style={s.hint}>Saving…</span>}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={s.title}>{style === "friends" ? "Start your group" : "Your first step"}</h1>
            <p style={s.sub}>
              {style === "friends"
                ? "Turn any YouTube playlist into a daily cohort, then share the invite link with your friends."
                : "The fastest way to get going is to join people who are already studying."}
            </p>

            {style === "friends" && (
              <div style={s.nextCard}>
                <p style={s.nextLabel}>Recommended</p>
                <p style={s.nextName}>Create a cohort from a playlist</p>
                <p style={s.nextMeta}>Pick a playlist → set a daily time → invite your friends with one link.</p>
                <button type="button" onClick={() => go("/learn", "create_cohort")} style={s.primaryWide}>
                  Start a cohort →
                </button>
              </div>
            )}

            {loadingNext ? (
              <p style={s.hint}>Finding people studying the same thing…</p>
            ) : cohort ? (
              <div style={s.nextCard}>
                <p style={s.nextLabel}>{style === "friends" ? "Or join an existing cohort" : cohort.reason || "Recommended cohort"}</p>
                <p style={s.nextName}>{cohort.name}</p>
                <p style={s.nextMeta}>
                  {cohort.memberCount} {cohort.memberCount === 1 ? "member" : "members"} · {cohortStartLabel(cohort)}
                </p>
                {joinError && <p style={s.error}>{joinError}</p>}
                <div style={s.nextActions}>
                  <button type="button" onClick={joinCohort} disabled={joining} style={style === "friends" ? s.ghostWide : s.primaryWide}>
                    {joining ? "Joining…" : "Join this cohort →"}
                  </button>
                  <button type="button" onClick={() => go("/cohorts", "browse_cohorts")} style={s.linkBtn}>
                    See other cohorts
                  </button>
                </div>
              </div>
            ) : style !== "friends" ? (
              <div style={s.nextCard}>
                <p style={s.nextLabel}>No open cohort matches yet</p>
                <p style={s.nextName}>Be the one who starts it</p>
                <p style={s.nextMeta}>Turn a YouTube playlist into a daily cohort — others with your goals will see it.</p>
                <button type="button" onClick={() => go("/learn", "create_cohort")} style={s.primaryWide}>
                  Start a cohort →
                </button>
              </div>
            ) : null}

            {!loadingNext && room && (
              <button type="button" onClick={() => go(`/rooms/${room.roomId}`, "view_room")} style={s.roomRow}>
                <span style={{ minWidth: 0 }}>
                  <span style={s.roomName}>{room.name}</span>
                  <span style={s.roomMeta}>
                    {room.activeUsers > 0 ? `● Live now · ${room.activeUsers} studying` : "Study room that fits your goals"}
                  </span>
                </span>
                <span style={s.roomArrow} aria-hidden="true">→</span>
              </button>
            )}

            <div style={{ ...s.actions, justifyContent: "center" }}>
              <button type="button" onClick={() => go("/dashboard", "dashboard")} style={s.linkBtn}>
                Take me to my dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function makeStyles(isMobile) {
  const primary = {
    padding: "12px 22px", borderRadius: 999, border: "none", background: "var(--accent-gradient)",
    color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
    boxShadow: "0 8px 22px rgba(124,58,237,0.28)",
  };
  const ghost = {
    padding: "12px 18px", borderRadius: 999, border: "1px solid var(--card-border)",
    background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14, cursor: "pointer",
  };
  return {
    page: {
      minHeight: "calc(100vh - 76px)", background: "var(--page-bg)", display: "flex",
      alignItems: isMobile ? "flex-start" : "center", justifyContent: "center",
      padding: isMobile ? "20px 16px 40px" : "32px 24px 56px",
      fontFamily: "'Inter', system-ui, sans-serif",
    },
    card: {
      width: "100%", maxWidth: 560, background: "var(--card-bg)", border: "1px solid var(--card-border)",
      borderRadius: 24, padding: isMobile ? "22px 18px" : "32px 32px 28px",
      boxShadow: "0 18px 44px rgba(74,90,133,0.12)",
    },
    topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
    dots: { display: "flex", gap: 6 },
    dot: { width: 28, height: 4, borderRadius: 999, background: "var(--card-border)" },
    dotOn: { background: "var(--accent)" },
    skip: { border: "none", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 4px" },
    title: { margin: "0 0 8px", fontFamily: "Georgia, serif", fontSize: isMobile ? 24 : 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 },
    sub: { margin: "0 0 22px", fontSize: 14.5, lineHeight: 1.55, color: "var(--text-secondary)" },
    chips: { display: "flex", flexWrap: "wrap", gap: 10 },
    chip: {
      display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px", borderRadius: 999,
      border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-primary)",
      fontSize: 13.5, fontWeight: 600, cursor: "pointer",
    },
    chipOn: { border: "1px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent)" },
    chipDisabled: { opacity: 0.45, cursor: "not-allowed" },
    options: { display: "grid", gap: 12 },
    option: {
      display: "flex", alignItems: "center", gap: 14, textAlign: "left", width: "100%", padding: "16px 16px",
      borderRadius: 16, border: "1px solid var(--card-border)", background: "transparent", cursor: "pointer",
    },
    optionIcon: { fontSize: 26, flexShrink: 0 },
    optionTitle: { display: "block", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 },
    optionBody: { display: "block", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 },
    actions: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 26, flexWrap: "wrap" },
    primary,
    primaryDisabled: { opacity: 0.45, cursor: "not-allowed", boxShadow: "none" },
    primaryWide: { ...primary, width: isMobile ? "100%" : "auto" },
    ghost,
    ghostWide: { ...ghost, width: isMobile ? "100%" : "auto" },
    linkBtn: { border: "none", background: "transparent", color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: "8px 6px", textDecoration: "underline" },
    hint: { fontSize: 13, color: "var(--text-muted)", margin: "4px 0" },
    error: { margin: "0 0 10px", fontSize: 13, color: "#dc2626" },
    nextCard: { border: "1px solid var(--card-border)", background: "var(--accent-soft)", borderRadius: 18, padding: "18px 18px 16px", marginBottom: 12 },
    nextLabel: { margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)" },
    nextName: { margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3, overflowWrap: "anywhere" },
    nextMeta: { margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 },
    nextActions: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
    roomRow: {
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left",
      padding: "14px 16px", borderRadius: 16, border: "1px solid var(--card-border)", background: "transparent", cursor: "pointer",
    },
    roomName: { display: "block", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflowWrap: "anywhere" },
    roomMeta: { display: "block", fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 },
    roomArrow: { color: "var(--accent)", fontWeight: 700, flexShrink: 0 },
  };
}
