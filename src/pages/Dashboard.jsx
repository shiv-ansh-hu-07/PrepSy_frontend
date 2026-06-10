import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { fetchStats, fetchMyAnalytics } from "../services/api";
import AppSideNav from "../components/AppSideNav";

export default function Dashboard() {
  const { user, guestSessionActive } = useAuth();
  const navigate = useNavigate();
  const [publicRooms, setPublicRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [myAnalytics, setMyAnalytics] = useState(null);

  const isGuestViewer = !user && guestSessionActive;
  const displayName = user?.name || "Guest";

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const statsResp = await fetchStats();
        if (!cancelled) setStats(statsResp.stats);
      } catch (err) {
        console.error("Dashboard stats load error:", err);
      }
    }

    async function loadMyAnalytics() {
      if (!user?.id) return;
      try {
        const resp = await fetchMyAnalytics();
        if (!cancelled) setMyAnalytics(resp.analytics?.summary ?? null);
      } catch {
        // non-critical
      }
    }

    async function loadRooms() {
      try {
        const [roomsResp, myRoomsResp] = await Promise.all([
          api.get("/rooms/public"),
          user?.id
            ? api.get("/rooms/my")
            : Promise.resolve({ data: { createdRooms: [], joinedRooms: [] } }),
        ]);
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

        if (!cancelled) {
          setPublicRooms(mergedRooms);
        }
      } catch (err) {
        console.error("Dashboard rooms load error:", err);
      }
    }

    loadStats();
    loadRooms();
    loadMyAnalytics();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const sessionRooms = useMemo(() => {
    return [...publicRooms].sort(
      (a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime()
    );
  }, [publicRooms]);

  if (!user && !guestSessionActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
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
            Guest mode is active. Sign in to save rooms and keep your daily session streak.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 max-w-7xl mx-auto">
        <AppSideNav />

        <main className="lg:col-span-3 space-y-8">
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard
              label="Study Time"
              value={myAnalytics?.totalFocusLabel || "0m"}
              sub={myAnalytics?.totalFocusMinutes > 0 ? "total so far" : null}
              cta={!myAnalytics?.totalFocusMinutes ? { label: "Join a room →", onClick: () => navigate("/") } : null}
              accent="#7c3aed"
            />
            <StatCard
              label="Sessions Done"
              value={myAnalytics?.sessionsCompleted ?? 0}
              sub={myAnalytics?.sessionsCompleted > 0 ? `${myAnalytics.sessionsCompleted} completed` : null}
              cta={!myAnalytics?.sessionsCompleted ? { label: "Start your first →", onClick: () => navigate("/") } : null}
              accent="#8a9bd6"
            />
            <StatCard
              label="🔥 Streak"
              value={`${myAnalytics?.currentStreakDays ?? 0} day${(myAnalytics?.currentStreakDays ?? 0) === 1 ? "" : "s"}`}
              sub={
                (myAnalytics?.currentStreakDays ?? 0) === 0 && (myAnalytics?.bestStreakDays ?? 0) > 0
                  ? `Best: ${myAnalytics.bestStreakDays} days`
                  : (myAnalytics?.currentStreakDays ?? 0) > 0
                  ? "keep it going!"
                  : null
              }
              cta={(myAnalytics?.currentStreakDays ?? 0) === 0 && !(myAnalytics?.bestStreakDays) ? { label: "Study today →", onClick: () => navigate("/") } : null}
              accent="#f59e0b"
            />
            <StatCard
              label="This Week"
              value={`${myAnalytics?.studiedDaysThisWeek ?? 0} / 7`}
              sub="days studied"
              accent="#22c55e"
            />
          </section>

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

            <div className="max-h-[440px] space-y-6 overflow-y-auto pr-2">
              {sessionRooms
                .map((room) => (
                  <SessionRoomCard
                    key={room.roomId}
                    room={room}
                    onJoin={() => navigate(`/room/${room.roomId}`)}
                  />
                ))
                .filter(Boolean)}

              {sessionRooms.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "32px 20px",
                  background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                  borderRadius: 18,
                  border: "1px dashed rgba(124,58,237,0.2)",
                }}>
                  <p style={{ fontSize: 28, marginBottom: 8 }}>📚</p>
                  <p style={{ fontWeight: 600, color: "#4a5a85", marginBottom: 4, fontSize: 15 }}>No live rooms right now</p>
                  <p style={{ fontSize: 13, color: "#7b88b8", marginBottom: 16, lineHeight: 1.5 }}>
                    Be the first to start a session — your peers will follow.
                  </p>
                  <button
                    onClick={() => navigate("/create-room")}
                    style={{
                      padding: "10px 22px",
                      background: "#7c3aed",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
                    }}
                  >
                    Create a Room →
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SessionRoomCard({ room, onJoin }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const sessionMeta = getRoomSessionMeta(room, now);
  if (sessionMeta.status === "ended") {
    return null;
  }
  const activeUserCount = room?.activeUsers ?? 0;

  return (
    <div
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
            color: sessionMeta.status === "live" ? "#3b82f6" : "#7c3aed",
            fontWeight: 500,
          }}
        >
          {sessionMeta.label}
        </p>

        <p className="text-sm text-slate-500 mt-1">
          {activeUserCount} {activeUserCount === 1 ? "user" : "users"} in this room
        </p>
      </div>

      <button
        onClick={() => {
          if (sessionMeta.status === "live") {
            onJoin();
          }
        }}
        disabled={sessionMeta.status !== "live"}
        style={{
          padding: "10px 18px",
          borderRadius: "10px",
          backgroundColor:
            sessionMeta.status === "live" ? "#8a9bd6" : "#d8def4",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 500,
          border: "none",
          cursor: sessionMeta.status === "live" ? "pointer" : "not-allowed",
          boxShadow:
            sessionMeta.status === "live"
              ? "0 6px 20px rgba(138,155,214,0.45)"
              : "none",
          transition: "all 0.2s ease",
          minWidth: "112px",
        }}
      >
        {sessionMeta.status === "live" ? "Join" : "Starts Soon"}
      </button>
    </div>
  );
}

function StatCard({ label, value, sub, cta, accent = "#8a9bd6" }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: 20,
        boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
        padding: "20px 18px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent,
          borderRadius: "20px 20px 0 0",
        }}
      />
      <p style={{ fontSize: 12, color: "#6b78a0", margin: 0, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 700, color: "#2f3b63", margin: 0, lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && !cta && (
        <p style={{ fontSize: 11, color: "#9aa4c7", margin: 0 }}>{sub}</p>
      )}
      {cta && (
        <button
          onClick={cta.onClick}
          style={{
            marginTop: 4,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 600,
            color: accent,
            background: "transparent",
            border: `1px solid ${accent}`,
            borderRadius: 20,
            cursor: "pointer",
          }}
        >
          {cta.label}
        </button>
      )}
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
        label: `Live Session \u2022 ends in ${formatDuration(
          nextWindow.end.getTime() - nowTs
        )}`,
        sortAt: nextWindow.start.getTime(),
      };
    }

    return {
      status: "scheduled",
      label: `Upcoming Session \u2022 starts in ${formatDuration(
        nextWindow.start.getTime() - nowTs
      )}`,
      sortAt: nextWindow.start.getTime(),
    };
  }

  const endTime = new Date(startTime.getTime() + durationMs);
  if (now >= startTime && now <= endTime) {
    return {
      status: "live",
      label: `Live Session \u2022 ends in ${formatDuration(endTime.getTime() - nowTs)}`,
      sortAt: startTime.getTime(),
    };
  }

  if (now < startTime) {
    return {
      status: "scheduled",
      label: `Upcoming Session \u2022 starts in ${formatDuration(
        startTime.getTime() - nowTs
      )}`,
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
