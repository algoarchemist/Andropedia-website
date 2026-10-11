import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { LegalLinks } from "@/components/layout/LegalLinks";
import { LinkedinIcon, InstagramIcon } from "@/components/ui/SocialIcons";

// Footer from the Figma design: black, four link columns, social circles, divider and legal row.
const COLUMNS = [
  {
    title: "Domains",
    links: [
      { name: "Technical", href: "/team#technical" },
      { name: "Web Development", href: "/team#web" },
      { name: "R&D", href: "/team#rd" },
      { name: "Design & UX", href: "/team#design" },
      { name: "Media & VFX", href: "/team#media" },
      { name: "Public Relations", href: "/team#pr" },
    ],
  },
  {
    title: "Club",
    links: [
      { name: "Events & Hackathons", href: "/events" },
      { name: "Projects", href: "/projects" },
      { name: "Meet the Team", href: "/team" },
      { name: "Join Recruitment", href: "/join" },
    ],
  },
  {
    title: "Members",
    links: [
      { name: "Member Login", href: "/portal/login" },
      { name: "Dashboard", href: "/portal/dashboard" },
      { name: "Leaderboard", href: "/portal/leaderboard" },
    ],
  },
];

const SOCIALS = [
  { name: "LinkedIn", href: "https://www.linkedin.com/company/andropedia-club/", Icon: LinkedinIcon },
  { name: "Instagram", href: "https://www.instagram.com/andropedia_srm.rmp/", Icon: InstagramIcon },
];

export function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 rounded-t-[30px] px-6 py-16 sm:px-12 lg:flex-row lg:justify-between lg:px-24 lg:py-24">
        <div className="max-w-xs space-y-4">
          <Link href="/" className="inline-flex items-center p-1" aria-label="Andropedia home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Andropedia" className="h-14 w-auto object-contain" />
          </Link>
          <p className="text-[13px] leading-5 text-white/70">
            The student technology club building real systems, one weekly sprint at a time.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:max-w-[720px]">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col">
              <h2 className="border-l-2 border-[#3395ff]/60 py-2.5 pl-2.5 text-[14px] font-medium leading-5">{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.name}>
                    <Link href={l.href} className="block px-5 py-2.5 text-[13px] leading-5 text-white/70 transition-colors hover:text-[#8cbfff]">
                      {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="flex flex-col gap-4">
            <h2 className="border-l border-white/10 py-2.5 pl-2.5 text-[14px] font-medium uppercase leading-5">Follow us</h2>
            <ul className="flex flex-wrap gap-2.5 opacity-60 hover:opacity-100 transition-opacity">
              {SOCIALS.map(({ name, href, Icon }) => (
                <li key={name}>
                  <a href={href} target="_blank" rel="noreferrer" aria-label={name} className="btn-circle">
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-5 text-[13px] leading-5 text-white/70 sm:flex-row sm:px-12 lg:px-24">
          <p>&copy; {new Date().getFullYear()} Andropedia Technology Council</p>
          <p className="text-center sm:flex-1">
            Developed and maintained by the{" "}
            <Link href="/team#web" className="text-white underline-offset-4 transition-colors hover:text-[#8cbfff] hover:underline">
              Web Team
            </Link>{" "}
            @ Andropedia
          </p>
          <div className="flex items-center gap-8">
            <LegalLinks />
            <a href="#top" aria-label="Back to top" className="btn-circle !h-11 !w-11 !bg-black/60">
              <ArrowUp className="h-6 w-6" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
