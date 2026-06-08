import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Lock,
  RefreshCw,
  Target,
  Trophy,
  Users,
  Brain,
} from "lucide-react";
import AppSideNav from "../components/AppSideNav";
import { fetchMyAnalytics, fetchFocusSummary } from "../services/api";

const analyticsTabs = [
  { id: "activity", label: "Activity" },
  { id: "topics", label: "Topics" },
  { id: "sessions", label: "Sessions" },
  { id: "focus", label: "Focus" },
  { id: "achievements", label: "Achievements" },
];

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [focusData, setFocusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState("activity");
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1060 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsNarrow(window.innerWidth < 1060);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setError("");
    try {
      const [res, focus] = await Promise.allSettled([
        fetchMyAnalytics(),
        fetchFocusSummary(),
      ]);
      if (res.status === "fulfilled") setAnalytics(res.value.analytics);
      else {
        setAnalytics(null);
        setError(res.reason?.response?.data?.message || "Unable to load analytics.");
      }
      if (focus.status === "fulfilled") setFocusData(focus.value);
    } catch (err) {
      setAnalytics(null);
      setError(err?.response?.data?.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const summary = analytics?.summary || {};
  const weeklyTotal = useMemo(
    () =>
      (analytics?.weeklyFocus || []).reduce(
        (total, entry) => total + (entry.minutes || 0),
        0
      ),
    [analytics]
  );
  const activeTabIndex = Math.max(
    0,
    analyticsTabs.findIndex((tab) => tab.id === activeAnalyticsTab)
  );

  const trendLabel = (t) =>
    t === "improving" ? "↑ Improving" : t === "declining" ? "↓ Declining" : t === "stable" ? "→ Stable" : "—";

  return (
    <div style={styles.page}>
      <style>{analyticsTransitionStyles}</style>
      <div style={styles.layout(isNarrow)}>
        <AppSideNav />

        <main style={styles.main}>
          <header style={styles.header}>
            <div>
              <p style={styles.eyebrow}>PrepSy Analytics</p>
              <h1 style={styles.title}>Your Analytics</h1>
              <p style={styles.subtitle}>
                Real progress from your PrepSy rooms, sessions, topics, and study time.
              </p>
            </div>

            <button type="button" onClick={loadAnalytics} style={styles.refreshButton}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </header>

          {loading ? (
            <Panel>
              <p style={styles.stateText}>Loading your real study analytics...</p>
            </Panel>
          ) : error ? (
            <Panel>
              <p style={{ ...styles.stateText, color: "#b44b3c" }}>{error}</p>
            </Panel>
          ) : (
            <>
              <section style={styles.statGrid}>
                <StatCard
                  icon={Flame}
                  label="Current Streak"
                  value={`${summary.currentStreakDays || 0} day${
                    summary.currentStreakDays === 1 ? "" : "s"
                  }`}
                  detail={`Best streak: ${summary.bestStreakDays || 0} days`}
                  accent="#8a9bd6"
                />
                <StatCard
                  icon={Clock3}
                  label="Total Focus Time"
                  value={summary.totalFocusLabel || "0m"}
                  detail={
                    summary.liveFocusMinutes > 0
                      ? `${summary.liveFocusLabel} live right now`
                      : `${summary.completedStudyDays || 0} completed study days`
                  }
                  accent="#6f7fc0"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Sessions Completed"
                  value={summary.sessionsCompleted || 0}
                  detail={`${summary.sessionsJoined || 0} classes joined`}
                  accent="#5f78c8"
                />
                <StatCard
                  icon={Target}
                  label="Study Consistency"
                  value={`${summary.consistencyScore || 0}%`}
                  detail={`${summary.studiedDaysThisWeek || 0} of 7 days this week`}
                  accent="#58a978"
                />
                <StatCard
                  icon={Brain}
                  label="Avg Focus Score"
                  value={focusData?.totalAnalyzedSessions > 0
                    ? `${focusData.avgFocusScore}/100`
                    : "—"}
                  detail={focusData?.totalAnalyzedSessions > 0
                    ? `${focusData.totalAnalyzedSessions} sessions · ${trendLabel(focusData.trend)}`
                    : "Enable camera to start tracking"}
                  accent="#7c3aed"
                />
              </section>

              <section style={styles.analyticsTabsShell}>
                <div style={styles.tabRail(analyticsTabs.length)} role="tablist" aria-label="Analytics sections">
                  <span style={styles.tabIndicator(activeTabIndex, analyticsTabs.length)} />
                  {analyticsTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeAnalyticsTab === tab.id}
                      onClick={() => setActiveAnalyticsTab(tab.id)}
                      style={styles.tabButton(activeAnalyticsTab === tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div key={activeAnalyticsTab} style={styles.analyticsTabPanel}>
                  {activeAnalyticsTab === "activity" ? (
                    <div style={styles.twoColGrid(isNarrow)}>
                      <Heatmap analytics={analytics} />
                      <WeeklyFocusChart entries={analytics.weeklyFocus || []} total={weeklyTotal} />
                    </div>
                  ) : null}

                  {activeAnalyticsTab === "topics" ? (
                    <div style={styles.twoColGrid(isNarrow)}>
                      <TopicsStudied topics={analytics.topics || []} />
                      <MostActiveRooms rooms={analytics.rooms || []} />
                    </div>
                  ) : null}

                  {activeAnalyticsTab === "sessions" ? (
                    <div style={styles.singleColGrid}>
                      <ClassHistory classes={analytics.classes || []} />
                    </div>
                  ) : null}

                  {activeAnalyticsTab === "focus" ? (
                    <div style={styles.twoColGrid(isNarrow)}>
                      <FocusOverviewPanel focusData={focusData} />
                      <FocusSessionList sessions={focusData?.recentSessions || []} />
                    </div>
                  ) : null}

                  {activeAnalyticsTab === "achievements" ? (
                    <div style={styles.achievementsTabGrid(isNarrow)}>
                      <Achievements achievements={analytics.achievements || []} />
                      <ConsistencyCard summary={summary} />
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Panel({ children, style }) {
  return <section style={{ ...styles.panel, ...style }}>{children}</section>;
}

function StatCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${accent}1f`, color: accent }}>
        <Icon size={20} />
      </div>
      <div style={styles.statText}>
        <p style={styles.statLabel}>{label}</p>
        <p style={styles.statValue}>{value}</p>
        <p style={styles.statDetail}>{detail}</p>
      </div>
    </article>
  );
}

function Heatmap({ analytics }) {
  const days = analytics?.heatmap?.days || [];
  const maxMinutes = Math.max(0, ...days.map((day) => day.minutes || 0));
  const cells = buildMonthCells(days);
  const monthLabel = days[0]?.date
    ? formatDateKey(days[0].date, { month: "long", year: "numeric" })
    : "This month";

  return (
    <Panel>
      <SectionHeader icon={CalendarDays} title="Study Heatmap" meta={monthLabel} />

      <div style={styles.weekdayRow}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div style={styles.heatGrid}>
        {cells.map((cell, index) =>
          cell ? (
            <div
              key={cell.date}
              title={`${formatDateKey(cell.date, {
                month: "short",
                day: "numeric",
              })}: ${formatMinutes(cell.minutes)}`}
              style={{
                ...styles.heatCell,
                background: heatColor(cell.minutes, maxMinutes),
                color:
                  cell.minutes > 0 && getHeatLevel(cell.minutes, maxMinutes) >= 4
                    ? "#ffffff"
                    : "#4a5a85",
              }}
            >
              {Number(cell.date.slice(-2))}
            </div>
          ) : (
            <div key={`empty-${index}`} style={styles.emptyHeatCell} />
          )
        )}
      </div>

      <div style={styles.legend}>
        <span>Less</span>
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            style={{
              ...styles.legendSwatch,
              background: level === 0 ? "#eef2ff" : heatPalette[level],
            }}
          />
        ))}
        <span>More</span>
      </div>
    </Panel>
  );
}

function WeeklyFocusChart({ entries, total }) {
  const maxMinutes = Math.max(0, ...entries.map((entry) => entry.minutes || 0));

  return (
    <Panel>
      <SectionHeader
        icon={BarChart3}
        title="Weekly Focus Time"
        meta={`Total ${formatMinutes(total)}`}
      />

      <div style={styles.chartWrap}>
        {entries.map((entry) => {
          const height = maxMinutes > 0 ? Math.max(6, (entry.minutes / maxMinutes) * 140) : 0;
          return (
            <div key={entry.date} style={styles.chartColumn}>
              <span style={styles.chartValue}>
                {entry.minutes > 0 ? formatMinutes(entry.minutes) : ""}
              </span>
              <div style={styles.chartTrack}>
                <div style={{ ...styles.chartBar, height }} />
              </div>
              <span style={styles.chartLabel}>
                {formatDateKey(entry.date, { weekday: "short" })}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function MostActiveRooms({ rooms }) {
  const visibleRooms = rooms.slice(0, 5);
  const maxMinutes = Math.max(0, ...visibleRooms.map((room) => room.minutes || 0));

  return (
    <Panel>
      <SectionHeader icon={Users} title="Most Active Rooms" />
      {visibleRooms.length === 0 ? (
        <EmptyState text="No completed room time recorded yet." />
      ) : (
        <div style={styles.stack}>
          {visibleRooms.map((room) => (
            <div key={room.roomId} style={styles.roomRow}>
              <div style={styles.roomTopline}>
                <span style={styles.rowTitle}>{room.name}</span>
                <span style={styles.rowMeta}>{room.totalTimeLabel}</span>
              </div>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${maxMinutes > 0 ? (room.minutes / maxMinutes) * 100 : 0}%`,
                  }}
                />
              </div>
              <p style={styles.smallMuted}>
                {room.completedSessions} completed of {room.sessions} joined
                {room.liveMinutes > 0 ? `, ${formatMinutes(room.liveMinutes)} live` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ConsistencyCard({ summary }) {
  const score = Math.max(0, Math.min(100, summary.consistencyScore || 0));

  return (
    <Panel>
      <SectionHeader icon={Target} title="Study Consistency" />
      <div style={styles.consistencyWrap}>
        <div
          style={{
            ...styles.donut,
            background: `conic-gradient(#58a978 ${score * 3.6}deg, #e8edf9 0deg)`,
          }}
        >
          <div style={styles.donutInner}>
            <strong style={styles.donutScore}>{score}%</strong>
            <span style={styles.donutLabel}>Consistency</span>
          </div>
        </div>
        <div style={styles.consistencyText}>
          <p style={styles.bigSentence}>
            You studied on{" "}
            <strong style={{ fontWeight: 600 }}>
              {summary.studiedDaysThisWeek || 0} of 7 days
            </strong>{" "}
            this week.
          </p>
          <p style={styles.panelCopy}>
            Current streak: {summary.currentStreakDays || 0} day
            {summary.currentStreakDays === 1 ? "" : "s"}. All-time completed study
            days: {summary.completedStudyDays || 0}.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function Achievements({ achievements }) {
  return (
    <Panel>
      <SectionHeader icon={Trophy} title="Achievements" />
      <div style={styles.achievementGrid}>
        {achievements.map((achievement) => {
          const Icon = achievement.achieved ? Award : Lock;
          const progress = Math.min(
            100,
            ((achievement.progress || 0) / achievement.target) * 100
          );

          return (
            <article key={achievement.id} style={styles.achievement(achievement.achieved)}>
              <div style={styles.achievementBadge(achievement.achieved)}>
                <Icon size={20} />
              </div>
              <h3 style={styles.achievementTitle}>{achievement.title}</h3>
              <p style={styles.achievementCopy}>{achievement.description}</p>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progress}%`,
                    background: achievement.achieved ? "#58a978" : "#8a9bd6",
                  }}
                />
              </div>
              <p style={styles.smallMuted}>
                {achievement.progress} / {achievement.target}
              </p>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function TopicsStudied({ topics }) {
  const maxMinutes = Math.max(0, ...topics.map((topic) => topic.minutes || 0));

  return (
    <Panel>
      <SectionHeader
        icon={BookOpenCheck}
        title="Topics Studied"
        meta={`${topics.length} topics`}
      />
      {topics.length === 0 ? (
        <EmptyState text="No room tags recorded from your sessions yet." />
      ) : (
        <div style={styles.topicList}>
          {topics.map((topic) => (
            <div key={topic.name} style={styles.topicRow}>
              <div style={styles.roomTopline}>
                <span style={styles.topicName}>#{topic.name}</span>
                <span style={styles.rowMeta}>{topic.totalTimeLabel}</span>
              </div>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${maxMinutes > 0 ? (topic.minutes / maxMinutes) * 100 : 0}%`,
                  }}
                />
              </div>
              <p style={styles.smallMuted}>{topic.completedSessions} completed sessions</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ClassHistory({ classes }) {
  return (
    <Panel>
      <SectionHeader
        icon={CalendarDays}
        title="Session History"
        meta={`${classes.length} total`}
      />
      {classes.length === 0 ? (
        <EmptyState text="Your joined class history will appear after you enter a room." />
      ) : (
        <div style={styles.classList}>
          {classes.map((session) => (
            <article key={session.id} style={styles.classRow}>
              <div style={styles.classInfo}>
                <p style={styles.rowTitle}>{session.roomName}</p>
                <p style={styles.smallMuted}>{formatDateTime(session.joinedAt)}</p>
                <div style={styles.tags}>
                  {(session.tags || []).map((tag) => (
                    <span key={`${session.id}-${tag}`} style={styles.tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div style={styles.classMeta}>
                <strong style={{ fontWeight: 600, fontSize: 13 }}>
                  {formatMinutes(
                    session.completed ? session.minutes : session.liveMinutes || 0
                  )}
                </strong>
                <span>{session.completed ? "Completed" : "In progress"}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SectionHeader({ icon: Icon, title, meta }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={styles.sectionTitleWrap}>
        <Icon size={16} />
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>
      {meta ? <span style={styles.sectionMeta}>{meta}</span> : null}
    </div>
  );
}

function EmptyState({ text }) {
  return <p style={styles.emptyState}>{text}</p>;
}

function FocusOverviewPanel({ focusData }) {
  const hasSessions = focusData && focusData.totalAnalyzedSessions > 0;
  const scoreColor = !hasSessions ? "#b0b8d8"
    : focusData.avgFocusScore >= 75 ? "#22c55e"
    : focusData.avgFocusScore >= 50 ? "#f59e0b" : "#ef4444";

  const trendColor = focusData?.trend === "improving" ? "#22c55e"
    : focusData?.trend === "declining" ? "#ef4444" : "#9aa4c7";
  const trendText = focusData?.trend === "improving" ? "↑ Improving this week"
    : focusData?.trend === "declining" ? "↓ Needs attention"
    : focusData?.trend === "stable" ? "→ Holding steady" : null;

  return (
    <Panel>
      <SectionHeader icon={Brain} title="AI Focus Overview" />
      {!hasSessions ? (
        <EmptyState text="No focus sessions recorded yet. Turn on your camera during a study room session to start AI focus monitoring." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 18 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", flexShrink: 0,
              background: scoreColor + "18",
              border: `3px solid ${scoreColor}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {focusData.avgFocusScore}
              </span>
              <span style={{ fontSize: 9, color: scoreColor, fontWeight: 600, opacity: 0.8 }}>/100</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#2f3b63" }}>Avg Focus Score</p>
              <p style={{ margin: "3px 0 4px", fontSize: 12, color: "#6b78a0" }}>
                {focusData.totalAnalyzedSessions} session{focusData.totalAnalyzedSessions === 1 ? "" : "s"} analysed ·
                Best: {focusData.bestFocusScore}/100
              </p>
              {trendText && (
                <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>
                  {trendText}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#9aa4c7", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Avg engagement
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: "#e8edf9", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${focusData.avgEngagementScore}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#4a5a85", flexShrink: 0 }}>
                {focusData.avgEngagementScore}%
              </span>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: "12px 14px", background: "#f8f9ff", borderRadius: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#6f3bd6", textTransform: "uppercase", letterSpacing: 0.5 }}>
              How it works
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#6b78a0", lineHeight: 1.55 }}>
              Face detection tracks your head orientation, eye openness, and expressions every 5 seconds while your camera is on. Scores improve as you build consistent focused study habits.
            </p>
          </div>
        </>
      )}
    </Panel>
  );
}

function FocusSessionList({ sessions }) {
  const scoreColor = (s) => s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <Panel>
      <SectionHeader icon={CalendarDays} title="Focus Sessions" meta={sessions.length > 0 ? `${sessions.length} recent` : ""} />
      {sessions.length === 0 ? (
        <EmptyState text="Your AI-analysed sessions will appear here after your first monitored study session." />
      ) : (
        <div style={{ display: "grid", gap: 8, maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
          {sessions.map((s) => (
            <article key={s.id} style={{ borderRadius: 13, border: "1px solid rgba(190,200,235,0.44)", background: "rgba(248,250,255,0.78)", padding: "11px 13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#2f3b63", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.roomName || s.roomId}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#7a89b8" }}>
                    {formatDateTime(s.sessionDate)} · {s.durationMinutes}m
                  </p>
                  {/* High/Med/Low bar */}
                  <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", height: 5, marginTop: 7, width: "100%" }}>
                    {s.highFocusPercent > 0 && <div style={{ width: `${s.highFocusPercent}%`, background: "#22c55e" }} />}
                    {s.medFocusPercent > 0 && <div style={{ width: `${s.medFocusPercent}%`, background: "#f59e0b" }} />}
                    {s.lowFocusPercent > 0 && <div style={{ width: `${s.lowFocusPercent}%`, background: "#ef4444" }} />}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "#9aa4c7" }}>
                    {s.distractionCount} distraction{s.distractionCount === 1 ? "" : "s"}
                    {s.offScreenSeconds > 0 ? ` · ${s.offScreenSeconds}s off-screen` : ""}
                  </p>
                </div>
                <div style={{ flexShrink: 0, textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: scoreColor(s.focusScore), lineHeight: 1 }}>
                    {s.focusScore}
                  </span>
                  <span style={{ display: "block", fontSize: 9, color: "#9aa4c7", fontWeight: 500, marginTop: 1 }}>FOCUS</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function buildMonthCells(days) {
  if (!days.length) return [];
  const firstDate = parseDateKey(days[0].date);
  const mondayIndex = (firstDate.getDay() + 6) % 7;
  return [...Array.from({ length: mondayIndex }, () => null), ...days];
}

const heatPalette = {
  1: "#d9e0f7",
  2: "#b9c6ef",
  3: "#8a9bd6",
  4: "#697cc3",
  5: "#46598f",
};

function getHeatLevel(minutes, maxMinutes) {
  if (!minutes || !maxMinutes) return 0;
  return Math.max(1, Math.min(5, Math.ceil((minutes / maxMinutes) * 5)));
}

function heatColor(minutes, maxMinutes) {
  const level = getHeatLevel(minutes, maxMinutes);
  return level === 0 ? "#eef2ff" : heatPalette[level];
}

function formatMinutes(minutes = 0) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes < 60) return `${safeMinutes}m`;
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatDateKey(dateKey, options) {
  return new Intl.DateTimeFormat("en-IN", options).format(parseDateKey(dateKey));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const analyticsTransitionStyles = `
@keyframes analyticsFade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0);   }
}
`;

const styles = {
  page: {
    minHeight: "calc(100vh - 76px)",
    background: "radial-gradient(ellipse at top, #eef1fb 0%, #f3f5fc 48%, #f8f9fe 100%)",
    padding: "32px 24px 56px",
  },
  layout: (isNarrow) => ({
    width: "100%",
    maxWidth: 1360,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)",
    gap: 24,
    alignItems: "start",
  }),
  main: {
    display: "grid",
    gap: 18,
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    color: "#7a89b8",
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  title: {
    margin: "5px 0 5px",
    fontFamily: "Georgia, serif",
    color: "#3f4f7a",
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 400,
  },
  subtitle: {
    margin: 0,
    color: "#6b78a0",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 400,
  },
  refreshButton: {
    height: 36,
    borderRadius: 12,
    border: "1px solid rgba(190,200,235,0.62)",
    background: "rgba(255,255,255,0.82)",
    color: "#4a5a85",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "0 13px",
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(74,90,133,0.07)",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
  },
  statCard: {
    borderRadius: 18,
    border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.76)",
    boxShadow: "0 8px 24px rgba(74,90,133,0.08)",
    padding: "14px 16px",
    display: "flex",
    gap: 12,
    alignItems: "center",
    minWidth: 0,
    boxSizing: "border-box",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statText: {
    minWidth: 0,
    display: "grid",
    gap: 2,
  },
  statLabel: {
    margin: 0,
    color: "#65749f",
    fontSize: 11,
    fontWeight: 500,
  },
  statValue: {
    margin: 0,
    color: "#2f3b63",
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 600,
  },
  statDetail: {
    margin: 0,
    color: "#7a89b8",
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 400,
  },
  panel: {
    borderRadius: 20,
    border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.78)",
    boxShadow: "0 10px 32px rgba(74,90,133,0.08)",
    backdropFilter: "blur(12px)",
    padding: 18,
    minWidth: 0,
    boxSizing: "border-box",
  },
  analyticsTabsShell: {
    borderRadius: 20,
    border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.58)",
    boxShadow: "0 10px 32px rgba(74,90,133,0.06)",
    padding: 16,
    display: "grid",
    gap: 14,
    minWidth: 0,
    boxSizing: "border-box",
  },
  tabRail: (count = 5) => ({
    position: "relative",
    display: "grid",
    gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
    gap: 4,
    borderRadius: 13,
    padding: 4,
    background: "#eef2ff",
    border: "1px solid rgba(190,200,235,0.5)",
    overflow: "hidden",
  }),
  tabIndicator: (activeIndex, count = 5) => ({
    position: "absolute",
    top: 3,
    bottom: 3,
    left: `calc(${activeIndex * (100 / count)}% + ${4 - activeIndex * (8 / count)}px)`,
    width: `calc(${100 / count}% - 2px)`,
    borderRadius: 9,
    background: "#ffffff",
    boxShadow: "0 4px 14px rgba(95,111,163,0.12)",
    transition: "left 0.24s ease",
  }),
  tabButton: (active) => ({
    position: "relative",
    zIndex: 1,
    height: 34,
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: active ? "#3f4f7a" : "#6b78a0",
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  }),
  analyticsTabPanel: {
    animation: "analyticsFade 0.22s ease",
  },
  twoColGrid: (isNarrow) => ({
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 16,
    alignItems: "start",
  }),
  singleColGrid: {
    display: "grid",
    gap: 16,
  },
  achievementsTabGrid: (isNarrow) => ({
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1.4fr) minmax(0, 1fr)",
    gap: 16,
    alignItems: "start",
  }),
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
    minWidth: 0,
  },
  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#5a6a94",
    minWidth: 0,
    flex: 1,
  },
  sectionTitle: {
    margin: 0,
    color: "#3f4f7a",
    fontSize: 14,
    fontWeight: 600,
  },
  sectionMeta: {
    color: "#7a89b8",
    fontSize: 12,
    fontWeight: 400,
    flexShrink: 0,
  },
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(28px, 1fr))",
    gap: 8,
    marginBottom: 8,
    color: "#7a89b8",
    fontSize: 11,
    fontWeight: 500,
    textAlign: "center",
  },
  heatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(28px, 1fr))",
    gap: 7,
  },
  heatCell: {
    aspectRatio: "1 / 1",
    minHeight: 28,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 400,
    border: "1px solid rgba(255,255,255,0.68)",
  },
  emptyHeatCell: {
    aspectRatio: "1 / 1",
    minHeight: 28,
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    color: "#65749f",
    fontSize: 11,
    fontWeight: 400,
    justifyContent: "flex-end",
  },
  legendSwatch: {
    width: 11,
    height: 11,
    borderRadius: 4,
    border: "1px solid rgba(190,200,235,0.45)",
  },
  chartWrap: {
    height: 200,
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(28px, 1fr))",
    gap: 10,
    alignItems: "end",
    paddingTop: 6,
    minWidth: 0,
  },
  chartColumn: {
    minWidth: 0,
    height: "100%",
    display: "grid",
    gridTemplateRows: "20px 1fr 18px",
    alignItems: "end",
    justifyItems: "center",
    gap: 5,
  },
  chartValue: {
    color: "#5a6a94",
    fontSize: 10,
    fontWeight: 500,
    whiteSpace: "nowrap",
    lineHeight: 1,
    alignSelf: "end",
  },
  chartTrack: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    background: "#eef2ff",
    display: "flex",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  chartBar: {
    width: "100%",
    borderRadius: "10px 10px 0 0",
    background: "linear-gradient(180deg, #8a9bd6, #5f6fa3)",
    boxShadow: "0 4px 12px rgba(95,111,163,0.22)",
  },
  chartLabel: {
    color: "#65749f",
    fontSize: 10,
    fontWeight: 500,
  },
  stack: {
    display: "grid",
    gap: 12,
  },
  roomRow: {
    display: "grid",
    gap: 5,
  },
  roomTopline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },
  rowTitle: {
    display: "block",
    flex: 1,
    margin: 0,
    color: "#2f3b63",
    fontSize: 13,
    fontWeight: 500,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowMeta: {
    color: "#4a5a85",
    fontSize: 12,
    fontWeight: 500,
    flexShrink: 0,
  },
  progressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 999,
    background: "#e8edf9",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #8a9bd6, #5f6fa3)",
  },
  smallMuted: {
    margin: 0,
    color: "#7a89b8",
    fontSize: 11,
    lineHeight: 1.45,
    fontWeight: 400,
  },
  consistencyWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    alignItems: "center",
    textAlign: "center",
    paddingTop: 8,
  },
  donut: {
    width: 116,
    height: 116,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  donutInner: {
    width: 82,
    height: 82,
    borderRadius: "50%",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    boxShadow: "inset 0 0 0 1px rgba(190,200,235,0.42)",
  },
  donutScore: {
    fontSize: 19,
    fontWeight: 600,
    color: "#2f3b63",
    lineHeight: 1,
  },
  donutLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: "#7a89b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  consistencyText: {
    textAlign: "center",
  },
  bigSentence: {
    margin: 0,
    color: "#2f3b63",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 400,
  },
  panelCopy: {
    margin: "6px 0 0",
    color: "#65749f",
    fontSize: 12,
    lineHeight: 1.55,
    fontWeight: 400,
  },
  achievementGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  achievement: (achieved) => ({
    borderRadius: 14,
    border: achieved
      ? "1px solid rgba(88,169,120,0.38)"
      : "1px solid rgba(190,200,235,0.54)",
    background: achieved ? "rgba(239,249,243,0.78)" : "rgba(248,250,255,0.84)",
    padding: 12,
    display: "grid",
    gridTemplateRows: "auto auto 1fr auto auto",
    gap: 7,
    boxSizing: "border-box",
  }),
  achievementBadge: (achieved) => ({
    width: 36,
    height: 36,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: achieved ? "#3e955d" : "#7a89b8",
    background: achieved ? "#dff3e7" : "#eef2ff",
  }),
  achievementTitle: {
    margin: 0,
    color: "#2f3b63",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 600,
    overflowWrap: "anywhere",
  },
  achievementCopy: {
    margin: 0,
    color: "#65749f",
    fontSize: 11,
    lineHeight: 1.45,
    fontWeight: 400,
  },
  topicList: {
    display: "grid",
    gap: 12,
    maxHeight: 420,
    overflowY: "auto",
    paddingRight: 4,
  },
  topicRow: {
    display: "grid",
    gap: 5,
  },
  topicName: {
    display: "block",
    flex: 1,
    color: "#2f3b63",
    fontSize: 13,
    fontWeight: 500,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  classList: {
    display: "grid",
    gap: 8,
    maxHeight: 520,
    overflowY: "auto",
    paddingRight: 4,
  },
  classRow: {
    borderRadius: 13,
    border: "1px solid rgba(190,200,235,0.44)",
    background: "rgba(248,250,255,0.78)",
    padding: "11px 13px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },
  classInfo: {
    minWidth: 0,
    flex: 1,
  },
  classMeta: {
    display: "grid",
    gap: 2,
    justifyItems: "end",
    color: "#4a5a85",
    fontSize: 11,
    fontWeight: 400,
    flexShrink: 0,
  },
  tags: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap",
    marginTop: 6,
  },
  tag: {
    borderRadius: 999,
    background: "#eef2ff",
    color: "#5f6fa3",
    padding: "3px 7px",
    fontSize: 10,
    fontWeight: 500,
  },
  stateText: {
    margin: 0,
    color: "#65749f",
    fontWeight: 400,
    fontSize: 14,
  },
  emptyState: {
    margin: 0,
    color: "#7a89b8",
    fontSize: 13,
    lineHeight: 1.55,
    fontWeight: 400,
  },
};
