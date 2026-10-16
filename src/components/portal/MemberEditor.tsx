"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { shrinkImage } from "@/lib/image-shrink";
import type { ClubPosition, DomainType, RoleType, User } from "@/lib/types";

const input = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-emerald-400/60 focus:outline-none";
const DOMAINS: DomainType[] = ["Technical", "Web", "R&D", "Design", "Media", "PR"];
const POSITIONS: Array<[ClubPosition, string]> = [
  ["member", "Member"],
  ["co_lead", "Co-Lead"],
  ["lead", "Lead"],
  ["chief", "Chief"],
  ["vice_president", "Vice President"],
  ["president", "President"],
];
const ROLES: Array<[RoleType, string]> = [
  ["member", "Member"],
  ["domain_admin", "Domain lead (can grade)"],
  ["super_admin", "Super admin"],
];

/** Photo with an initials placeholder when the member has none (or it fails to load). */
export function MemberAvatar({ member, className = "h-9 w-9 rounded-xl" }: { member: Pick<User, "name" | "avatar">; className?: string }) {
  const [failedSrc, setFailedSrc] = useState("");
  if (member.avatar && failedSrc !== member.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img loading="lazy" decoding="async" src={member.avatar} alt={member.name} onError={() => setFailedSrc(member.avatar)} className={`${className} object-cover object-top`} />;
  }
  const initials = member.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <span role="img" aria-label={member.name} className={`${className} inline-flex shrink-0 items-center justify-center bg-emerald-500/15 text-xs font-bold text-emerald-200`}>
      {initials || "?"}
    </span>
  );
}

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || "Something went wrong. Please try again.");
  return data;
}

const json = (body: unknown, method: string): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

interface Props {
  /** Omit to add a new member. */
  member?: User;
  /** `message` is shown to the admin; the saved member replaces the one in the list. */
  onSaved: (member: User, message: string, tone?: "success" | "error") => void;
  onCancel: () => void;
}

/** Add a member, or edit one: details, domain, roles, LinkedIn, description and picture, all from the portal. */
export function MemberEditor({ member, onSaved, onCancel }: Props) {
  const editing = !!member;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: member?.name ?? "",
    email: member?.email ?? "",
    registerNo: "",
    domain: member?.domain ?? "Web",
    position: member?.position ?? "member",
    role: member?.role ?? "member",
    linkedin: member?.linkedin ?? "",
    bio: member?.bio ?? "",
  });
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Choose an image file (JPEG, PNG or WebP).");
    if (file.size > 15 * 1024 * 1024) return setError("That image is over 15 MB. Choose a smaller one.");
    try {
      const blob = await shrinkImage(file, { maxEdge: 512, square: true, quality: 0.88 });
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
      setRemovePhoto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    let saved: User;
    try {
      const profile = { name: form.name, domain: form.domain, position: form.position, role: form.role, linkedin: form.linkedin, bio: form.bio };
      saved = member
        ? ((await call(`/api/admin/members/${member.id}`, json(profile, "PATCH"))).member as User)
        : ((await call("/api/admin/members", json({ ...profile, email: form.email, registerNo: form.registerNo }, "POST"))).member as User);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the member.");
      setBusy(false);
      return;
    }

    // The member is saved from here on. A picture problem is reported but doesn't undo that.
    const done = editing ? `Saved ${saved.name}.` : `${saved.name} was added and can log in with their register number.`;
    try {
      if (photo) {
        saved = (await call(`/api/admin/members/${saved.id}/photo`, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: photo.blob })).member as User;
      } else if (removePhoto && member?.avatar) {
        saved = (await call(`/api/admin/members/${saved.id}/photo`, { method: "DELETE" })).member as User;
      }
      onSaved(saved, done);
    } catch (err) {
      onSaved(saved, `${done} The picture was not saved: ${err instanceof Error ? err.message : "upload failed"}. Edit the member to try again.`, "error");
    }
  };

  const shownAvatar = photo ? photo.preview : removePhoto ? "" : member?.avatar ?? "";

  return (
    <form id="member-editor" onSubmit={submit} className="grid gap-4 border-b border-white/10 bg-slate-950/50 px-6 py-5 sm:grid-cols-6">
      <div className="flex items-center gap-4 sm:col-span-6">
        <MemberAvatar member={{ name: form.name || "New member", avatar: shownAvatar }} className="h-20 w-20 rounded-2xl" />
        <div className="space-y-2">
          <p className="text-sm font-bold text-white">{member ? `Edit ${member.name}` : "Add a new member"}</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 focus-within:border-emerald-400/60 hover:border-emerald-400/40">
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              {shownAvatar ? "Change picture" : "Upload picture"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {(photo || (member?.avatar && !removePhoto)) && (
              <button type="button" onClick={() => { setPhoto(null); setRemovePhoto(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:border-rose-400/40">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove picture
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Any photo works: it is cropped to a square and shrunk automatically.</p>
        </div>
      </div>

      <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Name
        <input className={input} required minLength={2} maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Email
        <input className={`${input} disabled:opacity-60`} type="email" required maxLength={160} disabled={editing} value={form.email} onChange={(e) => set("email", e.target.value)} />
      </label>
      <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Register number{editing ? " (login)" : ""}
        <input className={`${input} disabled:opacity-60`} required={!editing} disabled={editing} minLength={6} maxLength={30} value={editing ? "Set when added" : form.registerNo} onChange={(e) => set("registerNo", e.target.value)} placeholder="RA2511026020025" />
      </label>
      <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Domain
        <select className={input} value={form.domain} onChange={(e) => set("domain", e.target.value)}>
          {DOMAINS.map((d) => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Team position
        <select className={input} value={form.position} onChange={(e) => set("position", e.target.value)}>
          {POSITIONS.map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Portal role
        <select className={input} value={form.role} onChange={(e) => set("role", e.target.value)}>
          {ROLES.map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-xs text-slate-300 sm:col-span-6">LinkedIn
        <input className={input} type="text" inputMode="url" maxLength={300} value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://www.linkedin.com/in/their-name" />
      </label>
      <label className="space-y-1 text-xs text-slate-300 sm:col-span-6">Description
        <textarea className={`${input} min-h-24 resize-y`} maxLength={600} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="A line or two about them, shown on the Team page." />
        <span className="block text-right text-[11px] text-slate-500">{form.bio.length}/600</span>
      </label>

      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 sm:col-span-6">{error}</p>}
      <div className="flex gap-2 sm:col-span-6">
        <button type="submit" disabled={busy} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-60">{busy ? "Saving..." : editing ? "Save changes" : "Add member"}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300">Cancel</button>
      </div>
    </form>
  );
}
