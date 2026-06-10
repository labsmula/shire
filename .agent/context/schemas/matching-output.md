# Matching Output Schema

Store this in:

```txt
packages/shared/src/schemas
```

```ts
import { z } from "zod";

export const MatchingOutputSchema = z.object({
  matchScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  missingRequirements: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
  recommendedAction: z.enum([
    "SUGGEST_APPLY",
    "SUGGEST_INVITE",
    "SAVE_ONLY",
    "IGNORE"
  ]),
});
```

This schema standardizes ranking output for both job matching and talent matching.
