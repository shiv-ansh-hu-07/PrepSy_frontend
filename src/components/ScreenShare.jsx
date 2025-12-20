// src/components/ScreenShare.jsx
import React, { useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useParams } from "react-router-dom";

export default function ScreenShare() {
  const { id: roomId } = useParams();
  const { startScreenShare, stopScreenShare } = useSocket(); 
  const [sharing, setSharing] = useState(false);

  const toggleShare = async () => {
    if (!sharing) {
      try {
        await startScreenShare(roomId);
        setSharing(true);
      } catch (err) {
        // User canceled or media error
        setSharing(false);
        if (err.name !== "NotAllowedError") {
             alert("Screen share failed: " + (err.message || err));
        }
      }
    } else {
      // Call the central stop function for full cleanup and signaling
      stopScreenShare(roomId); 
      setSharing(false);
    }
  };

  return (
    <div className="mt-3">
      <button onClick={toggleShare} className="bg-indigo-600 text-white px-4 py-2 rounded">
        {sharing ? "Stop Screen Share" : "Start Screen Share"}
      </button>
    </div>
  );
}