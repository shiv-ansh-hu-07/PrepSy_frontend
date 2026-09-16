import { useEffect, useState, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { DataPacket_Kind } from "livekit-client";
import EmojiPicker from "./EmojiPicker";

export default function ChatDrawer({ onClose, currentUser, embedded = false }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { text, sender }

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
            replyToText: msg.replyToText || null,
            replyToSender: msg.replyToSender || null,
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
            replyToText: data.replyToText || null,
            replyToSender: data.replyToSender || null,
          },
        ]);
      }
    };

    room.on("dataReceived", handleData);
    return () => room.off("dataReceived", handleData);
  }, [room]);

  /* ================= AUTO SCROLL ================= */

  // Scroll ONLY the messages container to the bottom. `scrollIntoView` would
  // bubble up and scroll every scrollable ancestor (incl. the whole page),
  // which pushed the layout up and left a long empty gap below the room.
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
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

    const replyToText = replyTo?.text || null;
    const replyToSender = replyTo?.sender || null;

    const messagePayload = {
      type: "chat",
      text: input,
      sender: senderName,
      senderId,
      replyToText,
      replyToSender,
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
          replyToText,
          replyToSender,
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
          replyToText,
          replyToSender,
        }),
      }).catch((err) => console.error("Save failed:", err));

      setInput("");
      setReplyTo(null);
    } catch (error) {
      console.error("Send failed:", error);
    }
  };

  /* ================= UI ================= */

  return (
    <div
      className={
        embedded
          ? "h-full w-full bg-white flex flex-col"
          : "fixed right-0 top-0 h-screen w-[380px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50"
      }
    >
      {/* Header */}
      {!embedded && (
        <div style={{ background: "var(--accent-gradient)" }}
        className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-linear-to-r color - var(--accent) text-white">
          <h2 className="font-semibold text-lg">Room Chat</h2>
          <button
            onClick={onClose}
            className="opacity-80 hover:opacity-100 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUser?.id;

          return (
            <div
              key={index}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`group max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {/* Sender Name */}
                {!isMe && (
                  <div style={{ color: "var(--accent)", fontWeight: "500", marginBottom: 4 }}>
                    {msg.sender}
                  </div>
                )}

                {/* Quoted reply context */}
                {msg.replyToText && (
                  <div
                    style={{
                      borderLeft: `3px solid ${isMe ? "rgba(255,255,255,0.6)" : "var(--accent)"}`,
                      background: isMe ? "rgba(255,255,255,0.14)" : "rgba(99,102,241,0.08)",
                      borderRadius: 8,
                      padding: "5px 8px",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.9 }}>{msg.replyToSender || "Reply"}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{msg.replyToText}</div>
                  </div>
                )}

                {/* Text */}
                <div className="text-sm">{msg.text}</div>

                {/* Time + reply action */}
                <div
                  className={`flex items-center justify-between gap-3 text-[10px] mt-2 ${
                    isMe ? "text-indigo-200" : "text-gray-400"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => { setReplyTo({ text: msg.text, sender: msg.sender || "User" }); inputRef.current?.focus(); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, color: "inherit", padding: 0, opacity: 0.75 }}
                    title="Reply"
                  >
                    ↩ Reply
                  </button>
                  <span>{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {replyTo && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(99,102,241,0.08)", borderLeft: "3px solid var(--accent)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent)" }}>Replying to {replyTo.sender}</div>
              <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.text}</div>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, lineHeight: 1, flexShrink: 0 }} title="Cancel reply">✕</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <EmojiPicker onPick={(e) => setInput((t) => t + e)} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
          />
          <button
            style={styles.saveBtn}
            onClick={sendMessage}
           
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  saveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
    height: 23,
    borderRadius: 14,
    border: "none",
    background: "var(--accent-gradient)",
    color: "#FFFFFF",
    fontWeight: 500,
    cursor: "pointer",
    boxShadow:
      "0 8px 22px rgba(99,102,241,0.28)",
  },
}