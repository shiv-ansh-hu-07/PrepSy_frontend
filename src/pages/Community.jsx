import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const pageBg = {
  minHeight: "calc(100vh - 76px)",
  background:
    "radial-gradient(ellipse at top, var(--accent-soft) 0%, var(--card-bg) 45%, var(--card-bg) 75%)",
};

const card = {
  background: "var(--card-bg)",
  border: "1px solid rgba(255,255,255,0.5)",
  borderRadius: "24px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
  backdropFilter: "blur(10px)",
};

const input = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(190,200,235,0.75)",
  background: "var(--card-bg)",
  color: "#4c5d8a",
  padding: "13px 14px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtn = {
  border: "none",
  borderRadius: "999px",
  padding: "11px 18px",
  background: "var(--accent)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  boxShadow: "0 6px 20px rgba(138,155,214,0.34)",
};

const secondaryBtn = {
  border: "1px solid rgba(190,200,235,0.8)",
  borderRadius: "999px",
  padding: "10px 14px",
  background: "var(--accent-soft)",
  color: "var(--text-secondary)",
  fontSize: "13px",
  cursor: "pointer",
  textDecoration: "none",
};

const dangerBtn = {
  border: "1px solid rgba(225,160,160,0.65)",
  borderRadius: "999px",
  padding: "10px 14px",
  background: "#fff5f5",
  color: "#bb5c5c",
  fontSize: "13px",
  cursor: "pointer",
};

function emptyForm() {
  return { title: "", content: "", applicationLink: "", tags: "" };
}

function parseTags(value) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase().replace(/^#+/, ""))
        .filter(Boolean)
        .slice(0, 5)
    )
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value || "");
}

export default function Community() {
  const { user } = useAuth();
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1040 : false
  );
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState("");
  const [listError, setListError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingPostId, setEditingPostId] = useState("");
  const [postForm, setPostForm] = useState(emptyForm());
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsNarrow(window.innerWidth < 1040);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
        const res = await api.get("/community/posts", { params });
        if (cancelled) return;
        const nextPosts = res.data.posts || [];
        setPosts(nextPosts);
        setSelectedPostId((current) =>
          nextPosts.some((post) => post.id === current) ? current : nextPosts[0]?.id || ""
        );
      } catch (error) {
        if (!cancelled) {
          setPosts([]);
          setSelectedPostId("");
          setListError(error?.response?.data?.message || "Unable to load posts.");
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }
    loadPosts();
    return () => {
      cancelled = true;
    };
  }, [activeSearch, activeTag]);

  useEffect(() => {
    if (!user) {
      setMyPosts([]);
      return;
    }
    let cancelled = false;
    async function loadMine() {
      setMyPostsLoading(true);
      try {
        const res = await api.get("/community/posts/mine");
        if (!cancelled) setMyPosts(res.data.posts || []);
      } catch {
        if (!cancelled) setMyPosts([]);
      } finally {
        if (!cancelled) setMyPostsLoading(false);
      }
    }
    loadMine();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
        const res = await api.get(`/community/posts/${selectedPostId}`);
        if (!cancelled) setSelectedPost(res.data.post);
      } catch (error) {
        if (!cancelled) {
          setSelectedPost(null);
          setReplyError(error?.response?.data?.message || "Unable to load post.");
        }
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    }
    loadThread();
    return () => {
      cancelled = true;
    };
  }, [selectedPostId]);

  const visibleTags = useMemo(
    () =>
      Array.from(
        new Set(posts.flatMap((post) => post.tags || []).filter((tag) => !looksLikeUrl(tag)))
      ).slice(0, 10),
    [posts]
  );

  function openCreateModal() {
    setModalMode("create");
    setEditingPostId("");
    setPostForm(emptyForm());
    setModalError("");
    setModalOpen(true);
  }

  function openEditModal(post) {
    setModalMode("edit");
    setEditingPostId(post.id);
    setPostForm({
      title: post.title || "",
      content: post.content || "",
      applicationLink: post.applicationLink || "",
      tags: (post.tags || []).join(", "),
    });
    setModalError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (modalLoading) return;
    setModalOpen(false);
    setModalError("");
    setEditingPostId("");
    setPostForm(emptyForm());
  }

  function syncSavedPost(post) {
    setPosts((prev) => {
      const exists = prev.some((item) => item.id === post.id);
      return exists ? prev.map((item) => (item.id === post.id ? post : item)) : [post, ...prev];
    });
    setMyPosts((prev) => {
      const exists = prev.some((item) => item.id === post.id);
      return exists ? prev.map((item) => (item.id === post.id ? post : item)) : [post, ...prev];
    });
    setSelectedPostId(post.id);
  }

  async function handleSubmitPost(event) {
    event.preventDefault();
    setModalError("");
    setModalLoading(true);
    try {
      const payload = {
        title: postForm.title,
        content: postForm.content,
        applicationLink: postForm.applicationLink,
        tags: parseTags(postForm.tags),
      };
      const res =
        modalMode === "edit"
          ? await api.patch(`/community/posts/${editingPostId}`, payload)
          : await api.post("/community/posts", payload);
      syncSavedPost(res.data.post);
      closeModal();
    } catch (error) {
      setModalError(
        error?.response?.data?.message ||
          `Unable to ${modalMode === "edit" ? "update" : "publish"} post.`
      );
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDeletePost(postId) {
    const ok = window.confirm("Delete this post and all its replies?");
    if (!ok) return;
    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setMyPosts((prev) => prev.filter((post) => post.id !== postId));
      if (selectedPostId === postId) {
        setSelectedPostId("");
        setSelectedPost(null);
      }
    } catch (error) {
      window.alert(error?.response?.data?.message || "Unable to delete post.");
    }
  }

  async function handleReplySubmit(event) {
    event.preventDefault();
    if (!selectedPostId) return;
    setReplyError("");
    setReplyLoading(true);
    try {
      const res = await api.post(`/community/posts/${selectedPostId}/replies`, {
        content: replyDraft,
      });
      const reply = res.data.reply;
      setReplyDraft("");
      setSelectedPost((prev) =>
        prev
          ? { ...prev, replies: [...(prev.replies || []), reply], replyCount: (prev.replyCount || 0) + 1 }
          : prev
      );
      const bump = (items) =>
        items.map((item) =>
          item.id === selectedPostId ? { ...item, replyCount: (item.replyCount || 0) + 1 } : item
        );
      setPosts(bump);
      setMyPosts(bump);
    } catch (error) {
      setReplyError(error?.response?.data?.message || "Unable to add reply.");
    } finally {
      setReplyLoading(false);
    }
  }

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: isNarrow ? "24px 16px 48px" : "32px 24px 56px" }}>
        <section
          style={{
            ...card,
            padding: isNarrow ? "22px 20px" : "26px 28px",
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div style={{ maxWidth: "760px" }}>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
              PrepSy Community
            </p>
            <h1 style={{ margin: "8px 0 10px", fontFamily: "Georgia, serif", fontSize: isNarrow ? "30px" : "38px", lineHeight: 1.12, color: "var(--text-secondary)" }}>
              Discuss, share opportunities, and help each other grow.
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.65, fontSize: "15px" }}>
              Browse posts, open opportunities, ask questions, and manage your own posts from one place.
            </p>
          </div>

          <div style={{ display: "grid", gap: "10px", minWidth: isNarrow ? "100%" : "280px" }}>
            {user ? (
              <button type="button" onClick={openCreateModal} style={primaryBtn}>
                Create a post
              </button>
            ) : (
              <Link to="/login" style={primaryBtn}>
                Sign in to post
              </Link>
            )}
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search posts"
              style={input}
            />
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setActiveSearch(searchText)} style={secondaryBtn}>
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
                  style={secondaryBtn}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "340px minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <aside style={{ display: "grid", gap: "16px" }}>
            <div style={{ ...card, padding: "20px" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Popular tags</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                {visibleTags.length === 0 ? (
                  <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No tags yet.</span>
                ) : (
                  visibleTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag((current) => (current === tag ? "" : tag))}
                      style={{
                        ...secondaryBtn,
                        padding: "7px 12px",
                        background: activeTag === tag ? "var(--accent)" : "var(--accent-soft)",
                        color: activeTag === tag ? "#fff" : "var(--text-secondary)",
                        border: "none",
                      }}
                    >
                      #{tag}
                    </button>
                  ))
                )}
              </div>
            </div>

            {user ? (
              <div style={{ ...card, padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Your posts</p>
                    <h2 style={{ margin: "4px 0 0", fontSize: "24px", color: "var(--text-secondary)" }}>Manage posts</h2>
                  </div>
                  <button type="button" onClick={openCreateModal} style={{ ...secondaryBtn, fontWeight: 600 }}>
                    New
                  </button>
                </div>

                {myPostsLoading ? (
                  <p style={{ margin: 0, color: "var(--text-secondary)" }}>Loading your posts...</p>
                ) : myPosts.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--text-secondary)" }}>Your created posts will appear here.</p>
                ) : (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {myPosts.map((post) => (
                      <div key={post.id} style={{ border: "1px solid var(--card-border)", borderRadius: "16px", padding: "14px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPostId(post.id)}
                          style={{ border: "none", background: "transparent", padding: 0, color: "var(--text-secondary)", fontSize: "15px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}
                        >
                          {post.title}
                        </button>
                        <p style={{ margin: "6px 0 10px", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {formatDate(post.createdAt)}
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button type="button" onClick={() => openEditModal(post)} style={secondaryBtn}>
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDeletePost(post.id)} style={dangerBtn}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ ...card, padding: "20px" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Community feed</p>
              <h2 style={{ margin: "4px 0 12px", fontSize: "24px", color: "var(--text-secondary)" }}>All posts</h2>

              {listLoading ? (
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>Loading discussions...</p>
              ) : listError ? (
                <p style={{ margin: 0, color: "#b44b3c" }}>{listError}</p>
              ) : posts.length === 0 ? (
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>No posts found.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {posts.map((post) => {
                    const selected = post.id === selectedPostId;
                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => setSelectedPostId(post.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: `1px solid ${selected ? "rgba(138,155,214,0.36)" : "var(--card-border)"}`,
                          background: selected ? "rgba(138,155,214,0.14)" : "var(--card-bg)",
                          borderRadius: "18px",
                          padding: "16px",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ display: "block", color: "var(--text-secondary)", fontSize: "16px", lineHeight: 1.4 }}>
                              {post.title}
                            </strong>
                            <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: "12px" }}>
                              {post.author?.name} | {formatDate(post.createdAt)}
                            </p>
                          </div>
                          <span style={{ minWidth: "28px", height: "28px", borderRadius: "999px", background: "var(--accent-soft)", color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
                            {post.replyCount}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                          {(post.tags || [])
                            .filter((tag) => !looksLikeUrl(tag))
                            .map((tag) => (
                              <span key={`${post.id}-${tag}`} style={{ background: "var(--accent-soft)", color: "var(--text-secondary)", borderRadius: "999px", padding: "5px 10px", fontSize: "12px" }}>
                                #{tag}
                              </span>
                            ))}
                          {post.applicationLink ? (
                            <a
                              href={post.applicationLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              style={{ ...primaryBtn, padding: "6px 12px", fontSize: "12px", boxShadow: "none" }}
                            >
                              Click here to apply
                            </a>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <main style={card}>
            <div style={{ padding: isNarrow ? "22px 20px" : "28px" }}>
              {threadLoading ? (
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>Loading post...</p>
              ) : replyError && !selectedPost ? (
                <p style={{ margin: 0, color: "#b44b3c" }}>{replyError}</p>
              ) : !selectedPost ? (
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>Select a post from the left to view it here.</p>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Selected post</p>
                      <h2 style={{ margin: "8px 0 12px", fontFamily: "Georgia, serif", fontSize: isNarrow ? "30px" : "40px", lineHeight: 1.14, color: "var(--text-secondary)" }}>
                        {selectedPost.title}
                      </h2>
                    </div>
                    {selectedPost.applicationLink ? (
                      <a href={selectedPost.applicationLink} target="_blank" rel="noreferrer" style={primaryBtn}>
                        Click here to apply
                      </a>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                    {(selectedPost.tags || [])
                      .filter((tag) => !looksLikeUrl(tag))
                      .map((tag) => (
                        <button
                          key={`${selectedPost.id}-${tag}`}
                          type="button"
                          onClick={() => setActiveTag(tag)}
                          style={{ ...secondaryBtn, padding: "7px 12px", border: "none" }}
                        >
                          #{tag}
                        </button>
                      ))}
                  </div>

                  <p style={{ margin: 0, color: "#4c5d8a", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {selectedPost.content}
                  </p>

                  <p style={{ margin: "16px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
                    Posted by {selectedPost.author?.name} on {formatDate(selectedPost.createdAt)}
                  </p>

                  <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(190,200,235,0.55)" }}>
                    <h3 style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: "20px" }}>
                      Replies ({selectedPost.replies?.length || 0})
                    </h3>

                    {selectedPost.replies?.length ? (
                      <div style={{ display: "grid", gap: "12px", marginBottom: "18px" }}>
                        {selectedPost.replies.map((reply) => (
                          <article key={reply.id} style={{ borderRadius: "18px", background: "var(--card-bg)", border: "1px solid rgba(190,200,235,0.55)", padding: "14px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
                              <strong style={{ color: "var(--text-secondary)" }}>{reply.author?.name}</strong>
                              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{formatDate(reply.createdAt)}</span>
                            </div>
                            <p style={{ margin: 0, color: "#4c5d8a", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {reply.content}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>No replies yet. Be the first person to respond.</p>
                    )}

                    {!user ? (
                      <p style={{ margin: 0, color: "var(--text-secondary)" }}>Sign in to reply to this post.</p>
                    ) : (
                      <form onSubmit={handleReplySubmit} style={{ display: "grid", gap: "12px" }}>
                        <textarea
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          placeholder="Add a thoughtful reply"
                          rows={4}
                          style={{ ...input, resize: "vertical", minHeight: "110px" }}
                        />
                        {replyError ? <p style={{ margin: 0, color: "#b44b3c" }}>{replyError}</p> : null}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            type="submit"
                            disabled={replyLoading}
                            style={{ ...primaryBtn, opacity: replyLoading ? 0.7 : 1, cursor: replyLoading ? "wait" : "pointer" }}
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

      {modalOpen ? (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(42,55,98,0.36)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 70,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              background: "var(--card-bg)",
              borderRadius: "28px",
              padding: "24px",
              boxShadow: "0 24px 64px rgba(42,55,98,0.18)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {modalMode === "edit" ? "Edit your post" : "Create a post"}
                </p>
                <h2 style={{ margin: "6px 0 0", fontSize: "28px", color: "var(--text-secondary)" }}>
                  {modalMode === "edit" ? "Update post" : "New post"}
                </h2>
              </div>
              <button type="button" onClick={closeModal} style={secondaryBtn}>
                Close
              </button>
            </div>

            <form onSubmit={handleSubmitPost} style={{ display: "grid", gap: "14px" }}>
              <Field label="Title">
                <input
                  value={postForm.title}
                  onChange={(event) => setPostForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Write the post title"
                  style={input}
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={postForm.content}
                  onChange={(event) => setPostForm((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Describe the post clearly"
                  rows={6}
                  style={{ ...input, resize: "vertical", minHeight: "160px" }}
                />
              </Field>

              <Field label="Application link">
                <input
                  value={postForm.applicationLink}
                  onChange={(event) =>
                    setPostForm((prev) => ({ ...prev, applicationLink: event.target.value }))
                  }
                  placeholder="Paste only the link here"
                  style={input}
                />
              </Field>

              <Field label="Tags">
                <input
                  value={postForm.tags}
                  onChange={(event) => setPostForm((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="Add tags like jobs, dsa, interview"
                  style={input}
                />
              </Field>

              {modalError ? <p style={{ margin: 0, color: "#b44b3c" }}>{modalError}</p> : null}

              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Other users will see the pasted link as a button.
                </span>
                <button
                  type="submit"
                  disabled={modalLoading}
                  style={{ ...primaryBtn, opacity: modalLoading ? 0.7 : 1, cursor: modalLoading ? "wait" : "pointer" }}
                >
                  {modalLoading
                    ? modalMode === "edit"
                      ? "Saving..."
                      : "Publishing..."
                    : modalMode === "edit"
                      ? "Save changes"
                      : "Publish post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}
