import { LiveKitRoom } from "@livekit/components-react";
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

  useEffect(() => {
    const identity = user?.id ?? crypto.randomUUID();
    const name = user?.name || "Guest";

    api
      .get(`/livekit/token?room=${roomId}&user=${identity}&name=${name}`)
      .then((res) => setToken(res.data.token));
  }, [roomId, user]);

  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
          color: "#4a5a85",
        }}
      >
        Joining…
      </div>
    );
  }

  return (
    /* 🔑 SINGLE SCROLL CONTAINER */
    <div
      style={{
        minHeight: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        background:
          "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <LiveKitRoom
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_WS_URL}
        connect
        data-lk-room-metadata={user?.id ?? "host"}
        audio={true}
        video={true}
        style={{
          width: "100%",
        }}
      >
        <RoomLayout
          onToggleChat={() => setChatOpen((v) => !v)}
          onLeave={() => navigate("/myRooms")}
        >
          <TeamsRoom />
        </RoomLayout>

        {chatOpen && (
          <ChatDrawer onClose={() => setChatOpen(false)} />
        )}
      </LiveKitRoom>
    </div>
  );
}
