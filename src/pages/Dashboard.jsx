import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { fetchStats } from "../services/api";

export default function Dashboard() {
  const { user, guestSessionActive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [publicRooms, setPublicRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [now, setNow] = useState(Date.now());

  const isGuestViewer = !user && guestSessionActive;
  const displayName = user?.name || "Guest";
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    async function loadDashboard() {
      try {
        const roomsResp = await api.get("/rooms/public");
        const myRoomsResp = user?.id
          ? await api.get("/rooms/my")
          : { data: { createdRooms: [], joinedRooms: [] } };
        const statsResp = await fetchStats();
        const publicRoomsList = roomsResp.data.rooms || [];
        const personalRooms = [
          ...(myRoomsResp.data.createdRooms || []),
          ...(myRoomsResp.data.joinedRooms || []),
        ];
        const mergedRooms = Array.from(
          new Map(
            [...publicRoomsList, ...personalRooms].map((room) => [room.roomId, room])
          ).values()
        );
        setPublicRooms(mergedRooms);
        setStats(statsResp.stats);
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
    }

    loadDashboard();
  }, [user?.id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!user && !guestSessionActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const menuItems = [
    { label: "Home", path: "/dashboard", disabled: false },
    { label: "Community", path: "/community", disabled: false },
    {
      label: "My Rooms",
      path: "/myRooms",
      disabled: isGuestViewer,
      disabledHint: "Available after signing in",
    },
    { label: "Create Room", path: "/create-room", disabled: false },
    { label: "Join Room", path: "/join-room", disabled: false },
  ];

  const sessionRooms = [...publicRooms]
    .map((room) => ({
      ...room,
      sessionMeta: getRoomSessionMeta(room, now),
    }))
    .filter((room) => room.sessionMeta.status !== "ended")
    .sort((a, b) => a.sessionMeta.sortAt - b.sessionMeta.sortAt);

  return (
    <div
      className="min-h-screen px-10 py-10"
      style={{
        background:
          "radial-gradient(ellipse at top, #eef1fb 0%, #f3f5fc 45%, #f8f9fe 75%)",
      }}
    >
      <div className="max-w-7xl mx-auto mb-12">
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            color: "#4a5a85",
          }}
        >
          Welcome back, {displayName}
        </h1>

        {isGuestViewer ? (
          <p
            style={{
              marginTop: "10px",
              maxWidth: "620px",
              color: "#6b78a0",
              lineHeight: 1.6,
            }}
          >
            Guest mode is active. My Rooms and streak-based account features stay disabled until you sign in.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 max-w-7xl mx-auto">
        <aside
          className="
            bg-white/70 backdrop-blur-md
            border border-white/40
            rounded-2xl
            shadow-[0_12px_40px_rgba(0,0,0,0.06)]
            p-8
          "
        >
          <p className="text-sm text-[#6b78a0] mb-6">Dashboard Menu</p>

          <ul className="space-y-2 text-[15px]">
            {menuItems.map(({ label, path, disabled, disabledHint }) => {
              const active = isActive(path);

              return (
                <li
                  key={label}
                  onClick={() => {
                    if (!disabled) {
                      navigate(path);
                    }
                  }}
                  title={disabled ? disabledHint : undefined}
                  aria-disabled={disabled}
                  style={{
                    position: "relative",
                    padding: "10px 14px 10px 18px",
                    borderRadius: "12px",
                    cursor: disabled ? "not-allowed" : "pointer",
                    backgroundColor: active
                      ? "rgba(138,155,214,0.14)"
                      : "transparent",
                    color: disabled
                      ? "#94a3b8"
                      : active
                        ? "#5f6fa3"
                        : "#475569",
                    fontWeight: active ? 500 : 400,
                    opacity: disabled ? 0.7 : 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  {active && !disabled ? (
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
                  ) : null}

                  {label}
                  {disabled ? " (Locked)" : ""}
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="lg:col-span-3 space-y-12">
          <section
            className="
              bg-white/70 backdrop-blur-md
              border border-white/40
              rounded-2xl
              shadow-[0_12px_40px_rgba(0,0,0,0.06)]
              p-8
            "
          >
            <h3 className="font-medium text-[#4a5a85] mb-8">Active Sessions</h3>

            <div className="space-y-6">
              {sessionRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="
                    flex items-center justify-between
                    border-b border-slate-200/60
                    pb-5 last:border-none
                  "
                >
                  <div className="pr-4">
                    <p className="font-medium text-slate-700">{room.name}</p>

                    <p
                      className="text-sm mt-1"
                      style={{
                        color:
                          room.sessionMeta.status === "live"
                            ? "#3b82f6"
                            : "#7c3aed",
                        fontWeight: 500,
                      }}
                    >
                      {room.sessionMeta.label}
                    </p>

                    {room.tags?.length > 0 ? (
                      <p className="text-sm text-slate-500 mt-1">
                        {room.tags.map((tag) => `#${tag}`).join(" ")}
                      </p>
                    ) : null}
                  </div>

                  <button
                    onClick={() => {
                      if (room.sessionMeta.status === "live") {
                        navigate(`/room/${room.roomId}`);
                      }
                    }}
                    disabled={room.sessionMeta.status !== "live"}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      backgroundColor:
                        room.sessionMeta.status === "live" ? "#8a9bd6" : "#d8def4",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 500,
                      border: "none",
                      cursor:
                        room.sessionMeta.status === "live" ? "pointer" : "not-allowed",
                      boxShadow:
                        room.sessionMeta.status === "live"
                          ? "0 6px 20px rgba(138,155,214,0.45)"
                          : "none",
                      transition: "all 0.2s ease",
                      minWidth: "112px",
                    }}
                    onMouseEnter={(e) => {
                      if (room.sessionMeta.status !== "live") return;
                      e.currentTarget.style.backgroundColor = "#7c8dcc";
                      e.currentTarget.style.boxShadow =
                        "0 8px 26px rgba(138,155,214,0.55)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      if (room.sessionMeta.status !== "live") return;
                      e.currentTarget.style.backgroundColor = "#8a9bd6";
                      e.currentTarget.style.boxShadow =
                        "0 6px 20px rgba(138,155,214,0.45)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {room.sessionMeta.status === "live" ? "Join" : "Starts Soon"}
                  </button>
                </div>
              ))}

              {sessionRooms.length === 0 ? (
                <p className="text-sm text-[#6b78a0]">No upcoming sessions.</p>
              ) : null}
            </div>
          </section>

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
      <p className="text-sm text-[#6b78a0] mb-1">{label}</p>
      <p className="text-2xl font-medium text-slate-700">{value}</p>
    </div>
  );
}

function getRoomSessionMeta(room, nowTs) {
  const now = new Date(nowTs);
  const startTime = room?.startTime ? new Date(room.startTime) : null;
  const durationMinutes = Number(room?.durationMinutes || 0);
  const durationMs = durationMinutes * 60 * 1000;

  if (!startTime || !durationMinutes) {
    return {
      status: "ended",
      label: "",
      sortAt: Number.MAX_SAFE_INTEGER,
    };
  }

  if (room.isRecurring) {
    const nextWindow = getRecurringWindow(room, now);
    if (!nextWindow) {
      return {
        status: "ended",
        label: "",
        sortAt: Number.MAX_SAFE_INTEGER,
      };
    }

    if (now >= nextWindow.start && now <= nextWindow.end) {
      return {
        status: "live",
        label: `Live Session • ends in ${formatDuration(nextWindow.end.getTime() - nowTs)}`,
        sortAt: nextWindow.start.getTime(),
      };
    }

    return {
      status: "scheduled",
      label: `Upcoming Session • starts in ${formatDuration(nextWindow.start.getTime() - nowTs)}`,
      sortAt: nextWindow.start.getTime(),
    };
  }

  const endTime = new Date(startTime.getTime() + durationMs);
  if (now >= startTime && now <= endTime) {
    return {
      status: "live",
      label: `Live Session • ends in ${formatDuration(endTime.getTime() - nowTs)}`,
      sortAt: startTime.getTime(),
    };
  }

  if (now < startTime) {
    return {
      status: "scheduled",
      label: `Upcoming Session • starts in ${formatDuration(startTime.getTime() - nowTs)}`,
      sortAt: startTime.getTime(),
    };
  }

  return {
    status: "ended",
    label: "",
    sortAt: Number.MAX_SAFE_INTEGER,
  };
}

function getRecurringWindow(room, now) {
  const recurrenceType = room?.recurrenceType || "";
  const [, rawTimeZone] = recurrenceType.split("|");
  const timeZone = rawTimeZone || "Asia/Kolkata";
  const scheduled = getZonedParts(new Date(room.startTime), timeZone);
  const today = getZonedParts(now, timeZone);

  const startToday = zonedTimeToUtc(
    today.year,
    today.month,
    today.day,
    scheduled.hour,
    scheduled.minute,
    timeZone
  );
  const endToday = new Date(
    startToday.getTime() + Number(room.durationMinutes) * 60 * 1000
  );

  if (now <= endToday) {
    return {
      start: startToday,
      end: endToday,
    };
  }

  const startTomorrow = zonedTimeToUtc(
    today.year,
    today.month,
    today.day + 1,
    scheduled.hour,
    scheduled.minute,
    timeZone
  );

  return {
    start: startTomorrow,
    end: new Date(startTomorrow.getTime() + Number(room.durationMinutes) * 60 * 1000),
  };
}

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return asUtc - date.getTime();
}

function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
