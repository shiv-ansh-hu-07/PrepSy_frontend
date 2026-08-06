import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { fetchMyProfile } from "../services/api";
import AppSideNav from "../components/AppSideNav";
import { Search, ChevronDown, ChevronUp, Users } from "lucide-react";

const PAGE_BG = "var(--page-bg)";

const DIFF = {
  beginner: { bg: "#e8f5e9", color: "#2e7d32", label: "Beginner" },
  intermediate: { bg: "#fff3e0", color: "#e65100", label: "Intermediate" },
  advanced: { bg: "#fce4ec", color: "#c62828", label: "Advanced" },
};

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

const LOADING_STEPS = [
  "Fetching playlist from YouTube…",
  "Extracting video metadata…",
  "Running AI curriculum analysis…",
  "Building week-by-week roadmap…",
  "Finishing up — almost there…",
];

export default function LearnPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isMobile = w < 600;
  const isTablet = w < 900;

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepMsg, setStepMsg] = useState("");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);

  const [cohortName, setCohortName] = useState("");
  const [cohortMaxSize, setCohortMaxSize] = useState(10);
  const [creatingCohort, setCreatingCohort] = useState(false);
  const [cohortError, setCohortError] = useState(null);
  const [startMode, setStartMode] = useState("NOW");
  const [cohortStart, setCohortStart] = useState("");

  // --- study schedule ---
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [days, setDays] = useState(30);
  const [hoursFromProfile, setHoursFromProfile] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [schedule, setSchedule] = useState(null);

  // Prefill hours/day from the user's profile daily study goal (stored as minutes).
  useEffect(() => {
    let active = true;
    fetchMyProfile()
      .then((p) => {
        if (!active) return;
        const mins = p?.dailyStudyGoalMinutes || 0;
        if (mins > 0) {
          setHoursPerDay(Math.round((mins / 60) * 10) / 10);
          setHoursFromProfile(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSchedule(null);
    setScheduleError(null);
    setStepMsg(LOADING_STEPS[0]);

    let stepIdx = 0;
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, LOADING_STEPS.length - 1);
      setStepMsg(LOADING_STEPS[stepIdx]);
    }, 10000);

    try {
      const { data } = await api.post("/playlists/analyze", { url: trimmed });
      setResult(data);
      if (data.title) setCohortName(`${data.title} Study Group`);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Analysis failed. Make sure the playlist is public and try again.",
      );
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  };

  const handleCreateCohort = async () => {
    if (!cohortName.trim() || !result) return;
    setCreatingCohort(true);
    setCohortError(null);
    try {
      const sessions = (schedule?.days || []).map((d) => ({
        topic: d.videos?.[0]?.title ? `Day ${d.day}: ${d.videos[0].title}` : `Day ${d.day}`,
        description: (d.videos || []).map((v) => v.title).join(" • "),
        studyHours: d.studyHours,
      }));
      const payload = {
        playlistId: result.id,
        name: cohortName.trim(),
        maxSize: cohortMaxSize,
        startMode,
        sessions,
      };
      if (startMode === "SCHEDULED" && cohortStart) {
        const dt = new Date(cohortStart);
        payload.startDate = dt.toISOString();
        payload.dailyTime = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      }
      const { data } = await api.post("/cohorts", payload);
      navigate(`/cohort/${data.id}`);
    } catch (err) {
      setCohortError(err?.response?.data?.message || "Failed to create cohort");
    } finally {
      setCreatingCohort(false);
    }
  };

  const handleSchedule = async () => {
    if (!result?.id) return;
    setScheduling(true);
    setScheduleError(null);
    setSchedule(null);
    try {
      const { data } = await api.post(`/playlists/${result.id}/schedule`, {
        hoursPerDay: Number(hoursPerDay),
        days: Number(days),
      });
      setSchedule(data);
    } catch (err) {
      setScheduleError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Couldn't generate a schedule. Please try again.",
      );
    } finally {
      setScheduling(false);
    }
  };

  const plan = result?.plan;
  const diffStyle = DIFF[plan?.difficulty] || DIFF.intermediate;
  const curriculum = plan?.curriculum || [];
  const roadmap = plan?.roadmap || [];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 76px)",
        background: PAGE_BG,
        padding: isMobile ? "20px 16px 48px" : isTablet ? "24px 20px 48px" : "32px 24px 56px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1360,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isTablet ? "1fr" : "288px minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {!isTablet && <AppSideNav />}

        <main style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? 22 : 28,
                fontFamily: "Georgia, serif",
                color: "var(--text-primary)",
              }}
            >
              AI-Powered Learning
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
              Paste a YouTube playlist — get an AI-generated curriculum, roadmap, and study cohort.
            </p>
          </div>

          {/* URL Input */}
          <div style={card}>
            <form
              onSubmit={handleAnalyze}
              style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12 }}
            >
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=PL…"
                  style={inputStyle}
                />
                <Search
                  size={18}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--accent)", pointerEvents: "none" }}
                />
              </div>
              <button type="submit" disabled={loading || !url.trim()} style={btnPrimary(loading || !url.trim())}>
                {loading ? "Analyzing…" : "Analyze Playlist"}
              </button>
            </form>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ ...card, textAlign: "center", padding: "44px 24px" }}>
              <div style={{ fontSize: 42, marginBottom: 18 }}>🤖</div>
              <p style={{ margin: 0, fontWeight: 800, color: "var(--text-primary)", fontSize: 17 }}>
                Running AI analysis
              </p>
              <p style={{ margin: "10px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>{stepMsg}</p>
              <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 12 }}>
                This usually takes 30–60 seconds
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                ...card,
                background: "#fff5f5",
                border: "1px solid #fecaca",
                padding: "16px 20px",
              }}
            >
              <p style={{ margin: 0, color: "#c62828", fontSize: 14 }}>{error}</p>
            </div>
          )}

          {/* Results */}
          {result && plan && (
            <>
              {/* Header */}
              <div style={{ ...card, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                {result.thumbnailUrl && (
                  <img
                    src={result.thumbnailUrl}
                    alt=""
                    style={{ width: 120, height: 68, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                    {result.title}
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                    {result.channelTitle} · {result.videoCount} videos
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <Chip bg={diffStyle.bg} color={diffStyle.color}>
                      {diffStyle.label}
                    </Chip>
                    <Chip bg="var(--accent-soft)" color="#4f5fa8">
                      ⏱ ~{plan.estimatedHours}h total
                    </Chip>
                    <Chip bg="#f3e8ff" color="#6d28d9">
                      📚 {curriculum.length} topics
                    </Chip>
                    <Chip bg="#e8f5e9" color="#2e7d32">
                      🗓 {roadmap.length}-week plan
                    </Chip>
                  </div>
                </div>
              </div>

              {/* Curriculum */}
              <div style={card}>
                <h3 style={sectionTitle}>📋 Curriculum</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {curriculum.map((topic, i) => (
                    <div
                      key={i}
                      style={{
                        borderRadius: 14,
                        border: "1px solid var(--card-border)",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedTopic(expandedTopic === i ? null : i)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          background:
                            expandedTopic === i
                              ? "rgba(138,155,214,0.1)"
                              : "rgba(248,249,255,0.8)",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: "var(--accent)",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                          {topic.title}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--accent)", flexShrink: 0 }}>
                          {(topic.videoPositions || []).length} videos
                        </span>
                        {expandedTopic === i ? (
                          <ChevronUp size={16} color="var(--accent)" />
                        ) : (
                          <ChevronDown size={16} color="var(--accent)" />
                        )}
                      </button>
                      {expandedTopic === i && (
                        <div
                          style={{
                            padding: "12px 16px 14px 54px",
                            borderTop: "1px solid var(--card-border)",
                            background: "rgba(248,249,255,0.5)",
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                            {topic.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Roadmap */}
              <div style={card}>
                <h3 style={sectionTitle}>🗓 Study Roadmap</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {roadmap.map((week, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--accent), #6f7fc0)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          W{week.week}
                        </div>
                        {i < roadmap.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              width: 2,
                              background: "rgba(138,155,214,0.25)",
                              marginTop: 4,
                              minHeight: 24,
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                          {week.theme}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 8px",
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            lineHeight: 1.55,
                          }}
                        >
                          {week.goal}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(week.topics || []).map((t, j) => (
                            <Chip key={j} bg="rgba(138,155,214,0.12)" color="#4f5fa8">
                              {t}
                            </Chip>
                          ))}
                          <Chip bg="rgba(34,197,94,0.12)" color="#166534">
                            ⏱ {week.studyHours}h
                          </Chip>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personalized Study Schedule */}
              <div style={card}>
                <h3 style={sectionTitle}>📆 Your Study Schedule</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>
                  Tell us your pace and deadline — we'll fit this playlist into a day-by-day plan, and be honest if it doesn't fit.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    gap: 12,
                    alignItems: isMobile ? "stretch" : "flex-end",
                  }}
                >
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#4f5fa8", width: isMobile ? "100%" : 150 }}>
                    Hours / day
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={hoursPerDay}
                      onChange={(e) => {
                        setHoursPerDay(e.target.value);
                        setHoursFromProfile(false);
                      }}
                      style={{ ...inputStyle, padding: "0 14px" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#4f5fa8", width: isMobile ? "100%" : 150 }}>
                    Days available
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      style={{ ...inputStyle, padding: "0 14px" }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={scheduling || !hoursPerDay || !days}
                    style={btnPrimary(scheduling || !hoursPerDay || !days)}
                  >
                    {scheduling ? "Building…" : "Generate Schedule"}
                  </button>
                </div>

                {hoursFromProfile ? (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#2e7d32" }}>
                    ✓ Hours/day prefilled from your profile's daily study goal.
                  </p>
                ) : (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#e65100" }}>
                    Tip: set a daily study goal in your{" "}
                    <span onClick={() => navigate("/profile")} style={{ textDecoration: "underline", cursor: "pointer" }}>
                      profile
                    </span>{" "}
                    to prefill this.
                  </p>
                )}

                {scheduleError && (
                  <p style={{ margin: "10px 0 0", color: "#c62828", fontSize: 13 }}>{scheduleError}</p>
                )}

                {schedule && (
                  <div style={{ marginTop: 18 }}>
                    <div
                      style={{
                        borderRadius: 14,
                        padding: "14px 16px",
                        background: schedule.feasible ? "#e8f5e9" : "#fff3e0",
                        border: `1px solid ${schedule.feasible ? "#a5d6a7" : "#ffcc80"}`,
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: schedule.feasible ? "#2e7d32" : "#e65100" }}>
                        {schedule.feasible
                          ? `✓ It fits — ${schedule.summary.requiredHours}h of study across ${schedule.requiredDays} day${schedule.requiredDays === 1 ? "" : "s"}.`
                          : `⚠ Doesn't fit as-is — you're ${schedule.summary.gapHours}h over your ${schedule.summary.budgetHours}h budget.`}
                      </p>
                      {!schedule.feasible && schedule.options && (
                        <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, color: "#8a5a00", lineHeight: 1.7 }}>
                          <li>Study ~{schedule.options.neededHoursPerDay}h/day to finish in {schedule.requestedDays} days, or</li>
                          <li>Keep your pace but take {schedule.options.neededDays} days, or</li>
                          <li>Watch at 1.5× → {schedule.options.requiredHoursAt1_5x}h (2× → {schedule.options.requiredHoursAt2x}h)</li>
                          {schedule.dropped?.length > 0 && (
                            <li>Skip the {schedule.dropped.length} optional video{schedule.dropped.length === 1 ? "" : "s"} below</li>
                          )}
                        </ul>
                      )}
                    </div>

                    {schedule.dropped?.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          Skipped · {schedule.dropped.length} optional
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {schedule.dropped.map((v, i) => (
                            <div key={i} style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                              • {v.title}{" "}
                              <span style={{ color: "var(--text-muted)" }}>
                                ({v.durationMin}m — {v.reason || "optional"})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 16 }}>
                      <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        Day-by-day plan
                        {schedule.requiredDays > schedule.requestedDays
                          ? ` · needs ${schedule.requiredDays} days (${schedule.requiredDays - schedule.requestedDays} over your ${schedule.requestedDays})`
                          : ""}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 440, overflowY: "auto", paddingRight: 4 }}>
                        {schedule.days.map((d) => (
                          <div
                            key={d.day}
                            style={{
                              borderRadius: 12,
                              border: "1px solid var(--card-border)",
                              background: "rgba(248,249,255,0.7)",
                              padding: "10px 14px",
                            }}
                          >
                            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#4f5fa8" }}>
                              Day {d.day} · ~{d.studyHours}h
                            </p>
                            {d.videos.map((v, j) => (
                              <div key={j} style={{ fontSize: 12.5, color: "var(--text-secondary)", padding: "2px 0" }}>
                                • {v.title} <span style={{ color: "var(--text-muted)" }}>({v.durationMin}m)</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Create Cohort CTA */}
              <div
                style={{
                  ...card,
                  background:
                    "linear-gradient(135deg, rgba(138,155,214,0.14), rgba(111,127,192,0.07))",
                }}
              >
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={16} color="var(--accent)" /> Create a Study Cohort
                </h3>
                <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-secondary)" }}>
                  Invite friends to study this playlist together — synced study rooms, group discussions, and quizzes.
                </p>
                <div
                  style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12 }}
                >
                  <input
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    placeholder="Cohort name"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <select
                    value={cohortMaxSize}
                    onChange={(e) => setCohortMaxSize(Number(e.target.value))}
                    style={{ height: 46, borderRadius: 12, border: "1.5px solid rgba(138,155,214,0.4)", background: "var(--card-bg)", padding: "0 14px", fontSize: 14, color: "var(--text-primary)", outline: "none" }}
                  >
                    {[5, 10, 15, 20, 30].map((n) => (
                      <option key={n} value={n}>
                        {n} members max
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateCohort}
                    disabled={creatingCohort || !cohortName.trim() || !user || (startMode === "SCHEDULED" && !cohortStart)}
                    style={btnPrimary(creatingCohort || !cohortName.trim() || !user || (startMode === "SCHEDULED" && !cohortStart))}
                    title={!user ? "Sign in to create a cohort" : ""}
                  >
                    {creatingCohort ? "Creating…" : "Create Cohort →"}
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#4f5fa8" }}>Start:</span>
                  {["NOW", "SCHEDULED"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStartMode(mode)}
                      style={{
                        padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: `1.5px solid ${startMode === mode ? "var(--accent)" : "rgba(138,155,214,0.4)"}`,
                        background: startMode === mode ? "rgba(138,155,214,0.16)" : "#fff",
                        color: startMode === mode ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      {mode === "NOW" ? "Start now" : "Schedule for later"}
                    </button>
                  ))}
                  {startMode === "SCHEDULED" && (
                    <input
                      type="datetime-local"
                      value={cohortStart}
                      onChange={(e) => setCohortStart(e.target.value)}
                      style={{ height: 42, borderRadius: 10, border: "1.5px solid rgba(138,155,214,0.4)", background: "var(--card-bg)", padding: "0 12px", fontSize: 13, color: "var(--text-primary)", outline: "none" }}
                    />
                  )}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: schedule?.days?.length ? "var(--text-secondary)" : "var(--text-muted)" }}>
                  {schedule?.days?.length
                    ? `${schedule.days.length} daily sessions will be created from your schedule; members join the same room each day.`
                    : "Tip: generate a schedule above to auto-create daily sessions for this cohort."}
                </p>
                {cohortError && (
                  <p style={{ margin: "8px 0 0", color: "#c62828", fontSize: 12 }}>{cohortError}</p>
                )}
                {!user && (
                  <p style={{ margin: "8px 0 0", color: "#e65100", fontSize: 12 }}>
                    Sign in to create and join cohorts.
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Chip({ bg, color, children }) {
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {children}
    </span>
  );
}

const card = {
  borderRadius: 20,
  border: "1px solid var(--card-border)",
  background: "var(--card-bg)",
  boxShadow: "var(--card-shadow)",
  backdropFilter: "blur(10px)",
  padding: "22px 22px",
  marginBottom: 20,
};

const sectionTitle = {
  margin: "0 0 16px",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--text-primary)",
};

const inputStyle = {
  height: 46,
  width: "100%",
  borderRadius: 12,
  border: "1.5px solid rgba(138,155,214,0.4)",
  background: "var(--input-bg)",
  padding: "0 44px 0 14px",
  fontSize: 14,
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary = (disabled) => ({
  height: 46,
  padding: "0 24px",
  borderRadius: 12,
  border: "none",
  background: disabled ? "#c5cde8" : "var(--accent)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
});
