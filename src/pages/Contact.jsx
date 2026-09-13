import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitContact } from "../services/api";

const PAGE_BG = "var(--page-bg)";

export default function Contact() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSend = name.trim() && emailValid && message.trim() && !sending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError("");
    try {
      await submitContact({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 76px)", background: PAGE_BG, padding: "40px 20px 64px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 32, color: "var(--text-primary)" }}>Get in touch</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Questions, bugs, feedback, or an idea for Prepsy? Send it over — we read everything.
          </p>
        </div>

        <div style={card}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "24px 8px" }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Message sent!</h2>
              <p style={{ margin: "8px 0 20px", fontSize: 14, color: "var(--text-secondary)" }}>
                Thanks for reaching out — we'll get back to you at <strong>{email}</strong>.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => { setSent(false); setSubject(""); setMessage(""); }} style={btnGhost}>Send another</button>
                <button onClick={() => navigate("/")} style={btnPrimary(false)}>Back home</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <Field label="Your name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shivanshu Tiwari" style={input} maxLength={120} />
              </Field>
              <Field label="Your email" hint={email && !emailValid ? "Enter a valid email" : ""}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={input} maxLength={160} />
              </Field>
              <Field label="Subject (optional)">
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" style={input} maxLength={160} />
              </Field>
              <Field label="Message">
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Tell us what's on your mind…" style={{ ...input, height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.6 }} maxLength={5000} />
              </Field>

              {error && (
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "#dc2626", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 12px" }}>{error}</p>
              )}

              <button type="submit" disabled={!canSend} style={{ ...btnPrimary(!canSend), width: "100%" }}>
                {sending ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>
        {label}
        {hint ? <span style={{ color: "#dc2626", fontWeight: 600 }}>{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

const card = {
  borderRadius: 20,
  border: "1px solid var(--card-border)",
  background: "var(--card-bg)",
  boxShadow: "var(--card-shadow)",
  padding: "26px 24px",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  height: 44,
  borderRadius: 10,
  border: "1.5px solid rgba(138,155,214,0.4)",
  background: "var(--input-bg)",
  padding: "0 14px",
  fontSize: 14,
  color: "var(--text-primary)",
  outline: "none",
  fontFamily: "inherit",
};

const btnPrimary = (disabled) => ({
  height: 46,
  padding: "0 24px",
  borderRadius: 12,
  border: "none",
  background: disabled ? "var(--card-border)" : "var(--accent-gradient)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  cursor: disabled ? "not-allowed" : "pointer",
});

const btnGhost = {
  height: 46,
  padding: "0 20px",
  borderRadius: 12,
  border: "1px solid var(--accent)",
  background: "var(--card-bg)",
  color: "var(--accent)",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
