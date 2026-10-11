import React from "react";

// Contents of the room's mini window: just the Pomodoro countdown and the AI
// focus score. It renders into a separate document that has none of the app's
// stylesheets, so every colour here is literal (no CSS variables).
export default function MiniFocusTile({ time, phase, urgent = false, focus = null, roomName = "" }) {
  return (
    <div style={styles.tile}>
      <div style={styles.left}>
        <div style={{ ...styles.time, color: urgent ? "#fb7185" : "#f8fafc" }}>{time}</div>
        <div style={styles.phase}>{phase}</div>
      </div>
      <div style={styles.divider} />
      <div style={styles.right}>
        <div style={styles.label}>AI focus</div>
        {focus ? (
          <>
            <div style={{ ...styles.score, color: focus.color }}>
              <span style={{ ...styles.dot, background: focus.color }} />
              {focus.score}
            </div>
            <div style={styles.focusLabel}>{focus.label}</div>
          </>
        ) : (
          <div style={styles.off}>Off</div>
        )}
      </div>
      {roomName ? <div style={styles.room} title={roomName}>{roomName}</div> : null}
    </div>
  );
}

const styles = {
  tile: {
    boxSizing: "border-box", height: "100%", minHeight: 96, padding: "14px 16px 24px", position: "relative",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
    background: "linear-gradient(135deg, #1b1f33 0%, #14172a 100%)", color: "#f8fafc",
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif", overflow: "hidden",
  },
  left: { minWidth: 0 },
  time: { fontSize: 34, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" },
  phase: { marginTop: 5, fontSize: 11, fontWeight: 600, color: "#a5b0d6", textTransform: "uppercase", letterSpacing: "0.06em" },
  divider: { width: 1, alignSelf: "stretch", background: "rgba(165,176,214,0.22)" },
  right: { minWidth: 76, textAlign: "right" },
  label: { fontSize: 10, fontWeight: 700, color: "#a5b0d6", textTransform: "uppercase", letterSpacing: "0.06em" },
  score: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 26, fontWeight: 800, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" },
  dot: { width: 8, height: 8, borderRadius: "50%" },
  focusLabel: { fontSize: 11, color: "#cbd3ee", whiteSpace: "nowrap" },
  off: { marginTop: 4, fontSize: 15, fontWeight: 700, color: "#7f8ab0" },
  room: {
    position: "absolute", left: 16, right: 16, bottom: 7, fontSize: 10, color: "#7f8ab0",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
};
