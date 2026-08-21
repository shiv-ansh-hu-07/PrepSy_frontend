import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
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
  Zap,
} from "lucide-react";
import AppSideNav from "../components/AppSideNav";
import MasteryPanel from "../components/MasteryPanel";
import { fetchMyAnalytics, fetchFocusSummary, fetchFocusInsight } from "../services/api";
import { useWindowWidth } from "../hooks/useBreakpoint";

const analyticsTabs = [
  { id: "activity", label: "Activity" },
  { id: "topics", label: "Topics" },
  { id: "mastery", label: "Mastery" },
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
  const width = useWindowWidth();
  const isNarrow = width < 1024; // side nav collapses, layout goes single-column

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
        {!isNarrow && <AppSideNav />}

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
                  accent="var(--accent)"
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
                      <WeeklyFocusChart
                        entries={analytics.weeklyFocus || []}
                        total={weeklyTotal}
                        dailyGoalMinutes={summary.dailyStudyGoalMinutes || 0}
                      />
                    </div>
                  ) : null}

                  {activeAnalyticsTab === "topics" ? (
                    <div style={styles.twoColGrid(isNarrow)}>
                      <TopicsStudied topics={analytics.topics || []} />
                      <MostActiveRooms rooms={analytics.rooms || []} />
                    </div>
                  ) : null}

                  {activeAnalyticsTab === "mastery" ? (
                    <MasteryPanel />
                  ) : null}

                  {activeAnalyticsTab === "sessions" ? (
                    <div style={styles.singleColGrid}>
                      <ClassHistory classes={analytics.classes || []} />
                    </div>
                  ) : null}

                  {activeAnalyticsTab === "focus" ? (
                    <div style={{ display: "grid", gap: 18 }}>
                      <FocusCoach hasSessions={focusData?.totalAnalyzedSessions > 0} />
                      <div style={styles.twoColGrid(isNarrow)}>
                        <FocusOverviewPanel focusData={focusData} />
                        <FocusSessionList sessions={focusData?.recentSessions || []} />
                      </div>
                      <div style={styles.twoColGrid(isNarrow)}>
                        <PeakFocusHoursChart sessions={focusData?.recentSessions || []} />
                        <DistractionBreakdown sessions={focusData?.recentSessions || []} />
                      </div>
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
                    : "var(--text-secondary)",
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
              background: level === 0 ? "var(--accent-soft)" : heatPalette[level],
            }}
          />
        ))}
        <span>More</span>
      </div>
    </Panel>
  );
}

function WeeklyFocusChart({ entries, total, dailyGoalMinutes = 0 }) {
  const hasGoal = dailyGoalMinutes > 0;
  const maxActual = Math.max(0, ...entries.map((e) => e.minutes || 0));
  const barScale = hasGoal ? dailyGoalMinutes : maxActual;

  const goalLabel = hasGoal
    ? `Goal ${formatMinutes(dailyGoalMinutes)}/day`
    : null;

  return (
    <Panel>
      <SectionHeader
        icon={BarChart3}
        title="Weekly Focus Time"
        meta={goalLabel ? `Total ${formatMinutes(total)} · ${goalLabel}` : `Total ${formatMinutes(total)}`}
      />

      {hasGoal && (
        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent-gradient)", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Studied</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--card-border)", border: "1px solid #c4cce8", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Goal</span>
          </div>
        </div>
      )}

      <div style={styles.chartWrap}>
        {entries.map((entry) => {
          const actual = entry.minutes || 0;
          const trackHeight = 140;
          const goalH = barScale > 0 ? trackHeight : 0;
          const actualH = barScale > 0 ? Math.min(trackHeight, Math.max(actual > 0 ? 6 : 0, (actual / barScale) * trackHeight)) : 0;
          const overGoal = hasGoal && actual > dailyGoalMinutes;

          return (
            <div key={entry.date} style={styles.chartColumn}>
              <span style={styles.chartValue}>
                {actual > 0 ? formatMinutes(actual) : ""}
              </span>
              <div style={{ ...styles.chartTrack, height: trackHeight, position: "relative" }}>
                {hasGoal && (
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: goalH,
                    background: "var(--accent-soft)",
                    border: "1px solid #d0d8f0",
                    borderRadius: 6,
                  }} />
                )}
                <div style={{
                  ...styles.chartBar,
                  height: actualH,
                  position: hasGoal ? "absolute" : "static",
                  bottom: hasGoal ? 0 : undefined,
                  left: hasGoal ? 0 : undefined,
                  right: hasGoal ? 0 : undefined,
                  background: overGoal ? "#22c55e" : "var(--accent)",
                  zIndex: 1,
                }} />
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
            background: `conic-gradient(#58a978 ${score * 3.6}deg, var(--accent-soft) 0deg)`,
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
                    background: achievement.achieved ? "#58a978" : "var(--accent)",
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

// ── Peak Focus Hours ─────────────────────────────────────────────────────────

function scoreToHeatColor(score) {
  if (score === null) return "var(--card-bg)";
  if (score >= 80) return "#6f3bd6";
  if (score >= 65) return "var(--accent)";
  if (score >= 50) return "rgba(157,171,228,0.6)";
  if (score >= 35) return "rgba(157,171,228,0.3)";
  return "var(--accent-soft)";
}

function formatHour(hour, short = false) {
  const amPm = hour >= 12 ? "pm" : "am";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return short ? `${h}${amPm}` : `${h}:00 ${amPm.toUpperCase()}`;
}

function PeakFocusHoursChart({ sessions }) {
  const isPhone = useWindowWidth() < 640; // fewer heatmap columns on small phones
  const hasSessions = sessions && sessions.length > 0;

  const hourlyData = useMemo(() => {
    const map = {};
    (sessions || []).forEach((s) => {
      const hour = new Date(s.sessionDate).getHours();
      if (!map[hour]) map[hour] = [];
      map[hour].push(s.focusScore);
    });
    return Array.from({ length: 24 }, (_, h) => {
      const scores = map[h] || [];
      return {
        hour: h,
        avgScore: scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
        count: scores.length,
      };
    });
  }, [sessions]);

  const peakHour = useMemo(
    () =>
      hourlyData
        .filter((h) => h.avgScore !== null)
        .sort((a, b) => b.avgScore - a.avgScore)[0] || null,
    [hourlyData],
  );

  const visibleHours = hourlyData.filter((h) => h.hour >= 5 && h.hour <= 23);

  return (
    <Panel>
      <SectionHeader icon={Zap} title="Peak Focus Hours" />
      {!hasSessions ? (
        <EmptyState text="Complete monitored sessions to discover your peak focus hours." />
      ) : (
        <>
          {peakHour && sessions.length >= 5 ? (
            <div style={{
              padding: "10px 14px", background: "var(--accent-soft)", borderRadius: 10,
              border: "1px solid rgba(124,58,237,0.15)", marginBottom: 14,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: "#6f3bd6", fontWeight: 600 }}>
                ⚡ Your brain works best around {formatHour(peakHour.hour)} — avg score {peakHour.avgScore}/100
              </p>
            </div>
          ) : (
            <div style={{
              padding: "10px 14px", background: "var(--card-bg)", borderRadius: 10,
              border: "1px solid var(--accent-soft)", marginBottom: 14,
            }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                Complete a few more sessions at different times to reveal your peak focus hours.
              </p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: isPhone ? "repeat(4, minmax(0, 1fr))" : "repeat(6, minmax(0, 1fr))", gap: 5 }}>
            {visibleHours.map((h) => {
              const hasData = h.avgScore !== null;
              const bg = scoreToHeatColor(h.avgScore);
              const textColor = hasData && h.avgScore >= 65 ? "#ffffff" : "var(--text-secondary)";
              const isPeak = peakHour && h.hour === peakHour.hour;
              return (
                <div
                  key={h.hour}
                  title={
                    hasData
                      ? `${formatHour(h.hour)}: ${h.avgScore}/100 (${h.count} session${h.count !== 1 ? "s" : ""})`
                      : `${formatHour(h.hour)}: No data`
                  }
                  style={{
                    height: 50,
                    borderRadius: 10,
                    background: bg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: isPeak ? "2px solid #7c3aed" : "2px solid transparent",
                    cursor: "default",
                    transition: "opacity 0.15s",
                  }}
                >
                  <span style={{ fontSize: 9, color: hasData ? textColor : "#c0c8e0", fontWeight: 600, lineHeight: 1 }}>
                    {formatHour(h.hour, true)}
                  </span>
                  {hasData && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: textColor, lineHeight: 1.3 }}>
                      {h.avgScore}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#b0b8d8" }}>Low focus</span>
            {[20, 40, 55, 70, 85].map((v) => (
              <span
                key={v}
                style={{ width: 16, height: 10, borderRadius: 3, background: scoreToHeatColor(v), display: "inline-block" }}
              />
            ))}
            <span style={{ fontSize: 10, color: "#b0b8d8" }}>High focus</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#b0b8d8" }}>
            Based on {sessions.length} recent session{sessions.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </Panel>
  );
}

// ── Distraction Breakdown ─────────────────────────────────────────────────────

function MiniMetric({ label, value, unit, color }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--accent-soft)" }}>
      <p style={{ margin: "0 0 3px", fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400, marginLeft: 3 }}>{unit}</span>}
      </p>
    </div>
  );
}

function TypeChip({ emoji, label, value, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
      borderRadius: 999, background: `${color}14`, border: `1px solid ${color}40`,
    }}>
      <span style={{ fontSize: 12 }}>{emoji}</span>
      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function DistractionBreakdown({ sessions }) {
  const hasSessions = sessions && sessions.length > 0;

  const stats = useMemo(() => {
    if (!hasSessions) return null;
    const n = sessions.length;
    const avg = (fn) => Math.round(sessions.reduce((a, s) => a + (fn(s) || 0), 0) / n);
    const avgDistractions = (
      sessions.reduce((a, s) => a + (s.distractionCount || 0), 0) / n
    ).toFixed(1);
    const avgOffScreenMin = Math.round(
      (sessions.reduce((a, s) => a + (s.offScreenSeconds || 0), 0) / n / 60) * 10,
    ) / 10;
    const bestStreakMin = Math.round(
      (Math.max(0, ...sessions.map((s) => s.longestFocusStreakSec || 0)) / 60) * 10,
    ) / 10;

    return {
      avgDistractions,
      avgOffScreenMin,
      bestStreakMin,
      avgHighPct: avg((s) => s.highFocusPercent),
      avgMedPct: avg((s) => s.medFocusPercent),
      avgLowPct: avg((s) => s.lowFocusPercent),
      avgPhonePct: avg((s) => s.phonePercent),
      avgLookAwayPct: avg((s) => s.lookAwayPercent),
      avgNotePct: avg((s) => s.noteTakingPercent),
      avgDrowsyPct: avg((s) => s.drowsinessPercent),
    };
  }, [sessions, hasSessions]);

  // Priority-ordered insight so we never say "great discipline" while low-focus is high.
  const insight = !stats
    ? null
    : stats.avgPhonePct >= 8
    ? { warn: true, text: `Phone showed up ~${stats.avgPhonePct}% of the time — try keeping it out of reach` }
    : stats.avgLowPct >= 30
    ? { warn: true, text: `${stats.avgLowPct}% of your time was low-focus — room to improve` }
    : Number(stats.avgOffScreenMin) >= 1
    ? { warn: true, text: `Off-screen costs you ~${stats.avgOffScreenMin}m per session` }
    : stats.avgHighPct >= 60
    ? { warn: false, text: `Great discipline — ${stats.avgHighPct}% of your time is in high focus` }
    : stats.avgNotePct >= 15
    ? { warn: false, text: `Solid work — ${stats.avgNotePct}% productive note-taking` }
    : null;

  return (
    <Panel>
      <SectionHeader icon={Activity} title="Distraction Breakdown" />
      {!hasSessions || !stats ? (
        <EmptyState text="Complete monitored sessions to see your distraction patterns." />
      ) : (
        <>
          {insight && (
            <div style={{
              padding: "10px 14px",
              background: insight.warn ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
              borderRadius: 10,
              border: `1px solid ${insight.warn ? "rgba(245,158,11,0.35)" : "rgba(34,197,94,0.35)"}`,
              marginBottom: 14,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: insight.warn ? "#c2410c" : "#15803d", fontWeight: 600 }}>
                {insight.warn ? "⚠ " : "✓ "}{insight.text}
              </p>
            </div>
          )}

          <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Avg focus quality per session
          </p>
          <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", height: 10, marginBottom: 6 }}>
            {stats.avgHighPct > 0 && <div style={{ width: `${stats.avgHighPct}%`, background: "#22c55e" }} />}
            {stats.avgMedPct > 0 && <div style={{ width: `${stats.avgMedPct}%`, background: "#f59e0b" }} />}
            {stats.avgLowPct > 0 && <div style={{ width: `${stats.avgLowPct}%`, background: "#ef4444" }} />}
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            {[
              { label: "High", pct: stats.avgHighPct, color: "#22c55e" },
              { label: "Medium", pct: stats.avgMedPct, color: "#f59e0b" },
              { label: "Low", pct: stats.avgLowPct, color: "#ef4444" },
            ].map(({ label, pct, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label} {pct}%</span>
              </div>
            ))}
          </div>

          <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Distraction types
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <TypeChip emoji="📱" label="Phone" value={`${stats.avgPhonePct}%`} color="#ef4444" />
            <TypeChip emoji="👀" label="Looked away" value={`${stats.avgLookAwayPct}%`} color="#f59e0b" />
            <TypeChip emoji="🚪" label="Off-screen" value={`${stats.avgOffScreenMin}m`} color="#ef4444" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
            <MiniMetric label="Best focus streak" value={stats.bestStreakMin} unit="m" color="#22c55e" />
            <MiniMetric label="Note-taking" value={`${stats.avgNotePct}%`} color="#22c55e" />
            <MiniMetric label="Avg distractions" value={stats.avgDistractions} unit="/session" color="#f59e0b" />
            <MiniMetric label="Drowsiness" value={`${stats.avgDrowsyPct}%`} color="#f59e0b" />
          </div>
        </>
      )}
    </Panel>
  );
}

function FocusCoach({ hasSessions }) {
  const [state, setState] = useState("idle"); // idle | loading | ok | error | empty
  const [data, setData] = useState(null);

  const load = async () => {
    setState("loading");
    try {
      const res = await fetchFocusInsight();
      if (res?.empty || (!res?.headline && !(res?.insights || []).length && !res?.tip)) {
        setState("empty");
        return;
      }
      setData(res);
      setState("ok");
    } catch {
      setState("error");
    }
  };

  return (
    <Panel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={styles.sectionTitleWrap}>
          <Brain size={16} />
          <h2 style={styles.sectionTitle}>AI Focus Coach</h2>
        </div>
        {hasSessions && (
          <button onClick={load} disabled={state === "loading"} style={styles.refreshButton}>
            {state === "loading" ? "Thinking…" : state === "ok" ? "Refresh" : "Get coaching"}
          </button>
        )}
      </div>

      {!hasSessions ? (
        <EmptyState text="Complete a monitored session to get personalised AI coaching." />
      ) : state === "idle" ? (
        <p style={styles.emptyState}>Tap “Get coaching” for AI-written tips based on your real focus sessions — what you do best, where focus dips, and one thing to try next time.</p>
      ) : state === "loading" ? (
        <p style={styles.emptyState}>Reading your session data…</p>
      ) : state === "error" ? (
        <p style={{ ...styles.emptyState, color: "#b44b3c" }}>Couldn’t generate coaching right now. Please try again.</p>
      ) : state === "empty" ? (
        <p style={styles.emptyState}>Not enough data yet — complete a monitored session first.</p>
      ) : (
        <div>
          {data.headline ? (
            <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{data.headline}</p>
          ) : null}
          {(data.insights || []).map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{t}</span>
            </div>
          ))}
          {data.tip ? (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "var(--accent-soft)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6f3bd6" }}>Next session: </span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{data.tip}</span>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function FocusOverviewPanel({ focusData }) {
  const hasSessions = focusData && focusData.totalAnalyzedSessions > 0;
  const scoreColor = !hasSessions ? "#b0b8d8"
    : focusData.avgFocusScore >= 75 ? "#22c55e"
    : focusData.avgFocusScore >= 50 ? "#f59e0b" : "#ef4444";

  const trendColor = focusData?.trend === "improving" ? "#22c55e"
    : focusData?.trend === "declining" ? "#ef4444" : "var(--text-muted)";
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
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Avg Focus Score</p>
              <p style={{ margin: "3px 0 4px", fontSize: 12, color: "var(--text-secondary)" }}>
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
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Avg engagement
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--accent-soft)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${focusData.avgEngagementScore}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0 }}>
                {focusData.avgEngagementScore}%
              </span>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--card-bg)", borderRadius: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#6f3bd6", textTransform: "uppercase", letterSpacing: 0.5 }}>
              How it works
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>
              On-device MediaPipe AI tracks your eye gaze, head pose and blinks — and spots a phone in frame — every 5 seconds while your camera is on. It tells note-taking apart from real distraction, so scores stay fair. Video never leaves your device.
            </p>
          </div>
        </>
      )}
    </Panel>
  );
}

// Compact typed signal line for a session card; falls back for old sessions.
function sessionMetaLine(s) {
  const parts = [];
  if (s.phonePercent) parts.push(`📱 ${s.phonePercent}%`);
  if (s.lookAwayPercent) parts.push(`👀 ${s.lookAwayPercent}%`);
  if (s.noteTakingPercent) parts.push(`📝 ${s.noteTakingPercent}%`);
  if (s.offScreenSeconds > 0) parts.push(`${s.offScreenSeconds}s off-screen`);
  if (!parts.length) {
    parts.push(`${s.distractionCount || 0} distraction${s.distractionCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
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
            <article key={s.id} style={{ borderRadius: 13, border: "1px solid rgba(190,200,235,0.44)", background: "var(--card-bg)", padding: "11px 13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.roomName || s.roomId}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>
                    {formatDateTime(s.sessionDate)} · {s.durationMinutes}m
                  </p>
                  {/* High/Med/Low bar */}
                  <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", height: 5, marginTop: 7, width: "100%" }}>
                    {s.highFocusPercent > 0 && <div style={{ width: `${s.highFocusPercent}%`, background: "#22c55e" }} />}
                    {s.medFocusPercent > 0 && <div style={{ width: `${s.medFocusPercent}%`, background: "#f59e0b" }} />}
                    {s.lowFocusPercent > 0 && <div style={{ width: `${s.lowFocusPercent}%`, background: "#ef4444" }} />}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-muted)" }}>
                    {sessionMetaLine(s)}
                  </p>
                </div>
                <div style={{ flexShrink: 0, textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: scoreColor(s.focusScore), lineHeight: 1 }}>
                    {s.focusScore}
                  </span>
                  <span style={{ display: "block", fontSize: 9, color: "var(--text-muted)", fontWeight: 500, marginTop: 1 }}>FOCUS</span>
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
  3: "var(--accent)",
  4: "#697cc3",
  5: "#46598f",
};

function getHeatLevel(minutes, maxMinutes) {
  if (!minutes || !maxMinutes) return 0;
  return Math.max(1, Math.min(5, Math.ceil((minutes / maxMinutes) * 5)));
}

function heatColor(minutes, maxMinutes) {
  const level = getHeatLevel(minutes, maxMinutes);
  return level === 0 ? "var(--accent-soft)" : heatPalette[level];
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
    background: "var(--page-bg)",
    padding: "32px 24px 56px",
  },
  layout: (isNarrow) => ({
    width: "100%",
    maxWidth: 1360,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: isNarrow ? "minmax(0, 1fr)" : "288px minmax(0, 1fr)",
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
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  title: {
    margin: "5px 0 5px",
    fontFamily: "Georgia, serif",
    color: "var(--text-primary)",
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 400,
  },
  subtitle: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 400,
  },
  refreshButton: {
    height: 36,
    borderRadius: 12,
    border: "1px solid rgba(190,200,235,0.62)",
    background: "var(--card-bg)",
    color: "var(--text-secondary)",
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
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
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
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 500,
  },
  statValue: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 600,
  },
  statDetail: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 400,
  },
  panel: {
    borderRadius: 20,
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
    boxShadow: "0 10px 32px rgba(74,90,133,0.08)",
    backdropFilter: "blur(12px)",
    padding: 18,
    minWidth: 0,
    boxSizing: "border-box",
  },
  analyticsTabsShell: {
    borderRadius: 20,
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
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
    background: "var(--accent-soft)",
    border: "1px solid var(--card-border)",
    overflow: "hidden",
  }),
  tabIndicator: (activeIndex, count = 5) => ({
    position: "absolute",
    top: 3,
    bottom: 3,
    left: `calc(${activeIndex * (100 / count)}% + ${4 - activeIndex * (8 / count)}px)`,
    width: `calc(${100 / count}% - 2px)`,
    borderRadius: 9,
    background: "var(--card-bg)",
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
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
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
    gridTemplateColumns: isNarrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 16,
    alignItems: "start",
  }),
  singleColGrid: {
    display: "grid",
    gap: 16,
  },
  achievementsTabGrid: (isNarrow) => ({
    display: "grid",
    gridTemplateColumns: isNarrow ? "minmax(0, 1fr)" : "minmax(0, 1.4fr) minmax(0, 1fr)",
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
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
  },
  sectionMeta: {
    color: "var(--text-secondary)",
    fontSize: 12,
    fontWeight: 400,
    flexShrink: 0,
  },
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(28px, 1fr))",
    gap: 8,
    marginBottom: 8,
    color: "var(--text-secondary)",
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
    border: "1px solid var(--card-bg)",
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
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 400,
    justifyContent: "flex-end",
  },
  legendSwatch: {
    width: 11,
    height: 11,
    borderRadius: 4,
    border: "1px solid var(--card-border)",
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
    gridTemplateRows: "20px minmax(0, 1fr) 18px",
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
    background: "var(--accent-soft)",
    display: "flex",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  chartBar: {
    width: "100%",
    borderRadius: "10px 10px 0 0",
    background: "linear-gradient(180deg, var(--accent), var(--text-secondary))",
    boxShadow: "0 4px 12px rgba(95,111,163,0.22)",
  },
  chartLabel: {
    color: "var(--text-muted)",
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
    color: "var(--text-primary)",
    fontSize: 13,
    fontWeight: 500,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowMeta: {
    color: "var(--text-secondary)",
    fontSize: 12,
    fontWeight: 500,
    flexShrink: 0,
  },
  progressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 999,
    background: "var(--accent-soft)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, var(--accent), var(--text-secondary))",
  },
  smallMuted: {
    margin: 0,
    color: "var(--text-secondary)",
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
    background: "var(--card-bg)",
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
    color: "var(--text-primary)",
    lineHeight: 1,
  },
  donutLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  consistencyText: {
    textAlign: "center",
  },
  bigSentence: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: 13,
    lineHeight: 1.6,
    fontWeight: 400,
  },
  panelCopy: {
    margin: "6px 0 0",
    color: "var(--text-muted)",
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
    background: achieved ? "rgba(88,169,120,0.15)" : "var(--card-bg)",
    padding: 12,
    display: "grid",
    gridTemplateRows: "auto auto minmax(0, 1fr) auto auto",
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
    color: achieved ? "#6ec98f" : "var(--text-secondary)",
    background: achieved ? "rgba(88,169,120,0.2)" : "var(--accent-soft)",
  }),
  achievementTitle: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 600,
    overflowWrap: "anywhere",
  },
  achievementCopy: {
    margin: 0,
    color: "var(--text-muted)",
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
    color: "var(--text-primary)",
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
    background: "var(--card-bg)",
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
    color: "var(--text-secondary)",
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
    background: "var(--accent-soft)",
    color: "var(--text-secondary)",
    padding: "3px 7px",
    fontSize: 10,
    fontWeight: 500,
  },
  stateText: {
    margin: 0,
    color: "var(--text-muted)",
    fontWeight: 400,
    fontSize: 14,
  },
  emptyState: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: 13,
    lineHeight: 1.55,
    fontWeight: 400,
  },
};
