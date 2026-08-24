import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MessageSquare,
  LogOut,
  Copy,
  CloudRain,
  Sparkles,
  Sunset,
  ChevronDown,
  Brain,
  Download,
  Upload,
} from "lucide-react";
import useMediaControls from "../hooks/useMediaControl";
import useFocusMonitor from "../hooks/useFocusMonitor";
import { useNavigate } from "react-router-dom";
import AmbientBackground from "./AmbientBackground";
import { SCENE_LIST } from "./ambientScenes";
import PomodoroTimer from "./PomodoroTimer";
import { useParticipants } from "@livekit/components-react";
import { useEffect, useRef, useState } from "react";
import api, { fetchMyProfile, saveFocusSession } from "../services/api";

export default function RoomLayout({
  children,
  roomId,
  roomName,
  onToggleChat,
  hasUnreadMessages = false,
  roomDurationMinutes = 90,
}) {
  const {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leaveRoom: leaveMediaRoom,
    micEnabled,
    camEnabled,
    screenEnabled,
    screenShareError,
  } = useMediaControls();

  const [aiMonitorEnabled, setAiMonitorEnabled] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [consentMsg, setConsentMsg] = useState("");

  // Focus monitoring only ever runs with explicit camera-analysis consent.
  const focusMonitor = useFocusMonitor({ enabled: camEnabled && aiMonitorEnabled && hasConsent, intervalMs: 5000 });

  const handleToggleAiMonitor = () => {
    if (!hasConsent) {
      setConsentMsg("Enable “AI Focus Analysis Consent” in your Profile before using focus monitoring.");
      window.setTimeout(() => setConsentMsg(""), 4000);
      return;
    }
    setAiMonitorEnabled((v) => !v);
  };

  const navigate = useNavigate();
  const participants = useParticipants();
  const participantCount = participants.length;

  const [notes, setNotes] = useState("");
  const [railTab, setRailTab] = useState("pomodoro"); // "pomodoro" | "notes"
  const [shareStatus, setShareStatus] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const [focusSummary, setFocusSummary] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );

  // Ambient stage wallpaper — remembered across sessions.
  const [scene, setScene] = useState(() => {
    if (typeof window === "undefined") return "rainy-night";
    return localStorage.getItem("roomScene") || "rainy-night";
  });
  useEffect(() => {
    try {
      localStorage.setItem("roomScene", scene);
    } catch {
      /* ignore storage errors */
    }
  }, [scene]);

  useEffect(() => {
    if (!shareStatus) return undefined;
    const id = window.setTimeout(() => setShareStatus(""), 2200);
    return () => window.clearTimeout(id);
  }, [shareStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setIsMobile(window.innerWidth < 980);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  useEffect(() => {
    fetchMyProfile().then((res) => {
      const consent = !!res?.profile?.aiMonitorConsent;
      setHasConsent(consent);
      if (consent) setAiMonitorEnabled(true);
    }).catch(() => {});
  }, []);

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    setShowSummary(true);

    // Grab focus summary before camera stops
    const fs = focusMonitor.getSessionSummary();
    setFocusSummary(fs);

    try {
      const res = await api.post(`/rooms/${roomId}/leave`);
      setSummary(res.data);

      if (fs && fs.totalSamples >= 6) {
        saveFocusSession({
          roomId,
          roomName: roomName || res.data?.roomName,
          ...fs,
        }).catch((err) =>
          console.warn("[FocusMonitor] Could not save session:", err?.message)
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLeaving(false);
    }
  };

  const handleCloseSummary = async () => {
    await leaveMediaRoom();
    navigate("/dashboard");
  };

  const handleScreenShare = () => {
    toggleScreenShare();
  };

  const downloadNotesAsPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("Times", "Normal");
    doc.setFontSize(16);
    doc.text("PrepSy Study Notes", 20, 20);
    doc.setFontSize(12);
    doc.text(notes || "No notes written.", 20, 40, { maxWidth: 170 });
    doc.save("prepsy-notes.pdf");
  };

  // Upload a plain-text notes file — replaces the current editor contents.
  const handleUploadNotes = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNotes(String(reader.result || ""));
    reader.readAsText(file);
    e.target.value = ""; // let the same file be re-selected later
  };

  const copyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setShareStatus("Room ID copied");
    } catch {
      setShareStatus("Copy failed");
    }
  };

  const buildControls = (onDark) => (
    <>
      <Control icon={micEnabled ? Mic : MicOff} active={micEnabled} onClick={toggleMic} onDark={onDark} />
      <Control icon={camEnabled ? Video : VideoOff} active={camEnabled} onClick={toggleCamera} onDark={onDark} />
      <Control
        icon={ScreenShare}
        active={screenEnabled}
        title="Share screen"
        onClick={handleScreenShare}
        onDark={onDark}
      />
      <Control
        icon={MessageSquare}
        onClick={onToggleChat}
        alert={hasUnreadMessages}
        title={hasUnreadMessages ? "New messages" : "Open chat"}
        onDark={onDark}
      />
      <span style={onDark ? styles.dockDivider : styles.barDivider} />
      <Control icon={LogOut} danger onClick={handleLeave} onDark={onDark} />
    </>
  );

  return (
    <div style={styles.page}>
      {screenShareError && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#f8fafc", fontSize: 13, fontWeight: 500,
          padding: "10px 18px", borderRadius: 12, zIndex: 9999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)", whiteSpace: "nowrap",
          maxWidth: "90vw", textAlign: "center",
        }}>
          {screenShareError}
        </div>
      )}
      {consentMsg && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#f8fafc", fontSize: 13, fontWeight: 500,
          padding: "10px 18px", borderRadius: 12, zIndex: 9999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)", maxWidth: "90vw", textAlign: "center",
        }}>
          {consentMsg}
        </div>
      )}
      <div style={styles.centerWrap(isMobile)}>
        <div style={styles.stageWrap}>
          <div style={styles.roomHeaderBar}>
            <div style={styles.roomHeaderTextWrap}>
              <p style={styles.roomHeaderName}>{roomName || "Study Room"}</p>
            </div>
            <div style={styles.roomHeaderActions}>
              <AiFocusChip
                enabled={aiMonitorEnabled}
                hasConsent={hasConsent}
                monitor={focusMonitor}
                onToggle={handleToggleAiMonitor}
              />
              <button type="button" style={styles.roomHeaderButton} onClick={copyRoomId}>
                <Copy size={15} />
                {shareStatus || "Share"}
              </button>
            </div>
          </div>

          {isMobile && (
            <div style={styles.sessionBadge}>
              <span style={styles.liveDot} />
              {participantCount} {participantCount === 1 ? "person" : "people"} studying
              <span style={styles.sessionDivider}>•</span>
              Focus session
            </div>
          )}

          <div style={styles.stage} data-room-stage>
            <AmbientBackground scene={scene} />
            {!isMobile && (
              <div style={styles.sessionBadgeDesktop}>
                <span style={styles.liveDot} />
                {participantCount} {participantCount === 1 ? "person" : "people"} studying
                <span style={styles.sessionDivider}>•</span>
                Focus session
              </div>
            )}
            <SceneChip scene={scene} onChange={setScene} />
            <div style={styles.stageContent}>{children}</div>
            {!isMobile && <div style={styles.stageDock}>{buildControls(true)}</div>}
          </div>

          {isMobile && <div style={styles.mobileControls}>{buildControls(false)}</div>}
        </div>

        <div style={styles.sidePanel(isMobile)}>
          <div style={styles.railPanel(isMobile)}>
            <div style={styles.railTabs}>
              <button
                type="button"
                onClick={() => setRailTab("pomodoro")}
                style={{ ...styles.railTab, ...(railTab === "pomodoro" ? styles.railTabActive : null) }}
              >
                Pomodoro
              </button>
              <button
                type="button"
                onClick={() => setRailTab("notes")}
                style={{ ...styles.railTab, ...(railTab === "notes" ? styles.railTabActive : null) }}
              >
                Notes
              </button>
            </div>

            <div style={styles.railBody}>
              {railTab === "pomodoro" ? (
                <PomodoroTimer onLeaveRoom={handleLeave} roomDurationMinutes={roomDurationMinutes} />
              ) : (
                <NotesPanel
                  notes={notes}
                  onChange={setNotes}
                  onDownload={downloadNotesAsPDF}
                  onUpload={handleUploadNotes}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showSummary && (
        <LeaveSummaryModal
          summary={summary}
          focusSummary={focusSummary}
          loading={!summary}
          onClose={handleCloseSummary}
        />
      )}
    </div>
  );
}

// ── AI Focus chip (header) ───────────────────────────────────────────────────

function AiFocusChip({ enabled, hasConsent, monitor, onToggle }) {
  const level = monitor.currentLevel;
  const isLive = enabled && monitor.status === "active";
  const showScore = isLive && level && typeof level.score === "number";
  const scoreColor = level?.color || "#22c55e";

  const title = !hasConsent
    ? "Enable “AI Focus Analysis Consent” in your Profile first"
    : enabled
      ? "AI focus analysis on — tap to turn off"
      : "Tap to turn on AI focus analysis";

  return (
    <div style={styles.aiChip} title={title}>
      <Brain size={15} color="var(--violet-text)" />
      <span style={styles.aiChipLabel}>AI Focus</span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        style={{
          ...styles.aiChipToggle,
          background: enabled ? "#7c3aed" : "var(--card-border)",
          cursor: hasConsent ? "pointer" : "not-allowed",
          opacity: hasConsent ? 1 : 0.6,
        }}
      >
        <span style={{ ...styles.aiChipKnob, left: enabled ? 17 : 2 }} />
      </button>
      {showScore ? (
        <span style={{ ...styles.aiChipScore, color: scoreColor }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: scoreColor }} />
          {level.score}
        </span>
      ) : (
        <span style={styles.aiChipOff}>Off</span>
      )}
    </div>
  );
}

// ── Notes panel (rail) ───────────────────────────────────────────────────────

function NotesPanel({ notes, onChange, onDownload, onUpload }) {
  const inputRef = useRef(null);
  return (
    <div style={styles.notesPanel}>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Save your notes here…"
        style={styles.notesArea}
      />
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        onChange={onUpload}
        style={{ display: "none" }}
      />
      <div style={styles.notesActions}>
        <button type="button" style={styles.notesDownloadBtn} onClick={onDownload}>
          <Download size={16} /> Download PDF
        </button>
        <button type="button" style={styles.notesUploadBtn} onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> Upload
        </button>
      </div>
    </div>
  );
}

// ── Leave Summary Modal ──────────────────────────────────────────────────────

function LeaveSummaryModal({ summary, focusSummary, loading, onClose }) {
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...modalStyles.card, position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>

        {loading ? (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Wrapping up…</h2>
            <p style={modalStyles.text}>Saving your session data…</p>
          </>
        ) : (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Nice work in {summary?.roomName}</h2>
            <p style={modalStyles.text}>{summary?.message}</p>

            <div style={modalStyles.stats}>
              <StatBox label="Time spent" value={summary?.totalTimeLabel} />
              <StatBox label="Studied with" value={`${summary?.studiedWithCount ?? 0} people`} />
              <StatBox label="Streak" value={`🔥 ${summary?.streak ?? 0} day${summary?.streak === 1 ? "" : "s"}`} />
            </div>

            {focusSummary && <FocusSummarySection data={focusSummary} />}

            {!focusSummary && (
              <p style={{ marginTop: 16, fontSize: 12, color: "#b0b8d8", textAlign: "center" }}>
                Turn on camera during sessions to get AI focus analysis
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FocusSummarySection({ data }) {
  const scoreColor = data.focusScore >= 75 ? "#22c55e" : data.focusScore >= 50 ? "#f59e0b" : "#ef4444";
  const verdict =
    data.focusScore >= 80 ? "Excellent focus session!" :
    data.focusScore >= 65 ? "Good focus — keep it up" :
    data.focusScore >= 50 ? "Moderate focus today" :
    "Room to improve focus";

  return (
    <div style={focusStyles.section}>
      <p style={focusStyles.heading}>AI Focus Analysis</p>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
        {/* Score ring */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: scoreColor + "18",
          border: `3px solid ${scoreColor}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {data.focusScore}
          </span>
          <span style={{ fontSize: 8, color: scoreColor, opacity: 0.8, fontWeight: 600 }}>/100</span>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{verdict}</p>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            Engagement {data.engagementScore}% · {data.distractionCount} distraction{data.distractionCount === 1 ? "" : "s"}
            {data.offScreenSeconds > 0 ? ` · ${data.offScreenSeconds}s off-screen` : ""}
          </p>
        </div>
      </div>

      {/* High/Med/Low bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", height: 8 }}>
          {data.highFocusPercent > 0 && (
            <div style={{ width: `${data.highFocusPercent}%`, background: "#22c55e" }} />
          )}
          {data.medFocusPercent > 0 && (
            <div style={{ width: `${data.medFocusPercent}%`, background: "#f59e0b" }} />
          )}
          {data.lowFocusPercent > 0 && (
            <div style={{ width: `${data.lowFocusPercent}%`, background: "#ef4444" }} />
          )}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
          {[
            { label: "High", pct: data.highFocusPercent, color: "#22c55e" },
            { label: "Medium", pct: data.medFocusPercent, color: "#f59e0b" },
            { label: "Low", pct: data.lowFocusPercent, color: "#ef4444" },
          ].map(({ label, pct, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{label} {pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={modalStyles.stat}>
      <p style={modalStyles.label}>{label}</p>
      <p style={modalStyles.value}>{value}</p>
    </div>
  );
}

// ── Control button ───────────────────────────────────────────────────────────

function Control({ icon, danger, active, onClick, disabled, title, alert, onDark }) {
  const IconComponent = icon;

  // `onDark` = the floating glass dock over the ambient stage; otherwise the
  // light bar (used on mobile / non-ambient surfaces).
  const background = onDark
    ? disabled
      ? "rgba(255,255,255,0.04)"
      : danger
        ? "#F87171"
        : active
          ? "linear-gradient(135deg,#7c3aed,#8a9bd6)"
          : "rgba(255,255,255,0.06)"
    : disabled
      ? "var(--card-bg)"
      : danger
        ? "#F87171"
        : active
          ? "var(--accent)"
          : "var(--card-bg)";

  const boxShadow = onDark
    ? active
      ? "0 6px 16px rgba(124,58,237,0.45)"
      : danger
        ? "0 6px 16px rgba(248,113,113,0.4)"
        : "none"
    : active
      ? "0 6px 18px rgba(138,155,214,0.45)"
      : "0 4px 12px rgba(0,0,0,0.08)";

  const iconColor = onDark
    ? disabled
      ? "#64748B"
      : danger || active
        ? "#FFFFFF"
        : "#E2E8F0"
    : disabled
      ? "#94A3B8"
      : danger
        ? "#FFFFFF"
        : "var(--text-secondary)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        border: onDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid var(--card-border)",
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow,
        transform: active ? "translateY(-1px)" : "none",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.6 : 1,
        position: "relative",
      }}
    >
      <IconComponent size={20} color={iconColor} />
      {alert && !disabled && <span style={styles.alertDot} />}
    </button>
  );
}

// ── Scene picker (ambient wallpaper) ─────────────────────────────────────────

const SCENE_ICONS = { rain: CloudRain, stars: Sparkles, dusk: Sunset };

function SceneChip({ scene, onChange }) {
  const [open, setOpen] = useState(false);
  const current = SCENE_LIST.find((s) => s.id === scene) || SCENE_LIST[0];
  const CurrentIcon = SCENE_ICONS[current.icon] || CloudRain;

  return (
    <div style={styles.sceneWrap}>
      <button
        type="button"
        style={styles.sceneChip}
        onClick={() => setOpen((v) => !v)}
        title="Change room scene"
      >
        <CurrentIcon size={15} color="#a5b4fc" />
        <span>{current.label}</span>
        <ChevronDown
          size={13}
          color="#94a3b8"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {open && (
        <div style={styles.sceneMenu}>
          {SCENE_LIST.map((s) => {
            const Icon = SCENE_ICONS[s.icon] || CloudRain;
            const isActive = s.id === scene;
            return (
              <button
                key={s.id}
                type="button"
                style={{ ...styles.sceneItem, ...(isActive ? styles.sceneItemActive : null) }}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
              >
                <Icon size={15} color={isActive ? "#c4b5fd" : "#94a3b8"} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const focusStyles = {
  section: {
    marginTop: 18,
    padding: "14px 16px",
    background: "var(--card-bg)",
    borderRadius: 14,
    border: "1px solid var(--card-border)",
  },
  heading: {
    margin: "0 0 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#6f3bd6",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.52)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
  },
  card: {
    width: "min(100%, 460px)",
    background: "var(--card-bg)",
    borderRadius: 20,
    padding: "28px 24px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
    textAlign: "center",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    border: "none",
    background: "transparent",
    fontSize: 18,
    cursor: "pointer",
    color: "var(--text-secondary)",
    lineHeight: 1,
  },
  tag: { fontSize: 11, color: "var(--accent)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px", fontFamily: "Georgia, serif" },
  text: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 18 },
  stats: { display: "flex", gap: 10, justifyContent: "space-between" },
  stat: { flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 12, border: "1px solid var(--card-border)" },
  label: { fontSize: 11, color: "var(--text-secondary)", margin: "0 0 4px" },
  value: { fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 },
};

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    background: "var(--page-bg)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
    padding: "10px 12px 18px",
    boxSizing: "border-box",
    gap: 10,
  },
  centerWrap: (m) => ({
    width: "100%",
    maxWidth: 1420,
    alignItems: "stretch",
    display: "grid",
    gridTemplateColumns: m ? "minmax(0, 1fr)" : "minmax(0, 1.92fr) minmax(300px, 0.68fr)",
    gap: 16,
    boxSizing: "border-box",
    // Desktop: definite height + a shrinkable row so the video fills and the
    // side panel scrolls internally. Mobile: let it flow.
    ...(m
      ? { minHeight: "calc(100vh - 118px)" }
      : { height: "calc(100vh - 118px)", gridTemplateRows: "minmax(0, 1fr)" }),
  }),
  stageWrap: { position: "relative", minHeight: 360, display: "flex", flexDirection: "column", gap: 10 },
  roomHeaderBar: {
    minHeight: 42, padding: "8px 14px", borderRadius: 16,
    border: "1px solid var(--card-border)", background: "var(--card-bg)",
    boxShadow: "0 8px 20px rgba(74,90,133,0.08)",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  roomHeaderTextWrap: { minWidth: 0, display: "flex", alignItems: "center" },
  roomHeaderName: { margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  roomHeaderButton: {
    height: 30, padding: "0 11px", borderRadius: 999,
    border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-primary)",
    fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", flexShrink: 0, fontSize: 14,
  },
  sessionBadge: {
    fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7,
    background: "var(--card-bg)", padding: "8px 12px", borderRadius: 16,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)", backdropFilter: "blur(6px)",
  },
  sessionBadgeDesktop: {
    position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 20,
    fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7,
    background: "var(--card-bg)", padding: "8px 14px", borderRadius: 999,
    boxShadow: "0 8px 18px rgba(0,0,0,0.14)", backdropFilter: "blur(8px)",
  },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e" },
  sessionDivider: { color: "#94A3B8" },
  stage: {
    width: "100%", minHeight: 360, flex: 1, borderRadius: 24,
    border: "1px solid rgba(238,242,255,0.8)", background: "#05070b",
    overflow: "hidden", display: "flex", alignItems: "stretch", justifyContent: "stretch",
    position: "relative", boxShadow: "0 16px 32px rgba(15,23,42,0.14)",
  },
  // Sits above <AmbientBackground /> (zIndex 0) so the participant / screen
  // content renders over the wallpaper, not behind it.
  stageContent: {
    position: "relative", zIndex: 1, flex: 1, minWidth: 0,
    display: "flex", alignItems: "stretch", justifyContent: "stretch",
  },
  bottomBarDesktop: {
    marginTop: 10, alignSelf: "center", width: "fit-content", maxWidth: "100%",
    display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
    padding: "8px 14px", background: "var(--card-bg)", borderRadius: 20,
    boxShadow: "0 8px 20px rgba(0,0,0,0.16)", flexShrink: 0,
  },
  mobileControls: {
    width: "100%", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
    padding: "8px 12px", background: "var(--card-bg)", borderRadius: 16,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  },
  // Floating glass control dock overlaid on the stage (desktop).
  stageDock: {
    position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 30,
    display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", borderRadius: 20,
    background: "rgba(12,16,28,0.68)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 12px 34px rgba(0,0,0,0.5)",
    maxWidth: "calc(100% - 32px)", flexWrap: "wrap", justifyContent: "center",
  },
  dockDivider: { width: 1, height: 28, background: "rgba(255,255,255,0.12)", margin: "0 2px" },
  barDivider: { width: 1, height: 28, background: "rgba(0,0,0,0.10)", margin: "0 2px" },
  sceneWrap: { position: "absolute", top: 14, right: 14, zIndex: 30 },
  sceneChip: {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999,
    background: "rgba(10,14,26,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.10)", color: "#cbd5e1", fontSize: 12, fontWeight: 500,
    cursor: "pointer",
  },
  sceneMenu: {
    position: "absolute", top: "calc(100% + 8px)", right: 0, display: "flex", flexDirection: "column",
    gap: 2, padding: 6, minWidth: 168, borderRadius: 14, background: "rgba(12,16,28,0.92)",
    backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
  },
  sceneItem: {
    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px",
    borderRadius: 10, background: "transparent", color: "#cbd5e1", fontSize: 13, fontWeight: 500,
    cursor: "pointer", textAlign: "left",
  },
  sceneItemActive: { background: "rgba(124,58,237,0.18)", color: "#e9ddff" },
  sidePanel: (m) => ({
    display: "flex", flexDirection: "column", gap: 14,
    maxWidth: m ? "100%" : 380, width: "100%", justifySelf: "end",
  }),
  roomHeaderActions: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  aiChip: {
    display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 12px",
    borderRadius: 999, background: "var(--input-bg)", border: "1px solid var(--input-border)",
  },
  aiChipLabel: { fontSize: 12, fontWeight: 600, color: "var(--violet-text)", whiteSpace: "nowrap" },
  aiChipToggle: {
    width: 34, height: 19, borderRadius: 10, border: "none", position: "relative",
    transition: "background 0.2s", flexShrink: 0, padding: 0,
  },
  aiChipKnob: {
    position: "absolute", top: 2, width: 15, height: 15, borderRadius: "50%",
    background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.25)", transition: "left 0.2s",
  },
  aiChipScore: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 800, minWidth: 22 },
  aiChipOff: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" },
  railPanel: (m) => ({
    background: "radial-gradient(circle at 50% 0%, rgba(138,155,214,0.14), transparent 62%), var(--card-bg)",
    borderRadius: 22, border: "1px solid var(--accent-soft)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
    display: "flex", flexDirection: "column", padding: 16, gap: 12,
    ...(m ? { minHeight: 460 } : { flex: 1, minHeight: 0 }),
  }),
  railTabs: {
    display: "flex", gap: 4, padding: 5, borderRadius: 14,
    background: "var(--input-bg)", flexShrink: 0,
  },
  railTab: {
    flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10,
    border: "none", background: "transparent", cursor: "pointer",
    fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
    fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  },
  railTabActive: {
    background: "var(--accent-gradient)", color: "#fff",
    boxShadow: "0 6px 14px rgba(124,58,237,0.28)",
  },
  railBody: { flex: 1, minHeight: 0, position: "relative", display: "flex" },
  notesPanel: { flex: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column" },
  notesArea: {
    flex: 1, minHeight: 120, width: "100%", borderRadius: 14, border: "1px solid var(--card-border)",
    padding: 12, fontSize: 13, color: "var(--text-primary)", background: "var(--input-bg)",
    fontFamily: "'Inter', system-ui, -apple-system", resize: "none", outline: "none",
    lineHeight: 1.6, boxSizing: "border-box",
  },
  notesActions: { display: "flex", gap: 10, marginTop: 12, flexShrink: 0 },
  notesDownloadBtn: {
    flex: 1, height: 44, borderRadius: 13, border: "none", background: "var(--accent-gradient)",
    color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    boxShadow: "0 8px 20px rgba(124,58,237,0.3)",
  },
  notesUploadBtn: {
    flex: 1, height: 44, borderRadius: 13, cursor: "pointer",
    border: "1px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.10)",
    color: "var(--violet-text)", fontWeight: 600, fontSize: 13,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  },
  card: {
    background: "radial-gradient(circle at center, rgba(138,155,214,0.14), transparent 65%), var(--card-bg)",
    borderRadius: 22, padding: 18, border: "1px solid var(--accent-soft)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column",
  },
  cardTitle: { marginBottom: 10, fontSize: 15, fontWeight: 600, fontFamily: "Georgia, serif", color: "var(--text-secondary)" },
  notesBox: {
    flex: 1, minHeight: 140, borderRadius: 16, border: "1px solid var(--card-border)",
    padding: 12, marginTop: 6, marginBottom: 10, fontSize: 13,
    fontFamily: "'Inter', system-ui, -apple-system", color: "var(--text-secondary)",
    resize: "vertical", background: "var(--card-bg)",
  },
  saveBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10,
    height: 44, borderRadius: 14, border: "none", background: "var(--accent-gradient)",
    color: "#FFFFFF", fontWeight: 600, cursor: "pointer",
    boxShadow: "0 8px 22px rgba(99,102,241,0.28)",
  },
  alertDot: {
    position: "absolute", top: 9, right: 9, width: 10, height: 10,
    borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,0.18)",
  },
  loadingDot: (delay) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--text-muted)",
    animation: `pulse ${1.2}s ${delay}ms infinite`,
  }),
};
