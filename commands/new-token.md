# /new-token — Scaffold OP20 Token Project

Scaffold a complete OP20 fungible token project on Bitcoin Layer 1 with OP_NET.

## What This Creates

1. **AssemblyScript smart contract** — OP20 token with mint, transfer, increaseAllowance, decreaseAllowance
2. **Unit tests** — Full test suite covering all token operations
3. **React frontend** — Vite + TypeScript dApp with OP_WALLET integration

## Workflow

### Step 1: Gather Requirements

Ask the user:
- Token name and symbol
- Total supply (or mintable?)
- Decimals (default: 18)
- Special features (burn, pause, cap, custom logic)

### Step 2: Read Required Docs

Read ALL of these IN ORDER before writing any code:

1. `skills/docs/core-typescript-law-CompleteLaw.md`
2. `skills/guidelines/setup-guidelines.md`
3. `skills/guidelines/contracts-guidelines.md`
4. `skills/docs/contracts-btc-runtime-README.md`
5. `skills/docs/contracts-btc-runtime-getting-started-installation.md`
6. `skills/docs/contracts-btc-runtime-getting-started-first-contract.md`
7. `skills/docs/contracts-btc-runtime-getting-started-project-structure.md`
8. `skills/docs/contracts-btc-runtime-core-concepts-storage-system.md`
9. `skills/docs/contracts-btc-runtime-core-concepts-pointers.md`
10. `skills/docs/contracts-btc-runtime-api-reference-safe-math.md`
11. `skills/docs/contracts-btc-runtime-gas-optimization.md`
12. `skills/docs/contracts-btc-runtime-core-concepts-security.md`
13. `skills/docs/contracts-btc-runtime-api-reference-op20.md`
14. `skills/docs/contracts-btc-runtime-contracts-op20-token.md`

For the frontend, also read:
- `skills/guidelines/frontend-guidelines.md`
- `skills/docs/core-opnet-contracts-instantiating-contracts.md`
- `skills/docs/frontend-motoswap-ui-README.md`

For tests, also read:
- `skills/guidelines/unit-testing-guidelines.md`
- `skills/docs/testing-unit-test-framework-README.md`

### Step 3: Build Contract

Use `skills/templates/contracts/OP20Token.ts` as the base template. Customize based on user requirements.

Project structure:
```
contract/
├── assembly/
│   ├── index.ts
│   └── contracts/
│       └── MyToken.ts
├── asconfig.json
├── package.json
└── tsconfig.json
```

### Step 4: Build Tests

Use `skills/templates/tests/` as the base. Write comprehensive tests for:
- Deployment and initialization
- Transfer operations
- Allowance operations (increaseAllowance, decreaseAllowance, transferFrom)
- Edge cases (zero amounts, self-transfer, overflow)
- Access control

### Step 5: Build Frontend

Use `skills/templates/frontend/` as the base. Include:
- OP_WALLET connection
- Token metadata display
- Transfer form
- Balance checking
- Transaction history

### Step 6: Verify Everything

```bash
# Contract
cd contract && npm install && npm run build
# Verify .wasm file exists

# Tests
cd ../tests && npm install && npm run test

# Frontend
cd ../frontend && npm install && npm run lint && npm run typecheck && npm run build
```

All commands MUST pass before delivery.
