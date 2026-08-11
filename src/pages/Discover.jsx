import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MapPin, GraduationCap, Github, Linkedin, Link2, Sparkles, UserPlus, Check, Clock } from "lucide-react";
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

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PS";
  return parts.map((p) => p[0]?.toUpperCase()).join("").slice(0, 2);
}

function resolveAvatar(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${import.meta.env.VITE_API_BASE_URL}${url}`;
  return url;
}

const Chip = ({ children, tone = "accent" }) => {
  const tones = {
    accent: { bg: "var(--accent-soft)", color: "var(--accent)" },
    goal: { bg: "rgba(34,197,94,0.12)", color: "#166534" },
    exam: { bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
  };
  const t = tones[tone] || tones.accent;
  return (
    <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: t.bg, color: t.color, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
};

const FRIEND_BTN = {
  none: { label: "Add friend", icon: UserPlus, primary: true },
  outgoing: { label: "Requested", icon: Clock, primary: false, disabled: true },
  incoming: { label: "Accept request", icon: Check, primary: true },
  friends: { label: "Friends", icon: Check, primary: false, disabled: true },
};

function PeerCard({ peer, onOpenLink, onFriend, busy }) {
  const avatar = resolveAvatar(peer.avatarUrl);
  const location = [peer.city, peer.country].filter(Boolean).join(", ");
  const affiliation = peer.role
    ? `${peer.role}${peer.company ? ` · ${peer.company}` : ""}`
    : peer.institutionName || "";
  const chips = [
    ...(peer.sharedExamTargets || []).map((v) => ({ v, tone: "exam" })),
    ...(peer.sharedGoals || []).map((v) => ({ v, tone: "goal" })),
    ...(peer.sharedInterests || []).map((v) => ({ v, tone: "accent" })),
  ];
  const shown = chips.slice(0, 5);
  const extra = chips.length - shown.length;

  return (
    <div style={{ border: "1px solid var(--card-border)", borderRadius: 18, background: "var(--card-bg)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {avatar ? (
          <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--card-border)" }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #6f7fc0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
            {initialsOf(peer.name)}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {peer.name}
          </p>
          {affiliation ? (
            <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{affiliation}</p>
          ) : null}
        </div>
        {peer.matchPercent > 0 ? (
          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg, var(--accent), #6f7fc0)", padding: "4px 10px", borderRadius: 999 }}>
            {peer.matchPercent}%
          </span>
        ) : null}
      </div>

      {(location || peer.sameInstitution) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, color: "var(--text-muted)" }}>
          {location ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {location}</span> : null}
          {peer.sameInstitution ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent)", fontWeight: 700 }}><GraduationCap size={12} /> Same institution</span> : null}
        </div>
      )}

      {peer.bio ? (
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {peer.bio}
        </p>
      ) : null}

      {shown.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {shown.map((c, i) => <Chip key={i} tone={c.tone}>{c.v}</Chip>)}
          {extra > 0 ? <Chip>+{extra} more</Chip> : null}
        </div>
      )}

      {(() => {
        const cfg = FRIEND_BTN[peer.friendStatus] || FRIEND_BTN.none;
        const Icon = cfg.icon;
        const disabled = cfg.disabled || busy;
        return (
          <button
            onClick={() => !cfg.disabled && !busy && onFriend(peer)}
            disabled={disabled}
            style={{
              marginTop: "auto", height: 38, borderRadius: 10, border: cfg.primary ? "none" : "1px solid var(--card-border)",
              background: cfg.primary ? "var(--accent-gradient, #7c3aed)" : "transparent",
              color: cfg.primary ? "#fff" : "var(--text-secondary)",
              fontWeight: 700, fontSize: 13, cursor: disabled ? "default" : "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Icon size={15} /> {busy ? "…" : cfg.label}
          </button>
        );
      })()}

      {(peer.githubUrl || peer.linkedinUrl || peer.portfolioUrl) && (
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          {peer.githubUrl ? <LinkBtn onClick={() => onOpenLink(peer.githubUrl)}><Github size={13} /> GitHub</LinkBtn> : null}
          {peer.linkedinUrl ? <LinkBtn onClick={() => onOpenLink(peer.linkedinUrl)}><Linkedin size={13} /> LinkedIn</LinkBtn> : null}
          {peer.portfolioUrl ? <LinkBtn onClick={() => onOpenLink(peer.portfolioUrl)}><Link2 size={13} /> Portfolio</LinkBtn> : null}
        </div>
      )}
    </div>
  );
}

const LinkBtn = ({ children, onClick }) => (
  <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 9, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
    {children}
  </button>
);

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isNarrow = w < 960;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ hasProfileSignals: true, peers: [] });

  useEffect(() => {
    let cancelled = false;
    api
      .get("/profiles/discover")
      .then((res) => { if (!cancelled) { setData(res.data); setError(""); } })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || "Couldn't load people right now."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const [busyId, setBusyId] = useState(null);

  const openLink = (url) => {
    const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    window.open(safe, "_blank", "noopener,noreferrer");
  };

  const setPeerStatus = (userId, friendStatus) =>
    setData((prev) => ({ ...prev, peers: prev.peers.map((p) => (p.userId === userId ? { ...p, friendStatus } : p)) }));

  const handleFriend = async (peer) => {
    const status = peer.friendStatus;
    if (status === "outgoing" || status === "friends") return;
    setBusyId(peer.userId);
    try {
      const res = status === "incoming"
        ? await api.post("/friends/respond", { userId: peer.userId, accept: true })
        : await api.post("/friends/request", { userId: peer.userId });
      setPeerStatus(peer.userId, res?.data?.status || "outgoing");
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't update friend status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 76px)", padding: "32px 24px 56px", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)", gap: 24 }}>
        {!isNarrow && <AppSideNav />}

        <main>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>PrepSy · Community</p>
          <h1 style={{ margin: "4px 0 4px", fontFamily: "Georgia, serif", fontSize: 30, color: "var(--text-primary)" }}>Find your people</h1>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)", maxWidth: 620 }}>
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
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>
                Add your goals, interests, and exam targets — that's how we find people prepping like you.
              </p>
              <button onClick={() => navigate("/profile")} style={{ height: 40, padding: "0 20px", borderRadius: 12, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                Complete profile →
              </button>
            </div>
          ) : data.peers.length === 0 ? (
            <div style={{ border: "1px solid var(--card-border)", borderRadius: 18, background: "var(--card-bg)", padding: "28px 22px", textAlign: "center" }}>
              <Users size={26} style={{ color: "var(--accent)" }} />
              <p style={{ margin: "10px 0 4px", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>No matches yet</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                As more learners join and make their profile discoverable, they'll show up here.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {data.peers.map((p) => (
                <PeerCard key={p.userId} peer={p} onOpenLink={openLink} onFriend={handleFriend} busy={busyId === p.userId} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
