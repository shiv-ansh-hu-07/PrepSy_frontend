import React, { useCallback, useEffect, useState } from "react";
import { fetchEventsSummary, fetchEventsTesters, fetchCohortRetention } from "../services/api";

// Founder-only analytics dashboard. Not linked anywhere in the app — reachable
// via /founder. Access is enforced server-side (ANALYTICS_ADMIN_EMAILS); if the
// caller isn't the founder, the API returns 403 and we show "Access restricted".

const FUNNEL = [
  { key: "signup_started", label: "Signup started" },
  { key: "signup_completed", label: "Signup completed" },
  { key: "room_joined", label: "Room joined" },
  { key: "session_completed", label: "Session completed" },
];

export default function FounderAnalytics() {
  const [data, setData] = useState(null);
  const [testers, setTesters] = useState([]);
  const [retention, setRetention] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | denied | error

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetchEventsSummary();
      setData(res);
      setStatus("ok");
      fetchEventsTesters().then(setTesters).catch(() => setTesters([]));
      fetchCohortRetention().then(setRetention).catch(() => setRetention({ cohorts: [] }));
    } catch (err) {
      const code = err?.response?.status;
      setStatus(code === 401 || code === 403 ? "denied" : "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <Centered>Loading analytics…</Centered>;

  if (status === "denied")
    return (
      <Centered>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)", marginBottom: 8 }}>
            Access restricted
          </h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: 380 }}>
            This dashboard is limited to the founder account.
          </p>
        </div>
      </Centered>
    );

  if (status === "error")
    return (
      <Centered>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: 14 }}>
            Couldn’t load analytics.
          </p>
          <button onClick={load} style={btnStyle}>Retry</button>
        </div>
      </Centered>
    );

  const counts = Object.fromEntries(
    (data.topEventsLast7Days || []).map((e) => [e.name, e.count]),
  );
  const funnelMax = Math.max(1, counts[FUNNEL[0].key] || 0);

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "28px 20px 60px",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, color: "var(--text-primary)" }}>
          Founder Analytics
        </h1>
        <button onClick={load} style={btnStyle}>Refresh</button>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>
        Updated {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : "—"} ·
        {" "}total events tracked: {fmt(data.totalEvents)}
      </p>

      {/* Active users */}
      <SectionTitle>Active users</SectionTitle>
      <Grid>
        <Stat label="DAU" hint="last 24h" value={data.active?.dau} />
        <Stat label="WAU" hint="last 7 days" value={data.active?.wau} accent />
        <Stat label="MAU" hint="last 30 days" value={data.active?.mau} />
        <Stat label="Returning" hint="2+ active days / 30d" value={data.returningUsers30} />
      </Grid>

      {/* Signups */}
      <SectionTitle>Signups & sessions</SectionTitle>
      <Grid>
        <Stat label="Signups" hint="last 7 days" value={data.signups?.last7Days} />
        <Stat label="Signups" hint="last 30 days" value={data.signups?.last30Days} />
        <Stat label="Sessions done" hint="last 7 days" value={data.sessionsCompletedLast7Days} />
      </Grid>

      {/* Activation funnel */}
      <SectionTitle>Activation funnel <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: 13 }}>· last 7 days (event volume)</span></SectionTitle>
      <div style={cardStyle}>
        {FUNNEL.map((step) => {
          const v = counts[step.key] || 0;
          const pct = Math.round((v / funnelMax) * 100);
          return (
            <div key={step.key} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: "var(--text-primary)" }}>
                <span>{step.label}</span>
                <span style={{ color: "var(--text-secondary)" }}>{fmt(v)}</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: "rgba(109,106,248,0.12)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent, #6d6af8)", borderRadius: 999, transition: "width .3s ease" }} />
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          Bars are relative to “{FUNNEL[0].label}”. Event counts, not unique users —
          a rough activation read for the test cohort.
        </p>
      </div>

      {/* Top events */}
      <SectionTitle>Top events <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: 13 }}>· last 7 days</span></SectionTitle>
      <div style={cardStyle}>
        {(data.topEventsLast7Days || []).length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No events yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: 12 }}>
                <th style={{ padding: "6px 0" }}>Event</th>
                <th style={{ padding: "6px 0", textAlign: "right" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.topEventsLast7Days.map((e) => (
                <tr key={e.name} style={{ borderTop: "1px solid var(--card-border, #eee)" }}>
                  <td style={{ padding: "8px 0", color: "var(--text-primary)", fontFamily: "monospace" }}>{e.name}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", color: "var(--text-primary)" }}>{fmt(e.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cohort retention — do crews come back week after week? */}
      <SectionTitle>
        Cohort retention <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: 13 }}>· time studied in the cohort room (a day counts at 5+ min) · data since Oct 5, 2026</span>
      </SectionTitle>
      {!retention ? (
        <div style={cardStyle}><p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Loading…</p></div>
      ) : retention.cohorts.length === 0 ? (
        <div style={cardStyle}><p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No cohort study time logged yet.</p></div>
      ) : (
        retention.cohorts.map((c) => <CohortRetentionCard key={c.id} cohort={c} today={retention.today} />)
      )}

      {/* Testers — per-person activity (the September view) */}
      <SectionTitle>
        Testers <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: 13 }}>· did each person sign up → join a room → finish a session → come back</span>
      </SectionTitle>
      <div style={cardStyle}>
        {!testers || testers.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No tester activity yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: 12 }}>
                  <th style={{ padding: "6px 8px 6px 0" }}>Tester</th>
                  <th style={{ padding: "6px 8px", textAlign: "center" }}>Signed up</th>
                  <th style={{ padding: "6px 8px", textAlign: "center" }}>Room</th>
                  <th style={{ padding: "6px 8px", textAlign: "center" }}>Session</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Active days</th>
                  <th style={{ padding: "6px 0 6px 8px", textAlign: "right" }}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {testers.map((t) => (
                  <tr key={t.userId} style={{ borderTop: "1px solid var(--card-border, #eee)" }}>
                    <td style={{ padding: "8px 8px 8px 0", color: "var(--text-primary)" }}>
                      <div style={{ fontWeight: 600 }}>{t.name || "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.email || t.userId}</div>
                    </td>
                    <td style={{ padding: 8, textAlign: "center" }}>{t.signedUp ? "✅" : "—"}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{t.joinedRoom ? "✅" : "—"}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{t.completedSession ? "✅" : "—"}</td>
                    <td style={{ padding: 8, textAlign: "right", color: "var(--text-primary)" }}>{t.activeDays}</td>
                    <td style={{ padding: "8px 0 8px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {new Date(t.lastSeen).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cohort retention card ─────────────────────────────────────────────────────
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekLabel(key) {
  return new Date(key + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function fmtMins(m) {
  if (!m) return "0m";
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
}

// 0 = empty, then light to strong by minutes studied that day.
function dayColor(min) {
  if (!min) return "var(--accent-soft, #eef0fb)";
  if (min < 5) return "rgba(124,58,237,0.18)";
  if (min < 30) return "rgba(124,58,237,0.40)";
  if (min < 60) return "rgba(124,58,237,0.65)";
  return "rgba(124,58,237,0.95)";
}

function CohortRetentionCard({ cohort, today }) {
  const weeks = cohort.perWeek;
  const cur = weeks.length - 1;
  // The first week with anyone active is the baseline for the curve.
  const firstActive = weeks.findIndex((w) => w.activeMembers > 0);
  const base = firstActive >= 0 ? weeks[firstActive].activeMembers : 0;
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{cohort.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            {cohort.memberCount} members · {cohort.syncMode === "SOLO" ? "self-paced" : "in sync"} · {cohort.visibility === "PRIVATE" ? "private" : "public"}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
          This week: <strong>{weeks[cur].activeMembers}/{cohort.memberCount}</strong> active · <strong>{weeks[cur].threePlusDays}</strong> on 3+ days · <strong>{fmtMins(weeks[cur].minutes)}</strong>
        </div>
      </div>

      {/* Weekly active members — the retention curve. */}
      {/* Weeks before the cohort's first active week are just empty bars — skip them. */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(weeks.length - Math.max(0, firstActive), 1)}, minmax(0, 72px))`, gap: 8, alignItems: "end", marginBottom: 16 }}>
        {weeks.map((w, i) => i < firstActive ? null : (() => {
          const pct = cohort.memberCount ? (w.activeMembers / cohort.memberCount) * 100 : 0;
          const vsBase = base && i > firstActive ? Math.round((w.activeMembers / base) * 100) : null;
          return (
            <div key={w.weekStart} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{w.activeMembers}</div>
              <div style={{ height: 64, display: "flex", alignItems: "flex-end", justifyContent: "center", margin: "4px 0" }}>
                <div
                  title={`${w.activeMembers} active · ${w.threePlusDays} on 3+ days · ${fmtMins(w.minutes)}`}
                  style={{ width: "70%", height: `${Math.max(4, pct)}%`, borderRadius: 6, background: "var(--accent, #6d6af8)", opacity: w.partial ? 0.6 : 1 }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{weekLabel(w.weekStart)}{w.partial ? " (now)" : ""}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-secondary)" }}>{fmtMins(w.minutes)}{vsBase != null ? ` · ${vsBase}% of wk 1` : ""}</div>
            </div>
          );
        })())}
      </div>

      {/* Per member: this week day by day, plus last week. */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: 12 }}>
              <th style={{ padding: "6px 8px 6px 0" }}>Member</th>
              {DOW.map((d) => <th key={d} style={{ padding: "6px 2px", textAlign: "center", fontWeight: 500 }}>{d}</th>)}
              <th style={{ padding: "6px 8px", textAlign: "right" }}>This week</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Last week</th>
              <th style={{ padding: "6px 0 6px 8px", textAlign: "right" }}>Last active</th>
            </tr>
          </thead>
          <tbody>
            {cohort.members.map((m) => {
              const tw = m.perWeek[cur];
              const lw = m.perWeek[cur - 1];
              return (
                <tr key={m.userId} style={{ borderTop: "1px solid var(--card-border, #eee)" }}>
                  <td style={{ padding: "8px 8px 8px 0", color: "var(--text-primary)", fontWeight: 600, whiteSpace: "nowrap" }}>{m.name}</td>
                  {m.daily.map((d) => (
                    <td key={d.day} style={{ padding: "6px 2px", textAlign: "center" }}>
                      <span
                        title={`${d.day}: ${fmtMins(d.minutes)}`}
                        style={{ display: "inline-block", width: 22, height: 22, borderRadius: 6, background: d.day > today ? "transparent" : dayColor(d.minutes), border: d.day === today ? "1.5px solid var(--accent, #6d6af8)" : "1px solid var(--card-border, #eee)" }}
                      />
                    </td>
                  ))}
                  <td style={{ padding: 8, textAlign: "right", color: "var(--text-primary)" }}>{tw.days}d · {fmtMins(tw.minutes)}</td>
                  <td style={{ padding: 8, textAlign: "right", color: "var(--text-secondary)" }}>{lw ? `${lw.days}d · ${fmtMins(lw.minutes)}` : "—"}</td>
                  <td style={{ padding: "8px 0 8px 8px", textAlign: "right", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{m.lastActiveDay ? weekLabel(m.lastActiveDay) : "never"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── small presentational helpers ──────────────────────────────────────────────
function fmt(n) {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

const cardStyle = {
  background: "var(--card-bg, #fff)",
  border: "1px solid var(--card-border, #ececf5)",
  borderRadius: 18,
  padding: "18px 20px",
  boxShadow: "0 12px 30px rgba(74,90,133,0.06)",
  marginBottom: 26,
};

const btnStyle = {
  height: 38,
  padding: "0 16px",
  borderRadius: 999,
  border: "none",
  background: "var(--accent, #6d6af8)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 16, color: "var(--text-primary)", margin: "6px 0 12px", fontWeight: 600 }}>
      {children}
    </h2>
  );
}

function Grid({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 26 }}>
      {children}
    </div>
  );
}

function Stat({ label, hint, value, accent }) {
  return (
    <div
      style={{
        ...cardStyle,
        marginBottom: 0,
        borderColor: accent ? "rgba(109,106,248,0.35)" : "var(--card-border, #ececf5)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: accent ? "var(--accent, #6d6af8)" : "var(--text-primary)", lineHeight: 1.2, marginTop: 4 }}>
        {fmt(value)}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ minHeight: "calc(100vh - 120px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: "var(--text-secondary)", fontFamily: "'Inter', system-ui" }}>
      {children}
    </div>
  );
}
