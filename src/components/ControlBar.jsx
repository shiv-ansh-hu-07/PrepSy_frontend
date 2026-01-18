import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";

export default function ControlBar() {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-black/70 px-6 py-3 rounded-xl">
      <button onClick={() => localParticipant.setMicrophoneEnabled(
        !localParticipant.isMicrophoneEnabled
      )}>
        🎙️
      </button>

      <button onClick={() => localParticipant.setCameraEnabled(
        !localParticipant.isCameraEnabled
      )}>
        📷
      </button>

      <button onClick={() => room.localParticipant.setScreenShareEnabled(true)}>
        🖥️
      </button>

      <button
        className="text-red-500"
        onClick={() => room.disconnect()}
      >
        Leave
      </button>
    </div>
  );
}
