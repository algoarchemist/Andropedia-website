// Club website: projects. Empty until the owner sends them; the Projects page shows an empty state meanwhile.
import type { DomainId } from '../constants';

export type Project = {
  id: string;
  name: string;
  summary: string;
  domain: DomainId;
  /** People's names as they appear in the team data. */
  builtBy?: readonly string[];
  link?: string;
};

export const PROJECTS: readonly Project[] = [];
