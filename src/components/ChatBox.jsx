import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import api from "../services/api";

export default function ChatBox({ roomId }) {
  const { messages, setMessages, sendMessage } = useSocket();
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // -------------------------------
  // LOAD CHAT HISTORY ON ROOM JOIN
  // -------------------------------
  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await api.get(`/rooms/${roomId}/messages`);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    }

    if (roomId) {
      loadMessages();
    }
  }, [roomId, setMessages]);

  // -------------------------------
  // SEND MESSAGE
  // -------------------------------
  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(roomId, text);
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // -------------------------------
  // AUTO SCROLL
  // -------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-brand-800 border border-gray-700 rounded-lg p-4">
      <h2 className="text-white font-semibold text-lg mb-3">Chat</h2>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="bg-brand-900 p-3 rounded-lg"
          >
            <div className="text-sm font-semibold text-blue-400">
              {msg.senderName || "User"}
            </div>

            <div className="text-gray-200 whitespace-pre-wrap">
              {msg.text}
            </div>

            <div className="text-[10px] text-gray-500 mt-1">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded bg-gray-900 text-white border border-gray-700"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <button
          className="px-4 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-600"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
