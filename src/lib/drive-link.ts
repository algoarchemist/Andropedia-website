// Members hand in their files as a Google Drive share link instead of uploading them here.
const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

/** True for an https link to Google Drive (files, folders) or Docs/Sheets/Slides. */
export function isDriveUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && DRIVE_HOSTS.has(url.hostname);
}
