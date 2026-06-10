# MiniPay Notes

Use MiniPay as the wallet environment for the mini app flow.

## Rules
- Detect the MiniPay environment before relying on wallet availability.
- Support wallet-only identity when Privy is not available.
- Keep the wallet abstraction compatible with wagmi and viem.
