export type DomainType = "Technical" | "Web" | "PR" | "R&D" | "Design" | "Media";

export type RoleType = "member" | "domain_admin" | "super_admin";

/** Title shown on the Our Team page (separate from the permission role above). */
export type ClubPosition = "president" | "vice_president" | "chief" | "lead" | "co_lead" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  domain: DomainType;
  avatar: string;
  bio?: string;
  github?: string;
  linkedin?: string;
  instagram?: string;
  portfolio?: string;
  points?: number;
  tasksCompleted?: number;
  streakWeeks?: number;
  isActive?: boolean;
  position?: ClubPosition;
  /** The password is still the default one: the portal only lets the member change it until they do. */
  mustChangePassword?: boolean;
}

export interface Week {
  id: string;
  weekNumber: number;
  title: string;
  theme: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  promptDescription?: string;
}

/** The task a lead sets for one domain in one week. */
export interface TaskPrompt {
  id: string;
  weekId: string;
  weekNumber: number;
  domain: DomainType;
  title: string;
  description: string;
  resourceUrl?: string;
  dueDate?: string;
  /** PDF brief attached by the lead; download it from /api/prompts/{id}/file. */
  fileName?: string;
  fileSize?: number;
  createdById: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  domain: DomainType;
  weekId: string;
  weekNumber: number;
  title: string;
  description: string;
  driveUrl?: string;
  githubUrl?: string;
  liveUrl?: string;
  figmaUrl?: string;
  notes?: string;
  status: "submitted" | "evaluated";
  submittedAt: string;
  evaluation?: Evaluation;
}

export interface Evaluation {
  id: string;
  taskId: string;
  adminId: string;
  adminName: string;
  score: number; // 0 to 100
  criteriaScores?: {
    technicalDepth: number; // out of 25
    innovation: number;    // out of 25
    completion: number;    // out of 25
    documentation: number; // out of 25
  };
  feedback: string;
  evaluatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  domain: DomainType;
  totalScore: number;
  avgScore: number;
  tasksCompleted: number;
  /** Consecutive days signed in, counted back from today. */
  streakDays: number;
  rankChange: number; // e.g. +2, -1, 0
  badges: string[];
}
