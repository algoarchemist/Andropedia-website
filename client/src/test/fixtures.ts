import type { DraftData } from '../state/draft';

/** Raw step values that pass youSchema and domainSchema. */
export const validYou = {
  name: 'Asha Rao',
  registerNumber: 'ra2211003010001',
  email: 'asha@srmist.edu.in',
  phone: '98765 43210',
  department: 'CSE',
  section: 'a1',
} satisfies DraftData;

export const validDomain = { domainPref1: 'TECHNICAL', domainPref2: 'DESIGN' } satisfies DraftData;

/** Passes aboutSchema (stage 02 part b). */
export const validAbout = {
  aboutYou: 'I take radios apart and mostly put them back.',
  whyDomain: 'I like shipping things people use.',
  skills: 'React, Python and a soldering iron.',
  techStack: ['React'],
  outsideAcademics: 'Football on weekends.',
  whyAndropedia: 'Good people and real projects.',
  oneYearVision: 'Leading a small project team.',
} satisfies DraftData;

/** Passes workSchema (stage 03). The photo id must be a uuid. */
export const validWork = {
  workUrl: 'https://github.com/asha',
  achievements: [{ title: 'Hackathon', description: 'Second place.' }],
  photoId: '6f1c2b1e-8d5a-4c3e-9f7a-2b4c6d8e0a1b',
  photoUrl: 'http://127.0.0.1:4173/stub-photo.png',
} satisfies DraftData;

/** Passes usSchema (stage 04). */
export const validUs = {
  hoursPerWeek: 4,
  responsibility: 3,
  inOtherClub: false,
  clubShouldProvide: 'Real projects and mentors.',
} satisfies DraftData;

/** Every step up to step 06. */
export const validThroughUs = { ...validYou, ...validDomain, ...validAbout, ...validWork, ...validUs } satisfies DraftData;
