import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useCallback, useState } from "react";

function getScreenShareSupport() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

export default function useMediaControls() {
  const {
    localParticipant,
    isMicrophoneEnabled: micEnabled,
    isCameraEnabled: camEnabled,
    isScreenShareEnabled: screenEnabled,
  } = useLocalParticipant();
  const room = useRoomContext();

  const [screenShareSupported] = useState(getScreenShareSupport);

  const ensureRoomAudioStarted = useCallback(async () => {
    if (!room || typeof room.startAudio !== "function") return;
    try {
      await room.startAudio();
    } catch (error) {
      console.warn("Unable to start room audio automatically:", error);
    }
  }, [room]);

  const toggleMic = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;
    try {
      await ensureRoomAudioStarted();
      await localParticipant.setMicrophoneEnabled(!micEnabled);
    } catch (error) {
      console.warn("Unable to toggle microphone:", error);
    }
  }, [ensureRoomAudioStarted, localParticipant, micEnabled, room]);

  const toggleCamera = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;
    try {
      await localParticipant.setCameraEnabled(!camEnabled);
    } catch (error) {
      console.warn("Unable to toggle camera:", error);
    }
  }, [localParticipant, camEnabled, room]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;
    if (!screenShareSupported) return;

    try {
      await ensureRoomAudioStarted();

      if (!screenEnabled) {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          video: {
            width: 1920,
            height: 1080,
            frameRate: 30,
          },
        });
      } else {
        await localParticipant.setScreenShareEnabled(false);
      }
    } catch (error) {
      console.warn("Unable to toggle screen share:", error);
    }
  }, [
    ensureRoomAudioStarted,
    localParticipant,
    screenEnabled,
    room,
    screenShareSupported,
  ]);

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
    screenShareSupported,
  };
}
