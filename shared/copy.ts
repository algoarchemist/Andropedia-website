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
    nudge: 'Keep scrolling. The apply button is waiting at the bottom.', // added, OD-02: the hero has no Apply now
  },
  cta: {
    apply: 'Apply now',
    lead: "Still reading? That's weird. We like weird.", // added
    reassure: 'No experience needed. Your answers save as you go.', // added
  },
  about: {
    title: 'What we do',
    // Owner-supplied text, rewritten in the site voice (LND-03).
    body: "Andropedia isn't just a club. It's your way into real tech.",
    bodyMore: 'Lectures hand you the theory. We help you turn it into things that actually work, built the way the industry builds them.', // added
    bodyCrew: 'Six domains, one very weird crew: coders, designers, storytellers, hype makers and tinkerers. Together we go hands-on with Cloud, AI and Machine Learning through programs like SKYLINX.', // added
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
    stackRemove: 'Remove {tag}', // added, screen reader name of a tag's remove button
    stackFull: 'That is {max} tags. Remove one to add another.', // added
    stackList: 'Your tags', // added, screen reader name of the tag list
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
  // Owner request: only answers the site itself backs up (the form, the process, the success screen). Club facts
  // such as eligibility, deadline, time commitment, cost and results date wait for the owner.
  faq: {
    title: 'Questions? Fair enough.', // added
    items: [
      {
        q: 'Do I need experience?',
        a: "Nope. No experience needed, just curiosity. Show us what you've tried, even the messy stuff.",
      },
      {
        q: 'Why do I pick two domains?',
        a: "Your first pick is the one you want most and your second is the backup. We'll ask why you chose the first one, so pick the one you really mean.",
      },
      {
        q: 'What do I need before I start?',
        a: "Your register number, email and phone number, a photo of yourself, a link to your work (GitHub, Drive or a portfolio) and at least one thing you're proud of. That's it.",
      },
      {
        q: 'Can I stop halfway and finish later?',
        a: "Yes. Your answers save as you type. Come back on the same phone or laptop, in the same browser, and you'll pick up right where you left off.",
      },
      {
        q: 'What happens after I apply?',
        a: 'Next up: a task for your domain, then a shortlist, then an online interview. Join our community from the screen you see after submitting, because that is where the domain tasks drop.',
      },
      {
        q: 'Can I apply more than once?',
        a: 'One application per person. Each register number and email can only be used once, so make it count.',
      },
    ],
  }, // added
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
    body: 'TODO_CONTENT', // added, LND-09 (P2), needs owner: contact links
    instagram: 'Andropedia on Instagram', // added, LND-09: name of the Instagram logo link
    linkedin: 'Andropedia on LinkedIn', // added, LND-09: name of the LinkedIn logo link
  },
  nav: {
    next: 'Next', // added
    back: 'Back', // added
  },
  draft: {
    restored: 'Picked up where you left off.', // added
    reset: 'Start over', // added
    confirmTitle: 'Start over?', // added, SHL-04 confirmation
    confirmBody: 'This clears every answer you have filled in so far.', // added
    confirmYes: 'Yes, start over', // added
    confirmNo: 'Keep my answers', // added
  },
  shell: {
    siteTitle: 'Andropedia Recruitment', // added, document title outside the steps
    docTitle: 'Step {n} · Andropedia Recruitment', // added, SHL-06
    doneTitle: 'Done · Andropedia Recruitment', // added
    guarded: 'Finish this step first. We brought you back to it.', // added, SHL-05
    placeholder: 'Step {n} coming in Phase {phase}.', // added, temporary until each step is built
  },
  progress: {
    label: 'Application progress', // added, SHL-01 landmark name
    completed: 'completed', // added, screen reader suffix
    locked: 'locked', // added, screen reader suffix
  },
  you: {
    title: 'Who are you?',
    name: 'Name',
    regno: 'Register Number',
    email: 'Email',
    phone: 'Contact number',
    department: 'Department',
    section: 'Section',
    departmentPrompt: 'Choose your department', // added, first option of the select
    phonePrefix: 'Country code', // added, screen reader name of the fixed +91
  },
  field: {
    counter: '{n} / {max}', // added, APP-00 character counter
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
      portfolio: '+ Pin your portfolio or LinkedIn', // added
    },
    save: 'Pin it', // added, closes a tile editor
    remove: 'Remove', // added
    replace: 'Replace photo', // added
    removePhoto: 'Remove photo', // added
    retry: 'Try again', // added
    uploading: 'Uploading {n}%', // added
    linkTile: '{label}: {link}', // added, screen reader name of a filled link tile
    proudTile: 'Achievement {n}: {title}', // added, screen reader name of a filled achievement tile
    photoAlt: 'Photo of {name}', // added
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
    yes: 'Yes', // added
    no: 'No', // added
    hoursTickMax: '7+', // added, rightmost hours tick (APP-05 F1)
    hoursValue: '{n} hours a week', // added, slider aria-valuetext
    hoursOne: '1 hour a week', // added
    hoursMaxValue: '7 or more hours a week', // added
    respValue: '{n} out of 5', // added
    notAnswered: 'Not answered', // added, DSN-07 slider before first use
  },
  last: {
    title: 'One last thing',
    intro: "We've gone through your application.",
    remember: 'In 30 words, tell us why we should remember you.', // edited
    submit: 'Submit application', // added
    sending: 'Sending it to the core team...', // added
    retry: 'Try again', // added, APP-06-R2 network failure
    honeypot: 'Leave this empty', // added, SEC-04 label, hidden from people and assistive tech
  },
  done: {
    title: 'We have received your application.',
    body: 'Join our community and stay tuned for the domain challenges.',
    whatsapp: 'Join the WhatsApp community', // added
    whatsappSoon: 'Join our community for further updates', // added, shown until the community link is final
    instagram: 'Follow us on Instagram', // added
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
