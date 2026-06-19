import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userTypeEnum = pgEnum("user_type", ["USER", "ADMIN"]);
export const userModeEnum = pgEnum("user_mode", [
  "CANDIDATE",
  "RECRUITER",
  "BOTH",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "DRAFT",
  "ACTIVE",
  "CLOSED",
  "EXPIRED",
  "FLAGGED",
]);
export const applicationStatusEnum = pgEnum("application_status", [
  "SAVED",
  "APPLIED",
  "REVIEWED",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
  "DISPUTED",
]);
export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "SUCCESS",
  "FAILED",
  "PARTIAL",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const appUsers = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  privyUserId: text("privy_user_id").notNull().unique(),
  walletAddress: text("wallet_address").unique(),
  email: text("email").unique(),
  userType: userTypeEnum("user_type").default("USER").notNull(),
  activeMode: userModeEnum("active_mode"),
  onboardingDone: boolean("onboarding_done").default(false).notNull(),
  ...timestamps,
}).enableRLS();

export const candidateProfiles = pgTable("candidate_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  profile: jsonb("profile")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  ...timestamps,
}).enableRLS();

export const recruiterProfiles = pgTable("recruiter_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  profile: jsonb("profile")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  ...timestamps,
}).enableRLS();

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  recruiterUserId: uuid("recruiter_user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  companyName: text("company_name").notNull(),
  location: text("location").notNull(),
  remote: boolean("remote").default(true).notNull(),
  salaryRange: text("salary_range").notNull(),
  jobType: text("job_type").notNull(),
  experienceLevel: text("experience_level").notNull(),
  skillsRequired: jsonb("skills_required").$type<string[]>().default([]).notNull(),
  status: jobStatusEnum("status").default("DRAFT").notNull(),
  stakeAmount: numeric("stake_amount", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  stakeToken: text("stake_token").default("cUSD").notNull(),
  candidateStakeRequired: boolean("candidate_stake_required")
    .default(false)
    .notNull(),
  candidateStakeAmount: numeric("candidate_stake_amount", {
    precision: 12,
    scale: 2,
  }),
  riskLevel: text("risk_level").default("UNKNOWN").notNull(),
  riskScore: integer("risk_score").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
}).enableRLS();

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateUserId: uuid("candidate_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").default("APPLIED").notNull(),
    message: text("message").notNull(),
    matchScore: integer("match_score").default(0).notNull(),
    riskScore: integer("risk_score").default(0).notNull(),
    stakeTx: text("stake_tx"),
    stakeAmount: numeric("stake_amount", { precision: 12, scale: 2 }),
    ...timestamps,
  },
  (table) => [uniqueIndex("applications_job_candidate_unique").on(table.jobId, table.candidateUserId)],
).enableRLS();

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentName: text("agent_name").notNull(),
  workflowName: text("workflow_name"),
  status: agentRunStatusEnum("status").notNull(),
  input: jsonb("input").$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  errorMessage: text("error_message"),
  latencyMs: integer("latency_ms"),
  ...timestamps,
}).enableRLS();
