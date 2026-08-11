import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Sparkles, UserPlus, Check, Clock, MessageSquare, Search, X,
  Github, Linkedin, Link2, MapPin, GraduationCap, Lock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AppSideNav from "../components/AppSideNav";

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

const initialsOf = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.map((p) => p[0]?.toUpperCase()).join("").slice(0, 2) : "PS";
};
const resolveAvatar = (url) =>
  !url ? null : url.startsWith("/uploads/") ? `${import.meta.env.VITE_API_BASE_URL}${url}` : url;

function Avatar({ person, size = 48 }) {
  const src = resolveAvatar(person?.avatarUrl);
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--card-border)" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #6f7fc0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>
      {initialsOf(person?.name)}
    </div>
  );
}

const FRIEND_BTN = {
  none: { label: "Add friend", icon: UserPlus, primary: true },
  outgoing: { label: "Requested", icon: Clock, primary: false, disabled: true },
  incoming: { label: "Accept request", icon: Check, primary: true },
  friends: { label: "Message", icon: MessageSquare, primary: false },
};

function FriendButton({ status, busy, onClick, full }) {
  const cfg = FRIEND_BTN[status] || FRIEND_BTN.none;
  const Icon = cfg.icon;
  const disabled = cfg.disabled || busy;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 38, width: full ? "100%" : undefined, padding: full ? 0 : "0 14px", borderRadius: 10,
        border: cfg.primary ? "none" : "1px solid var(--card-border)",
        background: cfg.primary ? "var(--accent-gradient, #7c3aed)" : "transparent",
        color: cfg.primary ? "#fff" : "var(--text-secondary)",
        fontWeight: 700, fontSize: 13, cursor: disabled ? "default" : "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: busy ? 0.6 : 1,
      }}
    >
      <Icon size={15} /> {busy ? "…" : cfg.label}
    </button>
  );
}

// Minimal, privacy-respecting card: name + bio only until you're friends.
function MiniCard({ person, onOpen, onFriend, busy }) {
  return (
    <div style={{ border: "1px solid var(--card-border)", borderRadius: 18, background: "var(--card-bg)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div onClick={() => onOpen(person.userId)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <Avatar person={person} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</p>
          <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "var(--accent)" }}>View profile</p>
        </div>
      </div>
      {person.bio ? (
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{person.bio}</p>
      ) : (
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>No bio yet.</p>
      )}
      <FriendButton status={person.friendStatus} busy={busy} full onClick={() => onFriend(person)} />
    </div>
  );
}

const Chip = ({ children, tone = "accent" }) => {
  const tones = { accent: { bg: "var(--accent-soft)", color: "var(--accent)" }, goal: { bg: "rgba(34,197,94,0.12)", color: "#166534" }, exam: { bg: "rgba(239,68,68,0.1)", color: "#dc2626" } };
  const t = tones[tone] || tones.accent;
  return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: t.bg, color: t.color }}>{children}</span>;
};

const LinkBtn = ({ children, onClick }) => (
  <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 9, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
    {children}
  </button>
);

// Full profile — minimal for strangers, complete for friends.
function ProfileModal({ userId, onClose, onFriend, busy, onMessage }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // 12s timeout so a slow/restarting backend can never freeze the modal.
  const load = useCallback(
    () => api.get(`/profiles/${userId}`, { timeout: 12000 })
      .then((res) => setP(res.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false)),
    [userId],
  );
  useEffect(() => { load(); }, [load]);
  const retry = () => { setLoading(true); setFailed(false); setP(null); load(); };

  const openLink = (url) => {
    const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    window.open(safe, "_blank", "noopener,noreferrer");
  };
  const location = p ? [p.city, p.country].filter(Boolean).join(", ") : "";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,18,32,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "86vh", overflowY: "auto", background: "var(--card-bg)", borderRadius: 20, border: "1px solid var(--card-border)", padding: 22, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading…</p>
        ) : failed || !p ? (
          <div style={{ textAlign: "center", padding: "16px 8px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 12px" }}>Couldn't load this profile.</p>
            <button onClick={retry} style={{ height: 38, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Try again</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <Avatar person={p} size={64} />
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "var(--text-primary)" }}>{p.name}</h3>
                {p.isFriend && p.role ? <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{p.role}{p.company ? ` · ${p.company}` : ""}</p> : null}
              </div>
            </div>

            {p.bio ? <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{p.bio}</p> : null}

            <div style={{ marginBottom: 16 }}>
              {p.friendStatus === "friends" ? (
                <FriendButton status="friends" full onClick={() => onMessage(p.userId)} />
              ) : (
                <FriendButton status={p.friendStatus} busy={busy} full onClick={() => onFriend({ userId: p.userId, friendStatus: p.friendStatus }, load)} />
              )}
            </div>

            {p.isFriend ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(location || p.institutionName) && (
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-secondary)" }}>
                    {location ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={14} /> {location}</span> : null}
                    {p.institutionName ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><GraduationCap size={14} /> {p.institutionName}</span> : null}
                  </div>
                )}
                <Section title="Goals" items={p.goals} tone="goal" />
                <Section title="Exam targets" items={p.examTargets} tone="exam" />
                <Section title="Interests" items={p.interests} tone="accent" />
                <Section title="Skills" items={p.skills} tone="accent" />
                <Section title="Languages" items={p.languages} tone="accent" />
                {(p.githubUrl || p.linkedinUrl || p.portfolioUrl) && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {p.githubUrl ? <LinkBtn onClick={() => openLink(p.githubUrl)}><Github size={13} /> GitHub</LinkBtn> : null}
                    {p.linkedinUrl ? <LinkBtn onClick={() => openLink(p.linkedinUrl)}><Linkedin size={13} /> LinkedIn</LinkBtn> : null}
                    {p.portfolioUrl ? <LinkBtn onClick={() => openLink(p.portfolioUrl)}><Link2 size={13} /> Portfolio</LinkBtn> : null}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, background: "var(--accent-soft)", color: "var(--text-secondary)", fontSize: 13 }}>
                <Lock size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                Add them as a friend to see their goals, interests, links, and to chat.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const Section = ({ title, items, tone }) =>
  Array.isArray(items) && items.length ? (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>{title}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{items.map((v, i) => <Chip key={i} tone={tone}>{v}</Chip>)}</div>
    </div>
  ) : null;

export default function Discover({ embedded = false, onMessage }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isNarrow = w < 960;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ hasProfileSignals: true, peers: [] });
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = not searching
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get("/profiles/discover")
      .then((res) => { if (!cancelled) { setData(res.data); setError(""); } })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || "Couldn't load people right now."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Debounced search over all discoverable users.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults(null); return undefined; }
    setSearching(true);
    const t = setTimeout(() => {
      api.get(`/profiles/search?q=${encodeURIComponent(q)}`)
        .then((res) => setResults(res.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const patchStatus = (userId, friendStatus) => {
    setData((prev) => ({ ...prev, peers: prev.peers.map((p) => (p.userId === userId ? { ...p, friendStatus } : p)) }));
    setResults((prev) => (prev ? prev.map((p) => (p.userId === userId ? { ...p, friendStatus } : p)) : prev));
  };

  const handleFriend = async (person, after) => {
    const status = person.friendStatus;
    if (status === "friends") {
      if (onMessage) onMessage(person.userId); else navigate(`/messages/${person.userId}`);
      return;
    }
    if (status === "outgoing") return;
    setBusyId(person.userId);
    try {
      const res = status === "incoming"
        ? await api.post("/friends/respond", { userId: person.userId, accept: true })
        : await api.post("/friends/request", { userId: person.userId });
      patchStatus(person.userId, res?.data?.status || "outgoing");
      if (after) after();
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't update friend status.");
    } finally {
      setBusyId(null);
    }
  };

  const searchList = results || [];

  const body = (
    <>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 20, maxWidth: 520 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everyone by name…"
          style={{ width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", padding: "0 38px 0 40px", fontSize: 14, outline: "none" }}
        />
        {query ? (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
        ) : null}
      </div>

      {results !== null ? (
        // Search results
        searching ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Searching…</p>
        ) : searchList.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No users found for “{query}”.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {searchList.map((p) => (
              <MiniCard key={p.userId} person={p} onOpen={setOpenId} onFriend={handleFriend} busy={busyId === p.userId} />
            ))}
          </div>
        )
      ) : (
        // Matched people
        <>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "var(--text-secondary)", maxWidth: 620 }}>
            Studying alone is hard. These learners are prepping for the same things as you — connect and study together.
          </p>
          {loading ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Finding people for you…</p>
          ) : error ? (
            <p style={{ color: "#c62828", fontSize: 14 }}>{error}</p>
          ) : !data.hasProfileSignals ? (
            <div style={{ border: "1px dashed var(--accent)", borderRadius: 18, background: "var(--accent-soft)", padding: "28px 22px", textAlign: "center" }}>
              <Sparkles size={26} style={{ color: "var(--accent)" }} />
              <p style={{ margin: "10px 0 4px", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>Complete your profile to get matched</p>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>Add your goals, interests, and exam targets — that's how we find people prepping like you.</p>
              <button onClick={() => navigate("/profile")} style={{ height: 40, padding: "0 20px", borderRadius: 12, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Complete profile →</button>
            </div>
          ) : data.peers.length === 0 ? (
            <div style={{ border: "1px solid var(--card-border)", borderRadius: 18, background: "var(--card-bg)", padding: "28px 22px", textAlign: "center" }}>
              <Users size={26} style={{ color: "var(--accent)" }} />
              <p style={{ margin: "10px 0 4px", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>No matches yet</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Search above to find and add anyone, or check back as more learners join.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {data.peers.map((p) => (
                <MiniCard key={p.userId} person={p} onOpen={setOpenId} onFriend={handleFriend} busy={busyId === p.userId} />
              ))}
            </div>
          )}
        </>
      )}

      {openId ? (
        <ProfileModal
          key={openId}
          userId={openId}
          onClose={() => setOpenId(null)}
          onFriend={handleFriend}
          busy={busyId === openId}
          onMessage={(uid) => { setOpenId(null); if (onMessage) onMessage(uid); else navigate(`/messages/${uid}`); }}
        />
      ) : null}
    </>
  );

  if (embedded) return body;

  return (
    <div style={{ minHeight: "calc(100vh - 76px)", padding: "32px 24px 56px", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)", gap: 24 }}>
        {!isNarrow && <AppSideNav />}
        <main>
          <h1 style={{ margin: "0 0 16px", fontFamily: "Georgia, serif", fontSize: 30, color: "var(--text-primary)" }}>Find your people</h1>
          {body}
        </main>
      </div>
    </div>
  );
}
