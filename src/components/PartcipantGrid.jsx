import {
  ParticipantTile,
  TrackRefContext,
} from "@livekit/components-react";

export default function ParticipantGrid({ tracks }) {
  const screenShareTrack = tracks.find(
    (t) => t.source === "screen_share"
  );

  const cameraTracks = tracks.filter(
    (t) => t.source === "camera"
  );

  // SCREEN SHARE MODE
  if (screenShareTrack) {
    return (
      <div className="flex h-full">
        {/* Screen share */}
        <div className="flex-1">
          <TrackRefContext.Provider value={screenShareTrack}>
            <ParticipantTile />
          </TrackRefContext.Provider>
        </div>

        {/* Participants */}
        <div className="w-1/4 grid grid-cols-1 gap-2 p-2">
          {cameraTracks.map((track) => (
            <TrackRefContext.Provider
              key={track.publication.trackSid}
              value={track}
            >
              <ParticipantTile />
            </TrackRefContext.Provider>
          ))}
        </div>
      </div>
    );
  }

  // AUTO GRID MODE
  return (
    <div
      className="grid gap-3 p-3 h-full"
      style={{
        gridTemplateColumns: `repeat(${Math.ceil(
          Math.sqrt(cameraTracks.length || 1)
        )}, minmax(0, 1fr))`,
      }}
    >
      {cameraTracks.map((track) => (
        <TrackRefContext.Provider
          key={track.publication.trackSid}
          value={track}
        >
          <ParticipantTile />
        </TrackRefContext.Provider>
      ))}
    </div>
  );
}
