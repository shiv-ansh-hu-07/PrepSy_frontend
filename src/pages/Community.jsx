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
    applicationLink: "",
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

        const selectedStillExists = nextPosts.some(
          (post) => post.id === selectedPostId
        );
        setSelectedPostId(
          selectedStillExists ? selectedPostId : nextPosts[0]?.id || ""
        );
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
        applicationLink: createForm.applicationLink,
        tags: parseTags(createForm.tags),
      });

      const newPost = response.data.post;
      setPosts((prev) => [newPost, ...prev.filter((post) => post.id !== newPost.id)]);
      setCreateForm({ title: "", content: "", applicationLink: "", tags: "" });
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
      const response = await api.post(
        `/community/posts/${selectedPostId}/replies`,
        {
          content: replyDraft,
        }
      );

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
          "radial-gradient(ellipse at top, #eef1fb 0%, #f3f5fc 45%, #f8f9fe 75%)",
      }}
    >
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: isNarrow ? "24px 16px 48px" : "32px 24px 56px",
        }}
      >
        <section
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1.7fr 1fr",
            gap: "18px",
            marginBottom: "20px",
          }}
        >
          <div style={heroCardStyle}>
            <p style={eyebrowStyle}>PrepSy Community</p>
            <h1
              style={{
                margin: "8px 0 10px",
                fontFamily: "Georgia, serif",
                fontSize: isNarrow ? "30px" : "36px",
                lineHeight: 1.15,
                color: "#4a5a85",
              }}
            >
              Ask doubts, share wins, and learn together.
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "720px",
                color: "#6b78a0",
                lineHeight: 1.65,
                fontSize: "15px",
              }}
            >
              A discussion space for coding help, study strategy, exam prep,
              resources, accountability, and community updates.
            </p>
          </div>

          <div style={sideCardStyle}>
            <p style={eyebrowStyle}>Quick filters</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setActiveSearch(searchText);
              }}
              style={{ display: "grid", gap: "10px" }}
            >
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by title or content"
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
                    Clear
                  </button>
                )}
              </div>
            </form>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "10px",
                marginTop: "14px",
              }}
            >
              <MiniStat label="Posts" value={String(posts.length)} />
              <MiniStat
                label="Replies"
                value={String(
                  posts.reduce((sum, post) => sum + (post.replyCount || 0), 0)
                )}
              />
              <MiniStat label="Tags" value={String(allVisibleTags.length)} />
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "300px minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <aside style={{ display: "grid", gap: "16px" }}>
            <div style={sideCardStyle}>
              <div style={{ marginBottom: "14px" }}>
                <p style={eyebrowStyle}>Popular tags</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {allVisibleTags.length === 0 ? (
                    <span style={mutedTextStyle}>No tags yet.</span>
                  ) : (
                    allVisibleTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setActiveTag((current) => (current === tag ? "" : tag))
                        }
                        style={{
                          ...tagButtonStyle,
                          backgroundColor:
                            activeTag === tag ? "#8a9bd6" : "#eef2ff",
                          color: activeTag === tag ? "#ffffff" : "#5f6fa3",
                        }}
                      >
                        #{tag}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div style={sideCardStyle}>
              <p style={eyebrowStyle}>Live feed</p>
              <h2
                style={{
                  margin: "4px 0 14px",
                  fontSize: "24px",
                  color: "#4a5a85",
                }}
              >
                Recent posts
              </h2>

              {listLoading ? (
                <p style={mutedTextStyle}>Loading discussions...</p>
              ) : listError ? (
                <p style={errorTextStyle}>{listError}</p>
              ) : posts.length === 0 ? (
                <p style={mutedTextStyle}>
                  No posts yet for this filter. Start the first conversation.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    border: "1px solid rgba(190,200,235,0.45)",
                    borderRadius: "18px",
                    overflow: "hidden",
                    background: "rgba(244,247,255,0.58)",
                  }}
                >
                  {posts.map((post) => {
                    const selected = post.id === selectedPostId;

                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => setSelectedPostId(post.id)}
                        style={{
                          position: "relative",
                          width: "100%",
                          textAlign: "left",
                          border: "none",
                          borderBottom:
                            posts[posts.length - 1]?.id === post.id
                              ? "none"
                              : "1px solid rgba(190,200,235,0.45)",
                          padding: "14px 16px 14px 18px",
                          background: selected
                            ? "rgba(138, 155, 214, 0.14)"
                            : "transparent",
                          cursor: "pointer",
                          boxSizing: "border-box",
                          overflow: "hidden",
                        }}
                      >
                        {selected ? (
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              top: "14%",
                              height: "72%",
                              width: "4px",
                              borderRadius: "4px",
                              backgroundColor: "#8a9bd6",
                            }}
                          />
                        ) : null}

                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <strong
                            style={{
                              flex: 1,
                              color: selected ? "#3f4f7a" : "#4a5a85",
                              fontSize: "15px",
                              lineHeight: 1.45,
                              minWidth: 0,
                            }}
                          >
                            {post.title}
                          </strong>
                          <span
                            style={{
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: "24px",
                              height: "24px",
                              padding: "0 6px",
                              borderRadius: "999px",
                              background: selected
                                ? "rgba(138,155,214,0.22)"
                                : "#eef2ff",
                              color: "#5f6fa3",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            {post.replyCount}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                            flexWrap: "nowrap",
                          }}
                        >
                          <div
                            style={{
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "12px",
                                color: "#7a89b8",
                                lineHeight: 1.5,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {post.author?.name}
                            </p>
                            <span
                              style={{
                                color: "#b1bbde",
                                fontSize: "12px",
                                flexShrink: 0,
                              }}
                            >
                              |
                            </span>
                          </div>
                          <p
                              style={{
                                margin: 0,
                                fontSize: "12px",
                                color: "#7a89b8",
                                lineHeight: 1.5,
                                textAlign: "right",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {formatDate(post.createdAt)}
                            </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <main style={{ display: "grid", gap: "16px" }}>
            <div style={{ ...mainCardStyle, padding: isNarrow ? "20px" : "22px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "14px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p style={eyebrowStyle}>Start a thread</p>
                  <h2
                    style={{
                      margin: "4px 0 0",
                      fontSize: "24px",
                      color: "#4a5a85",
                    }}
                  >
                    New post
                  </h2>
                </div>

                {!user ? (
                  <Link to="/login" style={secondaryButtonStyle}>
                    Sign in to post
                  </Link>
                ) : null}
              </div>

              {!user ? (
                <p style={mutedTextStyle}>
                  Sign in to publish a question, insight, or resource for the
                  PrepSy community.
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
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: "108px",
                    }}
                  />
                  <input
                    value={createForm.tags}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, tags: event.target.value }))
                    }
                    placeholder="Tags, comma separated. Example: dsa, interview, jee"
                    style={inputStyle}
                  />
                  <input
                    value={createForm.applicationLink}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        applicationLink: event.target.value,
                      }))
                    }
                    placeholder="Optional application link. Paste the job or resource URL here"
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
                    <span style={{ fontSize: "12px", color: "#7a89b8" }}>
                      Keep the title clear and the body specific.
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
                ...mainCardStyle,
                padding: isNarrow ? "22px 20px" : "26px 28px",
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
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    {(selectedPost.tags || []).map((tag) => (
                      <button
                        key={`${selectedPost.id}-${tag}`}
                        type="button"
                        onClick={() => setActiveTag(tag)}
                        style={{
                          ...tagButtonStyle,
                          backgroundColor: "#eef2ff",
                          color: "#5f6fa3",
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  <h3
                    style={{
                      margin: "0 0 10px",
                      fontFamily: "Georgia, serif",
                      fontSize: isNarrow ? "28px" : "32px",
                      lineHeight: 1.2,
                      color: "#4a5a85",
                    }}
                  >
                    {selectedPost.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: "#4c5d8a",
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {selectedPost.content}
                  </p>

                  {selectedPost.applicationLink ? (
                    <div style={{ marginTop: "18px" }}>
                      <a
                        href={selectedPost.applicationLink}
                        target="_blank"
                        rel="noreferrer"
                        style={applyButtonStyle}
                      >
                        Click here to apply
                      </a>
                    </div>
                  ) : null}

                  <p
                    style={{
                      margin: "16px 0 0",
                      fontSize: "13px",
                      color: "#7a89b8",
                    }}
                  >
                    Posted by {selectedPost.author?.name} on{" "}
                    {formatDate(selectedPost.createdAt)}
                  </p>

                  <div
                    style={{
                      marginTop: "22px",
                      paddingTop: "20px",
                      borderTop: "1px solid rgba(190,200,235,0.5)",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 14px",
                        fontSize: "20px",
                        color: "#4a5a85",
                      }}
                    >
                      Replies ({selectedPost.replies?.length || 0})
                    </h4>

                    {selectedPost.replies?.length ? (
                      <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
                        {selectedPost.replies.map((reply) => (
                          <article
                            key={reply.id}
                            style={{
                              borderRadius: "18px",
                              background: "rgba(244,247,255,0.85)",
                              border: "1px solid rgba(190,200,235,0.55)",
                              padding: "14px 16px",
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
                              <strong style={{ color: "#4a5a85" }}>
                                {reply.author?.name}
                              </strong>
                              <span style={{ fontSize: "12px", color: "#7a89b8" }}>
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <p
                              style={{
                                margin: 0,
                                color: "#4c5d8a",
                                lineHeight: 1.7,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
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
                          rows={3}
                          style={{
                            ...inputStyle,
                            resize: "vertical",
                            minHeight: "92px",
                          }}
                        />
                        {replyError ? <p style={errorTextStyle}>{replyError}</p> : null}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
          </main>
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        borderRadius: "16px",
        background: "rgba(138,155,214,0.12)",
        border: "1px solid rgba(138,155,214,0.18)",
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <p style={{ margin: 0, fontSize: "11px", color: "#7a89b8" }}>{label}</p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: "20px",
          fontWeight: 600,
          color: "#4a5a85",
        }}
      >
        {value}
      </p>
    </div>
  );
}

const heroCardStyle = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "26px",
  padding: "24px 26px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
};

const sideCardStyle = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
};

const mainCardStyle = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "24px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
};

const eyebrowStyle = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 600,
  color: "#6b78a0",
};

const inputStyle = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(190,200,235,0.7)",
  background: "#ffffff",
  color: "#4c5d8a",
  padding: "13px 14px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: "999px",
  padding: "10px 18px",
  background: "#8a9bd6",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  boxShadow: "0 6px 20px rgba(138,155,214,0.34)",
};

const secondaryButtonStyle = {
  border: "1px solid rgba(190,200,235,0.8)",
  borderRadius: "999px",
  padding: "10px 16px",
  background: "#eef2ff",
  color: "#5f6fa3",
  fontSize: "14px",
  cursor: "pointer",
  textDecoration: "none",
};

const applyButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 18px",
  borderRadius: "999px",
  background: "#8a9bd6",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 600,
  boxShadow: "0 6px 20px rgba(138,155,214,0.28)",
};

const tagButtonStyle = {
  border: "none",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "12px",
  cursor: "pointer",
};

const mutedTextStyle = {
  margin: 0,
  color: "#6b78a0",
  lineHeight: 1.6,
};

const errorTextStyle = {
  margin: 0,
  color: "#b44b3c",
  lineHeight: 1.6,
};
