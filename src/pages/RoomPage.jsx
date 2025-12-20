import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PomodoroTimer from "../components/PomodoroTimer";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shouldConnect, setShouldConnect] = useState(false);

  const serverUrl = import.meta.env.VITE_LIVEKIT_WS_URL;

  useEffect(() => {
    if (!roomId) {
      console.warn("Room ID not available yet");
      return;
    }

    let cancelled = false;

    const identity =
      user?.id ?? `guest-${crypto.randomUUID()}`;

    const displayName =
      user?.name || user?.email || "Guest";

    const fetchToken = async () => {
      try {
        console.log("Fetching LiveKit token");
        console.log("Room:", roomId);
        console.log("Identity:", identity);
        console.log("Display name:", displayName);

        const res = await api.get(
          `/livekit/token?room=${encodeURIComponent(
            roomId
          )}&user=${encodeURIComponent(
            identity
          )}&name=${encodeURIComponent(displayName)}`
        );

        if (!res.data || typeof res.data.token !== "string") {
          throw new Error("Invalid token response");
        }

        if (!cancelled) {
          setToken(res.data.token);
        }
      } catch (err) {
        console.error("LiveKit token fetch failed:", err);
        if (!cancelled) {
          setError("Failed to join room");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchToken();

    return () => {
      cancelled = true;
    };
  }, [roomId, user?.id]);

  // ---------------- UI STATES ----------------

  if (!serverUrl) {
    return (
      <div className="p-8 text-white">
        LiveKit server URL not configured
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-white">Joining room…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  if (!token) {
    return <div className="p-6 text-red-400">No token received</div>;
  }

  // ---------------- MAIN RENDER ----------------

  return (
    <div className="flex h-screen">
      <div className="flex-1 bg-gray-900 p-6">
        <div className="mb-4 flex justify-between items-center">
          <button className="btn" onClick={() => navigate(-1)}>
            ← Exit
          </button>

          {!shouldConnect && (
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
              onClick={() => setShouldConnect(true)}
            >
              Join Room
            </button>
          )}
        </div>

        <div className="w-full h-[calc(100vh-120px)] bg-gray-800 rounded-md flex items-center justify-center">
          {!shouldConnect ? (
            <div className="text-gray-300 text-lg">
              Click{" "}
              <span className="text-green-400 font-semibold">
                Join Room
              </span>{" "}
              to start
            </div>
          ) : (
            <LiveKitRoom
              token={token}
              serverUrl={serverUrl}
              connect={true}
              connectOptions={{ autoSubscribe: true }}
              audio={true}
              video={true}
              data-lk-theme="default"
              style={{ height: "100%", width: "100%" }}
            >
              <VideoConference
                chat={false}
                screenShare={true}
              />
            </LiveKitRoom>
          )}
        </div>

        <div className="mt-4">
          <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
