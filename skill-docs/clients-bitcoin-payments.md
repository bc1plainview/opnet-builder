# Bitcoin Payment Types

The `@btc-vision/bitcoin` library provides comprehensive support for all Bitcoin payment types, from legacy P2PK to modern Taproot.

## Overview

| Payment Type | Description | Address Format | SegWit |
|-------------|-------------|----------------|--------|
| P2PK | Pay to Public Key | None | No |
| P2PKH | Pay to Public Key Hash | 1... | No |
| P2SH | Pay to Script Hash | 3... | No (wrapper) |
| P2MS | Pay to Multisig | None | No |
| P2WPKH | Pay to Witness Public Key Hash | bc1q... | Yes (v0) |
| P2WSH | Pay to Witness Script Hash | bc1q... | Yes (v0) |
| P2TR | Pay to Taproot | bc1p... | Yes (v1) |
| P2OP | Pay to OPNet | opnet1... | Yes (v16) |
| Embed | OP_RETURN data | None | N/A |

## Installation

```typescript
import {
    p2pk, P2PK,
    p2pkh, P2PKH,
    p2sh, P2SH,
    p2ms, P2MS,
    p2wpkh, P2WPKH,
    p2wsh, P2WSH,
    p2tr, P2TR,
    p2op, P2OP,
    p2data, Embed,
} from '@btc-vision/bitcoin';
```

---

## P2TR (Pay to Taproot)

Taproot (BIP341) provides key-path and script-path spending with Schnorr signatures.

### Class: P2TR

```typescript
class P2TR {
    static readonly NAME = 'p2tr';

    constructor(params: {
        address?: string;
        pubkey?: Uint8Array;
        internalPubkey?: Uint8Array;
        hash?: Uint8Array;
        scriptTree?: Taptree;
        signature?: Uint8Array;
        output?: Uint8Array;
        witness?: Uint8Array[];
        redeem?: ScriptRedeem;
        redeemVersion?: number;
        network?: Network;
    }, opts?: PaymentOpts);

    // Properties
    get name(): 'p2tr';
    get network(): Network;
    get address(): string | undefined;
    get pubkey(): XOnlyPublicKey | undefined;
    get internalPubkey(): XOnlyPublicKey | undefined;
    get hash(): Bytes32 | undefined;
    get signature(): SchnorrSignature | undefined;
    get output(): Script | undefined;
    get redeem(): ScriptRedeem | undefined;
    get redeemVersion(): number;
    get witness(): Uint8Array[] | undefined;

    // Static factory methods
    static fromInternalPubkey(internalPubkey: XOnlyPublicKey, scriptTree?: Taptree, network?: Network): P2TR;
    static fromAddress(address: string, network?: Network): P2TR;
    static fromOutput(output: Uint8Array, network?: Network): P2TR;
    static fromSignature(signature: SchnorrSignature, internalPubkey?: XOnlyPublicKey, network?: Network): P2TR;

    toPayment(): P2TRPayment;
}
```

### Examples

```typescript
import { P2TR, p2tr, toXOnly } from '@btc-vision/bitcoin';

// Key-path only (no scripts)
const keyOnly = P2TR.fromInternalPubkey(internalPubkey);
console.log(keyOnly.address); // bc1p...

// With script tree
const scriptTree = [
    { output: script1 },
    { output: script2 },
];
const withScripts = P2TR.fromInternalPubkey(internalPubkey, scriptTree);

// From address
const fromAddr = P2TR.fromAddress('bc1p...');
console.log(fromAddr.pubkey); // 32-byte x-only pubkey

// From output script
const decoded = P2TR.fromOutput(scriptPubKey);

// Legacy factory function
const payment = p2tr({ internalPubkey, scriptTree });
```

### Script Structure

```
Output: OP_1 <32-byte x-only pubkey>
Key-path witness: [signature]
Script-path witness: [script inputs..., script, control block]
```

### Taproot Utilities

```typescript
import {
    LEAF_VERSION_TAPSCRIPT,
    MAX_TAPTREE_DEPTH,
    toHashTree,
    tapleafHash,
    tweakKey,
    findScriptPath,
    rootHashFromPath,
} from '@btc-vision/bitcoin';

// Build hash tree from script tree
const hashTree = toHashTree(scriptTree);

// Get leaf hash
const leafHash = tapleafHash({ output: script, version: LEAF_VERSION_TAPSCRIPT });

// Tweak internal key
const tweaked = tweakKey(internalPubkey, hashTree.hash);
console.log(tweaked.x);     // Output pubkey
console.log(tweaked.parity); // 0 or 1

// Find script path for control block
const path = findScriptPath(hashTree, leafHash);
```

---

## P2WPKH (Native SegWit)

Pay to Witness Public Key Hash - the most common modern payment type.

### Class: P2WPKH

```typescript
class P2WPKH {
    static readonly NAME = 'p2wpkh';

    constructor(params: {
        address?: string;
        hash?: Uint8Array;
        pubkey?: Uint8Array;
        signature?: Uint8Array;
        output?: Uint8Array;
        witness?: Uint8Array[];
        network?: Network;
    }, opts?: PaymentOpts);

    // Properties
    get name(): 'p2wpkh';
    get network(): Network;
    get address(): string | undefined;
    get hash(): Bytes20 | undefined;
    get pubkey(): PublicKey | undefined;
    get signature(): Signature | undefined;
    get output(): Script | undefined;
    get input(): Script | undefined;  // Always empty
    get witness(): Uint8Array[] | undefined;

    // Static factory methods
    static fromPubkey(pubkey: PublicKey, network?: Network): P2WPKH;
    static fromAddress(address: string, network?: Network): P2WPKH;
    static fromHash(hash: Bytes20, network?: Network): P2WPKH;
    static fromOutput(output: Uint8Array, network?: Network): P2WPKH;

    toPayment(): P2WPKHPayment;
}
```

### Examples

```typescript
import { P2WPKH, p2wpkh } from '@btc-vision/bitcoin';

// From public key
const payment = P2WPKH.fromPubkey(pubkey);
console.log(payment.address); // bc1q...
console.log(payment.output);  // scriptPubKey

// From address
const fromAddr = P2WPKH.fromAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
console.log(fromAddr.hash); // 20-byte witness program

// From hash directly
const fromHash = P2WPKH.fromHash(hash160);

// Legacy factory function
const legacy = p2wpkh({ pubkey });
```

### Script Structure

```
Output: OP_0 <20-byte hash160(pubkey)>
Witness: [signature, pubkey]
ScriptSig: (empty)
```

---

## P2WSH (SegWit Script Hash)

Pay to Witness Script Hash - native SegWit for complex scripts.

### Class: P2WSH

```typescript
class P2WSH {
    static readonly NAME = 'p2wsh';

    constructor(params: {
        address?: string;
        hash?: Uint8Array;
        output?: Uint8Array;
        redeem?: ScriptRedeem;
        witness?: Uint8Array[];
        network?: Network;
    }, opts?: PaymentOpts);

    // Properties
    get name(): string;  // 'p2wsh' or 'p2wsh-{redeemType}'
    get network(): Network;
    get address(): string | undefined;
    get hash(): Bytes32 | undefined;
    get output(): Script | undefined;
    get input(): Script | undefined;  // Always empty
    get redeem(): ScriptRedeem | undefined;
    get witness(): Uint8Array[] | undefined;

    // Static factory methods
    static fromRedeem(redeem: ScriptRedeem, network?: Network): P2WSH;
    static fromAddress(address: string, network?: Network): P2WSH;
    static fromHash(hash: Bytes32, network?: Network): P2WSH;
    static fromOutput(output: Uint8Array, network?: Network): P2WSH;

    toPayment(): P2WSHPayment;
}
```

### Examples

```typescript
import { P2WSH, p2wsh, P2MS } from '@btc-vision/bitcoin';

// Wrap a multisig in P2WSH
const multisig = P2MS.fromPubkeys(2, [pubkey1, pubkey2, pubkey3]);
const p2wshMultisig = P2WSH.fromRedeem({ output: multisig.output });
console.log(p2wshMultisig.address); // bc1q...

// From address
const fromAddr = P2WSH.fromAddress('bc1q...');
console.log(fromAddr.hash); // 32-byte witness program

// Legacy factory function
const payment = p2wsh({ redeem: { output: redeemScript } });
```

### Script Structure

```
Output: OP_0 <32-byte sha256(redeemScript)>
Witness: [scriptSig..., redeemScript]
ScriptSig: (empty)
```

### Limits

- Redeem script max size: 3600 bytes
- Max non-push ops: 201

---

## P2SH (Script Hash)

Pay to Script Hash - legacy wrapper for complex scripts.

### Class: P2SH

```typescript
class P2SH {
    static readonly NAME = 'p2sh';

    constructor(params: {
        address?: string;
        hash?: Uint8Array;
        output?: Uint8Array;
        input?: Uint8Array;
        redeem?: ScriptRedeem;
        witness?: Uint8Array[];
        network?: Network;
    }, opts?: PaymentOpts);

    // Properties
    get name(): string;  // 'p2sh' or 'p2sh-{redeemType}'
    get network(): Network;
    get address(): string | undefined;
    get hash(): Bytes20 | undefined;
    get output(): Script | undefined;
    get input(): Script | undefined;
    get redeem(): ScriptRedeem | undefined;
    get witness(): Uint8Array[] | undefined;

    // Static factory methods
    static fromRedeem(redeem: ScriptRedeem, network?: Network): P2SH;
    static fromAddress(address: string, network?: Network): P2SH;
    static fromHash(hash: Bytes20, network?: Network): P2SH;
    static fromOutput(output: Uint8Array, network?: Network): P2SH;

    toPayment(): P2SHPayment;
}
```

### Examples

```typescript
import { P2SH, p2sh, P2MS, P2WPKH } from '@btc-vision/bitcoin';

// Wrap multisig in P2SH
const multisig = P2MS.fromPubkeys(2, [pk1, pk2, pk3]);
const p2shMultisig = P2SH.fromRedeem({ output: multisig.output });
console.log(p2shMultisig.address); // 3...

// P2SH-P2WPKH (nested SegWit)
const p2wpkh = P2WPKH.fromPubkey(pubkey);
const nested = P2SH.fromRedeem({ output: p2wpkh.output });
console.log(nested.name); // 'p2sh-p2wpkh'

// From address
const fromAddr = P2SH.fromAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');

// Legacy factory function
const payment = p2sh({ redeem: multisig });
```

### Script Structure

```
Output: OP_HASH160 <20-byte hash160(redeemScript)> OP_EQUAL
ScriptSig: [scriptSig..., redeemScript]
Witness: (only for wrapped SegWit)
```

### Limits

- Redeem script max size: 520 bytes
- Max non-push ops: 201

---

## P2PKH (Legacy)

Pay to Public Key Hash - the original Bitcoin address format.

### Class: P2PKH

```typescript
class P2PKH {
    static readonly NAME = 'p2pkh';

    constructor(params: {
        address?: string;
        hash?: Uint8Array;
        pubkey?: Uint8Array;
        signature?: Uint8Array;
        output?: Uint8Array;
        input?: Uint8Array;
        network?: Network;
        useHybrid?: boolean;
        useUncompressed?: boolean;
    }, opts?: PaymentOpts);

    // Properties
    get name(): 'p2pkh';
    get network(): Network;
    get address(): string | undefined;
    get hash(): Bytes20 | undefined;
    get pubkey(): PublicKey | undefined;
    get signature(): Signature | undefined;
    get output(): Script | undefined;
    get input(): Script | undefined;
    get witness(): Uint8Array[] | undefined;  // Always empty array

    // Static factory methods
    static fromPubkey(pubkey: PublicKey, network?: Network): P2PKH;
    static fromAddress(address: string, network?: Network): P2PKH;
    static fromHash(hash: Bytes20, network?: Network): P2PKH;
    static fromOutput(output: Uint8Array, network?: Network): P2PKH;

    toPayment(): P2PKHPayment;
}
```

### Examples

```typescript
import { P2PKH, p2pkh } from '@btc-vision/bitcoin';

// From public key
const payment = P2PKH.fromPubkey(pubkey);
console.log(payment.address); // 1...

// From address
const fromAddr = P2PKH.fromAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
console.log(fromAddr.hash); // 20-byte pubkey hash

// Legacy factory function
const legacy = p2pkh({ pubkey });
```

### Script Structure

```
Output: OP_DUP OP_HASH160 <20-byte hash160(pubkey)> OP_EQUALVERIFY OP_CHECKSIG
ScriptSig: [signature, pubkey]
```

---

## P2PK (Pay to Public Key)

Simplest payment type - public key directly in output.

### Class: P2PK

```typescript
class P2PK {
    static readonly NAME = 'p2pk';

    constructor(params: {
        pubkey?: Uint8Array;
        signature?: Uint8Array;
        output?: Uint8Array;
        input?: Uint8Array;
        network?: Network;
    }, opts?: PaymentOpts);

    // Properties
    get name(): 'p2pk';
    get network(): Network;
    get pubkey(): PublicKey | undefined;
    get signature(): Signature | undefined;
    get output(): Script | undefined;
    get input(): Script | undefined;
    get witness(): Uint8Array[] | undefined;

    // Static factory methods
    static fromPubkey(pubkey: PublicKey, network?: Network): P2PK;
    static fromOutput(output: Uint8Array, network?: Network): P2PK;
    static fromSignature(signature: Signature, pubkey?: PublicKey, network?: Network): P2PK;

    toPayment(): P2PKPayment;
}
```

### Examples

```typescript
import { P2PK, p2pk } from '@btc-vision/bitcoin';

// From public key
const payment = P2PK.fromPubkey(pubkey);
console.log(payment.output); // scriptPubKey

// From output
const decoded = P2PK.fromOutput(scriptPubKey);
console.log(decoded.pubkey);

// Legacy factory function
const legacy = p2pk({ pubkey });
```

### Script Structure

```
Output: <pubkey> OP_CHECKSIG
ScriptSig: [signature]
```

---

## P2MS (Multisig)

Bare multisig - M-of-N signatures required.

### Class: P2MS

```typescript
class P2MS {
    static readonly NAME = 'p2ms';

    constructor(params: {
        m?: number;
        n?: number;
        pubkeys?: Uint8Array[];
        signatures?: Uint8Array[];
        output?: Uint8Array;
        input?: Uint8Array;
        network?: Network;
    }, opts?: PaymentOpts);

    // Properties
    get name(): string;  // 'p2ms' or 'p2ms(M of N)'
    get network(): Network;
    get m(): number | undefined;  // Required signatures
    get n(): number | undefined;  // Total pubkeys
    get pubkeys(): PublicKey[] | undefined;
    get signatures(): Signature[] | undefined;
    get output(): Script | undefined;
    get input(): Script | undefined;
    get witness(): Uint8Array[] | undefined;

    // Static factory methods
    static fromPubkeys(m: number, pubkeys: PublicKey[], network?: Network): P2MS;
    static fromOutput(output: Uint8Array, network?: Network): P2MS;
    static fromSignatures(signatures: Signature[], m?: number, pubkeys?: PublicKey[], network?: Network): P2MS;

    toPayment(): P2MSPayment;
}
```

### Examples

```typescript
import { P2MS, p2ms } from '@btc-vision/bitcoin';

// Create 2-of-3 multisig
const multisig = P2MS.fromPubkeys(2, [pubkey1, pubkey2, pubkey3]);
console.log(multisig.m); // 2
console.log(multisig.n); // 3
console.log(multisig.output); // scriptPubKey

// Decode existing multisig
const decoded = P2MS.fromOutput(scriptPubKey);
console.log(decoded.pubkeys);

// Legacy factory function
const legacy = p2ms({ m: 2, pubkeys: [pk1, pk2, pk3] });
```

### Script Structure

```
Output: <m> <pubkey1> <pubkey2> ... <pubkeyN> <n> OP_CHECKMULTISIG
ScriptSig: OP_0 <sig1> <sig2> ... <sigM>
```

### Limits

- Maximum N: 16 public keys
- Commonly wrapped in P2SH or P2WSH for address support

---

## P2OP (OPNet)

Custom witness version 16 output for OPNet network.

### Class: P2OP

```typescript
class P2OP {
    static readonly NAME = 'p2op';

    constructor(params: {
        address?: string;
        program?: Uint8Array;
        deploymentVersion?: number;
        hash160?: Uint8Array;
        output?: Uint8Array;
        network?: Network;
    }, opts?: PaymentOpts);

    // Properties
    get name(): 'p2op';
    get network(): Network;
    get address(): string | undefined;
    get program(): Uint8Array | undefined;
    get deploymentVersion(): number | undefined;
    get hash160(): Bytes20 | undefined;
    get output(): Uint8Array | undefined;

    // Static factory methods
    static fromProgram(program: Uint8Array, network?: Network): P2OP;
    static fromParts(deploymentVersion: number, hash160: Uint8Array, network?: Network): P2OP;
    static fromAddress(address: string, network?: Network): P2OP;
    static fromOutput(output: Uint8Array, network?: Network): P2OP;

    toPayment(): P2OPPayment;
}
```

### Examples

```typescript
import { P2OP, p2op } from '@btc-vision/bitcoin';

// From program bytes
const payment = P2OP.fromProgram(program);
console.log(payment.address); // opnet1...

// From deployment version and hash
const fromParts = P2OP.fromParts(0, hash160);

// From address
const fromAddr = P2OP.fromAddress('opnet1...');

// Legacy factory function
const legacy = p2op({ program });
```

### Script Structure

```
Output: OP_16 <program>
Program format: <deploymentVersion:uint8><hash160:20-bytes|...>
Program size: 2-40 bytes
```

---

## Embed (OP_RETURN)

Store arbitrary data in unspendable outputs.

### Class: Embed

```typescript
class Embed {
    static readonly NAME = 'embed';

    constructor(params: {
        data?: Uint8Array[];
        output?: Uint8Array;
        network?: Network;
    }, opts?: PaymentOpts);

    // Properties
    get name(): 'embed';
    get network(): Network;
    get data(): Uint8Array[];
    get output(): Script | undefined;

    // Static factory methods
    static fromData(data: Uint8Array[], network?: Network): Embed;
    static fromOutput(output: Uint8Array, network?: Network): Embed;

    toPayment(): EmbedPayment;
}
```

### Examples

```typescript
import { Embed, p2data } from '@btc-vision/bitcoin';

// Create from data
const payment = Embed.fromData([
    new TextEncoder().encode('Hello'),
    new TextEncoder().encode('Bitcoin'),
]);
console.log(payment.output); // OP_RETURN ...

// Decode existing
const decoded = Embed.fromOutput(scriptPubKey);
console.log(decoded.data); // Array of data chunks

// Legacy factory function
const legacy = p2data({ data: [Buffer.from('Hello')] });
```

### Script Structure

```
Output: OP_RETURN <data1> <data2> ...
```

**Note:** OP_RETURN outputs are provably unspendable and carry zero value.

---

## Payment Options

All payment types accept optional configuration:

```typescript
interface PaymentOpts {
    // Validate inputs during construction (default: true)
    readonly validate?: boolean;

    // Allow incomplete payments (default: false)
    readonly allowIncomplete?: boolean;
}
```

**Example:**
```typescript
// Skip validation for performance
const payment = P2WPKH.fromPubkey(pubkey, undefined, { validate: false });

// Allow incomplete multisig
const partial = p2ms({ m: 2, pubkeys: [pk1, pk2], signatures: [sig1] }, { allowIncomplete: true });
```

---

## Common Payment Interfaces

### BasePayment

```typescript
interface BasePayment {
    readonly name?: string;
    readonly network?: Network;
    readonly output?: Script;
    readonly input?: Script;
    readonly address?: string;
    readonly witness?: Uint8Array[];
    readonly redeem?: ScriptRedeem;
}
```

### ScriptRedeem

```typescript
interface ScriptRedeem extends BasePayment {
    readonly output?: Script;
    readonly redeemVersion?: number;
    readonly network?: Network;
}
```

---

## Network Support

All payment types support different networks:

```typescript
import { networks, P2WPKH } from '@btc-vision/bitcoin';

// Mainnet (default)
const mainnet = P2WPKH.fromPubkey(pubkey, networks.bitcoin);
console.log(mainnet.address); // bc1q...

// Testnet
const testnet = P2WPKH.fromPubkey(pubkey, networks.testnet);
console.log(testnet.address); // tb1q...

// Regtest
const regtest = P2WPKH.fromPubkey(pubkey, networks.regtest);
console.log(regtest.address); // bcrt1q...
```
