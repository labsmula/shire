import {
  candidates,
  companies,
  jobs,
  type CandidateRecord,
  type CompanyRecord,
  type JobRecord,
} from "./runtime-data";

export type ApplicationRecord = {
  id: string;
  candidateId: string;
  jobId: string;
  status: "draft" | "submitted" | "review" | "rejected" | "hired";
};

export const applications = [
  {
    id: "application-001",
    candidateId: "candidate-001",
    jobId: "job-001",
    status: "submitted",
  },
  {
    id: "application-002",
    candidateId: "candidate-002",
    jobId: "job-002",
    status: "review",
  },
] as const satisfies readonly ApplicationRecord[];

const recruiterCompanyOwnership: Record<string, readonly string[]> = {
  "recruiter-001": ["company-001"],
  "recruiter-002": ["company-002"],
};

export function getCandidateById(candidateId: string): CandidateRecord | undefined {
  return candidates.find((candidate) => candidate.id === candidateId);
}

export function getCompanyById(companyId: string): CompanyRecord | undefined {
  return companies.find((company) => company.id === companyId);
}

export function getJobById(jobId: string): JobRecord | undefined {
  return jobs.find((job) => job.id === jobId);
}

export function getApplicationById(
  applicationId: string,
): ApplicationRecord | undefined {
  return applications.find((application) => application.id === applicationId);
}

export function getApplicationsByCandidateId(
  candidateId: string,
): ApplicationRecord[] {
  return applications.filter((application) => application.candidateId === candidateId);
}

export function getOwnedCompanyIds(viewerId: string): readonly string[] {
  return recruiterCompanyOwnership[viewerId] ?? [];
}

export function getOwnedCompanies(viewerId: string): CompanyRecord[] {
  const ownedCompanyIds = new Set(getOwnedCompanyIds(viewerId));
  return companies.filter((company) => ownedCompanyIds.has(company.id));
}

export function getOwnedJobs(viewerId: string): JobRecord[] {
  const ownedCompanyIds = new Set(getOwnedCompanyIds(viewerId));
  return jobs.filter((job) => ownedCompanyIds.has(job.companyId));
}

export function getTiedCandidates(viewerId: string): CandidateRecord[] {
  const ownedJobIds = new Set(getOwnedJobs(viewerId).map((job) => job.id));
  const tiedCandidateIds = new Set(
    applications
      .filter((application) => ownedJobIds.has(application.jobId))
      .map((application) => application.candidateId),
  );

  return candidates.filter((candidate) => tiedCandidateIds.has(candidate.id));
}

export function getTiedApplications(viewerId: string): ApplicationRecord[] {
  const ownedJobIds = new Set(getOwnedJobs(viewerId).map((job) => job.id));
  return applications.filter((application) => ownedJobIds.has(application.jobId));
}

export function getCandidateApplicationForJob(
  candidateId: string,
  jobId: string,
): ApplicationRecord | undefined {
  return applications.find(
    (application) => application.candidateId === candidateId && application.jobId === jobId,
  );
}
