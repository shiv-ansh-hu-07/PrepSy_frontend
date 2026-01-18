import { MicOff } from "lucide-react";

export default function AvatarTile({
  micMuted = true,
  large = false,
  full = false,
  name = "Guest",
}) {
  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.tileBase,
          width: full ? "100%" : "100%",
          height: full ? "100%" : "100%",
          maxWidth: full ? "100%" : 260,
          maxHeight: full ? "100%" : 260,
          borderRadius: 16,
          background: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >

        {/* silhouette */}
        <svg
          width={full ? 140 : large ? 96 : 72}
          height={full ? 140 : large ? 96 : 72}
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: "#cbd5f5" }}
        >

          <path
            d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z"
            fill="currentColor"
          />
          <path
            d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
            fill="currentColor"
          />
        </svg>

        {/* mic muted badge */}
        {micMuted && (
          <div style={styles.micBadge}>
            <MicOff size={16} color="white" />
          </div>
        )}

        {/* name tag */}
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
    background: "#1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    transition: "all 0.4s ease",
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
