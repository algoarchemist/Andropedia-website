import type { DomainType, RoleType } from "../types";

// Who may read and decide recruitment applications. Leads (the "domain_admin" role) handle the domain they lead; super admins
// handle every domain. Free of any database code so it can be tested directly.

/** The `Application.domain` value for a club domain. R&D is not on the application form, so it has none. */
const APPLICATION_DOMAIN: Record<DomainType, string | null> = {
  Technical: "technical",
  Web: "web",
  Design: "design",
  Media: "media",
  PR: "pr",
  "R&D": null,
};

export type ApplicationScope =
  /** Every domain. */
  | { kind: "all" }
  /** One domain, or none at all (`domain: null`) when the lead's domain takes no applications. */
  | { kind: "domain"; domain: string | null };

/** Null when the role has no access to applications. */
export function applicationScope(user: { role: RoleType; domain: DomainType }): ApplicationScope | null {
  if (user.role === "super_admin") return { kind: "all" };
  if (user.role === "domain_admin") return { kind: "domain", domain: APPLICATION_DOMAIN[user.domain] };
  return null;
}

export function canAccessApplication(scope: ApplicationScope, applicationDomain: string): boolean {
  return scope.kind === "all" || scope.domain === applicationDomain;
}
