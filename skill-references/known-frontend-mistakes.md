### KNOWN FRONTEND MISTAKES — NEVER REPEAT THESE

These are real bugs that have occurred. Every one of them is now **forbidden**.

#### 1. WRONG: Using `contract.execute()` with raw selector bytes

```typescript
// WRONG - Raw execute with selector bytes. NEVER DO THIS.
const selector = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
const result = await contract.execute(selector, calldata);

// CORRECT - Use ABI-defined typed method calls
const result = await contract.claim(signature, messageHash);
```

**Always define a proper ABI and call methods by name. Raw selectors bypass type safety and break silently.**

#### 2. WRONG: Missing `getContract` parameters

`getContract` requires **5 parameters**: `(address, abi, provider, network, sender)`.

```typescript
// WRONG - Missing params (will fail or return broken contract)
const contract = getContract(address, abi);
const contract = getContract(address, abi, provider);

// CORRECT - All 5 params
const contract = getContract(address, abi, provider, network, senderAddress);
```

**Read `docs/core-opnet-contracts-instantiating-contracts.md` for the exact signature. Do NOT guess the params.**

#### 3. WRONG: Gating frontend actions on `signer` from walletconnect

On a frontend, the wallet browser extension handles signing. The `signer` object from `useWalletConnect()` may be `null`/`undefined` initially — do NOT gate user actions on it.

```typescript
// WRONG - Throws "Wallet not connected" because signer is null on frontend
if (!signer) throw new Error('Wallet not connected');
await contract.claim(signer, ...);

// CORRECT - Check wallet connection status, not signer object
const { isConnected, address } = useWalletConnect();
if (!isConnected || !address) throw new Error('Wallet not connected');
```

#### 4. WRONG: Using walletconnect's provider for read calls

Create a **separate `JSONRpcProvider`** for read-only contract calls. Do not reuse walletconnect's provider for reads.

```typescript
// WRONG - Using walletconnect provider for reads
const { provider } = useWalletConnect();
const data = await provider.call(...);

// CORRECT - Dedicated read provider
const readProvider = new JSONRpcProvider('https://regtest.opnet.org');
const contract = readProvider.getContract(address, abi);
const data = await contract.someReadMethod();
```

#### 5. WRONG: Importing from wrong packages

**Know where symbols live:**

| Symbol | Correct Package | WRONG Package |
|--------|----------------|---------------|
| `Address` | `@btc-vision/transaction` (also re-exported from `opnet`) | ❌ `@btc-vision/bitcoin` (not in browser bundle) |
| `ABIDataTypes` | `@btc-vision/transaction` (also re-exported from `opnet`) | ❌ `@btc-vision/bitcoin` |
| `JSONRpcProvider` | `opnet` | ❌ `@btc-vision/provider` |
| `networks` | `@btc-vision/bitcoin` | — |

```typescript
// CORRECT imports for frontend
import { Address, ABIDataTypes } from 'opnet';
import { JSONRpcProvider } from 'opnet';

// WRONG - Address is NOT in the browser bundle of @btc-vision/bitcoin
import { Address } from '@btc-vision/bitcoin'; // ❌ WILL FAIL IN BROWSER
```

**When in doubt, import from `opnet` — it re-exports the most commonly needed symbols.**

#### 6. WRONG: Passing a raw Bitcoin address (bc1q/bc1p) or raw ML-DSA public key to Address.fromString()

`Address.fromString()` takes **TWO parameters**:
1. **First param**: The **HASH** of the ML-DSA public key (32 bytes, 0x-prefixed). This is NOT the raw ML-DSA public key (which is much larger). The walletconnect hook provides this as `mldsaPublicKey` — it is already hashed.
2. **Second param**: The Bitcoin tweaked public key (33 bytes compressed, 0x-prefixed). The walletconnect hook provides this as `publicKey`.

It does NOT accept raw Bitcoin addresses (bc1q/bc1p), and it does NOT accept only one parameter.

```typescript
// WRONG - Passing a raw Bitcoin address. WILL CRASH.
const sender = Address.fromString(walletAddress); // walletAddress = "bc1q..." ❌

// WRONG - Only one parameter. WILL CRASH.
const sender = Address.fromString(publicKey); // ❌

// WRONG - Passing mldsaPublicKey (the RAW ML-DSA public key, ~2500 bytes).
// Address.fromString expects the 32-byte HASH, not the raw key. ❌
const sender = Address.fromString(mldsaPublicKey, publicKey); // ❌ WRONG! mldsaPublicKey is raw

// CORRECT - ALWAYS pass hashedMLDSAKey (32-byte hash) + publicKey (Bitcoin tweaked pubkey)
const sender = Address.fromString(hashedMLDSAKey, publicKey);
// hashedMLDSAKey = "0xABCD..." (32-byte SHA256 hash of ML-DSA pubkey, from walletconnect's hashedMLDSAKey)
// publicKey = "0x0203..." (33-byte compressed Bitcoin tweaked pubkey, from walletconnect's publicKey)
```

**On frontend with walletconnect:**
```typescript
const { publicKey, hashedMLDSAKey } = useWalletConnect();
// publicKey = Bitcoin tweaked public key (0x hex, 33 bytes compressed)
// hashedMLDSAKey = 32-byte SHA256 hash of ML-DSA public key (0x hex)
// NOTE: mldsaPublicKey is the RAW key (~2500 bytes) — do NOT use it for Address.fromString()

// CORRECT - Use hashedMLDSAKey (NOT mldsaPublicKey) + publicKey
const senderAddress = Address.fromString(hashedMLDSAKey, publicKey);

// Then use in getContract
const contract = getContract<IMyContract>(contractAddr, abi, provider, network, senderAddress);
```

**If `mldsaPublicKey` is not available** (wallet doesn't support ML-DSA yet), use `provider.getPublicKeyInfo(walletAddress)` to resolve the public key info, then construct the Address.

#### 7. WRONG: Using `walletAddress` (bc1q.../bc1p...) where a public key hex is needed

The `walletAddress` from walletconnect is a **bech32 Bitcoin address** (bc1q... or bc1p...). It is NOT a public key. Many OPNet APIs need **public key hex** (0x-prefixed), not bech32 addresses.

```typescript
// WRONG - Passing bech32 address where public key is expected
const sender = Address.fromString(walletAddress); // "bc1q..." is NOT a public key ❌
await contract.someMethod(walletAddress);          // If it expects a pubkey ❌

// CORRECT - Use hashedMLDSAKey and publicKey from walletconnect
const { publicKey, hashedMLDSAKey, mldsaPublicKey, address: walletAddress } = useWalletConnect();
// publicKey = hex string "0x0203..." (Bitcoin tweaked pubkey, 33 bytes compressed)
// hashedMLDSAKey = hex string "0xABCD..." (32-byte SHA256 hash of ML-DSA pubkey)
// mldsaPublicKey = raw ML-DSA public key (~2500 bytes) — for signing ONLY, NOT for Address.fromString
// walletAddress = "bc1q..." (only use for display and refundTo)
```

**Rule of thumb:**
- `walletAddress` (bc1q/bc1p) → ONLY for display to user and `refundTo` in sendTransaction
- `publicKey` (0x hex, 33 bytes) → Bitcoin tweaked public key, for Address.fromString **second** param
- `hashedMLDSAKey` (0x hex, 32 bytes) → SHA256 hash of ML-DSA public key, for Address.fromString **first** param
- `mldsaPublicKey` (0x hex, ~2500 bytes) → Raw ML-DSA public key, for MLDSA signing/verification ONLY. **NEVER** use for Address.fromString

---

