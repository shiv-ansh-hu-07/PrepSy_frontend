import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { track } from "../services/analytics";

export default function Register() {
  const navigate = useNavigate();
  const { register, loginWithToken } = useAuth();

  // Top of the signup funnel — pairs with signup_completed to give conversion.
  useEffect(() => {
    track("signup_started");
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New accounts are signed in immediately and land on the dashboard, which
  // sends first-timers through the short /welcome intent screen.
  async function handleRegister(e) {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const signedIn = await register(name, email, password);
      navigate(signedIn ? "/dashboard" : "/login", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle(credentialResponse) {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await api.post("/auth/oauth/google", {
        idToken: credentialResponse.credential,
      });
      await loginWithToken(res.data.token, res.data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Google sign-up failed");
    } finally {
      setIsSubmitting(false);
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
          backgroundColor: "var(--card-bg)",
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
            color: "var(--text-secondary)",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          Create your  account
        </h2>

        <p
          style={{
            fontSize: "15px",
            color: "var(--text-secondary)",
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
                color: "var(--text-secondary)",
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
                color: "var(--text-primary)",
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
                color: "var(--text-secondary)",
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
                color: "var(--text-primary)",
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
                color: "var(--text-secondary)",
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
              minLength={8}
              maxLength={72}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "18px",
                border: "1px solid #e3e6ff",
                fontSize: "14px",
                color: "var(--text-primary)",
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
            disabled={isSubmitting}
            style={{
              display: "block",
              margin: "0 auto",
              width: "88%",
              padding: "14px 0",
              borderRadius: "999px",
              background:
                "var(--accent)",
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
            {isSubmitting ? "Creating account…" : "Create Account"}
          </button>

          <div
            style={{
              marginTop: "18px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <GoogleLogin
              theme="outline"
              size="large"
              shape="pill"
              text="signup_with"
              width="360"
              onSuccess={handleGoogle}
              onError={() => setError("Google sign-up failed")}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "22px",
              fontSize: "14px",
              color: "var(--text-secondary)",
              textAlign: "center",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "var(--text-secondary)",
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
