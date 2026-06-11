import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const BG = "radial-gradient(ellipse at 60% 20%, #eef1fb 0%, #f4f6fd 55%, #f8f9fe 100%)";

const FILTER_TABS = [
  { label: "All", tag: "" },
  { label: "DSA", tag: "dsa" },
  { label: "System Design", tag: "system design" },
  { label: "Web Dev", tag: "web" },
  { label: "Aptitude", tag: "aptitude" },
];

function roomIcon(room) {
  const tags = (room.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes("dsa") || t.includes("algorithm") || t.includes("leetcode"))) return { icon: "⚡", bg: "#e8f5e9", accent: "#16a34a" };
  if (tags.some((t) => t.includes("system") || t.includes("design"))) return { icon: "📐", bg: "#e3f2fd", accent: "#1e88e5" };
  if (tags.some((t) => t.includes("react") || t.includes("frontend") || t.includes("web"))) return { icon: "⚛️", bg: "#e8eaf6", accent: "#5c6bc0" };
  if (tags.some((t) => t.includes("ml") || t.includes("machine") || t.includes("ai"))) return { icon: "🤖", bg: "#fce4ec", accent: "#e91e63" };
  if (tags.some((t) => t.includes("aptitude") || t.includes("quant") || t.includes("math"))) return { icon: "∑", bg: "#fff8e1", accent: "#f59e0b" };
  if (tags.some((t) => t.includes("interview") || t.includes("mock"))) return { icon: "🎤", bg: "#f3e8ff", accent: "#7c3aed" };
  if (tags.some((t) => t.includes("java") || t.includes("python") || t.includes("backend"))) return { icon: "☕", bg: "#fbe9e7", accent: "#e64a19" };
  if (tags.some((t) => t.includes("dp") || t.includes("dynamic"))) return { icon: "🧩", bg: "#e8f5e9", accent: "#2e7d32" };
  return { icon: "📚", bg: "#f3e8ff", accent: "#7c3aed" };
}

function getRoomStatus(room, nowTs) {
  const startTime = room?.startTime ? new Date(room.startTime) : null;
  const duration = Number(room?.durationMinutes || 0);
  if (!startTime || !duration) return { live: false, label: "Scheduled" };
  const end = new Date(startTime.getTime() + duration * 60000);
  const now = new Date(nowTs);
  if (room.isRecurring) {
    const h = startTime.getHours(), m = startTime.getMinutes();
    const todayStart = new Date(now);
    todayStart.setHours(h, m, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + duration * 60000);
    if (now >= todayStart && now <= todayEnd) return { live: true, label: "Live now" };
    return { live: false, label: "Daily " + startTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) };
  }
  if (now >= startTime && now <= end) return { live: true, label: "Live now" };
  if (now < startTime) return { live: false, label: startTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) };
  return { live: false, label: "Ended", ended: true };
}

export default function JoinRoom() {
  const [roomId, setRoomId] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [allRooms, setAllRooms] = useState([]);
  const [searchResults, setSearchResults] = useState(null); // null = show all, array = filtered
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [searching, setSearching] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadRooms() {
      try {
        setLoading(true);
        const res = await api.get("/rooms/public");
        setAllRooms(res.data.rooms || []);
      } catch (err) {
        console.error("Failed to load rooms:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
  }, []);

  const handleJoin = () => {
    if (!roomId.trim()) return alert("Enter a valid Room ID");
    navigate(`/room/${roomId.trim()}`);
  };

  const handleTagSearch = async () => {
    if (!tagQuery.trim()) { setSearchResults(null); return; }
    try {
      setSearching(true);
      const res = await api.get(`/rooms/search?tags=${encodeURIComponent(tagQuery)}`);
      setSearchResults(res.data.rooms || []);
    } catch {
      alert("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleTabFilter = async (tag) => {
    setActiveTab(tag);
    setTagQuery(tag);
    setSearchResults(null);
    if (!tag) return;
    try {
      setSearching(true);
      const res = await api.get(`/rooms/search?tags=${encodeURIComponent(tag)}`);
      setSearchResults(res.data.rooms || []);
    } catch { /* show all */ } finally {
      setSearching(false);
    }
  };

  const displayRooms = useMemo(() => {
    const rooms = searchResults !== null ? searchResults : allRooms;
    return rooms.filter((r) => {
      const s = getRoomStatus(r, now);
      return !s.ended;
    });
  }, [searchResults, allRooms, now]);

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: "40px 32px 64px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, color: "#2f3b63", margin: "0 0 8px", fontWeight: 700 }}>
            Find a Study Room
          </h1>
          <p style={{ color: "#6b78a0", fontSize: 14, margin: 0 }}>
            Join an existing room with its ID, or discover rooms by topic
          </p>
        </div>

        {/* Search card */}
        <div style={{
          background: "#fff", borderRadius: 22,
          border: "1px solid rgba(190,200,235,0.5)",
          boxShadow: "0 8px 32px rgba(100,116,180,0.09)",
          padding: "24px 28px", marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 0, alignItems: "center",
        }}>
          {/* Room ID */}
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#7b88b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Join by Room ID
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="Paste Room ID..."
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  border: "1px solid #d6d9e8",
                  padding: "0 14px", fontSize: 14,
                  outline: "none", color: "#2f3b63",
                  background: "#fafbff",
                }}
              />
              <button onClick={handleJoin} style={joinBtnStyle}>
                Join →
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px" }}>
            <div style={{ width: 1, height: 48, background: "rgba(190,200,235,0.6)" }} />
            <span style={{ fontSize: 12, color: "#9aa4c7", margin: "8px 0", fontWeight: 600 }}>OR</span>
            <div style={{ width: 1, height: 48, background: "rgba(190,200,235,0.6)" }} />
          </div>

          {/* Tag search */}
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#7b88b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Search by Topic
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTagSearch()}
                placeholder="e.g. dsa, react, system design..."
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  border: "1px solid #d6d9e8",
                  padding: "0 14px", fontSize: 14,
                  outline: "none", color: "#2f3b63",
                  background: "#fafbff",
                }}
              />
              <button onClick={handleTagSearch} disabled={searching} style={{ ...joinBtnStyle, background: "#f4f0ff", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "none" }}>
                {searching ? "..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {FILTER_TABS.map((tab) => {
            const active = activeTab === tab.tag;
            return (
              <button
                key={tab.tag}
                onClick={() => handleTabFilter(tab.tag)}
                style={{
                  padding: "8px 18px", borderRadius: 999,
                  border: active ? "1.5px solid #7c3aed" : "1px solid rgba(190,200,235,0.6)",
                  background: active ? "#7c3aed" : "#fff",
                  color: active ? "#fff" : "#4a5a85",
                  fontWeight: active ? 700 : 500, fontSize: 13,
                  cursor: "pointer",
                  boxShadow: active ? "0 4px 14px rgba(124,58,237,0.25)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
          {searchResults !== null && (
            <button
              onClick={() => { setSearchResults(null); setActiveTab(""); setTagQuery(""); }}
              style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #f3d0d0", background: "#fff5f5", color: "#d44", fontWeight: 500, fontSize: 13, cursor: "pointer" }}
            >
              ✕ Clear filter
            </button>
          )}
        </div>

        {/* Results header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#7b88b8" }}>
            {loading || searching
              ? "Loading rooms..."
              : `${displayRooms.length} room${displayRooms.length !== 1 ? "s" : ""} available`}
          </p>
          {!user && (
            <p style={{ margin: 0, fontSize: 12, color: "#9aa4c7" }}>
              Sign in to see more rooms
            </p>
          )}
        </div>

        {/* Room grid */}
        {(loading || searching) ? (
          <LoadingGrid />
        ) : displayRooms.length === 0 ? (
          <EmptyRoomsState onClear={() => { setSearchResults(null); setActiveTab(""); setTagQuery(""); }} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {displayRooms.map((room) => (
              <RoomCard key={room.roomId} room={room} now={now} onJoin={() => navigate(`/room/${room.roomId}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, now, onJoin }) {
  const status = getRoomStatus(room, now);
  const { icon, bg, accent } = roomIcon(room);
  const tags = (room.tags || []).slice(0, 4);
  const userCount = room?.activeUsers ?? 0;

  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      border: status.live ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(190,200,235,0.5)",
      boxShadow: "0 4px 24px rgba(100,116,180,0.07)",
      padding: "20px 20px 16px",
      display: "flex", flexDirection: "column",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: bg, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 22, flexShrink: 0,
        }}>{icon}</div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: status.live ? "#16a34a" : "#7c3aed",
          background: status.live ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.08)",
          padding: "4px 10px", borderRadius: 999,
        }}>
          {status.live ? "● Live" : status.label}
        </span>
      </div>

      {/* Name */}
      <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#2f3b63", lineHeight: 1.3 }}>
        {room.name}
      </h3>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14, flex: 1 }}>
        {tags.map((t) => (
          <span key={t} style={{
            fontSize: 11, color: accent, background: bg,
            padding: "2px 8px", borderRadius: 999, fontWeight: 500,
          }}>
            #{t}
          </span>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        {/* Avatar stack + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex" }}>
            {Array.from({ length: Math.min(3, userCount) }).map((_, i) => (
              <div key={i} style={{
                width: 26, height: 26, borderRadius: "50%",
                background: `hsl(${240 + i * 30}, 60%, 70%)`,
                border: "2px solid #fff",
                marginLeft: i > 0 ? -8 : 0,
                fontSize: 10, display: "flex", alignItems: "center",
                justifyContent: "center", color: "#fff", fontWeight: 600,
              }}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
            {userCount === 0 && (
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "#eef1fb", border: "1px dashed #c5ccec",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>
                👤
              </div>
            )}
          </div>
          <span style={{ fontSize: 12, color: "#9aa4c7" }}>
            {userCount > 0 ? `${userCount} studying` : "Be first"}
          </span>
        </div>

        {/* Join button */}
        {status.live ? (
          <button onClick={onJoin} style={{
            padding: "8px 18px", borderRadius: 12, border: "none",
            background: "#7c3aed", color: "#fff",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
          }}>
            Join Now
          </button>
        ) : (
          <button style={{
            padding: "8px 14px", borderRadius: 12,
            border: "1px solid rgba(190,200,235,0.7)",
            background: "#fafbff", color: "#7b88b8",
            fontWeight: 500, fontSize: 12, cursor: "default",
          }}>
            Notify me
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          background: "#fff", borderRadius: 20,
          border: "1px solid rgba(190,200,235,0.5)",
          padding: "20px", height: 160,
          animation: "pulse 1.5s ease-in-out infinite",
          opacity: 0.6,
        }} />
      ))}
    </div>
  );
}

function EmptyRoomsState({ onClear }) {
  const navigate = useNavigate();
  return (
    <div style={{
      textAlign: "center", padding: "56px 20px",
      background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
      borderRadius: 24, border: "1px dashed rgba(124,58,237,0.2)",
    }}>
      <p style={{ fontSize: 36, margin: "0 0 12px" }}>🏫</p>
      <p style={{ fontWeight: 700, color: "#4a5a85", fontSize: 16, margin: "0 0 8px" }}>No rooms found</p>
      <p style={{ fontSize: 14, color: "#7b88b8", margin: "0 0 24px", lineHeight: 1.6 }}>
        No active rooms match your search.<br />You could be the one to start the next session.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={onClear} style={{
          padding: "10px 22px", borderRadius: 12,
          border: "1px solid rgba(190,200,235,0.7)",
          background: "#fff", color: "#4a5a85",
          fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          Show all rooms
        </button>
        <button onClick={() => navigate("/create-room")} style={{
          padding: "10px 22px", borderRadius: 12, border: "none",
          background: "#7c3aed", color: "#fff",
          fontWeight: 600, fontSize: 13, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
        }}>
          Create a room →
        </button>
      </div>
    </div>
  );
}

const joinBtnStyle = {
  height: 44, padding: "0 18px", borderRadius: 12, border: "none",
  background: "#7c3aed", color: "#fff",
  fontWeight: 600, fontSize: 13, cursor: "pointer",
  boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
  whiteSpace: "nowrap",
};
