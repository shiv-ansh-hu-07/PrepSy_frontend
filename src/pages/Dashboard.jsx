import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { fetchStats } from "../services/api";
import { useLocation } from "react-router-dom";


export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [publicRooms, setPublicRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const location = useLocation();
  const isActive = (path) => location.pathname === path;



  useEffect(() => {
    async function loadDashboard() {
      try {
        const roomsResp = await api.get("/rooms/public");
        const statsResp = await fetchStats();
        setPublicRooms(roomsResp.data.rooms || []);
        setStats(statsResp.stats);
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
    }
    loadDashboard();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-10 py-10"
      style={{
        background:
          "radial-gradient(ellipse at top, #eef1fb 0%, #f3f5fc 45%, #f8f9fe 75%)",
      }}
    >
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-12">
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            color: "#4a5a85",
          }}
        >
          Welcome back, {user.name} <span style={{ marginLeft: "6px" }}>👋</span>
        </h1>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 max-w-7xl mx-auto">

        {/* SIDEBAR */}
        <aside
          className="
            bg-white/70 backdrop-blur-md
            border border-white/40
            rounded-2xl
            shadow-[0_12px_40px_rgba(0,0,0,0.06)]
            p-8
          "
        >
          <p className="text-sm text-[#6b78a0] mb-6">
            Dashboard Menu
          </p>

          <ul className="space-y-2 text-[15px]">
            {[
              { label: "Home", path: "/dashboard" },
              { label: "My Rooms", path: "/myRooms" },
              { label: "Create Room", path: "/create-room" },
              { label: "Join Room", path: "/join-room" },
            ].map(({ label, path }) => {
              const active = isActive(path);

              return (
                <li
                  key={label}
                  onClick={() => navigate(path)}
                  style={{
                    position: "relative",
                    padding: "10px 14px 10px 18px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    backgroundColor: active
                      ? "rgba(138,155,214,0.14)"
                      : "transparent",
                    color: active ? "#5f6fa3" : "#475569",
                    fontWeight: active ? 500 : 400,
                    transition: "all 0.2s ease",
                  }}
                >
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "10%",
                        height: "80%",
                        width: "4px",
                        borderRadius: "4px",
                        backgroundColor: "#8a9bd6",
                      }}
                    />
                  )}

                  {label}
                </li>
              );
            })}
          </ul>

        </aside>

        {/* MAIN */}
        <main className="lg:col-span-3 space-y-12">

          {/* UPCOMING SESSIONS */}
          <section
            className="
              bg-white/70 backdrop-blur-md
              border border-white/40
              rounded-2xl
              shadow-[0_12px_40px_rgba(0,0,0,0.06)]
              p-8
            "
          >
            <h3 className="font-medium text-[#4a5a85] mb-8">
              Active Sessions
            </h3>

            <div className="space-y-6">
              {publicRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="
                    flex items-center justify-between
                    border-b border-slate-200/60
                    pb-5 last:border-none
                  "
                >
                  <div>
                    <p className="font-medium text-slate-700">
                      {room.name}
                    </p>

                    {room.tags?.length > 0 && (
                      <p className="text-sm text-slate-500 mt-1">
                        {room.tags.map((t) => `#${t}`).join(" ")}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/room/${room.roomId}`)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#8a9bd6",        
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

                </div>
              ))}

              {publicRooms.length === 0 && (
                <p className="text-sm text-[#6b78a0]">
                  No upcoming sessions.
                </p>
              )}
            </div>
          </section>

          {/* STATS */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="Active Rooms" value={stats?.activeRooms || 0} />
            <StatCard label="Online Users" value={stats?.activeUsers || 0} />
            <StatCard label="Avg Focus" value={`${stats?.avgFocus || 0}%`} />
          </section>

        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      className="
        bg-white/70 backdrop-blur-md
        border border-white/40
        rounded-2xl
        shadow-[0_12px_30px_rgba(0,0,0,0.06)]
        p-6 text-center
      "
    >
      <p className="text-sm text-[#6b78a0] mb-1">
        {label}
      </p>
      <p className="text-2xl font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}
