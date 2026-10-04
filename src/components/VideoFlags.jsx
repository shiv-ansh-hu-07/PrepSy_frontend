/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { Flag, Trash2, CornerDownRight } from "lucide-react";

// Video flags ("checkpointers"): notes pinned to a moment in a playlist video.
// Anyone in the cohort can drop one at the current time; everyone sees it on
// the video's timeline, gets a toast when playback reaches it, and can reply.

export function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

// "20:00", "1:02:30" or plain seconds → seconds (null if unparseable).
function parseTime(text) {
  const t = (text || "").trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(":").map((x) => Number(x));
  if (parts.some((n) => !Number.isFinite(n) || n < 0) || parts.length > 3) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export default function VideoFlags({
  flags = [],
  videos = [],
  currentVideoId = null,
  currentUserId = null,
  isCreator = false,
  getTime = () => 0,
  getDuration = () => 0,
  canSeek = true,
  onSeek,
  onCreate,
  onReply,
  onDelete,
}) {
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState("");
  const [atText, setAtText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [, setTick] = useState(0);

  // Keep the "Flag at mm:ss" label and the timeline playhead fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const titleOf = (vid) => videos.find((v) => v.ytVideoId === vid)?.title || "Video";
  const indexOf = (vid) => Math.max(0, videos.findIndex((v) => v.ytVideoId === vid)) + 1;
  const now = getTime() || 0;
  const duration = getDuration() || 0;
  const mine = flags.filter((f) => f.videoId === currentVideoId);
  const list = showAll ? flags : mine;

  const submit = async () => {
    const content = note.trim();
    if (!content || !currentVideoId) return;
    const at = atText.trim() ? parseTime(atText) : Math.floor(now);
    if (at == null) { setError("Use a time like 20:00"); return; }
    setSaving(true);
    setError("");
    try {
      await onCreate?.({ videoId: currentVideoId, timeSec: at, content });
      setNote("");
      setAtText("");
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't add the flag");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (flagId) => {
    const text = replyText.trim();
    if (!text) return;
    try {
      await onReply?.(flagId, text);
      setReplyText("");
      setReplyFor(null);
    } catch {
      /* keep the text so they can retry */
    }
  };

  return (
    <div style={st.wrap}>
      {/* Add a flag at the current moment (or a typed time). */}
      <div style={st.composer}>
        <p style={st.composerTitle}><Flag size={13} /> Flag a moment {currentVideoId ? `in #${indexOf(currentVideoId)}` : ""}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Important formula here / I didn't get this part — anyone?"
          rows={2}
          maxLength={1000}
          style={st.textarea}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
        />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            value={atText}
            onChange={(e) => setAtText(e.target.value)}
            placeholder={fmtTime(now)}
            title="Leave empty to flag the current moment, or type a time like 20:00"
            style={st.timeInput}
          />
          <button type="button" onClick={submit} disabled={saving || !note.trim() || !currentVideoId} style={st.addBtn(saving || !note.trim() || !currentVideoId)}>
            {saving ? "Adding…" : `🚩 Flag at ${atText.trim() || fmtTime(now)}`}
          </button>
        </div>
        {error && <p style={{ margin: 0, fontSize: 11.5, color: "#ef4444" }}>{error}</p>}
      </div>

      {/* Timeline of this video's flags. */}
      {duration > 0 && (
        <div style={st.timeline} title="Flags on this video's timeline">
          <div style={{ ...st.playhead, left: `${Math.min(100, (now / duration) * 100)}%` }} />
          {mine.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => canSeek && onSeek?.(f.videoId, f.timeSec)}
              title={`${fmtTime(f.timeSec)} · ${f.author?.name || "Member"}: ${f.content}`}
              style={{ ...st.marker, left: `calc(${Math.min(100, (f.timeSec / duration) * 100)}% - 5px)`, cursor: canSeek ? "pointer" : "default" }}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={st.sectionLabel}>{showAll ? `All flags (${flags.length})` : `This video (${mine.length})`}</span>
        <button type="button" onClick={() => setShowAll((v) => !v)} style={st.linkBtn}>
          {showAll ? "This video only" : `All videos (${flags.length})`}
        </button>
      </div>

      {list.length === 0 && (
        <p style={st.empty}>
          {showAll ? "No flags yet in this cohort." : "No flags on this video yet — drop one where something matters."}
        </p>
      )}

      {list.map((f) => {
        const canDelete = f.author?.id === currentUserId || isCreator;
        const passed = f.videoId === currentVideoId && now >= f.timeSec;
        return (
          <div key={f.id} style={st.flagCard(passed)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => canSeek && onSeek?.(f.videoId, f.timeSec)}
                disabled={!canSeek}
                style={st.timeChip(canSeek)}
                title={canSeek ? "Jump to this moment" : "Only the host can move the room"}
              >
                🚩 {fmtTime(f.timeSec)}
              </button>
              <span style={st.author}>{f.author?.name || "Member"}</span>
              {canDelete && (
                <button type="button" onClick={() => onDelete?.(f.id)} style={st.iconBtn} title="Remove flag">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            {showAll && f.videoId !== currentVideoId && (
              <p style={st.videoLabel}>#{indexOf(f.videoId)} {titleOf(f.videoId)}</p>
            )}
            <p style={st.content}>{f.content}</p>

            {(f.replies || []).map((r) => (
              <div key={r.id} style={st.reply}>
                <CornerDownRight size={12} style={{ flexShrink: 0, marginTop: 2, color: "var(--text-muted)" }} />
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-primary)", lineHeight: 1.45 }}>
                  <strong>{r.author?.name || "Member"}</strong> {r.content}
                </p>
              </div>
            ))}

            {replyFor === f.id ? (
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendReply(f.id); if (e.key === "Escape") setReplyFor(null); }}
                  placeholder="Reply…"
                  maxLength={1000}
                  style={st.replyInput}
                />
                <button type="button" onClick={() => sendReply(f.id)} disabled={!replyText.trim()} style={st.addBtn(!replyText.trim())}>Send</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setReplyFor(f.id); setReplyText(""); }} style={st.linkBtn}>
                Reply{f.replies?.length ? ` · ${f.replies.length}` : ""}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const st = {
  wrap: { padding: 12, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" },
  composer: { display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)" },
  composerTitle: { margin: 0, fontSize: 12, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 },
  textarea: { width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--input-bg, var(--card-bg))", color: "var(--text-primary)", padding: "8px 10px", fontSize: 12.5, fontFamily: "inherit", outline: "none" },
  timeInput: { width: 70, height: 32, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", padding: "0 8px", fontSize: 12, outline: "none" },
  addBtn: (disabled) => ({ flex: 1, height: 32, borderRadius: 8, border: "none", background: disabled ? "var(--card-border)" : "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: disabled ? "default" : "pointer", padding: "0 10px", whiteSpace: "nowrap" }),
  timeline: { position: "relative", height: 14, borderRadius: 999, background: "var(--accent-soft)", margin: "2px 4px" },
  playhead: { position: "absolute", top: -2, width: 2, height: 18, background: "var(--text-muted)", borderRadius: 1 },
  marker: { position: "absolute", top: 2, width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", border: "2px solid var(--card-bg)", padding: 0 },
  sectionLabel: { fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--text-muted)" },
  linkBtn: { alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--accent)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" },
  empty: { margin: 0, fontSize: 12, color: "var(--text-muted)" },
  flagCard: (passed) => ({ display: "flex", flexDirection: "column", gap: 4, padding: 10, borderRadius: 12, border: `1px solid ${passed ? "rgba(245,158,11,0.5)" : "var(--card-border)"}`, background: "var(--card-bg)" }),
  timeChip: (clickable) => ({ border: "none", borderRadius: 999, padding: "2px 9px", fontSize: 11.5, fontWeight: 800, background: "rgba(245,158,11,0.16)", color: "#d97706", cursor: clickable ? "pointer" : "default", flexShrink: 0 }),
  author: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  iconBtn: { background: "none", border: "none", padding: 2, color: "var(--text-muted)", cursor: "pointer", flexShrink: 0 },
  videoLabel: { margin: 0, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  content: { margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  reply: { display: "flex", gap: 6, padding: "4px 0 0 4px" },
  replyInput: { flex: 1, minWidth: 0, height: 30, borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", padding: "0 8px", fontSize: 12, outline: "none" },
};
