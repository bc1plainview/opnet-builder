# Blueprint: Create a NativeSwap Liquidity Pool

End-to-end guide to creating and managing a NativeSwap AMM pool on OPNet.

---

## Overview

NativeSwap is OPNet's decentralized exchange. Key concepts:

- **Virtual reserves AMM** — doesn't physically hold assets, tracks economic effect
- **Two-phase commit** — reservation locks price, execution sends BTC to sellers atomically
- **Queue Impact** — logarithmic scaling of pending sell orders on effective reserves
- **Slashing** — 50-90% penalty for queue manipulation
- **CSV timelocks** — mandatory for all swap recipient addresses (anti-pinning)
- **Up to 200 providers** in a single atomic Bitcoin transaction

---

## Prerequisites

- An OP20 token already deployed (see `blueprints/op20-token.md`)
- BTC in your wallet for transaction fees
- Token balance for initial liquidity

---

## Step 1: Install Dependencies

```bash
npm install opnet@1.8.1-beta.13
npm install @btc-vision/transaction@1.8.0-beta.10
npm install @btc-vision/bitcoin@7.0.0-alpha.11
```

---

## Step 2: Create CSV P2WSH Address

NativeSwap REQUIRES a CSV (CheckSequenceVerify) P2WSH receiver address with a 1-block timelock. Without it, pool creation fails.

```typescript
import { Address } from '@btc-vision/bitcoin';

// Get your tweaked pubkey
const pubkeyInfo = await provider.getPublicKeysInfoRaw(yourBitcoinAddress);
const tweakedPubkey = pubkeyInfo.tweakedPublicKey;

// Create CSV P2WSH address with 1-block timelock
const csvAddress = Address.fromString(`0x${tweakedPubkey}`).toCSV(1n);
console.log('CSV Address:', csvAddress);
```

**Why CSV?** It prevents transaction pinning attacks. Without CSV, an attacker can double-spend the BTC leg of a swap by pinning a conflicting transaction with a higher fee.

---

## Step 3: Approve Token Spending

The pool needs to spend your tokens. Use `increaseAllowance()`, NOT `approve()`.

```typescript
import { getContract, IOP20Contract, OP_20_ABI, JSONRpcProvider } from 'opnet';
import { networks, Address } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider('https://regtest.opnet.org', networks.regtest);

const tokenContract = getContract<IOP20Contract>(
    Address.fromString(tokenAddress),
    OP_20_ABI,
    provider,
    networks.regtest,
    Address.fromString(yourAddress)
);

// Approve NativeSwap to spend tokens
// NOTE: increaseAllowance(), NOT approve()
const approveSim = await tokenContract.increaseAllowance(
    Address.fromString(nativeswapRouterAddress),
    tokenAmount
);

if ('error' in approveSim) {
    throw new Error(`Approve simulation failed: ${approveSim.error}`);
}

const approveReceipt = await approveSim.sendTransaction({
    signer: wallet.keypair,       // Backend: actual signer
    mldsaSigner: wallet.mldsaKeypair,
    refundTo: yourAddress,
});

console.log('Approve tx:', approveReceipt);
```

---

## Step 4: WAIT FOR CONFIRMATION

**CRITICAL:** The approve transaction MUST be confirmed (included in a block) before creating the pool. Approve and pool creation CANNOT be in the same block.

```typescript
// Wait for the approve transaction to be confirmed
// On regtest, mine a block or wait for the next block
// On mainnet, wait for at least 1 confirmation

// Simple polling approach:
async function waitForConfirmation(txid: string, provider: JSONRpcProvider): Promise<void> {
    while (true) {
        try {
            // Note: getBlock() needs Number, not BigInt
            const tx = await provider.getTransaction(txid);
            if (tx && tx.blockNumber) {
                console.log(`Confirmed in block ${tx.blockNumber}`);
                return;
            }
        } catch {
            // Not confirmed yet
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

await waitForConfirmation(approveReceipt.txid, provider);
```

---

## Step 5: Create the Pool

```typescript
// Now create the pool — AFTER approve is confirmed

const createPoolSim = await nativeswapRouter.createPool({
    token: Address.fromString(tokenAddress),
    receiver: csvAddress,  // CSV P2WSH address from Step 2
    initialLiquidity: tokenAmount,
    initialBTCReserve: btcReserveAmount,  // Virtual BTC reserve
    maxReservesIn5BlocksPercent: 10,       // 10% — direct percentage, NOT basis points
    // ... other parameters
});

if ('error' in createPoolSim) {
    throw new Error(`Pool creation simulation failed: ${createPoolSim.error}`);
}

const poolReceipt = await createPoolSim.sendTransaction({
    signer: wallet.keypair,
    mldsaSigner: wallet.mldsaKeypair,
    refundTo: yourAddress,
});

console.log('Pool created:', poolReceipt);
```

---

## Step 6: Verify Pool

```typescript
// Query the pool to verify it was created successfully
const poolInfo = await nativeswapRouter.getPool(Address.fromString(tokenAddress));
console.log('Pool info:', poolInfo);
```

---

## Key Parameters

### maxReservesIn5BlocksPercent

This is a **direct percentage (0-100)**, NOT basis points.

```typescript
// WRONG — 500 means 500%, not 5%
maxReservesIn5BlocksPercent: 500  // ❌

// CORRECT — 5 means 5%
maxReservesIn5BlocksPercent: 5    // ✅
```

This controls the maximum percentage of reserves that can be withdrawn in 5 blocks. Higher = more liquid but more susceptible to sudden drain. Lower = more stable but less liquid.

---

## NativeSwap Architecture Notes

### Virtual Reserves
The pool doesn't physically hold BTC or tokens. It maintains a virtual accounting of reserves and verifies that Bitcoin L1 transactions match expected outputs. This is the verify-don't-custody model.

### Two-Phase Commit
1. **Reservation phase:** Buyer locks in a price by creating a reservation
2. **Execution phase:** BTC is sent atomically to up to 200 sellers

### Queue Impact
Pending sell orders affect the effective reserves logarithmically. This prevents front-running and MEV extraction.

### Slashing
Queue manipulation triggers a 50-90% penalty. This makes attacks economically irrational — the cost of manipulation always exceeds the potential gain.

---

## Common Mistakes

1. **Skipping CSV address** → Pool creation fails silently
2. **Using approve() instead of increaseAllowance()** → Method not found
3. **Pool creation in same block as approve** → Allowance not yet confirmed
4. **maxReservesIn5BlocksPercent as basis points** → 100x more liquidity drain than intended
5. **Not simulating before sending** → Wasted transaction fees on revert
6. **Using walletconnect provider for RPC** → Use your own JSONRpcProvider
7. **Forgetting to convert BigInt for getBlock()** → TypeError

---

## Frontend Pool Creation

On frontends, the only difference is `signer: null`:

```typescript
const poolReceipt = await createPoolSim.sendTransaction({
    signer: null,           // Frontend: wallet extension signs
    mldsaSigner: null,
    refundTo: walletAddress,
});
```

Everything else is identical — CSV address creation, approve, wait, create pool.

---

## Discovering Existing Pools

MotoSwap factory has NO `poolCount()` or `allPools()` methods. To discover pools:

```typescript
// Must scan blocks for PoolCreated events
// There is no enumeration function on the factory
// This is a known limitation — track pools from event logs
```
