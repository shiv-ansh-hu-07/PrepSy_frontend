import { useEffect, useState, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { DataPacket_Kind } from "livekit-client";

export default function ChatDrawer({ onClose, roomId, currentUser }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef(null);

  /* ================= RECEIVE MESSAGES ================= */

  useEffect(() => {
    if (!room) return;

    const handleData = (payload, participant) => {
      const data = JSON.parse(new TextDecoder().decode(payload));

      if (data.type === "chat") {
        setMessages((prev) => [
          ...prev,
          {
            text: data.text,
            sender: data.sender,
            isMe: data.senderId === currentUser.id,
          },
        ]);
      }
    };

    room.on("dataReceived", handleData);

    return () => {
      room.off("dataReceived", handleData);
    };
  }, [room, currentUser]);

  /* ================= AUTO SCROLL ================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
  const fetchMessages = async () => {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/messages?roomId=${roomId}`
    );
    const data = await res.json();

    setMessages(
      data.map((msg) => ({
        text: msg.text,
        sender: msg.senderName,
        isMe: msg.senderId === currentUser.id,
      }))
    );
  };

  fetchMessages();
}, [roomId]);

  /* ================= SEND MESSAGE ================= */

  const sendMessage = async () => {
    if (!input.trim()) return;

    const messagePayload = {
      type: "chat",
      text: input,
      sender: currentUser.name,
      senderId: currentUser.id,
    };

    const encoded = new TextEncoder().encode(
      JSON.stringify(messagePayload)
    );

    await room.localParticipant.publishData(
      encoded,
      DataPacket_Kind.RELIABLE
    );

    setMessages((prev) => [
      ...prev,
      { text: input, sender: currentUser.name, isMe: true },
    ]);

    await fetch(`${import.meta.env.VITE_BACKEND_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        text: input,
        senderId: currentUser.id,
        senderName: currentUser.name,
      }),
    });

    setInput("");
  };

  /* ================= UI ================= */

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        width: 320,
        height: "100vh",
        background: "#141026",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid rgba(255,255,255,0.1)",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 600,
        }}
      >
        Chat
        <span style={{ cursor: "pointer" }} onClick={onClose}>
          ✕
        </span>
      </div>

      <div
        style={{
          flex: 1,
          padding: 12,
          overflowY: "auto",
          fontSize: 14,
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: 10,
              textAlign: msg.isMe ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: 8,
                borderRadius: 8,
                background: msg.isMe ? "#7c3aed" : "#2a2440",
                color: "white",
                maxWidth: "80%",
              }}
            >
              {!msg.isMe && (
                <div style={{ fontSize: 10, opacity: 0.6 }}>
                  {msg.sender}
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "none",
            outline: "none",
            background: "rgba(0,0,0,0.4)",
            color: "white",
          }}
        />
      </div>
    </div>
  );
}