import React, { useEffect, useState } from "react";
import { useWindowWidth } from "../hooks/useBreakpoint";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Users, MessageSquare } from "lucide-react";
import AppSideNav from "../components/AppSideNav";
import Discover from "./Discover";
import Friends from "./Friends";
import Messages from "./Messages";

const TABS = [
  { id: "discover", label: "Find people", icon: Sparkles },
  { id: "friends", label: "Friends", icon: Users },
  { id: "messages", label: "Messages", icon: MessageSquare },
];

export default function People() {
  const [params, setParams] = useSearchParams();
  const w = useWindowWidth();
  const isNarrow = w < 1024;

  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "discover";
  const chat = params.get("chat") || null;
  // Messages needs the whole width for the chat — drop the side nav on that tab.
  const hideSideNav = tab === "messages";
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Load initial unread count and refresh occasionally for the Messages badge.
    let cancelled = false;
    const load = () =>
      import("../services/api").then(({ default: api }) =>
        api.get("/friends/counts")
          .then((res) => { if (!cancelled) setUnread(res.data?.unreadMessages || 0); })
          .catch(() => {}),
      );
    load();
    const id = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tab]);

  const goTab = (id) => setParams(id === "discover" ? {} : { tab: id }, { replace: false });
  const openChat = (userId) => setParams({ tab: "messages", ...(userId ? { chat: userId } : {}) });

  return (
    <div style={{ minHeight: "calc(100vh - 76px)", padding: "32px 24px 48px", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: isNarrow || hideSideNav ? "1fr" : "288px minmax(0, 1fr)", gap: 24 }}>
        {!isNarrow && !hideSideNav && <AppSideNav />}

        <main style={{ minWidth: 0 }}>
          <h1 style={{ margin: "0 0 16px", fontFamily: "Georgia, serif", fontSize: 30, color: "var(--text-primary)" }}>Find your people</h1>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 22, borderBottom: "1px solid var(--card-border)", overflowX: "auto" }}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => goTab(t.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px",
                    border: "none", background: "transparent", cursor: "pointer", whiteSpace: "nowrap",
                    fontSize: 14, fontWeight: active ? 800 : 600,
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                    marginBottom: -1,
                  }}
                >
                  <Icon size={16} /> {t.label}
                  {t.id === "messages" && unread > 0 ? (
                    <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {tab === "discover" && <Discover embedded onMessage={openChat} />}
          {tab === "friends" && <Friends embedded onMessage={openChat} />}
          {tab === "messages" && <Messages embedded activeId={chat} onSelectChat={openChat} />}
        </main>
      </div>
    </div>
  );
}
