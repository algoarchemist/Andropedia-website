import type { ApplicationRow } from '../db';

/** ADM-01 column order: id, createdAt, status, then PRD 8.2 payload order (photoId becomes photoUrl), then derived. */
export const CSV_COLUMNS = [
  'id', 'createdAt', 'status',
  'name', 'registerNumber', 'email', 'phone', 'department', 'section',
  'domainPref1', 'domainPref2',
  'aboutYou', 'whyDomain', 'skills', 'techStack', 'outsideAcademics', 'whyAndropedia', 'oneYearVision',
  'workUrl', 'portfolioUrl', 'achievements', 'photoUrl',
  'hoursPerWeek', 'responsibility', 'inOtherClub', 'otherClubs', 'clubShouldProvide',
  'rememberUs',
  'admissionYear',
] as const;

type Column = (typeof CSV_COLUMNS)[number];

/** `RA2211003010123` becomes `2022`: "20" plus the two digits after `RA`. */
export function admissionYear(registerNumber: string): string {
  return `20${registerNumber.slice(2, 4)}`;
}

const INJECTION_LEADERS = /^[=+\-@\t\r]/;

/** Escapes one cell: neutralise formula injection, then apply RFC 4180 quoting. */
export function csvCell(value: unknown): string {
  let text = value === undefined || value === null ? '' : String(value);
  if (INJECTION_LEADERS.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(rows: ApplicationRow[], absoluteUrl: (url: string) => string): string {
  const toRecord = (row: ApplicationRow): Record<Column, unknown> => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    name: row.name,
    registerNumber: row.registerNumber,
    email: row.email,
    phone: row.phone,
    department: row.department,
    section: row.section,
    domainPref1: row.domainPref1,
    domainPref2: row.domainPref2,
    aboutYou: row.aboutYou,
    whyDomain: row.whyDomain,
    skills: row.skills,
    techStack: row.techStack.join('; '),
    outsideAcademics: row.outsideAcademics,
    whyAndropedia: row.whyAndropedia,
    oneYearVision: row.oneYearVision,
    workUrl: row.workUrl,
    portfolioUrl: row.portfolioUrl,
    achievements: row.achievements.map((a) => `${a.title}: ${a.description}`).join(' | '),
    photoUrl: absoluteUrl(row.photoUrl),
    hoursPerWeek: row.hoursPerWeek,
    responsibility: row.responsibility,
    inOtherClub: row.inOtherClub ? 'yes' : 'no',
    otherClubs: row.otherClubs,
    clubShouldProvide: row.clubShouldProvide,
    rememberUs: row.rememberUs,
    admissionYear: admissionYear(row.registerNumber),
  });

  const lines = [CSV_COLUMNS.join(',')];
  for (const row of rows) {
    const record = toRecord(row);
    lines.push(CSV_COLUMNS.map((c) => csvCell(record[c])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
