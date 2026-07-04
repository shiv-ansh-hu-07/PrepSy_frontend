import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppSideNav from "../components/AppSideNav";
import {
  fetchMyAnalytics,
  fetchMyProfile,
  updateMyProfile,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

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
  { key: "lookingFor", label: "Collaboration preference" },
  { key: "availability", label: "Availability" },
];

const emptyProfile = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  avatarUrl: "",
  bio: "",
  age: "",
  gender: "",
  goals: [],
  interests: [],
  skills: [],
  languages: [],
  examTargets: [],
  lookingFor: [],
  availability: [],
  city: "",
  state: "",
  country: "",
  timezone: "",
  institutionType: "",
  institutionName: "",
  degree: "",
  branch: "",
  semester: "",
  expectedGraduation: "",
  company: "",
  role: "",
  experienceLevel: "",
  workMode: "",
  collaborationPreference: "",
  portfolioUrl: "",
  linkedinUrl: "",
  githubUrl: "",
  isDiscoverable: true,
};

export default function Profile() {
  const { refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(emptyProfile);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1080 : false
  );

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
        setProfile(normalizeProfile(profileResp.profile));
        setAnalytics(analyticsResp.analytics);
      } catch (err) {
        if (!cancelled) {
          setProfile(
            normalizeProfile({
              fullName: user?.name || "",
              email: user?.email || "",
              avatarUrl: user?.avatarUrl || "",
            })
          );
          setError(err?.response?.data?.message || "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.avatarUrl, user?.email, user?.name]);

  const missingRequired = useMemo(() => getMissingRequired(profile), [profile]);
  const missingRecommendations = useMemo(
    () => getMissingRecommendations(profile),
    [profile]
  );
  const completionPercent = getLocalCompletionPercent(profile);
  const stats = analytics?.summary || {};
  const initials = getInitials(profile.fullName || profile.email || "PrepSy");

  function updateField(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");
    setError("");

    const missing = getMissingRequired(profile);
    if (missing.length > 0) {
      const message = `Please fill required fields: ${missing.join(", ")}.`;
      setNotice(message);
      window.alert(message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...profile,
        age: profile.age ? Number(profile.age) : null,
      };
      const response = await updateMyProfile(payload);
      setProfile(normalizeProfile(response.profile));
      setNotice("Profile saved. These details can now power friend and group recommendations.");
      await refreshUser();
    } catch (err) {
      const missing = err?.response?.data?.missingRequiredFields;
      const message = Array.isArray(missing)
        ? `Please fill required fields: ${missing.join(", ")}.`
        : err?.response?.data?.message || "Unable to save your profile.";
      setError(message);
      window.alert(message);
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
              <p style={styles.subtitle}>
                Manage your identity, learning goals, and matching preferences.
              </p>
            </div>

            <button
              type="submit"
              form="profile-form"
              disabled={saving}
              style={styles.saveButton(saving)}
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </header>

          {missingRequired.length > 0 ? (
            <AlertPanel
              tone="warning"
              title="Complete required profile details"
              text={`Please add ${missingRequired.join(", ")} so PrepSy can recommend useful study partners and groups.`}
            />
          ) : (
            <AlertPanel
              tone="success"
              title="Required profile details are complete"
              text="Your profile has enough information for basic matching."
            />
          )}

          {missingRecommendations.length > 0 ? (
            <AlertPanel
              tone="info"
              title="Improve recommendations"
              text={`Add ${missingRecommendations.slice(0, 4).join(", ")} for better city, interest, and institution-based matching.`}
            />
          ) : null}

          {notice ? <AlertPanel tone="success" title="Saved" text={notice} /> : null}
          {error ? <AlertPanel tone="danger" title="Profile alert" text={error} /> : null}

          <div style={styles.contentGrid(isNarrow)}>
            <aside style={styles.profileCard}>
              <div style={styles.avatarWrap}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" style={styles.avatarImage} />
                ) : (
                  <div style={styles.avatarFallback}>{initials}</div>
                )}
                <div style={styles.cameraBadge}>
                  <Camera size={15} />
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
                <MiniStat
                  icon={Clock3}
                  label="Focus Time"
                  value={stats.totalFocusLabel || "0m"}
                />
                <MiniStat
                  icon={CheckCircle2}
                  label="Sessions"
                  value={stats.sessionsCompleted || 0}
                />
                <MiniStat
                  icon={ShieldCheck}
                  label="Discoverable"
                  value={profile.isDiscoverable ? "On" : "Off"}
                />
              </div>

              <button
                type="button"
                onClick={() => navigate("/analytics")}
                style={styles.secondaryButton}
              >
                <BarChart3 size={17} />
                View Analytics
              </button>
            </aside>

            <form id="profile-form" onSubmit={handleSubmit} style={styles.formPanel}>
              <Section icon={UserRound} title="Basic Information">
                <div style={styles.fieldGrid}>
                  <Field label="Full Name" required>
                    <input
                      value={profile.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      placeholder="Your full name"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Username">
                    <input
                      value={profile.username}
                      onChange={(event) => updateField("username", cleanUsername(event.target.value))}
                      placeholder="prepsy_user"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Email">
                    <input value={profile.email} readOnly style={styles.inputReadOnly} />
                  </Field>

                  <Field label="Phone Number">
                    <input
                      value={profile.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      placeholder="+91 98765 43210"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Profile Photo URL">
                    <input
                      value={profile.avatarUrl}
                      onChange={(event) => updateField("avatarUrl", event.target.value)}
                      placeholder="Paste a public image URL"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Age" required>
                    <input
                      type="number"
                      min="13"
                      max="100"
                      value={profile.age || ""}
                      onChange={(event) => updateField("age", event.target.value)}
                      placeholder="21"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Gender" required>
                    <select
                      value={profile.gender}
                      onChange={(event) => updateField("gender", event.target.value)}
                      style={styles.input}
                    >
                      <option value="">Select gender</option>
                      <option value="woman">Woman</option>
                      <option value="man">Man</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </Field>
                </div>

                <Field label="Bio">
                  <textarea
                    value={profile.bio}
                    onChange={(event) => updateField("bio", event.target.value.slice(0, 180))}
                    placeholder="I love solving problems, building things, and studying consistently."
                    rows={4}
                    style={styles.textarea}
                  />
                  <p style={styles.helperText}>{profile.bio.length}/180</p>
                </Field>
              </Section>

              <Section icon={GraduationCap} title="I Am A">
                <div style={styles.segmentGrid}>
                  <SegmentCard
                    icon={GraduationCap}
                    title="School Student"
                    description="Class, board, and exam prep"
                    active={profile.institutionType === "school"}
                    onClick={() => updateField("institutionType", "school")}
                  />
                  <SegmentCard
                    icon={GraduationCap}
                    title="College Student"
                    description="Course, semester, and branch"
                    active={
                      profile.institutionType === "college" ||
                      profile.institutionType === "student"
                    }
                    onClick={() => updateField("institutionType", "college")}
                  />
                  <SegmentCard
                    icon={BriefcaseBusiness}
                    title="Working Professional"
                    description="Learning while working"
                    active={profile.institutionType === "working_professional"}
                    onClick={() => updateField("institutionType", "working_professional")}
                  />
                  <SegmentCard
                    icon={Sparkles}
                    title="Self Learner"
                    description="Preparing independently"
                    active={profile.institutionType === "self_learner"}
                    onClick={() => updateField("institutionType", "self_learner")}
                  />
                </div>
              </Section>

              {profile.institutionType === "working_professional" ? (
                <Section
                  icon={BriefcaseBusiness}
                  title="Working Professional Details"
                  caption="Used for career-stage matching, interview practice, and work-friendly study groups."
                >
                  <div style={styles.fieldGrid}>
                    <Field label="Company">
                      <input
                        value={profile.company}
                        onChange={(event) => updateField("company", event.target.value)}
                        placeholder="Company or organization"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Role">
                      <input
                        value={profile.role}
                        onChange={(event) => updateField("role", event.target.value)}
                        placeholder="Software Engineer, Analyst"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Experience Level">
                      <select
                        value={profile.experienceLevel}
                        onChange={(event) => updateField("experienceLevel", event.target.value)}
                        style={styles.input}
                      >
                        <option value="">Select level</option>
                        <option value="fresher">Fresher</option>
                        <option value="0-2">0-2 years</option>
                        <option value="3-5">3-5 years</option>
                        <option value="5-plus">5+ years</option>
                      </select>
                    </Field>
                    <Field label="Work Mode">
                      <select
                        value={profile.workMode}
                        onChange={(event) => updateField("workMode", event.target.value)}
                        style={styles.input}
                      >
                        <option value="">Select work mode</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="onsite">On-site</option>
                      </select>
                    </Field>
                    <Field label="Career Track">
                      <input
                        value={profile.degree}
                        onChange={(event) => updateField("degree", event.target.value)}
                        placeholder="Backend, frontend, data, product"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Target Timeline">
                      <input
                        value={profile.expectedGraduation}
                        onChange={(event) =>
                          updateField("expectedGraduation", event.target.value)
                        }
                        placeholder="Switching by Dec 2026"
                        style={styles.input}
                      />
                    </Field>
                  </div>
                </Section>
              ) : null}

              {profile.institutionType === "school" ? (
                <Section
                  icon={GraduationCap}
                  title="School Details"
                  caption="Separate school profile fields for class, board, stream, and school-based matching."
                >
                  <div style={styles.fieldGrid}>
                    <Field label="School Name">
                      <input
                        value={profile.institutionName}
                        onChange={(event) => updateField("institutionName", event.target.value)}
                        placeholder="Your school name"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Class / Grade">
                      <input
                        value={profile.semester}
                        onChange={(event) => updateField("semester", event.target.value)}
                        placeholder="Class 10, Class 12"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Board">
                      <select
                        value={profile.degree}
                        onChange={(event) => updateField("degree", event.target.value)}
                        style={styles.input}
                      >
                        <option value="">Select board</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="State Board">State Board</option>
                        <option value="IB">IB</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field label="Stream">
                      <input
                        value={profile.branch}
                        onChange={(event) => updateField("branch", event.target.value)}
                        placeholder="Science, Commerce, Arts"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Target Exams">
                      <TagInput
                        value={profile.examTargets}
                        onChange={(next) => updateField("examTargets", next)}
                        placeholder="JEE, NEET, boards, olympiad"
                      />
                    </Field>
                  </div>
                </Section>
              ) : null}

              {profile.institutionType === "college" ||
              profile.institutionType === "student" ? (
                <Section
                  icon={GraduationCap}
                  title="College Details"
                  caption="Useful for matching people by college, course, semester, and branch."
                >
                  <div style={styles.fieldGrid}>
                    <Field label="College / University">
                      <input
                        value={profile.institutionName}
                        onChange={(event) => updateField("institutionName", event.target.value)}
                        placeholder="College or university"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Degree / Course">
                      <input
                        value={profile.degree}
                        onChange={(event) => updateField("degree", event.target.value)}
                        placeholder="B.Tech, B.Sc, MBA"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Semester / Year">
                      <input
                        value={profile.semester}
                        onChange={(event) => updateField("semester", event.target.value)}
                        placeholder="4th Semester"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Branch / Major">
                      <input
                        value={profile.branch}
                        onChange={(event) => updateField("branch", event.target.value)}
                        placeholder="Computer Science"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Expected Graduation">
                      <input
                        value={profile.expectedGraduation}
                        onChange={(event) =>
                          updateField("expectedGraduation", event.target.value)
                        }
                        placeholder="May 2026"
                        style={styles.input}
                      />
                    </Field>
                  </div>
                </Section>
              ) : null}

              {profile.institutionType === "self_learner" ? (
                <Section
                  icon={Sparkles}
                  title="Self Learner Setup"
                  caption="Helps PrepSy recommend independent learners with similar goals and schedules."
                >
                  <div style={styles.fieldGrid}>
                    <Field label="Learning Track">
                      <input
                        value={profile.degree}
                        onChange={(event) => updateField("degree", event.target.value)}
                        placeholder="Full-stack, DSA, design, aptitude"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Current Level">
                      <select
                        value={profile.semester}
                        onChange={(event) => updateField("semester", event.target.value)}
                        style={styles.input}
                      >
                        <option value="">Select level</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </Field>
                    <Field label="Primary Platform">
                      <input
                        value={profile.institutionName}
                        onChange={(event) => updateField("institutionName", event.target.value)}
                        placeholder="YouTube, Coursera, LeetCode, offline"
                        style={styles.input}
                      />
                    </Field>
                    <Field label="Target Timeline">
                      <input
                        value={profile.expectedGraduation}
                        onChange={(event) =>
                          updateField("expectedGraduation", event.target.value)
                        }
                        placeholder="3 months, before placements"
                        style={styles.input}
                      />
                    </Field>
                  </div>
                </Section>
              ) : null}

              <Section
                icon={MapPin}
                title="Location Context"
                caption="City and timezone help recommend nearby collaborators and compatible schedules."
              >
                <div style={styles.fieldGrid}>
                  <Field label="Timezone">
                    <input
                      value={profile.timezone}
                      onChange={(event) => updateField("timezone", event.target.value)}
                      placeholder="Asia/Kolkata"
                      style={styles.input}
                    />
                  </Field>
                  <Field label="City">
                    <input
                      value={profile.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      placeholder="New Delhi"
                      style={styles.input}
                    />
                  </Field>
                  <Field label="State">
                    <input
                      value={profile.state}
                      onChange={(event) => updateField("state", event.target.value)}
                      placeholder="Delhi"
                      style={styles.input}
                    />
                  </Field>
                  <Field label="Country">
                    <input
                      value={profile.country}
                      onChange={(event) => updateField("country", event.target.value)}
                      placeholder="India"
                      style={styles.input}
                    />
                  </Field>
                </div>
              </Section>

              <Section
                icon={Users}
                title="Collaboration Matching"
                caption="These fields will help recommend friends, groups, rooms, and study partners."
              >
                <div style={styles.fieldGrid}>
                  <Field label="Goals" required>
                    <TagInput
                      value={profile.goals}
                      onChange={(next) => updateField("goals", next)}
                      placeholder="DSA, placements, GATE, UPSC"
                    />
                  </Field>
                  <Field label="Interests">
                    <TagInput
                      value={profile.interests}
                      onChange={(next) => updateField("interests", next)}
                      placeholder="web dev, system design, aptitude"
                    />
                  </Field>
                  <Field label="Skills">
                    <TagInput
                      value={profile.skills}
                      onChange={(next) => updateField("skills", next)}
                      placeholder="Java, React, SQL, communication"
                    />
                  </Field>
                  <Field label="Languages">
                    <TagInput
                      value={profile.languages}
                      onChange={(next) => updateField("languages", next)}
                      placeholder="English, Hindi"
                    />
                  </Field>
                  <Field label="Exam / Career Targets">
                    <TagInput
                      value={profile.examTargets}
                      onChange={(next) => updateField("examTargets", next)}
                      placeholder="JEE, CAT, SDE internships"
                    />
                  </Field>
                  <Field label="Looking For">
                    <TagInput
                      value={profile.lookingFor}
                      onChange={(next) => updateField("lookingFor", next)}
                      placeholder="accountability partner, project team"
                    />
                  </Field>
                  <Field label="Availability">
                    <TagInput
                      value={profile.availability}
                      onChange={(next) => updateField("availability", next)}
                      placeholder="weekday nights, weekends"
                    />
                  </Field>
                  <Field label="Collaboration Style">
                    <select
                      value={profile.collaborationPreference}
                      onChange={(event) =>
                        updateField("collaborationPreference", event.target.value)
                      }
                      style={styles.input}
                    >
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
                  <input
                    type="checkbox"
                    checked={profile.isDiscoverable}
                    onChange={(event) =>
                      updateField("isDiscoverable", event.target.checked)
                    }
                  />
                  <span>
                    Let PrepSy use this profile for future friend, group, and room
                    recommendations.
                  </span>
                </label>
              </Section>

              <Section icon={MapPin} title="Links">
                <div style={styles.fieldGrid}>
                  <Field label="Portfolio URL">
                    <input
                      value={profile.portfolioUrl}
                      onChange={(event) => updateField("portfolioUrl", event.target.value)}
                      placeholder="https://your-site.com"
                      style={styles.input}
                    />
                  </Field>
                  <Field label="LinkedIn URL">
                    <input
                      value={profile.linkedinUrl}
                      onChange={(event) => updateField("linkedinUrl", event.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      style={styles.input}
                    />
                  </Field>
                  <Field label="GitHub URL">
                    <input
                      value={profile.githubUrl}
                      onChange={(event) => updateField("githubUrl", event.target.value)}
                      placeholder="https://github.com/..."
                      style={styles.input}
                    />
                  </Field>
                </div>
              </Section>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

function AlertPanel({ tone, title, text }) {
  const toneStyle = styles.alertTone[tone] || styles.alertTone.info;
  return (
    <div style={{ ...styles.alert, ...toneStyle }}>
      <AlertCircle size={18} style={styles.alertIcon} />
      <div style={styles.alertBody}>
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
          <Icon size={18} />
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
        {required ? <strong> *</strong> : null}
      </span>
      {children}
    </label>
  );
}

function TagInput({ value, onChange, placeholder }) {
  return (
    <div>
      <input
        value={(value || []).join(", ")}
        onChange={(event) => onChange(parseList(event.target.value))}
        placeholder={placeholder}
        style={styles.input}
      />
      <p style={styles.helperText}>Separate multiple values with commas.</p>
    </div>
  );
}

function SegmentCard({ icon: Icon, title, description, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={styles.segment(active)}>
      <span style={styles.segmentIcon(active)}>
        <Icon size={22} />
      </span>
      <span style={styles.segmentText}>
        <strong style={styles.segmentTitle}>{title}</strong>
        <small style={styles.segmentDescription}>{description}</small>
      </span>
      <span style={styles.segmentCheck(active)}>
        {active ? <CheckCircle2 size={18} /> : null}
      </span>
    </button>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div style={styles.miniStat}>
      <span style={styles.miniStatIcon}>
        <Icon size={17} />
      </span>
      <div style={styles.miniStatText}>
        <strong style={styles.miniStatValue}>{value}</strong>
        <span style={styles.miniStatLabel}>{label}</span>
      </div>
    </div>
  );
}

function normalizeProfile(profile) {
  return {
    ...emptyProfile,
    ...(profile || {}),
    age: profile?.age || "",
    institutionType: profile?.institutionType === "student"
      ? "college"
      : profile?.institutionType || "",
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
    .filter((field) => {
      const value = profile[field.key];
      return Array.isArray(value) ? value.length === 0 : !String(value || "").trim();
    })
    .map((field) => field.label);
}

function getLocalCompletionPercent(profile) {
  const tracked = [
    "fullName",
    "age",
    "gender",
    "goals",
    "interests",
    "city",
    "institutionType",
    "institutionName",
    "lookingFor",
    "availability",
    "skills",
    "languages",
  ];
  const complete = tracked.filter((field) => {
    const value = profile[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(String(value || "").trim());
  }).length;
  return Math.round((complete / tracked.length) * 100);
}

function getMissingRecommendations(profile) {
  return recommendationFields
    .filter((field) => {
      const value = profile[field.key];
      return Array.isArray(value) ? value.length === 0 : !String(value || "").trim();
    })
    .map((field) => field.label);
}

function parseList(value) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 16)
    )
  );
}

function getInitials(value) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? parts.map((part) => part[0]?.toUpperCase()).join("").slice(0, 2)
    : "PS";
}

function cleanUsername(value) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
}

const styles = {
  page: {
    minHeight: "calc(100vh - 76px)",
    background:
      "radial-gradient(ellipse at top, #eef1fb 0%, #f4f6fd 46%, #f8f9fe 100%)",
    padding: "32px 24px 56px",
  },
  layout: (isNarrow) => ({
    width: "100%",
    maxWidth: 1360,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "288px minmax(0, 1fr)",
    gap: 24,
    alignItems: "start",
  }),
  main: {
    display: "grid",
    gap: 18,
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    minWidth: 0,
  },
  eyebrow: {
    margin: 0,
    color: "#7a89b8",
    fontWeight: 800,
    fontSize: 12,
  },
  title: {
    margin: "6px 0",
    fontFamily: "Georgia, serif",
    fontSize: 36,
    lineHeight: 1.1,
    color: "#2f3b63",
  },
  subtitle: {
    margin: 0,
    color: "#65749f",
    fontSize: 15,
  },
  saveButton: (saving) => ({
    height: 46,
    padding: "0 18px",
    borderRadius: 14,
    border: "none",
    background: saving ? "#b6c0e4" : "linear-gradient(135deg, #8a9bd6, #6f7fc0)",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    fontWeight: 800,
    cursor: saving ? "wait" : "pointer",
    boxShadow: "0 12px 26px rgba(111,127,192,0.24)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  }),
  contentGrid: (isNarrow) => ({
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(270px, 300px) minmax(0, 1fr)",
    gap: 22,
    alignItems: "start",
  }),
  profileCard: {
    borderRadius: 24,
    border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.82)",
    boxShadow: "0 16px 42px rgba(74,90,133,0.1)",
    padding: 22,
    display: "grid",
    justifyItems: "center",
    gap: 12,
    position: "sticky",
    top: 98,
    width: "100%",
    boxSizing: "border-box",
  },
  avatarWrap: {
    position: "relative",
    width: 116,
    height: 116,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #ffffff",
    boxShadow: "0 12px 30px rgba(74,90,133,0.16)",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #8a9bd6, #eef2ff)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 34,
    fontWeight: 900,
    border: "4px solid #ffffff",
    boxShadow: "0 12px 30px rgba(74,90,133,0.16)",
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#7c3aed",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "3px solid #ffffff",
  },
  profileName: {
    margin: "6px 0 0",
    color: "#1f2937",
    fontSize: 22,
    lineHeight: 1.2,
    textAlign: "center",
    overflowWrap: "anywhere",
  },
  profileHandle: {
    margin: 0,
    color: "#65749f",
    fontSize: 13,
    textAlign: "center",
    overflowWrap: "anywhere",
  },
  profileBio: {
    margin: "8px 0 2px",
    color: "#4a5a85",
    fontSize: 13,
    lineHeight: 1.55,
    textAlign: "center",
  },
  completionBlock: {
    width: "100%",
    borderTop: "1px solid rgba(190,200,235,0.42)",
    paddingTop: 14,
    marginTop: 4,
  },
  completionTopline: {
    display: "flex",
    justifyContent: "space-between",
    color: "#4a5a85",
    fontSize: 13,
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    background: "#e8edf9",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #8a9bd6, #6f7fc0)",
  },
  sideStats: {
    width: "100%",
    display: "grid",
    gap: 10,
    marginTop: 6,
  },
  miniStat: {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr)",
    alignItems: "center",
    gap: 10,
    color: "#5f6fa3",
    background: "#f5f7ff",
    border: "1px solid rgba(190,200,235,0.42)",
    borderRadius: 16,
    padding: 12,
    minWidth: 0,
    boxSizing: "border-box",
  },
  miniStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef2ff",
    color: "#6f7fc0",
  },
  miniStatText: {
    minWidth: 0,
    display: "grid",
    gap: 2,
  },
  miniStatValue: {
    color: "#2f3b63",
    fontSize: 15,
    lineHeight: 1.1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  miniStatLabel: {
    color: "#65749f",
    fontSize: 12,
    lineHeight: 1.25,
  },
  secondaryButton: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    border: "1px solid rgba(138,155,214,0.55)",
    color: "#5f6fa3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 800,
    cursor: "pointer",
    boxSizing: "border-box",
  },
  formPanel: {
    borderRadius: 24,
    border: "1px solid rgba(190,200,235,0.52)",
    background: "rgba(255,255,255,0.84)",
    boxShadow: "0 16px 42px rgba(74,90,133,0.1)",
    padding: 22,
    display: "grid",
    gap: 24,
    minWidth: 0,
    boxSizing: "border-box",
  },
  section: {
    display: "grid",
    gap: 16,
    paddingBottom: 20,
    borderBottom: "1px solid rgba(190,200,235,0.4)",
  },
  sectionHeader: {
    display: "grid",
    gap: 5,
    minWidth: 0,
  },
  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#6f3bd6",
    minWidth: 0,
  },
  sectionTitle: {
    margin: 0,
    color: "#6f3bd6",
    fontSize: 16,
    fontWeight: 900,
  },
  sectionCaption: {
    margin: 0,
    color: "#65749f",
    fontSize: 13,
    lineHeight: 1.45,
    maxWidth: 720,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    columnGap: 18,
    rowGap: 16,
  },
  field: {
    display: "grid",
    gap: 7,
    minWidth: 0,
  },
  label: {
    color: "#4a5a85",
    fontSize: 13,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(190,200,235,0.7)",
    background: "#ffffff",
    color: "#1f2937",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  inputReadOnly: {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(190,200,235,0.5)",
    background: "#f6f8ff",
    color: "#65749f",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(190,200,235,0.7)",
    background: "#ffffff",
    color: "#1f2937",
    padding: "12px",
    fontSize: 14,
    lineHeight: 1.6,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },
  helperText: {
    margin: "3px 0 0",
    color: "#7a89b8",
    fontSize: 12,
  },
  segmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  segment: (active) => ({
    minHeight: 78,
    borderRadius: 16,
    border: active ? "1px solid #7c3aed" : "1px solid rgba(190,200,235,0.62)",
    background: active ? "rgba(124,58,237,0.06)" : "#ffffff",
    color: "#2f3b63",
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr) 22px",
    alignItems: "center",
    gap: 12,
    padding: 14,
    cursor: "pointer",
    boxSizing: "border-box",
    minWidth: 0,
  }),
  segmentIcon: (active) => ({
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: active ? "#7c3aed" : "#7a89b8",
    background: active ? "#ede9fe" : "#f1f4ff",
  }),
  segmentCheck: (active) => ({
    color: active ? "#7c3aed" : "transparent",
    display: "flex",
    justifyContent: "flex-end",
  }),
  segmentText: {
    display: "grid",
    gap: 4,
    minWidth: 0,
    textAlign: "left",
  },
  segmentTitle: {
    color: "#2f3b63",
    fontSize: 14,
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  segmentDescription: {
    color: "#65749f",
    fontSize: 12,
    lineHeight: 1.3,
  },
  toggleRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    color: "#4a5a85",
    fontSize: 13,
    lineHeight: 1.5,
    padding: 14,
    borderRadius: 14,
    background: "#f6f8ff",
    border: "1px solid rgba(190,200,235,0.45)",
  },
  alert: {
    display: "grid",
    gridTemplateColumns: "20px minmax(0, 1fr)",
    gap: 10,
    borderRadius: 16,
    padding: 14,
    border: "1px solid",
    alignItems: "flex-start",
  },
  alertIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  alertBody: {
    minWidth: 0,
  },
  alertTitle: {
    display: "block",
    fontSize: 13,
    lineHeight: 1.25,
  },
  alertText: {
    margin: "4px 0 0",
    fontSize: 13,
    lineHeight: 1.45,
  },
  alertTone: {
    warning: {
      color: "#8a5a12",
      background: "#fff8e7",
      borderColor: "rgba(227,180,77,0.38)",
    },
    success: {
      color: "#2f7d4d",
      background: "#eef9f2",
      borderColor: "rgba(88,169,120,0.38)",
    },
    info: {
      color: "#4a5a85",
      background: "#f1f4ff",
      borderColor: "rgba(138,155,214,0.38)",
    },
    danger: {
      color: "#a33e3e",
      background: "#fff2f2",
      borderColor: "rgba(207,101,101,0.34)",
    },
  },
  loading: {
    minHeight: "calc(100vh - 160px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#5f6fa3",
    fontWeight: 800,
  },
};
