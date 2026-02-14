import { useEffect, useState, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { DataPacket_Kind } from "livekit-client";

export default function ChatDrawer({ onClose, currentUser }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef(null);

  /* ================= FORMAT TIME ================= */

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ================= FETCH HISTORY ================= */

  useEffect(() => {
    if (!room?.name) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/messages?roomId=${room.name}`
        );
        const data = await res.json();

        setMessages(
          data.map((msg) => ({
            text: msg.text,
            sender: msg.senderName,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();
  }, [room?.name]);

  /* ================= RECEIVE REALTIME ================= */

  useEffect(() => {
    if (!room) return;

    const handleData = (payload) => {
      const data = JSON.parse(new TextDecoder().decode(payload));

      if (data.type === "chat") {
        setMessages((prev) => [
          ...prev,
          {
            text: data.text,
            sender: data.sender,
            senderId: data.senderId,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    };

    room.on("dataReceived", handleData);
    return () => room.off("dataReceived", handleData);
  }, [room]);

  /* ================= AUTO SCROLL ================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= SEND MESSAGE ================= */

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!room?.localParticipant) return;

    const livekitRoomId = room.name;

    const senderName =
      currentUser?.name || localParticipant?.name || "User";
    const senderId =
      currentUser?.id || localParticipant?.identity || null;

    const messagePayload = {
      type: "chat",
      text: input,
      sender: senderName,
      senderId,
    };

    try {
      const encoded = new TextEncoder().encode(
        JSON.stringify(messagePayload)
      );

      await room.localParticipant.publishData(
        encoded,
        DataPacket_Kind.RELIABLE
      );

      setMessages((prev) => [
        ...prev,
        {
          text: input,
          sender: senderName,
          senderId,
          createdAt: new Date().toISOString(),
        },
      ]);

      fetch(`${import.meta.env.VITE_API_BASE_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: livekitRoomId,
          text: input,
          senderId,
          senderName,
        }),
      }).catch((err) => console.error("Save failed:", err));

      setInput("");
    } catch (error) {
      console.error("Send failed:", error);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="fixed right-0 top-0 h-screen w-[380px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-linear-to-r from-indigo-500 to-indigo-600 text-white">
        <h2 className="font-semibold text-lg">Room Chat</h2>
        <button
          onClick={onClose}
          className="opacity-80 hover:opacity-100 transition"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUser?.id;

          return (
            <div
              key={index}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {/* Sender Name */}
                {!isMe && (
                  <div className="text-xs font-semibold text-indigo-600 mb-1">
                    {msg.sender}
                  </div>
                )}

                {/* Text */}
                <div className="text-sm">{msg.text}</div>

                {/* Time */}
                <div
                  className={`text-[10px] mt-2 ${
                    isMe ? "text-indigo-200" : "text-gray-400"
                  } text-right`}
                >
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
          />
          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}