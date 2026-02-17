# Bitcoin Script and Opcodes

Complete documentation for the Script module and Bitcoin opcodes in `@btc-vision/bitcoin`.

## Overview

The Script module provides tools for building, parsing, and manipulating Bitcoin scripts. Scripts are the programmable spending conditions that secure Bitcoin outputs.

**Import:**

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';
// or
import * as bscript from '@btc-vision/bitcoin/src/script.js';
```

## Script Functions

### compile

Compiles an array of chunks (opcodes and data) into a binary script.

```typescript
function compile(chunks: Uint8Array | Stack): Script
```

**Parameters:**
- `chunks` - Array of opcodes (numbers) and data (Uint8Array), or already-compiled script

**Returns:** Compiled script as `Script` (Uint8Array)

**Example:**

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

// Create a P2PKH locking script
const pubKeyHash = new Uint8Array(20); // 20-byte hash
const lockingScript = script.compile([
    opcodes.OP_DUP,
    opcodes.OP_HASH160,
    pubKeyHash,
    opcodes.OP_EQUALVERIFY,
    opcodes.OP_CHECKSIG
]);

// Create a simple OP_RETURN script
const data = new TextEncoder().encode('Hello Bitcoin');
const opReturnScript = script.compile([
    opcodes.OP_RETURN,
    data
]);

// Push small numbers efficiently (BIP62.3 minimal push)
const pushOne = script.compile([new Uint8Array([1])]); // Becomes OP_1
```

**Notes:**
- Adheres to BIP62.3 minimal push policy
- Single-byte values 1-16 are converted to OP_1 through OP_16
- Empty arrays become OP_0
- Already-compiled scripts are returned as-is

---

### decompile

Decompiles a binary script into an array of chunks.

```typescript
function decompile(buffer: Uint8Array | Stack): Array<number | Uint8Array> | null
```

**Parameters:**
- `buffer` - Binary script or already-decompiled stack

**Returns:** Array of opcodes (numbers) and data (Uint8Array), or `null` if invalid

**Example:**

```typescript
import { script } from '@btc-vision/bitcoin';

const scriptHex = '76a914...88ac';
const scriptBytes = Buffer.from(scriptHex, 'hex');

const chunks = script.decompile(scriptBytes);
if (chunks) {
    chunks.forEach((chunk, i) => {
        if (typeof chunk === 'number') {
            console.log(`${i}: opcode ${chunk}`);
        } else {
            console.log(`${i}: data (${chunk.length} bytes)`);
        }
    });
}
```

**Notes:**
- Returns `null` for malformed scripts
- Decompiles minimally (single-byte data becomes opcodes where applicable)
- Already-decompiled arrays are returned as-is

---

### toASM

Converts script chunks to human-readable ASM string representation.

```typescript
function toASM(chunks: Uint8Array | Stack): string
```

**Parameters:**
- `chunks` - Binary script or decompiled stack

**Returns:** Space-separated ASM string

**Example:**

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

const lockingScript = script.compile([
    opcodes.OP_DUP,
    opcodes.OP_HASH160,
    new Uint8Array(20).fill(0xab),
    opcodes.OP_EQUALVERIFY,
    opcodes.OP_CHECKSIG
]);

const asm = script.toASM(lockingScript);
// Output: "OP_DUP OP_HASH160 abababababababababababababababababababab OP_EQUALVERIFY OP_CHECKSIG"
```

**Notes:**
- Opcodes are represented by their names (e.g., `OP_DUP`)
- Data is represented as hexadecimal strings
- Small integers appear as opcodes (e.g., `OP_1` instead of `01`)

---

### fromASM

Parses an ASM string and compiles it to binary script.

```typescript
function fromASM(asm: string): Script
```

**Parameters:**
- `asm` - Space-separated ASM string

**Returns:** Compiled script

**Throws:** `TypeError` if invalid opcode or non-hex data

**Example:**

```typescript
import { script } from '@btc-vision/bitcoin';

// Parse standard P2PKH script
const p2pkhScript = script.fromASM(
    'OP_DUP OP_HASH160 89abcdefabbaabbaabbaabbaabbaabbaabbaabba OP_EQUALVERIFY OP_CHECKSIG'
);

// Parse multisig script
const multisigScript = script.fromASM(
    'OP_2 0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798 ' +
    '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5 OP_2 OP_CHECKMULTISIG'
);
```

**Notes:**
- Opcode names must match exactly (e.g., `OP_DUP`, not `DUP`)
- Data must be valid hexadecimal strings
- Elements are space-separated

---

### toStack

Converts push-only script to a stack of data elements.

```typescript
function toStack(chunks: Uint8Array | Stack): Uint8Array[]
```

**Parameters:**
- `chunks` - Binary script or decompiled chunks (must be push-only)

**Returns:** Array of data elements

**Throws:** `TypeError` if script contains non-push opcodes

**Example:**

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

// Create witness stack
const witnessScript = script.compile([
    new Uint8Array([0x30, 0x44]), // signature
    new Uint8Array([0x02, 0x33]), // public key
]);

const stack = script.toStack(witnessScript);
// stack[0] = signature bytes
// stack[1] = public key bytes

// OP_0 becomes empty Uint8Array
const emptyPush = script.compile([opcodes.OP_0]);
const emptyStack = script.toStack(emptyPush);
// emptyStack[0].length === 0
```

**Notes:**
- Only push opcodes allowed (OP_0, OP_1-OP_16, OP_1NEGATE, data pushes)
- OP_0 becomes empty Uint8Array
- OP_1 through OP_16 become encoded numbers

---

### isPushOnly

Checks if all chunks are push operations.

```typescript
function isPushOnly(value: Stack): boolean
```

**Parameters:**
- `value` - Decompiled script chunks

**Returns:** `true` if all chunks are push operations

**Example:**

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

const chunks1 = [new Uint8Array([1, 2, 3]), opcodes.OP_1];
console.log(script.isPushOnly(chunks1)); // true

const chunks2 = [opcodes.OP_DUP, new Uint8Array([1, 2, 3])];
console.log(script.isPushOnly(chunks2)); // false
```

---

### countNonPushOnlyOPs

Counts the number of non-push opcodes in a script.

```typescript
function countNonPushOnlyOPs(value: Stack): number
```

**Parameters:**
- `value` - Decompiled script chunks

**Returns:** Number of non-push opcodes

**Example:**

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

const p2pkh = [
    opcodes.OP_DUP,
    opcodes.OP_HASH160,
    new Uint8Array(20),
    opcodes.OP_EQUALVERIFY,
    opcodes.OP_CHECKSIG
];

console.log(script.countNonPushOnlyOPs(p2pkh)); // 4
```

---

### isCanonicalPubKey

Validates if a buffer is a valid public key format.

```typescript
function isCanonicalPubKey(buffer: Uint8Array): boolean
```

**Parameters:**
- `buffer` - Potential public key bytes

**Returns:** `true` if valid compressed (33 bytes) or uncompressed (65 bytes) public key

**Example:**

```typescript
import { script } from '@btc-vision/bitcoin';

const compressedPubKey = new Uint8Array(33);
compressedPubKey[0] = 0x02; // or 0x03
console.log(script.isCanonicalPubKey(compressedPubKey)); // true

const uncompressedPubKey = new Uint8Array(65);
uncompressedPubKey[0] = 0x04;
console.log(script.isCanonicalPubKey(uncompressedPubKey)); // true
```

---

### isCanonicalScriptSignature

Validates if a buffer is a valid DER-encoded signature with sighash byte.

```typescript
function isCanonicalScriptSignature(buffer: Uint8Array): boolean
```

**Parameters:**
- `buffer` - Potential signature bytes

**Returns:** `true` if valid BIP66 DER signature with valid hash type

**Example:**

```typescript
import { script } from '@btc-vision/bitcoin';

const signature = new Uint8Array([
    0x30, 0x44, // DER sequence header
    // ... DER-encoded r and s values
    0x01 // SIGHASH_ALL
]);

console.log(script.isCanonicalScriptSignature(signature)); // true if valid DER
```

---

## Script Number Module

Access via `script.number`:

```typescript
import { script } from '@btc-vision/bitcoin';

// Encode a number to script number format
const encoded = script.number.encode(123);

// Decode a script number
const decoded = script.number.decode(encoded);
```

---

## Script Signature Module

Access via `script.signature`:

```typescript
import { script } from '@btc-vision/bitcoin';

// Decode a DER signature
const { signature, hashType } = script.signature.decode(signatureBuffer);

// Encode signature with hash type
const encoded = script.signature.encode(signature, hashType);
```

---

## Opcodes Reference

All Bitcoin script opcodes are available from the `opcodes` object.

```typescript
import { opcodes } from '@btc-vision/bitcoin';
```

### Constants (Push Values)

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_0` / `OP_FALSE` | 0x00 | Push empty array (false) |
| `OP_PUSHDATA1` | 0x4c | Next byte contains push length |
| `OP_PUSHDATA2` | 0x4d | Next 2 bytes contain push length |
| `OP_PUSHDATA4` | 0x4e | Next 4 bytes contain push length |
| `OP_1NEGATE` | 0x4f | Push -1 |
| `OP_RESERVED` | 0x50 | Reserved (transaction invalid if executed) |
| `OP_1` / `OP_TRUE` | 0x51 | Push 1 (true) |
| `OP_2` - `OP_16` | 0x52-0x60 | Push 2-16 |

### Control Flow

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_NOP` | 0x61 | Do nothing |
| `OP_VER` | 0x62 | Reserved |
| `OP_IF` | 0x63 | Execute if top stack is true |
| `OP_NOTIF` | 0x64 | Execute if top stack is false |
| `OP_VERIF` | 0x65 | Reserved (invalid) |
| `OP_VERNOTIF` | 0x66 | Reserved (invalid) |
| `OP_ELSE` | 0x67 | Execute if previous IF was false |
| `OP_ENDIF` | 0x68 | End IF block |
| `OP_VERIFY` | 0x69 | Fail if top stack is false |
| `OP_RETURN` | 0x6a | Mark output as provably unspendable |

### Stack Operations

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_TOALTSTACK` | 0x6b | Move top item to alt stack |
| `OP_FROMALTSTACK` | 0x6c | Move top alt stack item to main stack |
| `OP_2DROP` | 0x6d | Drop top 2 stack items |
| `OP_2DUP` | 0x6e | Duplicate top 2 stack items |
| `OP_3DUP` | 0x6f | Duplicate top 3 stack items |
| `OP_2OVER` | 0x70 | Copy 3rd and 4th items to top |
| `OP_2ROT` | 0x71 | Move 5th and 6th items to top |
| `OP_2SWAP` | 0x72 | Swap top two pairs of items |
| `OP_IFDUP` | 0x73 | Duplicate if not zero |
| `OP_DEPTH` | 0x74 | Push stack depth |
| `OP_DROP` | 0x75 | Drop top stack item |
| `OP_DUP` | 0x76 | Duplicate top stack item |
| `OP_NIP` | 0x77 | Remove second-to-top item |
| `OP_OVER` | 0x78 | Copy second-to-top item to top |
| `OP_PICK` | 0x79 | Copy nth item to top |
| `OP_ROLL` | 0x7a | Move nth item to top |
| `OP_ROT` | 0x7b | Rotate top 3 items |
| `OP_SWAP` | 0x7c | Swap top 2 items |
| `OP_TUCK` | 0x7d | Copy top item below second |

### Splice Operations (Disabled)

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_CAT` | 0x7e | Concatenate (disabled) |
| `OP_SUBSTR` | 0x7f | Substring (disabled) |
| `OP_LEFT` | 0x80 | Left substring (disabled) |
| `OP_RIGHT` | 0x81 | Right substring (disabled) |
| `OP_SIZE` | 0x82 | Push string length |

### Bitwise Logic

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_INVERT` | 0x83 | Bitwise NOT (disabled) |
| `OP_AND` | 0x84 | Bitwise AND (disabled) |
| `OP_OR` | 0x85 | Bitwise OR (disabled) |
| `OP_XOR` | 0x86 | Bitwise XOR (disabled) |
| `OP_EQUAL` | 0x87 | Push 1 if inputs are equal |
| `OP_EQUALVERIFY` | 0x88 | OP_EQUAL + OP_VERIFY |
| `OP_RESERVED1` | 0x89 | Reserved |
| `OP_RESERVED2` | 0x8a | Reserved |

### Arithmetic

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_1ADD` | 0x8b | Add 1 to top |
| `OP_1SUB` | 0x8c | Subtract 1 from top |
| `OP_2MUL` | 0x8d | Multiply by 2 (disabled) |
| `OP_2DIV` | 0x8e | Divide by 2 (disabled) |
| `OP_NEGATE` | 0x8f | Negate top |
| `OP_ABS` | 0x90 | Absolute value |
| `OP_NOT` | 0x91 | Logical NOT |
| `OP_0NOTEQUAL` | 0x92 | 0 if input is 0, else 1 |
| `OP_ADD` | 0x93 | Add top 2 items |
| `OP_SUB` | 0x94 | Subtract top from second |
| `OP_MUL` | 0x95 | Multiply (disabled) |
| `OP_DIV` | 0x96 | Divide (disabled) |
| `OP_MOD` | 0x97 | Modulo (disabled) |
| `OP_LSHIFT` | 0x98 | Left shift (disabled) |
| `OP_RSHIFT` | 0x99 | Right shift (disabled) |
| `OP_BOOLAND` | 0x9a | Logical AND |
| `OP_BOOLOR` | 0x9b | Logical OR |
| `OP_NUMEQUAL` | 0x9c | Push 1 if numbers equal |
| `OP_NUMEQUALVERIFY` | 0x9d | OP_NUMEQUAL + OP_VERIFY |
| `OP_NUMNOTEQUAL` | 0x9e | Push 1 if numbers not equal |
| `OP_LESSTHAN` | 0x9f | Push 1 if a < b |
| `OP_GREATERTHAN` | 0xa0 | Push 1 if a > b |
| `OP_LESSTHANOREQUAL` | 0xa1 | Push 1 if a <= b |
| `OP_GREATERTHANOREQUAL` | 0xa2 | Push 1 if a >= b |
| `OP_MIN` | 0xa3 | Push smaller of a, b |
| `OP_MAX` | 0xa4 | Push larger of a, b |
| `OP_WITHIN` | 0xa5 | Push 1 if x is within [min, max) |

### Cryptographic

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_RIPEMD160` | 0xa6 | RIPEMD-160 hash |
| `OP_SHA1` | 0xa7 | SHA-1 hash |
| `OP_SHA256` | 0xa8 | SHA-256 hash |
| `OP_HASH160` | 0xa9 | SHA-256 + RIPEMD-160 |
| `OP_HASH256` | 0xaa | Double SHA-256 |
| `OP_CODESEPARATOR` | 0xab | Mark for signature checking |
| `OP_CHECKSIG` | 0xac | Verify signature |
| `OP_CHECKSIGVERIFY` | 0xad | OP_CHECKSIG + OP_VERIFY |
| `OP_CHECKMULTISIG` | 0xae | Verify m-of-n signatures |
| `OP_CHECKMULTISIGVERIFY` | 0xaf | OP_CHECKMULTISIG + OP_VERIFY |

### Locktime

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_NOP1` | 0xb0 | No operation (reserved) |
| `OP_CHECKLOCKTIMEVERIFY` / `OP_NOP2` | 0xb1 | Check locktime (BIP65) |
| `OP_CHECKSEQUENCEVERIFY` / `OP_NOP3` | 0xb2 | Check sequence (BIP112) |
| `OP_NOP4` - `OP_NOP10` | 0xb3-0xb9 | Reserved for future use |

### Taproot (BIP342)

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_CHECKSIGADD` | 0xba | Add signature check result for batch validation |

### Template Matching

| Opcode | Value | Description |
|--------|-------|-------------|
| `OP_PUBKEYHASH` | 0xfd | Template placeholder |
| `OP_PUBKEY` | 0xfe | Template placeholder |
| `OP_INVALIDOPCODE` | 0xff | Invalid opcode |

---

## Reverse Opcode Lookup

Get opcode name from value:

```typescript
import { getReverseOps, REVERSE_OPS } from '@btc-vision/bitcoin/src/opcodes.js';

// Lazy initialization (recommended)
const reverseOps = getReverseOps();
console.log(reverseOps[118]); // "OP_DUP"

// Eager initialization (backward compatibility)
console.log(REVERSE_OPS[118]); // "OP_DUP"
```

---

## Common Script Patterns

### P2PKH (Pay to Public Key Hash)

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

function createP2PKH(pubKeyHash: Uint8Array): Uint8Array {
    return script.compile([
        opcodes.OP_DUP,
        opcodes.OP_HASH160,
        pubKeyHash,
        opcodes.OP_EQUALVERIFY,
        opcodes.OP_CHECKSIG
    ]);
}
```

### P2SH (Pay to Script Hash)

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

function createP2SH(scriptHash: Uint8Array): Uint8Array {
    return script.compile([
        opcodes.OP_HASH160,
        scriptHash,
        opcodes.OP_EQUAL
    ]);
}
```

### P2WPKH (Native SegWit)

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

function createP2WPKH(pubKeyHash: Uint8Array): Uint8Array {
    return script.compile([
        opcodes.OP_0,
        pubKeyHash
    ]);
}
```

### P2WSH (SegWit Script Hash)

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

function createP2WSH(scriptHash: Uint8Array): Uint8Array {
    return script.compile([
        opcodes.OP_0,
        scriptHash
    ]);
}
```

### P2TR (Taproot)

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

function createP2TR(xOnlyPubKey: Uint8Array): Uint8Array {
    return script.compile([
        opcodes.OP_1,
        xOnlyPubKey
    ]);
}
```

### OP_RETURN (Data Carrier)

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

function createOpReturn(data: Uint8Array): Uint8Array {
    return script.compile([
        opcodes.OP_RETURN,
        data
    ]);
}
```

### Multisig (m-of-n)

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

function createMultisig(m: number, pubKeys: Uint8Array[]): Uint8Array {
    const n = pubKeys.length;
    return script.compile([
        opcodes.OP_0 + m, // OP_1, OP_2, etc.
        ...pubKeys,
        opcodes.OP_0 + n,
        opcodes.OP_CHECKMULTISIG
    ]);
}
```

### HTLC (Hash Time-Locked Contract)

```typescript
import { script, opcodes } from '@btc-vision/bitcoin';

function createHTLC(
    hashLock: Uint8Array,
    recipientPubKey: Uint8Array,
    refundPubKey: Uint8Array,
    timeout: number
): Uint8Array {
    return script.compile([
        opcodes.OP_IF,
            opcodes.OP_SHA256,
            hashLock,
            opcodes.OP_EQUALVERIFY,
            recipientPubKey,
        opcodes.OP_ELSE,
            script.number.encode(timeout),
            opcodes.OP_CHECKLOCKTIMEVERIFY,
            opcodes.OP_DROP,
            refundPubKey,
        opcodes.OP_ENDIF,
        opcodes.OP_CHECKSIG
    ]);
}
```

---

## Types

```typescript
// Script type (branded Uint8Array)
type Script = Uint8Array & { readonly __script: unique symbol };

// Stack type (decompiled script)
type Stack = Array<number | Uint8Array>;
```

---

## See Also

- [Payments Documentation](./clients-bitcoin-payments.md) - Payment type implementations
- [Transaction Documentation](./clients-bitcoin-transaction.md) - Transaction building
- [Address Documentation](./clients-bitcoin-address.md) - Address encoding/decoding
