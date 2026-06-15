CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_privy_user_id_unique" UNIQUE("privy_user_id")
);
--> statement-breakpoint
ALTER TABLE "app_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "candidate_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recruiter_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recruiter_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE FUNCTION public.shire_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	NEW.updated_at = pg_catalog.now();
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER set_app_users_updated_at
BEFORE UPDATE ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.shire_set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_candidate_profiles_updated_at
BEFORE UPDATE ON public.candidate_profiles
FOR EACH ROW EXECUTE FUNCTION public.shire_set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_recruiter_profiles_updated_at
BEFORE UPDATE ON public.recruiter_profiles
FOR EACH ROW EXECUTE FUNCTION public.shire_set_updated_at();--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
		EXECUTE 'REVOKE ALL ON TABLE public.app_users FROM anon';
		EXECUTE 'REVOKE ALL ON TABLE public.candidate_profiles FROM anon';
		EXECUTE 'REVOKE ALL ON TABLE public.recruiter_profiles FROM anon';
	END IF;
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
		EXECUTE 'REVOKE ALL ON TABLE public.app_users FROM authenticated';
		EXECUTE 'REVOKE ALL ON TABLE public.candidate_profiles FROM authenticated';
		EXECUTE 'REVOKE ALL ON TABLE public.recruiter_profiles FROM authenticated';
	END IF;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.shire_set_updated_at() FROM PUBLIC;
