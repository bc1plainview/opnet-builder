# OP721 NFT Blueprint — Setup

## Prerequisites

- Node.js >= 24.0.0
- npm >= 10.0.0
- TypeScript >= 5.9.3

## Step 1: Create Project Structure

```bash
mkdir -p my-nft/{contract/assembly/contracts,tests,frontend/src/{abi,hooks,components,styles}}
```

## Step 2: Initialize Contract

```bash
cd my-nft/contract
npm init -y
npm install @btc-vision/btc-runtime as-bignum @btc-vision/assemblyscript
```

Create `asconfig.json` matching the template in `skills/docs/asconfig.json`.

Create `assembly/contracts/MyNFT.ts` using `skills/templates/contracts/OP721NFT.ts` as base.

Create `assembly/index.ts` as the entry point that exports your contract.

## Step 3: Initialize Tests

```bash
cd ../tests
npm init -y
# Add "type": "module" to package.json
npm install @btc-vision/unit-test-framework
```

Create test files using `skills/templates/tests/` as base, adapting for OP721 methods.

## Step 4: Initialize Frontend

```bash
cd ../frontend
npm init -y
npm install react react-dom opnet @btc-vision/transaction @btc-vision/opwallet @btc-vision/walletconnect
npm install -D typescript vite @vitejs/plugin-react @types/react @types/react-dom
```

Create frontend files using `skills/templates/frontend/` as base. Add:
- `MintInterface.tsx` — mint button with price display and supply counter
- `NFTGallery.tsx` — grid view using `balanceOf()` and `tokenOfOwnerByIndex()`
- `NFTCard.tsx` — individual NFT display with token ID and metadata

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
| Collection name/symbol | `MyNFT.ts` constructor | Change `super()` arguments |
| Max supply | `MyNFT.ts` | Change `MAX_SUPPLY` constant |
| Mint price | `MyNFT.ts` | Change `MINT_PRICE` constant (in sats, use `u256.fromU64()`) |
| Metadata storage | `MyNFT.ts` | Add `StoredMapU256` for token URI hashes |
| Gallery layout | `NFTGallery.tsx` | Modify grid CSS |
| Network | `frontend/src/` | Change provider URL and network config |
