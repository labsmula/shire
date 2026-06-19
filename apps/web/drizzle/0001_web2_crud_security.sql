CREATE TYPE "public"."agent_run_status" AS ENUM('SUCCESS', 'FAILED', 'PARTIAL');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('SAVED', 'APPLIED', 'REVIEWED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('DRAFT', 'ACTIVE', 'CLOSED', 'EXPIRED', 'FLAGGED');--> statement-breakpoint
CREATE TYPE "public"."user_mode" AS ENUM('CANDIDATE', 'RECRUITER', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"workflow_name" text,
	"status" "agent_run_status" NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error_message" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_user_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'APPLIED' NOT NULL,
	"message" text NOT NULL,
	"match_score" integer DEFAULT 0 NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"stake_tx" text,
	"stake_amount" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recruiter_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"company_name" text NOT NULL,
	"location" text NOT NULL,
	"remote" boolean DEFAULT true NOT NULL,
	"salary_range" text NOT NULL,
	"job_type" text NOT NULL,
	"experience_level" text NOT NULL,
	"skills_required" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'DRAFT' NOT NULL,
	"stake_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"stake_token" text DEFAULT 'cUSD' NOT NULL,
	"candidate_stake_required" boolean DEFAULT false NOT NULL,
	"candidate_stake_amount" numeric(12, 2),
	"risk_level" text DEFAULT 'UNKNOWN' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "wallet_address" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "user_type" "user_type" DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "active_mode" "user_mode";--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "onboarding_done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_user_id_app_users_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiter_user_id_app_users_id_fk" FOREIGN KEY ("recruiter_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_job_candidate_unique" ON "applications" USING btree ("job_id","candidate_user_id");--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_wallet_address_unique" UNIQUE("wallet_address");--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_email_unique" UNIQUE("email");--> statement-breakpoint
CREATE TRIGGER set_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.shire_set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.shire_set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_agent_runs_updated_at
BEFORE UPDATE ON public.agent_runs
FOR EACH ROW EXECUTE FUNCTION public.shire_set_updated_at();--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
		EXECUTE 'REVOKE ALL ON TABLE public.jobs FROM anon';
		EXECUTE 'REVOKE ALL ON TABLE public.applications FROM anon';
		EXECUTE 'REVOKE ALL ON TABLE public.agent_runs FROM anon';
	END IF;
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
		EXECUTE 'REVOKE ALL ON TABLE public.jobs FROM authenticated';
		EXECUTE 'REVOKE ALL ON TABLE public.applications FROM authenticated';
		EXECUTE 'REVOKE ALL ON TABLE public.agent_runs FROM authenticated';
	END IF;
END;
$$;
