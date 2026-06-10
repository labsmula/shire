# Onchain Sync

## Event sync job

It can live in:

```txt
apps/agent/src/jobs/run-onchain-sync.ts
```

Or for MVP:

```txt
apps/web/app/api/onchain/sync/route.ts
```

## Sync rules

```txt
ApplicationCreated:
- Create or update Application
- Set status APPLICANT_STAKED
- Save applicantStakeTx

CompanyStaked:
- Set status COMPANY_STAKED
- Save companyStakeTx

ApplicationCompleted:
- Set status COMPLETED

ApplicationExpired:
- Set status EXPIRED

DisputeOpened:
- Set status DISPUTED

DisputeResolved:
- Set status RESOLVED
```

## Duplicate protection

Use this table:

```txt
OnchainEvent
```

With this unique key:

```txt
txHash + eventName
```
