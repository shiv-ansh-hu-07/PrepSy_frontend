import React, { useState, useEffect } from "react";
import { useWindowWidth } from "../hooks/useBreakpoint";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AppSideNav from "../components/AppSideNav";
import { Users } from "lucide-react";

const PAGE_BG = "var(--page-bg)";

export default function MyCohorts() {
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isMobile = w < 640;
  const isTablet = w < 1024;

  const [cohorts, setCohorts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get("/cohorts")
      .then(({ data }) => {
        if (active) setCohorts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setError("Couldn't load your cohorts.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    api
      .get("/cohorts/recommended")
      .then(({ data }) => { if (active) setRecommended(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
          gridTemplateColumns: isTablet ? "minmax(0, 1fr)" : "288px minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {!isTablet && <AppSideNav />}

        <main style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontFamily: "Georgia, serif", color: "var(--text-primary)" }}>
                YouTube Cohorts
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
                Study groups built from YouTube playlists. Open one for its roadmap, sessions, discussions, and quizzes.
              </p>
            </div>
            <button onClick={() => navigate("/learn")} style={btnPrimary(false)}>
              + Create Cohort
            </button>
          </div>

          {recommended.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>✨ Recommended for you</p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {recommended.map((c) => (
                  <button key={c.id} onClick={() => navigate(`/cohort/${c.id}`)} style={{ ...card, marginBottom: 0, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
                    {c.thumbnailUrl && (
                      <img src={c.thumbnailUrl} alt="" style={{ width: "100%", height: 110, borderRadius: 10, objectFit: "cover" }} />
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</h3>
                      {c.playlistTitle && <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.playlistTitle}</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--accent-soft)", color: "var(--accent)" }}>✨ {c.reason}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 12 }}><Users size={13} /> {c.memberCount}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ ...card, textAlign: "center", color: "var(--text-secondary)" }}>Loading your cohorts…</div>
          ) : error ? (
            <div style={{ ...card, background: "#fff5f5", border: "1px solid #fecaca", color: "#c62828" }}>{error}</div>
          ) : cohorts.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ margin: 0, fontWeight: 800, color: "var(--text-primary)", fontSize: 16 }}>No cohorts yet</p>
              <p style={{ margin: "8px 0 18px", color: "var(--text-secondary)", fontSize: 14 }}>
                Analyze a YouTube playlist and create a study cohort to learn together.
              </p>
              <button onClick={() => navigate("/learn")} style={btnPrimary(false)}>
                Create a Cohort →
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
              }}
            >
              {cohorts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/cohort/${c.id}`)}
                  style={{
                    ...card,
                    marginBottom: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {c.playlist?.thumbnailUrl && (
                    <img
                      src={c.playlist.thumbnailUrl}
                      alt=""
                      style={{ width: "100%", height: 130, borderRadius: 12, objectFit: "cover" }}
                    />
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{c.name}</h3>
                    {c.playlist?.title && (
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{c.playlist.title}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>
                    <Users size={14} />
                    {c._count?.members ?? 0} member{(c._count?.members ?? 0) === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
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

const btnPrimary = (disabled) => ({
  height: 46,
  padding: "0 24px",
  borderRadius: 12,
  border: "none",
  background: disabled ? "var(--card-border)" : "var(--accent-gradient)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
});
