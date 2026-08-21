import React, { useCallback, useEffect, useState } from "react";
import { fetchEventsSummary, fetchEventsTesters } from "../services/api";

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
  const [status, setStatus] = useState("loading"); // loading | ok | denied | error

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetchEventsSummary();
      setData(res);
      setStatus("ok");
      fetchEventsTesters().then(setTesters).catch(() => setTesters([]));
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
