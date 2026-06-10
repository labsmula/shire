# Company Schema

Store this in:

```txt
packages/shared/src/schemas
```

```ts
import { z } from "zod";

export const CompanySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  website: z.string().url().optional(),
  location: z.string().optional(),
  size: z.enum(["STARTUP", "SMALL", "MEDIUM", "LARGE"]).optional(),
  industry: z.string().optional(),
});
```

This schema covers the shared company profile shape used by onboarding, company creation, and admin workflows.
