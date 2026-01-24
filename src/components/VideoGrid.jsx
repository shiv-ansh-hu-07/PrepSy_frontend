import { VideoTrack } from "@livekit/components-react";
import AvatarTile from "./AvatarTile";

export default function VideoGrid({ tracks }) {
  const count = tracks.length;

  const columns =
    count === 1
      ? "1fr"
      : count <= 4
      ? "1fr 1fr"
      : "1fr 1fr 1fr";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        width: "100%",
        height: "100%",
        gap: 16,
      }}
    >
      {tracks.map((t) => {
        const showVideo =
          t.isSubscribed && t.publication?.isEnabled;

        return (
          <div
            key={t.publication?.trackSid ?? t.participant.identity}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: 12,
              overflow: "hidden",
              background: "#0f172a",
            }}
          >
            <AvatarTile name={t.participant.name} />

            {showVideo && (
              <VideoTrack
                trackRef={t}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}

            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                fontSize: 12,
                zIndex: 10,
              }}
            >
              {t.participant.name || "Guest"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
