import { useMemo, useState } from "react";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import api from "../services/api";

// "This week's plan" for a room created from an AI study plan. The owner
// ticks topics off (same progress as on /planner); everyone else sees the plan
// read-only and can copy it into their own planner (re-dated to start today).

const TYPE = {
  learn: { label: "Learn", fg: "#6366f1", bg: "rgba(99,102,241,0.16)" },
  practice: { label: "Practice", fg: "#16a34a", bg: "rgba(34,197,94,0.16)" },
  revise: { label: "Revise", fg: "#d97706", bg: "rgba(245,158,11,0.18)" },
  test: { label: "Test", fg: "#dc2626", bg: "rgba(239,68,68,0.16)" },
};

function fmt(iso) {
  return iso ? new Date(iso + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" }) : "";
}

export default function RoomPlanPanel({ roomPlan }) {
  const weeks = useMemo(() => roomPlan?.plan?.weeks || [], [roomPlan]);
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const currentIdx = Math.max(0, weeks.findIndex((w) => today >= w.startDate && today <= w.endDate));
  const [idx, setIdx] = useState(currentIdx);
  const [progress, setProgress] = useState(roomPlan?.progress || {});
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(null);
  const week = weeks[idx];
  if (!week) return <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>This plan has no weeks.</p>;

  const toggle = async (topicId) => {
    if (!roomPlan.isOwner) return;
    const done = !progress[topicId];
    setProgress((p) => { const n = { ...p }; if (done) n[topicId] = true; else delete n[topicId]; return n; });
    try {
      await api.patch(`/planner/plans/${roomPlan.id}/progress`, { topicId, done });
    } catch {
      setProgress((p) => { const n = { ...p }; if (done) delete n[topicId]; else n[topicId] = true; return n; });
    }
  };

  const copy = async () => {
    setCopying(true);
    try {
      const { data } = await api.post(`/planner/plans/${roomPlan.id}/copy`);
      setCopied(data.id);
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't copy the plan.");
    } finally {
      setCopying(false);
    }
  };

  const done = week.topics.filter((t) => progress[t.id]).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overflowY: "auto", width: "100%" }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-muted)" }}>This room follows</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{roomPlan.title}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} style={navBtn(idx === 0)} title="Previous week"><ChevronLeft size={15} /></button>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: idx === currentIdx ? "var(--accent)" : "var(--text-muted)" }}>
            {week.label} · {fmt(week.startDate)}–{fmt(week.endDate)}{idx === currentIdx ? " · now" : ""}
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 13.5, fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{week.focus}</p>
        </div>
        <button type="button" onClick={() => setIdx((i) => Math.min(weeks.length - 1, i + 1))} disabled={idx === weeks.length - 1} style={navBtn(idx === weeks.length - 1)} title="Next week"><ChevronRight size={15} /></button>
      </div>

      {roomPlan.isOwner && (
        <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)" }}>{done}/{week.topics.length} done this week</p>
      )}

      {week.topics.map((t) => {
        const isDone = Boolean(progress[t.id]);
        const ty = TYPE[t.type] || TYPE.learn;
        return (
          <div key={t.id} style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
            {roomPlan.isOwner ? (
              <button type="button" onClick={() => toggle(t.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, marginTop: 1 }} title={isDone ? "Mark as not done" : "Mark as done"}>
                {isDone ? <CheckCircle2 size={17} color="#22c55e" /> : <Circle size={17} color="var(--text-muted)" />}
              </button>
            ) : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.6 : 1 }}>{t.title}</span>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: ty.bg, color: ty.fg }}>{ty.label}</span>
                {t.hours ? <span style={{ fontSize: 11, color: "var(--text-muted)" }}>~{t.hours}h</span> : null}
              </div>
              {t.description && <p style={{ margin: "3px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--text-secondary)" }}>{t.description}</p>}
            </div>
          </div>
        );
      })}

      {week.milestone && (
        <p style={{ margin: 0, padding: "8px 10px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "#16a34a", fontSize: 12, fontWeight: 700 }}>🎯 {week.milestone}</p>
      )}

      {!roomPlan.isOwner && (
        copied ? (
          <a href={`/planner/${copied}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>
            ✓ Copied. Open your copy →
          </a>
        ) : (
          <button type="button" onClick={copy} disabled={copying} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 10, border: "1px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 12.5, fontWeight: 700, cursor: copying ? "default" : "pointer" }}>
            <Copy size={14} /> {copying ? "Copying…" : "Copy this plan to my planner"}
          </button>
        )
      )}
    </div>
  );
}

const navBtn = (disabled) => ({
  width: 28, height: 28, flexShrink: 0, borderRadius: 8, border: "1px solid var(--card-border)",
  background: "transparent", color: disabled ? "var(--card-border)" : "var(--text-secondary)",
  cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
});
