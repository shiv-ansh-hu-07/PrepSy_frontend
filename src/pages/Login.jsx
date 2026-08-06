import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const {
    login,
    loginWithToken,
    markGuestSessionActive,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGuestContinue = () => {
    markGuestSessionActive();
    navigate("/dashboard", { replace: true });
  };

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
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
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
        <h2
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            color: "var(--text-secondary)",
            textAlign: "center",
            marginBottom: "6px",
          }}
        >
          Sign in to PrepSy
        </h2>

        <p
          style={{
            textAlign: "center",
            fontSize: "15px",
            color: "var(--text-secondary)",
            marginBottom: "28px",
          }}
        >
          Continue your focused study sessions.
        </p>

        <form onSubmit={handleLogin}>
          {error ? (
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
          ) : null}

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
              autoComplete="email"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "18px",
                border: "1px solid #e3e6ff",
                fontSize: "14px",
                color: "#1f2937",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = "0 0 0 3px rgba(109,106,248,0.22)";
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

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
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "18px",
                border: "1px solid #e3e6ff",
                fontSize: "14px",
                color: "#1f2937",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = "0 0 0 3px rgba(109,106,248,0.22)";
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isGoogleSubmitting}
            style={{
              width: "90%",
              padding: "14px",
              borderRadius: "999px",
              background: "var(--accent)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 500,
              textAlign: "center",
              border: "none",
              cursor: isSubmitting || isGoogleSubmitting ? "wait" : "pointer",
              opacity: isSubmitting || isGoogleSubmitting ? 0.75 : 1,
              boxShadow:
                "0 18px 36px rgba(109,106,248,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={handleGuestContinue}
            disabled={isSubmitting || isGoogleSubmitting}
            style={{
              width: "90%",
              padding: "14px",
              marginTop: "12px",
              borderRadius: "999px",
              background: "#eef2ff",
              color: "var(--text-secondary)",
              fontSize: "15px",
              fontWeight: 500,
              textAlign: "center",
              border: "1px solid #d9e2ff",
              cursor: isSubmitting || isGoogleSubmitting ? "wait" : "pointer",
              opacity: isSubmitting || isGoogleSubmitting ? 0.7 : 1,
            }}
          >
            Continue as Guest
          </button>

          {isGoogleSubmitting ? (
            <p
              style={{
                marginTop: "12px",
                textAlign: "center",
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              Finishing Google sign-in...
            </p>
          ) : null}

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
              text="continue_with"
              width="360"
              onSuccess={async (credentialResponse) => {
                setError("");
                setIsGoogleSubmitting(true);

                try {
                  const res = await api.post("/auth/oauth/google", {
                    idToken: credentialResponse.credential,
                  });

                  loginWithToken(res.data.token, res.data.user);
                  navigate("/dashboard", { replace: true });
                } catch (err) {
                  setError(
                    err?.response?.data?.message || "Google login failed"
                  );
                } finally {
                  setIsGoogleSubmitting(false);
                }
              }}
              onError={() => {
                setError("Google login failed");
              }}
            />
          </div>

          <div
            style={{
              marginTop: "20px",
              fontSize: "14px",
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Don't have an account?{" "}
            <Link
              to="/register"
              style={{
                color: "var(--text-secondary)",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
