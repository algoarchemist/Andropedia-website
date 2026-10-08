// Club website: one entry per person across the core team and every division (docs/CLUB-SITE.md). Someone listed in
// two divisions (the former site has Vishita Thomas in Technical and Media) appears once with both.
import { CORE_TEAM, DIVISIONS, DOMAINS, type DomainId, type PersonLinks } from '@andropedia/shared';

export type DirectoryEntry = { name: string; roles: string[]; domains: DomainId[]; links: PersonLinks };

export const domainName = (id: DomainId) => DOMAINS.find((d) => d.id === id)?.name ?? id;

/** "Sai Vishnu Kandur C" becomes "SV": the avatar square's letters. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function directory(): DirectoryEntry[] {
  const people = new Map<string, DirectoryEntry>();
  const add = (name: string, role: string, domain: DomainId | undefined, links: PersonLinks | undefined) => {
    const entry = people.get(name) ?? { name, roles: [], domains: [], links: {} };
    if (!entry.roles.includes(role)) entry.roles.push(role);
    if (domain && !entry.domains.includes(domain)) entry.domains.push(domain);
    entry.links = { ...entry.links, ...links };
    people.set(name, entry);
  };
  for (const person of CORE_TEAM) add(person.name, person.role, undefined, person.links);
  for (const division of DIVISIONS) {
    const name = domainName(division.domain);
    for (const lead of division.leads) add(lead.name, `${name} ${lead.role.toLowerCase()}`, division.domain, lead.links);
    for (const member of division.members) add(member.name, name, division.domain, member.links);
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
}
