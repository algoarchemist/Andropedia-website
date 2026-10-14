import type { TeamMember } from "./team";

// The member list is fetched by the home page's honeycomb and by the team page. Keeping the last result here lets the team page
// draw straight away when you arrive from the home page (so a link like /team#core has something to scroll to at once), and then
// refresh in the background. It lives only in the browser tab's memory and is empty on a first load.
let cached: TeamMember[] | null = null;

export const getCachedMembers = () => cached;
export const setCachedMembers = (members: TeamMember[]) => {
  cached = members;
};
