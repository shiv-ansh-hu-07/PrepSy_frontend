import React, { useEffect, useState } from 'react';
import axios from '../services/api';
import { useAuth } from "../context/AuthContext";   

function MyRooms() {
  const [rooms, setRooms] = useState([]);
  const { user } = useAuth();                      

  useEffect(() => {
    if (!user) return;

    axios.get('/rooms/my')
      .then(res => {
        const combined = [
          ...res.data.createdRooms,
          ...res.data.joinedRooms
        ];

        const uniqueRooms = Array.from(
          new Map(combined.map(room => [room.roomId, room])).values()
        );

        setRooms(uniqueRooms);
      })
      .catch(console.error);
  }, [user]);                                      

  const joinRoom = (roomId) => {
    window.location.href = `/room/${roomId}`;
  };

  const deleteRoom = async (roomId) => {
    const ok = window.confirm(
      "Are you sure you want to delete this room? This action cannot be undone."
    );
    if (!ok) return;

    try {
      await axios.delete(`/rooms/${roomId}`);
      setRooms(prev => prev.filter(r => r.roomId !== roomId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete room");
    }
  };

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl mb-6">My Rooms</h1>

      {rooms.length === 0 && <p>No rooms found.</p>}

      <div className="grid gap-4">
        {rooms.map((room) => (
          <div
            key={room.roomId}
            className="bg-[#0b132b] p-5 rounded-lg flex justify-between items-center"
          >
            <div>
              <h2 className="text-xl font-bold">{room.name}</h2>

              <div className="mt-2 flex flex-wrap gap-2">
                {room.tags && room.tags.length > 0 ? (
                  room.tags.map((tag) => (
                    <span
                      key={`${room.roomId}-${tag}`}
                      className="px-3 py-1 text-xs bg-brand-700 rounded-full text-white"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    No tags
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => joinRoom(room.roomId)}
                className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500"
              >
                Join
              </button>

              {room.ownerId === user?.id && (
                <button
                  onClick={() => deleteRoom(room.roomId)}
                  className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-500"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyRooms;
