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
