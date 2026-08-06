import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const BG = "radial-gradient(ellipse at 60% 20%, var(--accent-soft) 0%, #f4f6fd 55%, #f8f9fe 100%)";

const FILTER_TABS = [
  { label: "All", tag: "" },
  { label: "DSA", tag: "dsa" },
  { label: "System Design", tag: "system design" },
  { label: "Web Dev", tag: "web" },
  { label: "Aptitude", tag: "aptitude" },
];

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

function roomIcon(room) {
  const tags = (room.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes("dsa") || t.includes("algorithm") || t.includes("leetcode"))) return { icon: "⚡", bg: "#e8f5e9", accent: "#16a34a" };
  if (tags.some((t) => t.includes("system") || t.includes("design"))) return { icon: "📐", bg: "#e3f2fd", accent: "#1e88e5" };
  if (tags.some((t) => t.includes("react") || t.includes("frontend") || t.includes("web"))) return { icon: "⚛️", bg: "#e8eaf6", accent: "#5c6bc0" };
  if (tags.some((t) => t.includes("ml") || t.includes("machine") || t.includes("ai"))) return { icon: "🤖", bg: "#fce4ec", accent: "#e91e63" };
  if (tags.some((t) => t.includes("aptitude") || t.includes("quant") || t.includes("math"))) return { icon: "∑", bg: "#fff8e1", accent: "#f59e0b" };
  if (tags.some((t) => t.includes("interview") || t.includes("mock"))) return { icon: "🎤", bg: "#f3e8ff", accent: "#7c3aed" };
  if (tags.some((t) => t.includes("java") || t.includes("python") || t.includes("backend"))) return { icon: "☕", bg: "#fbe9e7", accent: "#e64a19" };
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
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [searching, setSearching] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const navigate = useNavigate();
  const { user } = useAuth();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 960;
  const cols = isMobile ? 1 : isTablet ? 2 : 3;

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
    } catch { alert("Search failed"); } finally { setSearching(false); }
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
    } catch { /* show all */ } finally { setSearching(false); }
  };

  const displayRooms = useMemo(() => {
    const rooms = searchResults !== null ? searchResults : allRooms;
    return rooms.filter((r) => !getRoomStatus(r, now).ended);
  }, [searchResults, allRooms, now]);

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: isMobile ? "24px 16px 48px" : "40px 24px 64px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: isMobile ? 20 : 28, textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: isMobile ? 24 : 30, color: "var(--text-primary)", margin: "0 0 8px", fontWeight: 700 }}>
            Find a Study Room
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
            Join with a Room ID, or discover rooms by topic
          </p>
        </div>

        {/* Search card */}
        <div style={{
          background: "var(--card-bg)", borderRadius: 20,
          border: "1px solid var(--card-border)",
          boxShadow: "0 8px 32px rgba(100,116,180,0.09)",
          padding: isMobile ? "18px 16px" : "22px 24px",
          marginBottom: 20,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 16 : 0,
        }}>
          {/* Room ID */}
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 600, color: "#7b88b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Join by Room ID
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={roomId} onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="Paste Room ID..."
                style={{ flex: 1, height: 42, borderRadius: 11, border: "1px solid #d6d9e8", padding: "0 13px", fontSize: 14, outline: "none", color: "var(--text-primary)", background: "#fafbff" }}
              />
              <button onClick={handleJoin} style={{ ...joinBtnStyle, padding: "0 16px", height: 42, fontSize: 13 }}>Join →</button>
            </div>
          </div>

          {/* Divider */}
          {!isMobile && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px" }}>
              <div style={{ width: 1, height: 42, background: "rgba(190,200,235,0.6)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0", fontWeight: 600 }}>OR</span>
              <div style={{ width: 1, height: 42, background: "rgba(190,200,235,0.6)" }} />
            </div>
          )}
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(190,200,235,0.6)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "rgba(190,200,235,0.6)" }} />
            </div>
          )}

          {/* Tag search */}
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 600, color: "#7b88b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Search by Topic
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={tagQuery} onChange={(e) => setTagQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTagSearch()}
                placeholder="e.g. dsa, react, system design..."
                style={{ flex: 1, height: 42, borderRadius: 11, border: "1px solid #d6d9e8", padding: "0 13px", fontSize: 14, outline: "none", color: "var(--text-primary)", background: "#fafbff" }}
              />
              <button onClick={handleTagSearch} disabled={searching}
                style={{ ...joinBtnStyle, background: "var(--accent-soft)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "none", padding: "0 14px", height: 42, fontSize: 13 }}>
                {searching ? "..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {/* Filter tabs — horizontal scroll on mobile */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 20,
          overflowX: "auto", paddingBottom: 4,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {FILTER_TABS.map((tab) => {
            const active = activeTab === tab.tag;
            return (
              <button key={tab.tag} onClick={() => handleTabFilter(tab.tag)} style={{
                padding: "7px 16px", borderRadius: 999, flexShrink: 0,
                border: active ? "1.5px solid #7c3aed" : "1px solid rgba(190,200,235,0.6)",
                background: active ? "#7c3aed" : "#fff",
                color: active ? "#fff" : "var(--text-secondary)",
                fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
                boxShadow: active ? "0 4px 14px rgba(124,58,237,0.25)" : "none",
                transition: "all 0.15s",
              }}>
                {tab.label}
              </button>
            );
          })}
          {searchResults !== null && (
            <button onClick={() => { setSearchResults(null); setActiveTab(""); setTagQuery(""); }} style={{
              padding: "7px 12px", borderRadius: 999, flexShrink: 0,
              border: "1px solid #f3d0d0", background: "#fff5f5",
              color: "#d44", fontWeight: 500, fontSize: 13, cursor: "pointer",
            }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Results header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#7b88b8" }}>
            {loading || searching ? "Loading rooms..." : `${displayRooms.length} room${displayRooms.length !== 1 ? "s" : ""} available`}
          </p>
        </div>

        {/* Room grid */}
        {(loading || searching) ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
            {Array.from({ length: cols * 2 }).map((_, i) => (
              <div key={i} style={{ background: "var(--card-bg)", borderRadius: 18, border: "1px solid var(--card-border)", height: 150, opacity: 0.5 }} />
            ))}
          </div>
        ) : displayRooms.length === 0 ? (
          <EmptyRoomsState onClear={() => { setSearchResults(null); setActiveTab(""); setTagQuery(""); }} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isMobile ? 12 : 16 }}>
            {displayRooms.map((room) => (
              <RoomCard key={room.roomId} room={room} now={now} isMobile={isMobile} onJoin={() => navigate(`/room/${room.roomId}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, now, isMobile, onJoin }) {
  const status = getRoomStatus(room, now);
  const { icon, bg, accent } = roomIcon(room);
  const tags = (room.tags || []).slice(0, isMobile ? 3 : 4);
  const userCount = room?.activeUsers ?? 0;

  return (
    <div style={{
      background: "var(--card-bg)", borderRadius: 18,
      border: status.live ? "1px solid rgba(34,197,94,0.2)" : "1px solid var(--card-border)",
      boxShadow: "0 4px 20px rgba(100,116,180,0.07)",
      padding: isMobile ? "16px 14px 14px" : "18px 18px 14px",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: status.live ? "#16a34a" : "#7c3aed",
          background: status.live ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.08)",
          padding: "3px 9px", borderRadius: 999,
        }}>
          {status.live ? "● Live" : status.label}
        </span>
      </div>

      <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
        {room.name}
      </h3>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12, flex: 1 }}>
        {tags.map((t) => (
          <span key={t} style={{ fontSize: 11, color: accent, background: bg, padding: "2px 7px", borderRadius: 999, fontWeight: 500 }}>#{t}</span>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ display: "flex" }}>
            {Array.from({ length: Math.min(3, userCount || 0) }).map((_, i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: `hsl(${240 + i * 30}, 60%, 70%)`, border: "2px solid #fff", marginLeft: i > 0 ? -6 : 0, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600 }}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
            {(!userCount || userCount === 0) && (
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent-soft)", border: "1px dashed #c5ccec", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>👤</div>
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{userCount > 0 ? `${userCount}` : "0"}</span>
        </div>

        {status.live ? (
          <button onClick={onJoin} style={{ padding: "7px 15px", borderRadius: 10, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.28)" }}>
            Join Now
          </button>
        ) : (
          <button style={{ padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(190,200,235,0.7)", background: "#fafbff", color: "#7b88b8", fontWeight: 500, fontSize: 11, cursor: "default" }}>
            Notify me
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyRoomsState({ onClear }) {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", borderRadius: 22, border: "1px dashed rgba(124,58,237,0.2)" }}>
      <p style={{ fontSize: 36, margin: "0 0 12px" }}>🏫</p>
      <p style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 16, margin: "0 0 6px" }}>No rooms found</p>
      <p style={{ fontSize: 14, color: "#7b88b8", margin: "0 0 22px", lineHeight: 1.6 }}>
        No active rooms match your search.<br />You could be the one to start the next session.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onClear} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(190,200,235,0.7)", background: "var(--card-bg)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Show all rooms
        </button>
        <button onClick={() => navigate("/create-room")} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
          Create a room →
        </button>
      </div>
    </div>
  );
}

const joinBtnStyle = {
  borderRadius: 11, border: "none", background: "#7c3aed", color: "#fff",
  fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.28)",
  whiteSpace: "nowrap", flexShrink: 0,
};
