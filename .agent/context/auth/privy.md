# Privy Notes

Use Privy for the web app login and session flow.

## Rules
- The backend should read the Privy session, not trust client-side claims.
- `privyUserId` is the preferred web identity when available.
- Keep session-based identity sync separate from UI state.
