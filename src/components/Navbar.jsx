import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Flame } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isCompact = windowWidth < 760;
  const isMobileNav = windowWidth < 920;
  const isHomePage = location.pathname === "/";
  const isFeaturePage = location.pathname === "/feature";
  const isLoginPage = location.pathname === "/login";
  const isActive = (path) => location.pathname === path;
  const attendanceStreak = user?.attendanceStreak ?? 0;
  const showAttendanceStreak = Boolean(user);

  const greetingLabel = (() => {
    if (!user?.name) {
      return "Hi";
    }

    const parts = user.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "Hi";
    }

    if (isCompact) {
      return parts.map((part) => part[0]?.toUpperCase()).join("").slice(0, 2);
    }

    return parts[0];
  })();

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  const desktopLinks = buildDesktopLinks({
    user,
    isHomePage,
    isFeaturePage,
    isLoginPage,
    isActive,
  });

  const mobileLinks = buildMobileLinks({
    user,
    isHomePage,
    isFeaturePage,
  });

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(10px)",
        background: "var(--nav-bg)",
        borderBottom: "1px solid var(--card-border)",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: isCompact ? "12px 16px" : "14px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isCompact ? "8px" : "12px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                height: "36px",
                width: "36px",
                borderRadius: "12px",
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              PS
            </div>

            <Link
              to="/"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: isCompact ? "16px" : "20px",
                color: "var(--text-primary)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              PrepSy
            </Link>

            {!isCompact && (
              <span className="mt-1 w-fit rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
                beta
              </span>
            )}
          </div>

          {isMobileNav ? (
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              style={mobileToggleStyle}
            >
              <span style={mobileToggleLineStyle(menuOpen, "top")} />
              <span style={mobileToggleLineStyle(menuOpen, "middle")} />
              <span style={mobileToggleLineStyle(menuOpen, "bottom")} />
            </button>
          ) : (
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: isCompact ? "12px" : "24px",
                minWidth: 0,
              }}
            >
              {desktopLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    fontSize: isCompact ? "13px" : "14px",
                    color: item.active ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: item.active ? 500 : 400,
                    textDecoration: "none",
                    position: "relative",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                  {item.active ? (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: "-6px",
                        height: "2px",
                        background: "var(--accent-gradient)",
                        borderRadius: "2px",
                      }}
                    />
                  ) : null}
                </Link>
              ))}

              {user ? (
                <>
                  <Link
                    to="/profile"
                    title="Open profile"
                    style={accountLinkStyle(isCompact, isActive("/profile"))}
                  >
                    <UserAvatar user={user} size={30} />
                    <span>{isCompact ? greetingLabel : `Hi, ${greetingLabel}`}</span>
                    <ChevronDown size={14} strokeWidth={2.4} />
                  </Link>

                  {showAttendanceStreak ? (
                    <div
                      title={`Daily attendance streak: ${attendanceStreak}`}
                      style={streakPillStyle(isCompact)}
                    >
                      <Flame size={15} fill="#f97316" color="#f97316" />
                      <span style={{ display: "none" }}>
                        🔥
                      </span>
                      <span
                        style={{
                          fontSize: isCompact ? "12px" : "13px",
                          fontWeight: 600,
                        }}
                      >
                        {attendanceStreak} day{attendanceStreak === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : null}

                  <button onClick={handleLogout} style={logoutButtonStyle}>
                    Logout
                  </button>
                </>
              ) : null}
            </nav>
          )}
        </div>

        {isMobileNav && menuOpen ? (
          <div style={mobilePanelStyle}>
            {user ? (
              <div style={mobileAccountRowStyle}>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  style={mobileAccountLinkStyle}
                >
                  <UserAvatar user={user} size={38} />
                  <span style={{ minWidth: 0 }}>
                    <span style={mobileAccountCaptionStyle}>Signed in</span>
                    <span style={mobileAccountNameStyle}>{user.name || user.email}</span>
                  </span>
                  <ChevronDown size={15} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                </Link>
                {showAttendanceStreak ? (
                  <div style={streakPillStyle(true)}>
                    <Flame size={14} fill="#f97316" color="#f97316" />
                    <span style={{ color: "#8a5a12", fontSize: "12px", fontWeight: 600 }}>
                      {attendanceStreak} day{attendanceStreak === 1 ? "" : "s"}
                    </span>
                    <span style={{ display: "none" }}>
                      ðŸ”¥
                    </span>
                    <span style={{ display: "none" }}>
                      🔥 {attendanceStreak} day{attendanceStreak === 1 ? "" : "s"}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <nav style={{ display: "grid", gap: "8px" }}>
              {mobileLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    textDecoration: "none",
                    background: item.active
                      ? "rgba(138,155,214,0.16)"
                      : "transparent",
                    color: item.active ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: item.active ? 600 : 500,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  ...logoutButtonStyle,
                  width: "100%",
                  marginTop: "14px",
                  justifyContent: "center",
                }}
              >
                Logout
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function buildDesktopLinks({ user, isHomePage, isFeaturePage, isLoginPage, isActive }) {
  const links = [];

  if (isFeaturePage && !user) {
    links.push({ label: "Home", path: "/", active: isActive("/") });
  } else {
    links.push({ label: "Features", path: "/feature", active: isActive("/feature") });
  }

  links.push({
    label: "Community",
    path: "/community",
    active: isActive("/community"),
  });

  if ((isHomePage || isFeaturePage) && !user) {
    links.push({ label: "Login", path: "/login", active: isActive("/login") });
  }

  if ((user || !isHomePage || isLoginPage) && user) {
    links.push({ label: "Home", path: "/dashboard", active: isActive("/dashboard") });
    links.push({ label: "Analytics", path: "/analytics", active: isActive("/analytics") });
  }

  return links;
}

function buildMobileLinks({ user, isHomePage, isFeaturePage }) {
  const links = [];

  if (user) {
    links.push({ label: "Home", path: "/dashboard", active: false });
    links.push({ label: "Community", path: "/community", active: false });
    links.push({ label: "My Rooms", path: "/myRooms", active: false });
    links.push({ label: "Join Room", path: "/join-room", active: false });
    links.push({ label: "Create Room", path: "/create-room", active: false });
    links.push({ label: "Analytics", path: "/analytics", active: false });
    links.push({ label: "Profile", path: "/profile", active: false });
    links.push({ label: "Features", path: "/feature", active: false });
  } else {
    links.push({
      label: isFeaturePage ? "Home" : "Features",
      path: isFeaturePage ? "/" : "/feature",
      active: false,
    });
    links.push({ label: "Community", path: "/community", active: false });

    if (isHomePage || isFeaturePage) {
      links.push({ label: "Login", path: "/login", active: false });
    }
  }

  return links.map((item) => ({
    ...item,
    active:
      typeof window !== "undefined" ? window.location.pathname === item.path : false,
  }));
}

function UserAvatar({ user, size }) {
  const initials = getInitials(user?.name || user?.email || "PrepSy");

  return user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt=""
      style={accountPhotoStyle(size)}
      referrerPolicy="no-referrer"
    />
  ) : (
    <span style={accountInitialsStyle(size)}>{initials}</span>
  );
}

function getInitials(value = "") {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PS";
  return parts.map((part) => part[0]?.toUpperCase()).join("").slice(0, 2);
}

function streakPillStyle(isCompact) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: isCompact ? "6px 10px" : "7px 12px",
    borderRadius: "999px",
    background:
      "linear-gradient(135deg, rgba(255,243,214,0.95), rgba(255,229,179,0.9))",
    border: "1px solid rgba(240,196,111,0.45)",
    color: "#8a5a12",
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(227, 180, 77, 0.16)",
  };
}

const logoutButtonStyle = {
  padding: "8px 14px",
  borderRadius: "999px",
  backgroundColor: "var(--accent-soft)",
  color: "var(--text-secondary)",
  fontSize: "13px",
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
};

function accountLinkStyle(isCompact, active) {
  return {
    minHeight: "42px",
    borderRadius: "999px",
    border: active ? "1px solid rgba(138,155,214,0.46)" : "1px solid transparent",
    background: active ? "rgba(138,155,214,0.14)" : "transparent",
    color: "var(--text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    gap: isCompact ? "6px" : "9px",
    padding: isCompact ? "5px 8px" : "5px 10px 5px 6px",
    textDecoration: "none",
    fontSize: isCompact ? "13px" : "14px",
    fontWeight: active ? 700 : 600,
    whiteSpace: "nowrap",
  };
}

function accountPhotoStyle(size) {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid rgba(190,200,235,0.72)",
    background: "var(--card-bg)",
    flexShrink: 0,
  };
}

function accountInitialsStyle(size) {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    background: "var(--card-bg)",
    color: "var(--text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(190,200,235,0.72)",
    fontSize: size > 34 ? "13px" : "11px",
    fontWeight: 800,
    flexShrink: 0,
  };
}

const mobileAccountRowStyle = {
  display: "grid",
  gap: "10px",
  paddingBottom: "14px",
  marginBottom: "14px",
  borderBottom: "1px solid var(--card-border)",
};

const mobileAccountLinkStyle = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "38px minmax(0, 1fr) 16px",
  alignItems: "center",
  gap: "10px",
  color: "var(--text-primary)",
  textDecoration: "none",
};

const mobileAccountCaptionStyle = {
  display: "block",
  margin: 0,
  color: "var(--text-secondary)",
  fontSize: "12px",
};

const mobileAccountNameStyle = {
  display: "block",
  margin: "4px 0 0",
  color: "var(--text-primary)",
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mobileToggleStyle = {
  position: "relative",
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: "1px solid rgba(190,200,235,0.65)",
  background: "var(--card-bg)",
  cursor: "pointer",
  padding: 0,
};

function mobileToggleLineStyle(menuOpen, position) {
  const topMap = {
    top: menuOpen ? "20px" : "14px",
    middle: "20px",
    bottom: menuOpen ? "20px" : "26px",
  };

  const transformMap = {
    top: menuOpen ? "rotate(45deg)" : "none",
    middle: menuOpen ? "scaleX(0)" : "none",
    bottom: menuOpen ? "rotate(-45deg)" : "none",
  };

  return {
    position: "absolute",
    left: "10px",
    right: "10px",
    top: topMap[position],
    height: "2px",
    borderRadius: "999px",
    background: "var(--text-secondary)",
    transform: transformMap[position],
    transition: "all 0.2s ease",
    transformOrigin: "center",
  };
}

const mobilePanelStyle = {
  marginTop: "14px",
  padding: "16px",
  borderRadius: "22px",
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  boxShadow: "0 18px 36px rgba(95,111,163,0.12)",
};
