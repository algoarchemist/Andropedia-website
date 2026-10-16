"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarCheck, CalendarDays, Camera, CheckCircle2, CheckSquare, Clock, ExternalLink, Flame, Mail, Pencil, Trophy } from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { MemberAvatar } from "@/components/portal/MemberEditor";
import { PhotoCropper } from "@/components/portal/PhotoCropper";
import { GithubIcon, InstagramIcon, LinkedinIcon } from "@/components/ui/SocialIcons";
import { useAuth } from "@/lib/auth-context";
import { POSITION_LABELS } from "@/lib/team";

const BIO_MAX = 600;

interface MemberAttendanceData {
  attended: Array<{ id: string; kind: "event" | "club_hour"; title: string; heldOn: string; hours: number | null }>;
  sessionsHeld: number;
  attendedCount: number;
  clubHours: number;
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

const LINK_FIELDS = [
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/your-name", Icon: LinkedinIcon },
  { key: "github", label: "GitHub", placeholder: "github.com/your-username", Icon: GithubIcon },
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/your-handle", Icon: InstagramIcon },
] as const;
/** Anything bigger than this is not a photo worth opening in the browser. */
const MAX_PICK_BYTES = 40 * 1024 * 1024;

export default function ProfilePage() {
  const { currentUser, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState({ linkedin: "", github: "", instagram: "" });
  const [attendance, setAttendance] = useState<MemberAttendanceData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // Consecutive days signed in, and all days signed in. Counted on the server, the same way the leaderboard counts them.
  const [streak, setStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/me/streak", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        setStreak(data.streak);
        setTotalDays(data.totalDays);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/me/attendance", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) setAttendance(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSaved, setPhotoSaved] = useState(false);
  const [pickError, setPickError] = useState("");

  const pickPhoto = (file: File | undefined) => {
    setPickError("");
    setPhotoSaved(false);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPickError("Choose an image file (JPEG, PNG or WebP).");
    if (file.size > MAX_PICK_BYTES) return setPickError("That file is too large to open. Choose a photo under 40 MB.");
    setPhotoError("");
    setPicked(file);
  };

  const uploadPhoto = async (photo: Blob) => {
    setPhotoError("");
    setUploading(true);
    try {
      const res = await fetch("/api/me/photo", { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: photo });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refreshUser();
        setPicked(null);
        setPhotoSaved(true);
      } else {
        setPhotoError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setPhotoError("Network error. Please try again.");
    }
    setUploading(false);
  };

  const startEditing = () => {
    setBio(currentUser?.bio ?? "");
    setLinks({ linkedin: currentUser?.linkedin ?? "", github: currentUser?.github ?? "", instagram: currentUser?.instagram ?? "" });
    setErrorMsg("");
    setSaved(false);
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, ...links }), // an empty link clears it
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refreshUser();
        setEditing(false);
        setSaved(true);
      } else {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setSaving(false);
  };

  const attendedCount = attendance?.attendedCount ?? 0;
  const attendancePercent = attendance && attendance.sessionsHeld > 0 ? Math.min(100, Math.round((attendedCount / attendance.sessionsHeld) * 100)) : 0;

  const user = currentUser;
  const title = user ? `${user.position && user.position !== "member" ? POSITION_LABELS[user.position] : "Member"}, ${user.domain}` : "";
  const stats = [
    { label: "Points", value: user?.points ?? 0, icon: Trophy, color: "text-amber-300" },
    { label: "Tasks done", value: user?.tasksCompleted ?? 0, icon: CheckSquare, color: "text-emerald-300" },
    { label: "Day streak", value: streak, icon: Flame, color: "text-rose-300" },
    { label: "Days logged in", value: totalDays, icon: CalendarCheck, color: "text-sky-300" },
  ];

  return (
    <PortalAccessGate>
      <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
        <PortalNav />
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
          {user && (
            <div className="glass-card space-y-6 p-6 sm:p-8">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="relative shrink-0">
                  <MemberAvatar member={user} className="h-24 w-24 rounded-3xl border border-cyan-400/30" />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    aria-label="Change profile photo"
                    className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/40 bg-slate-950 text-emerald-300 shadow-lg hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(e) => {
                      pickPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-aurora break-words text-[26px] font-semibold tracking-[-0.5px]">{user.name}</h1>
                  <p className="mt-1 text-sm text-slate-300">{title}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className="inline-flex items-center gap-1.5 break-all rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-mono text-slate-300">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {user.email}
                    </span>
                    {LINK_FIELDS.filter((f) => user[f.key]).map(({ key, label, Icon }) => (
                      <a
                        key={key}
                        href={user[key]}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-mono text-sky-300 hover:bg-sky-500/20"
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {(photoSaved || pickError) && (
                <div
                  role={pickError ? "alert" : "status"}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-[13px] ${pickError ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}
                >
                  {pickError ? <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span>{pickError || "Your photo is updated. It can take a minute to show on the Our Team page."}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
                    <Icon className={`mx-auto mb-1 h-4 w-4 ${color}`} aria-hidden="true" />
                    <div className={`font-mono text-xl font-black ${color}`}>{value}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-400">{label}</div>
                  </div>
                ))}
              </div>

              <section aria-labelledby="about-heading" className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="about-heading" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">About me</h2>
                  {!editing && (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                  )}
                </div>

                {saved && !editing && (
                  <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Your profile is updated. It can take a minute to show on the Our Team page.</span>
                  </div>
                )}

                {editing ? (
                  <form onSubmit={save} className="space-y-3">
                    {errorMsg && (
                      <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[13px] text-rose-200">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                    <label htmlFor="bio" className="sr-only">About me</label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={BIO_MAX}
                      rows={6}
                      placeholder="Tell the club about yourself: what you build, what you are learning, what you enjoy."
                      className="w-full resize-y rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/40 transition-colors focus:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 sm:text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      {LINK_FIELDS.map(({ key, label, placeholder, Icon }) => (
                        <div key={key} className="space-y-1">
                          <label htmlFor={`link-${key}`} className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/60">
                            <Icon className="h-3 w-3" /> {label}
                          </label>
                          <input
                            id={`link-${key}`}
                            type="text"
                            inputMode="url"
                            autoComplete="off"
                            value={links[key]}
                            onChange={(e) => setLinks((l) => ({ ...l, [key]: e.target.value }))}
                            maxLength={300}
                            placeholder={placeholder}
                            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none sm:text-xs"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[12px] text-white/40">Links show on the Our Team page. Leave one empty to remove it.</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] text-white/40">{bio.length}/{BIO_MAX}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-60">
                          Cancel
                        </button>
                        <button type="submit" disabled={saving} className="btn-glow disabled:opacity-60">
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="whitespace-pre-line break-words text-sm leading-6 text-white/80">
                    {user.bio || "You have not written anything yet. Click Edit to add a short about."}
                  </p>
                )}
              </section>

              <section aria-labelledby="attendance-heading" className="space-y-3 border-t border-white/10 pt-6">
                <h2 id="attendance-heading" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">Attendance</h2>
                {!attendance ? (
                  <p className="text-sm text-white/50">Loading your attendance...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Total sessions", value: String(attendance.sessionsHeld), color: "text-sky-300" },
                        { label: "Attended", value: String(attendedCount), color: "text-emerald-300" },
                        { label: "Attendance", value: `${attendancePercent}%`, color: attendancePercent >= 75 ? "text-emerald-300" : attendancePercent >= 50 ? "text-amber-300" : "text-rose-300" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
                          <div className={`font-mono text-xl font-black ${color}`}>{value}</div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-400">{label}</div>
                        </div>
                      ))}
                    </div>
                    {attendance.clubHours > 0 && (
                      <p className="text-[12px] text-white/50">
                        <b className="text-white/80">{attendance.clubHours}</b> club {attendance.clubHours === 1 ? "hour" : "hours"} attended
                      </p>
                    )}
                    {attendance.attended.length === 0 ? (
                      <p className="text-sm text-white/50">No attendance has been marked for you yet.</p>
                    ) : (
                      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {attendance.attended.map((a) => (
                          <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              {a.kind === "event" ? <CalendarDays className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" /> : <Clock className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />}
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-white">{a.title}</div>
                                <div className="text-[11px] text-slate-400">
                                  {a.kind === "event" ? "Event" : "Club hour"} · {dateFormat.format(new Date(a.heldOn))}
                                  {a.kind === "club_hour" && a.hours ? ` · ${a.hours} h` : ""}
                                </div>
                              </div>
                            </div>
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-label="Present" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
      {picked && <PhotoCropper file={picked} busy={uploading} error={photoError} onCancel={() => setPicked(null)} onConfirm={uploadPhoto} />}
    </PortalAccessGate>
  );
}
