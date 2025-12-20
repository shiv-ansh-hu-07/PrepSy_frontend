import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { fetchStats } from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [publicRooms, setPublicRooms] = useState([]);
  const [stats, setStats] = useState(null);

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
      <div className="p-6 text-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-20">

      <div className="text-xl font-semibold text-white mb-6">
        Welcome back, {user.name} 👋
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        <aside className="col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-400">Dashboard Menu</div>
          <ul className="mt-4 space-y-2 text-gray-300 text-sm">
            

            <li
              onClick={() => navigate("/myRooms")}
              className="py-2 px-2 rounded hover:bg-gray-800 cursor-pointer"
            >
              My Rooms
            </li>

            <li
              onClick={() => navigate("/create-room")}
              className="py-2 px-2 rounded hover:bg-gray-800 cursor-pointer"
            >
              Create Room
            </li>

            <li
              onClick={() => navigate("/join-room")}
              className="py-2 px-2 rounded hover:bg-gray-800 cursor-pointer"
            >
              Join Room
            </li>
          </ul>
        </aside>

        <main className="col-span-3 space-y-6">

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white">
              Live Public Rooms
            </h3>

            <div className="mt-4 space-y-4">

              {publicRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="p-4 border border-gray-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {room.name}
                    </div>

                    {room.tags && room.tags.length > 0 && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {room.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-brand-700 rounded-full text-white"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className="px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-500"
                    onClick={() => navigate(`/room/${room.roomId}`)}
                  >
                    Join
                  </button>
                </div>
              ))}

              {publicRooms.length === 0 && (
                <div className="text-gray-400 text-sm">
                  No public rooms available right now.
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white">
              Your Progress
            </h3>

            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-400">Active Rooms</div>
                <div className="text-3xl font-semibold text-white">
                  {stats?.activeRooms || 0}
                </div>
              </div>

              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-400">Online Users</div>
                <div className="text-3xl font-semibold text-white">
                  {stats?.activeUsers || 0}
                </div>
              </div>

              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-400">Avg Focus</div>
                <div className="text-3xl font-semibold text-white">
                  {stats?.avgFocus || 0}%
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
