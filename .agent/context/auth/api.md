# Auth API

## Endpoints
```txt
GET  /api/auth/me
POST /api/auth/sync-user
POST /api/auth/set-active-mode
POST /api/onboarding/select-mode
```

## `POST /api/auth/sync-user`

Responsibilities:

```txt
- Read the Privy session or wallet session
- Find or create the User
- Link `privyUserId`, `walletAddress`, and `email` if available
- Return the current user
```

## `POST /api/onboarding/select-mode`

Body:

```json
{
  "mode": "CANDIDATE"
}
```

Behavior:

```txt
CANDIDATE:
- Set `activeMode` to `CANDIDATE`
- Create a `CandidateProfile` draft if one does not exist
- Set `onboardingDone = true`

COMPANY:
- Set `activeMode` to `COMPANY`
- Set `onboardingDone = true`

BOTH:
- Set `activeMode` to `BOTH`
- Set `onboardingDone = true`
```
