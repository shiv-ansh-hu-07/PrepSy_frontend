import { VideoTrack } from "@livekit/components-react";
import AvatarTile from "./AvatarTile";
import { useParticipants } from "@livekit/components-react";
import { useEffect, useState } from "react";

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

  const columns =
    count <= 1 ? 1 : count === 2 ? 2 : count <= 4 ? 2 : 3;

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

        <div style={styles.pip(isFullscreen)}>
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
      </div>
    );
  }

  if (participants.length === 1) {
    const participant = participants[0];
    const cam = cameraTracks.find(
      (track) => track.participant.identity === participant.identity
    );
    const hasCamera = hasEnabledTrack(cam, participant.isCameraEnabled);

    return (
      <div style={styles.singleParticipantStage}>
        <div style={styles.singleDockTile}>
          {hasCamera ? (
            <div style={styles.singleDockVideoWrap}>
              <VideoTrack trackRef={cam} style={styles.singleDockVideo} />
              <NameTag name={participant.name} />
            </div>
          ) : (
            <AvatarTile
              name={participant.name || "Guest"}
              micMuted={!participant.isMicrophoneEnabled}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.grid,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {participants.map((participant) => {
        const cam = cameraTracks.find(
          (track) => track.participant.identity === participant.identity
        );
        const hasCamera = hasEnabledTrack(cam, participant.isCameraEnabled);

        return hasCamera ? (
          <div key={participant.identity} style={styles.gridItem}>
            <VideoTrack trackRef={cam} style={styles.gridVideo} />
            <NameTag name={participant.name} />
          </div>
        ) : (
          <div key={participant.identity} style={styles.gridItem}>
            <AvatarTile
              name={participant.name || "Guest"}
              micMuted={!participant.isMicrophoneEnabled}
            />
          </div>
        );
      })}
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

  pip: (isFullscreen) => ({
    position: "absolute",
    top: isFullscreen ? 56 : "auto",
    bottom: isFullscreen ? "auto" : 16,
    right: 16,
    display: "flex",
    gap: isFullscreen ? 8 : 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: isFullscreen ? "min(100%, 360px)" : "min(100%, 420px)",
    zIndex: 25,
  }),

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
    background: "#05070b",
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

  grid: {
    width: "100%",
    height: "100%",
    display: "grid",
    gap: 16,
    alignItems: "stretch",
    justifyItems: "stretch",
    padding: 12,
    boxSizing: "border-box",
  },

  gridItem: {
    width: "100%",
    height: "100%",
    minHeight: 220,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    overflow: "hidden",
    background: "#0f172a",
  },

  gridVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
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
