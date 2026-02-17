# Known Bugs, Workarounds, and Edge Cases

Every entry here was discovered through real deployment failures. These are not theoretical — they are confirmed issues that will break your build.

---

## BUG-001: bs58check@4.0.0 Breaks with @noble/hashes@2.0.1

**Symptom:** Build fails with "Cannot find module 'sha256'" or similar import error.

**Root Cause:** `bs58check@4.0.0` internally imports `sha256` from `@noble/hashes`, but `@noble/hashes@2.0.1` renamed the file from `sha256.js` to `sha2.js`. The import path breaks.

**Workaround:** Let npm's nested dependency resolution handle it. Do NOT force a flat install or deduplicate. npm will automatically nest the older version of `@noble/hashes` that `bs58check` needs.

```bash
# DO NOT run these:
npm dedupe        # ❌ Will break the nesting
npm install --legacy-peer-deps bs58check  # ❌ Don't touch it

# Just install normally and let npm handle the nesting:
npm install       # ✅ npm nests the correct version automatically
```

If the error persists, check your `package-lock.json` — make sure `bs58check` has its own nested `@noble/hashes` at the compatible version.

---

## BUG-002: Calldata Bug on Regtest — 0 Bytes to onDeploy()

**Symptom:** Contract deployment on regtest succeeds but `onDeploy()` receives empty calldata (0 bytes) instead of the expected deployment parameters.

**Root Cause:** Current regtest node has a bug where it may pass 0 bytes to `onDeploy()` under certain conditions.

**Workaround:** Make `onDeploy()` defensive — handle the case where calldata length is 0:

```typescript
public onDeploy(calldata: Calldata): void {
    // Guard against regtest calldata bug
    if (calldata.byteLength === 0) {
        // Use hardcoded defaults or skip parameter parsing
        this.initializeDefaults();
        return;
    }
    
    // Normal deployment parameter parsing
    const name = calldata.readStringWithLength();
    const symbol = calldata.readStringWithLength();
    // ...
}
```

**Status:** Known regtest issue. May be fixed in future node updates. Always test on regtest with this guard.

---

## BUG-003: WalletConnect Modal Rendering

**Symptom:** WalletConnect popup appears as a tiny unstyled element at the bottom of the page. Users can't see it or interact with it.

**Root Cause:** The `@btc-vision/walletconnect` modal does not include proper positioning CSS. It renders inline instead of as a fixed overlay.

**Fix:** Add the CSS from `memory/patterns.md` (WalletConnect Modal CSS Fix section) to your global stylesheet. This is mandatory for every frontend.

---

## BUG-004: StoredU256 TS2564 Error

**Symptom:** TypeScript error: "Property '_totalSupply' has no initializer and is not definitely assigned in the constructor."

**Root Cause:** If you declare `StoredU256` fields and try to initialize them inside the constructor body, TypeScript's strict mode can't verify the assignment. The AssemblyScript transform expects field-level initialization.

**Fix:** Initialize at declaration:

```typescript
// WRONG — TS2564 error
class MyToken extends OP20 {
    protected _totalSupply: StoredU256; // ❌ TS2564
    
    constructor() {
        super();
        this._totalSupply = new StoredU256(0, EMPTY_POINTER);
    }
}

// CORRECT — initialize at declaration
class MyToken extends OP20 {
    protected _totalSupply: StoredU256 = new StoredU256(0, EMPTY_POINTER); // ✅
}
```

---

## BUG-005: u256.fromU64 Overflow

**Symptom:** Token amounts are wildly wrong — supply shows as 0 or a tiny number when it should be large.

**Root Cause:** `u256.fromU64()` takes a u64 value. In AssemblyScript, integer literals larger than `u64.MAX_VALUE` (18446744073709551615) silently overflow. Even values that fit in u64 but are written as decimal literals may overflow depending on the compiler.

**Fix:** Use `u256.fromString()` for any value that might be large:

```typescript
// WRONG — may silently overflow
const supply = u256.fromU64(21_000_000 * 10 ** 18); // ❌

// CORRECT
const supply = u256.fromString('21000000000000000000000000'); // ✅
```

---

## BUG-006: getBlock() BigInt TypeError

**Symptom:** Runtime TypeError when calling `provider.getBlock()` with a BigInt value.

**Root Cause:** The RPC serializer doesn't handle BigInt. JSON.stringify() throws on BigInt values.

**Fix:** Always convert to Number:

```typescript
const block = await provider.getBlock(Number(blockHeight)); // ✅
```

---

## BUG-007: sendRawTransaction Response Field Name

**Symptom:** Code reads `result.txid` and gets `undefined`, even though the transaction was broadcast successfully.

**Root Cause:** The response shape is `{ success: boolean, result: string, peers: number }`. The txid is in `.result`, not `.txid`.

**Fix:**
```typescript
const response = await provider.sendRawTransaction(txHex);
const txid = response.result; // ✅ NOT response.txid
```

---

## BUG-008: NativeSwap Pool Creation Without CSV Address

**Symptom:** Pool creation transaction simulates successfully but fails or creates a non-functional pool.

**Root Cause:** NativeSwap requires the receiver address to be a CSV P2WSH address with a 1-block timelock. Without it, the anti-pinning protection is missing and the protocol rejects or ignores the pool.

**Fix:**
```typescript
const csvAddress = Address.fromString(tweakedPubkey).toCSV(1n);
// Use csvAddress as the receiver in createPool()
```

---

## BUG-009: Approve vs increaseAllowance

**Symptom:** Code calls `contract.approve()` and gets a "method not found" or simulation error.

**Root Cause:** OP20 uses `increaseAllowance()` / `decreaseAllowance()` instead of the ERC-20 `approve()` pattern. This is by design to prevent the approve race condition.

**Fix:** Replace all `approve()` calls with `increaseAllowance()`.

---

## BUG-010: MLDSASecurityLevel Enum Values

**Symptom:** Wallet generation fails or produces wrong key size when using `MLDSASecurityLevel.LEVEL2` expecting a value of 2.

**Root Cause:** The enum values map to the CRYSTALS-Dilithium parameter set numbers:
- `LEVEL2` = 44
- `LEVEL3` = 65
- `LEVEL5` = 87

**Impact:** If you're comparing or passing these values numerically, use the correct numbers. This mostly affects custom key generation scripts.

---

## BUG-011: optimize: true Filters UTXOs

**Symptom:** Wallet balance appears lower than expected, or transaction construction fails with "insufficient funds" when the wallet clearly has enough BTC.

**Root Cause:** `getUTXOs({ optimize: true })` sorts and filters UTXOs for "optimal" transaction construction. This can exclude small UTXOs or recently confirmed ones.

**Fix:** ALWAYS use `optimize: false`:
```typescript
const utxos = await provider.utxoManager.getUTXOs({
    address: addr,
    optimize: false, // ✅ Get ALL UTXOs
});
```

---

## BUG-012: Storage Pointer Collision

**Symptom:** Writing to one contract field silently overwrites another field. Values appear to randomly change.

**Root Cause:** Two `Stored*` fields are using the same pointer value. There is no runtime check for this — the last write wins.

**Prevention:** Use a strict numbering convention:
```typescript
// Reserve ranges for different categories
const TOKEN_NAME_POINTER: u16 = 0;
const TOKEN_SYMBOL_POINTER: u16 = 1;
const TOTAL_SUPPLY_POINTER: u16 = 2;
const MAX_SUPPLY_POINTER: u16 = 3;
const DECIMALS_POINTER: u16 = 4;
const OWNER_POINTER: u16 = 5;
// Custom pointers start at 100
const MY_CUSTOM_FIELD_POINTER: u16 = 100;
```

---

## BUG-013: Constructor vs onDeployment

**Symptom:** One-time initialization code (like minting initial supply) runs on EVERY contract interaction.

**Root Cause:** The AssemblyScript contract constructor runs every time the contract is called. It's used for setting up storage references, not for initialization logic.

**Fix:** Move all one-time logic to `onDeployment()`:
```typescript
constructor() {
    super();
    // ONLY storage field setup here
}

public onDeployment(calldata: Calldata): void {
    // One-time initialization here
    this._mint(deployer, initialSupply);
}
```

---

## BUG-014: opr1s Address Incompatibility

**Symptom:** `Address.fromString()` throws when passed an `opr1s...` address.

**Root Cause:** `opr1s` addresses are OPNet-specific ML-DSA addresses. `Address.fromString()` only handles Bitcoin address formats and 0x-prefixed hex.

**Fix:** Use `getPublicKeysInfoRaw()` to resolve the address:
```typescript
const pubkeyInfo = await provider.getPublicKeysInfoRaw(bitcoinAddress);
const tweakedPubkey = pubkeyInfo.tweakedPublicKey;
const address = Address.fromString(`0x${tweakedPubkey}`);
```

---

## BUG-015: P2WSH/P2SH Multisig No Tweaked Pubkey

**Symptom:** `getPublicKeysInfoRaw()` returns empty/null for a P2WSH or P2SH multisig address.

**Root Cause:** These address types don't have a single tweaked public key. They are script-based, not key-based.

**Workaround:** This is a fundamental limitation. For multisig interaction with OPNet contracts, you need one of the individual signers' keys, not the multisig address itself.

---

## BUG-016: While Loops in Contracts

**Symptom:** Contract execution hangs or gets killed by the runtime with no useful error message.

**Root Cause:** While loops can be unbounded. The runtime has a gas/cycle limit but the failure mode is not graceful.

**Fix:** Always use bounded for loops:
```typescript
// WRONG
while (condition) { ... } // ❌

// CORRECT
for (let i: u32 = 0; i < MAX_ITERATIONS; i++) {
    if (!condition) break;
    // ...
}
```

---

## BUG-017: hyper-express Requirement for Backends

**Symptom:** Backend starts but has performance issues, or OPNet-specific middleware doesn't work.

**Root Cause:** The OPNet backend ecosystem is built around `hyper-express` (a µWebSockets.js-based HTTP server). Express, Fastify, and Koa are not supported and may have compatibility issues with the OPNet middleware stack.

**Fix:** Use hyper-express only:
```typescript
import HyperExpress from 'hyper-express';
const app = new HyperExpress.Server();
```

---

## BUG-018: Contract Must Implement onUpdate

**Symptom:** Contract cannot be upgraded after deployment.

**Root Cause:** The upgradeability mechanism requires `onUpdate(calldata: Calldata): void` to exist. Without it, the upgrade call has nothing to target.

**Fix:** Every contract must include:
```typescript
public onUpdate(calldata: Calldata): void {
    // Process upgrade calldata
    // Can be empty if no migration logic needed
}
```
