// Club website: the team, from the club's former site (andropedia.vercel.app), October 2026. The owner will send
// corrections; edit here. Names are written in title case (the former site had some in capitals). Mission lines are
// the former site's division briefs, rewritten in this site's voice with the same meaning.
import type { DomainId } from '../constants';

/** Public profile links. All optional: Androlink shows what a person has chosen to share. */
export type PersonLinks = { github?: string; linkedin?: string; portfolio?: string; instagram?: string };

export type Person = { name: string; links?: PersonLinks };
export type Lead = Person & { role: 'Lead' | 'Co-lead' };
export type CoreMember = Person & { role: string };

export type Division = {
  domain: DomainId;
  mission: string;
  leads: readonly Lead[];
  members: readonly Person[];
};

export const CORE_TEAM: readonly CoreMember[] = [
  { name: 'Kamashwara Dhanasekar', role: 'President' },
  { name: 'Janar Preethika', role: 'Technical Mentor' },
  { name: 'Vishwanathan Sivaraman', role: 'Chief Photographer' },
];

export const DIVISIONS: readonly Division[] = [
  {
    domain: 'TECHNICAL',
    mission: "We build the club's tech backbone: Cloud, AI and Machine Learning, hands-on.",
    leads: [
      { name: 'Santhosh S', role: 'Lead' },
      { name: 'Mukesh Kumar', role: 'Co-lead' },
    ],
    members: [
      { name: 'Bhavishya' },
      { name: 'Devadharshini P' },
      { name: 'Gopica' },
      { name: 'Kaushal Kartikeya' },
      { name: 'Mifra' },
      { name: 'Nishit Patnaik' },
      { name: 'Sejal Bheda' },
      { name: 'Srinath' },
      { name: 'Vishita Thomas' },
    ],
  },
  {
    domain: 'MEDIA',
    mission: "The club's eyes: we shoot, cut and tell our story so it sticks.",
    leads: [
      { name: 'Sai Vishnu Kandur C', role: 'Lead' },
      { name: 'Ramya Shree', role: 'Co-lead' },
    ],
    members: [
      { name: 'Dhatri Sahu' },
      { name: 'Haneesh' },
      { name: 'Pavan Kalyan' },
      { name: 'Pon Infant Raja' },
      { name: 'Srija Mandal' },
      { name: 'Sulagno Jana' },
      { name: 'Tanvi' },
      { name: 'Vishita Thomas' },
    ],
  },
  {
    domain: 'DESIGN',
    mission: 'Where precision meets artistic chaos. Every poster, reel and screen starts here.',
    leads: [
      { name: 'Kaaviyasree', role: 'Lead' },
      { name: 'Kaavya', role: 'Lead' },
      { name: 'Siddartha', role: 'Co-lead' },
    ],
    members: [{ name: 'Aashwanth' }, { name: 'Sanjai Baiju' }, { name: 'Vinith' }],
  },
  {
    domain: 'PR',
    mission: 'We connect student talent with the people and companies who should see it.',
    leads: [{ name: 'Hareeswar Reddy G', role: 'Co-lead' }],
    members: [{ name: 'Jiya Ashiga' }, { name: 'Kameshwari R' }, { name: 'Manvi Srivastava' }, { name: 'Sudhikshaasri' }],
  },
  {
    domain: 'RND',
    mission: 'Out at the edge, turning ideas into things that actually work.',
    leads: [{ name: 'Adithya Tripathi S', role: 'Lead' }],
    members: [{ name: 'Prithviraj' }],
  },
];
