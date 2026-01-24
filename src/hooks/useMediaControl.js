import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";

export default function useMediaControls() {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);

  useEffect(() => {
    if (!room || !localParticipant) return;
    if (room.state !== "connected") return;

    localParticipant.setMicrophoneEnabled(false);
    localParticipant.setCameraEnabled(false);

    setMicEnabled(false);
    setCamEnabled(false);
    setScreenEnabled(false);
  }, [room, localParticipant]);

  const toggleMic = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;

    const next = !micEnabled;
    await localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }, [localParticipant, micEnabled, room]);

  const toggleCamera = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;

    const next = !camEnabled;
    await localParticipant.setCameraEnabled(next);
    setCamEnabled(next);
  }, [localParticipant, camEnabled, room]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;

    const next = !screenEnabled;

    if (next) {
      await localParticipant.setScreenShareEnabled(true, {
        video: {
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
      });
    } else {
      await localParticipant.setScreenShareEnabled(false);
    }

    setScreenEnabled(next);
  }, [localParticipant, screenEnabled, room]);

  const leaveRoom = useCallback(async () => {
    if (!room) return;
    await room.disconnect();
  }, [room]);

  return {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leaveRoom,
    micEnabled,
    camEnabled,
    screenEnabled,
  };
}
