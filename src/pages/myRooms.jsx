import React, { useEffect, useState } from "react";
import axios from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function MyRooms() {
  const [rooms, setRooms] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    axios
      .get("/rooms/my")
      .then((res) => {
        const combined = [
          ...res.data.createdRooms,
          ...res.data.joinedRooms,
        ];

        const uniqueRooms = Array.from(
          new Map(combined.map((room) => [room.roomId, room])).values()
        );

        setRooms(uniqueRooms);
      })
      .catch(console.error);
  }, [user]);

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
    <div className="flex-1 px-10 py-8">
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            color: "#4a5a85",
          }}
        >
          Your Study Rooms
        </h1>
        <p style={{
            fontFamily: "Georgia, serif",
            fontSize: "16px",
            color: "#4a5a85",
          }}>
          Continue where you left off or join a new session
        </p>
      </div>

      {/* Empty State */}
      {rooms.length === 0 && (
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
        {rooms.map((room) => (
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
                  backgroundColor: "#8a9bd6",        // HomesWork-like lavender blue
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
                  e.currentTarget.style.backgroundColor = "#8a9bd6";
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
                    backgroundColor: "#8a9bd6",        // HomesWork-like lavender blue
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
                    e.currentTarget.style.backgroundColor = "#8a9bd6";
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
