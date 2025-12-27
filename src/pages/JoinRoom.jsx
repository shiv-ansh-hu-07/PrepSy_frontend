import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function JoinRoom() {
  const [roomId, setRoomId] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleJoin = () => {
    if (!roomId.trim()) return alert("Enter a valid Room ID");
    navigate(`/room/${roomId}`);
  };

  const searchByTags = async () => {
    if (!tagQuery.trim()) return;

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

  const isMobile = window.innerWidth < 900;

  /* ---------------- STYLES ---------------- */

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

  /* ---------------- JSX ---------------- */

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>

        {/* LEFT: JOIN CARD */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Join a Room</h2>
          <p style={subText}>
            Enter a room ID or discover rooms by tags
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
            {loading && <p style={mutedText}>Searching…</p>}
            {!loading && results.length === 0 && tagQuery && (
              <p style={mutedText}>No rooms found</p>
            )}

            {results.map((room) => (
              <div key={room.roomId} style={resultCard}>
                <div>
                  <p style={{ fontWeight: 600 }}>{room.name}</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
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
        </div>

        {/* RIGHT: ILLUSTRATION */}
        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src="/joinRoom_img.png"
              alt="Students studying together"
              style={illustrationStyle}
            />
          </div>
        )}

      </div>
    </div>
  );
}
