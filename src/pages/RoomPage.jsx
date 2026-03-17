import { LiveKitRoom, RoomAudioRenderer, StartAudio } from "@livekit/components-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import RoomLayout from "../components/RoomLayout";
import TeamsRoom from "../components/teamsRoom";
import ChatDrawer from "../components/ChatDrawer";
import { useEffect, useState } from "react";

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [token, setToken] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    const identity = user?.id ?? crypto.randomUUID();
    const name = user?.name || "Guest";

    setToken(null);
    setJoinError(null);

    api
      .get(`/livekit/token?room=${roomId}&user=${identity}&name=${name}`)
      .then((res) => setToken(res.data.token))
      .catch((error) => {
        setJoinError(
          error?.response?.data?.error || "Unable to join this classroom right now."
        );
      });
  }, [roomId, user]);

  if (joinError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "#ffffff",
            border: "1px solid #E6EAF8",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 18px 40px rgba(74, 90, 133, 0.12)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "Georgia, serif",
              color: "#2f3b63",
              fontSize: "30px",
              marginBottom: "12px",
            }}
          >
            Unable to Join Classroom
          </h2>
          <p style={{ color: "#5E6C92", marginBottom: "20px", lineHeight: 1.6 }}>
            {joinError}
          </p>
          <button
            onClick={() => navigate("/myRooms")}
            style={{
              height: "44px",
              padding: "0 18px",
              borderRadius: "999px",
              border: "none",
              background: "#8a9bd6",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Back to My Rooms
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
          color: "#4a5a85",
        }}
      >
        Joining...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        background: "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <LiveKitRoom
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_WS_URL}
        connect
        data-lk-room-metadata={user?.id ?? "host"}
        audio={false}
        video={false}
        style={{
          width: "100%",
        }}
      >
        <RoomAudioRenderer />
        <StartAudio label="Tap to enable room audio" />

        <RoomLayout
          onToggleChat={() => setChatOpen((value) => !value)}
          onLeave={() => navigate("/myRooms")}
        >
          <TeamsRoom />
        </RoomLayout>

        {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} />}
      </LiveKitRoom>
    </div>
  );
}
