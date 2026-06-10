# Onchain API

## Endpoints
```txt
GET  /api/onchain/application/:id
POST /api/onchain/sync
GET  /api/onchain/events
```

## Notes
- Keep sync endpoints server-side and authenticated.
- Treat onchain data as authoritative for escrow and settlement state.
