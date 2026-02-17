# OPNet Architecture

## What OPNet Is

OPNet is a **consensus layer on Bitcoin L1**. It is NOT:
- A sidechain (no separate chain)
- An L2 (no rollups, no state channels)
- A metaprotocol like Ordinals (no OP_RETURN abuse)
- A bridge (no wrapped tokens)

OPNet runs **directly on Bitcoin**. Smart contracts execute as WebAssembly modules validated by the OPNet consensus layer, with all data anchored in Bitcoin transactions.

---

## Core Architecture

### Smart Contracts
- Written in **AssemblyScript** (TypeScript-like syntax)
- Compiled to **WebAssembly** (deterministic execution)
- Use the `@btc-vision/assemblyscript` compiler fork (not standard AS)
- Runtime provided by `@btc-vision/btc-runtime`

### Data Encoding
- Contract data is encoded in **Tapscript witnesses**
- Tapscript gets a 4x weight discount on Bitcoin (vs OP_RETURN's 80-byte limit)
- This is how OPNet fits complex contract data on L1

### Function Selectors
- **SHA-256 first 4 bytes** — NOT keccak-256 (Ethereum's choice)
- If you're porting Solidity patterns, recalculate all selectors

---

## Verify-Don't-Custody

This is the fundamental design principle. OPNet contracts **NEVER hold BTC**.

Instead:
1. A user creates a Bitcoin transaction with specific outputs
2. The OPNet contract verifies those outputs match the expected state
3. State is updated based on verification, not custody

Think of it like a notary: the contract validates and records, but never holds the assets.

**Implication:** You cannot write a "vault" contract that holds BTC. You write contracts that track who owns what and verify Bitcoin transactions that move funds between users.

---

## Partial Reverts

Contract execution can revert, but **Bitcoin transfers are always valid**.

If a contract call reverts:
- The OPNet state changes are rolled back
- But the underlying Bitcoin transaction (with its BTC transfers) is already on L1
- The BTC transfers happened and cannot be reversed

**Implication:** Always simulate before sending. A failed simulation costs nothing. A failed on-chain execution still costs the BTC transaction fee.

---

## Epoch Mining

OPNet uses **SHA1 proof-of-work** on top of Bitcoin's proof-of-work:

1. Transactions within a Bitcoin block are grouped into an epoch
2. A **checksum root** (cryptographic fingerprint) of the entire state is computed
3. This root is mined with SHA1 PoW
4. After **20 blocks**, the epoch is buried deep enough that altering it costs millions/hour

### Checksum Root
The checksum root is a cryptographic fingerprint of the entire contract state at that epoch. It makes **silent corruption impossible** — any change to any contract's state would produce a different root.

### Immutability Timeline
- Block 0 (epoch created): State is provisional
- Block 1-19: Increasingly expensive to revert
- Block 20+: **Cryptographically immutable** — changing it requires rewriting 20+ Bitcoin blocks AND the epoch PoW

---

## No Gas Token

OPNet uses **Bitcoin directly** for transaction fees. There is no:
- Gas token
- Utility token for fees
- Staking requirement

You pay in BTC. That's it.

---

## CSV Timelocks

All swap recipient addresses MUST use **CheckSequenceVerify (CSV)** timelocks. This is a Bitcoin script-level mechanism that prevents transaction pinning attacks.

### What is Transaction Pinning?
An attacker creates a conflicting transaction with a higher fee to prevent the original swap transaction from confirming. CSV timelocks close this vector by requiring the output to mature for at least 1 block before spending.

### Creating CSV Addresses
```typescript
const csvAddress = Address.fromString(tweakedPubkey).toCSV(1n); // 1-block timelock
```

---

## Token Standards

### OP20 — Fungible Tokens
- Like ERC-20 but on Bitcoin L1
- **SafeMath mandatory** for all u256 operations
- Uses `increaseAllowance()` / `decreaseAllowance()` instead of `approve()` (prevents race condition)
- Balances, allowances, and supply stored on-chain

### OP721 — Non-Fungible Tokens
- Like ERC-721 but on Bitcoin L1
- **Reservation-based minting** — users reserve mint slots
- Token ownership tracked on-chain
- Metadata typically stored off-chain (IPFS)

### OP20S — Signed OP20
- OP20 with signature verification capabilities
- Enables gasless meta-transactions (third party pays BTC fee)

---

## NativeSwap DEX

OPNet's built-in decentralized exchange.

### Virtual Reserves AMM
The AMM doesn't physically hold assets. It maintains virtual reserve accounting and verifies that Bitcoin transactions match expected outputs. This is verify-don't-custody applied to DEX.

### Two-Phase Commit
1. **Reservation:** Buyer locks in a price quote
2. **Execution:** BTC is sent atomically to up to 200 sellers in a single Bitcoin transaction

### Queue Impact
Pending sell orders affect effective reserves using logarithmic scaling. This prevents:
- Front-running (ordering transactions to extract value)
- MEV extraction (miner/validator extractable value)

### Slashing
Queue manipulation triggers a **50-90% penalty**. The penalty always exceeds the potential gain, making attacks economically irrational.

### Anti-Pinning
CSV timelocks on all swap addresses prevent transaction pinning. This is enforced at the protocol level — you can't create a pool without a CSV address.

---

## Security Model

### Epoch Finality
After 20 blocks, altering an epoch requires:
1. Rewriting 20+ Bitcoin blocks (costs millions/hour)
2. Redoing the SHA1 PoW for the epoch
3. Propagating the new chain to the majority of nodes

This makes finalized epochs effectively immutable.

### State Integrity
The checksum root ensures state integrity. If a single bit of any contract's storage changes, the root changes. Silent corruption is cryptographically impossible.

### Contract Upgradeability
Contracts can be upgraded via `onUpdate()` / `Blockchain.updateContractFromExisting()`. This is intentional — bugs in Bitcoin L1 contracts need a fix path. The upgrade mechanism requires the contract owner's signature.

---

## No ECDSA in Contract VM

The contract VM currently **cannot verify ECDSA signatures**. This means:
- No `ecrecover`-style operations
- No signature-gated functions using Bitcoin keys directly

Instead, use **ML-DSA (post-quantum)** signatures for in-contract verification. ECDSA support is being added via op-vm PRs but is not yet available.

---

## Network Topology

### Regtest
- URL: `https://regtest.opnet.org`
- For development and testing
- Fast block times
- Free faucet BTC

### Mainnet
- URL: `https://mainnet.opnet.org`
- Production network
- Real BTC costs
- Full epoch mining and finality

### Connecting
```typescript
import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

// Mainnet
const provider = new JSONRpcProvider('https://mainnet.opnet.org', networks.bitcoin);

// Regtest
const regtestProvider = new JSONRpcProvider('https://regtest.opnet.org', networks.regtest);
```

Always create your own `JSONRpcProvider`. Never use WalletConnect's provider for RPC queries.
