import { describe, expect, it } from "vitest";
import { memberPhotoUrl, normalizeLinkedin, sniffPhotoType } from "@/lib/member-profile";
import { checkMemberDelete } from "@/lib/rules";

describe("normalizeLinkedin", () => {
  it("accepts a full link, a bare domain and www", () => {
    expect(normalizeLinkedin("https://www.linkedin.com/in/nithin-rao/")).toBe("https://www.linkedin.com/in/nithin-rao");
    expect(normalizeLinkedin("linkedin.com/in/nithin-rao")).toBe("https://linkedin.com/in/nithin-rao");
    expect(normalizeLinkedin("  http://in.linkedin.com/in/x  ")).toBe("https://in.linkedin.com/in/x");
  });
  it("treats an empty value as 'clear it'", () => {
    expect(normalizeLinkedin("   ")).toBe("");
  });
  it("rejects other sites, look-alike hosts, other schemes and links with no profile", () => {
    for (const bad of ["https://github.com/x", "https://evil-linkedin.com/in/x", "https://linkedin.com.evil.io/in/x", "javascript:alert(1)", "https://linkedin.com/", "not a url"]) {
      expect(normalizeLinkedin(bad), bad).toBeNull();
    }
  });
});

describe("sniffPhotoType", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(sniffPhotoType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("image/jpeg");
    expect(sniffPhotoType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffPhotoType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });
  it("rejects everything else, whatever the file is called", () => {
    expect(sniffPhotoType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffPhotoType(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(sniffPhotoType(new Uint8Array())).toBeNull();
  });
});

it("builds a cache-busting photo URL", () => {
  expect(memberPhotoUrl("abc", 5)).toBe("/api/member-photo/user/abc?v=5");
});

describe("checkMemberDelete", () => {
  const admin = { id: "root", role: "super_admin" as const, isActive: true };
  const member = { id: "m1", role: "member" as const, isActive: true };
  it("allows removing an ordinary member", () => {
    expect(checkMemberDelete({ actorId: "root", target: member, activeSuperAdmins: 1 })).toBeNull();
  });
  it("blocks removing yourself", () => {
    expect(checkMemberDelete({ actorId: "root", target: admin, activeSuperAdmins: 3 })).toMatch(/your own/);
  });
  it("keeps at least one active super admin", () => {
    expect(checkMemberDelete({ actorId: "other", target: admin, activeSuperAdmins: 1 })).toMatch(/At least one/);
    expect(checkMemberDelete({ actorId: "other", target: admin, activeSuperAdmins: 2 })).toBeNull();
  });
});
