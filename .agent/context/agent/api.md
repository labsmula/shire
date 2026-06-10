# Agent API

## Endpoints
```txt
POST /api/agent/parse-cv
POST /api/agent/run-job-matching
POST /api/agent/run-talent-matching
POST /api/agent/summarize-dispute
```

## Security
```txt
- Wajib internal secret
- Do not expose these freely to the client
- For public actions, trigger them through an authenticated server action
```
