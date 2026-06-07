import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function JoinRoom() {
  const [roomId, setRoomId] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const canSearchRooms = Boolean(user);
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 900 : false;

  const handleJoin = () => {
    if (!roomId.trim()) return alert("Enter a valid Room ID");
    navigate(`/room/${roomId}`);
  };

  const searchByTags = async () => {
    if (!canSearchRooms || !tagQuery.trim()) return;

    try {
      setLoading(true);
      const res = await api.get(
        `/rooms/search?tags=${encodeURIComponent(tagQuery)}`
      );
      setResults(res.data.rooms || []);
    } catch (err) {
      console.error(err);
      alert("Failed to search rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = async (tag) => {
    if (!canSearchRooms) return;

    setTagQuery(tag);

    try {
      setLoading(true);
      const res = await api.get(
        `/rooms/search?tags=${encodeURIComponent(tag)}`
      );
      setResults(res.data.rooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    background: "#f6f7fb",
    display: "flex",
    justifyContent: "center",
    padding: "80px 24px",
  };

  const layoutStyle = {
    width: "100%",
    maxWidth: "1100px",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 420px",
    gap: "40px",
    alignItems: "center",
  };

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "22px",
    border: "1px solid #e6e8f0",
    padding: "28px",
    boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
  };

  const headingStyle = {
    fontFamily: "Georgia, serif",
    fontSize: "26px",
    color: "#2f3b63",
    textAlign: "center",
    marginBottom: "6px",
  };

  const subText = {
    textAlign: "center",
    fontSize: "13px",
    color: "#6b78a0",
    marginBottom: "24px",
  };

  const labelStyle = {
    fontSize: "12px",
    color: "#6b78a0",
    marginBottom: "4px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    height: "36px",
    borderRadius: "8px",
    border: "1px solid #d6d9e8",
    padding: "0 12px",
    fontSize: "13px",
    marginBottom: "12px",
    outline: "none",
  };

  const primaryButton = {
    width: "100%",
    height: "38px",
    borderRadius: "999px",
    background: "#8a9bd6",
    color: "#ffffff",
    border: "none",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(138,155,214,0.4)",
  };

  const secondaryButton = {
    ...primaryButton,
    background: "#eef1ff",
    color: "#4a5a85",
    boxShadow: "none",
  };

  const divider = {
    textAlign: "center",
    fontSize: "12px",
    color: "#9aa4c7",
    margin: "26px 0",
  };

  const sectionHeading = {
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "10px",
    color: "#2f3b63",
  };

  const mutedText = {
    fontSize: "12px",
    color: "#9aa4c7",
    lineHeight: 1.6,
  };

  const resultCard = {
    background: "#f9faff",
    border: "1px solid #e6e8f0",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  };

  const tagChip = {
    fontSize: "11px",
    padding: "4px 10px",
    background: "#eef1ff",
    color: "#4a5a85",
    borderRadius: "999px",
    cursor: "pointer",
  };

  const joinMiniButton = {
    padding: "6px 14px",
    borderRadius: "999px",
    background: "#8a9bd6",
    color: "#ffffff",
    border: "none",
    fontSize: "12px",
    cursor: "pointer",
  };

  const illustrationStyle = {
    width: "100%",
    maxWidth: "380px",
    opacity: 0.95,
    filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.08))",
  };

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <div style={cardStyle}>
          <h2 style={headingStyle}>Join a Room</h2>
          <p style={subText}>
            {canSearchRooms
              ? "Enter a room ID or discover rooms by tags"
              : "Enter a room ID to join instantly as a guest"}
          </p>

          <label style={labelStyle}>Room ID</label>
          <input
            style={inputStyle}
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
          />

          <button onClick={handleJoin} style={primaryButton}>
            Join Room
          </button>

          {canSearchRooms ? (
            <>
              <div style={divider}>OR</div>

              <h3 style={sectionHeading}>Discover rooms by tags</h3>

              <input
                style={inputStyle}
                placeholder="e.g. dsa, jee, react"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
              />

              <button onClick={searchByTags} style={secondaryButton}>
                Search Rooms
              </button>

              <div style={{ marginTop: "20px" }}>
                {loading && <p style={mutedText}>Searching...</p>}
                {!loading && results.length === 0 && tagQuery && (
                  <p style={mutedText}>No rooms found</p>
                )}

                {results.map((room) => (
                  <div key={room.roomId} style={resultCard}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{room.name}</p>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginTop: "6px",
                        }}
                      >
                        {room.tags.map((tag) => (
                          <span
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            style={tagChip}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/room/${room.roomId}`)}
                      style={joinMiniButton}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginTop: "22px" }}>
              <p style={mutedText}>
                Guests can join directly with a room ID. Sign in if you want to
                discover rooms by tags or save rooms to your account.
              </p>
            </div>
          )}
        </div>

        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <StudyIllustration style={illustrationStyle} />
          </div>
        )}
      </div>
    </div>
  );
}

function StudyIllustration({ style }) {
  return (
    <svg
      width="380"
      height="300"
      viewBox="0 0 380 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-label="Two people studying together on laptops"
    >
      <ellipse cx="190" cy="165" rx="155" ry="120" fill="#EEF1FF" opacity="0.85" />

      {/* Left desk */}
      <rect x="58" y="196" width="116" height="10" rx="5" fill="#c5ccec" />
      <rect x="74" y="187" width="84" height="11" rx="3" fill="#8a9bd6" opacity="0.65" />
      {/* Left laptop screen */}
      <rect x="76" y="152" width="80" height="50" rx="6" fill="#2f3b63" />
      <rect x="79" y="155" width="74" height="42" rx="4" fill="#3d4f8a" opacity="0.75" />
      <rect x="84" y="161" width="32" height="3" rx="1.5" fill="#8a9bd6" opacity="0.8" />
      <rect x="84" y="167" width="50" height="3" rx="1.5" fill="#6b78a0" opacity="0.55" />
      <rect x="84" y="173" width="40" height="3" rx="1.5" fill="#8a9bd6" opacity="0.65" />
      <rect x="84" y="179" width="56" height="3" rx="1.5" fill="#6b78a0" opacity="0.45" />
      <rect x="84" y="185" width="28" height="3" rx="1.5" fill="#8a9bd6" opacity="0.5" />
      {/* Left person */}
      <circle cx="116" cy="132" r="22" fill="#c5ccec" />
      <ellipse cx="116" cy="157" rx="22" ry="10" fill="#b0badf" />

      {/* Right desk */}
      <rect x="206" y="196" width="116" height="10" rx="5" fill="#c5ccec" />
      <rect x="222" y="187" width="84" height="11" rx="3" fill="#8a9bd6" opacity="0.65" />
      {/* Right laptop screen */}
      <rect x="224" y="152" width="80" height="50" rx="6" fill="#2f3b63" />
      <rect x="227" y="155" width="74" height="42" rx="4" fill="#3d4f8a" opacity="0.75" />
      <rect x="232" y="161" width="48" height="3" rx="1.5" fill="#8a9bd6" opacity="0.8" />
      <rect x="232" y="167" width="36" height="3" rx="1.5" fill="#6b78a0" opacity="0.55" />
      <rect x="232" y="173" width="56" height="3" rx="1.5" fill="#8a9bd6" opacity="0.65" />
      <rect x="232" y="179" width="30" height="3" rx="1.5" fill="#6b78a0" opacity="0.45" />
      <rect x="232" y="185" width="44" height="3" rx="1.5" fill="#8a9bd6" opacity="0.5" />
      {/* Right person */}
      <circle cx="264" cy="132" r="22" fill="#c5ccec" />
      <ellipse cx="264" cy="157" rx="22" ry="10" fill="#b0badf" />

      {/* Connection dots in the middle */}
      <circle cx="190" cy="168" r="6" fill="#8a9bd6" opacity="0.5" />
      <circle cx="170" cy="160" r="4" fill="#8a9bd6" opacity="0.32" />
      <circle cx="210" cy="160" r="4" fill="#8a9bd6" opacity="0.32" />

      {/* Focus dots around heads */}
      <circle cx="90" cy="108" r="5" fill="#8a9bd6" opacity="0.38" />
      <circle cx="290" cy="112" r="4" fill="#8a9bd6" opacity="0.3" />
      <circle cx="190" cy="100" r="7" fill="#8a9bd6" opacity="0.45" />

      <text x="190" y="240" textAnchor="middle" fill="#4a5a85" fontSize="14" fontFamily="Georgia, serif">Study together. Grow faster.</text>
      <text x="190" y="260" textAnchor="middle" fill="#6b78a0" fontSize="12" fontFamily="system-ui, sans-serif">Join a room and get into flow.</text>
    </svg>
  );
}
