import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpenCheck, PlusCircle, DoorOpen } from "lucide-react";

const TABS = [
  { label: "My Rooms", path: "/myRooms", icon: BookOpenCheck },
  { label: "Create Room", path: "/create-room", icon: PlusCircle },
  { label: "Join Room", path: "/join-room", icon: DoorOpen },
];

// Shared tab bar so the three room pages read as one "Rooms" section.
export default function RoomsTabs({ maxWidth = 1100 }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth, margin: "0 auto 22px", width: "100%" }}>
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--card-border)", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {TABS.map((t) => {
          const active = location.pathname === t.path;
          const Icon = t.icon;
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px",
                border: "none", background: "transparent", cursor: "pointer", whiteSpace: "nowrap",
                fontSize: 14, fontWeight: active ? 800 : 600,
                color: active ? "var(--accent)" : "var(--text-secondary)",
                borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                marginBottom: -1,
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
