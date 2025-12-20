import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

export default function StudyRoom({ roomId, user }) {
  const { joinRoom, sendMessage, messages, pomodoro } = useSocket();
  const [token, setToken] = useState(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState(null);

  const serverUrl = import.meta.env.VITE_LIVEKIT_WS_URL;

  useEffect(() => {
    async function fetchToken() {
      setLoadingToken(true);
      setTokenError(null);
      try {
        const res = await fetch(`/livekit/token?room=${encodeURIComponent(roomId)}&user=${encodeURIComponent(user?.id ?? user?.email ?? "guest")}`);
        const data = await res.json();
        console.log("StudyRoom - livekit token fetched:", data);

        let tok = null;
        if (typeof data === "string") tok = data;
        else if (typeof data.token === "string") tok = data.token;
        else if (typeof data.accessToken === "string") tok = data.accessToken;

        if (!tok) {
          console.error("Unexpected token shape:", data);
          setTokenError("Invalid token shape from backend");
          setToken(null);
        } else {
          setToken(tok);
        }
      } catch (err) {
        console.error("Error fetching token in StudyRoom:", err);
        setTokenError(err?.message ?? "Token fetch failed");
        setToken(null);
      } finally {
        setLoadingToken(false);
      }
    }

    fetchToken();
  }, [roomId, user]);

  if (!serverUrl) {
    return <div className="p-6 text-white">Missing VITE_LIVEKIT_WS_URL env var.</div>;
  }
  if (loadingToken) return <div className="p-6 text-white">Loading LiveKit…</div>;
  if (tokenError) return <div className="p-6 text-red-400">Token error: {tokenError}</div>;
  if (!token) return <div className="p-6 text-yellow-300">No token available</div>;

  return (
    <div className="h-full">
      <LiveKitRoom token={token} serverUrl={serverUrl}>
        <VideoConference layout="grid" />
      </LiveKitRoom>

      {/* Example chat area (not related to livekit) */}
      <div className="chat-area mt-4">
        <h3>Chat</h3>
        {messages?.map((m, i) => (
          <div key={i}>
            <strong>{m.user}</strong>: {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
