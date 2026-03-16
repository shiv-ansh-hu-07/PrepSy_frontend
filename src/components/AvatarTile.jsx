import { MicOff } from "lucide-react";

function getInitials(name) {
  const parts = (name || "Guest").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AvatarTile({
  micMuted = true,
  large = false,
  full = false,
  name = "Guest",
}) {
  const initials = getInitials(name);
  const size = full ? 156 : large ? 108 : 82;

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.tileBase,
          width: "100%",
          height: "100%",
          maxWidth: full ? "100%" : 260,
          maxHeight: full ? "100%" : 260,
          borderRadius: 16,
        }}
      >
        <div
          style={{
            ...styles.initialsCircle,
            width: size,
            height: size,
            fontSize: full ? 48 : large ? 34 : 26,
          }}
        >
          {initials}
        </div>

        {micMuted && (
          <div style={styles.micBadge}>
            <MicOff size={16} color="white" />
          </div>
        )}

        <div style={styles.nameTag}>{name}</div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.4s ease",
  },

  tileBase: {
    borderRadius: 16,
    background:
      "radial-gradient(circle at 30% 20%, rgba(138,155,214,0.28), transparent 40%), #1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    transition: "all 0.4s ease",
    overflow: "hidden",
  },

  initialsCircle: {
    borderRadius: "50%",
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    boxShadow: "0 16px 40px rgba(15,23,42,0.28)",
    backdropFilter: "blur(6px)",
  },

  micBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  nameTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    padding: "4px 8px",
    borderRadius: 8,
    background: "rgba(0,0,0,0.6)",
    color: "white",
    fontSize: 12,
    maxWidth: "80%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
