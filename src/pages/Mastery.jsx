import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AppSideNav from "../components/AppSideNav";

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

const LEVEL = {
  weak: { color: "#dc2626", track: "rgba(239,68,68,0.15)" },
  strong: { color: "#16a34a", track: "rgba(34,197,94,0.15)" },
  developing: { color: "#e65100", track: "rgba(245,158,11,0.15)" },
};

function TopicRow({ t }) {
  const c = LEVEL[t.level] || LEVEL.developing;
  return (
    <div style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{t.topic}</span>
        <span style={{ fontWeight: 800, fontSize: 13, color: c.color, flexShrink: 0 }}>{t.accuracy}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: c.track, overflow: "hidden" }}>
        <div style={{ width: `${t.accuracy}%`, height: "100%", borderRadius: 999, background: c.color, transition: "width 300ms ease" }} />
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{t.correct}/{t.attempted} correct</p>
    </div>
  );
}

function Section({ icon: Icon, title, color, hint, topics }) {
  if (!topics?.length) return null;
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Icon size={17} style={{ color }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {hint ? <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--text-secondary)" }}>{hint}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {topics.map((t) => <TopicRow key={t.topic} t={t} />)}
      </div>
    </section>
  );
}

export default function Mastery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isNarrow = w < 960;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/mastery")
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const hasData = data && data.totalQuestions > 0;

  return (
    <div style={{ minHeight: "calc(100vh - 76px)", padding: "32px 24px 56px", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)", gap: 24 }}>
        {!isNarrow && <AppSideNav />}

        <main style={{ minWidth: 0, maxWidth: 860 }}>
          <h1 style={{ margin: "0 0 4px", fontFamily: "Georgia, serif", fontSize: 30, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            <Brain size={26} style={{ color: "var(--accent)" }} /> Concept Mastery
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: 14, color: "var(--text-secondary)" }}>
            Built from your quiz answers — where you're strong, and what to revise next.
          </p>

          {loading ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Analyzing your quizzes…</p>
          ) : !hasData ? (
            <div style={{ border: "1px dashed var(--accent)", borderRadius: 18, background: "var(--accent-soft)", padding: "30px 24px", textAlign: "center" }}>
              <Target size={28} style={{ color: "var(--accent)" }} />
              <p style={{ margin: "12px 0 4px", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>No quiz data yet</p>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>
                Take a quiz in any YouTube cohort and your strong points and weak concepts will show up here.
              </p>
              <button onClick={() => navigate("/cohorts")} style={{ height: 40, padding: "0 20px", borderRadius: 12, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                Go to cohorts →
              </button>
            </div>
          ) : (
            <>
              {/* Overview */}
              <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 26 }}>
                {[
                  { label: "Overall accuracy", value: `${data.overallAccuracy}%` },
                  { label: "Questions answered", value: data.totalQuestions },
                  { label: "Quizzes taken", value: data.quizzesTaken },
                ].map((s) => (
                  <div key={s.label} style={{ border: "1px solid var(--card-border)", borderRadius: 16, background: "var(--card-bg)", padding: "16px 18px" }}>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{s.value}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {data.weak.length === 0 && data.strong.length === 0 && data.developing.length > 0 && (
                <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-secondary)" }}>
                  Answer a few more questions per topic to unlock your strong/weak breakdown.
                </p>
              )}

              <Section icon={AlertTriangle} title="Weak concepts — revise these" color="#dc2626"
                hint="Below 50% accuracy. Prioritise these before your next study session." topics={data.weak} />
              <Section icon={TrendingUp} title="Strong concepts" color="#16a34a"
                hint="70%+ accuracy — you've got these down." topics={data.strong} />
              <Section icon={Target} title="Keep practicing" color="#e65100"
                hint="Not enough answers yet to judge — take more quizzes on these." topics={data.developing} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
