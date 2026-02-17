# Wallet Integration Guide

Complete guide to integrating OPWallet and WalletConnect into OPNet dApps.

---

## Overview

OPNet supports two wallet connection methods:
1. **OPWallet** — Browser extension (like MetaMask for OPNet)
2. **WalletConnect** — QR code / deep link connection via `@btc-vision/walletconnect`

Both wallets handle:
- Transaction signing
- ML-DSA key management
- Address resolution

---

## Key Principle: Frontend vs Backend Signing

### Frontend (Browser)
The wallet extension signs everything. You NEVER put private keys in frontend code.

```typescript
const receipt = await simulation.sendTransaction({
    signer: null,           // NULL — wallet extension signs
    mldsaSigner: null,      // NULL — wallet extension signs
    refundTo: userAddress,
});
```

### Backend (Server)
The server holds keys directly.

```typescript
const receipt = await simulation.sendTransaction({
    signer: wallet.keypair,           // Actual keypair
    mldsaSigner: wallet.mldsaKeypair, // Actual ML-DSA keypair
    refundTo: wallet.p2tr,
});
```

**This is the most important distinction.** Get it wrong and either:
- Frontend: you leak private keys to the browser (catastrophic)
- Backend: you pass null and nothing signs (transaction fails)

---

## WalletConnect Setup

### Install

```bash
npm install @btc-vision/walletconnect@latest
```

### CSS Fix (MANDATORY)

The WalletConnect modal renders broken at the page bottom. You MUST add this fix:

```css
/* Add to your global CSS / App.css */
.wallet-connect-modal,
[class*="walletconnect"] [class*="modal"],
[class*="WalletConnect"] [class*="Modal"] {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 99999 !important;
    background: rgba(0, 0, 0, 0.7) !important;
}

.wallet-connect-modal > div,
[class*="walletconnect"] [class*="modal"] > div,
[class*="WalletConnect"] [class*="Modal"] > div {
    position: relative !important;
    max-width: 420px !important;
    max-height: 80vh !important;
    overflow-y: auto !important;
    border-radius: 16px !important;
}
```

**Without this, users can't see the wallet popup and will report "wallet doesn't connect."**

---

## Provider Rules

### NEVER use WalletConnect's provider for RPC queries

```typescript
// ❌ WRONG — walletconnect provider is for signing only
const balance = await walletConnectProvider.getBalance(address);
const block = await walletConnectProvider.getBlock(height);

// ✅ CORRECT — create your own JSONRpcProvider
import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider('https://mainnet.opnet.org', networks.bitcoin);
const utxos = await provider.utxoManager.getUTXOs({ address, optimize: false });
```

WalletConnect provider = wallet connection + signing only.
JSONRpcProvider = ALL RPC queries (balances, blocks, contracts, UTXOs, etc.).

### NEVER use external Bitcoin APIs

```typescript
// ❌ WRONG — never use these for OPNet data
fetch('https://mempool.space/api/address/bc1p.../utxo');
fetch('https://blockstream.info/api/address/bc1p...');

// ✅ CORRECT — always use opnet package
const utxos = await provider.utxoManager.getUTXOs({
    address: 'bc1p...',
    optimize: false,  // ALWAYS false
});
```

---

## Address Handling

### Address Types
- **bc1p...** — Taproot (P2TR) — most common for OPNet users
- **bc1q...** — SegWit (P2WPKH)
- **opr1s...** — OPNet ML-DSA address (can't use with Address.fromString())
- **0x...** — Hex format (MLDSA hash or tweaked pubkey)

### Resolving opr1s Addresses
```typescript
// opr1s addresses can NOT be passed to Address.fromString()
// Must get the tweaked pubkey first
const pubkeyInfo = await provider.getPublicKeysInfoRaw(bitcoinAddress);
const tweakedPubkey = pubkeyInfo.tweakedPublicKey;
const address = Address.fromString(`0x${tweakedPubkey}`);
```

### P2WSH/P2SH Multisig Limitation
P2WSH and P2SH multisig addresses have NO tweaked pubkey. `getPublicKeysInfoRaw()` returns nothing for them. This is fundamental — these address types don't have a single public key.

---

## UTXO Queries

Always use `optimize: false`:

```typescript
const utxos = await provider.utxoManager.getUTXOs({
    address: walletAddress,
    optimize: false,           // ALWAYS false — true filters out UTXOs
    mergePendingUTXOs: true,   // Include unconfirmed
    filterSpentUTXOs: true,    // Exclude already spent
});

// Calculate balance
const balance = utxos.reduce((sum, utxo) => sum + utxo.value, 0n);
```

---

## Contract Interaction from Frontend

```typescript
import { getContract, IOP20Contract, OP_20_ABI, JSONRpcProvider } from 'opnet';
import { Address, networks } from '@btc-vision/bitcoin';

// 1. Create provider (YOUR OWN, not walletconnect's)
const provider = new JSONRpcProvider('https://mainnet.opnet.org', networks.bitcoin);

// 2. Get contract (5 params: address, abi, provider, network, sender)
const contract = getContract<IOP20Contract>(
    Address.fromString(contractAddress),
    OP_20_ABI,
    provider,
    networks.bitcoin,
    Address.fromString(userAddress)
);

// 3. Simulate
const simulation = await contract.transfer(
    Address.fromString(recipient),
    amount
);

// 4. Check for revert
if ('error' in simulation) {
    throw new Error(`Failed: ${simulation.error}`);
}

// 5. Send (null signers on frontend)
const receipt = await simulation.sendTransaction({
    signer: null,
    mldsaSigner: null,
    refundTo: userAddress,
});
```

---

## Custom Contract ABI

For contracts not covered by built-in ABIs:

```typescript
import { BitcoinInterfaceAbi, getContract, JSONRpcProvider } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';
import { Address, networks } from '@btc-vision/bitcoin';

// Define ABI
const MY_CONTRACT_ABI: BitcoinInterfaceAbi = [
    {
        name: 'claim',
        inputs: [
            { name: 'tweakedPubKey', type: ABIDataTypes.BYTES32 },
            { name: 'signature', type: ABIDataTypes.BYTES },
            { name: 'message', type: ABIDataTypes.BYTES },
        ],
        outputs: [
            { name: 'success', type: ABIDataTypes.BOOL },
        ],
        type: 'function',
    },
    {
        name: 'totalClaimed',
        inputs: [],
        outputs: [
            { name: 'count', type: ABIDataTypes.UINT256 },
        ],
        type: 'function',
    },
];

// Define interface
interface IMyContract {
    claim(pubkey: Uint8Array, sig: Uint8Array, msg: Uint8Array): Promise<any>;
    totalClaimed(): Promise<bigint>;
}

// Use it
const contract = getContract<IMyContract>(
    Address.fromString(contractAddress),
    MY_CONTRACT_ABI,
    provider,
    networks.bitcoin,
    Address.fromString(userAddress)
);
```

---

## ML-DSA Key Management

### Security Levels
```typescript
MLDSASecurityLevel.LEVEL2 = 44  // 1,312 byte pubkey, 2,420 byte sig (~128-bit security)
MLDSASecurityLevel.LEVEL3 = 65  // 1,952 byte pubkey, 3,309 byte sig (~192-bit security)
MLDSASecurityLevel.LEVEL5 = 87  // 2,592 byte pubkey, 4,627 byte sig (~256-bit security)
```

**Note:** These values are NOT 2, 3, 5 — they are 44, 65, 87 (CRYSTALS-Dilithium parameter set numbers).

### Key Generation (CLI)
```bash
node /root/opnet-cli/build/index.js keygen mldsa           # Level 2 (default, ML-DSA-44)
node /root/opnet-cli/build/index.js keygen mldsa --level 65 # Level 3 (ML-DSA-65)
node /root/opnet-cli/build/index.js keygen mldsa --level 87 # Level 5 (ML-DSA-87)
```

---

## Airdrop Claim Pattern

For claim-based airdrops, the contract mints tokens to the claimer (not a pre-transfer):

```typescript
import { MessageSigner } from '@btc-vision/transaction';

// 1. Sign claim message
const message = `Claim airdrop for ${airdropContractAddress}`;
const signed = await MessageSigner.tweakAndSignMessageAuto(message);

// 2. Simulate claim
const simulation = await airdropContract.claim(
    signed.tweakedPubKey,
    signed.signature,
    signed.messageHash
);

// 3. Check revert
if ('error' in simulation) {
    throw new Error(`Claim failed: ${simulation.error}`);
}

// 4. Send
const receipt = await simulation.sendTransaction({
    signer: null,
    mldsaSigner: null,
    refundTo: userAddress,
});
```

---

## Library Rules (MANDATORY)

Never install or import these:
| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `bitcoinjs-lib` | `@btc-vision/bitcoin` |
| `ecpair` | `@btc-vision/ecpair` |
| `tiny-secp256k1` | `@noble/curves` |
| `express` | `hyper-express` (backend only) |
| `fastify` | `hyper-express` (backend only) |
| `koa` | `hyper-express` (backend only) |

```typescript
// ✅ Correct imports
import * as bitcoin from '@btc-vision/bitcoin';
import { networks } from '@btc-vision/bitcoin';
import ECPairFactory from '@btc-vision/ecpair';
```
