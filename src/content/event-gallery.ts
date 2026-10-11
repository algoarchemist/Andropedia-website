// Photos from past events, shown in the carousel when an event is opened on the Events page.
// Files live in public/events/<folder>/1.jpeg ... <count>.jpeg. Keyed by event id.
const folder = (name: string, count: number) => Array.from({ length: count }, (_, i) => `/events/${name}/${i + 1}.jpeg`);

const GALLERY: Record<string, string[]> = {
  cloudcon: folder("cloudcon", 9),
  "cafe-hackathon": folder("cafe-hackathon", 8),
  "badging-ceremony": folder("badging-ceremony", 9),
  "boot-camp": folder("boot-camp", 9),
  codesprint: folder("codesprint", 8),
};

// An older seed script added CodeSprint under another id.
const ALIASES: Record<string, string> = { "codesprint-2026": "codesprint" };

export function galleryFor(eventId: string): string[] {
  return GALLERY[ALIASES[eventId] ?? eventId] ?? [];
}
