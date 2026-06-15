import type { JobProcessor } from "./job-processor";

export const onchainSyncProcessor: JobProcessor<"onchain-sync"> = {
  name: "onchain-sync",
  llmPolicy: "forbidden",
  async process(payload) {
    return {
      status: "ready",
      chain: payload.chain,
      llmInvoked: false,
    };
  },
};
