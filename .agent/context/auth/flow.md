# Authentication Flow

## Web app auth flow with Privy

```txt
User opens Shire web
   ↓
Clicks login
   ↓
Privy wallet login / SIWE
   ↓
Backend reads the Privy session
   ↓
Find or create User by `privyUserId` / `walletAddress`
   ↓
If onboarding is incomplete → redirect to `/onboarding`
   ↓
If onboarding is complete → redirect to `/dashboard`
```

## MiniPay mini app auth flow

```txt
User opens Shire in MiniPay
   ↓
App detects the MiniPay environment
   ↓
Wallet provider becomes available
   ↓
Connect wallet via wagmi
   ↓
Create or verify app session
   ↓
Find or create User by `walletAddress`
   ↓
If onboarding is incomplete → redirect to `/onboarding`
   ↓
If onboarding is complete → redirect to `/dashboard`
```
