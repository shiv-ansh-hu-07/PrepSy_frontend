// src/components/VideoVoice.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function VideoVoice() {
  const { id: roomId } = useParams();
  const { user } = useAuth();
  const { socket, startVideo, startVoice, stopLocalStream } = useSocket();
  const localRef = useRef(null);
  const [mode, setMode] = useState(null); // 'video' | 'voice' | null

  useEffect(() => {
    // ensure local video element exists
    if (localRef.current && localRef.current.srcObject) return;
  }, []);

  const startVideoCall = async () => {
    try {
      await startVideo(roomId);
      setMode("video");
    } catch (err) {
      alert("Camera access denied or error: " + err.message);
    }
  };

  const startVoiceCall = async () => {
    try {
      await startVoice(roomId);
      setMode("voice");
    } catch (err) {
      alert("Mic access denied or error: " + err.message);
    }
  };

  const stopCall = () => {
    stopLocalStream();
    setMode(null);
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow">
      <div className="flex gap-2 items-center mb-3">
        <button onClick={startVoiceCall} className="px-3 py-2 bg-green-600 text-white rounded">
          Start Voice
        </button>
        <button onClick={startVideoCall} className="px-3 py-2 bg-blue-600 text-white rounded">
          Start Video
        </button>
        <button onClick={stopCall} className="px-3 py-2 bg-red-600 text-white rounded">
          Stop
        </button>
      </div>

      <video id="localVideo" ref={localRef} autoPlay muted playsInline className="w-full bg-black rounded h-60" />
      <div id="remoteVideos" className="grid grid-cols-2 gap-2 mt-2"></div>
    </div>
  );
}
