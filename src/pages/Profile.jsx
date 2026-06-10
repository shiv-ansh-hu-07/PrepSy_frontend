import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppSideNav from "../components/AppSideNav";
import {
  fetchMyAnalytics,
  fetchMyProfile,
  updateMyProfile,
  uploadAvatar,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

/* ─── Predefined option sets ─────────────────────────────────────────────── */
const GOAL_OPTIONS = [
  "DSA & Algorithms", "Competitive Programming", "Interview Prep", "Placements",
  "Job Switch", "FAANG / Top Tech", "System Design", "Full-Stack Development",
  "Web Development", "Mobile Development", "Backend Development", "Frontend Development",
  "DevOps / Cloud", "Data Science", "Machine Learning / AI", "Cybersecurity",
  "Open Source", "Freelancing / Startup", "GATE", "CAT / MBA", "UPSC / Civil Services",
  "Research / Academia",
];

const INTEREST_OPTIONS = [
  "Programming", "Mathematics", "Physics", "Chemistry", "Biology",
  "Data Science", "Machine Learning", "Web Development", "Mobile Development",
  "System Design", "DevOps / Cloud", "Economics", "Business", "History",
  "Philosophy", "Psychology", "Design", "Communication",
];

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
  "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu", "Odia",
  "Assamese", "French", "German", "Spanish", "Japanese",
];

const AVAILABILITY_OPTIONS = [
  "Weekday mornings", "Weekday afternoons", "Weekday evenings",
  "Weekday nights", "Weekend mornings", "Weekend afternoons",
  "Weekend evenings", "Flexible / Any time",
];

const SKILL_OPTIONS = [
  "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#", "Go",
  "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Dart", "R", "Scala", "MATLAB",
  "HTML", "CSS", "React", "Next.js", "Vue", "Angular", "Svelte", "Tailwind CSS",
  "Bootstrap", "Redux", "GraphQL",
  "Node.js", "Express", "NestJS", "Django", "Flask", "FastAPI", "Spring Boot",
  "Laravel", "Ruby on Rails", "ASP.NET",
  "React Native", "Flutter", "Android (Kotlin)", "iOS (Swift)",
  "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "Cassandra",
  "DynamoDB", "Elasticsearch", "Firebase",
  "AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Terraform",
  "CI/CD", "GitHub Actions", "Jenkins", "Linux", "Nginx",
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas",
  "NumPy", "Scikit-learn", "Computer Vision", "NLP", "LLM / GenAI",
  "DSA", "System Design", "OS Concepts", "Computer Networks", "DBMS",
  "Competitive Programming", "OOP",
  "Git", "REST API", "Microservices", "Web3 / Blockchain", "Cybersecurity",
  "Figma / UI Design", "Agile / Scrum", "SQL",
];

const CITY_OPTIONS = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Surat", "Kanpur",
  "Nagpur", "Indore", "Bhopal", "Patna", "Vadodara", "Coimbatore",
  "Visakhapatnam", "Chandigarh", "Ranchi", "Guwahati", "Kochi",
  "Mysuru", "Jodhpur", "Varanasi", "Agra", "Meerut", "Rajkot",
  "Amritsar", "Gwalior", "Vijayawada", "Madurai", "Raipur", "Kota",
  "Nashik", "Aurangabad", "Srinagar", "Allahabad", "Pondicherry", "Other",
];

const TIMEZONE_OPTIONS = [
  "Asia/Kolkata (IST, UTC+5:30)", "Asia/Dhaka (UTC+6)", "Asia/Karachi (PKT, UTC+5)",
  "Asia/Dubai (UTC+4)", "Asia/Singapore (UTC+8)", "Asia/Tokyo (JST, UTC+9)",
  "Europe/London (GMT/BST)", "Europe/Paris (CET, UTC+1)",
  "America/New_York (ET, UTC-5)", "America/Chicago (CT, UTC-6)",
  "America/Los_Angeles (PT, UTC-8)", "UTC",
];

const requiredFields = [
  { key: "fullName", label: "Full name" },
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "goals", label: "Goals" },
];

const recommendationFields = [
  { key: "city", label: "City" },
  { key: "institutionType", label: "Institution type" },
  { key: "institutionName", label: "Institution name" },
  { key: "interests", label: "Interests" },
  { key: "availability", label: "Availability" },
];

const emptyProfile = {
  fullName: "", username: "", email: "", phone: "", avatarUrl: "", bio: "",
  age: "", gender: "", goals: [], interests: [], skills: [], languages: [],
  examTargets: [], lookingFor: [], availability: [],
  city: "", state: "", country: "", timezone: "",
  institutionType: "", institutionName: "", degree: "", branch: "",
  semester: "", expectedGraduation: "", company: "", role: "",
  experienceLevel: "", workMode: "", collaborationPreference: "",
  dailyStudyGoalMinutes: 0,
  portfolioUrl: "", linkedinUrl: "", githubUrl: "", isDiscoverable: true,
};

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function Profile() {
  const { refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(emptyProfile);
  const [savedProfile, setSavedProfile] = useState(emptyProfile);
  const [editMode, setEditMode] = useState(true);
  const [canCancel, setCanCancel] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1080 : false
  );

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsNarrow(window.innerWidth < 1080);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const [profileResp, analyticsResp] = await Promise.all([
          fetchMyProfile(),
          fetchMyAnalytics().catch(() => ({ analytics: null })),
        ]);
        if (cancelled) return;
        const normalized = normalizeProfile(profileResp.profile);
        const isComplete = getMissingRequired(normalized).length === 0;
        setProfile(normalized);
        setSavedProfile(normalized);
        setAnalytics(analyticsResp.analytics);
        setEditMode(!isComplete);
        setCanCancel(false);
      } catch (err) {
        if (!cancelled) {
          const fallback = normalizeProfile({
            fullName: user?.name || "",
            email: user?.email || "",
            avatarUrl: user?.avatarUrl || "",
          });
          setProfile(fallback);
          setSavedProfile(fallback);
          setEditMode(true);
          setError(err?.response?.data?.message || "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, [user?.avatarUrl, user?.email, user?.name]);

  const missingRequired = useMemo(() => getMissingRequired(profile), [profile]);
  const missingRecommendations = useMemo(() => getMissingRecommendations(profile), [profile]);
  const completionPercent = getLocalCompletionPercent(profile);
  const stats = analytics?.summary || {};
  const initials = getInitials(profile.fullName || profile.email || "PrepSy");

  const avatarDisplayUrl = useMemo(() => {
    if (!profile.avatarUrl) return null;
    if (profile.avatarUrl.startsWith("/uploads/")) {
      return `${import.meta.env.VITE_API_BASE_URL}${profile.avatarUrl}`;
    }
    return profile.avatarUrl;
  }, [profile.avatarUrl]);

  function updateField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function handleStartEdit() {
    setSavedProfile({ ...profile });
    setCanCancel(getMissingRequired(profile).length === 0);
    setEditMode(true);
    setError("");
  }

  function handleCancelEdit() {
    setProfile({ ...savedProfile });
    setEditMode(false);
    setError("");
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAvatar(formData);
      updateField("avatarUrl", result.avatarUrl);
      if (!editMode) {
        setSavedProfile((prev) => ({ ...prev }));
        setCanCancel(true);
        setEditMode(true);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Image upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const missing = getMissingRequired(profile);
    if (missing.length > 0) {
      setError(`Please fill required fields: ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...profile, age: profile.age ? Number(profile.age) : null };
      const response = await updateMyProfile(payload);
      const updated = normalizeProfile(response.profile);
      setProfile(updated);
      setSavedProfile(updated);
      setEditMode(false);
      setToast("Profile saved.");
      await refreshUser();
    } catch (err) {
      const missing = err?.response?.data?.missingRequiredFields;
      setError(
        Array.isArray(missing)
          ? `Please fill required fields: ${missing.join(", ")}.`
          : err?.response?.data?.message || "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading your profile...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.layout(isNarrow)}>
        <AppSideNav />

        <main style={styles.main}>
          <header style={styles.header}>
            <div>
              <p style={styles.eyebrow}>PrepSy Profile</p>
              <h1 style={styles.title}>My Profile</h1>
              {editMode && (
                <p style={styles.subtitle}>
                  Manage your identity, learning goals, and matching preferences.
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              {editMode ? (
                <>
                  {canCancel && (
                    <button type="button" onClick={handleCancelEdit} style={styles.cancelButton}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" form="profile-form" disabled={saving} style={styles.saveButton(saving)}>
                    <Save size={17} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button type="button" onClick={handleStartEdit} style={styles.editButton}>
                  <Pencil size={15} />
                  Edit Profile
                </button>
              )}
            </div>
          </header>

          {editMode && missingRequired.length > 0 && (
            <AlertPanel
              tone="warning"
              title="Complete required profile details"
              text={`Please add ${missingRequired.join(", ")} so PrepSy can recommend useful study partners and groups.`}
            />
          )}
          {editMode && missingRecommendations.length > 0 && (
            <AlertPanel
              tone="info"
              title="Improve recommendations"
              text={`Add ${missingRecommendations.slice(0, 4).join(", ")} for better city, interest, and institution-based matching.`}
            />
          )}
          {error ? <AlertPanel tone="danger" title="Error" text={error} /> : null}

          <div style={styles.contentGrid(isNarrow)}>
            {/* ── Left card ────────────────────────────────────────── */}
            <aside style={styles.profileCard(isNarrow)}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                style={{ display: "none" }}
                onChange={handleAvatarUpload}
              />
              <div
                style={{ ...styles.avatarWrap, cursor: "pointer" }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to update photo"
              >
                {avatarDisplayUrl ? (
                  <img src={avatarDisplayUrl} alt="" style={styles.avatarImage} />
                ) : (
                  <div style={styles.avatarFallback}>{initials}</div>
                )}
                <div style={styles.cameraBadge}>
                  {uploading ? "…" : <Camera size={15} />}
                </div>
              </div>

              <h2 style={styles.profileName}>{profile.fullName || "Your Name"}</h2>
              <p style={styles.profileHandle}>
                {profile.username ? `@${profile.username}` : profile.email}
              </p>
              <p style={styles.profileBio}>
                {profile.bio || "Add a short bio so future collaborators know how you study."}
              </p>

              <div style={styles.completionBlock}>
                <div style={styles.completionTopline}>
                  <span>Profile strength</span>
                  <strong>{completionPercent}%</strong>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${completionPercent}%` }} />
                </div>
              </div>

              <div style={styles.sideStats}>
                <MiniStat icon={Target} label="Goals" value={profile.goals.length} />
                <MiniStat icon={Clock3} label="Focus Time" value={stats.totalFocusLabel || "0m"} />
                <MiniStat icon={CheckCircle2} label="Sessions" value={stats.sessionsCompleted || 0} />
                <MiniStat icon={ShieldCheck} label="Discoverable" value={profile.isDiscoverable ? "On" : "Off"} />
              </div>

              <button type="button" onClick={() => navigate("/analytics")} style={styles.secondaryButton}>
                <BarChart3 size={17} />
                View Analytics
              </button>
            </aside>

            {/* ── Right panel ──────────────────────────────────────── */}
            {editMode ? (
              <form id="profile-form" onSubmit={handleSubmit} style={styles.formPanel}>

                <Section icon={UserRound} title="Basic Information">
                  <div style={styles.fieldGrid}>
                    <Field label="Full Name" required>
                      <input value={profile.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
                        placeholder="Your full name" style={styles.input} />
                    </Field>
                    <Field label="Username">
                      <input value={profile.username}
                        onChange={(e) => updateField("username", cleanUsername(e.target.value))}
                        placeholder="prepsy_user" style={styles.input} />
                    </Field>
                    <Field label="Email">
                      <input value={profile.email} readOnly style={styles.inputReadOnly} />
                    </Field>
                    <Field label="Phone Number">
                      <input value={profile.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="+91 98765 43210" style={styles.input} />
                    </Field>
                    <Field label="Age" required>
                      <input type="number" min="13" max="100" value={profile.age || ""}
                        onChange={(e) => updateField("age", e.target.value)}
                        placeholder="21" style={styles.input} />
                    </Field>
                    <Field label="Gender" required>
                      <select value={profile.gender}
                        onChange={(e) => updateField("gender", e.target.value)}
                        style={styles.input}>
                        <option value="">Select gender</option>
                        <option value="woman">Woman</option>
                        <option value="man">Man</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Bio">
                    <textarea value={profile.bio}
                      onChange={(e) => updateField("bio", e.target.value.slice(0, 180))}
                      placeholder="I love solving problems, building things, and studying consistently."
                      rows={3} style={styles.textarea} />
                    <p style={styles.helperText}>{profile.bio.length}/180</p>
                  </Field>
                  <Field label="Daily Study Goal">
                    <select
                      value={profile.dailyStudyGoalMinutes || 0}
                      onChange={(e) => updateField("dailyStudyGoalMinutes", Number(e.target.value))}
                      style={styles.input}
                    >
                      <option value={0}>No goal set</option>
                      {[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,7,8,9,10,12].map((h) => (
                        <option key={h} value={Math.round(h * 60)}>
                          {h} hour{h !== 1 ? "s" : ""} per day
                        </option>
                      ))}
                    </select>
                    <p style={styles.helperText}>
                      Used to show your daily goal vs actual time in Analytics.
                    </p>
                  </Field>
                </Section>

                <Section icon={GraduationCap} title="I Am A">
                  <div style={styles.segmentGrid}>
                    <SegmentCard icon={GraduationCap} title="College Student"
                      description="Course, semester, and branch"
                      active={profile.institutionType === "college" || profile.institutionType === "student"}
                      onClick={() => updateField("institutionType", "college")} />
                    <SegmentCard icon={BriefcaseBusiness} title="Working Professional"
                      description="Learning while working"
                      active={profile.institutionType === "working_professional"}
                      onClick={() => updateField("institutionType", "working_professional")} />
                    <SegmentCard icon={Sparkles} title="Self Learner"
                      description="Preparing independently"
                      active={profile.institutionType === "self_learner"}
                      onClick={() => updateField("institutionType", "self_learner")} />
                  </div>
                </Section>

                {(profile.institutionType === "college" || profile.institutionType === "student") && (
                  <Section icon={GraduationCap} title="College Details"
                    caption="Used for matching people by college, course, and semester.">
                    <div style={styles.fieldGrid}>
                      <Field label="College / University">
                        <input value={profile.institutionName}
                          onChange={(e) => updateField("institutionName", e.target.value)}
                          placeholder="College or university" style={styles.input} />
                      </Field>
                      <Field label="Degree / Course">
                        <input value={profile.degree}
                          onChange={(e) => updateField("degree", e.target.value)}
                          placeholder="B.Tech, B.Sc, MBA" style={styles.input} />
                      </Field>
                      <Field label="Semester / Year">
                        <input value={profile.semester}
                          onChange={(e) => updateField("semester", e.target.value)}
                          placeholder="4th Semester" style={styles.input} />
                      </Field>
                      <Field label="Branch / Major">
                        <input value={profile.branch}
                          onChange={(e) => updateField("branch", e.target.value)}
                          placeholder="Computer Science" style={styles.input} />
                      </Field>
                      <Field label="Expected Graduation">
                        <input value={profile.expectedGraduation}
                          onChange={(e) => updateField("expectedGraduation", e.target.value)}
                          placeholder="May 2026" style={styles.input} />
                      </Field>
                    </div>
                  </Section>
                )}

                {profile.institutionType === "working_professional" && (
                  <Section icon={BriefcaseBusiness} title="Working Professional Details"
                    caption="Used for career-stage matching and work-friendly study groups.">
                    <div style={styles.fieldGrid}>
                      <Field label="Company">
                        <input value={profile.company}
                          onChange={(e) => updateField("company", e.target.value)}
                          placeholder="Company or organization" style={styles.input} />
                      </Field>
                      <Field label="Role">
                        <input value={profile.role}
                          onChange={(e) => updateField("role", e.target.value)}
                          placeholder="Software Engineer, Analyst" style={styles.input} />
                      </Field>
                      <Field label="Experience Level">
                        <select value={profile.experienceLevel}
                          onChange={(e) => updateField("experienceLevel", e.target.value)}
                          style={styles.input}>
                          <option value="">Select level</option>
                          <option value="fresher">Fresher</option>
                          <option value="0-2">0–2 years</option>
                          <option value="3-5">3–5 years</option>
                          <option value="5-plus">5+ years</option>
                        </select>
                      </Field>
                      <Field label="Work Mode">
                        <select value={profile.workMode}
                          onChange={(e) => updateField("workMode", e.target.value)}
                          style={styles.input}>
                          <option value="">Select work mode</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="onsite">On-site</option>
                        </select>
                      </Field>
                      <Field label="Career Track">
                        <input value={profile.degree}
                          onChange={(e) => updateField("degree", e.target.value)}
                          placeholder="Backend, frontend, data, product" style={styles.input} />
                      </Field>
                      <Field label="Target Timeline">
                        <input value={profile.expectedGraduation}
                          onChange={(e) => updateField("expectedGraduation", e.target.value)}
                          placeholder="Switching by Dec 2026" style={styles.input} />
                      </Field>
                    </div>
                  </Section>
                )}

                {profile.institutionType === "self_learner" && (
                  <Section icon={Sparkles} title="Self Learner Setup"
                    caption="Helps PrepSy recommend independent learners with similar goals.">
                    <div style={styles.fieldGrid}>
                      <Field label="Learning Track">
                        <input value={profile.degree}
                          onChange={(e) => updateField("degree", e.target.value)}
                          placeholder="Full-stack, DSA, design, aptitude" style={styles.input} />
                      </Field>
                      <Field label="Current Level">
                        <select value={profile.semester}
                          onChange={(e) => updateField("semester", e.target.value)}
                          style={styles.input}>
                          <option value="">Select level</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </Field>
                      <Field label="Primary Platform">
                        <input value={profile.institutionName}
                          onChange={(e) => updateField("institutionName", e.target.value)}
                          placeholder="YouTube, Coursera, LeetCode, offline" style={styles.input} />
                      </Field>
                      <Field label="Target Timeline">
                        <input value={profile.expectedGraduation}
                          onChange={(e) => updateField("expectedGraduation", e.target.value)}
                          placeholder="3 months, before placements" style={styles.input} />
                      </Field>
                    </div>
                  </Section>
                )}

                <Section icon={MapPin} title="Location"
                  caption="City and timezone help recommend nearby collaborators and compatible schedules.">
                  <div style={styles.fieldGrid}>
                    <Field label="City">
                      <select value={profile.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        style={styles.input}>
                        <option value="">Select city</option>
                        {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="State">
                      <input value={profile.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        placeholder="Delhi, Maharashtra, Karnataka" style={styles.input} />
                    </Field>
                    <Field label="Country">
                      <input value={profile.country}
                        onChange={(e) => updateField("country", e.target.value)}
                        placeholder="India" style={styles.input} />
                    </Field>
                    <Field label="Timezone">
                      <select value={profile.timezone}
                        onChange={(e) => updateField("timezone", e.target.value.split(" ")[0])}
                        style={styles.input}>
                        <option value="">Select timezone</option>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz} value={tz.split(" ")[0]}>{tz}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                <Section icon={Users} title="Collaboration Matching"
                  caption="These fields power friend, group, room, and study partner recommendations.">
                  <div style={styles.fieldGrid}>
                    <Field label="Goals" required>
                      <MultiSelect value={profile.goals}
                        onChange={(next) => updateField("goals", next)}
                        options={GOAL_OPTIONS} placeholder="Select your study goals" />
                    </Field>
                    <Field label="Interests">
                      <MultiSelect value={profile.interests}
                        onChange={(next) => updateField("interests", next)}
                        options={INTEREST_OPTIONS} placeholder="Select your interests" />
                    </Field>
                    <Field label="Languages">
                      <MultiSelect value={profile.languages}
                        onChange={(next) => updateField("languages", next)}
                        options={LANGUAGE_OPTIONS} placeholder="Select languages you speak" />
                    </Field>
                    <Field label="Availability">
                      <MultiSelect value={profile.availability}
                        onChange={(next) => updateField("availability", next)}
                        options={AVAILABILITY_OPTIONS} placeholder="When are you free to study?" />
                    </Field>
                    <Field label="Skills">
                      <MultiSelect value={profile.skills}
                        onChange={(next) => updateField("skills", next)}
                        options={SKILL_OPTIONS} placeholder="Select your tech skills" max={30} />
                    </Field>
                    <Field label="Collaboration Style">
                      <select value={profile.collaborationPreference}
                        onChange={(e) => updateField("collaborationPreference", e.target.value)}
                        style={styles.input}>
                        <option value="">Select preference</option>
                        <option value="quiet-focus">Quiet focus rooms</option>
                        <option value="discussion-heavy">Discussion heavy</option>
                        <option value="pair-study">Pair study</option>
                        <option value="project-based">Project based</option>
                        <option value="interview-practice">Interview practice</option>
                      </select>
                    </Field>
                  </div>
                  <label style={styles.toggleRow}>
                    <input type="checkbox" checked={profile.isDiscoverable}
                      onChange={(e) => updateField("isDiscoverable", e.target.checked)} />
                    <span>Let PrepSy use this profile for future friend, group, and room recommendations.</span>
                  </label>
                </Section>

                <Section icon={MapPin} title="Links">
                  <div style={styles.fieldGrid}>
                    <Field label="Portfolio URL">
                      <input value={profile.portfolioUrl}
                        onChange={(e) => updateField("portfolioUrl", e.target.value)}
                        placeholder="https://your-site.com" style={styles.input} />
                    </Field>
                    <Field label="LinkedIn URL">
                      <input value={profile.linkedinUrl}
                        onChange={(e) => updateField("linkedinUrl", e.target.value)}
                        placeholder="https://linkedin.com/in/..." style={styles.input} />
                    </Field>
                    <Field label="GitHub URL">
                      <input value={profile.githubUrl}
                        onChange={(e) => updateField("githubUrl", e.target.value)}
                        placeholder="https://github.com/..." style={styles.input} />
                    </Field>
                  </div>
                </Section>
              </form>
            ) : (
              <ProfileViewPanel profile={profile} />
            )}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}

/* ─── Profile view panel (read-only) ────────────────────────────────────── */
function ProfileViewPanel({ profile }) {
  const hasLocation = profile.city || profile.state || profile.country || profile.timezone;
  const hasLinks = profile.portfolioUrl || profile.linkedinUrl || profile.githubUrl;
  const hasCollab =
    profile.goals.length || profile.interests.length || profile.skills.length ||
    profile.languages.length || profile.availability.length || profile.collaborationPreference;

  return (
    <div style={styles.viewPanel}>
      <ViewSection icon={UserRound} title="Basic Information">
        <div style={styles.viewGrid}>
          <ViewItem label="Full Name" value={profile.fullName} />
          <ViewItem label="Username" value={profile.username ? `@${profile.username}` : null} />
          <ViewItem label="Email" value={profile.email} />
          <ViewItem label="Phone" value={profile.phone} />
          <ViewItem label="Age" value={profile.age} />
          <ViewItem label="Gender" value={formatGender(profile.gender)} />
          <ViewItem
            label="Daily Study Goal"
            value={profile.dailyStudyGoalMinutes > 0
              ? `${profile.dailyStudyGoalMinutes / 60} hr${profile.dailyStudyGoalMinutes !== 60 ? "s" : ""} / day`
              : null}
          />
        </div>
        {profile.bio && (
          <div style={{ marginTop: 14 }}>
            <p style={styles.viewLabel}>Bio</p>
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "#2f3b63", lineHeight: 1.7 }}>{profile.bio}</p>
          </div>
        )}
      </ViewSection>

      {profile.institutionType && (
        <ViewSection icon={GraduationCap} title="I Am A">
          <span style={styles.typeBadge}>{formatInstitutionType(profile.institutionType)}</span>
          {(profile.institutionType === "college" || profile.institutionType === "student") && (
            <div style={{ ...styles.viewGrid, marginTop: 14 }}>
              <ViewItem label="Institution" value={profile.institutionName} />
              <ViewItem label="Degree / Course" value={profile.degree} />
              <ViewItem label="Semester / Year" value={profile.semester} />
              <ViewItem label="Branch / Major" value={profile.branch} />
              <ViewItem label="Expected Graduation" value={profile.expectedGraduation} />
            </div>
          )}
          {profile.institutionType === "working_professional" && (
            <div style={{ ...styles.viewGrid, marginTop: 14 }}>
              <ViewItem label="Company" value={profile.company} />
              <ViewItem label="Role" value={profile.role} />
              <ViewItem label="Experience" value={profile.experienceLevel} />
              <ViewItem label="Work Mode" value={profile.workMode} />
              <ViewItem label="Career Track" value={profile.degree} />
              <ViewItem label="Target Timeline" value={profile.expectedGraduation} />
            </div>
          )}
          {profile.institutionType === "self_learner" && (
            <div style={{ ...styles.viewGrid, marginTop: 14 }}>
              <ViewItem label="Learning Track" value={profile.degree} />
              <ViewItem label="Level" value={profile.semester} />
              <ViewItem label="Platform" value={profile.institutionName} />
              <ViewItem label="Target Timeline" value={profile.expectedGraduation} />
            </div>
          )}
        </ViewSection>
      )}

      {hasLocation && (
        <ViewSection icon={MapPin} title="Location">
          <div style={styles.viewGrid}>
            <ViewItem label="City" value={profile.city} />
            <ViewItem label="State" value={profile.state} />
            <ViewItem label="Country" value={profile.country} />
            <ViewItem label="Timezone" value={profile.timezone} />
          </div>
        </ViewSection>
      )}

      {hasCollab ? (
        <ViewSection icon={Users} title="Collaboration Matching">
          <div style={{ display: "grid", gap: 16 }}>
            {profile.goals.length > 0 && (
              <ViewTagField label="Goals" items={profile.goals} color="#6f3bd6" bg="#ede9fe" />
            )}
            {profile.interests.length > 0 && (
              <ViewTagField label="Interests" items={profile.interests} color="#0369a1" bg="#e0f2fe" />
            )}
            {profile.skills.length > 0 && (
              <ViewTagField label="Skills" items={profile.skills} color="#065f46" bg="#d1fae5" />
            )}
            {profile.languages.length > 0 && (
              <ViewTagField label="Languages" items={profile.languages} color="#7c3aed" bg="#f3e8ff" />
            )}
            {profile.availability.length > 0 && (
              <ViewTagField label="Availability" items={profile.availability} color="#1e3a5f" bg="#dbeafe" />
            )}
            {profile.collaborationPreference && (
              <ViewItem label="Collaboration Style" value={formatCollabStyle(profile.collaborationPreference)} />
            )}
          </div>
        </ViewSection>
      ) : null}

      {hasLinks && (
        <ViewSection icon={MapPin} title="Links">
          <div style={{ display: "grid", gap: 10 }}>
            {profile.portfolioUrl && <ViewLink label="Portfolio" url={profile.portfolioUrl} />}
            {profile.linkedinUrl && <ViewLink label="LinkedIn" url={profile.linkedinUrl} />}
            {profile.githubUrl && <ViewLink label="GitHub" url={profile.githubUrl} />}
          </div>
        </ViewSection>
      )}
    </div>
  );
}

function ViewSection({ icon: Icon, title, children }) {
  return (
    <section style={styles.viewSection}>
      <div style={styles.sectionTitleWrap}>
        <Icon size={17} />
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function ViewItem({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <p style={styles.viewLabel}>{label}</p>
      <p style={styles.viewValue}>{value}</p>
    </div>
  );
}

function ViewTagField({ label, items, color, bg }) {
  if (!items?.length) return null;
  return (
    <div>
      <p style={{ ...styles.viewLabel, marginBottom: 8 }}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((item) => (
          <span key={item} style={{ ...styles.viewTag, color, background: bg }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function ViewLink({ label, url }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <span style={styles.viewLabel}>{label}</span>
      <a href={url} target="_blank" rel="noreferrer"
        style={{ fontSize: 13, color: "#6f3bd6", wordBreak: "break-all", textDecoration: "none" }}>
        {url}
      </a>
    </div>
  );
}

function Toast({ message }) {
  return (
    <div style={styles.toast}>
      <CheckCircle2 size={16} color="#4ade80" />
      <span>{message}</span>
    </div>
  );
}

/* ─── Shared sub-components ──────────────────────────────────────────────── */
function AlertPanel({ tone, title, text }) {
  const toneStyle = styles.alertTone[tone] || styles.alertTone.info;
  return (
    <div style={{ ...styles.alert, ...toneStyle }}>
      <AlertCircle size={17} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <strong style={styles.alertTitle}>{title}</strong>
        <p style={styles.alertText}>{text}</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, caption, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitleWrap}>
          <Icon size={17} />
          <h2 style={styles.sectionTitle}>{title}</h2>
        </div>
        {caption ? <p style={styles.sectionCaption}>{caption}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
        {required ? <strong style={{ color: "#b44b3c" }}> *</strong> : null}
      </span>
      {children}
    </label>
  );
}

function MultiSelect({ value, onChange, options, placeholder, max }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function toggle(option) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else if (value.length < (max || 16)) {
      onChange([...value, option]);
    }
  }

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      <div style={styles.multiTrigger} onClick={() => setOpen((o) => !o)}>
        <div style={styles.multiTagsWrap}>
          {value.length === 0 ? (
            <span style={styles.multiPlaceholder}>{placeholder}</span>
          ) : (
            value.map((v) => (
              <span key={v} style={styles.multiTag}>
                {v}
                <button type="button" style={styles.multiTagRemove}
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}>
                  <X size={11} />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={15} style={{ flexShrink: 0, color: "#7a89b8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s" }} />
      </div>
      {open && (
        <div style={styles.multiDropdown}>
          {options.map((option) => {
            const checked = value.includes(option);
            return (
              <label key={option} style={styles.multiOption(checked)}>
                <input type="checkbox" checked={checked} onChange={() => toggle(option)}
                  style={{ flexShrink: 0, accentColor: "#7c3aed" }} />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SegmentCard({ icon: Icon, title, description, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={styles.segment(active)}>
      <span style={styles.segmentIcon(active)}><Icon size={20} /></span>
      <span style={styles.segmentText}>
        <strong style={styles.segmentTitle}>{title}</strong>
        <small style={styles.segmentDescription}>{description}</small>
      </span>
      <span style={styles.segmentCheck(active)}>
        {active ? <CheckCircle2 size={17} /> : null}
      </span>
    </button>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div style={styles.miniStat}>
      <span style={styles.miniStatIcon}><Icon size={16} /></span>
      <div style={styles.miniStatText}>
        <strong style={styles.miniStatValue}>{value}</strong>
        <span style={styles.miniStatLabel}>{label}</span>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function normalizeProfile(profile) {
  return {
    ...emptyProfile,
    ...(profile || {}),
    age: profile?.age || "",
    dailyStudyGoalMinutes: profile?.dailyStudyGoalMinutes ?? 0,
    institutionType:
      profile?.institutionType === "student" ? "college" : profile?.institutionType || "",
    goals: profile?.goals || [],
    interests: profile?.interests || [],
    skills: profile?.skills || [],
    languages: profile?.languages || [],
    examTargets: profile?.examTargets || [],
    lookingFor: profile?.lookingFor || [],
    availability: profile?.availability || [],
  };
}

function getMissingRequired(profile) {
  return requiredFields
    .filter(({ key }) => {
      const v = profile[key];
      return Array.isArray(v) ? v.length === 0 : !String(v || "").trim();
    })
    .map(({ label }) => label);
}

function getMissingRecommendations(profile) {
  return recommendationFields
    .filter(({ key }) => {
      const v = profile[key];
      return Array.isArray(v) ? v.length === 0 : !String(v || "").trim();
    })
    .map(({ label }) => label);
}

function getLocalCompletionPercent(profile) {
  const tracked = [
    "fullName", "age", "gender", "goals", "interests", "city",
    "institutionType", "institutionName", "lookingFor", "availability",
    "skills", "languages",
  ];
  const complete = tracked.filter((f) => {
    const v = profile[f];
    return Array.isArray(v) ? v.length > 0 : Boolean(String(v || "").trim());
  }).length;
  return Math.round((complete / tracked.length) * 100);
}

function getInitials(value) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? parts.map((p) => p[0]?.toUpperCase()).join("").slice(0, 2)
    : "PS";
}

function cleanUsername(value) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
}

function formatGender(gender) {
  const map = { woman: "Woman", man: "Man", "non-binary": "Non-binary", "prefer-not-to-say": "Prefer not to say" };
  return map[gender] || gender || null;
}

function formatInstitutionType(type) {
  const map = { college: "College Student", student: "College Student", working_professional: "Working Professional", self_learner: "Self Learner" };
  return map[type] || type || null;
}

function formatCollabStyle(pref) {
  const map = {
    "quiet-focus": "Quiet focus rooms", "discussion-heavy": "Discussion heavy",
    "pair-study": "Pair study", "project-based": "Project based", "interview-practice": "Interview practice",
  };
  return map[pref] || pref || null;
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const styles = {
  page: {
    minHeight: "calc(100vh - 76px)",
    background: "radial-gradient(ellipse at top, #eef1fb 0%, #f4f6fd 46%, #f8f9fe 100%)",
    padding: "32px 24px 56px",
  },
  layout: (isNarrow) => ({
    width: "100%", maxWidth: 1360, margin: "0 auto",
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)",
    gap: 24, alignItems: "start",
  }),
  main: { display: "grid", gap: 18, minWidth: 0 },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: 16, flexWrap: "wrap", minWidth: 0,
  },
  eyebrow: { margin: 0, color: "#7a89b8", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" },
  title: { margin: "5px 0", fontFamily: "Georgia, serif", fontSize: 30, lineHeight: 1.1, color: "#2f3b63", fontWeight: 400 },
  subtitle: { margin: 0, color: "#65749f", fontSize: 13, fontWeight: 400 },
  saveButton: (saving) => ({
    height: 42, padding: "0 18px", borderRadius: 13, border: "none",
    background: saving ? "#b6c0e4" : "linear-gradient(135deg, #8a9bd6, #6f7fc0)",
    color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 8, fontWeight: 600, fontSize: 14, cursor: saving ? "wait" : "pointer",
    boxShadow: "0 10px 24px rgba(111,127,192,0.22)", whiteSpace: "nowrap", flexShrink: 0,
  }),
  editButton: {
    height: 42, padding: "0 18px", borderRadius: 13,
    border: "1px solid rgba(138,155,214,0.6)",
    background: "rgba(255,255,255,0.9)", color: "#4a5a85",
    display: "inline-flex", alignItems: "center", gap: 8,
    fontWeight: 600, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
    boxShadow: "0 4px 12px rgba(74,90,133,0.08)",
  },
  cancelButton: {
    height: 42, padding: "0 16px", borderRadius: 13,
    border: "1px solid rgba(190,200,235,0.6)", background: "transparent",
    color: "#65749f", display: "inline-flex", alignItems: "center",
    gap: 8, fontWeight: 500, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
  },
  contentGrid: (isNarrow) => ({
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(260px, 290px) minmax(0, 1fr)",
    gap: 22, alignItems: "start",
  }),
  profileCard: (isNarrow) => ({
    borderRadius: 22, border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.82)", boxShadow: "0 14px 38px rgba(74,90,133,0.1)",
    padding: 20, display: "grid", justifyItems: "center", gap: 10,
    position: isNarrow ? "relative" : "sticky", top: isNarrow ? "auto" : 88,
    width: "100%", boxSizing: "border-box",
  }),
  avatarWrap: { position: "relative", width: 108, height: 108 },
  avatarImage: {
    width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover",
    border: "3px solid #ffffff", boxShadow: "0 10px 28px rgba(74,90,133,0.14)",
  },
  avatarFallback: {
    width: "100%", height: "100%", borderRadius: "50%",
    background: "linear-gradient(135deg, #8a9bd6, #eef2ff)",
    color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 30, fontWeight: 600, border: "3px solid #ffffff",
    boxShadow: "0 10px 28px rgba(74,90,133,0.14)",
  },
  cameraBadge: {
    position: "absolute", right: 2, bottom: 8, width: 30, height: 30, borderRadius: "50%",
    background: "#7c3aed", color: "#ffffff", display: "flex", alignItems: "center",
    justifyContent: "center", border: "2px solid #ffffff", fontSize: 12,
  },
  profileName: { margin: "4px 0 0", color: "#1f2937", fontSize: 20, lineHeight: 1.2, textAlign: "center", overflowWrap: "anywhere", fontWeight: 500 },
  profileHandle: { margin: 0, color: "#65749f", fontSize: 12, textAlign: "center", overflowWrap: "anywhere" },
  profileBio: { margin: "6px 0 2px", color: "#4a5a85", fontSize: 12, lineHeight: 1.5, textAlign: "center" },
  completionBlock: { width: "100%", borderTop: "1px solid rgba(190,200,235,0.42)", paddingTop: 12, marginTop: 2 },
  completionTopline: { display: "flex", justifyContent: "space-between", color: "#4a5a85", fontSize: 12, marginBottom: 7, fontWeight: 500 },
  progressTrack: { height: 6, borderRadius: 999, background: "#e8edf9", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #8a9bd6, #6f7fc0)" },
  sideStats: { width: "100%", display: "grid", gap: 8, marginTop: 4 },
  miniStat: {
    display: "grid", gridTemplateColumns: "30px minmax(0, 1fr)", alignItems: "center", gap: 9,
    background: "#f5f7ff", border: "1px solid rgba(190,200,235,0.42)", borderRadius: 13, padding: 10,
    minWidth: 0, boxSizing: "border-box",
  },
  miniStatIcon: { width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#eef2ff", color: "#6f7fc0" },
  miniStatText: { minWidth: 0, display: "grid", gap: 1 },
  miniStatValue: { color: "#2f3b63", fontSize: 14, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 },
  miniStatLabel: { color: "#65749f", fontSize: 11, lineHeight: 1.25 },
  secondaryButton: {
    width: "100%", height: 40, borderRadius: 12, border: "1px solid rgba(138,155,214,0.55)",
    background: "transparent", color: "#5f6fa3", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 7, fontWeight: 500, fontSize: 13, cursor: "pointer", boxSizing: "border-box",
  },
  // form panel
  formPanel: {
    borderRadius: 22, border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.84)", boxShadow: "0 14px 38px rgba(74,90,133,0.08)",
    padding: 22, display: "grid", gap: 22, minWidth: 0, boxSizing: "border-box",
  },
  section: { display: "grid", gap: 14, paddingBottom: 18, borderBottom: "1px solid rgba(190,200,235,0.4)" },
  sectionHeader: { display: "grid", gap: 4, minWidth: 0 },
  sectionTitleWrap: { display: "flex", alignItems: "center", gap: 8, color: "#6f3bd6", minWidth: 0 },
  sectionTitle: { margin: 0, color: "#6f3bd6", fontSize: 15, fontWeight: 600 },
  sectionCaption: { margin: 0, color: "#65749f", fontSize: 12, lineHeight: 1.45, maxWidth: 720 },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", columnGap: 16, rowGap: 14 },
  field: { display: "grid", gap: 6, minWidth: 0 },
  label: { color: "#4a5a85", fontSize: 12, fontWeight: 500 },
  input: {
    width: "100%", minHeight: 40, borderRadius: 11, border: "1px solid rgba(190,200,235,0.7)",
    background: "#ffffff", color: "#1f2937", padding: "9px 12px", fontSize: 13,
    outline: "none", boxSizing: "border-box",
  },
  inputReadOnly: {
    width: "100%", minHeight: 40, borderRadius: 11, border: "1px solid rgba(190,200,235,0.5)",
    background: "#f6f8ff", color: "#65749f", padding: "9px 12px", fontSize: 13,
    outline: "none", boxSizing: "border-box",
  },
  textarea: {
    width: "100%", borderRadius: 12, border: "1px solid rgba(190,200,235,0.7)",
    background: "#ffffff", color: "#1f2937", padding: "10px 12px", fontSize: 13,
    lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box",
  },
  helperText: { margin: "3px 0 0", color: "#7a89b8", fontSize: 11 },
  segmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  segment: (active) => ({
    minHeight: 72, borderRadius: 14,
    border: active ? "1px solid #7c3aed" : "1px solid rgba(190,200,235,0.62)",
    background: active ? "rgba(124,58,237,0.06)" : "#ffffff",
    color: "#2f3b63", display: "grid", gridTemplateColumns: "38px minmax(0, 1fr) 20px",
    alignItems: "center", gap: 10, padding: 12, cursor: "pointer", boxSizing: "border-box", minWidth: 0,
  }),
  segmentIcon: (active) => ({
    width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
    color: active ? "#7c3aed" : "#7a89b8", background: active ? "#ede9fe" : "#f1f4ff",
  }),
  segmentCheck: (active) => ({ color: active ? "#7c3aed" : "transparent", display: "flex", justifyContent: "flex-end" }),
  segmentText: { display: "grid", gap: 3, minWidth: 0, textAlign: "left" },
  segmentTitle: { color: "#2f3b63", fontSize: 13, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 },
  segmentDescription: { color: "#65749f", fontSize: 11, lineHeight: 1.3 },
  toggleRow: {
    display: "flex", alignItems: "flex-start", gap: 10, color: "#4a5a85", fontSize: 13,
    lineHeight: 1.5, padding: 12, borderRadius: 12, background: "#f6f8ff",
    border: "1px solid rgba(190,200,235,0.45)",
  },
  multiTrigger: {
    minHeight: 40, borderRadius: 11, border: "1px solid rgba(190,200,235,0.7)",
    background: "#ffffff", padding: "6px 10px", display: "flex", alignItems: "center",
    gap: 8, cursor: "pointer", boxSizing: "border-box", width: "100%",
  },
  multiTagsWrap: { flex: 1, display: "flex", flexWrap: "wrap", gap: 5, minWidth: 0 },
  multiPlaceholder: { color: "#9aa8c8", fontSize: 13 },
  multiTag: {
    display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999,
    background: "#ede9fe", color: "#5b21b6", padding: "3px 8px", fontSize: 12, fontWeight: 500,
  },
  multiTagRemove: { background: "none", border: "none", padding: 0, cursor: "pointer", color: "#7c3aed", display: "flex", alignItems: "center" },
  multiDropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
    background: "#ffffff", border: "1px solid rgba(190,200,235,0.7)", borderRadius: 13,
    boxShadow: "0 10px 28px rgba(74,90,133,0.14)", maxHeight: 260, overflowY: "auto", padding: "6px 0",
  },
  multiOption: (checked) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
    cursor: "pointer", fontSize: 13,
    background: checked ? "rgba(124,58,237,0.05)" : "transparent",
    color: checked ? "#5b21b6" : "#2f3b63",
  }),
  // view panel
  viewPanel: {
    borderRadius: 22, border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.84)", boxShadow: "0 14px 38px rgba(74,90,133,0.08)",
    padding: 22, display: "grid", gap: 0, minWidth: 0, boxSizing: "border-box",
  },
  viewSection: {
    padding: "18px 0",
    borderBottom: "1px solid rgba(190,200,235,0.4)",
  },
  viewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    columnGap: 24, rowGap: 16,
  },
  viewLabel: { margin: 0, color: "#8a9cc8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  viewValue: { margin: "4px 0 0", color: "#1f2937", fontSize: 14, lineHeight: 1.45 },
  viewTag: {
    display: "inline-block", borderRadius: 999, padding: "4px 10px",
    fontSize: 12, fontWeight: 500, lineHeight: 1.3,
  },
  typeBadge: {
    display: "inline-block", borderRadius: 999, padding: "5px 14px",
    fontSize: 12, fontWeight: 600, background: "#ede9fe", color: "#6f3bd6",
  },
  // alerts
  alert: {
    display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", gap: 10,
    borderRadius: 14, padding: 13, border: "1px solid", alignItems: "flex-start",
  },
  alertTitle: { display: "block", fontSize: 13, lineHeight: 1.25, fontWeight: 600 },
  alertText: { margin: "3px 0 0", fontSize: 12, lineHeight: 1.45 },
  alertTone: {
    warning: { color: "#8a5a12", background: "#fff8e7", borderColor: "rgba(227,180,77,0.38)" },
    success: { color: "#2f7d4d", background: "#eef9f2", borderColor: "rgba(88,169,120,0.38)" },
    info:    { color: "#4a5a85", background: "#f1f4ff", borderColor: "rgba(138,155,214,0.38)" },
    danger:  { color: "#a33e3e", background: "#fff2f2", borderColor: "rgba(207,101,101,0.34)" },
  },
  // toast
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 200,
    background: "#1f2937", color: "#ffffff", borderRadius: 12,
    padding: "12px 18px", display: "flex", alignItems: "center",
    gap: 10, fontSize: 13, fontWeight: 500,
    boxShadow: "0 12px 32px rgba(15,23,42,0.22)", pointerEvents: "none",
  },
  loading: {
    minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center",
    justifyContent: "center", color: "#5f6fa3", fontSize: 14,
  },
};
