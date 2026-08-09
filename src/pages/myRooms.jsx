import React, { useEffect, useState } from "react";
import axios from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function MyRooms() {
  const [rooms, setRooms] = useState(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const loadingRooms = loading || (user && rooms === null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let cancelled = false;

    axios
      .get("/rooms/my")
      .then((res) => {
        if (cancelled) return;

        const mergedRooms = [
          ...(res.data.createdRooms || []),
          ...(res.data.joinedRooms || []),
        ];
        const uniqueRooms = Array.from(
          new Map(mergedRooms.map((room) => [room.roomId, room])).values()
        );

        setRooms(uniqueRooms);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          setRooms([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  const joinRoom = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  const deleteRoom = async (roomId) => {
    const ok = window.confirm(
      "Are you sure you want to delete this room? This action cannot be undone."
    );
    if (!ok) return;

    try {
      await axios.delete(`/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete room");
    }
  };

  return (
    <div className="flex-1 px-10 py-8" style={{ minHeight: "calc(100vh - 76px)", background: "var(--page-bg)" }}>
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            color: "var(--text-secondary)",
          }}
        >
          Your Study Rooms
        </h1>
        <p style={{
            fontFamily: "Georgia, serif",
            fontSize: "16px",
            color: "var(--text-secondary)",
          }}>
          Continue where you left off or join a new session
        </p>
      </div>

      {loadingRooms && (
        <div className="mt-20 text-center">
          <p className="text-slate-500">Loading your rooms...</p>
        </div>
      )}

      {/* Empty State */}
      {!loadingRooms && rooms?.length === 0 && (
        <div className="mt-20 text-center">
          <p className="text-slate-500">
            You haven’t joined or created any rooms yet.
          </p>
          <button
            onClick={() => navigate("/create-room")}
            className="
              mt-4 px-5 py-2
              bg-slate-800 text-white
              rounded-lg
              hover:bg-slate-700 transition
            "
          >
            Create Your First Room
          </button>
        </div>
      )}

      {/* Rooms List */}
      <div className="space-y-4 max-w-4xl mx-auto">
        {(rooms || []).map((room) => (
          <div
            key={room.roomId}
            className="
              bg-white
              border border-slate-200
              rounded-xl
              px-6 py-4
              flex items-center justify-between
              shadow-sm
              hover:shadow-md
              transition
            "
          >
            {/* Left */}
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                {room.name}
              </h3>

              {room.isCohortRoom && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  ▶ Cohort
                </span>
              )}

              <div className="mt-1 flex flex-wrap gap-2">
                {room.tags && room.tags.length > 0 ? (
                  room.tags.map((tag) => (
                    <span
                      key={`${room.roomId}-${tag}`}
                      className="text-xs text-slate-500"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No tags
                  </span>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => joinRoom(room.roomId)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "var(--accent-gradient)",        // HomesWork-like lavender blue
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(138,155,214,0.45)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#7c8dcc";
                  e.currentTarget.style.boxShadow =
                    "0 8px 26px rgba(138,155,214,0.55)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(138,155,214,0.45)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Join
              </button>

              {room.ownerId === user?.id && (
                <button
                  onClick={() => deleteRoom(room.roomId)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: "var(--accent-gradient)",        // HomesWork-like lavender blue
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(138,155,214,0.45)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#7c8dcc";
                    e.currentTarget.style.boxShadow =
                      "0 8px 26px rgba(138,155,214,0.55)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(138,155,214,0.45)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>

        ))}
      </div>
    </div>
  );
}

export default MyRooms;
