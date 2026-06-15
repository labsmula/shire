import type { CandidateProfile } from "./types";

export type AgentCandidateProfile = {
  fullName?: string;
  headline?: string;
  summary?: string;
  skills?: string[];
  preferredRoles?: string[];
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  location?: string;
  expectedSalary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
};

function inferExperienceLevel(
  profile: AgentCandidateProfile,
): CandidateProfile["experienceLevel"] {
  const text = [profile.headline, ...(profile.preferredRoles ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\b(lead|principal|staff|head)\b/.test(text)) return "LEAD";
  if (/\bsenior\b/.test(text)) return "SENIOR";
  if (/\b(mid|intermediate)\b/.test(text)) return "MID";
  if (/\b(intern|internship)\b/.test(text)) return "INTERN";
  return "JUNIOR";
}

function salaryLabel(profile: AgentCandidateProfile) {
  const salary = profile.expectedSalary;
  if (!salary || (salary.min === undefined && salary.max === undefined)) {
    return undefined;
  }
  const values = [salary.min, salary.max]
    .filter((value): value is number => value !== undefined)
    .map((value) => value.toLocaleString("en-US"));
  return [salary.currency, values.join(" - ")].filter(Boolean).join(" ");
}

export function mapAgentProfileToForm(
  profile: AgentCandidateProfile,
  existing?: CandidateProfile | null,
): CandidateProfile {
  return {
    displayName: profile.fullName || existing?.displayName || "",
    bio:
      profile.summary ||
      profile.headline ||
      existing?.bio ||
      "Review and complete this AI-generated candidate profile.",
    skills:
      profile.skills?.length ? profile.skills : existing?.skills ?? [],
    roleTargets:
      profile.preferredRoles?.length
        ? profile.preferredRoles
        : existing?.roleTargets ?? [],
    experienceLevel:
      profile.headline || profile.preferredRoles?.length
        ? inferExperienceLevel(profile)
        : existing?.experienceLevel ?? "JUNIOR",
    portfolioUrl: profile.portfolioUrl || existing?.portfolioUrl,
    githubUrl: profile.githubUrl || existing?.githubUrl,
    linkedinUrl: profile.linkedinUrl || existing?.linkedinUrl,
    xUrl: existing?.xUrl,
    location: profile.location || existing?.location,
    timezone: existing?.timezone,
    languages: existing?.languages ?? ["English"],
    salaryExpectation:
      salaryLabel(profile) || existing?.salaryExpectation,
    visibility: existing?.visibility ?? "PUBLIC",
  };
}
