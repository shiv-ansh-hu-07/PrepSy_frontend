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
    try { await room.startAudio(); } catch {}
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
          if (!cam) { console.warn("No camera device found."); return; }
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

    // Stop screen share — no constraints needed
    if (screenEnabled) {
      try { await localParticipant.setScreenShareEnabled(false); } catch {}
      return;
    }

    // Hard check: browser doesn't have getDisplayMedia at all (iOS Safari)
    if (!screenShareSupported) {
      setScreenShareError("Screen sharing is not supported on this browser. Try Chrome on Android or a desktop.");
      setTimeout(() => setScreenShareError(""), 4500);
      return;
    }

    // IMPORTANT: call getDisplayMedia (via LiveKit) as the FIRST await after the
    // user tap — any prior async work breaks Chrome's user-gesture requirement.
    const mobile = isMobile();

    try {
      if (mobile) {
        // Android Chrome: audio capture not supported in getDisplayMedia, omit it.
        // Pass no video constraints — let the browser pick resolution.
        await localParticipant.setScreenShareEnabled(true, { audio: false });
      } else {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          video: { width: 1920, height: 1080, frameRate: 30 },
        });
      }
      // Start room audio AFTER the user-gesture-sensitive call is done
      ensureRoomAudioStarted();
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        // User cancelled the share picker — not an error worth showing
        return;
      }
      console.warn("Screen share attempt 1 failed:", err?.name, err?.message);
      // Fallback: retry with zero options (bare call, browser defaults)
      try {
        await localParticipant.setScreenShareEnabled(true);
        ensureRoomAudioStarted();
      } catch (fallback) {
        console.warn("Screen share attempt 2 failed:", fallback?.name, fallback?.message);
        setScreenShareError("Screen sharing failed on this device. Make sure you are using Chrome.");
        setTimeout(() => setScreenShareError(""), 4500);
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
