# Job Schema

Store this in:

```txt
packages/shared/src/schemas
```

```ts
import { z } from "zod";

export const JobSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.string().optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  currency: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});
```

This schema is used for job creation, validation, and matching inputs.
