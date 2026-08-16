import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, AlertTriangle, Target } from "lucide-react";
import api from "../services/api";

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

function Section({ icon, title, hint, topics }) {
  if (!topics?.length) return null;
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        {icon}
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {hint ? <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--text-secondary)" }}>{hint}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {topics.map((t) => <TopicRow key={t.topic} t={t} />)}
      </div>
    </section>
  );
}

// Concept mastery built from the user's quiz answers. Used inside Analytics.
export default function MasteryPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/mastery")
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const hasData = data && data.totalQuestions > 0;

  if (loading) return <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Analyzing your quizzes…</p>;

  if (!hasData) {
    return (
      <div style={{ border: "1px dashed var(--accent)", borderRadius: 18, background: "var(--accent-soft)", padding: "30px 24px", textAlign: "center" }}>
        <Target size={26} style={{ color: "var(--accent)" }} />
        <p style={{ margin: "12px 0 4px", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>No quiz data yet</p>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>
          Take a quiz in any YouTube cohort and your strong points and weak concepts will show up here.
        </p>
        <button onClick={() => navigate("/cohorts")} style={{ height: 40, padding: "0 20px", borderRadius: 12, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
          Go to cohorts →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
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

      <Section icon={<AlertTriangle size={17} style={{ color: "#dc2626" }} />} title="Weak concepts — revise these"
        hint="Below 50% accuracy. Prioritise these before your next study session." topics={data.weak} />
      <Section icon={<TrendingUp size={17} style={{ color: "#16a34a" }} />} title="Strong concepts"
        hint="70%+ accuracy — you've got these down." topics={data.strong} />
      <Section icon={<Target size={17} style={{ color: "#e65100" }} />} title="Keep practicing"
        hint="Not enough answers yet to judge — take more quizzes on these." topics={data.developing} />
    </div>
  );
}
