# OPNet Development Patterns & Gotchas

Hard-won lessons from building on Bitcoin Layer 1 with OP_NET. Reference this before writing code.

---

## Unit Testing Patterns

### ContractRuntime API
- Constructor: `protected constructor(details: ContractDetails)`
- `ContractDetails`: `{ address, deployer, gasLimit?, bytecode?, deploymentCalldata? }`
- `init()`: loads bytecodes
- `execute(params)`: executes contract call, auto-deploys on first call
- `executeThrowOnError(params)`: same as execute but throws on error
- `backupStates()` / `restoreStates()`: state management
- `abiCoder.encodeSelector(sig)`: returns hex string of 4-byte selector

### ExecutionParameters
```typescript
{ calldata: Buffer | Uint8Array, sender?: Address, txOrigin?: Address, saveStates?: boolean }
```

### Key Gotchas
1. **NO `getSelector()` method** — use `Number('0x' + this.abiCoder.encodeSelector(sig))`
2. **NO `handleResponse()`** — check `response.error` or use `executeThrowOnError()`
3. **NO `preserveState()`** — use `backupStates()`/`restoreStates()`
4. **NO `Blockchain.setSender()`** — set `Blockchain.msgSender` and `Blockchain.txOrigin` directly
5. **Field initializers run before super()** — init selectors in constructor body
6. **OP20 transfer/transferFrom return empty BytesWriter (0 bytes)**, NOT boolean
7. **OP20 has no approve()** — use `increaseAllowance()`/`decreaseAllowance()`
8. **Register contract BEFORE calling `Blockchain.init()`**
9. **Deployment calldata triggers `onDeployment()`** via `deploymentCalldata` constructor param

### Dependency Management
- Don't add `@btc-vision/transaction` to test deps — let unit-test-framework provide it
- `@noble/hashes` v1.8.0 works with unit-test-framework; v2.x breaks `bs58check`
- Use `"type": "module"` in `tests/package.json` for ESM support

---

## Frontend/Client Patterns

### ABI Definition
```typescript
import { BitcoinAbiTypes, type BitcoinInterfaceAbi } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';

const ABI: BitcoinInterfaceAbi = [
    { name: 'method', type: BitcoinAbiTypes.Function, inputs: [...], outputs: [...] },
    { name: 'event', type: BitcoinAbiTypes.Event, values: [...] },
];
// BitcoinInterfaceAbi is (FunctionBaseData | EventBaseData)[] — an ARRAY, not an object
```

### Transaction Sending
```typescript
const simulation = await contract.method(...args);
if (simulation.revert) throw new Error(simulation.revert);
const receipt = await simulation.sendTransaction({
    signer: walletSigner,
    mldsaSigner: null,  // REQUIRED field, can be null
    refundTo: address.p2tr(network),  // p2tr is a METHOD, needs network arg
    maximumAllowedSatToSpend: 50000n,
    feeRate: 10,
    network,
});
```

### Broadcasting
```typescript
// sendRawTransaction requires 2 args: (tx: string, psbt: boolean)
const result = await provider.sendRawTransaction(txHex, false);
console.log(result.result); // NOT .txid or .transactionId
```

### Key Types
- `getContract<T extends BaseContractProperties>(address, abi, provider, network, sender)` — 5 params
- `BitcoinInterfaceAbi = (FunctionBaseData | EventBaseData)[]`
- `BinaryWriter` exported from `@btc-vision/transaction`, NOT `opnet`
- `Address.fromString(hashedMLDSAKey, publicKey)` — TWO params, both hex

### OP_WALLET Integration
- `publicKey` = Bitcoin tweaked public key (0x hex, 33 bytes) — for Address.fromString **second** param
- `hashedMLDSAKey` = SHA256 hash of ML-DSA public key (0x hex, 32 bytes) — for Address.fromString **first** param
- `mldsaPublicKey` = raw ML-DSA key (~2500 bytes) — for MLDSA signing ONLY, **NEVER** for Address.fromString
- `walletAddress` = bech32 address (bc1q/bc1p) — for display and `refundTo` ONLY

### Caching (CRITICAL)
- Singleton provider per network — NEVER create multiple `JSONRpcProvider` instances
- Cache contract instances — expensive to create
- Invalidate balance/state caches on new block
- Token metadata (name, symbol, decimals) can be cached forever (immutable)
- Polling: 15s for block height, 15s for tx confirmation, 30s for fee estimates

### Dependency Management
- `@noble/hashes@2.0.1` for main deps; `bs58check` and `bip39` get nested `1.8.0`
- Do NOT override `@noble/hashes` globally — v1.8.0 breaks `@noble/curves@2.0.1` ECC
