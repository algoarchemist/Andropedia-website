import { z } from "zod";

/** Profile-picture limits and checks shared by the upload route and the tests. The browser shrinks photos before sending them. */
export const MAX_PHOTO_BYTES = 400 * 1024;

export type PhotoMime = "image/jpeg" | "image/png" | "image/webp";

/** Reads the real file type from the first bytes (the Content-Type header can say anything). */
export function sniffPhotoType(bytes: Uint8Array): PhotoMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const startsWith = (offset: number, text: string) => text.split("").every((c, i) => bytes[offset + i] === c.charCodeAt(0));
  if (bytes.length >= 8 && bytes[0] === 0x89 && startsWith(1, "PNG")) return "image/png";
  if (bytes.length >= 12 && startsWith(0, "RIFF") && startsWith(8, "WEBP")) return "image/webp";
  return null;
}

/**
 * Accepts "https://www.linkedin.com/in/name", "linkedin.com/in/name" or "www.linkedin.com/in/name".
 * Returns the cleaned https URL, "" for an empty value (clears the field) or null when it isn't a LinkedIn link.
 */
export function normalizeLinkedin(value: string): string | "" | null {
  const text = value.trim();
  if (!text) return "";
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
  if (url.pathname.replace(/\//g, "").length === 0) return null;
  return `https://${host}${url.pathname.replace(/\/+$/, "")}`;
}

/**
 * A profile on `domain` from a full link, a link without "https://" or a bare handle ("@name" or "name").
 * Returns the clean https URL (tracking parameters dropped), or null when the value is empty or not a profile on that site.
 */
function normalizeProfile(value: string, domain: string, handle: RegExp): string | null {
  const text = value.trim();
  if (!text) return null;
  if (handle.test(text.replace(/^@/, ""))) return `https://${domain}/${text.replace(/^@/, "")}`;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== domain) return null;
  const name = url.pathname.split("/").filter(Boolean)[0];
  return name && handle.test(name) ? `https://${domain}/${name}` : null;
}

export const normalizeGithub = (value: string) => normalizeProfile(value, "github.com", /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/);
export const normalizeInstagram = (value: string) => normalizeProfile(value, "instagram.com", /^[A-Za-z0-9._]{1,30}$/);

export const memberPhotoUrl = (userId: string, version: number | Date = Date.now()) =>
  `/api/member-photo/user/${encodeURIComponent(userId)}?v=${typeof version === "number" ? version : version.getTime()}`;

/** Form field: a LinkedIn link, cleaned. An empty string clears it. */
export const linkedinField = z
  .string()
  .max(300)
  .transform((value, ctx) => {
    const cleaned = normalizeLinkedin(value);
    if (cleaned === null) ctx.addIssue({ code: "custom", message: "Paste a LinkedIn profile link (linkedin.com/in/...)." });
    return cleaned ?? "";
  });

/** Builds a form field from a link cleaner: a cleaned link, an empty string to clear it, or a validation message. */
const profileField = (clean: (value: string) => string | null, message: string) =>
  z
    .string()
    .max(300)
    .transform((value, ctx) => {
      if (!value.trim()) return "";
      const cleaned = clean(value);
      if (cleaned === null) ctx.addIssue({ code: "custom", message });
      return cleaned ?? "";
    });

/** Form field: a GitHub profile link or username, cleaned. An empty string clears it. */
export const githubField = profileField(normalizeGithub, "Paste your GitHub profile link or username.");

/** Form field: an Instagram profile link or handle, cleaned. An empty string clears it. */
export const instagramField = profileField(normalizeInstagram, "Paste your Instagram profile link or handle.");
