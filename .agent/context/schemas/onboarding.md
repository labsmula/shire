# Onboarding Schema

Store this in:

```txt
packages/shared/src/schemas
```

```ts
import { z } from "zod";

export const SelectUserModeSchema = z.object({
  mode: z.enum(["CANDIDATE", "COMPANY", "BOTH"]),
});
```

This schema is used by the onboarding route when the user chooses their active starting mode.
