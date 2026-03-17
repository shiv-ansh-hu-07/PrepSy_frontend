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
  const [screenShareSupported, setScreenShareSupported] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      setScreenShareSupported(false);
      return;
    }

    const userAgent = navigator.userAgent || "";
    const isMobileDevice =
      /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(userAgent) ||
      window.matchMedia("(max-width: 980px)").matches;
    const hasDisplayMedia =
      typeof navigator.mediaDevices?.getDisplayMedia === "function";

    setScreenShareSupported(hasDisplayMedia && !isMobileDevice);
  }, []);

  useEffect(() => {
    if (!room || !localParticipant) return;
    if (room.state !== "connected") return;

    localParticipant.setMicrophoneEnabled(false);
    localParticipant.setCameraEnabled(false);

    setMicEnabled(false);
    setCamEnabled(false);
    setScreenEnabled(false);
  }, [room, localParticipant]);

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
