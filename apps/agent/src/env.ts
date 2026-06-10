import { parseAutonomyMode } from "./runtime/autonomy";

export function createEnv(input: NodeJS.ProcessEnv = process.env) {
  return {
    nodeEnv: input.NODE_ENV ?? "development",
    port: Number(input.PORT ?? 3001),
    autonomyMode: parseAutonomyMode(input.SHIRE_AUTONOMY_MODE),
  } as const;
}

export const env = createEnv();
