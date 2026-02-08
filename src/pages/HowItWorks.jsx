import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      title: "Choose a Study Room",
      description:
        "Pick a room based on your topic or exam. Rooms run at fixed times, so you always know when to study.",
    },
    {
      title: "Settle In",
      description:
        "A short soft start gives you a moment to calm down before the session begins.",
    },
    {
      title: "Study Together",
      description:
        "Join a 25-minute focused session. Others study alongside you. Collaborate with others",
    },
    {
      title: "Take a Real Break",
      description:
        "After each session, take a 5-minute break meant for rest, not productivity.",
    },
    {
      title: "Continue or Pause",
      description:
        "Continue with another session or stop without guilt. Optional reflection helps you feel done.",
    },
    {
      title: "Come Back Easily",
      description:
        "PrepSy remembers your last room, so returning feels effortless.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f9ff] to-[#eef1ff] px-6 py-20">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-4xl font-semibold text-[#2f3a68]">
          How PrepSy Works
        </h1>
        <p className="mt-4 text-lg text-[#5f6c9a]">
          A simple, calm way to study — together.
        </p>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto space-y-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-white/80 backdrop-blur rounded-2xl px-6 py-5 shadow-[0_10px_30px_rgba(80,90,160,0.12)]"
          >
            <span className="text-sm font-medium text-[#7c8cff]">
              Step {index + 1}
            </span>

            <h3 className="mt-2 text-lg font-medium text-[#2f3a68]">
              {step.title}
            </h3>

            <p className="mt-2 text-sm text-[#556195] leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="max-w-2xl mx-auto text-center mt-20 text-[#6b78a8] text-sm">
        Collaborate with others, but without the pressure to perform. <br /> 
          
        <br />
        Just a shared place to study — calmly and consistently.
      </div>
    </div>
  );
}
