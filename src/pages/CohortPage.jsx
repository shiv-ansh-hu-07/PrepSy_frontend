import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AppSideNav from "../components/AppSideNav";
import { Users, BookOpen, MessageSquare, Brain, Calendar, ChevronDown, ChevronUp, Link2 } from "lucide-react";

const PAGE_BG = "radial-gradient(ellipse at top, #eef1fb 0%, #f3f5fc 48%, #f8f9fe 100%)";

const DIFF = {
  beginner: { bg: "#e8f5e9", color: "#2e7d32" },
  intermediate: { bg: "#fff3e0", color: "#e65100" },
  advanced: { bg: "#fce4ec", color: "#c62828" },
};

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

const TABS = [
  { id: "roadmap", label: "Roadmap", icon: BookOpen },
  { id: "discussions", label: "Discussions", icon: MessageSquare },
  { id: "quiz", label: "Quiz", icon: Brain },
  { id: "sessions", label: "Sessions", icon: Calendar },
  { id: "members", label: "Members", icon: Users },
];

export default function CohortPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isMobile = w < 600;
  const isTablet = w < 900;

  const [cohort, setCohort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("roadmap");
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTime, setEditTime] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Discussions state
  const [discussions, setDiscussions] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [replyContent, setReplyContent] = useState({});
  const [replyOpen, setReplyOpen] = useState({});
  const [postingDiscussion, setPostingDiscussion] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState({});

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionTopic, setSessionTopic] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [addingSession, setAddingSession] = useState(false);

  // Quiz state
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [pastAttempts, setPastAttempts] = useState([]);

  const fetchCohort = useCallback(async () => {
    try {
      const { data } = await api.get(`/cohorts/${id}`);
      setCohort(data);
    } catch {
      setError("Cohort not found or access denied.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCohort();
  }, [fetchCohort]);

  // Lazy-load tab data
  useEffect(() => {
    if (!cohort?.isMember) return;
    if (activeTab === "discussions") {
      api.get(`/cohorts/${id}/discussions`).then(({ data }) => setDiscussions(data)).catch(() => {});
    } else if (activeTab === "sessions") {
      api.get(`/cohorts/${id}/sessions`).then(({ data }) => setSessions(data)).catch(() => {});
    } else if (activeTab === "quiz") {
      api.get(`/cohorts/${id}/quiz/attempts`).then(({ data }) => setPastAttempts(data)).catch(() => {});
    }
  }, [activeTab, id, cohort?.isMember]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.post(`/cohorts/${id}/join`);
      await fetchCohort();
      if (cohort?.roomId) navigate(`/room/${cohort.roomId}`);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to join cohort");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this cohort?")) return;
    setLeaving(true);
    try {
      await api.delete(`/cohorts/${id}/leave`);
      navigate("/cohorts");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to leave cohort");
      setLeaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this cohort for everyone? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/cohorts/${id}`);
      navigate("/cohorts");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete cohort");
      setDeleting(false);
    }
  };

  const openEdit = () => {
    setEditName(cohort?.name || "");
    setEditTime(cohort?.dailyTime || "");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      await api.patch(`/cohorts/${id}`, { name: editName.trim(), dailyTime: editTime });
      await fetchCohort();
      setEditing(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePostDiscussion = async (parentId) => {
    const content = parentId ? replyContent[parentId] : newPost;
    if (!content?.trim()) return;
    setPostingDiscussion(true);
    try {
      await api.post(`/cohorts/${id}/discussions`, { content: content.trim(), parentId: parentId || undefined });
      const { data } = await api.get(`/cohorts/${id}/discussions`);
      setDiscussions(data);
      if (parentId) {
        setReplyContent((prev) => ({ ...prev, [parentId]: "" }));
        setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
      } else {
        setNewPost("");
      }
    } catch {
      /* ignore */
    } finally {
      setPostingDiscussion(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    setQuiz(null);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    try {
      const { data } = await api.post(`/cohorts/${id}/quiz/generate`, { numQuestions: 5 });
      setQuiz(data.questions);
    } catch (err) {
      alert(err?.response?.data?.message || "Quiz generation failed");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    const answers = quiz.map((_, i) => selectedAnswers[i] || "");
    try {
      const { data } = await api.post(`/cohorts/${id}/quiz/attempt`, { questions: quiz, answers });
      setQuizScore({ score: data.score, total: quiz.length });
      setQuizSubmitted(true);
      api.get(`/cohorts/${id}/quiz/attempts`).then(({ data: a }) => setPastAttempts(a)).catch(() => {});
    } catch {
      /* ignore */
    }
  };

  const handleAddSession = async () => {
    if (!sessionTopic.trim() || !sessionDate) return;
    setAddingSession(true);
    try {
      await api.post(`/cohorts/${id}/sessions`, {
        topic: sessionTopic.trim(),
        scheduledAt: new Date(sessionDate).toISOString(),
      });
      const { data } = await api.get(`/cohorts/${id}/sessions`);
      setSessions(data);
      setSessionTopic("");
      setSessionDate("");
    } catch {
      /* ignore */
    } finally {
      setAddingSession(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 76px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#5f6fa3" }}>
        Loading cohort…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "calc(100vh - 76px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#c62828" }}>{error}</p>
          <button onClick={() => navigate("/learn")} style={{ marginTop: 12, ...btnPrimary(false) }}>
            ← Back to Learn
          </button>
        </div>
      </div>
    );
  }

  const plan = cohort?.playlist?.plan;
  const curriculum = plan?.curriculum || [];
  const roadmap = plan?.roadmap || [];
  const diffStyle = DIFF[plan?.difficulty] || DIFF.intermediate;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 76px)",
        background: PAGE_BG,
        padding: isMobile ? "20px 16px 48px" : isTablet ? "24px 20px 48px" : "32px 24px 56px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1360,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isTablet ? "1fr" : "288px minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {!isTablet && <AppSideNav />}

        <main style={{ minWidth: 0 }}>
          {/* Cohort Header */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontFamily: "Georgia, serif", color: "#2f3b63" }}>
                  {cohort.name}
                </h1>
                <p style={{ margin: "5px 0 0", fontSize: 13, color: "#6b78a0" }}>
                  {cohort.playlist?.title} · {cohort._count?.members} member{cohort._count?.members !== 1 ? "s" : ""}
                </p>
                {plan && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: diffStyle.bg, color: diffStyle.color }}>
                      {plan.difficulty}
                    </span>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#eef2ff", color: "#4f5fa8" }}>
                      ⏱ ~{plan.estimatedHours}h
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={handleCopyInvite}
                  style={{ ...btnPrimary(false), background: "rgba(138,155,214,0.16)", color: "#4f5fa8" }}
                  title="Copy invite link to share this cohort"
                >
                  <Link2 size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  {copied ? "Copied!" : "Invite"}
                </button>
                {!cohort.isMember && user && (
                  <button onClick={handleJoin} disabled={joining} style={btnPrimary(joining)}>
                    {joining ? "Joining…" : "Join Cohort"}
                  </button>
                )}
                {cohort.isMember && cohort.roomId && (
                  <button onClick={() => navigate(`/room/${cohort.roomId}`)} style={btnPrimary(false)}>
                    Enter Room →
                  </button>
                )}
                {cohort.createdById === user?.id && (
                  <button
                    onClick={openEdit}
                    style={{ ...btnPrimary(false), background: "rgba(138,155,214,0.16)", color: "#4f5fa8" }}
                  >
                    Edit
                  </button>
                )}
                {cohort.isMember && cohort.createdById !== user?.id && (
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    style={{ ...btnPrimary(leaving), background: leaving ? "#e5e7eb" : "#fee2e2", color: "#c62828" }}
                  >
                    {leaving ? "Leaving…" : "Leave"}
                  </button>
                )}
                {cohort.createdById === user?.id && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ ...btnPrimary(deleting), background: deleting ? "#e5e7eb" : "#fee2e2", color: "#c62828" }}
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Edit panel */}
          {editing && (
            <div style={{ ...card, marginBottom: 16 }}>
              <h3 style={sectionTitle}>Edit cohort</h3>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Cohort name"
                  style={{ flex: 1, height: 42, borderRadius: 10, border: "1.5px solid rgba(138,155,214,0.4)", background: "#fff", padding: "0 12px", fontSize: 14, color: "#2f3b63", outline: "none" }}
                />
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  title="Daily session time"
                  style={{ height: 42, borderRadius: 10, border: "1.5px solid rgba(138,155,214,0.4)", background: "#fff", padding: "0 12px", fontSize: 14, color: "#2f3b63", outline: "none" }}
                />
                <button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()} style={{ ...btnPrimary(savingEdit || !editName.trim()), height: 42 }}>
                  {savingEdit ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditing(false)} style={{ ...btnPrimary(false), height: 42, background: "rgba(138,155,214,0.16)", color: "#4f5fa8" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 12,
                    border: active ? "1px solid rgba(138,155,214,0.4)" : "1px solid transparent",
                    background: active ? "rgba(138,155,214,0.16)" : "rgba(255,255,255,0.5)",
                    color: active ? "#3f4f7a" : "#6b78a0",
                    fontWeight: active ? 700 : 600,
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab: Roadmap */}
          {activeTab === "roadmap" && (
            <div style={card}>
              {!plan ? (
                <p style={{ color: "#6b78a0", fontSize: 14 }}>No AI plan available for this cohort yet.</p>
              ) : (
                <>
                  <h3 style={sectionTitle}>🗓 Study Roadmap</h3>
                  {roadmap.map((week, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #8a9bd6, #6f7fc0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                          W{week.week}
                        </div>
                        {i < roadmap.length - 1 && <div style={{ flex: 1, width: 2, background: "rgba(138,155,214,0.2)", marginTop: 4, minHeight: 20 }} />}
                      </div>
                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: "#2f3b63", fontSize: 14 }}>{week.theme}</p>
                        <p style={{ margin: "4px 0 8px", fontSize: 12, color: "#6b78a0", lineHeight: 1.5 }}>{week.goal}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(week.topics || []).map((t, j) => (
                            <span key={j} style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(138,155,214,0.12)", color: "#4f5fa8" }}>{t}</span>
                          ))}
                          <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.12)", color: "#166534" }}>⏱ {week.studyHours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ borderTop: "1px solid rgba(190,200,235,0.4)", marginTop: 8, paddingTop: 20 }}>
                    <h3 style={sectionTitle}>📋 Curriculum Topics</h3>
                    {curriculum.map((topic, i) => (
                      <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(190,200,235,0.45)", marginBottom: 8, overflow: "hidden" }}>
                        <button
                          type="button"
                          onClick={() => setExpandedTopics((p) => ({ ...p, [i]: !p[i] }))}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: expandedTopics[i] ? "rgba(138,155,214,0.08)" : "rgba(248,249,255,0.7)", border: "none", cursor: "pointer", textAlign: "left" }}
                        >
                          <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#8a9bd6", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#2f3b63" }}>{topic.title}</span>
                          {expandedTopics[i] ? <ChevronUp size={14} color="#8a9bd6" /> : <ChevronDown size={14} color="#8a9bd6" />}
                        </button>
                        {expandedTopics[i] && (
                          <p style={{ margin: 0, padding: "10px 14px 12px 48px", fontSize: 13, color: "#5e6c92", lineHeight: 1.6, background: "rgba(248,249,255,0.5)", borderTop: "1px solid rgba(190,200,235,0.3)" }}>
                            {topic.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Discussions */}
          {activeTab === "discussions" && (
            <div style={card}>
              <h3 style={sectionTitle}>💬 Discussions</h3>
              {cohort.isMember ? (
                <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Share a thought, question, or resource…"
                    rows={3}
                    style={{ flex: 1, borderRadius: 12, border: "1.5px solid rgba(138,155,214,0.4)", background: "rgba(248,249,255,0.9)", padding: "10px 14px", fontSize: 14, color: "#2f3b63", outline: "none", resize: "vertical" }}
                  />
                  <button
                    onClick={() => handlePostDiscussion(null)}
                    disabled={postingDiscussion || !newPost.trim()}
                    style={{ ...btnPrimary(postingDiscussion || !newPost.trim()), alignSelf: "flex-end", height: 44 }}
                  >
                    Post
                  </button>
                </div>
              ) : (
                <p style={{ color: "#6b78a0", fontSize: 13, marginBottom: 16 }}>Join the cohort to participate in discussions.</p>
              )}

              {discussions.length === 0 ? (
                <p style={{ color: "#9aa3c0", fontSize: 14 }}>No posts yet. Be the first to start a discussion!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {discussions.map((post) => (
                    <div key={post.id} style={{ borderRadius: 14, border: "1px solid rgba(190,200,235,0.45)", overflow: "hidden" }}>
                      <div style={{ padding: "14px 16px", background: "rgba(248,249,255,0.7)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#8a9bd6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                            {(post.author?.name || "?")[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#2f3b63" }}>{post.author?.name || "Unknown"}</span>
                          <span style={{ fontSize: 11, color: "#9aa3c0", marginLeft: "auto" }}>
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: "#3f4f7a", lineHeight: 1.6 }}>{post.content}</p>

                        {cohort.isMember && (
                          <button
                            onClick={() => setReplyOpen((p) => ({ ...p, [post.id]: !p[post.id] }))}
                            style={{ marginTop: 10, background: "none", border: "none", color: "#8a9bd6", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            {replyOpen[post.id] ? "Cancel" : `↩ Reply`}
                          </button>
                        )}
                        {replyOpen[post.id] && (
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <input
                              value={replyContent[post.id] || ""}
                              onChange={(e) => setReplyContent((p) => ({ ...p, [post.id]: e.target.value }))}
                              placeholder="Write a reply…"
                              style={{ flex: 1, height: 38, borderRadius: 10, border: "1.5px solid rgba(138,155,214,0.4)", background: "#fff", padding: "0 12px", fontSize: 13, outline: "none" }}
                            />
                            <button
                              onClick={() => handlePostDiscussion(post.id)}
                              disabled={postingDiscussion}
                              style={{ ...btnPrimary(postingDiscussion), height: 38, padding: "0 16px" }}
                            >
                              Reply
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Nested replies */}
                      {(post.replies || []).length > 0 && (
                        <div style={{ borderTop: "1px solid rgba(190,200,235,0.35)", background: "rgba(242,245,255,0.5)" }}>
                          {post.replies.map((reply) => (
                            <div key={reply.id} style={{ padding: "10px 16px 10px 40px", borderBottom: "1px solid rgba(190,200,235,0.2)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#c7d0ed", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                                  {(reply.author?.name || "?")[0]?.toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 12, color: "#2f3b63" }}>{reply.author?.name}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: 13, color: "#5e6c92", lineHeight: 1.5 }}>{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Quiz */}
          {activeTab === "quiz" && (
            <div style={card}>
              <h3 style={sectionTitle}>🧠 Quiz</h3>
              {!cohort.isMember ? (
                <p style={{ color: "#6b78a0", fontSize: 14 }}>Join the cohort to access quizzes.</p>
              ) : !quiz && !quizLoading ? (
                <>
                  <p style={{ margin: "0 0 18px", fontSize: 14, color: "#5e6c92" }}>
                    Generate a 5-question AI quiz based on this playlist's curriculum.
                  </p>
                  <button onClick={handleGenerateQuiz} style={btnPrimary(false)}>
                    Generate Quiz
                  </button>
                  {pastAttempts.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#3f4f7a" }}>Past Attempts</h4>
                      {pastAttempts.map((a) => (
                        <div key={a.id} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(190,200,235,0.45)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: "#5e6c92" }}>{new Date(a.completedAt).toLocaleDateString()}</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: a.score / (a.questions?.length || 5) >= 0.6 ? "#2e7d32" : "#c62828" }}>
                            {a.score} / {a.questions?.length || 5}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : quizLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <p style={{ fontSize: 36, margin: "0 0 12px" }}>🤖</p>
                  <p style={{ color: "#6b78a0", fontSize: 14 }}>Generating quiz questions…</p>
                </div>
              ) : (
                <div>
                  {quizSubmitted && quizScore ? (
                    <div style={{ textAlign: "center", padding: "24px 0 8px", marginBottom: 24 }}>
                      <p style={{ fontSize: 40, margin: "0 0 8px" }}>{quizScore.score / quizScore.total >= 0.8 ? "🎉" : quizScore.score / quizScore.total >= 0.5 ? "👍" : "📖"}</p>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#2f3b63" }}>
                        {quizScore.score} / {quizScore.total}
                      </p>
                      <p style={{ margin: "6px 0 0", color: "#6b78a0", fontSize: 14 }}>
                        {quizScore.score / quizScore.total >= 0.8 ? "Excellent work!" : quizScore.score / quizScore.total >= 0.5 ? "Good effort — keep going!" : "Review the material and try again."}
                      </p>
                      <button onClick={handleGenerateQuiz} style={{ ...btnPrimary(false), marginTop: 16 }}>
                        New Quiz
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setQuiz(null); setSelectedAnswers({}); }} style={{ marginBottom: 16, background: "none", border: "none", color: "#8a9bd6", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      ← Back
                    </button>
                  )}

                  {quiz.map((q, i) => {
                    const correct = quizSubmitted ? q.answer : null;
                    return (
                      <div key={i} style={{ borderRadius: 14, border: "1px solid rgba(190,200,235,0.45)", padding: "16px", marginBottom: 14 }}>
                        <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 14, color: "#2f3b63" }}>
                          {i + 1}. {q.question}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {(q.options || []).map((opt, j) => {
                            const selected = selectedAnswers[i] === opt;
                            const isCorrect = quizSubmitted && opt === correct;
                            const isWrong = quizSubmitted && selected && opt !== correct;
                            return (
                              <button
                                key={j}
                                onClick={() => !quizSubmitted && setSelectedAnswers((p) => ({ ...p, [i]: opt }))}
                                style={{
                                  textAlign: "left",
                                  padding: "10px 14px",
                                  borderRadius: 10,
                                  border: `1.5px solid ${isCorrect ? "#22c55e" : isWrong ? "#ef4444" : selected ? "#8a9bd6" : "rgba(190,200,235,0.45)"}`,
                                  background: isCorrect ? "#f0fdf4" : isWrong ? "#fef2f2" : selected ? "rgba(138,155,214,0.12)" : "rgba(248,249,255,0.7)",
                                  color: "#2f3b63",
                                  fontSize: 13,
                                  cursor: quizSubmitted ? "default" : "pointer",
                                  fontWeight: selected ? 600 : 400,
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted && q.explanation && (
                          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#166534", background: "#f0fdf4", padding: "8px 12px", borderRadius: 8 }}>
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {!quizSubmitted && (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(selectedAnswers).length < quiz.length}
                      style={btnPrimary(Object.keys(selectedAnswers).length < quiz.length)}
                    >
                      Submit Quiz ({Object.keys(selectedAnswers).length}/{quiz.length} answered)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Sessions */}
          {activeTab === "sessions" && (
            <div style={card}>
              <h3 style={sectionTitle}>📅 Study Sessions</h3>
              {cohort.isMember && (
                <div style={{ marginBottom: 24, padding: "16px", borderRadius: 14, border: "1px solid rgba(138,155,214,0.3)", background: "rgba(138,155,214,0.06)" }}>
                  <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#3f4f7a" }}>Schedule a Session</p>
                  <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
                    <input
                      value={sessionTopic}
                      onChange={(e) => setSessionTopic(e.target.value)}
                      placeholder="Topic (e.g. Week 2 — React Hooks)"
                      style={{ flex: 1, height: 42, borderRadius: 10, border: "1.5px solid rgba(138,155,214,0.4)", background: "#fff", padding: "0 12px", fontSize: 13, outline: "none" }}
                    />
                    <input
                      type="datetime-local"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      style={{ height: 42, borderRadius: 10, border: "1.5px solid rgba(138,155,214,0.4)", background: "#fff", padding: "0 12px", fontSize: 13, outline: "none" }}
                    />
                    <button
                      onClick={handleAddSession}
                      disabled={addingSession || !sessionTopic.trim() || !sessionDate}
                      style={{ ...btnPrimary(addingSession || !sessionTopic.trim() || !sessionDate), height: 42 }}
                    >
                      {addingSession ? "Saving…" : "Schedule"}
                    </button>
                  </div>
                </div>
              )}

              {sessions.length === 0 ? (
                <p style={{ color: "#9aa3c0", fontSize: 14 }}>No sessions scheduled yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sessions.map((s) => {
                    const dt = new Date(s.scheduledAt);
                    const st =
                      s.status === "COMPLETED"
                        ? { bg: "#e8f5e9", color: "#2e7d32", label: "Completed" }
                        : s.status === "POSTPONED"
                        ? { bg: "#fff3e0", color: "#e65100", label: "Postponed" }
                        : { bg: "#eef2ff", color: "#4f5fa8", label: "Scheduled" };
                    return (
                      <div key={s.id} style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(190,200,235,0.45)", display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 46, textAlign: "center", flexShrink: 0 }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#8a9bd6", textTransform: "uppercase" }}>{dt.toLocaleString("default", { month: "short" })}</p>
                          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#2f3b63" }}>{dt.getDate()}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#2f3b63" }}>{s.topic}</p>
                            <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                            {s.studyHours ? (
                              <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.12)", color: "#166534" }}>⏱ ~{s.studyHours}h</span>
                            ) : null}
                          </div>
                          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#8a9bd6" }}>
                            {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {s.description ? (
                            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#5e6c92", lineHeight: 1.5 }}>{s.description}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Members */}
          {activeTab === "members" && (
            <div style={card}>
              <h3 style={sectionTitle}>
                <Users size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
                Members ({cohort._count?.members})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(cohort.members || []).map((m) => (
                  <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(190,200,235,0.4)", background: "rgba(248,249,255,0.7)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #8a9bd6, #6f7fc0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {(m.user?.name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#2f3b63" }}>{m.user?.name || "Unknown"}</p>
                      {cohort.createdById === m.userId && (
                        <p style={{ margin: 0, fontSize: 11, color: "#8a9bd6", fontWeight: 600 }}>Creator</p>
                      )}
                    </div>
                    <p style={{ margin: "0 0 0 auto", fontSize: 12, color: "#9aa3c0" }}>
                      Joined {new Date(m.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const card = {
  borderRadius: 20,
  border: "1px solid rgba(190,200,235,0.52)",
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 8px 28px rgba(74,90,133,0.07)",
  backdropFilter: "blur(10px)",
  padding: "22px 22px",
  marginBottom: 20,
};

const sectionTitle = {
  margin: "0 0 16px",
  fontSize: 16,
  fontWeight: 800,
  color: "#2f3b63",
};

const btnPrimary = (disabled) => ({
  height: 44,
  padding: "0 22px",
  borderRadius: 12,
  border: "none",
  background: disabled ? "#c5cde8" : "#8a9bd6",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
});
