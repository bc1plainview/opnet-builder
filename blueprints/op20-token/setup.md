# OP20 Token Blueprint — Setup

## Prerequisites

- Node.js >= 24.0.0
- npm >= 10.0.0
- TypeScript >= 5.9.3

## Step 1: Create Project Structure

```bash
mkdir -p my-token/{contract/assembly/contracts,tests,frontend/src/{abi,hooks,components,styles}}
```

## Step 2: Initialize Contract

```bash
cd my-token/contract
npm init -y
npm install @btc-vision/btc-runtime as-bignum @btc-vision/assemblyscript
```

Create `asconfig.json` matching the template in `skills/docs/asconfig.json`.

Create `assembly/contracts/MyToken.ts` using `skills/templates/contracts/OP20Token.ts` as base.

Create `assembly/index.ts` as the entry point that exports your contract.

## Step 3: Initialize Tests

```bash
cd ../tests
npm init -y
# Add "type": "module" to package.json
npm install @btc-vision/unit-test-framework
```

Create test files using `skills/templates/tests/` as base.

## Step 4: Initialize Frontend

```bash
cd ../frontend
npm init -y
npm install react react-dom opnet @btc-vision/transaction @btc-vision/opwallet @btc-vision/walletconnect
npm install -D typescript vite @vitejs/plugin-react @types/react @types/react-dom
```

Create frontend files using `skills/templates/frontend/` as base.

## Step 5: Configure Tooling

For each sub-project, create:
- `tsconfig.json` matching `skills/docs/tsconfig-generic.json`
- `eslint.config.js` using appropriate config from `skills/docs/`
- `.prettierrc` with standard OPNet Prettier config

## Step 6: Build & Verify

```bash
# Contract
cd contract && npm run build
# Verify .wasm file exists

# Tests
cd ../tests && npm run test

# Frontend
cd ../frontend && npm run lint && npm run typecheck && npm run build
```

## Customization Points

| What | Where | How |
|------|-------|-----|
| Token name/symbol | `MyToken.ts` constructor | Change `super()` arguments |
| Total supply | `MyToken.ts` constructor | Change `u256.fromString()` value |
| Decimals | `MyToken.ts` constructor | Change decimals parameter |
| Custom methods | `MyToken.ts` | Add new methods with `@method` decorator |
| Frontend theme | `frontend/src/styles/` | Modify CSS files |
| Network | `frontend/src/` | Change provider URL and network config |
