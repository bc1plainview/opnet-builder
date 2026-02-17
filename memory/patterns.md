# Hard-Won Patterns

These patterns come from shipping 10+ OPNet dApps. Every entry here cost hours of debugging.

---

## Storage Types — Constructor Signatures

This is the #1 source of compilation errors for new OPNet developers. Each `Stored*` type has a DIFFERENT constructor signature. Get them wrong and you get cryptic TS errors.

### StoredU256
```typescript
// CORRECT — takes (pointer: u16, subPointer: Uint8Array)
// Use EMPTY_POINTER from '../math/bytes' for the subPointer
import { EMPTY_POINTER } from '../math/bytes';

protected _totalSupply: StoredU256 = new StoredU256(TOTAL_SUPPLY_POINTER, EMPTY_POINTER);
```

```typescript
// WRONG — u256.Zero is NOT a valid subPointer
protected _totalSupply: StoredU256 = new StoredU256(TOTAL_SUPPLY_POINTER, u256.Zero); // ❌ TYPE ERROR
```

**Critical:** Initialize StoredU256 fields at declaration (as class field initializers), NOT in the constructor body. If you initialize in the constructor, TypeScript throws TS2564 ("property has no initializer and is not definitely assigned in the constructor") because the compiler can't statically verify the assignment path.

### StoredAddress
```typescript
// CORRECT — takes only (pointer: u16), ONE parameter, NO default value
protected _owner: StoredAddress = new StoredAddress(OWNER_POINTER);
```

```typescript
// WRONG — do NOT pass a default address
protected _owner: StoredAddress = new StoredAddress(OWNER_POINTER, Address.zero()); // ❌ TOO MANY ARGS
```

### StoredBoolean
```typescript
// CORRECT — takes (pointer: u16, defaultValue: bool), TWO parameters
protected _initialized: StoredBoolean = new StoredBoolean(INIT_POINTER, false);
```

### StoredString
```typescript
// Takes (pointer: u16, defaultValue: string)
protected _name: StoredString = new StoredString(NAME_POINTER, 'MyToken');
```

### StoredU64
```typescript
// Takes (pointer: u16, defaultValue: u64)
protected _counter: StoredU64 = new StoredU64(COUNTER_POINTER, 0);
```

### Pointer Management
```typescript
// Define all pointers as constants — MUST be unique across the contract
const TOTAL_SUPPLY_POINTER: u16 = 0;
const MAX_SUPPLY_POINTER: u16 = 1;
const OWNER_POINTER: u16 = 2;
const DECIMALS_POINTER: u16 = 3;
const NAME_POINTER: u16 = 4;
// ... increment for each field

// Pointer collision = silent data corruption
// Two fields sharing a pointer will overwrite each other
```

---

## ABIDataTypes — Globally Injected

`ABIDataTypes` is injected by the AssemblyScript transform at compile time. It is NOT an importable module.

```typescript
// WRONG — this will fail at compile
import { ABIDataTypes } from '@btc-vision/btc-runtime'; // ❌ DOES NOT EXIST

// CORRECT — just use it, it's globally available in contract code
const selector = ABIDataTypes.UINT256; // ✅ Already in scope
```

However, in **frontend/backend TypeScript** (not AssemblyScript contracts), you DO import it:
```typescript
// Frontend/Backend — import from transaction package
import { ABIDataTypes } from '@btc-vision/transaction';
```

---

## OP20 Allowance Pattern

OPNet OP20 tokens use `increaseAllowance()`, NOT `approve()`.

```typescript
// WRONG — approve() does NOT exist on OP20
await contract.approve(spender, amount); // ❌

// CORRECT — use increaseAllowance()
await contract.increaseAllowance(spender, amount); // ✅
```

This is a deliberate design choice to prevent the approve/transferFrom race condition that plagues ERC-20.

---

## BigInt vs Number for Provider Calls

`provider.getBlock()` CANNOT accept BigInt. You must convert.

```typescript
// WRONG
const block = await provider.getBlock(blockHeightBigInt); // ❌ TypeError

// CORRECT
const block = await provider.getBlock(Number(blockHeightBigInt)); // ✅
```

---

## u256 Literal Overflow

AssemblyScript u64 literals overflow silently for large numbers.

```typescript
// WRONG — u64 can't hold this, silent overflow
const amount = u256.fromU64(1_000_000_000_000_000_000); // ❌ OVERFLOW

// CORRECT — use fromString for big numbers
const amount = u256.fromString('1000000000000000000'); // ✅
```

---

## Transaction Sequencing — Approve Then Pool

Contract approve and pool creation MUST be in DIFFERENT Bitcoin blocks. The approve transaction needs at least 1 confirmation before the pool creation transaction references the allowance.

```typescript
// Step 1: Approve (block N)
const approveSim = await contract.increaseAllowance(poolAddress, amount);
const approveTx = await approveSim.sendTransaction({ ... });

// Step 2: WAIT for confirmation (block N+1)
// Do NOT immediately create the pool

// Step 3: Create pool (block N+1 or later)
const poolSim = await nativeswap.createPool({ ... });
const poolTx = await poolSim.sendTransaction({ ... });
```

---

## sendRawTransaction Response Shape

```typescript
const result = await provider.sendRawTransaction(txHex);

// WRONG
console.log(result.txid); // ❌ undefined

// CORRECT — txid is in .result
console.log(result.result); // ✅ the txid string
console.log(result.success); // boolean
console.log(result.peers); // number of peers that received it
```

---

## Address Handling

### Address.fromString()
Accepts:
- Standard Bitcoin addresses (bc1p..., bc1q..., 1..., 3...)
- 0x-prefixed hex (MLDSA hash or tweaked pubkey)

Does NOT accept:
- `opr1s` addresses — these are OPNet-specific ML-DSA addresses

### Getting Tweaked Pubkey from opr1s Address
```typescript
// opr1s addresses can't go into Address.fromString()
// Use getPublicKeysInfoRaw() to get the tweaked pubkey
const pubkeyInfo = await provider.getPublicKeysInfoRaw(bitcoinAddress);
const tweakedPubkey = pubkeyInfo.tweakedPublicKey;
const address = Address.fromString(`0x${tweakedPubkey}`);
```

### P2WSH/P2SH Multisig Limitation
P2WSH and P2SH multisig addresses have NO tweaked pubkey. `getPublicKeysInfoRaw()` returns nothing useful for them. This is a fundamental limitation — multisig addresses don't have a single public key.

---

## CSV P2WSH Addresses for NativeSwap

NativeSwap requires CSV (CheckSequenceVerify) P2WSH receiver addresses with a 1-block timelock. This prevents transaction pinning attacks.

```typescript
// Create a CSV P2WSH address with 1-block timelock
const csvAddress = Address.fromString(tweakedPubkey).toCSV(1n);
```

---

## MLDSASecurityLevel Values

The enum values are NOT what you'd expect:
```typescript
MLDSASecurityLevel.LEVEL2 = 44  // NOT 2
MLDSASecurityLevel.LEVEL3 = 65  // NOT 3
MLDSASecurityLevel.LEVEL5 = 87  // NOT 5
```

These correspond to the CRYSTALS-Dilithium parameter sets (ML-DSA-44, ML-DSA-65, ML-DSA-87).

---

## getContract — Always 5 Parameters

```typescript
// CORRECT — address, abi, provider, network, sender
const contract = getContract<IOP20Contract>(
    contractAddress,
    OP_20_ABI,
    provider,
    networks.bitcoin,
    senderAddress
);
```

Missing any parameter causes cryptic runtime errors, not compile errors.

---

## MotoSwap Factory — No Pool Enumeration

MotoSwap's factory contract has NO `poolCount()` or `allPools()` methods. To discover pools, you must scan blocks for `PoolCreated` events.

```typescript
// WRONG — these methods don't exist
const count = await factory.poolCount(); // ❌
const pools = await factory.allPools(); // ❌

// CORRECT — scan for events
// Iterate blocks, decode PoolCreated events from factory address
```

---

## UTXO Queries — Always optimize: false

```typescript
// WRONG — optimize: true filters UTXOs, you get incomplete data
const utxos = await provider.utxoManager.getUTXOs({
    address: addr,
    optimize: true, // ❌ MISSING UTXOs
});

// CORRECT
const utxos = await provider.utxoManager.getUTXOs({
    address: addr,
    optimize: false, // ✅ All UTXOs returned
});
```

---

## Contract Upgradeability

Every contract MUST implement `onUpdate()` for upgradeability:

```typescript
public onUpdate(calldata: Calldata): void {
    // Handle upgrade logic
    // This is called when the contract bytecode is updated
}
```

Live upgrades use:
```typescript
Blockchain.updateContractFromExisting(sourceAddress, calldata);
```

---

## NativeSwap maxReservesIn5BlocksPercent

This is a direct percentage (0-100), NOT basis points.

```typescript
// WRONG — treating as basis points
maxReservesIn5BlocksPercent: 500 // ❌ This is 500%, not 5%

// CORRECT — direct percentage
maxReservesIn5BlocksPercent: 5 // ✅ 5% of reserves can be withdrawn in 5 blocks
```

---

## WalletConnect Modal CSS Fix

The `@btc-vision/walletconnect` modal renders broken at the bottom of the page. MUST add this CSS to every frontend:

```css
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

Without this fix, the modal appears as a tiny element shoved to the bottom of the page. Users can't see it and think the wallet connection is broken.

---

## Selectors Use SHA-256

OPNet uses SHA-256 first 4 bytes for function selectors, NOT keccak-256 (which Ethereum uses). If you're porting Solidity patterns, recalculate all selectors.

---

## Data Encoding — Tapscript Witnesses

OPNet encodes data in Tapscript witnesses (4x weight discount on Bitcoin), NOT OP_RETURN (which has an 80-byte limit). This is why OPNet can handle complex smart contract data on L1.

---

## No ECDSA Verification in Contract VM

The contract VM currently cannot verify ECDSA signatures. ML-DSA (post-quantum) verification is available. ECDSA support is being added via op-vm PRs but is not yet available.

---

## Suno/Frontend Pattern — Never Use WalletConnect's Provider for RPC

```typescript
// WRONG — walletconnect provider is for signing only
const balance = await walletConnectProvider.getBalance(address); // ❌

// CORRECT — create your own JSONRpcProvider
const provider = new JSONRpcProvider('https://mainnet.opnet.org', networks.bitcoin);
const utxos = await provider.utxoManager.getUTXOs({ address, optimize: false });
```

The WalletConnect provider handles wallet connection and transaction signing. ALL RPC queries (balances, contract calls, tx status, block data) must go through your own `JSONRpcProvider` instance.
