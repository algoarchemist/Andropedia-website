// PRD section 9. All user-facing text lives here. Do not paraphrase.
// Keys tagged `// added` were not in the original brief.
// Domain names and taglines live in DOMAINS (constants.ts), not here.

export const copy = {
  brand: {
    name: 'Andropedia', // added, LND-01
  },
  hero: {
    l1: "WE'RE LOOKING FOR",
    l2: 'THE NEXT BUNCH OF WEIRDOS',
    l3: 'DESIGNERS | DEVELOPERS | BUILDERS',
    l4: 'PROBLEM SOLVERS | CHAOS MANAGERS',
  },
  cta: {
    apply: 'Apply now',
  },
  about: {
    title: 'What we do',
    body: 'TODO_CONTENT', // needs owner
    stepTitle: 'Tell us about yourself',
    notFound: 'error 404: boring application not found',
    self: 'Tell us about yourself',
    whyDomain: 'Why did you pick {domain}?',
    skills: 'What are the skills you can flex?',
    skillsHelp: 'No experience? No problem.',
    stack: 'Tech stack you are interested in?',
    stackHelp: 'Everyone starts from somewhere.',
    outside: 'Something you do outside academics',
    outsideHelp: "Good at something we didn't list? We're listening.",
    whyClub: 'Why Andropedia?',
    oneYear: 'Where do you see yourself in 1 year after joining this club?',
  },
  domains: {
    title: 'Domains', // added
  },
  process: {
    title: 'Recruitment process',
    steps: [
      'Register',
      'Preliminary task submission',
      'Shortlist for interview',
      'Online interview',
      "Woohoo you're a member",
    ],
  },
  modal: {
    title: 'Error 404',
    body: 'Boring applications are not accepted',
    continue: "I'm not boring. Let me in.", // added
    close: 'Close', // added, accessible name of the close icon
  },
  closed: {
    body: 'Applications are closed. Catch us next round.', // added
  },
  footer: {
    body: 'TODO_CONTENT', // added, LND-09 (P2), needs owner: Instagram and contact links
  },
  nav: {
    next: 'Next', // added
    back: 'Back', // added
  },
  draft: {
    restored: 'Picked up where you left off.', // added
    reset: 'Start over', // added
  },
  you: {
    title: 'Who are you?',
    name: 'Name',
    regno: 'Register Number',
    email: 'Email',
    phone: 'Contact number',
    department: 'Department',
    section: 'Section',
  },
  domain: {
    title: 'Domain selection',
    pref1: 'Preference 1',
    pref2: 'Preference 2',
    prompt: 'Pick a domain', // added
    pref2Reset: "That's already your first pick. Choose a different second one.", // added
  },
  work: {
    title: 'Show us your work',
    link: 'Show us your work (Drive link / GitHub profile)',
    portfolio: 'Portfolio / LinkedIn (optional)',
    proud: 'Something you are proud of / Achievements',
    proudTitle: 'Title', // added
    proudDesc: 'Tell us more', // added
    photo: 'Drop a pic of yourself in your best drip',
    empty: {
      link: '+ Pin your work', // added
      proud: "+ Pin something you're proud of", // added
      photo: '+ Pin your best drip', // added
    },
  },
  us: {
    title: 'Team & Commitment',
    hours: 'How many hours/week can you dedicate to the club?', // edited
    responsibility: 'How comfortable are you taking responsibility for an event/task?', // edited
    respLow: 'Not at all',
    respHigh: 'Always',
    sliderPrompt: 'Slide to answer', // added
    otherClub: 'Are you part of any other club, now or before?', // edited
    otherClubList: 'If yes, mention them',
    goodClub: 'What do you think a good technical club should provide its members?',
  },
  last: {
    title: 'One last thing',
    intro: "We've gone through your application.",
    remember: 'In 30 words, tell us why we should remember you.', // edited
    submit: 'Submit application', // added
    sending: 'Sending it to the core team...', // added
  },
  done: {
    title: 'We have received your application.',
    body: 'Join our community and stay tuned for the domain challenges.',
    whatsapp: 'Join the WhatsApp community', // added
    signoff: 'See you around, {firstName}.', // added, P2
  },
  notfound: {
    body: 'Error 404: this page is as boring as it gets. Go back home.', // added
  },
  err: {
    required: "This one's required.", // added
    email: "That email doesn't look right.", // added
    phone: 'Enter a 10 digit mobile number.', // added
    regno: 'Register number is RA followed by 13 digits.', // added
    url: 'Paste a full link starting with https://', // added
    minLength: 'Give us a little more than that.', // added
    words: '30 words max. Make every word count.', // added
    duplicate: "This register number or email has already applied. We'll be in touch.", // added
    photoType: 'Use a JPG, PNG, WebP or HEIC photo.', // added
    photoSize: 'That photo is over 8 MB. Try a smaller one.', // added
    network: "Couldn't reach us. Your answers are saved, try again.", // added
    server: 'Something broke on our side. Try again in a bit.', // added
    rateLimit: 'Too many tries. Give it a little while and try again.', // added
    unauthorized: 'Not allowed.', // added
  },
} as const;

/** Fills `{placeholder}` tokens, e.g. fmt(copy.about.whyDomain, { domain: 'Design' }). */
export function fmt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}
