import React, { useEffect, useState } from "react";
import {
  BarChart3,
  DoorOpen,
  Youtube,
  Home,
  Lock,
  MessageCircle,
  UserRound,
  Moon,
  Sun,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useGuardedNavigate } from "../context/NavGuardContext";
import api from "../services/api";

const navItems = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Find your people", path: "/people", icon: Sparkles, requiresUser: true },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy, requiresUser: true },
  { label: "YouTube Cohort", path: "/cohorts", icon: Youtube, requiresUser: true },
  { label: "Community", path: "/community", icon: MessageCircle },
  { label: "Rooms", path: "/join-room", icon: DoorOpen, requiresUser: true, match: ["/join-room", "/myRooms", "/create-room"] },
  { label: "Analytics", path: "/analytics", icon: BarChart3, requiresUser: true },
  { label: "Profile", path: "/profile", icon: UserRound, requiresUser: true },
];

export default function AppSideNav() {
  const { user, guestSessionActive } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useGuardedNavigate();
  const isGuestViewer = !user && guestSessionActive;
  const streakDays = user?.attendanceStreak ?? 0;

  // Count of distinct people with unread DMs, for the "Find your people" badge.
  // Polls so it stays fresh on any page the side nav is visible on.
  const [newMsgUsers, setNewMsgUsers] = useState(0);
  useEffect(() => {
    if (!user?.id) {
      setNewMsgUsers(0);
      return undefined;
    }
    let cancelled = false;
    const load = () =>
      api.get("/friends/threads")
        .then((res) => {
          if (!cancelled) setNewMsgUsers((res.data || []).filter((t) => t.unread > 0).length);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);

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
          const active = item.match
            ? item.match.includes(location.pathname)
            : location.pathname === item.path;
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
              {item.path === "/people" && !disabled && newMsgUsers > 0 ? (
                <span style={styles.navBadge}>{newMsgUsers}</span>
              ) : null}
              {disabled ? <Lock size={13} style={styles.lockIcon} /> : null}
            </button>
          );
        })}
      </nav>

      <button type="button" onClick={toggleTheme} style={styles.themeToggle} title="Toggle light / dark theme">
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        <span style={{ flex: 1, textAlign: "left", fontSize: 14 }}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </span>
      </button>

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
    border: "1px solid var(--card-border)",
    background: "var(--nav-bg)",
    boxShadow: "var(--card-shadow)",
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
    borderBottom: "1px solid var(--card-border)",
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "linear-gradient(135deg, var(--accent), #6f7fc0)",
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
    color: "var(--text-primary)",
  },
  brandSub: {
    margin: "5px 0 0",
    color: "var(--text-secondary)",
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
    color: disabled ? "var(--text-muted)" : active ? "var(--text-primary)" : "var(--text-secondary)",
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
  navBadge: {
    flexShrink: 0,
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    borderRadius: 999,
    background: "#ef4444",
    color: "#fff",
    fontSize: 10.5,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  themeToggle: {
    minHeight: 44,
    width: "100%",
    borderRadius: 14,
    border: "1px solid var(--card-border)",
    background: "transparent",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 600,
    boxSizing: "border-box",
  },
  streakCard: {
    borderRadius: 18,
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
    padding: 16,
  },
  streakTitle: {
    margin: 0,
    color: "var(--text-primary)",
    fontWeight: 800,
    fontSize: 14,
  },
  streakCopy: {
    margin: "8px 0 14px",
    color: "var(--text-secondary)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  ctaButton: {
    height: 40,
    width: "100%",
    borderRadius: 12,
    border: "none",
    background: "var(--accent-gradient)",
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
    background: "var(--card-bg)",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "var(--card-bg)",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
    border: "1px solid var(--card-border)",
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
  },
  profileName: {
    margin: 0,
    color: "var(--text-primary)",
    fontWeight: 800,
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  profileMeta: {
    margin: "2px 0 0",
    color: "var(--text-secondary)",
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
