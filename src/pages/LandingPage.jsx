import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  const createMeeting = () => {
    const id = crypto.randomUUID();
    navigate(`/room/${id}`);
  };

  const joinMeeting = () => {
    if (!roomId.trim()) return;
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-4">Welcome to Nerdies Meet</h1>
      {user && <p className="text-lg mb-6">Hello, {user.name}</p>}

      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <button
          onClick={createMeeting}
          className="w-full bg-indigo-600 text-white py-2 rounded mb-4"
        >
          Create New Meeting
        </button>

        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Enter Meeting ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        <button
          onClick={joinMeeting}
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          Join Meeting
        </button>
      </div>

      {!user && (
        <button
          onClick={() => navigate("/login")}
          className="mt-6 text-indigo-700 underline"
        >
          Login to save your meetings
        </button>
      )}
    </div>
  );
}
