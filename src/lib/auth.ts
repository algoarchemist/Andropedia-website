import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, normalizeRegisterNo, verifyPassword } from "./password";
import { prisma } from "./prisma";
import { mapUser } from "./data-store";
import type { RoleType, User } from "./types";

export const SESSION_COOKIE = "andropedia_session";
const SESSION_DAYS = 14;
const SESSION_TOUCH_MS = 5 * 60 * 1000;
const MAX_SESSIONS_PER_USER = 10;

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

// ---------------------------------------------------------------- sessions

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt: expires } });

  // Keep at most MAX_SESSIONS_PER_USER sessions: the oldest ones are signed out.
  const stale = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_SESSIONS_PER_USER,
    select: { id: true },
  });
  if (stale.length > 0) await prisma.session.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  return { token, expires };
}

export function setSessionCookie(res: NextResponse, token: string, expires: Date) {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
}

/** The logged-in user from the session cookie, or null. */
export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (Date.now() - session.lastUsedAt.getTime() > SESSION_TOUCH_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  }
  return mapUser(session.user);
}

export async function destroyCurrentSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

/** Signs the user out everywhere except the browser making this request. */
export async function revokeOtherSessions(userId: string): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await prisma.session.deleteMany({ where: { userId, ...(token ? { tokenHash: { not: sha256(token) } } : {}) } });
}

// ------------------------------------------------------------- route guard

type AuthResult = { ok: true; user: User } | { ok: false; response: NextResponse };

const deny = (error: string, status: number, code?: string): AuthResult => ({
  ok: false,
  response: NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status }),
});

/** Blocks cross-site form posts: a browser-sent Origin must match this host. */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, server-to-server)
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Use at the top of every protected route:
 *   const auth = await requireUser(request, ["super_admin"]);
 *   if (!auth.ok) return auth.response;
 *
 * An account still on its default password (mustChangePassword) is refused everywhere except the route that changes the
 * password (`allowPasswordChange`), so the default password alone never opens the portal.
 */
export async function requireUser(request: NextRequest, roles?: RoleType[], opts: { allowPasswordChange?: boolean } = {}): Promise<AuthResult> {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOrigin(request)) {
    return deny("Cross-site request blocked.", 403);
  }
  const user = await getSessionUser();
  if (!user) return deny("Please log in to continue.", 401);
  if (user.mustChangePassword && !opts.allowPasswordChange) return deny("Choose a new password before you continue.", 403, "PASSWORD_CHANGE_REQUIRED");
  if (roles && !roles.includes(user.role)) return deny("Your club role does not have access to this.", 403);
  return { ok: true, user };
}

// ------------------------------------------------------------- register number + password

// Checked against when the register number is unknown, so a miss costs the same time as a wrong password.
let decoyHash: string | undefined;

/** Checks a register number and password; on success returns the user and a fresh session. */
export async function loginWithPassword(
  rawRegisterNo: string,
  password: string
): Promise<{ user: User; token: string; expires: Date } | null> {
  const registerNo = normalizeRegisterNo(rawRegisterNo);
  const user = await prisma.user.findUnique({ where: { registerNo } });
  const passwordOk = verifyPassword(password, user?.passwordHash ?? (decoyHash ??= hashPassword("decoy")));
  if (!user || !user.isActive || !passwordOk) return null;

  const session = await createSession(user.id);
  return { user: mapUser(user), ...session };
}
