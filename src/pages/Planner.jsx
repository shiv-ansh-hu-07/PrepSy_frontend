import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sparkles, Send, CheckCircle2, Circle, Trash2, Plus, CalendarDays, Clock, Target, ChevronDown } from "lucide-react";
import AppSideNav from "../components/AppSideNav";
import RichText from "../components/RichText";
import { useBreakpoint } from "../hooks/useBreakpoint";
import api from "../services/api";
import { track } from "../services/analytics";

// AI Study Planner — a short chat collects what you study, your goal,
// deadline and weekly time, then builds a descriptive week-by-week schedule
// of the important topics that you can tick off as you go.

const GREETING = {
  role: "assistant",
  content: "Hi! I'll build you a personalised study plan. First, what are you studying or preparing for?",
};
const FIRST_SUGGESTIONS = ["DSA for placements", "GATE CSE", "JEE / NEET", "A new skill (e.g. web dev)"];
const DRAFT_KEY = "prepsy_planner_draft";

const FIELD_LABELS = {
  subject: "Studying",
  currentLevel: "Level",
  goal: "Goal",
  deadline: "Deadline",
  hoursPerDay: "Hours / day",
  daysPerWeek: "Days / week",
  weakAreas: "Weak areas",
  resources: "Resources",
};
const REQUIRED = ["subject", "currentLevel", "goal", "deadline", "hoursPerDay", "daysPerWeek"];

const TYPE_STYLE = {
  learn: { label: "Learn", bg: "rgba(99,102,241,0.12)", fg: "#4f46e5" },
  practice: { label: "Practice", bg: "rgba(34,197,94,0.12)", fg: "#15803d" },
  revise: { label: "Revise", bg: "rgba(245,158,11,0.14)", fg: "#b45309" },
  test: { label: "Test", bg: "rgba(239,68,68,0.12)", fg: "#b91c1c" },
};

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}
function todayKey() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export default function Planner() {
  const { id } = useParams();
  const { isMobile, isTablet } = useBreakpoint();
  return (
    <div style={{ minHeight: "calc(100vh - 76px)", padding: isMobile ? "20px 16px 48px" : "32px 24px 56px" }}>
      <div style={{ width: "100%", maxWidth: 1360, margin: "0 auto", display: "grid", gridTemplateColumns: isTablet ? "minmax(0, 1fr)" : "288px minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        {!isTablet && <AppSideNav />}
        <main style={{ minWidth: 0 }}>{id ? <PlanView id={id} isMobile={isMobile} /> : <PlannerChat isMobile={isMobile} />}</main>
      </div>
    </div>
  );
}

// ── Chat intake ──────────────────────────────────────────────────────────────
function PlannerChat({ isMobile }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (Array.isArray(d?.messages) && d.messages.length) return d.messages;
    } catch { /* ignore */ }
    return [GREETING];
  });
  const [collected, setCollected] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null")?.collected || {}; } catch { return {}; }
  });
  const [suggestions, setSuggestions] = useState(FIRST_SUGGESTIONS);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/planner/plans").then(({ data }) => setPlans(data || [])).catch(() => setPlans([]));
  }, []);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ messages, collected })); } catch { /* ignore */ }
    const c = endRef.current?.parentElement;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages, collected, thinking]);

  const missing = REQUIRED.filter((k) => collected[k] == null || collected[k] === "");
  const canBuild = missing.length === 0;

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || thinking || building) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setSuggestions([]);
    setThinking(true);
    setError("");
    try {
      // The greeting is UI-only; the AI starts from the user's first answer.
      const { data } = await api.post("/planner/chat", { messages: next.filter((m) => m !== GREETING && m.content !== GREETING.content) });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      setCollected(data.collected || {});
      setSuggestions(data.suggestions || []);
      setReady(Boolean(data.ready));
    } catch (err) {
      setError(err?.response?.data?.message || "The planner didn't respond. Please try again.");
    } finally {
      setThinking(false);
    }
  };

  const build = async () => {
    if (!canBuild || building) return;
    setBuilding(true);
    setError("");
    try {
      const { data } = await api.post("/planner/plans", { profile: collected, messages });
      track("study_plan_created", { weeks: data?.plan?.meta?.totalWeeks });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      navigate(`/planner/${data.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't build the plan. Please try again.");
      setBuilding(false);
    }
  };

  const restart = () => {
    setMessages([GREETING]);
    setCollected({});
    setSuggestions(FIRST_SUGGESTIONS);
    setReady(false);
    setError("");
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) 300px", gap: 16, alignItems: "start" }}>
      <div style={{ ...card, padding: 0, display: "flex", flexDirection: "column", height: isMobile ? "70vh" : "calc(100vh - 170px)", minHeight: 460 }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 12, background: "var(--accent-gradient, var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={18} color="#fff" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>AI Study Planner</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>A few questions, then a week-by-week plan of everything important.</p>
          </div>
          {messages.length > 1 && (
            <button type="button" onClick={restart} style={ghostBtn} title="Start over">Start over</button>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%" }}>
              <div style={{ padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.5, background: m.role === "user" ? "var(--accent-gradient, var(--accent))" : "var(--accent-soft)", color: m.role === "user" ? "#fff" : "var(--text-primary)", borderBottomRightRadius: m.role === "user" ? 4 : 16, borderBottomLeftRadius: m.role === "user" ? 16 : 4 }}>
                <RichText text={m.content} dark={m.role === "user"} />
              </div>
            </div>
          ))}
          {thinking && (
            <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: 16, background: "var(--accent-soft)", color: "var(--text-muted)", fontSize: 13 }}>
              Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {(ready || canBuild) && !thinking && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--card-border)", background: "linear-gradient(135deg, var(--accent-soft), transparent)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
              {building ? "Building your plan… this takes about 30 seconds." : ready ? "All set — ready to build your plan." : "I have enough to build a plan (you can keep chatting to refine it)."}
            </p>
            <button type="button" onClick={build} disabled={building} style={primaryBtn(building)}>
              {building ? "Building…" : "✨ Build my plan"}
            </button>
          </div>
        )}

        <div style={{ padding: 12, borderTop: "1px solid var(--card-border)" }}>
          {suggestions.length > 0 && !thinking && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} style={chip}>{s}</button>
              ))}
            </div>
          )}
          {error && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#ef4444" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Type your answer…"
              disabled={building}
              style={{ flex: 1, minWidth: 0, height: 42, borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", padding: "0 14px", fontSize: 14, outline: "none" }}
            />
            <button type="button" onClick={() => send()} disabled={!input.trim() || thinking || building} style={{ ...primaryBtn(!input.trim() || thinking || building), width: 46, padding: 0 }} title="Send">
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={card}>
          <p style={sideTitle}>What I know so far</p>
          {Object.keys(FIELD_LABELS).map((k) => {
            const v = collected[k];
            const has = v != null && v !== "";
            if (!has && !REQUIRED.includes(k)) return null;
            return (
              <div key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0", fontSize: 13 }}>
                {has ? <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} /> : <Circle size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />}
                <span style={{ color: "var(--text-secondary)", flexShrink: 0, width: 86 }}>{FIELD_LABELS[k]}</span>
                <span style={{ color: has ? "var(--text-primary)" : "var(--text-muted)", fontWeight: has ? 600 : 400, minWidth: 0, wordBreak: "break-word" }}>
                  {has ? (k === "deadline" ? fmtDate(String(v)) : String(v)) : "—"}
                </span>
              </div>
            );
          })}
        </div>

        <div style={card}>
          <p style={sideTitle}>Your plans</p>
          {plans == null ? (
            <p style={muted}>Loading…</p>
          ) : plans.length === 0 ? (
            <p style={muted}>Your saved plans will show up here.</p>
          ) : (
            plans.map((p) => {
              const total = (p.plan?.weeks || []).reduce((a, w) => a + (w.topics?.length || 0), 0);
              const done = Object.keys(p.progress || {}).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <button key={p.id} type="button" onClick={() => navigate(`/planner/${p.id}`)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 0", border: "none", borderTop: "1px solid var(--card-border)", background: "transparent", cursor: "pointer" }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>{p.title}</p>
                  <p style={{ margin: "2px 0 6px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {p.plan?.meta?.deadline ? `Until ${fmtDate(p.plan.meta.deadline)} · ` : ""}{pct}% done
                  </p>
                  <Bar pct={pct} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan view ────────────────────────────────────────────────────────────────
function PlanView({ id, isMobile }) {
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({});
  const [open, setOpen] = useState({});

  useEffect(() => {
    api.get(`/planner/plans/${id}`)
      .then(({ data }) => { setRecord(data); setProgress(data.progress || {}); })
      .catch(() => setError("Plan not found."));
  }, [id]);

  const plan = record?.plan;
  const weeks = useMemo(() => plan?.weeks || [], [plan]);
  const today = todayKey();
  const currentIdx = weeks.findIndex((w) => today >= w.startDate && today <= w.endDate);
  const totalTopics = weeks.reduce((a, w) => a + w.topics.length, 0);
  const doneTopics = weeks.reduce((a, w) => a + w.topics.filter((t) => progress[t.id]).length, 0);
  const pct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;
  // Expected progress by now — are you on track?
  const expected = weeks.length && currentIdx >= 0 ? Math.round((currentIdx / weeks.length) * 100) : null;

  const isOpen = (i) => (open[i] !== undefined ? open[i] : i === currentIdx || (currentIdx < 0 && i === 0));

  const toggle = async (topicId) => {
    const done = !progress[topicId];
    setProgress((p) => { const n = { ...p }; if (done) n[topicId] = true; else delete n[topicId]; return n; });
    try {
      await api.patch(`/planner/plans/${id}/progress`, { topicId, done });
    } catch {
      setProgress((p) => { const n = { ...p }; if (done) delete n[topicId]; else n[topicId] = true; return n; });
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this plan?")) return;
    await api.delete(`/planner/plans/${id}`).catch(() => {});
    navigate("/planner");
  };

  if (error) return <div style={card}><p style={muted}>{error}</p><button type="button" style={{ ...primaryBtn(false), marginTop: 10 }} onClick={() => navigate("/planner")}>Back to planner</button></div>;
  if (!plan) return <div style={card}><p style={muted}>Loading your plan…</p></div>;
  const meta = plan.meta || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...card, border: "1px solid var(--accent)", background: "linear-gradient(135deg, var(--accent-soft), var(--card-bg) 65%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--accent)" }}>Your study plan</p>
            <h1 style={{ margin: "4px 0 6px", fontSize: isMobile ? 21 : 25, fontFamily: "Georgia, serif", color: "var(--text-primary)" }}>{plan.title}</h1>
            {plan.summary && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)", maxWidth: 760 }}>{plan.summary}</p>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => navigate("/planner")} style={ghostBtn}><Plus size={14} /> New plan</button>
            <button type="button" onClick={remove} style={{ ...ghostBtn, color: "#ef4444" }} title="Delete plan"><Trash2 size={14} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <MetaChip icon={CalendarDays} text={`${fmtDate(meta.startDate)} → ${fmtDate(meta.deadline)} · ${meta.totalWeeks} weeks`} />
          <MetaChip icon={Clock} text={`${meta.hoursPerDay}h/day · ${meta.daysPerWeek} days/week · ~${Math.round(meta.totalHours || 0)}h total`} />
          {record.profile?.goal && <MetaChip icon={Target} text={record.profile.goal} />}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>
            <span><strong style={{ color: "var(--text-primary)" }}>{doneTopics}/{totalTopics}</strong> topics done · {pct}%</span>
            {expected != null && (
              <span style={{ fontWeight: 700, color: pct >= expected ? "#16a34a" : "#b45309" }}>
                {pct >= expected ? "On track" : `Behind: aim for ${expected}% by now`}
              </span>
            )}
          </div>
          <Bar pct={pct} big />
        </div>
      </div>

      {plan.phases?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 160 : 200}px, 1fr))`, gap: 10 }}>
          {plan.phases.map((ph, i) => {
            const active = currentIdx >= 0 && currentIdx + 1 >= ph.fromWeek && currentIdx + 1 <= ph.toWeek;
            return (
              <div key={i} style={{ ...card, padding: 14, border: `1px solid ${active ? "var(--accent)" : "var(--card-border)"}` }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: active ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Phase {i + 1} · {meta.weeksPerEntry > 1 ? "blocks" : "weeks"} {ph.fromWeek}–{ph.toWeek}{active ? " · now" : ""}
                </p>
                <p style={{ margin: "4px 0 2px", fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{ph.name}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>{ph.goal}</p>
              </div>
            );
          })}
        </div>
      )}

      {weeks.map((w, i) => {
        const wDone = w.topics.filter((t) => progress[t.id]).length;
        const hours = w.topics.reduce((a, t) => a + (t.hours || 0), 0);
        const current = i === currentIdx;
        const past = currentIdx >= 0 && i < currentIdx;
        const expanded = isOpen(i);
        return (
          <div key={w.index} style={{ ...card, padding: 0, border: `1px solid ${current ? "var(--accent)" : "var(--card-border)"}`, overflow: "hidden" }}>
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !expanded }))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "none", background: current ? "var(--accent-soft)" : "transparent", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, background: wDone === w.topics.length && w.topics.length ? "#22c55e" : current ? "var(--accent)" : "var(--accent-soft)", color: wDone === w.topics.length && w.topics.length ? "#fff" : current ? "#fff" : "var(--accent)" }}>
                {wDone === w.topics.length && w.topics.length ? "✓" : w.index}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: current ? "var(--accent)" : "var(--text-muted)" }}>
                  {w.label} · {fmtDate(w.startDate)}–{fmtDate(w.endDate)}{current ? " · this week" : past && wDone < w.topics.length ? " · unfinished" : ""}
                </span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{w.focus}</span>
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0, textAlign: "right" }}>
                {wDone}/{w.topics.length} · {Math.round(hours)}h
              </span>
              <ChevronDown size={16} style={{ flexShrink: 0, color: "var(--text-muted)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {expanded && (
              <div style={{ padding: "4px 16px 16px" }}>
                {w.topics.map((t) => {
                  const done = Boolean(progress[t.id]);
                  const ts = TYPE_STYLE[t.type] || TYPE_STYLE.learn;
                  return (
                    <div key={t.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid var(--card-border)" }}>
                      <button type="button" onClick={() => toggle(t.id)} title={done ? "Mark as not done" : "Mark as done"} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, marginTop: 1 }}>
                        {done ? <CheckCircle2 size={20} color="#22c55e" /> : <Circle size={20} color="var(--text-muted)" />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{t.title}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: ts.bg, color: ts.fg }}>{ts.label}</span>
                          {t.hours ? <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>~{t.hours}h</span> : null}
                        </div>
                        {t.description && <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>{t.description}</p>}
                      </div>
                    </div>
                  );
                })}
                {w.milestone && (
                  <div style={{ marginTop: 6, padding: "9px 12px", borderRadius: 12, background: "rgba(34,197,94,0.10)", color: "#15803d", fontSize: 13, fontWeight: 700 }}>
                    🎯 Milestone: {w.milestone}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {plan.tips?.length > 0 && (
        <div style={card}>
          <p style={sideTitle}>Tips for you</p>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", fontSize: 13.5, lineHeight: 1.6 }}>
            {plan.tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function MetaChip({ icon, text }) {
  const IconComponent = icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-secondary)", maxWidth: "100%" }}>
      <IconComponent size={13} style={{ flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
    </span>
  );
}

function Bar({ pct, big = false }) {
  return (
    <div style={{ height: big ? 8 : 5, borderRadius: 999, background: "var(--accent-soft)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 999, transition: "width .4s ease" }} />
    </div>
  );
}

const card = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  borderRadius: 20,
  padding: 18,
  boxShadow: "var(--card-shadow, 0 8px 24px rgba(15,23,42,0.06))",
};
const sideTitle = { margin: "0 0 8px", fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-muted)" };
const muted = { margin: 0, fontSize: 13, color: "var(--text-muted)" };
const chip = { padding: "6px 12px", borderRadius: 999, border: "1px solid var(--accent)", background: "var(--card-bg)", color: "var(--accent)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
const ghostBtn = { height: 34, padding: "0 12px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 };
const primaryBtn = (disabled) => ({ height: 42, padding: "0 18px", borderRadius: 12, border: "none", background: disabled ? "var(--card-border)" : "var(--accent-gradient, var(--accent))", color: "#fff", fontWeight: 700, fontSize: 14, cursor: disabled ? "default" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" });
