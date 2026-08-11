import React, { useEffect, useState } from "react";
import { UserCheck, UserX, Users } from "lucide-react";
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
const resolveAvatar = (url) => {
  if (!url) return null;
  return url.startsWith("/uploads/") ? `${import.meta.env.VITE_API_BASE_URL}${url}` : url;
};

function Avatar({ person, size = 44 }) {
  const src = resolveAvatar(person.avatarUrl);
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--card-border)" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #6f7fc0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
      {initialsOf(person.name)}
    </div>
  );
}

function Identity({ person }) {
  const sub = person.role
    ? `${person.role}${person.institutionName ? ` · ${person.institutionName}` : ""}`
    : person.institutionName || (person.username ? `@${person.username}` : "");
  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</p>
      {sub ? <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p> : null}
    </div>
  );
}

export default function Friends() {
  const { user } = useAuth();
  const w = useWindowWidth();
  const isNarrow = w < 960;

  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = () => {
    Promise.all([api.get("/friends"), api.get("/friends/requests")])
      .then(([f, r]) => { setFriends(f.data || []); setRequests(r.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.id]);

  const respond = async (person, accept) => {
    setBusy(person.userId);
    try {
      await api.post("/friends/respond", { userId: person.userId, accept });
      setRequests((prev) => prev.filter((p) => p.userId !== person.userId));
      if (accept) setFriends((prev) => [person, ...prev]);
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't respond to request.");
    } finally { setBusy(null); }
  };

  const unfriend = async (person) => {
    if (!window.confirm(`Remove ${person.name} from friends?`)) return;
    setBusy(person.userId);
    try {
      await api.delete(`/friends/${person.userId}`);
      setFriends((prev) => prev.filter((p) => p.userId !== person.userId));
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't remove friend.");
    } finally { setBusy(null); }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 76px)", padding: "32px 24px 56px", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)", gap: 24 }}>
        {!isNarrow && <AppSideNav />}

        <main>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>PrepSy · Community</p>
          <h1 style={{ margin: "4px 0 24px", fontFamily: "Georgia, serif", fontSize: 30, color: "var(--text-primary)" }}>Friends</h1>

          {loading ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading…</p>
          ) : (
            <>
              {requests.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                    Friend requests <span style={{ color: "var(--accent)" }}>({requests.length})</span>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {requests.map((p) => (
                      <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                        <Avatar person={p} />
                        <Identity person={p} />
                        <button onClick={() => respond(p, true)} disabled={busy === p.userId} style={{ height: 36, padding: "0 14px", borderRadius: 9, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <UserCheck size={14} /> Accept
                        </button>
                        <button onClick={() => respond(p, false)} disabled={busy === p.userId} style={{ height: 36, padding: "0 12px", borderRadius: 9, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                          Decline
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                  Your friends <span style={{ color: "var(--text-muted)" }}>({friends.length})</span>
                </h3>
                {friends.length === 0 ? (
                  <div style={{ border: "1px solid var(--card-border)", borderRadius: 18, background: "var(--card-bg)", padding: "28px 22px", textAlign: "center" }}>
                    <Users size={26} style={{ color: "var(--accent)" }} />
                    <p style={{ margin: "10px 0 4px", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>No friends yet</p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Head to “Find your people” to connect with learners like you.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                    {friends.map((p) => (
                      <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                        <Avatar person={p} />
                        <Identity person={p} />
                        <button onClick={() => unfriend(p)} disabled={busy === p.userId} title="Remove friend" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <UserX size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
