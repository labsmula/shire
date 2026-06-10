# Candidate Profile Draft Schema

Store this in:

```txt
packages/shared/src/schemas
```

```ts
import { z } from "zod";

export const CandidateProfileDraftSchema = z.object({
  fullName: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
  workExperience: z.array(z.object({
    company: z.string().optional(),
    role: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
  })).default([]),
  education: z.array(z.object({
    institution: z.string().optional(),
    degree: z.string().optional(),
    year: z.string().optional(),
  })).default([]),
  preferredRoles: z.array(z.string()).default([]),
  expectedSalary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().optional(),
  }).optional(),
  location: z.string().optional(),
  workPreference: z.string().optional(),
  portfolioUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  profileConfidence: z.number().min(0).max(1),
  missingFields: z.array(z.string()).default([]),
});
```

This schema is used as the draft output for CV parsing and profile review before activation.
