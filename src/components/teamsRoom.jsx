import {
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import StageManager from "./StageManager";

export default function TeamsRoom() {
  const participants = useParticipants();

  const tracks = useTracks(
    [
      { source: "screen_share", withPlaceholder: true },
      { source: "camera", withPlaceholder: true },
    ],
    { onlySubscribed: true }
  );

  return (
    <StageManager
      participants={participants}
      tracks={tracks}
    />
  );
}
