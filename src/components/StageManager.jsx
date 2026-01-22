import VideoGrid from "./VideoGrid";
import { VideoTrack } from "@livekit/components-react";
import AvatarTile from "./AvatarTile";
import { useLocalParticipant, useParticipants } from "@livekit/components-react";
import { MicOff } from "lucide-react";
import { useState } from "react";

export default function StageManager({ tracks = [] }) {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const micMuted = !localParticipant?.isMicrophoneEnabled;
    const [fitMode, setFitMode] = useState("contain");

    const screen = tracks.find(t => t.source === "screen_share");
    
    const cameraTracks = tracks.filter(t => t.source === "camera");

    const count = participants.length;

    const columns =
        count === 1 ? 1 :
            count === 2 ? 2 :
                count <= 4 ? 2 :
                    3;


    /* ---------------------------------------
       1️⃣ SCREEN SHARE → FULL STAGE + PiP
    ---------------------------------------- */
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
                    {participants.map(p => {
                        const cam = cameraTracks.find(
                            t => t.participant.identity === p.identity
                        );

                        return (
                            <div key={p.identity} style={styles.pipTile}>
                                {cam && cam.publication?.isEnabled ? (
                                    <VideoTrack trackRef={cam} style={styles.pipVideo} />
                                ) : (
                                    <AvatarTile
                                        name={p.name || "Guest"}
                                        micMuted={!p.isMicrophoneEnabled}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    /* ---------------------------------------
       2️⃣ SINGLE PARTICIPANT → FULL STAGE
    ---------------------------------------- */
    if (participants.length === 1) {
  const p = participants[0];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AvatarTile
          full
          name={p.name || "Guest"}
          micMuted={!p.isMicrophoneEnabled}
        />
      </div>
    </div>
  );
}


    /* ---------------------------------------
       3️⃣ MULTI PARTICIPANT → GRID
    ---------------------------------------- */
    return (
        <div
            style={{
                ...styles.grid,
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
            }}
        >

            {participants.map(p => {
                const cam = cameraTracks.find(
                    t => t.participant.identity === p.identity
                );

                return cam && cam.publication?.isEnabled ? (
                    <div key={p.identity} style={styles.gridItem}>
                        <VideoTrack trackRef={cam} style={styles.gridVideo} />
                        <NameTag name={p.name} />
                    </div>
                ) : (
                    <AvatarTile
                        key={p.identity}
                        name={p.name || "Guest"}
                        micMuted={!p.isMicrophoneEnabled}
                    />
                );
            })}
        </div>
    );
}

/* ================== NameTag ================== */

function NameTag({ name }) {
    return <div style={styles.nameTag}>{name || "Guest"}</div>;
}

/* ================== STYLES ================== */

const styles = {
    stage: {
        width: "100%",
        height: "100%",
        position: "relative",
    },

    stageVideo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },

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
    },

    pipTile: {
        width: 180,
        height: 120,
        borderRadius: 14,
        overflow: "hidden",
        background: "#020617",
    },

    pipVideo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },

    grid: {
        width: "100%",
        height: "100%",
        display: "grid",
        gap: 20,
        alignItems: "stretch",
        justifyItems: "stretch",
    },

    gridItem: {
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    singleStage: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
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
