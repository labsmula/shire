# Mode and Onboarding

## Modes

```txt
Candidate Mode:
For users who want to find work.

Company Mode:
For users who want to find talent.

Both:
The user can switch between both modes.
```

## Onboarding page

Route:

```txt
/onboarding
```

Content:

```txt
Welcome to Shire.
What do you want to do today?

[ Find Jobs ]
AI helps you turn your CV into a profile and find matching jobs.

[ Find Talents ]
AI helps your company or agency find matching candidates.

[ Use Both ]
Switch between job seeker and recruiter mode anytime.
```

## Onboarding behavior

### If the user chooses Find Jobs

```txt
1. Set `activeMode = CANDIDATE`
2. Create an empty `CandidateProfile` draft if one does not exist
3. Redirect to `/candidate/profile`
```

### If the user chooses Find Talents

```txt
1. Set `activeMode = COMPANY`
2. Redirect to `/company/new`
```

### If the user chooses Use Both

```txt
1. Set `activeMode = BOTH`
2. Create both candidate and company onboarding entry points
3. Let the user continue from the dashboard
```
