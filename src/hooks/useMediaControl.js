import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";

function getScreenShareSupport() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

export default function useMediaControls() {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);
  const [screenShareSupported] = useState(getScreenShareSupport);
  const resetMediaState = useCallback(() => {
    setMicEnabled(false);
    setCamEnabled(false);
    setScreenEnabled(false);
  }, []);

  useEffect(() => {
    if (!room || !localParticipant) return;
    if (room.state !== "connected") return;

    let active = true;

    const initializeParticipantMedia = async () => {
      try {
        await localParticipant.setMicrophoneEnabled(false);
        await localParticipant.setCameraEnabled(false);
      } catch (error) {
        console.warn("Unable to initialize local media state:", error);
      }

      queueMicrotask(() => {
        if (active) {
          resetMediaState();
        }
      });
    };

    void initializeParticipantMedia();

    return () => {
      active = false;
    };
  }, [localParticipant, resetMediaState, room]);

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

    const next = !micEnabled;
    await ensureRoomAudioStarted();
    await localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }, [ensureRoomAudioStarted, localParticipant, micEnabled, room]);

  const toggleCamera = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;

    const next = !camEnabled;
    await localParticipant.setCameraEnabled(next);
    setCamEnabled(next);
  }, [localParticipant, camEnabled, room]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;
    if (!screenShareSupported) return;

    const next = !screenEnabled;
    await ensureRoomAudioStarted();

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
