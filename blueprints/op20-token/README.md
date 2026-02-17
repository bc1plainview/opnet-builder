# OP20 Token Blueprint

A complete OP20 fungible token project scaffold for Bitcoin Layer 1 with OP_NET.

## What You Get

| Component | Description |
|-----------|-------------|
| **Smart Contract** | AssemblyScript OP20 token with mint, transfer, allowance |
| **Unit Tests** | Full test suite with Blockchain mocking |
| **React Frontend** | Vite + TypeScript dApp with OP_WALLET integration |

## Quick Start

1. Tell your AI assistant: "Use the op20-token blueprint to create a token called [NAME] with symbol [SYMBOL] and [SUPPLY] supply"
2. The assistant will scaffold all three components using the correct templates and patterns
3. Verify with the build pipeline: `npm install && npm run lint && npm run typecheck && npm run build && npm run test`

## Project Structure

```
my-token/
├── contract/
│   ├── assembly/
│   │   ├── index.ts              # Contract entry point
│   │   └── contracts/
│   │       └── MyToken.ts        # OP20 token implementation
│   ├── asconfig.json             # AssemblyScript compiler config
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── MyToken.test.ts           # Token test suite
│   ├── setup.ts                  # Test configuration
│   ├── package.json              # Separate test dependencies
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── App.tsx               # Main app component
    │   ├── main.tsx              # Entry point
    │   ├── abi/
    │   │   └── MyTokenABI.ts     # Token ABI definition
    │   ├── hooks/
    │   │   ├── useWallet.ts      # Wallet connection hook
    │   │   └── useContract.ts    # Contract interaction hook
    │   └── components/
    │       ├── TokenDashboard.tsx # Token info display
    │       └── TransferForm.tsx  # Transfer interface
    ├── vite.config.ts
    ├── package.json
    ├── tsconfig.json
    └── index.html
```

## Key Patterns

- **SafeMath** for all u256 arithmetic
- **`onDeployment()`** for initialization
- **OP_WALLET** via `@btc-vision/opwallet`
- **Singleton provider** — one `JSONRpcProvider` per network
- **ABI-based interaction** — never raw RPC
- **`bigint`** for all token amounts and satoshi values
