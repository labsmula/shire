# Smart Contract Design

## Contract name

```txt
ShireEscrow
```

## Important principle

```txt
Never let AI trigger onchain settlement directly.
Only backend, user wallet actions, or resolver actions may call the contract.
```

The escrow asset is a stablecoin on Celo, not the native coin.

## Onchain application struct

```solidity
struct Application {
    uint256 id;
    uint256 jobId;
    address applicant;
    address company;
    uint256 applicantStake;
    uint256 companyStake;
    ApplicationStatus status;
    uint256 createdAt;
    uint256 deadline;
    bool disputeOpened;
}
```

## Status

```txt
PENDING
APPLICANT_STAKED
COMPANY_STAKED
COMPLETED
EXPIRED
DISPUTED
RESOLVED
```

## Core functions

```solidity
function createApplication(uint256 jobId) external returns (uint256);
function companyAcceptAndStake(uint256 applicationId) external;
function markCompleted(uint256 applicationId) external;
function confirmCompleted(uint256 applicationId) external;
function refundExpired(uint256 applicationId) external;
function openDispute(uint256 applicationId, string calldata evidenceURI, bytes32 evidenceHash) external;
function resolveDispute(uint256 applicationId, uint256 applicantPayout, uint256 companyPayout) external;
```

The functions should transfer an approved ERC20 stablecoin into escrow, not use native `msg.value` payments.

## Events

```solidity
event ApplicationCreated(
    uint256 indexed applicationId,
    uint256 indexed jobId,
    address indexed applicant,
    address company,
    uint256 applicantStake
);

event CompanyStaked(
    uint256 indexed applicationId,
    address indexed company,
    uint256 companyStake
);

event ApplicationCompleted(
    uint256 indexed applicationId
);

event StakeReleased(
    uint256 indexed applicationId,
    uint256 applicantPayout,
    uint256 companyPayout
);

event ApplicationExpired(
    uint256 indexed applicationId
);

event DisputeOpened(
    uint256 indexed applicationId,
    address indexed openedBy,
    string evidenceURI,
    bytes32 evidenceHash
);

event DisputeResolved(
    uint256 indexed applicationId,
    uint256 applicantPayout,
    uint256 companyPayout
);
```
