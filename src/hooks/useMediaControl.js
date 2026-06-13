import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useCallback, useState } from "react";

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

  const [screenShareError, setScreenShareError] = useState("");

  const showError = useCallback((msg) => {
    setScreenShareError(msg);
    setTimeout(() => setScreenShareError(""), 5000);
  }, []);

  const ensureRoomAudioStarted = useCallback(async () => {
    if (!room || typeof room.startAudio !== "function") return;
    try { await room.startAudio(); } catch {}
  }, [room]);

  const toggleMic = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;
    try {
      await ensureRoomAudioStarted();
      await localParticipant.setMicrophoneEnabled(!micEnabled);
    } catch (err) {
      console.warn("Unable to toggle microphone:", err);
    }
  }, [ensureRoomAudioStarted, localParticipant, micEnabled, room]);

  const toggleCamera = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;
    try {
      await localParticipant.setCameraEnabled(!camEnabled);
    } catch (err) {
      // Camera in use or not found — try re-enumerating devices
      if (!camEnabled && (err?.name === "NotFoundError" || err?.name === "NotReadableError")) {
        try {
          const devices = await navigator.mediaDevices?.enumerateDevices?.() ?? [];
          const cam = devices.find((d) => d.kind === "videoinput");
          if (!cam) { console.warn("No camera found on this device."); return; }
          await room.switchActiveDevice("videoinput", cam.deviceId);
          await localParticipant.setCameraEnabled(true);
        } catch (retryErr) {
          console.warn("Camera retry failed:", retryErr);
        }
      } else {
        console.warn("Unable to toggle camera:", err?.name, err?.message);
      }
    }
  }, [localParticipant, camEnabled, room]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant || room?.state !== "connected") return;

    // Stopping screen share — no constraints needed
    if (screenEnabled) {
      try { await localParticipant.setScreenShareEnabled(false); } catch {}
      return;
    }

    const mobile = isMobile();

    // IMPORTANT: setScreenShareEnabled (which calls getDisplayMedia internally)
    // must be the very first await after the user tap on mobile.
    // Any prior async work breaks Chrome's user-gesture requirement.
    try {
      if (mobile) {
        // Android Chrome: audio capture in getDisplayMedia is not supported.
        // Pass no video constraints — let the browser pick.
        await localParticipant.setScreenShareEnabled(true, { audio: false });
      } else {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          video: { width: 1920, height: 1080, frameRate: 30 },
        });
      }
      // Start room audio AFTER the user-gesture-sensitive call
      ensureRoomAudioStarted();
    } catch (err) {
      // User dismissed the share picker — silent, no toast
      if (err?.name === "NotAllowedError") return;

      console.warn("Screen share attempt 1 failed:", err?.name, err?.message);

      // Attempt 2: zero options — absolute minimum call
      try {
        await localParticipant.setScreenShareEnabled(true);
        ensureRoomAudioStarted();
      } catch (fallback) {
        if (fallback?.name === "NotAllowedError") return;

        console.warn("Screen share attempt 2 failed:", fallback?.name, fallback?.message);

        // Attempt 3: call getDisplayMedia natively to distinguish
        // "browser lacks the API" from "LiveKit options failed"
        try {
          if (typeof navigator.mediaDevices?.getDisplayMedia !== "function") {
            showError(
              mobile
                ? "Screen sharing requires Chrome 88+ on Android. Please update Chrome."
                : "Screen sharing is not supported in this browser."
            );
          } else {
            // API exists but something else failed
            showError("Screen sharing failed. Please try again or use a different browser.");
          }
        } catch {
          showError("Screen sharing is not available on this device.");
        }
      }
    }
  }, [
    ensureRoomAudioStarted,
    localParticipant,
    screenEnabled,
    room,
    showError,
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
    screenShareError,
  };
}
