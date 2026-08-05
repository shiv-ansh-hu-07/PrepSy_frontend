import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AppSideNav from "../components/AppSideNav";
import { Users } from "lucide-react";

const PAGE_BG = "radial-gradient(ellipse at top, #eef1fb 0%, #f3f5fc 48%, #f8f9fe 100%)";

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

export default function MyCohorts() {
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isMobile = w < 600;
  const isTablet = w < 900;

  const [cohorts, setCohorts] = useState([]);
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
          gridTemplateColumns: isTablet ? "1fr" : "288px minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {!isTablet && <AppSideNav />}

        <main style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontFamily: "Georgia, serif", color: "#2f3b63" }}>
              My Cohorts
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6b78a0" }}>
              Study groups you've created or joined. Open one to see its roadmap, sessions, discussions, and quizzes.
            </p>
          </div>

          {loading ? (
            <div style={{ ...card, textAlign: "center", color: "#6b78a0" }}>Loading your cohorts…</div>
          ) : error ? (
            <div style={{ ...card, background: "#fff5f5", border: "1px solid #fecaca", color: "#c62828" }}>{error}</div>
          ) : cohorts.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ margin: 0, fontWeight: 800, color: "#3f4f7a", fontSize: 16 }}>No cohorts yet</p>
              <p style={{ margin: "8px 0 18px", color: "#6b78a0", fontSize: 14 }}>
                Analyze a YouTube playlist and create a study cohort to learn together.
              </p>
              <button onClick={() => navigate("/learn")} style={btnPrimary(false)}>
                Go to YouTube Learning →
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
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
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#2f3b63" }}>{c.name}</h3>
                    {c.playlist?.title && (
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b78a0" }}>{c.playlist.title}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8a9bd6", fontSize: 12, fontWeight: 600 }}>
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
  border: "1px solid rgba(190,200,235,0.52)",
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 8px 28px rgba(74,90,133,0.07)",
  backdropFilter: "blur(10px)",
  padding: "22px 22px",
  marginBottom: 20,
};

const btnPrimary = (disabled) => ({
  height: 46,
  padding: "0 24px",
  borderRadius: 12,
  border: "none",
  background: disabled ? "#c5cde8" : "#8a9bd6",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
});
