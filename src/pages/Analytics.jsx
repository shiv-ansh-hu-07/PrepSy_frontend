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
} from "lucide-react";
import AppSideNav from "../components/AppSideNav";
import { fetchMyAnalytics } from "../services/api";

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      const res = await fetchMyAnalytics();
      setAnalytics(res.analytics);
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

  return (
    <div style={styles.page}>
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
              <RefreshCw size={16} />
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
                  detail={`${summary.completedStudyDays || 0} study days completed`}
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
              </section>

              <section style={styles.twoColumn(isNarrow)}>
                <Heatmap analytics={analytics} />
                <WeeklyFocusChart entries={analytics.weeklyFocus || []} total={weeklyTotal} />
              </section>

              <section style={styles.lowerGrid(isNarrow)}>
                <MostActiveRooms rooms={analytics.rooms || []} />
                <ConsistencyCard summary={summary} />
                <Achievements achievements={analytics.achievements || []} />
              </section>

              <section style={styles.twoColumn(isNarrow)}>
                <TopicsStudied topics={analytics.topics || []} />
                <ClassHistory classes={analytics.classes || []} />
              </section>

              <JoinedRooms rooms={analytics.joinedRooms || []} />
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
        <Icon size={22} />
      </div>
      <div>
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
      <SectionHeader
        icon={CalendarDays}
        title="Study Heatmap"
        meta={monthLabel}
      />

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
                color: cell.minutes > 0 && getHeatLevel(cell.minutes, maxMinutes) >= 4
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
          const height = maxMinutes > 0 ? Math.max(8, (entry.minutes / maxMinutes) * 150) : 0;
          return (
            <div key={entry.date} style={styles.chartColumn}>
              <span style={styles.chartValue}>
                {entry.minutes > 0 ? formatMinutes(entry.minutes) : ""}
              </span>
              <div style={styles.chartTrack}>
                <div style={{ ...styles.chartBar, height }} />
              </div>
              <span style={styles.chartLabel}>{formatDateKey(entry.date, { weekday: "short" })}</span>
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
            <strong>{score}%</strong>
            <span>Consistency</span>
          </div>
        </div>
        <div>
          <p style={styles.bigSentence}>
            You studied on <strong>{summary.studiedDaysThisWeek || 0} of 7 days</strong>.
          </p>
          <p style={styles.panelCopy}>
            Your current streak is {summary.currentStreakDays || 0} day
            {summary.currentStreakDays === 1 ? "" : "s"}.
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
          const progress = Math.min(100, ((achievement.progress || 0) / achievement.target) * 100);

          return (
            <article key={achievement.id} style={styles.achievement(achievement.achieved)}>
              <div style={styles.achievementBadge(achievement.achieved)}>
                <Icon size={22} />
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
      <SectionHeader icon={BookOpenCheck} title="Topics Studied" meta={`${topics.length} topics`} />
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
      <SectionHeader icon={CalendarDays} title="Classes Joined" meta={`${classes.length} total`} />
      {classes.length === 0 ? (
        <EmptyState text="Your joined class history will appear after you enter a room." />
      ) : (
        <div style={styles.classList}>
          {classes.map((session) => (
            <article key={session.id} style={styles.classRow}>
              <div>
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
                <strong>{formatMinutes(session.minutes)}</strong>
                <span>{session.completed ? "Completed" : "Joined"}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function JoinedRooms({ rooms }) {
  return (
    <Panel>
      <SectionHeader icon={Users} title="All Joined Rooms" meta={`${rooms.length} rooms`} />
      {rooms.length === 0 ? (
        <EmptyState text="No joined rooms found on your account." />
      ) : (
        <div style={styles.joinedRoomGrid}>
          {rooms.map((room) => (
            <article key={room.roomId} style={styles.joinedRoom}>
              <p style={styles.rowTitle}>{room.name}</p>
              <p style={styles.smallMuted}>Joined {formatDateKey(room.joinedAt.slice(0, 10), { month: "short", day: "numeric", year: "numeric" })}</p>
              <div style={styles.tags}>
                {(room.tags || []).map((tag) => (
                  <span key={`${room.roomId}-${tag}`} style={styles.tag}>
                    #{tag}
                  </span>
                ))}
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
        <Icon size={18} />
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>
      {meta ? <span style={styles.sectionMeta}>{meta}</span> : null}
    </div>
  );
}

function EmptyState({ text }) {
  return <p style={styles.emptyState}>{text}</p>;
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

const styles = {
  page: {
    minHeight: "calc(100vh - 76px)",
    background:
      "radial-gradient(ellipse at top, #eef1fb 0%, #f3f5fc 48%, #f8f9fe 100%)",
    padding: "32px 24px 56px",
  },
  layout: (isNarrow) => ({
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "280px minmax(0, 1fr)",
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
    fontWeight: 800,
    fontSize: 12,
  },
  title: {
    margin: "6px 0 6px",
    fontFamily: "Georgia, serif",
    color: "#3f4f7a",
    fontSize: 36,
    lineHeight: 1.08,
  },
  subtitle: {
    margin: 0,
    color: "#6b78a0",
    fontSize: 15,
    lineHeight: 1.6,
  },
  refreshButton: {
    height: 42,
    borderRadius: 14,
    border: "1px solid rgba(190,200,235,0.62)",
    background: "rgba(255,255,255,0.82)",
    color: "#4a5a85",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "0 14px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(74,90,133,0.08)",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
  },
  statCard: {
    minHeight: 128,
    borderRadius: 22,
    border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.76)",
    boxShadow: "0 14px 34px rgba(74,90,133,0.1)",
    padding: 18,
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLabel: {
    margin: 0,
    color: "#65749f",
    fontSize: 13,
    fontWeight: 800,
  },
  statValue: {
    margin: "5px 0 4px",
    color: "#2f3b63",
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 900,
  },
  statDetail: {
    margin: 0,
    color: "#7a89b8",
    fontSize: 13,
  },
  panel: {
    borderRadius: 24,
    border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.78)",
    boxShadow: "0 16px 42px rgba(74,90,133,0.1)",
    backdropFilter: "blur(12px)",
    padding: 20,
    minWidth: 0,
  },
  twoColumn: (isNarrow) => ({
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1fr) minmax(360px, 0.82fr)",
    gap: 18,
  }),
  lowerGrid: (isNarrow) => ({
    display: "grid",
    gridTemplateColumns: isNarrow
      ? "1fr"
      : "minmax(260px, 0.9fr) minmax(260px, 0.78fr) minmax(360px, 1.1fr)",
    gap: 18,
  }),
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#4a5a85",
    minWidth: 0,
  },
  sectionTitle: {
    margin: 0,
    color: "#3f4f7a",
    fontSize: 17,
    fontWeight: 900,
  },
  sectionMeta: {
    color: "#7a89b8",
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(28px, 1fr))",
    gap: 8,
    marginBottom: 8,
    color: "#7a89b8",
    fontSize: 12,
    fontWeight: 800,
    textAlign: "center",
  },
  heatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(28px, 1fr))",
    gap: 8,
  },
  heatCell: {
    aspectRatio: "1 / 1",
    minHeight: 34,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.68)",
  },
  emptyHeatCell: {
    aspectRatio: "1 / 1",
    minHeight: 34,
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    color: "#65749f",
    fontSize: 12,
    justifyContent: "flex-end",
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 5,
    border: "1px solid rgba(190,200,235,0.45)",
  },
  chartWrap: {
    height: 220,
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(32px, 1fr))",
    gap: 12,
    alignItems: "end",
    paddingTop: 8,
  },
  chartColumn: {
    minWidth: 0,
    height: "100%",
    display: "grid",
    gridTemplateRows: "24px 1fr 22px",
    alignItems: "end",
    justifyItems: "center",
    gap: 7,
  },
  chartValue: {
    color: "#4a5a85",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  chartTrack: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    background: "#eef2ff",
    display: "flex",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  chartBar: {
    width: "100%",
    borderRadius: "14px 14px 0 0",
    background: "linear-gradient(180deg, #8a9bd6, #5f6fa3)",
    boxShadow: "0 8px 18px rgba(95,111,163,0.28)",
  },
  chartLabel: {
    color: "#65749f",
    fontSize: 12,
    fontWeight: 800,
  },
  stack: {
    display: "grid",
    gap: 14,
  },
  roomRow: {
    display: "grid",
    gap: 7,
  },
  roomTopline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowTitle: {
    margin: 0,
    color: "#2f3b63",
    fontSize: 14,
    fontWeight: 900,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowMeta: {
    color: "#4a5a85",
    fontSize: 13,
    fontWeight: 900,
    flexShrink: 0,
  },
  progressTrack: {
    width: "100%",
    height: 8,
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
    fontSize: 12,
    lineHeight: 1.45,
  },
  consistencyWrap: {
    display: "grid",
    gridTemplateColumns: "128px minmax(0, 1fr)",
    gap: 18,
    alignItems: "center",
  },
  donut: {
    width: 126,
    height: 126,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  donutInner: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    color: "#2f3b63",
    boxShadow: "inset 0 0 0 1px rgba(190,200,235,0.42)",
  },
  bigSentence: {
    margin: 0,
    color: "#2f3b63",
    fontSize: 16,
    lineHeight: 1.55,
  },
  panelCopy: {
    margin: "8px 0 0",
    color: "#65749f",
    fontSize: 13,
    lineHeight: 1.55,
  },
  achievementGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  },
  achievement: (achieved) => ({
    borderRadius: 18,
    border: achieved ? "1px solid rgba(88,169,120,0.38)" : "1px solid rgba(190,200,235,0.54)",
    background: achieved ? "rgba(239,249,243,0.78)" : "rgba(248,250,255,0.84)",
    padding: 14,
    display: "grid",
    gap: 9,
    minHeight: 188,
  }),
  achievementBadge: (achieved) => ({
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: achieved ? "#3e955d" : "#7a89b8",
    background: achieved ? "#dff3e7" : "#eef2ff",
  }),
  achievementTitle: {
    margin: 0,
    color: "#2f3b63",
    fontSize: 14,
    lineHeight: 1.35,
    fontWeight: 900,
  },
  achievementCopy: {
    margin: 0,
    color: "#65749f",
    fontSize: 12,
    lineHeight: 1.45,
  },
  topicList: {
    display: "grid",
    gap: 14,
    maxHeight: 360,
    overflowY: "auto",
    paddingRight: 4,
  },
  topicRow: {
    display: "grid",
    gap: 7,
  },
  topicName: {
    color: "#2f3b63",
    fontSize: 14,
    fontWeight: 900,
  },
  classList: {
    display: "grid",
    gap: 10,
    maxHeight: 390,
    overflowY: "auto",
    paddingRight: 4,
  },
  classRow: {
    borderRadius: 16,
    border: "1px solid rgba(190,200,235,0.44)",
    background: "rgba(248,250,255,0.78)",
    padding: 14,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  classMeta: {
    display: "grid",
    gap: 2,
    justifyItems: "end",
    color: "#4a5a85",
    fontSize: 12,
    flexShrink: 0,
  },
  tags: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 8,
  },
  tag: {
    borderRadius: 999,
    background: "#eef2ff",
    color: "#5f6fa3",
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 800,
  },
  joinedRoomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
  },
  joinedRoom: {
    borderRadius: 16,
    border: "1px solid rgba(190,200,235,0.44)",
    background: "rgba(248,250,255,0.78)",
    padding: 14,
    minWidth: 0,
  },
  stateText: {
    margin: 0,
    color: "#65749f",
    fontWeight: 700,
  },
  emptyState: {
    margin: 0,
    color: "#7a89b8",
    fontSize: 14,
    lineHeight: 1.55,
  },
};
