import React from "react";
import {
  BarChart3,
  BookOpenCheck,
  DoorOpen,
  GraduationCap,
  Home,
  Lock,
  MessageCircle,
  PlusCircle,
  UserRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Learn", path: "/learn", icon: GraduationCap, requiresUser: true },
  { label: "Community", path: "/community", icon: MessageCircle },
  { label: "My Rooms", path: "/myRooms", icon: BookOpenCheck, requiresUser: true },
  { label: "Create Room", path: "/create-room", icon: PlusCircle, requiresUser: true },
  { label: "Join Room", path: "/join-room", icon: DoorOpen },
  { label: "Analytics", path: "/analytics", icon: BarChart3, requiresUser: true },
  { label: "Profile", path: "/profile", icon: UserRound, requiresUser: true },
];

export default function AppSideNav() {
  const { user, guestSessionActive } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isGuestViewer = !user && guestSessionActive;
  const streakDays = user?.attendanceStreak ?? 0;

  return (
    <aside style={styles.shell}>
      <div style={styles.brand}>
        <div style={styles.logoMark}>PS</div>
        <div>
          <p style={styles.brandName}>PrepSy</p>
          <p style={styles.brandSub}>study dashboard</p>
        </div>
      </div>

      <nav style={styles.navList} aria-label="Dashboard navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          const disabled = Boolean(item.requiresUser && !user);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                if (!disabled) navigate(item.path);
              }}
              disabled={disabled}
              title={disabled ? "Sign in to use this section" : item.label}
              style={styles.navItem(active, disabled)}
            >
              <Icon size={18} strokeWidth={2} />
              <span style={styles.navLabel}>{item.label}</span>
              {disabled ? <Lock size={13} style={styles.lockIcon} /> : null}
            </button>
          );
        })}
      </nav>

      <div style={styles.streakCard}>
        <p style={styles.streakTitle}>Keep the streak alive</p>
        <p style={styles.streakCopy}>
          {isGuestViewer
            ? "Sign in after your guest session to save your progress."
            : user
              ? `${streakDays} day${streakDays === 1 ? "" : "s"} saved on your profile.`
              : "Sign in to keep your sessions and analytics synced."}
        </p>
        <button
          type="button"
          onClick={() => navigate(user ? "/create-room" : "/login")}
          style={styles.ctaButton}
        >
          {user ? "Start a Room" : "Sign In"}
        </button>
      </div>

      {user ? (
        <div style={styles.profileCard}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              style={styles.avatarImage}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={styles.avatar}>{getInitials(user.name || user.email)}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={styles.profileName}>{user.name || "PrepSy Learner"}</p>
            <p style={styles.profileMeta}>{user.email}</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function getInitials(value = "") {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PS";
  return parts.map((part) => part[0]?.toUpperCase()).join("").slice(0, 2);
}

const styles = {
  shell: {
    width: "100%",
    borderRadius: 24,
    border: "1px solid rgba(190,200,235,0.52)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(242,245,255,0.76))",
    boxShadow: "0 18px 46px rgba(74,90,133,0.12)",
    backdropFilter: "blur(12px)",
    padding: 18,
    display: "grid",
    gap: 18,
    alignContent: "start",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 4px 12px",
    borderBottom: "1px solid rgba(190,200,235,0.44)",
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "linear-gradient(135deg, #8a9bd6, #6f7fc0)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    boxShadow: "0 10px 24px rgba(138,155,214,0.34)",
    flexShrink: 0,
  },
  brandName: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: 22,
    lineHeight: 1,
    color: "#3f4f7a",
  },
  brandSub: {
    margin: "5px 0 0",
    color: "#7a89b8",
    fontSize: 12,
  },
  navList: {
    display: "grid",
    gap: 8,
  },
  navItem: (active, disabled) => ({
    minHeight: 44,
    width: "100%",
    borderRadius: 14,
    border: active ? "1px solid rgba(138,155,214,0.38)" : "1px solid transparent",
    background: active ? "rgba(138,155,214,0.16)" : "transparent",
    color: disabled ? "#a8b1cc" : active ? "#3f4f7a" : "#5e6c92",
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "0 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: active ? 700 : 600,
    transition: "background 0.18s ease, color 0.18s ease, border 0.18s ease",
    boxSizing: "border-box",
    opacity: disabled ? 0.72 : 1,
  }),
  navLabel: {
    flex: 1,
    textAlign: "left",
    fontSize: 14,
  },
  lockIcon: {
    flexShrink: 0,
  },
  streakCard: {
    borderRadius: 18,
    border: "1px solid rgba(190,200,235,0.48)",
    background: "rgba(255,255,255,0.68)",
    padding: 16,
  },
  streakTitle: {
    margin: 0,
    color: "#3f4f7a",
    fontWeight: 800,
    fontSize: 14,
  },
  streakCopy: {
    margin: "8px 0 14px",
    color: "#6b78a0",
    fontSize: 13,
    lineHeight: 1.5,
  },
  ctaButton: {
    height: 40,
    width: "100%",
    borderRadius: 12,
    border: "none",
    background: "#8a9bd6",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(138,155,214,0.3)",
  },
  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderRadius: 18,
    background: "rgba(238,242,255,0.72)",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#ffffff",
    color: "#5f6fa3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
    border: "1px solid rgba(190,200,235,0.7)",
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: "1px solid rgba(190,200,235,0.7)",
    background: "#ffffff",
  },
  profileName: {
    margin: 0,
    color: "#3f4f7a",
    fontWeight: 800,
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  profileMeta: {
    margin: "2px 0 0",
    color: "#7a89b8",
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
