# PSBT (Partially Signed Bitcoin Transactions)

The `@btc-vision/bitcoin` library provides comprehensive PSBT (BIP174) support for creating, signing, and finalizing Bitcoin transactions with full Taproot support.

## Overview

The PSBT module implements all 6 roles defined in BIP174:

1. **Creator** - Create a new PSBT with `new Psbt()`
2. **Updater** - Add inputs/outputs with `addInput()`, `addOutput()`, `updateInput()`, `updateOutput()`
3. **Signer** - Sign inputs with `signInput()`, `signAllInputs()`, and async variants
4. **Combiner** - Merge PSBTs with `combine()`
5. **Input Finalizer** - Finalize with `finalizeInput()`, `finalizeAllInputs()`
6. **Transaction Extractor** - Extract with `extractTransaction()`

## Installation

```typescript
import { Psbt, Transaction } from '@btc-vision/bitcoin';
```

## Main Psbt Class

### Constructor

```typescript
constructor(opts?: PsbtOptsOptional, data?: PsbtBaseExtended)
```

**Parameters:**
- `opts.network` - Network parameters (defaults to bitcoin mainnet)
- `opts.maximumFeeRate` - Maximum fee rate in sat/byte (default: 5000)
- `opts.version` - Transaction version (1, 2, or 3 for TRUC)

**Example:**
```typescript
import { Psbt, networks } from '@btc-vision/bitcoin';

// Create a new PSBT for mainnet
const psbt = new Psbt();

// Create for testnet
const testnetPsbt = new Psbt({ network: networks.testnet });

// Create with TRUC (version 3) for RBF
const trucPsbt = new Psbt({ version: 3 });
```

### Static Methods

#### `fromBase64(data: string, opts?: PsbtOptsOptional): Psbt`

Parse a PSBT from Base64 encoded string.

```typescript
const psbt = Psbt.fromBase64('cHNidP8BAH...');
```

#### `fromHex(data: string, opts?: PsbtOptsOptional): Psbt`

Parse a PSBT from hex encoded string.

```typescript
const psbt = Psbt.fromHex('70736274ff01...');
```

#### `fromBuffer(buffer: Uint8Array, opts?: PsbtOptsOptional): Psbt`

Parse a PSBT from raw bytes.

```typescript
const psbt = Psbt.fromBuffer(psbtBytes);
```

### Properties

#### `inputCount: number`
Number of inputs in the PSBT.

#### `version: number`
Transaction version (getter/setter).

#### `locktime: number`
Transaction locktime (getter/setter).

#### `txInputs: PsbtTxInput[]`
Array of transaction inputs with hash, index, and sequence.

#### `txOutputs: PsbtTxOutput[]`
Array of transaction outputs with script, value, and optional address.

#### `maximumFeeRate: number`
Maximum allowed fee rate in sat/byte.

#### `data: PsbtBaseExtended`
The underlying BIP174 data structure.

### Adding Inputs

#### `addInput(inputData: PsbtInputExtended, checkPartialSigs?: boolean): this`

Add an input to the PSBT.

```typescript
import { Psbt } from '@btc-vision/bitcoin';

const psbt = new Psbt();

// Add a SegWit input
psbt.addInput({
    hash: 'txid as hex or Uint8Array',
    index: 0,
    witnessUtxo: {
        script: outputScript,
        value: 100000n, // satoshis as bigint
    },
});

// Add a Taproot input
psbt.addInput({
    hash: previousTxId,
    index: 0,
    witnessUtxo: {
        script: taprootOutputScript,
        value: 50000n,
    },
    tapInternalKey: internalPubkey, // 32-byte x-only pubkey
});

// Add with bip32 derivation for HD wallets
psbt.addInput({
    hash: txid,
    index: 0,
    witnessUtxo: { script, value: 100000n },
    bip32Derivation: [{
        masterFingerprint: fingerprint,
        pubkey: derivedPubkey,
        path: "m/84'/0'/0'/0/0",
    }],
});
```

#### `addInputs(inputDatas: PsbtInputExtended[], checkPartialSigs?: boolean): this`

Add multiple inputs at once.

```typescript
psbt.addInputs([
    { hash: txid1, index: 0, witnessUtxo: { script: script1, value: 10000n } },
    { hash: txid2, index: 1, witnessUtxo: { script: script2, value: 20000n } },
]);
```

### Adding Outputs

#### `addOutput(outputData: PsbtOutputExtended, checkPartialSigs?: boolean): this`

Add an output to the PSBT.

```typescript
// Add output by address
psbt.addOutput({
    address: 'bc1q...',
    value: 50000n,
});

// Add output by script
psbt.addOutput({
    script: outputScript,
    value: 50000n,
});
```

#### `addOutputs(outputDatas: PsbtOutputExtended[], checkPartialSigs?: boolean): this`

Add multiple outputs at once.

### Signing Methods

#### `signInput(inputIndex: number, keyPair: Signer | HDSigner, sighashTypes?: number[]): this`

Sign a specific input.

```typescript
import { ECPairFactory } from '@btc-vision/ecpair';
import * as ecc from '@noble/secp256k1';

const ECPair = ECPairFactory(ecc);
const keyPair = ECPair.fromWIF('your-wif-key');

psbt.signInput(0, keyPair);
```

#### `signAllInputs(keyPair: Signer | HDSigner, sighashTypes?: number[]): this`

Sign all inputs that can be signed with the given key pair.

```typescript
psbt.signAllInputs(keyPair);
```

#### `signInputAsync(inputIndex: number, keyPair: Signer | SignerAsync | HDSigner | HDSignerAsync, sighashTypes?: number[]): Promise<void>`

Async version for hardware wallets.

```typescript
await psbt.signInputAsync(0, hardwareWalletSigner);
```

#### `signAllInputsAsync(keyPair: Signer | SignerAsync | HDSigner | HDSignerAsync, sighashTypes?: number[]): Promise<void>`

Async sign all inputs.

```typescript
await psbt.signAllInputsAsync(hardwareWalletSigner);
```

### Taproot Signing

#### `signTaprootInput(inputIndex: number, keyPair: Signer | HDSigner, tapLeafHashToSign?: Uint8Array, sighashTypes?: number[]): this`

Sign a Taproot input specifically.

```typescript
// Key-path spending
psbt.signTaprootInput(0, keyPair);

// Script-path spending with specific leaf
psbt.signTaprootInput(0, keyPair, tapLeafHash);
```

#### `signTaprootInputAsync(inputIndex: number, keyPair: Signer | SignerAsync | HDSigner | HDSignerAsync, tapLeafHash?: Uint8Array, sighashTypes?: number[]): Promise<void>`

Async Taproot signing.

### HD Wallet Signing

#### `signInputHD(inputIndex: number, hdKeyPair: HDSigner, sighashTypes?: number[]): this`

Sign using HD key derivation paths from bip32Derivation.

```typescript
import { BIP32Factory } from '@btc-vision/bip32';

const bip32 = BIP32Factory(ecc);
const hdRoot = bip32.fromSeed(seed);

psbt.signInputHD(0, hdRoot);
```

#### `signAllInputsHD(hdKeyPair: HDSigner, sighashTypes?: number[]): this`

Sign all inputs using HD derivation.

### Validation

#### `validateSignaturesOfInput(inputIndex: number, validator: ValidateSigFunction, pubkey?: PublicKey): boolean`

Validate signatures on a specific input.

```typescript
const validator = (pubkey, msgHash, signature) => {
    return ecc.verify(msgHash, pubkey, signature);
};

const isValid = psbt.validateSignaturesOfInput(0, validator);
```

#### `validateSignaturesOfAllInputs(validator: ValidateSigFunction): boolean`

Validate all input signatures.

```typescript
if (psbt.validateSignaturesOfAllInputs(validator)) {
    psbt.finalizeAllInputs();
}
```

### Finalization

#### `finalizeInput(inputIndex: number, finalScriptsFunc?: FinalScriptsFunc | FinalTaprootScriptsFunc, canRunChecks?: boolean): this`

Finalize a specific input.

```typescript
psbt.finalizeInput(0);
```

#### `finalizeAllInputs(): this`

Finalize all inputs.

```typescript
psbt.finalizeAllInputs();
```

#### `finalizeTaprootInput(inputIndex: number, tapLeafHashToFinalize?: Bytes32, finalScriptsFunc?: FinalTaprootScriptsFunc): this`

Finalize a Taproot input with optional script-path selection.

```typescript
// Key-path finalization
psbt.finalizeTaprootInput(0);

// Script-path finalization
psbt.finalizeTaprootInput(0, tapLeafHash);
```

### Extraction

#### `extractTransaction(disableFeeCheck?: boolean, disableOutputChecks?: boolean): Transaction`

Extract the finalized transaction.

```typescript
const tx = psbt.extractTransaction();
console.log(tx.toHex()); // Ready for broadcast
```

### Fee Calculation

#### `getFeeRate(disableOutputChecks?: boolean): number`

Get the fee rate in sat/byte.

```typescript
const feeRate = psbt.getFeeRate();
console.log(`Fee rate: ${feeRate} sat/vB`);
```

#### `getFee(disableOutputChecks?: boolean): number`

Get the total fee in satoshis.

```typescript
const fee = psbt.getFee();
console.log(`Total fee: ${fee} sats`);
```

### Serialization

#### `toBuffer(): Uint8Array`

Serialize to raw bytes.

#### `toHex(): string`

Serialize to hex string.

#### `toBase64(): string`

Serialize to Base64 string (standard PSBT format).

### Other Methods

#### `combine(...those: Psbt[]): this`

Combine multiple PSBTs (for multi-party signing).

```typescript
const combined = psbt1.combine(psbt2, psbt3);
```

#### `clone(): Psbt`

Create a deep copy of the PSBT.

#### `getInputType(inputIndex: number): AllScriptType`

Get the script type of an input.

```typescript
const type = psbt.getInputType(0);
// Returns: 'witnesspubkeyhash', 'p2sh-p2wpkh', 'p2tr', etc.
```

#### `inputHasPubkey(inputIndex: number, pubkey: PublicKey): boolean`

Check if an input involves a specific public key.

#### `outputHasPubkey(outputIndex: number, pubkey: PublicKey): boolean`

Check if an output involves a specific public key.

---

## PsbtCache

Internal caching class for computed values like fees, hashes, and extracted transactions.

### Properties

```typescript
interface PsbtCache {
    readonly nonWitnessUtxoTxCache: Transaction[];
    readonly nonWitnessUtxoBufCache: Uint8Array[];
    readonly txInCache: Record<string, number>;
    readonly tx: Transaction;
    unsafeSignNonSegwit: boolean;
    hasSignatures: boolean;
    fee: number | undefined;
    feeRate: number | undefined;
    extractedTx: Transaction | undefined;
    prevOuts: readonly PrevOut[] | undefined;
    signingScripts: readonly Script[] | undefined;
    values: readonly Satoshi[] | undefined;
    taprootHashCache: TaprootHashCache | undefined;
}
```

### Methods

#### `invalidate(scope: 'full' | 'outputs'): void`

Invalidate cached values when inputs/outputs change.

#### `computeFee(inputs: PsbtInput[], disableOutputChecks?: boolean, txFromBuffer?: Function): number`

Compute total transaction fee.

#### `computeFeeRate(inputs: PsbtInput[], disableOutputChecks?: boolean, txFromBuffer?: Function): number`

Compute fee rate in sat/vB.

---

## PsbtSigner

Class handling all signing-related logic.

### Methods

#### `getHashAndSighashType(inputs: PsbtInput[], inputIndex: number, pubkey: Uint8Array, sighashTypes: number[]): { hash: MessageHash; sighashType: number }`

Get the hash to sign for a specific input.

#### `getHashForSig(inputIndex: number, input: PsbtInput, forValidate: boolean, sighashTypes?: number[]): { script: Script; hash: MessageHash; sighashType: number }`

Get complete signing information for an input.

#### `getTaprootHashesForSig(inputIndex: number, input: PsbtInput, inputs: PsbtInput[], pubkey: Uint8Array, tapLeafHashToSign?: Uint8Array, allowedSighashTypes?: number[]): HashForSig[]`

Get all hashes needed for Taproot signing.

#### `getSignersFromHD<T extends HDSigner | HDSignerAsync>(inputIndex: number, inputs: PsbtInput[], hdKeyPair: T): T[]`

Derive signers from HD key using bip32Derivation paths.

---

## PsbtFinalizer

Class handling input finalization logic.

### Methods

#### `getFinalScripts(inputIndex: number, input: PsbtInput, script: Script, isSegwit: boolean, isP2SH: boolean, isP2WSH: boolean, canRunChecks?: boolean, solution?: Uint8Array[]): FinalScriptsResult`

Get final scriptSig and witness for an input.

#### `getScriptFromInput(inputIndex: number, input: PsbtInput): GetScriptReturn`

Get script information from input data.

### Standalone Functions

```typescript
function getFinalScripts(
    inputIndex: number,
    input: PsbtInput,
    script: Script,
    isSegwit: boolean,
    isP2SH: boolean,
    isP2WSH: boolean,
    canRunChecks?: boolean,
    solution?: Uint8Array[]
): FinalScriptsResult;

function prepareFinalScripts(
    script: Uint8Array,
    scriptType: string,
    partialSig: PartialSig[],
    isSegwit: boolean,
    isP2SH: boolean,
    isP2WSH: boolean,
    solution?: Uint8Array[]
): FinalScriptsResult;
```

---

## PsbtTransaction

BIP174-compliant transaction wrapper.

### Constructor

```typescript
constructor(buffer?: Uint8Array)
```

Creates a new PsbtTransaction. Defaults to an empty version-2 transaction.

### Methods

#### `getInputOutputCounts(): { inputCount: number; outputCount: number }`

Get current input and output counts.

#### `addInput(input: TransactionInput): void`

Add an input to the transaction.

#### `addOutput(output: TransactionOutput): void`

Add an output to the transaction.

#### `toBuffer(): Uint8Array`

Serialize the transaction.

---

## Parallel Signing with Workers

For high-throughput applications, the library supports parallel signing using Web Workers.

### Setup

```typescript
import { Psbt } from '@btc-vision/bitcoin';
import { signPsbtParallel, WorkerSigningPool } from '@btc-vision/bitcoin/workers';

// Initialize pool once at app startup
const pool = WorkerSigningPool.getInstance();
pool.preserveWorkers();
```

### Usage

```typescript
// Create and populate PSBT
const psbt = new Psbt();
psbt.addInput({ /* ... */ });
psbt.addOutput({ /* ... */ });

// Sign all inputs in parallel
const result = await signPsbtParallel(psbt, keyPair, pool);

if (result.success) {
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
}
```

### WorkerSigningPool

```typescript
class WorkerSigningPool {
    static getInstance(config?: WorkerPoolConfig): WorkerSigningPool;

    preserveWorkers(): void;
    releaseWorkers(): void;

    async initialize(): Promise<void>;
    async signBatch(tasks: SigningTask[], keyPair: ParallelSignerKeyPair): Promise<ParallelSigningResult>;
    async shutdown(): Promise<void>;

    get workerCount(): number;
    get idleWorkerCount(): number;
    get busyWorkerCount(): number;
    get isPreservingWorkers(): boolean;
}
```

### Configuration

```typescript
interface WorkerPoolConfig {
    workerCount?: number;      // Default: navigator.hardwareConcurrency
    taskTimeoutMs?: number;    // Default: 30000
    maxKeyHoldTimeMs?: number; // Default: 5000
    verifySignatures?: boolean;// Default: true
    preserveWorkers?: boolean; // Default: false
}
```

### Security Notes

- Private keys are NEVER shared via SharedArrayBuffer
- Each key is cloned to ONE worker via postMessage
- Keys are zeroed in worker immediately after signing
- Workers can be preserved for performance or terminated for security

---

## Types

### PsbtTxInput

```typescript
interface PsbtTxInput {
    readonly hash: Bytes32;
    readonly index: number;
    readonly sequence: number;
}
```

### PsbtTxOutput

```typescript
interface PsbtTxOutput {
    readonly script: Script;
    readonly value: Satoshi;
    readonly address: string | undefined;
}
```

### PsbtInputExtended

```typescript
interface PsbtInputExtended extends PsbtInput, TransactionInput {
    readonly isPayToAnchor?: boolean | undefined;
}
```

### PsbtOutputExtended

```typescript
type PsbtOutputExtended = PsbtOutputExtendedAddress | PsbtOutputExtendedScript;

interface PsbtOutputExtendedAddress extends PsbtOutput {
    readonly address: string;
    readonly value: Satoshi;
}

interface PsbtOutputExtendedScript extends PsbtOutput {
    readonly script: Script;
    readonly value: Satoshi;
}
```

### ValidateSigFunction

```typescript
type ValidateSigFunction = (
    pubkey: PublicKey,
    msghash: MessageHash,
    signature: Uint8Array,
) => boolean;
```

### Signer Interfaces

```typescript
interface Signer {
    publicKey: Uint8Array;
    sign(hash: Uint8Array): Uint8Array;
    signSchnorr?(hash: Uint8Array): Uint8Array;
}

interface SignerAsync {
    publicKey: Uint8Array;
    sign(hash: Uint8Array): Promise<Uint8Array>;
    signSchnorr?(hash: Uint8Array): Promise<Uint8Array>;
}

interface HDSigner extends Signer {
    fingerprint: Uint8Array;
    derivePath(path: string): HDSigner;
}

interface HDSignerAsync extends SignerAsync {
    fingerprint: Uint8Array;
    derivePath(path: string): HDSignerAsync;
}
```

---

## Complete Example

```typescript
import { Psbt, networks, payments, Transaction } from '@btc-vision/bitcoin';
import { ECPairFactory } from '@btc-vision/ecpair';
import * as ecc from '@noble/secp256k1';

const ECPair = ECPairFactory(ecc);

// Create key pair
const keyPair = ECPair.makeRandom();

// Create P2WPKH payment
const payment = payments.p2wpkh({ pubkey: keyPair.publicKey });

// Create PSBT
const psbt = new Psbt({ network: networks.bitcoin });

// Add input
psbt.addInput({
    hash: 'previous_txid_here',
    index: 0,
    witnessUtxo: {
        script: payment.output!,
        value: 100000n,
    },
});

// Add output
psbt.addOutput({
    address: 'bc1qrecipient...',
    value: 90000n,
});

// Sign
psbt.signInput(0, keyPair);

// Validate
const validator = (pubkey: Uint8Array, msghash: Uint8Array, signature: Uint8Array) => {
    return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
};

if (psbt.validateSignaturesOfInput(0, validator)) {
    // Finalize
    psbt.finalizeInput(0);

    // Extract transaction
    const tx = psbt.extractTransaction();

    console.log('Transaction hex:', tx.toHex());
    console.log('Fee:', psbt.getFee(), 'sats');
    console.log('Fee rate:', psbt.getFeeRate(), 'sat/vB');
}
```
