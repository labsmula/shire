# Staking Flow

## Candidate applies and stakes

```txt
1. The candidate selects a job.
2. Backend checks:
   - user is logged in
   - CandidateProfile is CONFIRMED
   - Job is ACTIVE
   - user is not a member of the company that owns the job
3. UI shows the stablecoin stake amount.
4. User approves the ERC20 token spend.
5. User signs the wallet transaction.
6. Contract `createApplication()`.
7. Backend syncs `ApplicationCreated`.
8. DB Application status = APPLICANT_STAKED.
```

## Company accepts and stakes

```txt
1. Company opens the application.
2. Backend checks:
   - user is a CompanyMember
   - application is valid
3. UI shows the company stablecoin stake amount.
4. Company approves the ERC20 token spend.
5. Company signs the transaction.
6. Contract `companyAcceptAndStake()`.
7. Backend syncs `CompanyStaked`.
8. DB Application status = COMPANY_STAKED.
```

## Normal completion

```txt
1. Company marks the work as completed.
2. Candidate confirms completion.
3. Contract releases both stakes.
4. Backend syncs the event.
5. Application status = COMPLETED.
```

## Expired refund

```txt
1. Candidate has already staked.
2. Company does not respond before the deadline.
3. Candidate calls `refundExpired()`.
4. Contract returns the applicant stablecoin stake.
5. Application status = EXPIRED.
```

## Dispute

```txt
1. Candidate or company opens a dispute.
2. Evidence is uploaded to R2 or S3.
3. Evidence hash is stored.
4. Evidence hash is submitted onchain.
5. Dispute Summary Agent creates the summary.
6. Admin reviews the case.
7. Admin resolver calls `resolveDispute()`.
8. Contract distributes the payout.
9. Application status = RESOLVED.
```
