import { VideoTrack } from "@livekit/components-react";
import { MicOff } from "lucide-react";
import AvatarTile from "./AvatarTile";
import { useParticipants } from "@livekit/components-react";
import { useEffect, useState } from "react";

function getInitials(name) {
  const words = (name || "Guest").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "G";
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

export default function StageManager({ tracks = [] }) {
  const participants = useParticipants();
  const [fitMode, setFitMode] = useState("contain");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleFullscreenChange = () => {
      const stage = document.fullscreenElement?.closest?.("[data-room-stage]");
      setIsFullscreen(Boolean(stage));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const hasEnabledTrack = (track, enabled) =>
    Boolean(enabled && track?.publication?.track);

  const screen = tracks.find(
    (track) =>
      track.source === "screen_share" &&
      hasEnabledTrack(track, track.participant?.isScreenShareEnabled)
  );
  const cameraTracks = tracks.filter((track) => track.source === "camera");
  const count = participants.length;

  const toggleFullscreen = async (event) => {
    const stage = event.currentTarget.closest("[data-room-stage]");

    if (!stage || typeof document === "undefined") return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (stage.requestFullscreen) {
        await stage.requestFullscreen();
      }
    } catch (error) {
      console.warn("Unable to toggle fullscreen:", error);
    }
  };

  if (screen) {
    return (
      <div style={styles.stageNoFlex}>
        <VideoTrack
          trackRef={screen}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fitMode,
            background: "#000",
          }}
        />

        <button
          onClick={() =>
            setFitMode(fitMode === "contain" ? "cover" : "contain")
          }
          style={styles.fitToggle}
        >
          {fitMode === "contain" ? "Fit" : "Fill"}
        </button>

        <button onClick={toggleFullscreen} style={styles.fullscreenToggle}>
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>

        {!isFullscreen ? (
          <div style={styles.pip}>
            {participants.map((participant) => {
              const cam = cameraTracks.find(
                (track) => track.participant.identity === participant.identity
              );
              const hasCamera = hasEnabledTrack(cam, participant.isCameraEnabled);

              return (
                <div key={participant.identity} style={styles.pipTile}>
                  {hasCamera ? (
                    <VideoTrack trackRef={cam} style={styles.pipVideo} />
                  ) : (
                    <AvatarTile
                      name={participant.name || "Guest"}
                      micMuted={!participant.isMicrophoneEnabled}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  if (participants.length === 1) {
    const participant = participants[0];
    const cam = cameraTracks.find(
      (track) => track.participant.identity === participant.identity
    );
    const hasCamera = hasEnabledTrack(cam, participant.isCameraEnabled);

    if (!hasCamera) {
      const words = (participant.name || "Guest").trim().split(/\s+/);
      const initials = words
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("");

      return (
        <div style={styles.singleParticipantStage}>
          <div style={styles.cameraOffPlaceholder}>
            <div style={styles.cameraOffRing}>
              <span style={styles.cameraOffInitials}>{initials}</span>
            </div>
            <p style={styles.cameraOffName}>{participant.name || "Guest"}</p>
            <p style={styles.cameraOffSub}>
              {participant.isMicrophoneEnabled ? "Mic on · " : "Mic off · "}
              Camera off
            </p>
            <p style={styles.cameraOffHint}>
              Press the camera button to enable video
            </p>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.singleParticipantStage}>
        <div style={styles.singleDockTile}>
          <div style={styles.singleDockVideoWrap}>
            <VideoTrack trackRef={cam} style={styles.singleDockVideo} />
            <NameTag name={participant.name} />
          </div>
        </div>
      </div>
    );
  }

  // Multiple participants: small round "presence" avatars floating over the
  // ambient wallpaper — camera-on shows a round-cropped video, camera-off shows
  // initials. Sizes and gaps scale with the viewport (clamp + vmin) so it holds
  // from phones to large monitors; a very full room wraps and scrolls rather
  // than shrinking the avatars away. The Pomodoro / AI / Notes rail is a
  // separate column in RoomLayout, so it stays visible no matter the count.
  const maxAvatar = count <= 4 ? 92 : count <= 9 ? 76 : count <= 16 ? 62 : 50;
  const sizeCss = `clamp(44px, 9vmin, ${maxAvatar}px)`;
  const manyPeople = count > 12;

  return (
    <div
      style={{
        ...styles.presenceWrap,
        alignContent: manyPeople ? "flex-start" : "center",
      }}
    >
      {participants.map((participant) => {
        const cam = cameraTracks.find(
          (track) => track.participant.identity === participant.identity
        );
        const hasCamera = hasEnabledTrack(cam, participant.isCameraEnabled);

        return (
          <PresenceAvatar
            key={participant.identity}
            participant={participant}
            cam={cam}
            hasCamera={hasCamera}
            sizeCss={sizeCss}
          />
        );
      })}
    </div>
  );
}

function PresenceAvatar({ participant, cam, hasCamera, sizeCss }) {
  const name = participant.name || "Guest";
  const micMuted = !participant.isMicrophoneEnabled;

  return (
    <div style={styles.presenceItem}>
      <div style={{ position: "relative", width: sizeCss, height: sizeCss, flexShrink: 0 }}>
        <div
          style={{
            ...styles.presenceCircle,
            ...(hasCamera ? styles.presenceCircleOn : styles.presenceCircleOff),
          }}
        >
          {hasCamera ? (
            <VideoTrack trackRef={cam} style={styles.presenceVideo} />
          ) : (
            <span style={styles.presenceInitials}>{getInitials(name)}</span>
          )}
        </div>
        {micMuted && (
          <div style={styles.presenceMic}>
            <MicOff size={13} color="#fff" />
          </div>
        )}
      </div>
      <div style={styles.presenceName}>{name}</div>
    </div>
  );
}

function NameTag({ name }) {
  return <div style={styles.nameTag}>{name || "Guest"}</div>;
}

const styles = {
  stageNoFlex: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    background: "#000",
  },

  pip: {
    position: "absolute",
    bottom: 16,
    right: 16,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: "min(100%, 420px)",
    zIndex: 25,
  },

  pipTile: {
    width: 140,
    height: 96,
    borderRadius: 14,
    overflow: "hidden",
    background: "#020617",
  },

  pipVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  singleParticipantStage: {
    width: "100%",
    height: "100%",
    position: "relative",
    // Transparent so the room's <AmbientBackground /> wallpaper shows through.
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // A glassy tile that floats over the ambient wallpaper instead of a bare
  // block on black, so an empty room still feels like a place.
  cameraOffPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "32px 30px",
    textAlign: "center",
    background: "rgba(10,14,26,0.5)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 24,
    boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
  },

  cameraOffRing: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    background: "rgba(138,155,214,0.14)",
    border: "2px solid rgba(138,155,214,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  cameraOffInitials: {
    fontSize: 32,
    fontWeight: 700,
    color: "var(--accent)",
    letterSpacing: 2,
    userSelect: "none",
  },

  cameraOffName: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: "#e2e8f0",
    letterSpacing: 0.2,
  },

  cameraOffSub: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
    fontWeight: 500,
  },

  cameraOffHint: {
    margin: 0,
    fontSize: 12,
    color: "#334155",
    marginTop: 4,
  },

  singleDockTile: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 226,
    height: 150,
    borderRadius: 20,
    overflow: "hidden",
    background: "#1e293b",
    boxShadow: "0 18px 40px rgba(15,23,42,0.36)",
  },

  singleDockVideoWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
  },

  singleDockVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  // ── Presence avatars (multi-participant) ──────────────────────────────────
  presenceWrap: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: "clamp(12px, 2.2vmin, 30px)",
    padding: "clamp(52px, 9vmin, 66px) 16px clamp(78px, 12vmin, 98px)",
    overflowY: "auto",
    boxSizing: "border-box",
  },

  presenceItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
  },

  presenceCircle: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  presenceCircleOff: {
    background: "rgba(10,14,26,0.5)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 16px 36px rgba(0,0,0,0.45)",
  },

  presenceCircleOn: {
    background: "#0f172a",
    border: "2px solid #34d399",
    boxShadow: "0 0 0 4px rgba(52,211,153,0.14), 0 16px 36px rgba(0,0,0,0.45)",
  },

  presenceVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  presenceInitials: {
    color: "#e2e8f0",
    fontWeight: 700,
    letterSpacing: "0.06em",
    fontSize: "clamp(18px, 4vmin, 28px)",
    userSelect: "none",
  },

  presenceMic: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#dc2626",
    border: "2px solid #0a0f1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  presenceName: {
    fontSize: "clamp(11px, 2.4vmin, 13px)",
    fontWeight: 500,
    color: "#cbd5e1",
    maxWidth: 108,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "center",
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
  },

  fitToggle: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: "6px 10px",
    borderRadius: 10,
    border: "none",
    background: "rgba(0,0,0,0.6)",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
  },

  fullscreenToggle: {
    position: "absolute",
    top: 12,
    right: 62,
    padding: "6px 10px",
    borderRadius: 10,
    border: "none",
    background: "rgba(0,0,0,0.6)",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
  },
};
