import type {
  AppRole,
  Application,
  ApplicationStatus,
  CandidateProfile,
  Dispute,
  Job,
  RecruiterProfile,
  RoleType,
  Stake,
  TokenSymbol,
} from "../lib/types";

export type JobDraft = {
  title: string;
  description: string;
  location: string;
  remote: boolean;
  salaryRange: string;
  jobType: Job["jobType"];
  experienceLevel: Job["experienceLevel"];
  skillsRequired: string[];
  candidateStakeRequired: boolean;
  candidateStakeAmount?: number;
};

export type ShireState = {
  hydrated: boolean;

  address: string | null;
  chainId: number;
  connecting: boolean;

  roleType: RoleType;
  registeredOnchain: boolean;
  profileVersion: number;

  candidateProfile: CandidateProfile | null;
  recruiterProfile: RecruiterProfile | null;

  jobs: Job[];
  applications: Application[];
  stakes: Stake[];
  disputes: Dispute[];
  savedJobIds: string[];

  activeRole: AppRole;

  connect: () => Promise<void>;
  disconnect: () => void;
  setActiveRole: (role: AppRole) => void;
  registerUser: (roleType: RoleType) => void;
  saveCandidateProfile: (p: CandidateProfile) => void;
  saveRecruiterProfile: (p: RecruiterProfile) => void;
  createJob: (draft: JobDraft) => Job;
  stakeForJob: (jobId: string, amount: number, token: TokenSymbol) => string;
  applyToJob: (
    jobId: string,
    message: string,
    opts?: { stakeAmount?: number; token?: TokenSymbol },
  ) => void;
  withdrawApplication: (appId: string) => void;
  toggleSaveJob: (jobId: string) => void;
  updateApplicationStatus: (appId: string, status: ApplicationStatus) => void;
  moderateJob: (jobId: string, action: "approve" | "flag" | "close") => void;
  refundStake: (stakeId: string) => void;
  slashStake: (stakeId: string, amount: number, reason: string) => void;
  resolveDispute: (id: string, decision: string, slash: boolean) => void;
  resetDemo: () => void;
};
