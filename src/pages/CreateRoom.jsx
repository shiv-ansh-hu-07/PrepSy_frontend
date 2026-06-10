import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const COLLAB_STYLE_OPTIONS = [
  { value: "quiet-focus", label: "Quiet Focus", desc: "Silent deep work, no interruptions" },
  { value: "discussion-heavy", label: "Discussion Heavy", desc: "Active dialogue and idea exchange" },
  { value: "pair-study", label: "Pair Study", desc: "Work through problems together" },
  { value: "project-based", label: "Project Based", desc: "Collaborate on a shared project" },
  { value: "interview-practice", label: "Interview Practice", desc: "Mock interviews and problem solving" },
];

const GOAL_OPTIONS = [
  "DSA & Algorithms", "Competitive Programming", "Interview Prep", "Placements",
  "Job Switch", "FAANG / Top Tech", "System Design", "Full-Stack Development",
  "Web Development", "Mobile Development", "Backend Development", "Frontend Development",
  "DevOps / Cloud", "Data Science", "Machine Learning / AI", "Cybersecurity",
  "Open Source", "Freelancing / Startup", "GATE", "CAT / MBA", "UPSC / Civil Services",
  "Research / Academia",
];

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
  "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu", "Odia",
  "Assamese", "French", "German", "Spanish", "Japanese",
];

const EXPERTISE_OPTIONS = [
  { label: "Learning", value: "learning" },
  { label: "Practising", value: "practising" },
  { label: "Problem Solving", value: "problem-solving" },
];

const FALLBACK_TIMEZONES = [
  "Asia/Kolkata", "UTC", "Asia/Dubai", "Europe/London",
  "America/New_York", "America/Los_Angeles",
];

const TIMEZONE_OPTIONS =
  typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone").map((tz) =>
        tz === "Asia/Calcutta" ? "Asia/Kolkata" : tz
      )
    : FALLBACK_TIMEZONES;

const normalizeTimeZone = (tz) =>
  tz === "Asia/Calcutta" ? "Asia/Kolkata" : tz;

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 12,
          border: "1px solid #d6d9e8",
          background: "#ffffff",
          padding: "0 14px",
          fontSize: 14,
          color: selected.length > 0 ? "#2f3b63" : "#9aa4c7",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          outline: "none",
          boxSizing: "border-box",
        }}
      >
        <span>
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "#9aa4c7",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.18s",
            display: "inline-block",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#ffffff",
            border: "1px solid #d6d9e8",
            borderRadius: 14,
            boxShadow: "0 12px 36px rgba(79,97,160,0.14)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 12px 6px" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{
                width: "100%",
                height: 36,
                borderRadius: 8,
                border: "1px solid #e2e6f3",
                padding: "0 12px",
                fontSize: 13,
                outline: "none",
                background: "#f8f9ff",
                color: "#2f3b63",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px 6px 8px" }}>
            {filtered.length === 0 && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#9aa4c7",
                  padding: "12px 0",
                  margin: 0,
                }}
              >
                No matches
              </p>
            )}
            {filtered.map((option) => (
              <label
                key={option}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  color: selected.includes(option) ? "#6f3bd6" : "#4a5a85",
                  background: selected.includes(option) ? "#f3eeff" : "transparent",
                  userSelect: "none",
                  transition: "background 0.12s",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  style={{ accentColor: "#7c3aed", cursor: "pointer" }}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {selected.map((item) => (
            <span
              key={item}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#ede9fb",
                color: "#6f3bd6",
                fontSize: 12,
                padding: "4px 10px 4px 12px",
                borderRadius: 999,
                fontWeight: 500,
              }}
            >
              {item}
              <span
                role="button"
                tabIndex={0}
                style={{
                  cursor: "pointer",
                  lineHeight: 1,
                  fontSize: 15,
                  color: "#9b77e0",
                  marginLeft: 1,
                }}
                onClick={() => toggle(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggle(item);
                }}
                aria-label={`Remove ${item}`}
              >
                ×
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      style={{
        width: 50,
        height: 28,
        borderRadius: 999,
        border: "none",
        background: value ? "#7c3aed" : "#d5dbef",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: value ? 23 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#ffffff",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function SectionHeader({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "22px 0 14px",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#6f3bd6",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(to right, rgba(124,58,237,0.2), transparent)",
        }}
      />
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12,
        color: "#6b78a0",
        marginBottom: 5,
        fontWeight: 500,
      }}
    >
      {children}
    </label>
  );
}

const inputBase = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid #d6d9e8",
  padding: "0 14px",
  fontSize: 14,
  marginBottom: 14,
  outline: "none",
  color: "#32446f",
  background: "#ffffff",
  boxSizing: "border-box",
  display: "block",
};

export default function CreateRoom() {
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState("");
  const [roomId] = useState(crypto.randomUUID());
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [visibility, setVisibility] = useState("PRIVATE");
  const [expertise, setExpertise] = useState("learning");
  const [collaborationStyle, setCollaborationStyle] = useState("quiet-focus");
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleTime, setScheduleTime] = useState("19:00");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [timezone, setTimezone] = useState(
    normalizeTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
    )
  );
  const [submitting, setSubmitting] = useState(false);

  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 900 : false;

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!roomName.trim()) {
      alert("Room name is required");
      return;
    }

    if (scheduleEnabled && !scheduleTime) {
      alert("Start time is required for a scheduled room");
      return;
    }

    const parsedDuration = Number(durationMinutes);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      alert("Enter a valid session duration in minutes");
      return;
    }

    const finalTags = Array.from(new Set([expertise, ...goals]));

    try {
      setSubmitting(true);
      const res = await api.post("/rooms/create", {
        name: roomName.trim(),
        roomId,
        description: description.trim(),
        tags: finalTags,
        visibility,
        femaleOnly,
        preferredLanguages: languages,
        collaborationStyle,
        durationMinutes: parsedDuration,
        scheduleTime: scheduleEnabled ? scheduleTime : null,
        timezone: scheduleEnabled ? timezone : null,
        isRecurring: scheduleEnabled,
      });

      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create room");
    } finally {
      setSubmitting(false);
    }
  };

  const expertiseLabel =
    EXPERTISE_OPTIONS.find((e) => e.value === expertise)?.label || "Learning";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 60% 20%, #eef1fb 0%, #f4f6fd 55%, #f8f9fe 100%)",
        display: "flex",
        justifyContent: "center",
        padding: "36px 24px 64px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 320px",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* ── FORM ── */}
        <form
          onSubmit={handleCreate}
          style={{
            background: "#ffffff",
            border: "1px solid rgba(190,200,235,0.52)",
            borderRadius: 24,
            padding: "32px 30px",
            boxShadow: "0 16px 44px rgba(79,97,160,0.1)",
          }}
        >
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 26,
              color: "#2f3b63",
              textAlign: "center",
              margin: "0 0 6px",
            }}
          >
            Create a Study Room
          </h2>
          <p
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "#6b78a0",
              margin: "0 0 6px",
            }}
          >
            Set up a focused study space and invite others to join your session.
          </p>

          {/* ── Room Basics ── */}
          <SectionHeader>Room Basics</SectionHeader>

          <FieldLabel>Room Name *</FieldLabel>
          <input
            style={inputBase}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g. DSA Sprint — Arrays & Strings"
          />

          <FieldLabel>Room ID</FieldLabel>
          <input
            style={{ ...inputBase, background: "#f3f5ff", color: "#6b78a0" }}
            value={roomId}
            readOnly
          />

          <FieldLabel>Description</FieldLabel>
          <textarea
            style={{
              ...inputBase,
              height: 88,
              padding: "10px 14px",
              resize: "vertical",
            }}
            placeholder="What will you study? Any prerequisites or goals for the session?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <FieldLabel>Session Duration (minutes) *</FieldLabel>
          <input
            type="number"
            min="15"
            step="15"
            style={inputBase}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="e.g. 90"
          />
          <p style={{ margin: "-8px 0 14px", fontSize: 11, color: "#9aa4c7" }}>
            Sets the Pomodoro timer automatically — e.g. 90 min → 3 sessions × ~27 min + 5 min breaks
          </p>

          {/* ── Room Settings ── */}
          <SectionHeader>Room Settings</SectionHeader>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginBottom: 20,
            }}
          >
            {/* Visibility */}
            <div>
              <FieldLabel>Visibility</FieldLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { value: "PRIVATE", label: "Private", desc: "Invite only" },
                  { value: "PUBLIC", label: "Public", desc: "Discoverable by anyone" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="radio"
                      checked={visibility === opt.value}
                      onChange={() => setVisibility(opt.value)}
                      style={{ accentColor: "#7c3aed", marginTop: 3 }}
                    />
                    <span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 14,
                          color: "#2f3b63",
                          fontWeight: 500,
                        }}
                      >
                        {opt.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#9aa4c7",
                          marginTop: 1,
                        }}
                      >
                        {opt.desc}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Expertise */}
            <div>
              <FieldLabel>Expertise</FieldLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {EXPERTISE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="radio"
                      checked={expertise === opt.value}
                      onChange={() => setExpertise(opt.value)}
                      style={{ accentColor: "#7c3aed" }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        color: "#2f3b63",
                        fontWeight: 500,
                      }}
                    >
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Female Only */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: femaleOnly ? "#fdf4ff" : "#fafbff",
              border: `1px solid ${femaleOnly ? "rgba(217,70,239,0.2)" : "#eceef8"}`,
              borderRadius: 14,
              marginBottom: 4,
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#2f3b63",
                  fontWeight: 500,
                }}
              >
                Female participants only
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9aa4c7" }}>
                Restricts room access to female members
              </p>
            </div>
            <Toggle value={femaleOnly} onChange={setFemaleOnly} />
          </div>

          {/* ── Collaboration Style ── */}
          <SectionHeader>Collaboration Style</SectionHeader>
          <p style={{ margin: "-8px 0 12px", fontSize: 12, color: "#9aa4c7" }}>
            How will participants work together in this room?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
            {COLLAB_STYLE_OPTIONS.map((opt) => {
              const active = collaborationStyle === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setCollaborationStyle(opt.value)}
                  style={{
                    border: `1.5px solid ${active ? "#7c3aed" : "#d6d9e8"}`,
                    borderRadius: 14,
                    padding: "12px 14px",
                    cursor: "pointer",
                    background: active ? "#f3eeff" : "#fafbff",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: active ? "#6f3bd6" : "#2f3b63" }}>
                    {opt.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: active ? "#9b77e0" : "#9aa4c7", lineHeight: 1.4 }}>
                    {opt.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── Study Goals ── */}
          <SectionHeader>Study Goals</SectionHeader>
          <p style={{ margin: "-8px 0 10px", fontSize: 12, color: "#9aa4c7" }}>
            Select the topics this room will focus on
          </p>
          <MultiSelect
            options={GOAL_OPTIONS}
            selected={goals}
            onChange={setGoals}
            placeholder="Select study goals..."
          />

          {/* ── Preferred Languages ── */}
          <SectionHeader>Preferred Languages</SectionHeader>
          <p style={{ margin: "-8px 0 10px", fontSize: 12, color: "#9aa4c7" }}>
            Sessions will be conducted in these languages
          </p>
          <MultiSelect
            options={LANGUAGE_OPTIONS}
            selected={languages}
            onChange={setLanguages}
            placeholder="Select languages..."
          />

          {/* ── Daily Scheduling ── */}
          <SectionHeader>Daily Scheduling</SectionHeader>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 14, color: "#2f3b63", fontWeight: 500 }}>
              Enable Daily Schedule
            </span>
            <Toggle value={scheduleEnabled} onChange={setScheduleEnabled} />
          </div>

          {scheduleEnabled && (
            <div
              style={{
                background: "#f8f9ff",
                border: "1px solid #e6e9f8",
                borderRadius: 16,
                padding: 18,
                marginBottom: 20,
              }}
            >
              <FieldLabel>Start Time</FieldLabel>
              <input
                type="time"
                style={inputBase}
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />

              <FieldLabel>Timezone</FieldLabel>
              <select
                style={{ ...inputBase, appearance: "auto" }}
                value={timezone}
                onChange={(e) => setTimezone(normalizeTimeZone(e.target.value))}
              >
                {Array.from(new Set(TIMEZONE_OPTIONS)).map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 999,
              background: submitting
                ? "#b8bfdf"
                : "linear-gradient(135deg, #6f3bd6 0%, #7c3aed 100%)",
              color: "#ffffff",
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: submitting
                ? "none"
                : "0 10px 24px rgba(124,58,237,0.28)",
              marginTop: 10,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            {submitting ? "Creating room..." : "Create & Join Room"}
          </button>
        </form>

        {/* ── PREVIEW PANEL ── */}
        {!isMobile && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "sticky",
              top: 80,
            }}
          >
            {/* Live preview */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(190,200,235,0.52)",
                borderRadius: 18,
                padding: 20,
                boxShadow: "0 8px 24px rgba(79,97,160,0.08)",
              }}
            >
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9aa4c7",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Room Preview
              </p>

              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: roomName ? "#2f3b63" : "#b8c0d8",
                  fontStyle: roomName ? "normal" : "italic",
                }}
              >
                {roomName || "Untitled Room"}
              </p>

              {description && (
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 12,
                    color: "#6b78a0",
                    lineHeight: 1.5,
                  }}
                >
                  {description.length > 80
                    ? `${description.slice(0, 80)}…`
                    : description}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                <BadgePill
                  bg={
                    expertise === "learning"
                      ? "#dbeafe"
                      : expertise === "practising"
                        ? "#fef3c7"
                        : "#ede9fb"
                  }
                  color={
                    expertise === "learning"
                      ? "#1d4ed8"
                      : expertise === "practising"
                        ? "#b45309"
                        : "#6f3bd6"
                  }
                >
                  {expertiseLabel}
                </BadgePill>

                <BadgePill
                  bg={visibility === "PUBLIC" ? "#dcfce7" : "#f3f4f6"}
                  color={visibility === "PUBLIC" ? "#15803d" : "#4b5563"}
                >
                  {visibility === "PUBLIC" ? "Public" : "Private"}
                </BadgePill>

                {femaleOnly && (
                  <BadgePill bg="#fce7f3" color="#be185d">
                    Female Only
                  </BadgePill>
                )}
              </div>

              {goals.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#9aa4c7",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    Goals
                  </p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {goals.slice(0, 4).map((g) => (
                      <span
                        key={g}
                        style={{
                          display: "inline-block",
                          padding: "3px 9px",
                          background: "#ede9fb",
                          color: "#6f3bd6",
                          fontSize: 11,
                          borderRadius: 999,
                          fontWeight: 500,
                        }}
                      >
                        {g}
                      </span>
                    ))}
                    {goals.length > 4 && (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 9px",
                          background: "#f3f4f6",
                          color: "#6b78a0",
                          fontSize: 11,
                          borderRadius: 999,
                        }}
                      >
                        +{goals.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {languages.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#9aa4c7",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    Languages
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b78a0" }}>
                    {languages.join(", ")}
                  </p>
                </div>
              )}

              {durationMinutes && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 10px",
                    background: "#f8f9ff",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#4a5a85",
                  }}
                >
                  {durationMinutes} min session
                  {scheduleEnabled && scheduleTime ? ` · Daily at ${scheduleTime}` : ""}
                  {collaborationStyle && ` · ${COLLAB_STYLE_OPTIONS.find(o => o.value === collaborationStyle)?.label || ""}`}
                </div>
              )}
            </div>

            {/* Features */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(190,200,235,0.52)",
                borderRadius: 18,
                padding: 18,
                boxShadow: "0 8px 24px rgba(79,97,160,0.08)",
              }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2f3b63",
                }}
              >
                What comes with every room
              </p>
              {[
                "Confirmation email after scheduling",
                "Participant reminders 15 min before",
                "Daily recurring sessions",
                "Shareable room ID for quick entry",
                "AI focus monitor during sessions",
              ].map((feat) => (
                <div
                  key={feat}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: 9,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#ede9fb",
                      color: "#7c3aed",
                      fontSize: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontWeight: 700,
                      marginTop: 1,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: 12, color: "#4a5a85", lineHeight: 1.5 }}>
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BadgePill({ bg, color, children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}
