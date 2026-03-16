import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const ROOM_TYPES = [
  { label: "Learning", value: "learning" },
  { label: "Practising", value: "practising" },
  { label: "Problem Solving", value: "problem-solving" },
];

const FALLBACK_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

const TIMEZONE_OPTIONS =
  typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone").map((tz) =>
        tz === "Asia/Calcutta" ? "Asia/Kolkata" : tz
      )
    : FALLBACK_TIMEZONES;

const normalizeTimeZone = (timeZone) =>
  timeZone === "Asia/Calcutta" ? "Asia/Kolkata" : timeZone;

export default function CreateRoom() {
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState("");
  const [roomId] = useState(crypto.randomUUID());
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [visibility, setVisibility] = useState("PRIVATE");
  const [roomType, setRoomType] = useState("learning");
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleTime, setScheduleTime] = useState("19:00");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [timezone, setTimezone] = useState(
    normalizeTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
    )
  );
  const [submitting, setSubmitting] = useState(false);

  const addTag = (e) => {
    if (e.key !== "Enter" || !tagInput.trim()) {
      return;
    }

    e.preventDefault();
    const tag = tagInput.trim().toLowerCase();
    if (!tags.includes(tag)) {
      setTags((current) => [...current, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!roomName.trim()) {
      alert("Classroom name is required");
      return;
    }

    if (scheduleEnabled && !scheduleTime) {
      alert("Start time is required for a scheduled classroom");
      return;
    }

    const parsedDuration = Number(durationMinutes);
    if (scheduleEnabled && (!Number.isFinite(parsedDuration) || parsedDuration <= 0)) {
      alert("Enter a valid duration in minutes");
      return;
    }

    let finalTags = tags;
    if (tagInput.trim()) {
      const tag = tagInput.trim().toLowerCase();
      if (!finalTags.includes(tag)) {
        finalTags = [...finalTags, tag];
      }
    }

    finalTags = Array.from(new Set([roomType, ...finalTags]));

    try {
      setSubmitting(true);
      const res = await api.post("/rooms/create", {
        name: roomName.trim(),
        roomId,
        description: description.trim(),
        tags: finalTags,
        visibility,
        scheduleTime: scheduleEnabled ? scheduleTime : null,
        durationMinutes: scheduleEnabled ? parsedDuration : null,
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

  const labelStyle = {
    fontSize: "12px",
    color: "#6b78a0",
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    height: "44px",
    borderRadius: "12px",
    border: "1px solid #d6d9e8",
    padding: "0 14px",
    fontSize: "14px",
    marginBottom: "16px",
    outline: "none",
    color: "#32446f",
    background: "#ffffff",
  };

  const radioStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#4a5a85",
    cursor: "pointer",
  };

  const sectionLabelStyle = {
    fontSize: "15px",
    color: "#5c6d9c",
    marginBottom: "12px",
    fontWeight: 500,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f7f8fc 0%, #eef2ff 50%, #f7f8fc 100%)",
        display: "flex",
        justifyContent: "center",
        padding: "32px 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "920px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "32px",
        }}
      >
        <form
          onSubmit={handleCreate}
          style={{
            background: "#ffffff",
            border: "1px solid #e6e8f0",
            borderRadius: "22px",
            padding: "30px",
            boxShadow: "0 16px 44px rgba(79, 97, 160, 0.1)",
          }}
        >
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "28px",
              textAlign: "center",
              color: "#2f3b63",
              marginBottom: "8px",
            }}
          >
            Create a Classroom
          </h2>

          <p
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: "#6b78a0",
              marginBottom: "28px",
            }}
          >
            Schedule focused study sessions and automatically notify everyone at the right time.
          </p>

          <label style={labelStyle}>Classroom Name</label>
          <input
            style={inputStyle}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter classroom name"
          />

          <label style={labelStyle}>Room ID</label>
          <input
            style={{
              ...inputStyle,
              background: "#eef1ff",
              color: "#4a5a85",
            }}
            value={roomId}
            readOnly
          />

          <label style={labelStyle}>Description</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: "92px",
              height: "92px",
              padding: "12px 14px",
              resize: "vertical",
            }}
            placeholder="What will be covered in this classroom?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div style={sectionLabelStyle}>Room Visibility</div>
          <div style={{ display: "flex", gap: "18px", marginBottom: "24px" }}>
            <label style={radioStyle}>
              <input
                type="radio"
                checked={visibility === "PRIVATE"}
                onChange={() => setVisibility("PRIVATE")}
              />
              Private
            </label>

            <label style={radioStyle}>
              <input
                type="radio"
                checked={visibility === "PUBLIC"}
                onChange={() => setVisibility("PUBLIC")}
              />
              Public
            </label>
          </div>

          <div style={sectionLabelStyle}>Room Type</div>
          <div
            style={{
              display: "flex",
              gap: "18px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            {ROOM_TYPES.map((type) => (
              <label key={type.value} style={radioStyle}>
                <input
                  type="radio"
                  checked={roomType === type.value}
                  onChange={() => setRoomType(type.value)}
                />
                {type.label}
              </label>
            ))}
          </div>

          <label style={labelStyle}>Tags</label>
          <input
            style={inputStyle}
            placeholder="Type tag and press Enter (e.g. dsa, jee)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
          />

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              minHeight: "32px",
              marginBottom: "24px",
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: "#eef1ff",
                  color: "#4a5a85",
                  fontSize: "12px",
                  padding: "5px 11px",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                #{tag}
                <span
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  onClick={() => removeTag(tag)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      removeTag(tag);
                    }
                  }}
                >
                  x
                </span>
              </span>
            ))}
          </div>

          <div style={sectionLabelStyle}>Daily Scheduling</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <span style={{ color: "#5c6d9c", fontSize: "14px" }}>
              Enable Daily Schedule
            </span>
            <button
              type="button"
              onClick={() => setScheduleEnabled((value) => !value)}
              aria-pressed={scheduleEnabled}
              style={{
                width: "50px",
                height: "28px",
                borderRadius: "999px",
                border: "none",
                background: scheduleEnabled ? "#8a9bd6" : "#d5dbef",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "3px",
                  left: scheduleEnabled ? "23px" : "3px",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>

          {scheduleEnabled && (
            <div
              style={{
                background: "#f3f5ff",
                borderRadius: "18px",
                padding: "20px",
                border: "1px solid #e0e5fb",
                marginBottom: "28px",
              }}
            >
              <label style={labelStyle}>Start Time</label>
              <input
                type="time"
                style={inputStyle}
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />

              <label style={labelStyle}>Duration (minutes)</label>
              <input
                type="number"
                min="15"
                step="15"
                style={inputStyle}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />

              <label style={labelStyle}>Timezone</label>
              <select
                style={{ ...inputStyle, appearance: "auto" }}
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
              height: "48px",
              borderRadius: "999px",
              background: submitting ? "#aab5df" : "#8a9bd6",
              color: "#ffffff",
              border: "none",
              fontSize: "15px",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: "0 10px 24px rgba(138,155,214,0.34)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            {submitting ? "Creating..." : "Create & Join Room"}
          </button>
        </form>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e6e8f0",
            borderRadius: "18px",
            padding: "22px",
            height: "fit-content",
          }}
        >
          <h4
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "16px",
              marginBottom: "12px",
              color: "#2f3b63",
            }}
          >
            This classroom will have:
          </h4>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "13px",
              color: "#6b78a0",
              lineHeight: "1.9",
            }}
          >
            <li>Confirmation mail to the creator after scheduling</li>
            <li>Reminder mails to participants 15 minutes before class</li>
            <li>Daily recurring start time when scheduling is enabled</li>
            <li>A shareable room ID for quick re-entry</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
