# /deploy — Build & Deploy Workflow

Build, lint, typecheck, test, and prepare for deployment.

## Workflow

### Step 1: Identify Project Type

Determine what's being deployed:
- **Smart Contract** — AssemblyScript → WASM
- **Frontend** — React + Vite → static files
- **Backend** — TypeScript + hyper-express → Node.js
- **Plugin** — TypeScript → Node.js module

### Step 2: Run Verification Pipeline

Execute ALL of these commands in order. Every step MUST pass.

```bash
# 1. Install dependencies
npm install

# 2. Format code (Prettier)
npm run format

# 3. Lint (MUST pass with zero errors)
npm run lint

# 4. TypeScript check (MUST pass with zero errors)
npm run typecheck

# 5. Build (MUST succeed)
npm run build

# 6. Run tests (MUST pass)
npm run test
```

**If ANY command fails, STOP. Fix the errors before proceeding.**

### Step 3: Verify Build Output

#### Smart Contract
- Verify `.wasm` file exists in `build/` directory
- Check file size is reasonable (not empty, not suspiciously small)

#### Frontend
- Verify `dist/` directory contains `index.html`, JS bundles, CSS
- Site must work as fully static — no SSR, no API routes
- All contract interactions happen client-side

#### Backend
- Verify compiled output in `build/` or `dist/`
- Test that the server starts without errors

#### Plugin
- Verify `plugin.json` manifest exists
- Verify compiled output

### Step 4: Pre-Deployment Checklist

- [ ] All lint errors fixed
- [ ] All typecheck errors fixed
- [ ] All tests passing
- [ ] Build succeeded
- [ ] No `any` types in codebase
- [ ] No hardcoded secrets, API keys, or private keys
- [ ] No `node_modules/` in deployment artifacts
- [ ] Correct network configuration (regtest/testnet/mainnet)

### Step 5: Package for Delivery

```bash
# Create clean zip (never include node_modules, build artifacts, secrets)
zip -r project.zip . \
  -x "node_modules/*" \
  -x "build/*" \
  -x "dist/*" \
  -x ".git/*" \
  -x "*.wasm" \
  -x ".env"
```

### Step 6: Deploy

#### Frontend to IPFS
1. Run `npm run build` to produce `dist/` folder
2. Upload `dist/` directory to your IPFS pinning service (Pinata, web3.storage, Fleek, etc.)
3. Verify the site loads correctly from the IPFS gateway

#### Backend
1. Deploy to your hosting provider
2. Verify health endpoint responds
3. Verify API routes work correctly

#### Smart Contract
1. Deploy using `TransactionFactory` (never raw PSBTs)
2. Verify deployment transaction confirmed
3. Test contract interaction on the target network
