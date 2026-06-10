# Agent Orchestration

Untuk MVP, Shire memakai 4 agent:

1. CV Profile Agent
2. Job Matching Agent
3. Talent Matching Agent
4. Dispute Summary Agent

## Activation principles
- Agent tidak berjalan berdasarkan role permanen.
- The agent runs based on active entities.
- One wallet can be active as both a candidate and a company at the same time.

## Aktivasi entity
- If `CandidateProfile = CONFIRMED`, the Job Matching Agent may run.
- If the user has a `Company` and `Job = ACTIVE`, the Talent Matching Agent may run.
- If there is a dispute, the Dispute Summary Agent may be used for an admin summary.

## Dampak desain
- Do not lock the user into a single mode.
- Do not assume a wallet can only have one role.
- Selalu cek status entity sebelum menjalankan agent.
