// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path;

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
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >

        {/* BRAND */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
            }}
          >
            PS
          </div>

          <span
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "20px",
              color: "#3f4f7a",
            }}
          >
            PrepSy
          </span>
        </div>

        {/* NAV */}
        <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          {/* FEATURES — always visible */}
          <Link
            to="/#features"
            style={{
              fontSize: "14px",
              color: "#6b7bb0",
              textDecoration: "none",
            }}
          >
            Features
          </Link>

          {/* HOME PAGE (logged out) → Login only */}
          {isHomePage && !user && (
            <Link
              to="/login"
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                backgroundColor: "#8a9bd6",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                boxShadow: "0 6px 16px rgba(109,106,248,0.25)",
              }}
            >
              Login
            </Link>
          )}

          {!isHomePage && user && (
            <>
              <Link
                to="/dashboard"
                style={{
                  fontSize: "14px",
                  color: isActive("/dashboard") ? "#3f4f7a" : "#6b7bb0",
                  fontWeight: isActive("/dashboard") ? 500 : 400,
                  textDecoration: "none",
                  position: "relative",
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
                  fontSize: "14px",
                  color: "#8a97c4",
                }}
              >
                Hi, {user.name}
              </span>

              <button
                onClick={handleLogout}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  backgroundColor: "#eef2ff",
                  color: "#5f6fa3",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
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
