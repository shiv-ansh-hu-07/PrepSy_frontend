import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState(
    typeof window !== "undefined" ? window.innerWidth < 760 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => setIsCompact(window.innerWidth < 760);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isHomePage = location.pathname === "/";
  const isFeaturePage = location.pathname === "/feature";
  const isLoginPage = location.pathname === "/login";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;
  const attendanceStreak = user?.attendanceStreak ?? 0;
  const showAttendanceStreak = Boolean(user && !user?.streakDisabled);

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

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(10px)",
        background:
          "linear-gradient(to bottom, rgba(246,248,254,0.9), rgba(246,248,254,0.75))",
        borderBottom: "1px solid rgba(190,200,235,0.4)",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: isCompact ? "12px 16px" : "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isCompact ? "12px" : "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCompact ? "8px" : "12px",
            minWidth: 0,
            flexShrink: 1,
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
              cursor: "pointer",
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

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCompact ? "12px" : "28px",
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          {isFeaturePage && !user ? (
            <Link
              to="/"
              style={{
                fontSize: isCompact ? "13px" : "14px",
                color: "#6b7bb0",
                textDecoration: "none",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Home
            </Link>
          ) : (
            <Link
              to="/feature"
              style={{
                fontSize: isCompact ? "13px" : "14px",
                color: "#6b7bb0",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Features
            </Link>
          )}

          {(isHomePage || isFeaturePage) && !user && (
            <Link
              to="/login"
              style={{
                padding: isCompact ? "7px 14px" : "8px 18px",
                borderRadius: "999px",
                backgroundColor: "#8a9bd6",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                boxShadow: "0 6px 16px rgba(109,106,248,0.25)",
                whiteSpace: "nowrap",
              }}
            >
              Login
            </Link>
          )}

          {(user || !isHomePage || isLoginPage) && user && (
            <>
              <Link
                to="/dashboard"
                style={{
                  fontSize: isCompact ? "13px" : "14px",
                  color: isActive("/dashboard") ? "#3f4f7a" : "#6b7bb0",
                  fontWeight: isActive("/dashboard") ? 500 : 400,
                  textDecoration: "none",
                  position: "relative",
                  whiteSpace: "nowrap",
                }}
              >
                Home
                {isActive("/dashboard") && (
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
                )}
              </Link>

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
                  style={{
                    display: "flex",
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
                  }}
                >
                  <span style={{ fontSize: isCompact ? "12px" : "14px" }}>Streak</span>
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

              <button
                onClick={handleLogout}
                style={{
                  padding: isCompact ? "6px 12px" : "6px 14px",
                  borderRadius: "999px",
                  backgroundColor: "#eef2ff",
                  color: "#5f6fa3",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#5f6fa3";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#eef2ff";
                  e.currentTarget.style.color = "#5f6fa3";
                }}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
