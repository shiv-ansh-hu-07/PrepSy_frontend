import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseTags(value) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5)
    )
  );
}

export default function Community() {
  const { user } = useAuth();
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [createError, setCreateError] = useState("");
  const [replyError, setReplyError] = useState("");
  const [createForm, setCreateForm] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [replyDraft, setReplyDraft] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setIsNarrow(window.innerWidth < 980);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setListLoading(true);
      setListError("");

      try {
        const params = {};
        if (activeSearch.trim()) params.search = activeSearch.trim();
        if (activeTag) params.tag = activeTag;

        const response = await api.get("/community/posts", { params });
        if (cancelled) return;

        const nextPosts = response.data.posts || [];
        setPosts(nextPosts);

        const selectedStillExists = nextPosts.some((post) => post.id === selectedPostId);
        const nextSelectedId = selectedStillExists
          ? selectedPostId
          : nextPosts[0]?.id || "";

        setSelectedPostId(nextSelectedId);
      } catch (error) {
        if (!cancelled) {
          setListError(
            error?.response?.data?.message || "Unable to load community posts."
          );
          setPosts([]);
          setSelectedPostId("");
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, [activeSearch, activeTag, selectedPostId]);

  useEffect(() => {
    if (!selectedPostId) {
      setSelectedPost(null);
      return;
    }

    let cancelled = false;

    async function loadThread() {
      setThreadLoading(true);
      setReplyError("");

      try {
        const response = await api.get(`/community/posts/${selectedPostId}`);
        if (!cancelled) {
          setSelectedPost(response.data.post);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedPost(null);
          setReplyError(
            error?.response?.data?.message || "Unable to load this discussion."
          );
        }
      } finally {
        if (!cancelled) {
          setThreadLoading(false);
        }
      }
    }

    loadThread();

    return () => {
      cancelled = true;
    };
  }, [selectedPostId]);

  const allVisibleTags = Array.from(
    new Set(posts.flatMap((post) => post.tags || []))
  ).slice(0, 10);

  async function handleCreatePost(event) {
    event.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const response = await api.post("/community/posts", {
        title: createForm.title,
        content: createForm.content,
        tags: parseTags(createForm.tags),
      });

      const newPost = response.data.post;
      setPosts((prev) => [newPost, ...prev.filter((post) => post.id !== newPost.id)]);
      setCreateForm({ title: "", content: "", tags: "" });
      setSelectedPostId(newPost.id);
    } catch (error) {
      setCreateError(
        error?.response?.data?.message || "Unable to publish your post."
      );
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleReplySubmit(event) {
    event.preventDefault();
    if (!selectedPostId) return;

    setReplyError("");
    setReplyLoading(true);

    try {
      const response = await api.post(`/community/posts/${selectedPostId}/replies`, {
        content: replyDraft,
      });

      const newReply = response.data.reply;
      setReplyDraft("");
      setSelectedPost((prev) =>
        prev
          ? {
              ...prev,
              replyCount: (prev.replyCount || 0) + 1,
              replies: [...(prev.replies || []), newReply],
            }
          : prev
      );
      setPosts((prev) =>
        prev.map((post) =>
          post.id === selectedPostId
            ? { ...post, replyCount: (post.replyCount || 0) + 1 }
            : post
        )
      );
    } catch (error) {
      setReplyError(
        error?.response?.data?.message || "Unable to add your reply."
      );
    } finally {
      setReplyLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 76px)",
        background:
          "radial-gradient(circle at top left, rgba(249, 214, 168, 0.38), transparent 28%), linear-gradient(180deg, #fbf7f1 0%, #f5efe7 48%, #f7f3ec 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "40px 20px 56px",
        }}
      >
        <section
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1.2fr 0.8fr",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #203245 0%, #324b63 100%)",
              color: "#fff7ec",
              borderRadius: "28px",
              padding: "32px",
              boxShadow: "0 24px 48px rgba(50, 75, 99, 0.22)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255, 247, 236, 0.72)",
              }}
            >
              Community
            </p>
            <h1
              style={{
                margin: "14px 0 12px",
                fontFamily: "Georgia, serif",
                fontSize: "38px",
                lineHeight: 1.1,
              }}
            >
              Ask, share, debate, and help each other learn in public.
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "680px",
                color: "rgba(255, 247, 236, 0.82)",
                lineHeight: 1.7,
                fontSize: "15px",
              }}
            >
              This is your discuss space for study tactics, coding questions,
              exam prep, resources, accountability, and anything the community
              can help move forward.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255, 251, 245, 0.94)",
              border: "1px solid rgba(158, 129, 91, 0.16)",
              borderRadius: "28px",
              padding: "24px",
              boxShadow: "0 18px 36px rgba(134, 112, 85, 0.12)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                fontWeight: 600,
                color: "#7b5a36",
              }}
            >
              Jump in fast
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isNarrow
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              <QuickStat label="Threads" value={String(posts.length)} />
              <QuickStat
                label="Replies"
                value={String(posts.reduce((sum, post) => sum + (post.replyCount || 0), 0))}
              />
              <QuickStat label="Tags" value={String(allVisibleTags.length)} />
            </div>

            {!user ? (
              <div
                style={{
                  marginTop: "18px",
                  padding: "16px",
                  borderRadius: "20px",
                  background: "#fff4df",
                  color: "#7a5830",
                }}
              >
                <p style={{ margin: 0, lineHeight: 1.6, fontSize: "14px" }}>
                  Browse freely. Sign in when you want to start a thread or join
                  the conversation.
                </p>
                <Link
                  to="/login"
                  style={{
                    display: "inline-block",
                    marginTop: "12px",
                    padding: "10px 16px",
                    borderRadius: "999px",
                    background: "#c77b39",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Sign in to post
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "360px minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: "20px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.82)",
                border: "1px solid rgba(103, 81, 59, 0.12)",
                borderRadius: "26px",
                padding: "22px",
                boxShadow: "0 16px 32px rgba(103, 81, 59, 0.08)",
              }}
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setActiveSearch(searchText);
                }}
              >
                <label
                  htmlFor="community-search"
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#6f5437",
                    marginBottom: "10px",
                  }}
                >
                  Search discussions
                </label>
                <input
                  id="community-search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search by title or content"
                  style={inputStyle}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <button type="submit" style={primaryButtonStyle}>
                    Search
                  </button>
                  {(activeSearch || activeTag) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchText("");
                        setActiveSearch("");
                        setActiveTag("");
                      }}
                      style={secondaryButtonStyle}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </form>

              {allVisibleTags.length > 0 ? (
                <div style={{ marginTop: "16px" }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "12px",
                      color: "#8f7150",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Popular tags
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {allVisibleTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveTag((current) => (current === tag ? "" : tag))}
                        style={{
                          border: "none",
                          borderRadius: "999px",
                          padding: "7px 12px",
                          background: activeTag === tag ? "#324b63" : "#f3e6d6",
                          color: activeTag === tag ? "#fff" : "#7d5e3f",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(103, 81, 59, 0.12)",
                borderRadius: "26px",
                padding: "22px",
                boxShadow: "0 16px 32px rgba(103, 81, 59, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#8f7150" }}>
                    Live feed
                  </p>
                  <h2
                    style={{
                      margin: "4px 0 0",
                      fontSize: "22px",
                      color: "#2f3c49",
                    }}
                  >
                    Recent posts
                  </h2>
                </div>
              </div>

              {listLoading ? (
                <p style={mutedTextStyle}>Loading discussions...</p>
              ) : listError ? (
                <p style={errorTextStyle}>{listError}</p>
              ) : posts.length === 0 ? (
                <p style={mutedTextStyle}>
                  No posts yet for this filter. Start the first conversation.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {posts.map((post) => {
                    const selected = post.id === selectedPostId;

                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => setSelectedPostId(post.id)}
                        style={{
                          textAlign: "left",
                          border: selected
                            ? "1px solid rgba(50, 75, 99, 0.36)"
                            : "1px solid rgba(103, 81, 59, 0.12)",
                          borderRadius: "20px",
                          padding: "16px",
                          background: selected ? "#eef2f4" : "#fffaf5",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "flex-start",
                          }}
                        >
                          <strong
                            style={{
                              color: "#2f3c49",
                              fontSize: "15px",
                              lineHeight: 1.4,
                            }}
                          >
                            {post.title}
                          </strong>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#8f7150",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {post.replyCount} repl{post.replyCount === 1 ? "y" : "ies"}
                          </span>
                        </div>

                        <p
                          style={{
                            margin: "8px 0 10px",
                            color: "#6f6254",
                            lineHeight: 1.5,
                            fontSize: "14px",
                          }}
                        >
                          {post.content.slice(0, 120)}
                          {post.content.length > 120 ? "..." : ""}
                        </p>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(post.tags || []).map((tag) => (
                              <span key={`${post.id}-${tag}`} style={tagStyle}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <span style={{ fontSize: "12px", color: "#8f7150" }}>
                            {post.author?.name} · {formatDate(post.createdAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: "20px" }}>
            <div
              style={{
                background: "rgba(255,250,243,0.9)",
                border: "1px solid rgba(103, 81, 59, 0.12)",
                borderRadius: "28px",
                padding: "24px",
                boxShadow: "0 18px 36px rgba(103, 81, 59, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#8f7150" }}>
                    Start a thread
                  </p>
                  <h2
                    style={{
                      margin: "4px 0 0",
                      fontSize: "24px",
                      color: "#2f3c49",
                    }}
                  >
                    New post
                  </h2>
                </div>
              </div>

              {!user ? (
                <p style={mutedTextStyle}>
                  Sign in to publish a question, insight, or resource for the community.
                </p>
              ) : (
                <form onSubmit={handleCreatePost} style={{ display: "grid", gap: "12px" }}>
                  <input
                    value={createForm.title}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Title your discussion"
                    style={inputStyle}
                  />
                  <textarea
                    value={createForm.content}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, content: event.target.value }))
                    }
                    placeholder="What do you want to ask or share?"
                    rows={6}
                    style={{ ...inputStyle, resize: "vertical", minHeight: "140px" }}
                  />
                  <input
                    value={createForm.tags}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, tags: event.target.value }))
                    }
                    placeholder="Tags, comma separated. Example: dsa, interview, jee"
                    style={inputStyle}
                  />
                  {createError ? <p style={errorTextStyle}>{createError}</p> : null}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#8f7150" }}>
                      Clear titles and specific questions usually get better replies.
                    </span>
                    <button
                      type="submit"
                      disabled={createLoading}
                      style={{
                        ...primaryButtonStyle,
                        opacity: createLoading ? 0.7 : 1,
                        cursor: createLoading ? "wait" : "pointer",
                      }}
                    >
                      {createLoading ? "Publishing..." : "Publish post"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(103, 81, 59, 0.12)",
                borderRadius: "28px",
                padding: "24px",
                boxShadow: "0 18px 36px rgba(103, 81, 59, 0.08)",
              }}
            >
              {threadLoading ? (
                <p style={mutedTextStyle}>Loading discussion...</p>
              ) : replyError && !selectedPost ? (
                <p style={errorTextStyle}>{replyError}</p>
              ) : !selectedPost ? (
                <p style={mutedTextStyle}>
                  Pick a post from the left to read the full discussion.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      paddingBottom: "18px",
                      borderBottom: "1px solid rgba(103, 81, 59, 0.12)",
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {(selectedPost.tags || []).map((tag) => (
                        <button
                          key={`${selectedPost.id}-${tag}`}
                          type="button"
                          onClick={() => setActiveTag(tag)}
                          style={{ ...tagStyle, border: "none", cursor: "pointer" }}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                    <h3
                      style={{
                        margin: "14px 0 8px",
                        fontFamily: "Georgia, serif",
                        fontSize: "30px",
                        lineHeight: 1.2,
                        color: "#24313d",
                      }}
                    >
                      {selectedPost.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        color: "#5d5348",
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedPost.content}
                    </p>
                    <p
                      style={{
                        margin: "16px 0 0",
                        fontSize: "13px",
                        color: "#8f7150",
                      }}
                    >
                      Posted by {selectedPost.author?.name} on{" "}
                      {formatDate(selectedPost.createdAt)}
                    </p>
                  </div>

                  <div style={{ marginTop: "22px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "14px",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "20px",
                          color: "#2f3c49",
                        }}
                      >
                        Replies ({selectedPost.replies?.length || 0})
                      </h4>
                    </div>

                    {selectedPost.replies?.length ? (
                      <div style={{ display: "grid", gap: "12px", marginBottom: "18px" }}>
                        {selectedPost.replies.map((reply) => (
                          <article
                            key={reply.id}
                            style={{
                              padding: "16px",
                              borderRadius: "20px",
                              background: "#fff9f2",
                              border: "1px solid rgba(103, 81, 59, 0.12)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                                flexWrap: "wrap",
                                marginBottom: "8px",
                              }}
                            >
                              <strong style={{ color: "#324b63" }}>
                                {reply.author?.name}
                              </strong>
                              <span style={{ fontSize: "12px", color: "#8f7150" }}>
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <p
                              style={{
                                margin: 0,
                                color: "#5d5348",
                                lineHeight: 1.7,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {reply.content}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={mutedTextStyle}>
                        No replies yet. Be the first person to respond.
                      </p>
                    )}

                    {!user ? (
                      <p style={mutedTextStyle}>
                        Sign in to join this thread with a reply.
                      </p>
                    ) : (
                      <form onSubmit={handleReplySubmit} style={{ display: "grid", gap: "12px" }}>
                        <textarea
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          placeholder="Add a thoughtful reply"
                          rows={4}
                          style={{ ...inputStyle, resize: "vertical", minHeight: "110px" }}
                        />
                        {replyError ? <p style={errorTextStyle}>{replyError}</p> : null}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="submit"
                            disabled={replyLoading}
                            style={{
                              ...primaryButtonStyle,
                              opacity: replyLoading ? 0.7 : 1,
                              cursor: replyLoading ? "wait" : "pointer",
                            }}
                          >
                            {replyLoading ? "Posting..." : "Reply"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div
      style={{
        borderRadius: "20px",
        background: "rgba(255, 247, 236, 0.12)",
        border: "1px solid rgba(255, 247, 236, 0.18)",
        padding: "14px",
      }}
    >
      <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,247,236,0.7)" }}>
        {label}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: "26px", fontWeight: 700 }}>{value}</p>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(103, 81, 59, 0.16)",
  background: "#fffdf9",
  color: "#2f3c49",
  padding: "13px 14px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: "999px",
  padding: "11px 18px",
  background: "#c77b39",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid rgba(103, 81, 59, 0.16)",
  borderRadius: "999px",
  padding: "10px 16px",
  background: "#fffaf5",
  color: "#6f5437",
  fontSize: "14px",
  cursor: "pointer",
};

const tagStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  background: "#f3e6d6",
  color: "#7d5e3f",
  fontSize: "12px",
};

const mutedTextStyle = {
  margin: 0,
  color: "#6f6254",
  lineHeight: 1.6,
};

const errorTextStyle = {
  margin: 0,
  color: "#b44b3c",
  lineHeight: 1.6,
};
