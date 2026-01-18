export default function ChatDrawer({ onClose }) {
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
      {/* Header */}
      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 600,
        }}
      >
        Chat
        <span
          style={{ cursor: "pointer", opacity: 0.7 }}
          onClick={onClose}
        >
          ✕
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: 12,
          overflowY: "auto",
          fontSize: 14,
          opacity: 0.7,
        }}
      >
        No messages yet
      </div>

      {/* Input */}
      <div style={{ padding: 12 }}>
        <input
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
