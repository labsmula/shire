import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Options, type PostgresType, type Sql } from "postgres";

import * as schema from "./schema";

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is required.");
    this.name = "DatabaseConfigurationError";
  }
}

type PostgresOptions = Options<Record<string, PostgresType>>;

export type DatabaseDependencies = {
  url?: string;
  createClient?: (url: string, options: PostgresOptions) => Sql;
  shared?: boolean;
};

type DatabaseOwnership = "owned" | "shared";
type ClientFactory = NonNullable<DatabaseDependencies["createClient"]>;

const sharedDatabases = new WeakMap<ClientFactory, Map<string, Database>>();
const databaseClosers = new WeakMap<Database, () => Promise<void>>();
const sharedDatabaseRemovers = new WeakMap<Database, () => void>();

function buildDatabase(
  client: Sql,
  ownership: DatabaseOwnership,
) {
  let closed = false;
  const database = Object.assign(drizzle(client, { schema }), {
    ownership,
    async close() {
      if (ownership === "shared" || closed) {
        return;
      }
      closed = true;
      await client.end();
    },
  });
  databaseClosers.set(database, async () => {
    if (closed) {
      return;
    }
    closed = true;
    await client.end();
  });
  return database;
}

export type Database = ReturnType<typeof buildDatabase>;

export function createDatabase(
  dependencies: DatabaseDependencies = {},
): Database {
  const url = (dependencies.url ?? process.env.DATABASE_URL)?.trim();
  if (!url) {
    throw new DatabaseConfigurationError();
  }

  const createClient = dependencies.createClient ?? postgres;
  const shared = dependencies.shared ?? Object.keys(dependencies).length === 0;
  if (shared) {
    const databasesForFactory =
      sharedDatabases.get(createClient) ?? new Map<string, Database>();
    sharedDatabases.set(createClient, databasesForFactory);
    const existing = databasesForFactory.get(url);
    if (existing) {
      return existing;
    }
    const database = buildDatabase(
      createClient(url, { prepare: false }),
      "shared",
    );
    databasesForFactory.set(url, database);
    sharedDatabaseRemovers.set(database, () => {
      databasesForFactory.delete(url);
    });
    return database;
  }

  const client = createClient(url, {
    prepare: false,
  });
  return buildDatabase(client, "owned");
}

export async function closeSharedDatabase(database: Database) {
  if (database.ownership !== "shared") {
    return;
  }
  sharedDatabaseRemovers.get(database)?.();
  await databaseClosers.get(database)?.();
}
