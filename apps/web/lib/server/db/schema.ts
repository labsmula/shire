import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
