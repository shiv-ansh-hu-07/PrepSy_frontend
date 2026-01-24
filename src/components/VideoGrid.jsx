import { VideoTrack } from "@livekit/components-react";
import AvatarTile from "./AvatarTile";

export default function VideoGrid({ tracks }) {
    const count = tracks.length;

    const columns =
        count === 1 ? "1fr" :
            count <= 4 ? "1fr 1fr" :
                "1fr 1fr 1fr";


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

            {tracks.map(t => (
                <div key={t.publication.trackSid}
                    style={{ borderRadius: 12, overflow: "hidden" }}>
                    {t.publication?.isEnabled
                        ? <VideoTrack trackRef={t} />
                        : <AvatarTile name={t.participant.name} />
                    }
                </div>
            ))}
        </div>
    );
}
