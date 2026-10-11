// Usage: npm run events:club
// Also adds the upcoming events listed in UPCOMING (created once, never overwritten). One with a date is open for registration;
// one with dateTbc (like the AI Symposium) shows as "Coming Soon" with no registration until its date is set in the admin screen.
// Adds the club's past events (major events and club hours) as published entries, closed for registration and
// marked "date to be announced", so no date is made up. Fill in the real dates afterwards in
// Portal -> Admin -> Events & reservations (Edit).
// Safe to re-run: an existing event gets its title, type and description refreshed, and keeps its date, team size
// and everything else. A date that was set in the admin screen is never touched.
import { prisma } from "../src/lib/prisma";

const LOCATION = "SRM Institute of Science and Technology, Ramapuram";

// The archive lists undated past events in the order of ARCHIVE_ORDER below (EVENTS order, with AndroHacks after Git Set Code).
const EVENTS = [
  {
    id: "cloudcon",
    title: "CloudCon 3.0",
    type: "Major Event",
    teamMin: null,
    teamMax: null,
    tagline: "Exploring the cloud. Discovering what's next.",
    body: "As Andropedia's flagship event, CloudCon 3.0 brought cloud computing and emerging technologies into focus. It offered students an opportunity to explore new innovations, understand real-world applications, and discover the possibilities shaping the future of technology.",
  },
  {
    id: "cafe-hackathon",
    title: "Cafe Hackathon",
    type: "Major Event",
    teamMin: null,
    teamMax: null,
    tagline: "Big ideas. Real problems. A café full of possibilities.",
    body: "Who says hackathons have to happen in conventional venues? Cafe Hackathon brought club members together in a café for an unconventional blend of innovation, collaboration, and hands-on problem-solving. From brainstorming ideas to improve the club to tackling real-time consultancy projects, the event turned a casual setting into a space for creative thinking.",
  },
  {
    id: "badging-ceremony",
    title: "Badging Ceremony",
    type: "Major Event",
    teamMin: null,
    teamMax: null,
    tagline: "Recognizing the people behind the progress.",
    body: "Andropedia's growth is shaped by the people who put their ideas, effort, and time into building the club. The Badging Ceremony recognized club members and celebrated their contributions over the past two years. It also marked the induction of the new President, Vice President, Leads, and Co-Leads as they stepped into their respective roles.",
  },
  {
    id: "boot-camp",
    title: "Boot Camp",
    type: "Major Event",
    teamMin: null,
    teamMax: null,
    tagline: "Curiosity in action, one experiment at a time.",
    body: "Designed for students from Classes 6 to 12, this one-day summer boot camp made technology an opportunity to explore and investigate. Participants discovered how sensors work and where they're used, then put their observation and reasoning skills to the test through an interactive, clue-based investigation game.",
  },
  {
    id: "git-set-code",
    title: "Git Set Code",
    type: "Major Event",
    teamMin: null,
    teamMax: null,
    tagline: "Your engineering journey starts with the right tools.",
    body: "Starting college comes with a whole new set of tools to discover. Git Set Code helped first-year students get familiar with essential platforms like LeetCode, Git, and GitHub, building their confidence to begin coding, solve problems, and collaborate throughout their engineering journey.",
  },
  {
    id: "pixels-and-plots",
    title: "Pixels & Plots",
    type: "Design Challenge",
    teamMin: null,
    teamMax: null,
    tagline: "A theme, a deadline, and a canvas for creativity.",
    body: "Part of TEXUS '26, Pixels & Plots challenged participants to turn given themes into compelling designs within a limited time. With creativity under the clock, participants explored visual storytelling, experimented with design ideas, and transformed their interpretations into engaging visual creations.",
  },
  {
    id: "codesprint",
    title: "CodeSprint '26",
    type: "Coding Contest",
    teamMin: 3,
    teamMax: 4,
    tagline: "Think fast. Code smart. Take the risk.",
    body: "Part of TEXUS '26, CodeSprint '26 brought a game-inspired twist to competitive coding. Blending programming challenges with a gambling-style gameplay mechanic, it pushed participants to put their logic, speed, and problem-solving skills to the test in a format beyond the usual coding competition.",
  },
  {
    id: "club-hour-profile-building",
    title: "Profile Building for Internships",
    type: "Club Hour",
    teamMin: null,
    teamMax: null,
    tagline: "Your skills deserve a profile that shows them off.",
    body: "Having skills is one thing; knowing how to present them is another. This club hour helped students prepare for internship opportunities through resume building, project showcasing, and strengthening their LinkedIn and GitHub profiles to better communicate what they can bring to the table.",
  },
  {
    id: "club-hour-web-development",
    title: "Web Development",
    type: "Club Hour",
    teamMin: null,
    teamMax: null,
    tagline: "From your first line of code to your first web project.",
    body: "Every website starts somewhere. This session introduced members to the fundamentals of web development, essential tools, and a practical roadmap to get started, helping them understand how to begin turning ideas into websites.",
  },
  {
    id: "club-hour-linkedin",
    title: "LinkedIn Do's & Don'ts",
    type: "Club Hour",
    teamMin: null,
    teamMax: null,
    tagline: "Make your first impression count—even online.",
    body: "A professional profile is more than just a page with your name on it. This club hour explored how to build a stronger LinkedIn presence, network effectively, and avoid common profile mistakes, helping members present themselves with greater confidence in the professional world.",
  },
  {
    id: "club-hour-ai-prompting",
    title: "AI Prompting Basics",
    type: "Club Hour",
    teamMin: null,
    teamMax: null,
    tagline: "Better prompts. Better conversations with AI.",
    body: "Getting useful results from AI starts with knowing what to ask. This session introduced members to the fundamentals of prompting, exploring how prompts work and how to craft clearer, more effective instructions to get better results from AI tools.",
  },
  {
    id: "club-hour-dsa-basics",
    title: "DSA Basics",
    type: "Club Hour",
    teamMin: null,
    teamMax: null,
    tagline: "Think beyond the code. Understand the logic.",
    body: "Good problem-solving begins with understanding what's happening beneath the code. This club hour introduced members to Data Structures and Algorithms, exploring their importance, real-world applications, and how to get started with the fundamentals of algorithmic thinking.",
  },
  {
    id: "club-hour-myth-vs-fact",
    title: "Myth vs Fact",
    type: "Club Hour",
    teamMin: null,
    teamMax: null,
    tagline: "Question the assumptions. Discover the facts.",
    body: "Technology comes with plenty of claims, misconceptions, and assumptions. This interactive session explored the difference between myth and fact, focusing on technology addiction and common misconceptions in the technical field while encouraging members to think more critically about what they hear and believe.",
  },
  {
    id: "club-hour-leetcode",
    title: "LeetCode Problem Solving",
    type: "Club Hour",
    teamMin: null,
    teamMax: null,
    tagline: "Less guessing. More logic. Better solutions.",
    body: "Problem-solving improves when you put your knowledge to work. This club hour brought members together to tackle LeetCode problems, encouraging them to apply their coding skills, sharpen their logical thinking, and approach programming challenges with greater confidence.",
  },
  {
    id: "club-hour-dsa-arrays",
    title: "DSA Basics on Arrays",
    type: "Club Hour",
    teamMin: null,
    teamMax: null,
    tagline: "Start with arrays. Build your problem-solving foundation.",
    body: "Small concepts can unlock bigger problem-solving skills. This session focused on solving LeetCode problems involving arrays, helping members explore essential techniques such as traversal and searching while strengthening their understanding of Data Structures and Algorithms through practice.",
  },
];

// Order of the undated archive, top to bottom. AndroHacks was added from the admin screen, so it is not defined above;
// it is only placed here, right below Git Set Code.
const ARCHIVE_ORDER = EVENTS.map((e) => e.id);
ARCHIVE_ORDER.splice(ARCHIVE_ORDER.indexOf("git-set-code") + 1, 0, "androhacks");

// Upcoming events: real date and venue, registration open. Only created if missing, so admin edits are kept.
const UPCOMING = [
  {
    id: "codesprint-2",
    title: "CodeSprint 2.0",
    type: "Coding Contest",
    startsAt: new Date("2026-10-15T10:00:00+05:30"), // the time of day is a placeholder: edit it in the admin screen
    location: "7th Floor Lecture Hall",
    tagline: "Think fast. Code smart. Take the risk.",
    body: "Part of TEXUS '26, CodeSprint '26 brought a game-inspired twist to competitive coding. Blending programming challenges with a gambling-style gameplay mechanic, it pushed participants to put their logic, speed, and problem-solving skills to the test in a format beyond the usual coding competition.",
  },
  {
    id: "ai-symposium",
    title: "AI Symposium",
    type: "Symposium",
    // No date yet: the start is a placeholder that keeps it under Upcoming as "Coming Soon" (nobody can register).
    // Set the real date in the admin screen and untick "Date not announced yet" once it is decided.
    startsAt: new Date("2027-12-31T10:00:00+05:30"),
    dateTbc: true,
    location: "To be announced",
    tagline: "Stay tuned!",
    body: "",
  },
];

async function main() {
  const base = Date.now();
  let added = 0;
  let updated = 0;
  for (const e of EVENTS) {
    const description = `${e.tagline}\n${e.body}`;
    const startsAt = new Date(base + ARCHIVE_ORDER.indexOf(e.id) * 1000); // placeholder only: never shown while dateTbc is on; keeps the list order
    // CodeSprint used to be added with another id by an older script; treat that one as the same event.
    const existing =
      (await prisma.event.findUnique({ where: { id: e.id } })) ??
      (e.id === "codesprint" ? await prisma.event.findUnique({ where: { id: "codesprint-2026" } }) : null);
    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: { title: e.title, type: e.type, description, ...(existing.dateTbc ? { startsAt } : {}) },
      });
      updated++;
      console.log(`Updated ${e.title}.`);
      continue;
    }
    await prisma.event.create({
      data: {
        id: e.id,
        title: e.title,
        type: e.type,
        description,
        location: LOCATION,
        startsAt,
        endsAt: null,
        capacity: null,
        teamMin: e.teamMin,
        teamMax: e.teamMax,
        prize: null,
        isPublished: true,
        registrationOpen: false,
        dateTbc: true,
      },
    });
    added++;
    console.log(`Added ${e.title}.`);
  }
  const androhacks = await prisma.event.findUnique({ where: { id: "androhacks" } });
  if (androhacks?.dateTbc) {
    await prisma.event.update({ where: { id: "androhacks" }, data: { startsAt: new Date(base + ARCHIVE_ORDER.indexOf("androhacks") * 1000) } });
    console.log("Placed AndroHacks below Git Set Code.");
  }
  for (const e of UPCOMING) {
    if (await prisma.event.findUnique({ where: { id: e.id } })) {
      console.log(`${e.title} already exists; left as it is.`);
      continue;
    }
    await prisma.event.create({
      data: {
        id: e.id,
        title: e.title,
        type: e.type,
        description: e.body ? `${e.tagline}
${e.body}` : e.tagline,
        location: e.location,
        startsAt: e.startsAt,
        endsAt: null,
        capacity: null,
        teamMin: null,
        teamMax: null,
        prize: null,
        isPublished: true,
        registrationOpen: !e.dateTbc,
        dateTbc: e.dateTbc ?? false,
      },
    });
    added++;
    console.log(`Added ${e.title}.`);
  }
  console.log(`Done: ${added} added, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
