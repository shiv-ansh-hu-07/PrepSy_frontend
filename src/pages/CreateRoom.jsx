import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function CreateRoom() {
  const [roomName, setRoomName] = useState("");
  const [roomId] = useState(crypto.randomUUID());
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [visibility, setVisibility] = useState("PRIVATE");

  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!roomName.trim()) {
      alert("Room name is required");
      return;
    }

    let finalTags = tags;
    if (tagInput.trim()) {
      const tag = tagInput.trim().toLowerCase();
      if (!tags.includes(tag)) {
        finalTags = [...tags, tag];
      }
    }

    try {
      const res = await api.post("/rooms/create", {
        name: roomName,
        roomId,
        description,
        tags: finalTags,
        visibility,
      });

      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create room");
    }
  };

  const addTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const labelStyle = {
    fontSize: "12px",
    color: "#6b78a0",
    marginBottom: "4px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    height: "36px",
    borderRadius: "8px",
    border: "1px solid #d6d9e8",
    padding: "0 12px",
    fontSize: "13px",
    marginBottom: "14px",
    outline: "none",
  };

  const radioStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#4a5a85",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
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
          gridTemplateColumns: "1fr 280px",
          gap: "32px",
        }}
      >
        {/* LEFT CARD */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e6e8f0",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "24px",
              textAlign: "center",
              color: "#2f3b63",
              marginBottom: "6px",
            }}
          >
            Create a New Room
          </h2>

          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "#6b78a0",
              marginBottom: "24px",
            }}
          >
            A quiet space for focused work — just you and those who join.
          </p>

          {/* Room Name */}
          <label style={labelStyle}>Room Name</label>
          <input
            style={inputStyle}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter room name"
          />

          {/* Room ID */}
          <label style={labelStyle}>Room ID (Shareable)</label>
          <input
            style={{
              ...inputStyle,
              background: "#eef1ff",
              color: "#4a5a85",
            }}
            value={roomId}
            readOnly
          />

          {/* Description */}
          <label style={labelStyle}>Description</label>
          <textarea
            style={{
              ...inputStyle,
              height: "70px",
              resize: "none",
            }}
            placeholder="What will be studied in this room?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Visibility */}
          <label style={{ ...labelStyle, marginBottom: "6px" }}>
            Room Visibility
          </label>
          <div style={{ display: "flex", gap: "18px", marginBottom: "18px" }}>
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

          {/* Tags */}
          <label style={labelStyle}>Tags</label>
          <input
            style={inputStyle}
            placeholder="Type tag & press Enter (e.g. dsa, jee)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
          />

          {/* Tag Chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: "#eef1ff",
                  color: "#4a5a85",
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                #{tag}
                <span
                  style={{ cursor: "pointer" }}
                  onClick={() => removeTag(tag)}
                >
                  ×
                </span>
              </span>
            ))}
          </div>

          <button
            onClick={handleCreate}
            style={{
              marginTop: "22px",
              width: "100%",
              height: "38px",
              borderRadius: "999px",
              background: "#8a9bd6",
              color: "#ffffff",
              border: "none",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(138,155,214,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
          Create & Join Room
        </button>
      </div>

      {/* RIGHT INFO CARD */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e6e8f0",
          borderRadius: "18px",
          padding: "20px",
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
          This room will have:
        </h4>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            fontSize: "13px",
            color: "#6b78a0",
            lineHeight: "1.8",
          }}
        >
          <li>✓ Focused sessions with a timer</li>
          <li>✓ Chat muted by default</li>
          <li>✓ Silent presence of others</li>
          <li>✓ Space for private notes</li>
        </ul>
      </div>
    </div>
    </div >
  );

}
