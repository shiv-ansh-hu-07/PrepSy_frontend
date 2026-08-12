import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageSquare, Video, Paperclip, Smile, FileText } from "lucide-react";

const STICKERS = ["👍", "🔥", "🎉", "😂", "😍", "🙌", "💯", "😎", "🤝", "📚", "☕", "💪", "🧠", "✅", "👏", "🥳", "😴", "🤯", "❤️", "🚀"];

// A short emoji-only message renders big, like a sticker.
const isSticker = (t) => {
  if (!t) return false;
  const chars = [...t.trim()];
  return chars.length > 0 && chars.length <= 3 && /\p{Extended_Pictographic}/u.test(t) && !/[a-z0-9]/i.test(t);
};
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

const timeLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

function Avatar({ person, size = 40 }) {
  const src = resolveAvatar(person?.avatarUrl);
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--card-border)" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #6f7fc0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>
      {initialsOf(person?.name)}
    </div>
  );
}

export default function Messages({ embedded = false, activeId: activeIdProp = null, onSelectChat }) {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const w = useWindowWidth();
  const isNarrow = w < 960;

  const activeId = embedded ? activeIdProp : params.userId || null;
  const selectChat = (userId) => (onSelectChat ? onSelectChat(userId) : navigate(userId ? `/messages/${userId}` : "/messages"));

  const [threads, setThreads] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myRooms, setMyRooms] = useState(null); // null = not loaded
  const [uploading, setUploading] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const lastTypingSent = useRef(0);

  const peopleById = useMemo(() => {
    const m = new Map();
    friends.forEach((f) => m.set(f.userId, f));
    threads.forEach((t) => { if (!m.has(t.userId)) m.set(t.userId, t); });
    return m;
  }, [friends, threads]);
  const activePerson = activeId ? peopleById.get(activeId) || { userId: activeId, name: "Chat" } : null;

  const loadThreads = () => {
    Promise.all([api.get("/friends/threads"), api.get("/friends")])
      .then(([t, f]) => { setThreads(t.data || []); setFriends(f.data || []); })
      .catch(() => {});
  };

  // Load threads + friends, and poll threads every 12s for new conversations.
  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, 12000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Load + poll the active conversation.
  useEffect(() => {
    if (!activeId) { setMessages([]); return undefined; }
    let cancelled = false;
    const fetchConv = () => {
      api.get(`/friends/${activeId}/messages`)
        .then((res) => { if (!cancelled) setMessages(res.data || []); })
        .catch(() => {});
    };
    fetchConv();
    const id = setInterval(fetchConv, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeId]);

  // Poll whether the other person is typing.
  useEffect(() => {
    if (!activeId) { setOtherTyping(false); return undefined; }
    let cancelled = false;
    const check = () => api.get(`/friends/${activeId}/typing`)
      .then((res) => { if (!cancelled) setOtherTyping(Boolean(res.data?.typing)); })
      .catch(() => {});
    check();
    const id = setInterval(check, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeId]);

  // Keep scrolled to the latest message.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, activeId]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/friends/${activeId}/messages`, { text: body });
      setMessages((prev) => [...prev, res.data]);
      setText("");
      loadThreads();
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't send message.");
    } finally {
      setSending(false);
    }
  };

  // Tell the other person we're typing (throttled to once / 2s).
  const notifyTyping = () => {
    if (!activeId) return;
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      api.post(`/friends/${activeId}/typing`).catch(() => {});
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post(`/friends/${activeId}/media`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMessages((prev) => [...prev, res.data]);
      loadThreads();
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't send the file.");
    } finally {
      setUploading(false);
    }
  };

  const sendSticker = async (emoji) => {
    setStickerOpen(false);
    try {
      const res = await api.post(`/friends/${activeId}/messages`, { text: emoji });
      setMessages((prev) => [...prev, res.data]);
      loadThreads();
    } catch {
      /* ignore */
    }
  };

  const openPicker = () => {
    setPickerOpen((v) => !v);
    if (myRooms === null) {
      api.get("/rooms/my")
        .then((res) => {
          const created = res.data?.createdRooms || [];
          const joined = res.data?.joinedRooms || [];
          const seen = new Set();
          const all = [...created, ...joined].filter((r) => {
            if (seen.has(r.roomId)) return false;
            seen.add(r.roomId);
            return true;
          });
          setMyRooms(all);
        })
        .catch(() => setMyRooms([]));
    }
  };

  const sendInvite = async (room) => {
    setPickerOpen(false);
    try {
      const res = await api.post(`/friends/${activeId}/messages`, {
        text: `Join me in "${room.name}"`,
        roomId: room.roomId,
      });
      setMessages((prev) => [...prev, res.data]);
      loadThreads();
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't send the invite.");
    }
  };

  const showList = !isNarrow || !activeId;
  const showConv = !isNarrow || Boolean(activeId);

  const body = (
    <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "320px minmax(0, 1fr)", gap: 16, minHeight: 560 }}>
          {/* Thread list */}
          {showList && (
            <div style={{ border: "1px solid var(--card-border)", borderRadius: 18, background: "var(--card-bg)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--card-border)" }}>
                <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20, color: "var(--text-primary)" }}>Messages</h2>
              </div>
              <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>
                {threads.length === 0 && friends.length === 0 ? (
                  <p style={{ padding: 16, fontSize: 13, color: "var(--text-muted)" }}>Add friends to start chatting.</p>
                ) : (
                  <>
                    {threads.map((t) => (
                      <Row key={t.userId} person={t} active={t.userId === activeId} onClick={() => selectChat(t.userId)}
                        subtitle={`${t.lastFromMe ? "You: " : ""}${t.lastMessage}`} unread={t.unread} />
                    ))}
                    {friends.filter((f) => !threads.some((t) => t.userId === f.userId)).map((f) => (
                      <Row key={f.userId} person={f} active={f.userId === activeId} onClick={() => selectChat(f.userId)}
                        subtitle="Say hi 👋" unread={0} />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Conversation */}
          {showConv && (
            <div style={{ border: "1px solid var(--card-border)", borderRadius: 18, background: "var(--card-bg)", display: "flex", flexDirection: "column", minHeight: isNarrow ? "70vh" : 560, overflow: "hidden" }}>
              {!activeId ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: 8 }}>
                  <MessageSquare size={28} />
                  <p style={{ margin: 0, fontSize: 14 }}>Select a conversation</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 12 }}>
                    {isNarrow && (
                      <button onClick={() => selectChat(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                        <ArrowLeft size={18} />
                      </button>
                    )}
                    <Avatar person={activePerson} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{activePerson?.name}</p>
                      {activePerson?.role ? <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)" }}>{activePerson.role}</p> : null}
                    </div>
                    <div style={{ position: "relative" }}>
                      <button onClick={openPicker} title="Invite to a room" style={{ height: 34, padding: "0 12px", borderRadius: 9, border: "1px solid var(--card-border)", background: pickerOpen ? "var(--accent-soft)" : "transparent", color: "var(--accent)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Video size={15} /> Invite
                      </button>
                      {pickerOpen && (
                        <div style={{ position: "absolute", right: 0, top: 40, width: 260, maxHeight: 300, overflowY: "auto", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.18)", zIndex: 40, padding: 6 }}>
                          <p style={{ margin: "6px 10px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Invite to a room</p>
                          {myRooms === null ? (
                            <p style={{ padding: "6px 10px", fontSize: 12.5, color: "var(--text-muted)" }}>Loading rooms…</p>
                          ) : myRooms.length === 0 ? (
                            <p style={{ padding: "6px 10px", fontSize: 12.5, color: "var(--text-muted)" }}>You have no rooms yet. Create one first.</p>
                          ) : (
                            myRooms.map((r) => (
                              <button key={r.roomId} onClick={() => sendInvite(r)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    {messages.length === 0 ? (
                      <p style={{ margin: "auto", fontSize: 13, color: "var(--text-muted)" }}>No messages yet — say hello.</p>
                    ) : (
                      messages.map((m) => {
                        const mine = m.senderId === user?.id;
                        return (
                          <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                            {m.mediaType === "image" ? (
                              <a href={m.mediaUrl} target="_blank" rel="noreferrer">
                                <img src={m.mediaUrl} alt="" style={{ maxWidth: 240, maxHeight: 280, borderRadius: 14, display: "block", border: "1px solid var(--card-border)" }} />
                              </a>
                            ) : m.mediaType === "file" ? (
                              <a href={m.mediaUrl} target="_blank" rel="noreferrer" download style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, textDecoration: "none",
                                background: mine ? "var(--accent-gradient, #7c3aed)" : "var(--accent-soft)", color: mine ? "#fff" : "var(--text-primary)", maxWidth: 240 }}>
                                <FileText size={20} style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.fileName || "File"}</span>
                              </a>
                            ) : m.roomId ? (
                              <RoomInvite mine={mine} text={m.text} onJoin={() => navigate(`/room/${m.roomId}`)} />
                            ) : isSticker(m.text) ? (
                              <div style={{ fontSize: 44, lineHeight: 1.1, padding: "2px 4px" }}>{m.text}</div>
                            ) : (
                              <div style={{ padding: "8px 12px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word",
                                background: mine ? "var(--accent-gradient, #7c3aed)" : "var(--accent-soft)", color: mine ? "#fff" : "var(--text-primary)" }}>
                                {m.text}
                              </div>
                            )}
                            <p style={{ margin: "2px 4px 0", fontSize: 10, color: "var(--text-muted)", textAlign: mine ? "right" : "left" }}>{timeLabel(m.createdAt)}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {otherTyping ? (
                    <div style={{ padding: "0 16px 6px", fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                      {(activePerson?.name || "They").split(" ")[0]} is typing…
                    </div>
                  ) : null}

                  <div style={{ padding: 12, borderTop: "1px solid var(--card-border)", display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
                    <input ref={fileRef} type="file" onChange={onFileChange} style={{ display: "none" }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach a photo or file" style={{ width: 40, height: 42, borderRadius: 12, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-secondary)", cursor: uploading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Paperclip size={17} />
                    </button>
                    <button onClick={() => setStickerOpen((v) => !v)} title="Stickers" style={{ width: 40, height: 42, borderRadius: 12, border: "1px solid var(--card-border)", background: stickerOpen ? "var(--accent-soft)" : "transparent", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Smile size={17} />
                    </button>
                    {stickerOpen && (
                      <div style={{ position: "absolute", left: 12, bottom: 60, width: 264, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.2)", padding: 10, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, zIndex: 40 }}>
                        {STICKERS.map((s) => (
                          <button key={s} onClick={() => sendSticker(s)} style={{ fontSize: 24, background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 8, lineHeight: 1 }}>{s}</button>
                        ))}
                      </div>
                    )}
                    <input
                      value={text}
                      onChange={(e) => { setText(e.target.value); notifyTyping(); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder={uploading ? "Uploading…" : "Message…"}
                      style={{ flex: 1, height: 42, borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", padding: "0 14px", fontSize: 14, outline: "none" }}
                    />
                    <button onClick={send} disabled={sending || !text.trim()} style={{ width: 46, height: 42, borderRadius: 12, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", cursor: sending || !text.trim() ? "default" : "pointer", opacity: sending || !text.trim() ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Send size={17} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
    </div>
  );

  if (embedded) return body;

  return (
    <div style={{ minHeight: "calc(100vh - 76px)", padding: "32px 24px 40px", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)", gap: 24 }}>
        {!isNarrow && <AppSideNav />}
        <main>{body}</main>
      </div>
    </div>
  );
}

function Row({ person, active, onClick, subtitle, unread }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", border: "none", borderBottom: "1px solid var(--card-border)", background: active ? "var(--accent-soft)" : "transparent", cursor: "pointer", textAlign: "left" }}>
      <Avatar person={person} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</p>
        <p style={{ margin: "1px 0 0", fontSize: 12, color: unread ? "var(--text-primary)" : "var(--text-muted)", fontWeight: unread ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>
      </div>
      {unread > 0 ? (
        <span style={{ flexShrink: 0, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>
      ) : null}
    </button>
  );
}

function RoomInvite({ mine, text, onJoin }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid var(--card-border)", background: mine ? "rgba(124,58,237,0.12)" : "var(--card-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
        <Video size={14} /> Room invite
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-primary)" }}>{text}</p>
      <button onClick={onJoin} style={{ height: 32, padding: "0 14px", borderRadius: 9, border: "none", background: "var(--accent-gradient, #7c3aed)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
        Join room →
      </button>
    </div>
  );
}
