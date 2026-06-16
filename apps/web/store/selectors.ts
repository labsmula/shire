import type { CandidateProfile, RecruiterProfile } from "../lib/types";
import { recruiters, talents } from "../lib/seed";

import { ME_CANDIDATE_ID, ME_RECRUITER_ID } from "./constants";

export function getRecruiterById(
  s: { recruiterProfile: RecruiterProfile | null },
  id: string,
): (RecruiterProfile & { id: string }) | undefined {
  if (id === ME_RECRUITER_ID && s.recruiterProfile) {
    return { ...s.recruiterProfile, id };
  }
  const seed = recruiters.find((r) => r.id === id);
  return seed ? { ...seed } : undefined;
}

export function getCandidateById(id: string) {
  return talents.find((t) => t.id === id);
}

export function candidateDisplay(id: string, me: CandidateProfile | null) {
  if (id === ME_CANDIDATE_ID) return me?.displayName ?? "You";
  return getCandidateById(id)?.displayName ?? "Candidate";
}
