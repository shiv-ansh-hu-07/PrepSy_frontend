import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useCallback, useState } from "react";

function getScreenShareSupport() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
  const [screenShareError, setScreenShareError] = useState("");

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
      if (!camEnabled && error?.name === "NotFoundError") {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cam = devices.find((d) => d.kind === "videoinput");
          if (!cam) { console.warn("No camera device found on this device."); return; }
          await room.switchActiveDevice("videoinput", cam.deviceId);
          await localParticipant.setCameraEnabled(true);
        } catch (retryErr) {
          console.warn("Unable to toggle camera after device reset:", retryErr);
        }
      } else {
        console.warn("Unable to toggle camera:", error);
      }
    }
  }, [localParticipant, camEnabled, room]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;

    if (!screenShareSupported) {
      setScreenShareError("Screen sharing is not supported on this browser. Try Chrome on Android or a desktop browser.");
      setTimeout(() => setScreenShareError(""), 4000);
      return;
    }

    if (screenEnabled) {
      try {
        await localParticipant.setScreenShareEnabled(false);
      } catch (err) {
        console.warn("Unable to stop screen share:", err);
      }
      return;
    }

    try {
      await ensureRoomAudioStarted();
      const mobile = isMobile();

      if (mobile) {
        // Mobile browsers reject audio capture and high-res constraints in getDisplayMedia
        await localParticipant.setScreenShareEnabled(true, {
          video: true,
          audio: false,
        });
      } else {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          video: { width: 1920, height: 1080, frameRate: 30 },
        });
      }
    } catch (error) {
      if (error?.name === "NotAllowedError") {
        // User denied the screen share permission prompt — no message needed
        return;
      }
      // Fallback: retry with no constraints at all
      try {
        await localParticipant.setScreenShareEnabled(true);
      } catch (fallbackErr) {
        console.warn("Screen share failed:", fallbackErr);
        setScreenShareError("Unable to share screen on this device. Try Chrome on Android.");
        setTimeout(() => setScreenShareError(""), 4000);
      }
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
    screenShareError,
  };
}
