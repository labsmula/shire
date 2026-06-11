import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { searchKnowledge } from "../../runtime/knowledge";

export const knowledgeContextToolId = "knowledge-context-tool";

export const knowledgeContextInputSchema = z.object({
  query: z.string().trim().min(1),
  topK: z.number().int().min(1).max(10).default(5),
});

export const knowledgeContextOutputSchema = z.object({
  results: z.array(
    z.object({
      path: z.string(),
      text: z.string(),
      score: z.number().optional(),
    }),
  ),
});

export const knowledgeContextTool = createTool({
  id: knowledgeContextToolId,
  description:
    "Retrieve bounded, repository-approved Shire context for a specific query.",
  inputSchema: knowledgeContextInputSchema,
  outputSchema: knowledgeContextOutputSchema,
  execute: async ({ query, topK }) => ({
    results: (await searchKnowledge(query)).slice(0, topK),
  }),
});
