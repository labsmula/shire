# Onchain Security

```txt
- Use ReentrancyGuard.
- Validate `msg.sender`.
- Validate each status transition.
- Validate that the payout does not exceed the escrowed amount.
- Only the resolver may settle disputes.
```
