import { VideoTrack } from "@livekit/components-react";
import AvatarTile from "./AvatarTile";
import { useParticipants } from "@livekit/components-react";
import { useState } from "react";

export default function StageManager({ tracks = [] }) {
  const participants = useParticipants();
  const [fitMode, setFitMode] = useState("contain");

  const hasEnabledTrack = (track) =>
    Boolean(track?.publication?.isEnabled && track?.publication?.track);

  const screen = tracks.find(
    (track) => track.source === "screen_share" && hasEnabledTrack(track)
  );
  const cameraTracks = tracks.filter(
    (track) => track.source === "camera" && hasEnabledTrack(track)
  );
  const count = participants.length;

  const columns =
    count <= 1 ? 1 : count === 2 ? 2 : count <= 4 ? 2 : 3;

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

        <div style={styles.pip}>
          {participants.map((participant) => {
            const cam = cameraTracks.find(
              (track) => track.participant.identity === participant.identity
            );

            return (
              <div key={participant.identity} style={styles.pipTile}>
                {cam && cam.publication?.isEnabled ? (
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

    return (
      <div style={styles.singleParticipantWrap}>
        {cam && cam.publication?.isEnabled ? (
          <div style={styles.singleVideoWrap}>
            <VideoTrack trackRef={cam} style={styles.singleVideo} />
            <NameTag name={participant.name} />
          </div>
        ) : (
          <AvatarTile
            full
            name={participant.name || "Guest"}
            micMuted={!participant.isMicrophoneEnabled}
          />
        )}
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

        return cam && cam.publication?.isEnabled ? (
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

  pip: {
    position: "absolute",
    bottom: 16,
    right: 16,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: "min(100%, 420px)",
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

  singleParticipantWrap: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
  },

  singleVideoWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    background: "#0f172a",
  },

  singleVideo: {
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
};
