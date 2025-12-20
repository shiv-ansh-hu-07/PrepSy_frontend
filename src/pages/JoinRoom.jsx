import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function JoinRoom() {
  const [roomId, setRoomId] = useState("");

  const [tagQuery, setTagQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleJoin = () => {
    if (!roomId.trim()) return alert("Enter a valid Room ID");
    navigate(`/room/${roomId}`);
  };

  const searchByTags = async () => {
    if (!tagQuery.trim()) return;

    try {
      setLoading(true);
      const res = await api.get(
        `/rooms/search?tags=${encodeURIComponent(tagQuery)}`
      );
      setResults(res.data.rooms || []);
    } catch (err) {
      console.error(err);
      alert("Failed to search rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = async (tag) => {
    setTagQuery(tag);

    try {
      setLoading(true);
      const res = await api.get(
        `/rooms/search?tags=${encodeURIComponent(tag)}`
      );
      setResults(res.data.rooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 text-white p-6">
      <div className="bg-brand-800 p-8 rounded-xl w-full max-w-xl shadow-xl space-y-8">

        {/* ---------------- JOIN BY ROOM ID ---------------- */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Join a Room</h2>

          <label className="block mb-2 text-sm text-gray-300">
            Enter Room ID
          </label>

          <input
            className="w-full p-2 mb-4 rounded bg-gray-900 border border-gray-700"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
          />

          <button
            onClick={handleJoin}
            className="w-full py-2 bg-brand-700 rounded-lg hover:bg-brand-600"
          >
            Join Room
          </button>
        </div>

        {/* ---------------- SEARCH BY TAGS ---------------- */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Or search rooms by tags
          </h3>

          <input
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
            placeholder="e.g. dsa, jee, react"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
          />

          <button
            onClick={searchByTags}
            className="mt-3 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
          >
            Search
          </button>

          {/* Results */}
          <div className="mt-4 space-y-3">
            {loading && (
              <p className="text-sm text-gray-400">Searching…</p>
            )}

            {!loading && results.length === 0 && tagQuery && (
              <p className="text-sm text-gray-400">
                No rooms found
              </p>
            )}

            {results.map((room) => (
              <div
                key={room.roomId}
                className="bg-brand-900 p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{room.name}</p>

                  <div className="flex flex-wrap gap-2 mt-1">
                    {room.tags.map((tag) => (
                      <span
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className="px-2 py-1 text-xs bg-brand-700 rounded-full cursor-pointer
                        hover:bg-brand-600 transition"

                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/room/${room.roomId}`)}
                  className="px-3 py-1 bg-green-600 rounded hover:bg-green-500"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
