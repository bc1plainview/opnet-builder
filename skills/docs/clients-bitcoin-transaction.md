# Bitcoin Transaction Class

Complete documentation for the Transaction class in `@btc-vision/bitcoin`.

## Overview

The `Transaction` class represents a Bitcoin transaction and provides methods for:

- Building transactions (adding inputs and outputs)
- Serialization and deserialization
- Computing signature hashes for different script types
- Transaction metadata (weight, virtual size, txid)

**Import:**

```typescript
import { Transaction } from '@btc-vision/bitcoin';
```

---

## Transaction Class

### Static Constants

```typescript
class Transaction {
    // Sequence number constants
    static readonly DEFAULT_SEQUENCE = 0xffffffff;

    // Signature hash types
    static readonly SIGHASH_DEFAULT = 0x00;  // Taproot only (same as ALL)
    static readonly SIGHASH_ALL = 0x01;
    static readonly SIGHASH_NONE = 0x02;
    static readonly SIGHASH_SINGLE = 0x03;
    static readonly SIGHASH_ANYONECANPAY = 0x80;
    static readonly SIGHASH_OUTPUT_MASK = 0x03;
    static readonly SIGHASH_INPUT_MASK = 0x80;

    // SegWit markers
    static readonly ADVANCED_TRANSACTION_MARKER = 0x00;
    static readonly ADVANCED_TRANSACTION_FLAG = 0x01;

    // TRUC (BIP431) constants
    static readonly TRUC_VERSION = 3;
    static readonly TRUC_MAX_VSIZE = 10000;
    static readonly TRUC_CHILD_MAX_VSIZE = 1000;
}
```

### Instance Properties

```typescript
class Transaction {
    /** Transaction version (1, 2, or 3 for TRUC) */
    version: number = 1;

    /** Lock time (block height or timestamp) */
    locktime: number = 0;

    /** Transaction inputs */
    ins: Input[] = [];

    /** Transaction outputs */
    outs: Output[] = [];
}
```

---

## Static Methods

### fromBuffer

Parse a transaction from a binary buffer.

```typescript
static fromBuffer(buffer: Uint8Array, _NO_STRICT?: boolean): Transaction
```

**Parameters:**
- `buffer` - Raw transaction bytes
- `_NO_STRICT` - If true, allow extra data after transaction

**Returns:** Parsed Transaction instance

**Throws:** `Error` if transaction is malformed

**Example:**

```typescript
import { Transaction, fromHex } from '@btc-vision/bitcoin';

const rawTx = fromHex('0100000001...');
const tx = Transaction.fromBuffer(rawTx);

console.log('Version:', tx.version);
console.log('Inputs:', tx.ins.length);
console.log('Outputs:', tx.outs.length);
console.log('Locktime:', tx.locktime);
```

---

### fromHex

Parse a transaction from a hex string.

```typescript
static fromHex(hex: string): Transaction
```

**Parameters:**
- `hex` - Transaction as hex string

**Returns:** Parsed Transaction instance

**Example:**

```typescript
import { Transaction } from '@btc-vision/bitcoin';

const tx = Transaction.fromHex(
    '0100000001' +
    '0000000000000000000000000000000000000000000000000000000000000000' +
    'ffffffff' +
    '07' +
    '04ffff001d0104' +
    'ffffffff' +
    '01' +
    '00f2052a0100000043' +
    '4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac' +
    '00000000'
);

console.log('TXID:', tx.getId());
```

---

### isCoinbaseHash

Check if a hash represents a coinbase input (all zeros).

```typescript
static isCoinbaseHash(hash: Bytes32): boolean
```

**Parameters:**
- `hash` - 32-byte hash to check

**Returns:** `true` if hash is all zeros

**Example:**

```typescript
import { Transaction, fromHex } from '@btc-vision/bitcoin';

const coinbaseHash = fromHex(
    '0000000000000000000000000000000000000000000000000000000000000000'
);
console.log(Transaction.isCoinbaseHash(coinbaseHash)); // true

const normalHash = fromHex(
    'abcd1234000000000000000000000000000000000000000000000000000000ef'
);
console.log(Transaction.isCoinbaseHash(normalHash)); // false
```

---

## Instance Methods

### addInput

Add an input to the transaction.

```typescript
addInput(
    hash: Bytes32,
    index: number,
    sequence?: number,
    scriptSig?: Script
): number
```

**Parameters:**
- `hash` - 32-byte hash of the previous transaction (in internal byte order)
- `index` - Output index in the previous transaction
- `sequence` - Sequence number (defaults to 0xffffffff)
- `scriptSig` - Input script (defaults to empty)

**Returns:** Index of the newly added input

**Throws:** `TypeError` if parameters are invalid

**Example:**

```typescript
import { Transaction, fromHex, reverse } from '@btc-vision/bitcoin';

const tx = new Transaction();
tx.version = 2;

// Add input from previous transaction
// Note: txid is displayed in reversed hex, but stored in internal byte order
const prevTxId = 'abcd1234...'; // displayed txid
const prevTxHash = reverse(fromHex(prevTxId)); // internal byte order

const inputIndex = tx.addInput(
    prevTxHash,
    0,                           // output index
    0xfffffffd,                  // sequence (RBF enabled)
    undefined                    // empty scriptSig (will be filled during signing)
);

console.log('Added input at index:', inputIndex);
```

---

### addOutput

Add an output to the transaction.

```typescript
addOutput(scriptPubKey: Script, value: Satoshi): number
```

**Parameters:**
- `scriptPubKey` - Output script (locking script)
- `value` - Output value in satoshis (bigint)

**Returns:** Index of the newly added output

**Throws:** `TypeError` if parameters are invalid

**Example:**

```typescript
import { Transaction, address, networks } from '@btc-vision/bitcoin';

const tx = new Transaction();

// Add output to address
const recipientScript = address.toOutputScript(
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    networks.bitcoin
);

const outputIndex = tx.addOutput(
    recipientScript,
    50000n  // 50,000 satoshis
);

console.log('Added output at index:', outputIndex);
```

---

### hashForSignature

Compute the signature hash for a legacy (non-SegWit) input.

```typescript
hashForSignature(
    inIndex: number,
    prevOutScript: Script,
    hashType: number
): MessageHash
```

**Parameters:**
- `inIndex` - Index of the input being signed
- `prevOutScript` - The script of the output being spent
- `hashType` - Signature hash type (SIGHASH_ALL, etc.)

**Returns:** 32-byte hash for signing

**Example:**

```typescript
import { Transaction, script, opcodes, crypto } from '@btc-vision/bitcoin';

const tx = new Transaction();
// ... add inputs and outputs ...

// Create the previous output's script (P2PKH)
const pubKeyHash = crypto.hash160(publicKey);
const prevOutScript = script.compile([
    opcodes.OP_DUP,
    opcodes.OP_HASH160,
    pubKeyHash,
    opcodes.OP_EQUALVERIFY,
    opcodes.OP_CHECKSIG
]);

// Compute signature hash
const sigHash = tx.hashForSignature(
    0,                           // input index
    prevOutScript,
    Transaction.SIGHASH_ALL
);

// Sign with ECDSA (using your signing library)
const signature = ecdsaSign(sigHash, privateKey);
```

**Notes:**
- Returns a special value (0x01...00) for edge cases per Bitcoin Core behavior
- Removes OP_CODESEPARATOR from the script
- Used for P2PKH, P2SH (non-SegWit) inputs

---

### hashForWitnessV0

Compute the signature hash for a SegWit v0 input (P2WPKH/P2WSH).

```typescript
hashForWitnessV0(
    inIndex: number,
    prevOutScript: Script,
    value: Satoshi,
    hashType: number
): MessageHash
```

**Parameters:**
- `inIndex` - Index of the input being signed
- `prevOutScript` - Script code for signing (see notes)
- `value` - Value of the output being spent (bigint satoshis)
- `hashType` - Signature hash type

**Returns:** 32-byte hash for signing

**Example:**

```typescript
import { Transaction, script, opcodes, crypto } from '@btc-vision/bitcoin';

const tx = new Transaction();
// ... add inputs and outputs ...

// For P2WPKH: script code is P2PKH pattern with the pubkey hash
const pubKeyHash = crypto.hash160(publicKey);
const scriptCode = script.compile([
    opcodes.OP_DUP,
    opcodes.OP_HASH160,
    pubKeyHash,
    opcodes.OP_EQUALVERIFY,
    opcodes.OP_CHECKSIG
]);

// Compute SegWit v0 signature hash
const sigHash = tx.hashForWitnessV0(
    0,                           // input index
    scriptCode,
    100000n,                     // input value in satoshis
    Transaction.SIGHASH_ALL
);

// Sign with ECDSA
const signature = ecdsaSign(sigHash, privateKey);
```

**Script Code Rules:**
- **P2WPKH**: Use P2PKH template with the pubkey hash
- **P2WSH**: Use the actual witness script

---

### hashForWitnessV1

Compute the signature hash for a Taproot (SegWit v1) input.

```typescript
hashForWitnessV1(
    inIndex: number,
    prevOutScripts: readonly Script[],
    values: readonly Satoshi[],
    hashType: number,
    leafHash?: Bytes32,
    annex?: Uint8Array,
    taprootCache?: TaprootHashCache
): MessageHash
```

**Parameters:**
- `inIndex` - Index of the input being signed
- `prevOutScripts` - Scripts of ALL inputs being spent
- `values` - Values of ALL inputs being spent
- `hashType` - Signature hash type
- `leafHash` - Optional leaf hash for script-path spending
- `annex` - Optional annex data
- `taprootCache` - Optional pre-computed hash cache

**Returns:** 32-byte hash for signing

**Example:**

```typescript
import { Transaction, address, networks } from '@btc-vision/bitcoin';

const tx = new Transaction();
tx.version = 2;
// ... add inputs and outputs ...

// Collect all input scripts and values
const prevOutScripts = [
    address.toOutputScript('bc1p...', networks.bitcoin),
    address.toOutputScript('bc1p...', networks.bitcoin),
];
const values = [50000n, 30000n];

// Key-path spending (no leafHash)
const sigHash = tx.hashForWitnessV1(
    0,                           // input index
    prevOutScripts,
    values,
    Transaction.SIGHASH_DEFAULT  // or SIGHASH_ALL
);

// Sign with Schnorr
const signature = schnorrSign(sigHash, privateKey);

// Script-path spending (with leafHash)
const leafHash = tapleafHash({ output: tapscript });
const scriptPathHash = tx.hashForWitnessV1(
    0,
    prevOutScripts,
    values,
    Transaction.SIGHASH_DEFAULT,
    leafHash
);
```

**Notes:**
- `SIGHASH_DEFAULT` (0x00) is only valid for Taproot
- All input scripts and values must be provided (not just the input being signed)
- Use `getTaprootHashCache()` for performance when signing multiple inputs

---

### getTaprootHashCache

Pre-compute intermediate hashes for Taproot signing.

```typescript
getTaprootHashCache(
    prevOutScripts: readonly Script[],
    values: readonly Satoshi[]
): TaprootHashCache
```

**Parameters:**
- `prevOutScripts` - Scripts of all inputs
- `values` - Values of all inputs

**Returns:** Cache object for `hashForWitnessV1`

**Example:**

```typescript
import { Transaction } from '@btc-vision/bitcoin';

const tx = new Transaction();
// ... add multiple inputs ...

const prevOutScripts = [script1, script2, script3];
const values = [10000n, 20000n, 30000n];

// Compute cache once
const cache = tx.getTaprootHashCache(prevOutScripts, values);

// Sign all inputs efficiently
for (let i = 0; i < tx.ins.length; i++) {
    const sigHash = tx.hashForWitnessV1(
        i,
        prevOutScripts,
        values,
        Transaction.SIGHASH_DEFAULT,
        undefined,  // no leafHash
        undefined,  // no annex
        cache       // reuse cache
    );
    // sign...
}
```

**Cache Interface:**

```typescript
interface TaprootHashCache {
    readonly hashPrevouts: Bytes32;
    readonly hashAmounts: Bytes32;
    readonly hashScriptPubKeys: Bytes32;
    readonly hashSequences: Bytes32;
    readonly hashOutputs: Bytes32;
}
```

---

### setInputScript

Set the input script (scriptSig) for a specific input.

```typescript
setInputScript(index: number, scriptSig: Script): void
```

**Parameters:**
- `index` - Input index
- `scriptSig` - The script to set

**Example:**

```typescript
import { Transaction, script } from '@btc-vision/bitcoin';

const tx = new Transaction();
// ... add inputs ...

// Set P2PKH unlocking script
const scriptSig = script.compile([
    signature,
    publicKey
]);

tx.setInputScript(0, scriptSig);
```

---

### setWitness

Set the witness data for a specific input.

```typescript
setWitness(index: number, witness: Uint8Array[]): void
```

**Parameters:**
- `index` - Input index
- `witness` - Array of witness elements

**Example:**

```typescript
import { Transaction } from '@btc-vision/bitcoin';

const tx = new Transaction();
// ... add inputs ...

// P2WPKH witness: [signature, publicKey]
tx.setWitness(0, [signature, publicKey]);

// P2TR key-path witness: [signature]
tx.setWitness(1, [schnorrSignature]);

// P2TR script-path witness: [sig, script, controlBlock]
tx.setWitness(2, [signature, tapscript, controlBlock]);
```

---

### Serialization Methods

#### toBuffer

Serialize the transaction to bytes.

```typescript
toBuffer(buffer?: Uint8Array, initialOffset?: number): Uint8Array
```

**Example:**

```typescript
const tx = new Transaction();
// ... build transaction ...

const serialized = tx.toBuffer();
console.log('Raw tx:', toHex(serialized));
```

---

#### toHex

Serialize the transaction to a hex string.

```typescript
toHex(): string
```

**Example:**

```typescript
const tx = new Transaction();
// ... build transaction ...

const hex = tx.toHex();
console.log('Raw tx hex:', hex);
```

---

### Transaction Metadata

#### getId

Get the transaction ID (txid) as a hex string.

```typescript
getId(): string
```

**Returns:** Transaction ID in standard display format (reversed hex)

**Example:**

```typescript
const tx = Transaction.fromHex('...');
console.log('TXID:', tx.getId());
// "a1b2c3d4..."
```

---

#### getHash

Get the transaction hash.

```typescript
getHash(forWitness?: boolean): Bytes32
```

**Parameters:**
- `forWitness` - If true, include witness data (wtxid)

**Returns:** 32-byte transaction hash (internal byte order)

**Example:**

```typescript
const tx = Transaction.fromHex('...');

// Transaction ID hash (no witness)
const txid = tx.getHash(false);

// Witness transaction ID (includes witness)
const wtxid = tx.getHash(true);
```

---

#### weight

Calculate the transaction weight in weight units.

```typescript
weight(): number
```

**Returns:** Transaction weight (base * 3 + total)

**Example:**

```typescript
const tx = Transaction.fromHex('...');
console.log('Weight:', tx.weight(), 'WU');
```

---

#### virtualSize

Calculate the virtual size (vsize) in vbytes.

```typescript
virtualSize(): number
```

**Returns:** Virtual size (weight / 4, rounded up)

**Example:**

```typescript
const tx = Transaction.fromHex('...');
console.log('vSize:', tx.virtualSize(), 'vbytes');

// Calculate fee rate
const feeRate = fee / tx.virtualSize();
console.log('Fee rate:', feeRate, 'sat/vB');
```

---

#### byteLength

Calculate the serialized byte length.

```typescript
byteLength(_ALLOW_WITNESS?: boolean): number
```

**Parameters:**
- `_ALLOW_WITNESS` - Include witness data in calculation (default: true)

**Returns:** Byte length

**Example:**

```typescript
const tx = Transaction.fromHex('...');

console.log('Total size:', tx.byteLength(true), 'bytes');
console.log('Base size:', tx.byteLength(false), 'bytes');
```

---

#### hasWitnesses

Check if the transaction has any witness data.

```typescript
hasWitnesses(): boolean
```

**Returns:** `true` if any input has witness data

**Example:**

```typescript
const tx = Transaction.fromHex('...');
if (tx.hasWitnesses()) {
    console.log('This is a SegWit transaction');
}
```

---

#### isCoinbase

Check if this is a coinbase transaction.

```typescript
isCoinbase(): boolean
```

**Returns:** `true` if transaction is a coinbase

**Example:**

```typescript
const tx = Transaction.fromHex('...');
if (tx.isCoinbase()) {
    console.log('This is a coinbase transaction');
}
```

---

#### clone

Create a deep copy of the transaction.

```typescript
clone(): Transaction
```

**Returns:** New Transaction instance with copied data

**Example:**

```typescript
const tx = Transaction.fromHex('...');
const txCopy = tx.clone();

// Modify copy without affecting original
txCopy.locktime = 500000;
```

---

## Types

### Input Interface

```typescript
interface Input {
    /** Previous transaction hash (internal byte order) */
    readonly hash: Bytes32;
    /** Previous output index */
    readonly index: number;
    /** Input script (scriptSig) */
    script: Script;
    /** Sequence number */
    sequence: number;
    /** Witness data */
    witness: Uint8Array[];
}
```

### Output Interface

```typescript
interface Output {
    /** Output script (scriptPubKey) */
    readonly script: Script;
    /** Output value in satoshis */
    readonly value: Satoshi;
}
```

### TaprootHashCache Interface

```typescript
interface TaprootHashCache {
    readonly hashPrevouts: Bytes32;
    readonly hashAmounts: Bytes32;
    readonly hashScriptPubKeys: Bytes32;
    readonly hashSequences: Bytes32;
    readonly hashOutputs: Bytes32;
}
```

---

## Signature Hash Types

| Type | Value | Description |
|------|-------|-------------|
| `SIGHASH_DEFAULT` | 0x00 | Same as ALL (Taproot only) |
| `SIGHASH_ALL` | 0x01 | Sign all inputs and outputs |
| `SIGHASH_NONE` | 0x02 | Sign all inputs, no outputs |
| `SIGHASH_SINGLE` | 0x03 | Sign all inputs, only matching output |
| `SIGHASH_ANYONECANPAY` | 0x80 | Modifier: sign only this input |

**Combined Types:**

| Combination | Value | Description |
|-------------|-------|-------------|
| `ALL \| ANYONECANPAY` | 0x81 | Sign one input, all outputs |
| `NONE \| ANYONECANPAY` | 0x82 | Sign one input, no outputs |
| `SINGLE \| ANYONECANPAY` | 0x83 | Sign one input, one output |

---

## Complete Example

```typescript
import {
    Transaction,
    address,
    script,
    opcodes,
    crypto,
    networks,
    fromHex,
    reverse,
    toHex
} from '@btc-vision/bitcoin';

// Build a simple P2WPKH transaction
async function buildTransaction(
    privateKey: Uint8Array,
    publicKey: Uint8Array,
    utxo: {
        txid: string;
        vout: number;
        value: bigint;
        scriptPubKey: Uint8Array;
    },
    recipientAddress: string,
    amount: bigint,
    fee: bigint
): Promise<string> {
    const tx = new Transaction();
    tx.version = 2;

    // Add input
    const prevTxHash = reverse(fromHex(utxo.txid));
    tx.addInput(prevTxHash, utxo.vout, 0xfffffffd);

    // Add recipient output
    const recipientScript = address.toOutputScript(recipientAddress, networks.bitcoin);
    tx.addOutput(recipientScript, amount);

    // Add change output
    const change = utxo.value - amount - fee;
    if (change > 546n) { // dust threshold
        const changeAddress = address.fromOutputScript(utxo.scriptPubKey, networks.bitcoin);
        const changeScript = address.toOutputScript(changeAddress, networks.bitcoin);
        tx.addOutput(changeScript, change);
    }

    // Sign P2WPKH input
    const pubKeyHash = crypto.hash160(publicKey);
    const scriptCode = script.compile([
        opcodes.OP_DUP,
        opcodes.OP_HASH160,
        pubKeyHash,
        opcodes.OP_EQUALVERIFY,
        opcodes.OP_CHECKSIG
    ]);

    const sigHash = tx.hashForWitnessV0(
        0,
        scriptCode,
        utxo.value,
        Transaction.SIGHASH_ALL
    );

    // Sign (using your ECDSA library)
    const signature = await ecdsaSign(sigHash, privateKey);
    const signatureWithHashType = new Uint8Array([...signature, Transaction.SIGHASH_ALL]);

    // Set witness
    tx.setWitness(0, [signatureWithHashType, publicKey]);

    console.log('TXID:', tx.getId());
    console.log('vSize:', tx.virtualSize(), 'vbytes');
    console.log('Fee rate:', Number(fee) / tx.virtualSize(), 'sat/vB');

    return tx.toHex();
}

// Build a Taproot key-path transaction
async function buildTaprootTransaction(
    privateKey: Uint8Array,
    xOnlyPubKey: Uint8Array,
    utxos: Array<{
        txid: string;
        vout: number;
        value: bigint;
        scriptPubKey: Uint8Array;
    }>,
    recipientAddress: string,
    amount: bigint,
    fee: bigint
): Promise<string> {
    const tx = new Transaction();
    tx.version = 2;

    // Add all inputs
    for (const utxo of utxos) {
        const prevTxHash = reverse(fromHex(utxo.txid));
        tx.addInput(prevTxHash, utxo.vout, 0xfffffffd);
    }

    // Add output
    const recipientScript = address.toOutputScript(recipientAddress, networks.bitcoin);
    tx.addOutput(recipientScript, amount);

    // Collect all input data
    const prevOutScripts = utxos.map(u => u.scriptPubKey);
    const values = utxos.map(u => u.value);

    // Pre-compute Taproot hash cache for efficiency
    const cache = tx.getTaprootHashCache(prevOutScripts, values);

    // Sign all inputs
    for (let i = 0; i < utxos.length; i++) {
        const sigHash = tx.hashForWitnessV1(
            i,
            prevOutScripts,
            values,
            Transaction.SIGHASH_DEFAULT,
            undefined,
            undefined,
            cache
        );

        // Schnorr sign (using your signing library)
        const signature = await schnorrSign(sigHash, privateKey);

        // Taproot key-path: witness is just the signature
        // (no hash type byte needed for SIGHASH_DEFAULT)
        tx.setWitness(i, [signature]);
    }

    return tx.toHex();
}
```

---

## See Also

- [PSBT Documentation](./clients-bitcoin-psbt.md) - Partially Signed Bitcoin Transactions
- [Payments Documentation](./clients-bitcoin-payments.md) - Payment type implementations
- [Script Documentation](./clients-bitcoin-script.md) - Script building
- [Address Documentation](./clients-bitcoin-address.md) - Address encoding/decoding
