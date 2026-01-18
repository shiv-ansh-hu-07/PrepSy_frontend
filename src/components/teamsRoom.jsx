import {
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import StageManager from "./StageManager";

export default function TeamsRoom() {
  const participants = useParticipants();

  const tracks = useTracks(
    [
      { source: "screen_share", withPlaceholder: false },
      { source: "camera", withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <StageManager
      participants={participants}
      tracks={tracks}
    />
  );
}
