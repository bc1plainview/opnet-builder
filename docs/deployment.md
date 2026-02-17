# Deployment Guide

How to deploy OPNet smart contracts to regtest and mainnet, including IPFS upload for frontends.

---

## Contract Deployment

### Method 1: OPNet CLI (Recommended)

```bash
# 1. Login
node /root/opnet-cli/build/index.js login --network regtest
# Or with mnemonic:
node /root/opnet-cli/build/index.js login --mnemonic "your 24 words..." --network regtest

# 2. Check identity
node /root/opnet-cli/build/index.js whoami

# 3. Compile your contract
node /root/opnet-cli/build/index.js compile

# 4. Sign the binary
node /root/opnet-cli/build/index.js sign build/MyContract.opnet

# 5. Deploy
node /root/opnet-cli/build/index.js deploy build/MyContract.opnet --network regtest
```

### Method 2: Programmatic Deployment

```typescript
import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import * as fs from 'fs';

const provider = new JSONRpcProvider('https://regtest.opnet.org', networks.regtest);

// Read the compiled .opnet binary
const contractBytecode = fs.readFileSync('./build/MyContract.opnet');

// Deploy using the transaction package
// The exact API depends on the @btc-vision/transaction version
// See the transaction package docs for DeployContractTransaction

await provider.close();
```

---

## Deployment Checklist

Before deploying to mainnet, verify ALL of these:

### Contract
- [ ] All storage pointers are unique (no collisions)
- [ ] SafeMath used for ALL u256 operations
- [ ] No while loops (bounded for loops only)
- [ ] `onDeployment()` contains all one-time init logic
- [ ] `onUpdate()` implemented (upgradeability)
- [ ] Constructor only sets up storage references
- [ ] StoredU256 uses EMPTY_POINTER subPointer
- [ ] StoredAddress takes 1 param only
- [ ] ABIDataTypes not imported in contract code (globally injected)
- [ ] All selectors registered in callMethod()
- [ ] Access control on sensitive functions (onlyOwner)
- [ ] Events emitted for all state changes

### Frontend
- [ ] WalletConnect CSS fix applied
- [ ] Own JSONRpcProvider created (not using walletconnect's)
- [ ] signer: null, mldsaSigner: null in sendTransaction
- [ ] All contract calls simulate before sending
- [ ] Error handling for simulation failures
- [ ] increaseAllowance() used instead of approve()
- [ ] optimize: false for all UTXO queries
- [ ] No bitcoinjs-lib, ecpair, or tiny-secp256k1 imports
- [ ] No mempool.space or blockstream API calls

### Backend
- [ ] hyper-express used (not express/fastify/koa)
- [ ] Actual signer keypairs passed to sendTransaction
- [ ] Private keys loaded from environment variables
- [ ] All contract calls simulate before sending

---

## Regtest Deployment

### RPC Endpoint
```
https://regtest.opnet.org
```

### Network Configuration
```typescript
import { networks } from '@btc-vision/bitcoin';
const network = networks.regtest;
```

### Getting Test BTC
Use the regtest faucet or mine blocks locally.

### Verification
After deploying, verify the contract is accessible:

```typescript
const provider = new JSONRpcProvider('https://regtest.opnet.org', networks.regtest);

// Try to read a contract property
const contract = getContract<IOP20Contract>(
    Address.fromString(deployedAddress),
    OP_20_ABI,
    provider,
    networks.regtest,
    Address.fromString(yourAddress)
);

const name = await contract.name();
console.log('Contract name:', name); // Should return your token name

await provider.close();
```

---

## Mainnet Deployment

### RPC Endpoint
```
https://mainnet.opnet.org
```

### Network Configuration
```typescript
import { networks } from '@btc-vision/bitcoin';
const network = networks.bitcoin;  // Note: "bitcoin", not "mainnet"
```

### Cost
Deployment costs real BTC. The cost depends on:
- Contract bytecode size (stored in Tapscript witness)
- Current Bitcoin fee rate
- Constructor calldata size

### Steps
1. Deploy to regtest first and test thoroughly
2. Run all verification checks from the checklist above
3. Ensure wallet has sufficient BTC (check fee estimates)
4. Deploy with the same process as regtest, just change the network

---

## Frontend Deployment — IPFS + .btc Domain

### Build Your Frontend
```bash
cd my-dapp
npm run build  # Produces dist/ directory
```

### Deploy to IPFS + .btc Domain
```bash
# Upload to IPFS and publish to .btc domain in one command
node /root/opnet-cli/build/index.js deploy my-domain ./dist

# Or publish an existing IPFS CID
node /root/opnet-cli/build/index.js website my-domain QmXyz...
```

### Manual IPFS Upload
If you prefer manual IPFS upload:

1. Upload the `dist/` directory to IPFS (Pinata, Infura, local node)
2. Get the CID (Content Identifier)
3. Publish to .btc domain:
```bash
node /root/opnet-cli/build/index.js website my-domain <CID>
```

---

## Contract Upgrades

### Preparing an Upgrade

1. Modify your contract code
2. Compile the new version
3. Deploy the new bytecode as a separate contract
4. Call the upgrade mechanism

### Executing an Upgrade

```typescript
// From inside a contract
Blockchain.updateContractFromExisting(newSourceAddress, calldata);

// This triggers onUpdate() on the target contract
// The target MUST have onUpdate() implemented
```

### Upgrade Safety
- `onUpdate()` should include access control (onlyOwner)
- Test upgrade path on regtest before mainnet
- Consider migration logic for changed storage layouts
- Pointer changes in upgrades can corrupt existing data if not handled

---

## Transaction Response Handling

```typescript
// sendRawTransaction returns:
const response = await provider.sendRawTransaction(txHex);

// Response shape:
{
    success: boolean,   // Whether broadcast succeeded
    result: string,     // The txid — NOT .txid, it's .result
    peers: number,      // Number of peers that received the tx
}

// WRONG
const txid = response.txid; // ❌ undefined

// CORRECT
const txid = response.result; // ✅ the actual txid
```

---

## Common Deployment Failures

### "Insufficient funds"
- Check UTXOs with `optimize: false`
- Ensure wallet has enough BTC for the deployment transaction
- Check that UTXOs aren't spent or pending

### "Contract already exists"
- Contract addresses are deterministic based on deployer + nonce
- If you've deployed before, the address may be taken
- Check if the contract already exists at the expected address

### "Simulation failed"
- Run the simulation separately and check the error
- Common causes: missing onDeployment, wrong calldata format
- On regtest: calldata bug may pass 0 bytes (see BUG-002)

### "Method not found"
- Verify selector is registered in callMethod()
- Remember: SHA-256 selectors, not keccak-256
- Check that the method name matches exactly

---

## Environment Variables

```bash
# Wallet credentials
export OPNET_MNEMONIC="your 24 word mnemonic phrase..."
export OPNET_PRIVATE_KEY="your_WIF_private_key"
export OPNET_NETWORK="regtest"  # or "mainnet"
export OPNET_RPC_URL="https://regtest.opnet.org"
```

Load these in your deployment scripts instead of hardcoding credentials.

---

## Package Versions (MANDATORY)

```json
{
    "dependencies": {
        "opnet": "1.8.1-beta.13",
        "@btc-vision/transaction": "1.8.0-beta.10",
        "@btc-vision/bitcoin": "7.0.0-alpha.11",
        "@btc-vision/walletconnect": "latest"
    }
}
```

**NEVER guess versions.** Wrong versions cause silent type mismatches and broken builds. These are the exact versions that are tested and work together.

### bs58check Compatibility
`bs58check@4.0.0` breaks with `@noble/hashes@2.0.1` (sha256→sha2.js rename). Let npm nest the older version automatically — do NOT deduplicate.
