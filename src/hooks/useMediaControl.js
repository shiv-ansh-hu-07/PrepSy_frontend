import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useCallback } from "react";

export default function useMediaControls() {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext(); // ✅ THIS IS THE KEY FIX

  const toggleMic = useCallback(() => {
    if (!localParticipant) return;
    localParticipant.setMicrophoneEnabled(
      !localParticipant.isMicrophoneEnabled
    );
  }, [localParticipant]);

  const toggleCamera = useCallback(() => {
    if (!localParticipant) return;
    localParticipant.setCameraEnabled(
      !localParticipant.isCameraEnabled
    );
  }, [localParticipant]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) return;

    if (localParticipant.isScreenShareEnabled) {
      await localParticipant.setScreenShareEnabled(false);
    } else {
      await localParticipant.setScreenShareEnabled(true, {
        video: {
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
      });
    }
  }, [localParticipant]);

  const leaveRoom = useCallback(() => {
    room.disconnect();
  }, [room]);

  return {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leaveRoom,
    micEnabled: localParticipant?.isMicrophoneEnabled ?? false,
    camEnabled: localParticipant?.isCameraEnabled ?? false,
    screenEnabled: localParticipant?.isScreenShareEnabled ?? false,
  };
}
