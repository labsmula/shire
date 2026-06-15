import { eq } from "drizzle-orm";

import {
  appUsers,
  candidateProfiles,
  recruiterProfiles,
} from "./db/schema";
import { createDatabase, type Database } from "./db";

export type ProfileRole = "candidate" | "recruiter";

export type ProfileUser = {
  id: string;
  privyUserId: string;
};

export type SavedProfile = {
  user: ProfileUser;
  profile: unknown;
};

export interface ProfileTransactionStore {
  resolveUser(privyUserId: string): Promise<ProfileUser>;
  upsertProfile(
    userId: string,
    role: ProfileRole,
    profile: Record<string, unknown>,
  ): Promise<unknown>;
}

export interface ProfileRepository {
  resolveUser(privyUserId: string): Promise<ProfileUser>;
  saveProfileForPrivyUser(
    privyUserId: string,
    role: ProfileRole,
    profile: unknown,
  ): Promise<SavedProfile>;
  getProfile(userId: string, role: ProfileRole): Promise<unknown | null>;
  upsertProfile(
    userId: string,
    role: ProfileRole,
    profile: unknown,
  ): Promise<unknown>;
  listActiveRoles(userId: string): Promise<ProfileRole[]>;
}

export class ProfileRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProfileRepositoryError";
  }
}

function profileRecord(profile: unknown): Record<string, unknown> {
  if (
    typeof profile !== "object" ||
    profile === null ||
    Array.isArray(profile)
  ) {
    throw new ProfileRepositoryError("Profile must be an object.");
  }
  return profile as Record<string, unknown>;
}

type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];
type DrizzleWriteExecutor = Pick<Database | DatabaseTransaction, "insert">;

function normalizedPrivyUserId(privyUserId: string) {
  const normalized = privyUserId.trim();
  if (!normalized) {
    throw new ProfileRepositoryError("Privy user ID is required.");
  }
  return normalized;
}

export function buildProfileUserUpsertQuery(
  executor: DrizzleWriteExecutor,
  privyUserId: string,
) {
  return executor
    .insert(appUsers)
    .values({ privyUserId })
    .onConflictDoUpdate({
      target: appUsers.privyUserId,
      set: { updatedAt: new Date() },
    })
    .returning({
      id: appUsers.id,
      privyUserId: appUsers.privyUserId,
    });
}

async function resolveDrizzleUser(
  executor: DrizzleWriteExecutor,
  privyUserId: string,
) {
  const [user] = await buildProfileUserUpsertQuery(executor, privyUserId);
  if (!user) {
    throw new Error("User upsert returned no row.");
  }
  return user;
}

export function buildRoleProfileUpsertQuery(
  executor: DrizzleWriteExecutor,
  userId: string,
  role: ProfileRole,
  profile: Record<string, unknown>,
) {
  if (role === "candidate") {
    return executor
      .insert(candidateProfiles)
      .values({ userId, profile })
      .onConflictDoUpdate({
        target: candidateProfiles.userId,
        set: { profile, updatedAt: new Date() },
      })
      .returning({ profile: candidateProfiles.profile });
  }

  return executor
    .insert(recruiterProfiles)
    .values({ userId, profile })
    .onConflictDoUpdate({
      target: recruiterProfiles.userId,
      set: { profile, updatedAt: new Date() },
    })
    .returning({ profile: recruiterProfiles.profile });
}

async function upsertDrizzleProfile(
  executor: DrizzleWriteExecutor,
  userId: string,
  role: ProfileRole,
  profile: Record<string, unknown>,
) {
  const [row] = await buildRoleProfileUpsertQuery(
    executor,
    userId,
    role,
    profile,
  );
  if (!row) {
    throw new Error(
      `${role === "candidate" ? "Candidate" : "Recruiter"} profile upsert returned no row.`,
    );
  }
  return row.profile;
}

function createDrizzleTransactionStore(
  executor: DrizzleWriteExecutor,
): ProfileTransactionStore {
  return {
    resolveUser: (privyUserId) =>
      resolveDrizzleUser(executor, normalizedPrivyUserId(privyUserId)),
    upsertProfile: (userId, role, profile) =>
      upsertDrizzleProfile(executor, userId, role, profile),
  };
}

export type DrizzleProfileRepositoryDependencies = {
  runTransaction?: <T>(
    operation: (store: ProfileTransactionStore) => Promise<T>,
  ) => Promise<T>;
};

export function createDrizzleProfileRepository(
  database?: Database,
  dependencies: DrizzleProfileRepositoryDependencies = {},
): ProfileRepository {
  const resolvedDatabase =
    database ?? (dependencies.runTransaction ? undefined : createDatabase());
  const requireDatabase = () => {
    if (!resolvedDatabase) {
      throw new ProfileRepositoryError(
        "A database is required for this repository operation.",
      );
    }
    return resolvedDatabase;
  };
  const runTransaction =
    dependencies.runTransaction ??
    (<T>(operation: (store: ProfileTransactionStore) => Promise<T>) =>
      requireDatabase().transaction((transaction) =>
        operation(createDrizzleTransactionStore(transaction)),
      ));

  return {
    async resolveUser(privyUserId) {
      const normalized = normalizedPrivyUserId(privyUserId);

      try {
        return await resolveDrizzleUser(requireDatabase(), normalized);
      } catch (error) {
        if (error instanceof ProfileRepositoryError) {
          throw error;
        }
        throw new ProfileRepositoryError("Failed to resolve profile user.", {
          cause: error,
        });
      }
    },

    async saveProfileForPrivyUser(privyUserId, role, profile) {
      const normalized = normalizedPrivyUserId(privyUserId);
      const savedProfile = profileRecord(profile);
      try {
        return await runTransaction(async (store) => {
          const user = await store.resolveUser(normalized);
          const persistedProfile = await store.upsertProfile(
            user.id,
            role,
            savedProfile,
          );
          return { user, profile: persistedProfile };
        });
      } catch (error) {
        if (error instanceof ProfileRepositoryError) {
          throw error;
        }
        throw new ProfileRepositoryError(
          "Failed to save profile for Privy user.",
          { cause: error },
        );
      }
    },

    async getProfile(userId, role) {
      try {
        const table =
          role === "candidate" ? candidateProfiles : recruiterProfiles;
        const [row] = await requireDatabase()
          .select({ profile: table.profile })
          .from(table)
          .where(eq(table.userId, userId))
          .limit(1);
        return row?.profile ?? null;
      } catch (error) {
        throw new ProfileRepositoryError("Failed to load role profile.", {
          cause: error,
        });
      }
    },

    async upsertProfile(userId, role, profile) {
      const savedProfile = profileRecord(profile);
      try {
        return await upsertDrizzleProfile(
          requireDatabase(),
          userId,
          role,
          savedProfile,
        );
      } catch (error) {
        if (error instanceof ProfileRepositoryError) {
          throw error;
        }
        throw new ProfileRepositoryError("Failed to save role profile.", {
          cause: error,
        });
      }
    },

    async listActiveRoles(userId) {
      try {
        return await requireDatabase().transaction(async (transaction) => {
          const [candidate, recruiter] = await Promise.all([
            transaction
              .select({ userId: candidateProfiles.userId })
              .from(candidateProfiles)
              .where(eq(candidateProfiles.userId, userId))
              .limit(1),
            transaction
              .select({ userId: recruiterProfiles.userId })
              .from(recruiterProfiles)
              .where(eq(recruiterProfiles.userId, userId))
              .limit(1),
          ]);
          const roles: ProfileRole[] = [];
          if (candidate.length > 0) {
            roles.push("candidate");
          }
          if (recruiter.length > 0) {
            roles.push("recruiter");
          }
          return roles;
        });
      } catch (error) {
        throw new ProfileRepositoryError("Failed to list active roles.", {
          cause: error,
        });
      }
    },
  };
}

export function createInMemoryProfileRepository(): ProfileRepository {
  const usersByPrivyId = new Map<string, ProfileUser>();
  const profiles = new Map<string, Record<ProfileRole, unknown>>();

  function profileOwner(userId: string) {
    const owner = [...usersByPrivyId.values()].find(
      (user) => user.id === userId,
    );
    if (!owner) {
      throw new ProfileRepositoryError("Profile user was not found.");
    }
    return owner;
  }

  async function resolveUser(privyUserId: string) {
    const normalized = normalizedPrivyUserId(privyUserId);

    const existing = usersByPrivyId.get(normalized);
    if (existing) {
      return existing;
    }

    const user = {
      id: crypto.randomUUID(),
      privyUserId: normalized,
    };
    usersByPrivyId.set(normalized, user);
    return user;
  }

  async function upsertProfile(
    userId: string,
    role: ProfileRole,
    profile: unknown,
  ) {
    profileOwner(userId);
    profileRecord(profile);
    const current = profiles.get(userId) ?? {
      candidate: null,
      recruiter: null,
    };
    current[role] = profile;
    profiles.set(userId, current);
    return profile;
  }

  return {
    resolveUser,
    async saveProfileForPrivyUser(privyUserId, role, profile) {
      const normalized = normalizedPrivyUserId(privyUserId);
      const savedProfile = profileRecord(profile);
      const user = await resolveUser(normalized);
      const persistedProfile = await upsertProfile(
        user.id,
        role,
        savedProfile,
      );
      return { user, profile: persistedProfile };
    },

    async getProfile(userId, role) {
      profileOwner(userId);
      return profiles.get(userId)?.[role] ?? null;
    },

    upsertProfile,

    async listActiveRoles(userId) {
      profileOwner(userId);
      const current = profiles.get(userId);
      if (!current) {
        return [];
      }
      return (["candidate", "recruiter"] as const).filter(
        (role) => current[role] !== null,
      );
    },
  };
}
