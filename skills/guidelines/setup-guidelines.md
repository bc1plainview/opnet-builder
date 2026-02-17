# OPNet Project Setup Guidelines

**CRITICAL: Read this FIRST before creating any OPNet project.**

This document covers package versions, configurations, and project setup for ALL OPNet project types.

**This guideline is a SUMMARY. After reading this, you MUST read the project-specific docs listed in the Mandatory Reading Order section of each guideline file.**

---

## TYPESCRIPT LAW (MANDATORY - READ FIRST)

**BEFORE WRITING ANY CODE, YOU MUST READ AND FOLLOW:**

**`docs/core-typescript-law-CompleteLaw.md`**

**The TypeScript Law is NON-NEGOTIABLE.** It defines strict rules for type safety, code quality, and security. Every line of code must comply. Violations lead to exploitable, broken code that will be rejected.

**Key prohibitions:**
- `any` type - FORBIDDEN everywhere
- `unknown` (except at system boundaries) - FORBIDDEN
- `object` (lowercase) - FORBIDDEN
- `Function` (uppercase) - FORBIDDEN
- `{}` empty object type - FORBIDDEN
- `!` non-null assertion - FORBIDDEN
- `// @ts-ignore` - FORBIDDEN
- `eslint-disable` - FORBIDDEN
- Section separator comments (`// ===`, `// ---`) - FORBIDDEN

**Read the full TypeScript Law before proceeding.**

---

## Table of Contents

1. [Package Versions](#package-versions)
2. [Contract Project Setup](#contract-project-setup)
3. [Unit Test Project Setup](#unit-test-project-setup)
4. [Frontend Project Setup](#frontend-project-setup)
5. [TypeScript Law](#typescript-law)
6. [ESLint Configuration](#eslint-configuration)
7. [Code Verification Order (MANDATORY)](#code-verification-order-mandatory)
8. [Project Delivery (Zip Files)](#project-delivery-zip-files)
9. [Common Setup Mistakes](#common-setup-mistakes)

---

## Package Versions

**NEVER GUESS PACKAGE VERSIONS.** OPNet packages are actively developed with beta releases. Using wrong versions causes build failures.

### MANDATORY: Update Packages After Setup

**ALWAYS run this command after creating any project or after `npm install`:**

```bash
npx npm-check-updates -u && npm install
```

This ensures all packages are updated to their latest compatible versions. **Never skip this step.**

### Contract Dependencies

```json
{
    "dependencies": {
        "@btc-vision/as-bignum": "0.1.2",
        "@btc-vision/btc-runtime": "1.11.0-rc.4"
    },
    "devDependencies": {
        "@btc-vision/assemblyscript": "latest",
        "@btc-vision/opnet-transform": "1.0.6"
    },
    "overrides": {
        "@noble/hashes": "2.0.1"
    }
}
```

### Unit Test Dependencies

Unit tests are **TypeScript** (NOT AssemblyScript). They have a SEPARATE package.json.

```json
{
    "type": "module",
    "dependencies": {
        "@btc-vision/unit-test-framework": "0.4.10",
        "@btc-vision/transaction": "1.8.0-beta.10"
    },
    "devDependencies": {
        "typescript": "latest",
        "ts-node": "latest",
        "gulp": "latest",
        "@types/node": "latest"
    },
    "overrides": {
        "@noble/hashes": "2.0.1"
    }
}
```

### Frontend Dependencies

```json
{
    "dependencies": {
        "react": "latest",
        "react-dom": "latest",
        "opnet": "1.8.1-beta.13",
        "@btc-vision/transaction": "1.8.0-beta.10",
        "@btc-vision/bitcoin": "7.0.0-alpha.11",
        "@btc-vision/ecpair": "4.0.2",
        "@btc-vision/bip32": "7.0.2",
        "@btc-vision/walletconnect": "1.10.0-beta.0"
    },
    "devDependencies": {
        "vite": "latest",
        "@vitejs/plugin-react": "latest",
        "vite-plugin-node-polyfills": "latest",
        "typescript": "latest",
        "@types/react": "latest",
        "@types/react-dom": "latest",
        "@types/node": "latest",
        "eslint": "latest",
        "@typescript-eslint/eslint-plugin": "latest",
        "@typescript-eslint/parser": "latest",
        "eslint-plugin-react": "latest",
        "eslint-plugin-react-hooks": "latest",
        "crypto-browserify": "latest",
        "stream-browserify": "latest"
    },
    "overrides": {
        "@noble/hashes": "2.0.1"
    }
}
```

**Always use "latest" for tooling dependencies** (react, vite, typescript, eslint, etc.). **Keep @btc-vision and opnet packages version-specific** as they require tested compatible versions.

---

## Contract Project Setup

### Directory Structure

```
my-contract/
├── src/
│   ├── index.ts           # Entry point (factory + abort)
│   └── MyContract.ts      # Contract implementation
├── build/                 # Compiled WASM output
├── package.json
├── asconfig.json          # AssemblyScript config
└── tsconfig.json          # TypeScript config (for IDE)
```

### asconfig.json (CRITICAL)

```json
{
    "targets": {
        "debug": {
            "outFile": "build/MyContract.wasm",
            "textFile": "build/MyContract.wat"
        }
    },
    "options": {
        "transform": "@btc-vision/opnet-transform",
        "sourceMap": false,
        "optimizeLevel": 3,
        "shrinkLevel": 1,
        "converge": true,
        "noAssert": false,
        "enable": [
            "sign-extension",
            "mutable-globals",
            "nontrapping-f2i",
            "bulk-memory",
            "simd",
            "reference-types",
            "multi-value"
        ],
        "runtime": "stub",
        "memoryBase": 0,
        "initialMemory": 1,
        "exportStart": "start",
        "use": [
            "abort=index/abort"
        ]
    }
}
```

**Key points:**
- `transform`: Must be `@btc-vision/opnet-transform` (NOT a subpath)
- `enable`: ALL listed features are required
- `use`: Must point to your abort handler (`abort=index/abort` means `src/index.ts` exports `abort`)
- `runtime`: Must be `"stub"`
- `exportStart`: Must be `"start"`

### package.json scripts

```json
{
    "scripts": {
        "build": "asc src/index.ts --config asconfig.json --target debug",
        "clean": "rm -rf build/*"
    }
}
```

---

## Unit Test Project Setup

**Unit tests are TypeScript, NOT AssemblyScript.** They run in Node.js and load the compiled WASM.

### Directory Structure

```
my-contract/
├── src/                   # Contract source (AssemblyScript)
├── build/                 # Compiled WASM
├── tests/                 # Unit tests (TypeScript)
│   ├── MyContract.test.ts
│   └── tsconfig.json      # Separate tsconfig for tests
├── package.json
└── asconfig.json
```

### Test tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "outDir": "./build"
    },
    "include": ["*.ts"]
}
```

### Test package.json scripts

```json
{
    "scripts": {
        "test": "npx ts-node --esm tests/MyContract.test.ts"
    }
}
```

---

## Frontend Project Setup

### Directory Structure

```
my-frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utility classes/functions
│   ├── services/          # API/contract services
│   ├── types/             # TypeScript interfaces
│   └── abi/               # Contract ABIs
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### vite.config.ts (COMPLETE - USE THIS)

**This is a production-ready OPNet dApp configuration. Do not simplify it.**

```typescript
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import eslint from 'vite-plugin-eslint2';

export default defineConfig({
    base: '/',
    plugins: [
        // Node.js polyfills MUST come first
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true
            },
            overrides: {
                crypto: 'crypto-browserify'
            }
        }),
        react(),
        // ESLint plugin - validates on every save
        eslint({
            cache: false
        })
    ],
    resolve: {
        alias: {
            global: 'global',
            // Browser shim for Node.js fetch - REQUIRED for opnet
            undici: resolve(__dirname, 'node_modules/opnet/src/fetch/fetch-browser.js')
        },
        // Resolve order matters for hybrid packages
        mainFields: ['module', 'main', 'browser'],
        // Dedupe prevents multiple copies of shared deps
        dedupe: ['@noble/curves', '@noble/hashes', '@scure/base', 'buffer', 'react', 'react-dom']
    },
    build: {
        commonjsOptions: {
            strictRequires: true,
            transformMixedEsModules: true
        },
        rollupOptions: {
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names?.[0] ?? '';
                    const info = name.split('.');
                    const ext = info[info.length - 1];
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
                        return `images/[name][extname]`;
                    }
                    if (/woff|woff2|eot|ttf|otf/i.test(ext || '')) {
                        return `fonts/[name][extname]`;
                    }
                    if (/css/i.test(ext || '')) {
                        return `css/[name][extname]`;
                    }
                    return `assets/[name][extname]`;
                },
                // Manual chunk splitting for optimal loading
                manualChunks(id) {
                    // crypto-browserify has circular deps - don't split
                    if (id.includes('crypto-browserify') || id.includes('randombytes')) {
                        return undefined;
                    }
                    if (id.includes('node_modules')) {
                        // Noble crypto - shared across packages
                        if (id.includes('@noble/curves')) return 'noble-curves';
                        if (id.includes('@noble/hashes')) return 'noble-hashes';
                        if (id.includes('@scure/')) return 'scure';

                        // @btc-vision packages - split individually
                        if (id.includes('@btc-vision/transaction')) return 'btc-transaction';
                        if (id.includes('@btc-vision/bitcoin')) return 'btc-bitcoin';
                        if (id.includes('@btc-vision/bip32')) return 'btc-bip32';
                        if (id.includes('@btc-vision/post-quantum')) return 'btc-post-quantum';
                        if (id.includes('@btc-vision/wallet-sdk')) return 'btc-wallet-sdk';
                        if (id.includes('@btc-vision/logger')) return 'btc-logger';
                        if (id.includes('@btc-vision/passworder')) return 'btc-passworder';

                        // opnet library
                        if (id.includes('node_modules/opnet')) return 'opnet';

                        // Bitcoin utilities
                        if (id.includes('bip39')) return 'bip39';
                        if (id.includes('ecpair') || id.includes('tiny-secp256k1')) return 'bitcoin-utils';
                        if (id.includes('bitcore-lib')) return 'bitcore';

                        // React + UI - MUST be in same chunk for initialization order
                        if (
                            id.includes('node_modules/react-dom') ||
                            id.includes('node_modules/react/') ||
                            id.includes('node_modules/scheduler') ||
                            id.includes('antd') ||
                            id.includes('@ant-design') ||
                            id.includes('rc-') ||
                            id.includes('@rc-component')
                        )
                            return 'react-ui';

                        // Other large deps
                        if (id.includes('ethers')) return 'ethers';
                        if (id.includes('protobufjs') || id.includes('@protobufjs')) return 'protobuf';
                        if (id.includes('lodash')) return 'lodash';
                    }
                }
            },
            // Exclude Node.js-only modules from bundle
            external: [
                'worker_threads',
                'node:sqlite',
                'node:diagnostics_channel',
                'node:async_hooks',
                'node:perf_hooks',
                'node:worker_threads'
            ]
        },
        target: 'esnext',
        modulePreload: false,
        cssCodeSplit: false,
        assetsInlineLimit: 10000,
        chunkSizeWarningLimit: 3000
    },
    optimizeDeps: {
        // Pre-bundle these for faster dev server startup
        include: ['react', 'react-dom', 'buffer', 'process', 'stream-browserify'],
        // Exclude packages that need special handling
        exclude: ['@btc-vision/transaction', 'crypto-browserify']
    }
});
```

### Vite Config Key Points

| Setting | Why Required |
|---------|--------------|
| `nodePolyfills` first | Must run before React plugin |
| `crypto: 'crypto-browserify'` | Browser crypto shim for signing |
| `undici` alias | opnet uses undici for fetch, needs browser shim |
| `dedupe` array | Prevents multiple copies of crypto libs (breaks signatures) |
| `manualChunks` | Optimal code splitting for OPNet apps |
| `external` array | Excludes Node.js modules that can't run in browser |
| `exclude: ['crypto-browserify']` | Has circular deps, must not be pre-bundled |

### Required Dev Dependencies

```json
{
    "devDependencies": {
        "vite": "latest",
        "@vitejs/plugin-react": "latest",
        "vite-plugin-node-polyfills": "latest",
        "vite-plugin-eslint2": "latest",
        "crypto-browserify": "latest",
        "stream-browserify": "latest",
        "typescript": "latest",
        "@types/react": "latest",
        "@types/react-dom": "latest",
        "@types/node": "latest",
        "eslint": "latest",
        "@typescript-eslint/eslint-plugin": "latest",
        "@typescript-eslint/parser": "latest",
        "eslint-plugin-react": "latest",
        "eslint-plugin-react-hooks": "latest"
    }
}
```

### tsconfig.json (Frontend)

```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "jsx": "react-jsx",
        "lib": ["ESNext", "DOM", "DOM.Iterable"]
    },
    "include": ["src"]
}
```

---

## TypeScript Law

**These rules are NON-NEGOTIABLE for ALL OPNet projects.**

### FORBIDDEN Constructs

| Construct | Why Forbidden | Use Instead |
|-----------|---------------|-------------|
| `any` | Runtime bugs, defeats TypeScript | Proper types, generics |
| `unknown` | Only at system boundaries | Proper types after validation |
| `object` (lowercase) | Too broad | `Record<string, T>` or interface |
| `Function` (uppercase) | No type safety | `() => ReturnType` |
| `{}` | Means "any non-nullish" | `Record<string, never>` |
| `!` (non-null assertion) | Hides null bugs | Explicit checks, `?.` |
| `// @ts-ignore` | Hides errors | Fix the actual error |
| `eslint-disable` | Bypasses safety | Fix the actual issue |

### FORBIDDEN: Section Separator Comments

**NEVER write:**
```typescript
// ==================== PRIVATE METHODS ====================
// ---------------------- HELPERS ----------------------
// ************* CONSTANTS *************
```

**These are lazy and unprofessional.** Use TSDoc instead:

```typescript
/**
 * Transfers tokens from sender to recipient.
 *
 * @param to - The recipient address
 * @param amount - The amount in base units
 * @returns True if transfer succeeded
 * @throws {InsufficientBalanceError} If balance too low
 */
public async transfer(to: Address, amount: bigint): Promise<boolean> {
    // ...
}
```

### Numeric Types

| Use `number` for | Use `bigint` for |
|------------------|------------------|
| Array lengths | Satoshi amounts |
| Loop counters | Block heights |
| Small flags | Timestamps |
| Ports, pixels | Token amounts |
| | File sizes |

**FORBIDDEN: Floats for financial values.** Use `bigint` with explicit decimals.

### Required tsconfig Settings

```json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,
        "module": "ESNext",
        "target": "ESNext"
    }
}
```

---

## ESLint Configuration

### For Contracts (AssemblyScript)

Use `docs/eslint-contract.json` from opnet-skills.

### For Unit Tests (TypeScript)

Use `docs/eslint-generic.json` from opnet-skills.

### For Frontend (React)

Use `docs/eslint-react.json` from opnet-skills.

**Key rules (all configs):**
- `@typescript-eslint/no-explicit-any`: "error"
- `@typescript-eslint/explicit-function-return-type`: "error"
- `@typescript-eslint/no-unused-vars`: "error"

---

## Code Verification Order (MANDATORY)

**Before considering code complete, verify in this order:**

| Order | Check | Command | Fix Before Proceeding |
|-------|-------|---------|----------------------|
| 1 | **ESLint** | `npm run lint` | Fix ALL lint errors first |
| 2 | **TypeScript** | `npm run typecheck` or `tsc --noEmit` | Fix type errors after lint passes |
| 3 | **Build** | `npm run build` | Only build after lint + types pass |
| 4 | **Tests** | `npm run test` | Run tests on clean build |

**WHY THIS ORDER:**
- ESLint catches `any` types, missing return types, unused variables
- TypeScript catches type mismatches, null safety issues
- Running TypeScript first hides ESLint errors that would catch forbidden patterns
- A passing build with lint errors means broken code shipped

**Example package.json scripts:**

```json
{
    "scripts": {
        "lint": "eslint src --ext .ts,.tsx",
        "lint:fix": "eslint src --ext .ts,.tsx --fix",
        "typecheck": "tsc --noEmit",
        "build": "npm run lint && npm run typecheck && tsc",
        "test": "npm run build && node --experimental-vm-modules node_modules/jest/bin/jest.js"
    }
}
```

**NEVER skip ESLint. NEVER ship code with lint errors.**

---

## Project Delivery (Zip Files)

**When delivering a project as a zip file:**

### NEVER Include

| Exclude | Why |
|---------|-----|
| `node_modules/` | 100MB+ of dependencies, recipient runs `npm install` |
| `build/` or `dist/` | Generated files, recipient runs `npm run build` |
| `.git/` | Repository history not needed |
| `*.wasm` | Compiled output, regenerated from source |
| `.env` | Contains secrets, NEVER share |

### Correct Zip Command

```bash
# From project root
zip -r project.zip . -x "node_modules/*" -x "build/*" -x "dist/*" -x ".git/*" -x "*.wasm" -x ".env"
```

### Alternative: Use .zipignore or Script

```bash
# Create delivery script
cat > zip-project.sh << 'EOF'
#!/bin/bash
PROJECT_NAME=$(basename "$PWD")
zip -r "../${PROJECT_NAME}.zip" . \
    -x "node_modules/*" \
    -x "build/*" \
    -x "dist/*" \
    -x ".git/*" \
    -x "*.wasm" \
    -x ".env" \
    -x ".env.*" \
    -x "*.log"
echo "Created ../${PROJECT_NAME}.zip"
EOF
chmod +x zip-project.sh
```

### What TO Include

- All source files (`src/`, `tests/`)
- Configuration files (`package.json`, `tsconfig.json`, `asconfig.json`, `eslint.config.js`)
- Documentation (`README.md`)
- Lock file (`package-lock.json`) - ensures reproducible installs

**Recipient setup:**
```bash
unzip project.zip -d my-project
cd my-project
npm install --legacy-peer-deps
npm run build
```

---

## Common Setup Mistakes

### 1. Wrong transform path

**WRONG:**
```json
"transform": "@btc-vision/btc-runtime/runtime/transform"
"transform": ["@btc-vision/opnet-transform"]
```

**CORRECT:**
```json
"transform": "@btc-vision/opnet-transform"
```

### 2. Missing WASM features

If contract builds but fails at runtime, check `enable` array includes ALL features.

### 3. Workspace conflicts

**Don't use npm workspaces** with OPNet packages. Install each project separately:

```bash
cd contract && npm install --legacy-peer-deps
cd ../frontend && npm install --legacy-peer-deps
```

### 4. Missing abort handler

If contract builds but crashes immediately, check:
- `asconfig.json` has `"use": ["abort=index/abort"]`
- `src/index.ts` exports the `abort` function
- Import path is `@btc-vision/btc-runtime/runtime/abort/abort`

### 5. Vite plugin version mismatch

`vite-plugin-node-polyfills@0.22.0` requires Vite 5.x, NOT Vite 6.x.
