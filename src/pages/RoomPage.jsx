import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import RoomLayout from "../components/RoomLayout";
import WatchPartyLayout from "../components/WatchPartyLayout";
import TeamsRoom from "../components/teamsRoom";
import ChatDrawer from "../components/ChatDrawer";
import { useEffect, useState } from "react";

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, markGuestSessionActive } = useAuth();

  const [token, setToken] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [roomDurationMinutes, setRoomDurationMinutes] = useState(90);
  const [youtubeVideoId, setYoutubeVideoId] = useState(null);
  const [youtubePlaylistId, setYoutubePlaylistId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [roomTags, setRoomTags] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [guestIdentity] = useState(() => crypto.randomUUID());

  const identity = user?.id ?? guestIdentity;
  const name = user?.name || user?.email?.split("@")[0] || "Guest";

  useEffect(() => {
    if (user?.id) return;

    markGuestSessionActive();
  }, [markGuestSessionActive, user?.id]);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/livekit/token?room=${roomId}&user=${identity}&name=${name}`)
      .then((res) => {
        if (!cancelled) {
          setToken(res.data.token);
          setRoomName(res.data.roomName || "Study Room");
          setRoomDurationMinutes(res.data.durationMinutes || 90);
          setYoutubeVideoId(res.data.youtubeVideoId || null);
          setYoutubePlaylistId(res.data.youtubePlaylistId || null);
          setStartTime(res.data.startTime || null);
          setRoomTags(res.data.tags || []);
          setJoinError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setJoinError(
            error?.response?.data?.error || "Unable to join this classroom right now."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [identity, name, roomId]);

  useEffect(() => {
    if (!roomId || !user?.id || !token) return;

    let cancelled = false;

    const recordAttendance = async () => {
      try {
        await api.post("/rooms/join", { roomId });
        if (!cancelled) {
          await refreshUser();
        }
      } catch (error) {
        console.warn("Unable to record attendance:", error);
      }
    };

    void recordAttendance();

    return () => {
      cancelled = true;
    };
  }, [roomId, token, user?.id, refreshUser]);

  if (joinError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, var(--card-bg) 0%, var(--accent-soft) 100%)",
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
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 18px 40px rgba(74, 90, 133, 0.12)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "Georgia, serif",
              color: "var(--text-primary)",
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
              background: "var(--accent-gradient)",
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
          background: "linear-gradient(180deg, var(--card-bg) 0%, var(--accent-soft) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
          color: "var(--text-secondary)",
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
        background: "linear-gradient(180deg, var(--card-bg) 0%, var(--accent-soft) 100%)",
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
        options={{ disconnectOnPageLeave: false }}
        style={{
          width: "100%",
        }}
      >
        <RoomAudioRenderer />
        <RoomAudioBridge
          chatOpen={chatOpen}
          onUnreadMessage={() => setHasUnreadMessages(true)}
        />

        {youtubeVideoId || youtubePlaylistId ? (
          <WatchPartyLayout
            roomId={roomId}
            roomName={roomName}
            youtubeVideoId={youtubeVideoId}
            youtubePlaylistId={youtubePlaylistId}
            startTime={startTime}
            tags={roomTags}
            currentUser={user}
          />
        ) : (
          <>
            <RoomLayout
              roomId={roomId}
              roomName={roomName}
              roomDurationMinutes={roomDurationMinutes}
              onToggleChat={() =>
                setChatOpen((value) => {
                  const next = !value;
                  if (next) {
                    setHasUnreadMessages(false);
                  }
                  return next;
                })
              }
              hasUnreadMessages={hasUnreadMessages}
            >
              <TeamsRoom />
            </RoomLayout>

            {chatOpen && (
              <ChatDrawer
                onClose={() => setChatOpen(false)}
                currentUser={user}
              />
            )}
          </>
        )}
      </LiveKitRoom>
    </div>
  );
}

function RoomAudioBridge({ chatOpen, onUnreadMessage }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!room) return;

    let cancelled = false;

    const startAudio = async () => {
      if (cancelled || typeof room.startAudio !== "function") return;

      try {
        await room.startAudio();
      } catch {
        return;
      }
    };

    const handleInteraction = () => {
      void startAudio();
    };

    window.addEventListener("pointerdown", handleInteraction, {
      passive: true,
    });
    window.addEventListener("keydown", handleInteraction);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [room]);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        const isOwnMessage =
          data?.senderId &&
          (data.senderId === localParticipant?.identity ||
            data.senderId === localParticipant?.sid);

        if (data?.type === "chat" && !chatOpen && !isOwnMessage) {
          onUnreadMessage();
        }
      } catch (error) {
        console.warn("Unable to parse room data packet:", error);
      }
    };

    room.on("dataReceived", handleData);
    return () => room.off("dataReceived", handleData);
  }, [chatOpen, localParticipant, onUnreadMessage, room]);

  return null;
}
