import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    try {
      await register(name, email, password);
      alert("Account created! Please login.");
      navigate("/login");
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at center, rgba(109,106,248,0.12), transparent 65%), #f6f7fc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#ffffff",
          borderRadius: "28px",
          padding: "36px 36px 32px",
          boxShadow: "0 30px 70px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <h2
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            color: "#4a5a85",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          Create your  account
        </h2>

        <p
          style={{
            fontSize: "15px",
            color: "#6b7280",
            marginBottom: "28px",
            textAlign: "center",
          }}
        >
          Start building focused study habits.
        </p>

        <form onSubmit={handleRegister}>
          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "13px",
                padding: "12px 14px",
                borderRadius: "14px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* Full Name */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "6px",
              }}
            >
              Full Name
            </label>
            <input
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "18px",
                border: "1px solid #e3e6ff",
                fontSize: "14px",
                color: "#1f2937",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow =
                  "0 0 0 3px rgba(109,106,248,0.22)")
              }
              onBlur={(e) =>
                (e.target.style.boxShadow = "none")
              }
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "6px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "18px",
                border: "1px solid #e3e6ff",
                fontSize: "14px",
                color: "#1f2937",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow =
                  "0 0 0 3px rgba(109,106,248,0.22)")
              }
              onBlur={(e) =>
                (e.target.style.boxShadow = "none")
              }
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "28px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "18px",
                border: "1px solid #e3e6ff",
                fontSize: "14px",
                color: "#1f2937",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow =
                  "0 0 0 3px rgba(109,106,248,0.22)")
              }
              onBlur={(e) =>
                (e.target.style.boxShadow = "none")
              }
            />
          </div>

          {/* CTA */}
          <button
            type="submit"
            style={{
              display: "block",
              margin: "0 auto",
              width: "88%",
              padding: "14px 0",
              borderRadius: "999px",
              background:
                "#8a9bd6",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              textAlign: "center",
              boxShadow:
                "0 18px 36px rgba(109,106,248,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
              transition:
                "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 22px 44px rgba(109,106,248,0.45), inset 0 1px 0 rgba(255,255,255,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 18px 36px rgba(109,106,248,0.35), inset 0 1px 0 rgba(255,255,255,0.35)";
            }}
          >
            Create Account
          </button>

          {/* Footer */}
          <div
            style={{
              marginTop: "22px",
              fontSize: "14px",
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "#4a5a85",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
