// src/components/PomodoroTimer.jsx
import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useParams } from "react-router-dom";

export default function PomodoroTimer() {
  const { id: roomId } = useParams();
  const { socket, pomodoro, startPomodoro, stopPomodoro } = useSocket();

  const [inputMinutes, setInputMinutes] = useState(25);
  const [localSeconds, setLocalSeconds] = useState(0);



  // Receive updates from server
  useEffect(() => {


    if (!pomodoro) return null;

    if (!socket) return;

    socket.on("pomodoroUpdate", (secondsLeft) => {
      setLocalSeconds(secondsLeft);
    });

    socket.on("pomodoroStopped", () => {
      setLocalSeconds(0);
    });

    return () => {
      socket.off("pomodoroUpdate");
      socket.off("pomodoroStopped");
    };
  }, [socket]);

  // Local ticking for smooth UI
  useEffect(() => {
    if (!pomodoro.running) return;

    setLocalSeconds(pomodoro.secondsLeft);

    const interval = setInterval(() => {
      setLocalSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [pomodoro.running, pomodoro.secondsLeft]);

  // Start timer
  const handleStart = () => {
    if (!inputMinutes || inputMinutes <= 0) return;
    startPomodoro(roomId, inputMinutes);
  };

  // Stop timer
  const handleStop = () => {
    stopPomodoro(roomId);
    setLocalSeconds(0);
  };

  const minutes = String(Math.floor(localSeconds / 60)).padStart(2, "0");
  const seconds = String(localSeconds % 60).padStart(2, "0");

  return (
    <div className="bg-brand-800 border border-gray-700 rounded-xl p-4 mt-4">
      <h2 className="text-white font-semibold mb-2">Pomodoro Timer</h2>

      {pomodoro.running ? (
        <>
          <div className="text-3xl text-white font-bold mb-3">
            {minutes}:{seconds}
          </div>

          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600"
          >
            ⛔ Stop
          </button>
        </>
      ) : (
        <div className="flex gap-3 items-center">
          <input
            type="number"
            value={inputMinutes}
            onChange={(e) => setInputMinutes(Number(e.target.value))}
            className="px-2 py-1 rounded bg-gray-900 text-white w-20"
          />

          <button
            onClick={handleStart}
            className="px-4 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-600"
          >
            ▶ Start
          </button>
        </div>
      )}
    </div>
  );
}
