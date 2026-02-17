# Installation

This guide walks you through setting up your development environment for building OPNet smart contracts.

## Quick Start - Clone Example Project

The fastest way to get started is to clone the official example-tokens repository:

```bash
git clone https://github.com/btc-vision/example-tokens.git
cd example-tokens
npm install
npm run build:token
```

This repository contains working examples of:
- Basic OP20 token
- Stablecoin with roles and pausability
- Pegged token
- Multi-oracle stablecoin
- NFT (OP721)

## Prerequisites

Before you begin, ensure you have:

- **Node.js 22+** - [Download Node.js](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Git** - [Download Git](https://git-scm.com/)

Verify your installation:

```bash
node --version  # Should be v22.0.0 or higher
npm --version   # Should be v9.0.0 or higher
```

## Manual Setup

If you prefer to set up from scratch:

### 1. Create Project

```bash
mkdir my-opnet-contract
cd my-opnet-contract
npm init -y
```

### 2. Install Dependencies

```bash
npm install @btc-vision/btc-runtime@1.11.0-rc.4 @btc-vision/as-bignum@0.1.2 @btc-vision/opnet-transform@1.0.6 @btc-vision/assemblyscript
npm install --save-dev prettier typescript
```

### 3. Create Configuration Files

Copy templates from the `setup/` folder:

```bash
cp setup/asconfig.json asconfig.json
cp setup/.prettierrc .prettierrc
cp setup/eslint-contract.json .eslintrc.json
```

Create `src/tsconfig.json` for AssemblyScript:

```json
{
    "extends": "@btc-vision/opnet-transform/std/assembly.json",
    "include": ["./**/*.ts"]
}
```

See `setup/README.md` for all available config templates.

### 4. Create Project Structure

```bash
mkdir -p src/token
```

#### `src/token/MyToken.ts`

```typescript
import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Blockchain,
    BytesWriter,
    Calldata,
    OP20,
    OP20InitParameters,
} from '@btc-vision/btc-runtime/runtime';

@final
export class MyToken extends OP20 {
    public constructor() {
        super();
    }

    public override onDeployment(_calldata: Calldata): void {
        const maxSupply: u256 = u256.fromString('1000000000000000000000000'); // 1 million tokens with 18 decimals
        const decimals: u8 = 18;
        const name: string = 'MyToken';
        const symbol: string = 'MTK';

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        // Mint initial supply to deployer
        this._mint(Blockchain.tx.origin, maxSupply);
    }
}
```

#### `src/token/index.ts`

```typescript
import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';
import { MyToken } from './MyToken';

// DO NOT TOUCH TO THIS.
Blockchain.contract = () => {
    // ONLY CHANGE THE CONTRACT CLASS NAME.
    // DO NOT ADD CUSTOM LOGIC HERE.

    return new MyToken();
};

// VERY IMPORTANT
export * from '@btc-vision/btc-runtime/runtime/exports';

// VERY IMPORTANT
export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}
```

### 5. Build

```bash
npm run build:token
```

If successful, you'll see `build/MyToken.wasm` generated.

## Adding More Contracts

To add more contracts (e.g., NFT), add a new target to `asconfig.json`:

```json
{
    "targets": {
        "token": {
            "outFile": "build/MyToken.wasm",
            "use": ["abort=src/token/index/abort"]
        },
        "nft": {
            "outFile": "build/MyNFT.wasm",
            "use": ["abort=src/nft/index/abort"]
        }
    },
    ...
}
```

And add a build script to `package.json`:

```json
{
    "scripts": {
        "build:token": "asc src/token/index.ts --target token --measure --uncheckedBehavior never",
        "build:nft": "asc src/nft/index.ts --target nft --measure --uncheckedBehavior never"
    }
}
```

## Package Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@btc-vision/btc-runtime` | ^1.10.8 | Core runtime - contracts, storage, events |
| `@btc-vision/as-bignum` | ^0.0.6 | 128-bit and 256-bit integer types |
| `@btc-vision/opnet-transform` | ^0.1.12 | AssemblyScript transform for OPNet |
| `assemblyscript` | ^0.28.9 | AssemblyScript compiler |

## Troubleshooting

### "Module not found" Errors

Ensure your imports use the correct paths:

```typescript
// Correct
import { OP_NET } from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

// Wrong
import { OP_NET } from 'btc-runtime';  // Missing @btc-vision scope
```

### Missing `src/tsconfig.json`

The `src/tsconfig.json` is required and must extend the opnet-transform config:

```json
{
    "extends": "@btc-vision/opnet-transform/std/assembly.json",
    "include": ["./**/*.ts"]
}
```

### AssemblyScript Version Mismatch

Ensure you're using AssemblyScript 0.28.9:

```bash
npm ls assemblyscript
# Should show ^0.28.9
```

## Next Steps

Now that your environment is set up:

1. [Create your first contract](./first-contract.md)
2. [Understand the project structure](./project-structure.md)
3. [Learn about the blockchain environment](../core-concepts/blockchain-environment.md)

---

**Navigation:**
- Previous: [Documentation Index](../README.md)
- Next: [First Contract](./first-contract.md)
