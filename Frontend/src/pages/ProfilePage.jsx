import { useState, useRef,useEffect } from "react";
import { Camera, Save, Key, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTask } from "../context/TaskContext";
import { Avatar } from "../components/UI";
import { formatDate } from "../utils/helpers";
import {
  updateProfile,
  changePassword,
  uploadProfilePicture,
} from "../api/UserService";
import toast from "react-hot-toast";

// ─── Small reusable field wrapper ─────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

// ─── Password input with show/hide toggle ────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`field-input pr-9 ${error ? "error" : ""}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ─── Password strength indicator ─────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: "8+ chars",        pass: password.length >= 8 },
    { label: "Uppercase",       pass: /[A-Z]/.test(password) },
    { label: "Number",          pass: /\d/.test(password) },
    { label: "Special char",   pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400"];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : "bg-gray-100"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-[10px] flex items-center gap-0.5 ${
              c.pass ? "text-green-600" : "text-gray-400"
            }`}
          >
            <CheckCircle2 size={9} className={c.pass ? "text-green-500" : "text-gray-300"} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { tasks } = useTask();
  const fileInputRef = useRef(null);

  // ── Stats — computed from tasks array, same as original page ──────────────
  const myTasks    = tasks.filter((t) => t.assignedToUserId === user?.id);
  const completed  = myTasks.filter((t) => t.status === "Completed").length;
  const inProgress = myTasks.filter((t) => t.status === "InProgress").length;
  const overdue    = myTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed"
  ).length;

  const stats = [
    { label: "Assigned",    value: myTasks.length },
    { label: "Completed",   value: completed,  color: "text-green-600" },
    { label: "In progress", value: inProgress, color: "text-brand-600" },
    { label: "Overdue",     value: overdue,    color: overdue > 0 ? "text-red-500" : "text-gray-800" },
  ];

  // ── Bio form — independent, does NOT require password ─────────────────────
  const [bio,       setBio]       = useState(user?.bio ?? "");
  const [bioSaving, setBioSaving] = useState(false);

  // ── Password form — independent, does NOT touch bio ───────────────────────
  const [pw,       setPw]       = useState({ current: "", next: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview,   setAvatarPreview]   = useState(user?.profilePictureUrl ?? null);

useEffect(() => {
  setBio(user?.bio ?? "");
}, [user?.bio]);  // re-syncs whenever user.bio changes in context

useEffect(() => {
  setAvatarPreview(user?.profilePictureUrl ?? null);
}, [user?.profilePictureUrl]);  // re-syncs whenever profilePictureUrl changes
  

  // ── Save bio ───────────────────────────────────────────────────────────────
  const handleSaveBio = async () => {
    setBioSaving(true);
    try {
      await updateProfile({ bio: bio.trim() });
      await refreshUser?.();
      toast.success("Bio updated.");
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to save bio.");
    } finally {
      setBioSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    const errs = {};
    if (!pw.current)             errs.current = "Current password is required.";
    if (pw.next.length < 8)      errs.next    = "Minimum 8 characters.";
    if (pw.next !== pw.confirm)  errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwSaving(true);
    try {
      await changePassword({
        currentPassword:    pw.current,
        newPassword:        pw.next,
        confirmNewPassword: pw.confirm,
      });
      toast.success("Password changed. Other sessions have been signed out.");
      setPw({ current: "", next: "", confirm: "" });
      setPwErrors({});
    } catch (err) {
      const msg = err?.response?.data?.error ?? err?.response?.data ?? "Failed to change password.";
      toast.error(msg);
    } finally {
      setPwSaving(false);
    }
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max file size is 2 MB."); return; }
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarUploading(true);
    try {
      await uploadProfilePicture(file);
      await refreshUser?.();
      toast.success("Profile picture updated.");
    } catch (err) {
      setAvatarPreview(user?.profilePictureUrl ?? null);
      toast.error(err?.response?.data?.error ?? "Upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() || "??";

  return (
    /*
     * Two-column layout that fills the fixed viewport height.
     * Left col = identity card (fixed height hero).
     * Right col = two stacked forms, each taking ~50% of height.
     * No scrolling required.
     */
    <div className="page-enter h-full flex flex-col gap-4 min-h-0">

      {/* Page title — minimal, one line */}
      <div className="flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-400">Manage your account settings</p>
      </div>

      {/* Main 2-col grid — fills remaining height */}
      <div className="flex-1 grid grid-cols-[300px_1fr] gap-4 min-h-0">

        {/* ── LEFT: Identity card ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Avatar + name hero */}
          <div className="card p-5 flex flex-col items-center text-center gap-3">
            {/* Avatar */}
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100"
                />
              ) : (
                <Avatar initials={initials} size="xl" color="blue" />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                title="Change photo"
              >
                <Camera size={11} className="text-gray-500" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name */}
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
              {user?.designation && (
                <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                  {user.designation}
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400">
              Member since {formatDate(user?.createdAt)}
            </p>
          </div>

          {/* Task stats grid */}
          <div className="card p-4 grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                <p className={`text-xl font-bold ${s.color ?? "text-gray-800"}`}>
                  {s.value}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Name locked notice */}
          <div className="card p-4 flex gap-2.5 items-start">
            <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              First and last name can only be changed by an <span className="font-semibold text-gray-700">admin</span>. Contact your admin if you need to update them.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Two stacked form cards ────────────────────────────── */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Personal info + bio */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Personal information</h2>
            </div>

            <div className="space-y-3">
              {/* Locked name + email row */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="First name">
                  <input
                    disabled
                    className="field-input disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
                    value={user?.firstName ?? ""}
                    readOnly
                  />
                </Field>
                <Field label="Last name">
                  <input
                    disabled
                    className="field-input disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
                    value={user?.lastName ?? ""}
                    readOnly
                  />
                </Field>
                <Field label="Email address">
                  <input
                    disabled
                    type="email"
                    className="field-input disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
                    value={user?.email ?? ""}
                    readOnly
                  />
                </Field>
              </div>

              {/* Bio — editable, with its own save button right below */}
              <Field label="Bio">
                <textarea
                  className="field-input resize-none"
                  rows={3}
                  placeholder="Tell your team a bit about yourself…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-300">{bio.length}/300</span>
                  <button
                    className="btn-primary py-1.5 text-xs"
                    onClick={handleSaveBio}
                    disabled={bioSaving}
                  >
                    <Save size={12} />
                    {bioSaving ? "Saving…" : "Save bio"}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* Password form */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50 flex-shrink-0">
              <Key size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Change password</h2>
            </div>

            <div className="space-y-3">
              <Field label="Current password" error={pwErrors.current}>
                <PasswordInput
                  value={pw.current}
                  onChange={(e) => { setPw((p) => ({ ...p, current: e.target.value })); setPwErrors((e2) => ({ ...e2, current: "" })); }}
                  placeholder="••••••••"
                  error={pwErrors.current}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="New password" error={pwErrors.next}>
                  <PasswordInput
                    value={pw.next}
                    onChange={(e) => { setPw((p) => ({ ...p, next: e.target.value })); setPwErrors((e2) => ({ ...e2, next: "" })); }}
                    placeholder="Min 8 characters"
                    error={pwErrors.next}
                  />
                  <PasswordStrength password={pw.next} />
                </Field>
                <Field label="Confirm new password" error={pwErrors.confirm}>
                  <PasswordInput
                    value={pw.confirm}
                    onChange={(e) => { setPw((p) => ({ ...p, confirm: e.target.value })); setPwErrors((e2) => ({ ...e2, confirm: "" })); }}
                    placeholder="Repeat password"
                    error={pwErrors.confirm}
                  />
                  {pw.confirm && pw.next && (
                    <p className={`text-[10px] mt-1.5 flex items-center gap-1 ${pw.confirm === pw.next ? "text-green-600" : "text-red-400"}`}>
                      <CheckCircle2 size={9} />
                      {pw.confirm === pw.next ? "Passwords match" : "Passwords don't match"}
                    </p>
                  )}
                </Field>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  className="btn-primary"
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                >
                  <Key size={13} />
                  {pwSaving ? "Updating…" : "Update password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
