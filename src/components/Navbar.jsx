import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
        background:
          "linear-gradient(to bottom, rgba(246,248,254,0.92), rgba(246,248,254,0.82))",
        borderBottom: "1px solid rgba(190,200,235,0.4)",
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
                background: "#e8edfb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#5f6fa3",
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
                color: "#3f4f7a",
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
                    color: item.active ? "#3f4f7a" : "#6b7bb0",
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
                        backgroundColor: "#8a9bd6",
                        borderRadius: "2px",
                      }}
                    />
                  ) : null}
                </Link>
              ))}

              {user ? (
                <>
                  <span
                    style={{
                      fontSize: isCompact ? "13px" : "14px",
                      color: "#8a97c4",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isCompact ? greetingLabel : `Hi, ${greetingLabel}`}
                  </span>

                  {showAttendanceStreak ? (
                    <div
                      title={`Daily attendance streak: ${attendanceStreak}`}
                      style={streakPillStyle(isCompact)}
                    >
                      <span style={{ fontSize: isCompact ? "12px" : "14px" }}>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  paddingBottom: "14px",
                  marginBottom: "14px",
                  borderBottom: "1px solid rgba(190,200,235,0.45)",
                }}
              >
                <div>
                  <p style={{ margin: 0, color: "#8a97c4", fontSize: "12px" }}>
                    Signed in
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#3f4f7a", fontWeight: 600 }}>
                    {user.name || user.email}
                  </p>
                </div>
                {showAttendanceStreak ? (
                  <div style={streakPillStyle(true)}>
                    <span style={{ fontSize: "12px", fontWeight: 600 }}>
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
                    color: item.active ? "#3f4f7a" : "#5f6fa3",
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
  }

  return links;
}

function buildMobileLinks({ user, isHomePage, isFeaturePage }) {
  const links = [];

  if (user) {
    links.push({ label: "Home", path: "/dashboard", active: false });
    links.push({ label: "Community", path: "/community", active: false });
    links.push({ label: "Features", path: "/feature", active: false });
    links.push({ label: "My Rooms", path: "/myRooms", active: false });
    links.push({ label: "Create Room", path: "/create-room", active: false });
    links.push({ label: "Join Room", path: "/join-room", active: false });
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
  backgroundColor: "#eef2ff",
  color: "#5f6fa3",
  fontSize: "13px",
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
};

const mobileToggleStyle = {
  position: "relative",
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: "1px solid rgba(190,200,235,0.65)",
  background: "rgba(255,255,255,0.78)",
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
    background: "#5f6fa3",
    transform: transformMap[position],
    transition: "all 0.2s ease",
    transformOrigin: "center",
  };
}

const mobilePanelStyle = {
  marginTop: "14px",
  padding: "16px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(190,200,235,0.45)",
  boxShadow: "0 18px 36px rgba(95,111,163,0.12)",
};
