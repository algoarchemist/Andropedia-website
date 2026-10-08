// Club website: events. The former site lists these three under "timeline & archives" with day and month only.
// Add `year` and `description` when the owner confirms them; an event with a year in the future shows as upcoming.
export type ClubEvent = {
  id: string;
  name: string;
  day: number;
  /** 1 to 12. */
  month: number;
  year?: number;
  description?: string;
};

export const EVENTS: readonly ClubEvent[] = [
  { id: 'skylinx-gp', name: 'SKYLINX GP', day: 12, month: 4 },
  { id: 'cloudcon-3', name: 'CloudCon 3.0', day: 30, month: 8 },
  { id: 'aspire-arena-2', name: 'Aspire Arena 2.0', day: 22, month: 9 },
];
