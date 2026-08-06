import React from "react";

const features = [
  
  {
  title: "Collaborative Study Rooms",
  subtitle: "Study together, stay focused",
  icon: "👥",
  highlight: true,
  points: [
    "Study alongside peers preparing for the same topic or exam",
    
    "Discuss doubts whenever Stuck",
    "Join alone or together — both feel natural",
  ],
},

{
    title: "Pomodoro Study Sessions",
    subtitle: "25 minutes",
    icon: "⏰",
    points: [
      "25 minutes feels mentally manageable",
      "Removes the pressure of studying for hours",
      "Clear beginning and end to effort",
    ],
  },

  {
    title: "5-Minute Breaks",
    subtitle: "Between sessions",
    icon: "☕",
    points: [
      "Prevents burnout",
      "Mirrors natural study rhythms",
      "Breaks are for resetting, not optimizing",
    ],
  },
  {
    title: "Soft Start",
    subtitle: "Gentle entry",
    icon: "📖",
    points: [
      "Reduces anxiety before starting",
      "Removes urgency",
      "Makes joining feel safe",
    ],
  },
  {
    title: "Scheduled Study Rooms",
    subtitle: "Fixed routine",
    icon: "📅",
    points: [
      "Builds daily routine",
      "Removes decision-making",
      "Turns PrepSy into a place, not an event",
    ],
  },
  {
    title: "Topic-Specific Rooms",
    subtitle: "Focused sessions",
    icon: "🎯",
    points: [
      "Prevents mismatch",
      "Keeps sessions focused",
      "Creates commitment",
    ],
  },
  {
    title: "Room Memory",
    subtitle: "Easy return",
    icon: "🔁",
    points: [
      "Reduces friction on return",
      "Builds continuity",
      "Encourages consistency",
    ],
  },
  {
    title: "Calm Notifications",
    subtitle: "No pressure",
    icon: "🔔",
    points: [
      "Informational only",
      "No guilt or reminders",
      "Quiet social presence",
    ],
  },
  {
    title: "Session Closure Check",
    subtitle: "Mental closure",
    icon: "✅",
    points: [
      "Psychological closure",
      "Reduces open-loop stress",
      "Self-check, not feedback",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-[#f7f9ff] to-[#eef1ff] px-6 py-20">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h1 className="text-4xl font-semibold text-[var(--text-secondary)]">
          PrepSy Features
        </h1>
        <p className="mt-4 text-lg text-[#5f6c9a]">
          Designed for focus. Built for consistency. Gentle by design.
        </p>
        <p className="mt-6 text-base text-[#6b78a8]">
          PrepSy isn’t about studying harder. It’s about making studying feel
          lighter, safer, and repeatable.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-[0_10px_30px_rgba(80,90,160,0.12)]"
          >
            {/* Card Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#e8ecff] flex items-center justify-center text-xl">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#2f3a68]">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#7a86b6]">
                  {feature.subtitle}
                </p>
              </div>
            </div>

            {/* Points */}
            <ul className="space-y-2 mt-4">
              {feature.points.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-[#556195]"
                >
                  <span className="text-[#7c8cff] mt-0.5">✔</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
