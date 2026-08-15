import React, { useEffect, useState } from "react";
import { useWindowWidth } from "../hooks/useBreakpoint";
import { useNavigate } from "react-router-dom";
import { Trophy, Flame } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AppSideNav from "../components/AppSideNav";

const initialsOf = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.map((p) => p[0]?.toUpperCase()).join("").slice(0, 2) : "PS";
};
const resolveAvatar = (url) =>
  !url ? null : url.startsWith("/uploads/") ? `${import.meta.env.VITE_API_BASE_URL}${url}` : url;
const fmtMin = (m) => {
  const t = Math.max(0, Math.round(m || 0));
  const h = Math.floor(t / 60);
  const min = t % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};
const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Avatar({ person, size = 40 }) {
  const src = resolveAvatar(person?.avatarUrl);
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--card-border)" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #6f7fc0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>
      {initialsOf(person?.name)}
    </div>
  );
}

function Toggle({ value, options, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 999, background: "var(--accent-soft)" }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{ padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: active ? "var(--accent-gradient, #7c3aed)" : "transparent", color: active ? "#fff" : "var(--text-secondary)" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isNarrow = w < 1024;

  const [scope, setScope] = useState("friends");
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/leaderboard", { params: { scope, period } })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope, period, user?.id]);

  const entries = data?.entries || [];
  const me = data?.me;
  const meInTop = entries.some((e) => e.isMe);

  const row = (e) => (
    <div key={e.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 14,
      border: e.isMe ? "1px solid var(--accent)" : "1px solid var(--card-border)",
      background: e.isMe ? "var(--accent-soft)" : "var(--card-bg)" }}>
      <div style={{ width: 30, textAlign: "center", fontSize: MEDAL[e.rank] ? 20 : 14, fontWeight: 800, color: "var(--text-secondary)", flexShrink: 0 }}>
        {MEDAL[e.rank] || e.rank}
      </div>
      <Avatar person={e} />
      <p style={{ margin: 0, flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {e.name}{e.isMe ? " (You)" : ""}
      </p>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: 13.5, color: "var(--accent)", flexShrink: 0 }}>
        <Flame size={14} /> {fmtMin(e.focusMinutes)}
      </span>
    </div>
  );

  return (
    <div style={{ minHeight: "calc(100vh - 76px)", padding: "32px 24px 56px", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)", gap: 24 }}>
        {!isNarrow && <AppSideNav />}

        <main style={{ minWidth: 0, maxWidth: 720 }}>
          <h1 style={{ margin: "0 0 4px", fontFamily: "Georgia, serif", fontSize: 30, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            <Trophy size={26} style={{ color: "#f59e0b" }} /> Leaderboard
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)" }}>
            Focus time ranks. Study more to climb — compete with friends or everyone on PrepSy.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <Toggle value={scope} onChange={setScope} options={[{ id: "friends", label: "Friends" }, { id: "global", label: "Global" }]} />
            <Toggle value={period} onChange={setPeriod} options={[{ id: "week", label: "This week" }, { id: "all", label: "All time" }]} />
          </div>

          {loading ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading rankings…</p>
          ) : entries.length === 0 ? (
            <div style={{ border: "1px solid var(--card-border)", borderRadius: 18, background: "var(--card-bg)", padding: "28px 22px", textAlign: "center" }}>
              <Trophy size={26} style={{ color: "var(--accent)" }} />
              <p style={{ margin: "10px 0 4px", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                {scope === "friends" ? "No ranked friends yet" : "No study time logged yet"}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                {scope === "friends"
                  ? "Add friends and study in focus-tracked rooms to compete here."
                  : "Join a room with focus tracking on to appear on the board."}
              </p>
              {scope === "friends" && (
                <button onClick={() => navigate("/people")} style={{ marginTop: 16, height: 38, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  Find your people →
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entries.map(row)}
              </div>
              {!meInTop && me && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--card-border)" }}>
                  {row({ userId: user?.id, rank: me.rank ?? "—", name: me.name || "You", avatarUrl: me.avatarUrl, focusMinutes: me.focusMinutes, isMe: true })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
