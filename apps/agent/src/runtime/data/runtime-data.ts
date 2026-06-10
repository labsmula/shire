export type CandidateRecord = {
  id: string;
  name: string;
  role: string;
  summary: string;
  skills: readonly string[];
};

export type JobRecord = {
  id: string;
  title: string;
  companyId: string;
  description: string;
  requiredSkills: readonly string[];
};

export type CompanyRecord = {
  id: string;
  name: string;
  sector: string;
  hiringNeed: string;
};

export type DisputeRecord = {
  id: string;
  title: string;
  summary: string;
  evidence: string;
  recommendedAction: string;
};

export const candidates = [
  {
    id: "candidate-001",
    name: "Maya Okafor",
    role: "Senior Frontend Engineer",
    summary:
      "Builds product-facing interfaces with TypeScript, React, and careful product judgment.",
    skills: ["typescript", "react", "design-systems", "accessibility"],
  },
  {
    id: "candidate-002",
    name: "Daniel Rivera",
    role: "Platform Engineer",
    summary:
      "Works across APIs, observability, and workflow automation with strong operational discipline.",
    skills: ["typescript", "node", "automation", "observability"],
  },
] as const satisfies readonly CandidateRecord[];

export const jobs = [
  {
    id: "job-001",
    title: "Product Engineer",
    companyId: "company-001",
    description:
      "Ship a polished product layer with tight feedback loops and maintainable UI systems.",
    requiredSkills: ["typescript", "react", "product-thinking"],
  },
  {
    id: "job-002",
    title: "Workflow Automation Engineer",
    companyId: "company-002",
    description:
      "Own deterministic agent workflows, local data plumbing, and reliable job execution.",
    requiredSkills: ["typescript", "node", "workflow-design"],
  },
] as const satisfies readonly JobRecord[];

export const companies = [
  {
    id: "company-001",
    name: "Northstar Logistics",
    sector: "supply-chain",
    hiringNeed: "Product engineering support for customer-facing operations tools.",
  },
  {
    id: "company-002",
    name: "Cinder Labs",
    sector: "automation",
    hiringNeed: "Deterministic backend support for agent orchestration and reporting.",
  },
] as const satisfies readonly CompanyRecord[];

export const disputes = [
  {
    id: "dispute-001",
    title: "Wallet ownership dispute",
    summary:
      "Two operators claimed control of the same wallet after a workflow handoff.",
    evidence:
      "Audit trail shows the wallet was last updated from a verified admin session.",
    recommendedAction:
      "Confirm the latest signed admin instruction and resolve ownership once.",
  },
  {
    id: "dispute-002",
    title: "Milestone release dispute",
    summary:
      "A payout was paused because the completion evidence arrived after the deadline.",
    evidence:
      "Ticket history includes the delivery log, the approval comment, and the late attachment.",
    recommendedAction:
      "Review the timestamped evidence and decide whether the deadline exception applies.",
  },
] as const satisfies readonly DisputeRecord[];

export type JobRunnerData = {
  "cv-parse": {
    candidate: CandidateRecord;
  };
  "job-matching": {
    candidate: CandidateRecord;
    job: JobRecord;
  };
  "talent-matching": {
    company: CompanyRecord;
    talent: CandidateRecord;
  };
  "dispute-summary": {
    dispute: DisputeRecord;
  };
};

export const jobRunnerData = {
  "cv-parse": {
    candidate: candidates[0],
  },
  "job-matching": {
    candidate: candidates[1],
    job: jobs[0],
  },
  "talent-matching": {
    company: companies[1],
    talent: candidates[0],
  },
  "dispute-summary": {
    dispute: disputes[1],
  },
} as const satisfies JobRunnerData;
