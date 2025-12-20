import React from "react";
import { Link } from "react-router-dom";
import useLiveStats from "../hooks/useLiveStats";
import LiveStatsCard from "../components/LiveStatsCard";

export default function Home() {
  const { data, loading, error } = useLiveStats(8000);

  return (
    <section className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-6 md:px-12 py-20">

        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center justify-center">

          {/* LEFT TEXT SECTION */}
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl font-extrabold leading-tight text-white">
              Study together. Stay consistent. Achieve more.
            </h1>

            <p className="mt-6 text-gray-300 max-w-xl">
              HomesWork recreates the productivity of group study — accountability,
              structured sessions, and peer motivation — all inside lightweight virtual rooms.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                to="/login"
                className="px-5 py-3 rounded-md bg-brand-800 text-white font-medium"
              >
                Get started — it's free
              </Link>

              <a
                href="#features"
                className="px-5 py-3 rounded-md border border-gray-700 text-gray-300"
              >
                See demo
              </a>
            </div>

            <div className="mt-10 flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                  👩‍🎓
                </div>
                <span>Trusted by students preparing for JEE, NEET & UPSC</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE (LIVE STATS + LIVE ROOM CARD) */}
          <div className="space-y-8 w-full flex flex-col justify-center items-center">

            {/* LIVE STATS CARD */}
            <div className="w-full max-w-md">
              <LiveStatsCard stats={data?.stats} />
            </div>

            {/* LIVE ROOM CARD */}
            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-linear-to-b from-gray-900/60 to-gray-900/40 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Live Study Room</h3>
                  <p className="text-sm text-gray-400">Physics • Pomodoro</p>
                </div>
                <div className="text-sm text-gray-400">45m</div>
              </div>

              <div className="mt-4">
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-3 bg-brand-700 w-3/4"></div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <div>Focus: {data?.room?.focus ?? "—"}%</div>
                  <div>{data?.room?.participants ?? "—"} participants</div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Link
                  to="/study-room"
                  className="px-4 py-2 rounded-md bg-brand-800 text-white"
                >
                  Join
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <section id="features" className="mt-24 w-full flex justify-center">
          <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-10">

            <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
              <h4 className="font-semibold text-white">Real-time Rooms</h4>
              <p className="mt-2 text-gray-400 text-sm">
                Timed sessions, screen sharing, and collaborative notes.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
              <h4 className="font-semibold text-white">AI Nudges</h4>
              <p className="mt-2 text-gray-400 text-sm">
                Personalized reminders and study plans tailored to your routine.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
              <h4 className="font-semibold text-white">Mentor Tools</h4>
              <p className="mt-2 text-gray-400 text-sm">
                Monetize rooms, moderate participants, and schedule sessions.
              </p>
            </div>

          </div>
        </section>

      </div>
    </section>
  );
}
