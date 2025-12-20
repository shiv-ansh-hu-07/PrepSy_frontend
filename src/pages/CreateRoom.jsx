import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function CreateRoom() {
  const [roomName, setRoomName] = useState("");
  const [roomId] = useState(crypto.randomUUID());
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [visibility, setVisibility] = useState("PRIVATE"); // 👈 NEW

  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!roomName.trim()) {
      alert("Room name is required");
      return;
    }

    // ✅ ensure last typed tag is not lost
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
        visibility, // 👈 SEND TO BACKEND
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 text-white p-6">
      <div className="bg-brand-800 p-8 rounded-xl w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold mb-6">
          Create a New Room
        </h2>

        {/* Room Name */}
        <label className="block mb-2 text-sm text-gray-300">
          Room Name
        </label>
        <input
          className="w-full p-2 mb-4 rounded bg-gray-900 border border-gray-700"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter room name"
        />

        {/* Room ID */}
        <label className="block mb-2 text-sm text-gray-300">
          Room ID (Shareable)
        </label>
        <input
          className="w-full p-2 mb-4 rounded bg-gray-900 border border-gray-700"
          value={roomId}
          readOnly
        />

        {/* Description */}
        <label className="block mb-2 text-sm text-gray-300">
          Description
        </label>
        <textarea
          className="w-full p-2 mb-4 rounded bg-gray-900 border border-gray-700"
          placeholder="What will be studied in this room?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {/* Visibility */}
        <label className="block mb-2 text-sm text-gray-300">
          Room Visibility
        </label>
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={visibility === "PRIVATE"}
              onChange={() => setVisibility("PRIVATE")}
            />
            Private (Invite via code)
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={visibility === "PUBLIC"}
              onChange={() => setVisibility("PUBLIC")}
            />
            Public (Visible on dashboard)
          </label>
        </div>

        {/* Tags */}
        <label className="block mb-2 text-sm text-gray-300">
          Tags
        </label>
        <input
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          placeholder="Type tag and press Enter (e.g. dsa, jee)"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
        />

        {/* Tag Chips */}
        <div className="flex flex-wrap gap-2 mt-3 mb-6">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-sm bg-brand-700 rounded-full flex items-center gap-2"
            >
              #{tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-red-300 hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <button
          onClick={handleCreate}
          className="w-full py-2 bg-brand-700 rounded-lg hover:bg-brand-600"
        >
          Create & Join Room
        </button>
      </div>
    </div>
  );
}
