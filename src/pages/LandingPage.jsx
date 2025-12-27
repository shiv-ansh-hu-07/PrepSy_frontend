import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper text-textMain font-sans">

      {/* HERO SECTION */}
      <section className="flex flex-col items-center text-center pt-28 px-6">

        <h1 className="font-serif text-4xl md:text-5xl mb-4">
          A calm place to study together.
        </h1>

        <p className="text-textMuted max-w-xl">
          Focus better. Stay consistent. Prepare quietly.
        </p>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => {
              if (user) navigate("/dashboard");
              else navigate("/login");
            }}
            className="px-6 py-3 rounded-full bg-primary text-white shadow-soft"
          >
            Try for free
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 rounded-full border border-borderSoft"
          >
            How it works
          </button>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="mt-28 max-w-3xl mx-auto text-center px-6">
        <p className="font-serif text-xl">
          Studying alone is difficult — not because you lack discipline,
          but because humans focus better together.
        </p>

        <p className="text-textMuted mt-4">
          HomesWork recreates the quiet presence of a real study room, online.
        </p>
      </section>

      {/* FEATURES */}
      <section className="mt-20 px-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          ["Join a study room", "Choose a silent or guided room."],
          ["Start a session", "Pomodoro-based focused time."],
          ["Study together", "Others are present. Chat stays muted."],
          ["Leave with progress", "No noise. Just consistency."],
        ].map(([title, desc]) => (
          <div
            key={title}
            className="bg-card border border-borderSoft rounded-2xl p-6 shadow-soft text-center"
          >
            <h4 className="font-medium mb-2">{title}</h4>
            <p className="text-sm text-textMuted">{desc}</p>
          </div>
        ))}
      </section>

      {!user && (
        <div className="text-center mt-24 pb-16">
          <button
            onClick={() => navigate("/login")}
            className="text-primary underline"
          >
            Login to track your focus and sessions
          </button>
        </div>
      )}
    </div>
  );
}
