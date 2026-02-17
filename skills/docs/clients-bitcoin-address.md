# Bitcoin Address Handling

Complete documentation for address encoding and decoding in `@btc-vision/bitcoin`.

## Overview

The Address module provides tools for encoding and decoding Bitcoin addresses across all supported formats:

- **Base58Check**: Legacy P2PKH and P2SH addresses
- **Bech32**: Native SegWit v0 addresses (P2WPKH, P2WSH)
- **Bech32m**: Taproot (P2TR) and future SegWit versions
- **OPNet**: Custom witness version 16 addresses

**Import:**

```typescript
import { address, networks } from '@btc-vision/bitcoin';
// or import specific functions
import {
    fromBase58Check,
    toBase58Check,
    fromBech32,
    toBech32,
    fromOutputScript,
    toOutputScript
} from '@btc-vision/bitcoin';
```

---

## Address Functions

### fromOutputScript

Converts an output script to its corresponding address string.

```typescript
function fromOutputScript(output: Uint8Array, network?: Network): string
```

**Parameters:**
- `output` - Output script (scriptPubKey)
- `network` - Network configuration (defaults to mainnet)

**Returns:** Address string

**Throws:** `Error` if script has no matching address format

**Example:**

```typescript
import { address, networks, script, opcodes } from '@btc-vision/bitcoin';

// P2PKH script to address
const p2pkhScript = script.compile([
    opcodes.OP_DUP,
    opcodes.OP_HASH160,
    pubKeyHash, // 20 bytes
    opcodes.OP_EQUALVERIFY,
    opcodes.OP_CHECKSIG
]);
const p2pkhAddress = address.fromOutputScript(p2pkhScript);
// "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"

// P2WPKH script to address
const p2wpkhScript = script.compile([opcodes.OP_0, pubKeyHash]);
const p2wpkhAddress = address.fromOutputScript(p2wpkhScript);
// "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"

// P2TR script to address
const p2trScript = script.compile([opcodes.OP_1, xOnlyPubKey]); // 32 bytes
const p2trAddress = address.fromOutputScript(p2trScript);
// "bc1p..."

// Testnet address
const testnetAddress = address.fromOutputScript(p2wpkhScript, networks.testnet);
// "tb1q..."
```

**Supported Script Patterns:**

| Pattern | Script Format | Address Format |
|---------|---------------|----------------|
| P2PKH | `OP_DUP OP_HASH160 <20> OP_EQUALVERIFY OP_CHECKSIG` | Base58Check (1...) |
| P2SH | `OP_HASH160 <20> OP_EQUAL` | Base58Check (3...) |
| P2WPKH | `OP_0 <20>` | Bech32 (bc1q...) |
| P2WSH | `OP_0 <32>` | Bech32 (bc1q...) |
| P2TR | `OP_1 <32>` | Bech32m (bc1p...) |
| P2OP | `OP_16 <2-40>` | Bech32m OPNet prefix |
| Future SegWit | `OP_2-OP_16 <2-40>` | Bech32m |

---

### toOutputScript

Converts an address string to its corresponding output script.

```typescript
function toOutputScript(
    address: string,
    networkOrOptions?: Network | ToOutputScriptOptions
): Uint8Array
```

**Parameters:**
- `address` - Address string to convert
- `networkOrOptions` - Network or options object

**Returns:** Output script (scriptPubKey)

**Throws:** `TypeError` if address has no matching script

**Example:**

```typescript
import { address, networks } from '@btc-vision/bitcoin';

// Parse mainnet addresses
const p2pkhScript = address.toOutputScript('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
const p2shScript = address.toOutputScript('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
const p2wpkhScript = address.toOutputScript('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
const p2trScript = address.toOutputScript('bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr');

// Parse testnet address
const testnetScript = address.toOutputScript(
    'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
    networks.testnet
);

// With options for future segwit warning
const futureScript = address.toOutputScript('bc1s...', {
    network: networks.bitcoin,
    onFutureSegwitWarning: (warning) => {
        console.warn(warning);
    }
});
```

**Options Interface:**

```typescript
interface ToOutputScriptOptions {
    /** Network to use (defaults to mainnet) */
    network?: Network;
    /** Callback for future segwit version warnings */
    onFutureSegwitWarning?: (warning: string) => void;
}
```

---

### fromBase58Check

Decodes a Base58Check-encoded address.

```typescript
function fromBase58Check(address: string): Base58CheckResult
```

**Parameters:**
- `address` - Base58Check-encoded address

**Returns:** Object with version and hash

**Throws:** `TypeError` if address is invalid

**Example:**

```typescript
import { address } from '@btc-vision/bitcoin';

// Decode P2PKH address
const p2pkh = address.fromBase58Check('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
console.log(p2pkh.version); // 0 (mainnet P2PKH)
console.log(p2pkh.hash);    // 20-byte pubkey hash

// Decode P2SH address
const p2sh = address.fromBase58Check('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
console.log(p2sh.version);  // 5 (mainnet P2SH)
console.log(p2sh.hash);     // 20-byte script hash

// Testnet addresses have different versions
const testnetP2PKH = address.fromBase58Check('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn');
console.log(testnetP2PKH.version); // 111 (testnet P2PKH)
```

**Result Interface:**

```typescript
interface Base58CheckResult {
    /** Address hash (20 bytes) */
    readonly hash: Bytes20;
    /** Version byte: 0x00 for P2PKH, 0x05 for P2SH */
    readonly version: number;
}
```

**Version Bytes:**

| Network | P2PKH | P2SH |
|---------|-------|------|
| Mainnet | 0x00 | 0x05 |
| Testnet | 0x6f | 0xc4 |
| Regtest | 0x6f | 0xc4 |

---

### toBase58Check

Encodes a hash to a Base58Check address.

```typescript
function toBase58Check(hash: Bytes20, version: number): string
```

**Parameters:**
- `hash` - 20-byte hash (pubkey hash or script hash)
- `version` - Version byte

**Returns:** Base58Check-encoded address

**Throws:** `TypeError` if hash is not 20 bytes or version is invalid

**Example:**

```typescript
import { address, crypto } from '@btc-vision/bitcoin';

// Create P2PKH address from public key
const pubKeyHash = crypto.hash160(publicKey); // 20 bytes
const mainnetP2PKH = address.toBase58Check(pubKeyHash, 0x00);
// "1..."

// Create P2SH address from redeem script
const scriptHash = crypto.hash160(redeemScript);
const mainnetP2SH = address.toBase58Check(scriptHash, 0x05);
// "3..."

// Create testnet address
const testnetP2PKH = address.toBase58Check(pubKeyHash, 0x6f);
// "m..." or "n..."
```

---

### fromBech32

Decodes a Bech32/Bech32m-encoded address.

```typescript
function fromBech32(address: string): Bech32Result
```

**Parameters:**
- `address` - Bech32 or Bech32m-encoded address

**Returns:** Object with prefix, version, and data

**Throws:** `Error` if address is invalid

**Example:**

```typescript
import { address } from '@btc-vision/bitcoin';

// Decode P2WPKH address (Bech32, version 0)
const p2wpkh = address.fromBech32('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
console.log(p2wpkh.prefix);  // "bc"
console.log(p2wpkh.version); // 0
console.log(p2wpkh.data);    // 20-byte pubkey hash

// Decode P2WSH address (Bech32, version 0)
const p2wsh = address.fromBech32('bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3');
console.log(p2wsh.data.length); // 32 (script hash)

// Decode P2TR address (Bech32m, version 1)
const p2tr = address.fromBech32('bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr');
console.log(p2tr.version); // 1

// Testnet address
const testnet = address.fromBech32('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
console.log(testnet.prefix); // "tb"
```

**Result Interface:**

```typescript
interface Bech32Result {
    /** Human-readable prefix (bc, tb, bcrt) */
    prefix: string;
    /** Witness version (0-16) */
    version: number;
    /** Witness program data */
    data: Uint8Array;
}
```

**Bech32 Prefixes:**

| Network | Standard | OPNet |
|---------|----------|-------|
| Mainnet | `bc` | `bcop` |
| Testnet | `tb` | `tbop` |
| Regtest | `bcrt` | `bcrtop` |

---

### toBech32

Encodes data to a Bech32/Bech32m address.

```typescript
function toBech32(
    data: Uint8Array,
    version: number,
    prefix: string,
    prefixOpnet?: string
): string
```

**Parameters:**
- `data` - Witness program data
- `version` - Witness version (0-16)
- `prefix` - Human-readable prefix
- `prefixOpnet` - Optional OPNet prefix for version 16

**Returns:** Bech32 or Bech32m-encoded address

**Example:**

```typescript
import { address, crypto } from '@btc-vision/bitcoin';

// Create P2WPKH address (version 0 uses Bech32)
const pubKeyHash = crypto.hash160(publicKey);
const p2wpkh = address.toBech32(pubKeyHash, 0, 'bc');
// "bc1q..."

// Create P2WSH address
const scriptHash = crypto.sha256(witnessScript);
const p2wsh = address.toBech32(scriptHash, 0, 'bc');
// "bc1q..."

// Create P2TR address (version 1 uses Bech32m)
const p2tr = address.toBech32(xOnlyPubKey, 1, 'bc');
// "bc1p..."

// Create testnet addresses
const testnetP2WPKH = address.toBech32(pubKeyHash, 0, 'tb');
// "tb1q..."

// Create OPNet address (version 16)
const opnetAddr = address.toBech32(program, 16, 'bc', 'bcop');
// "bcop1s..."
```

**Encoding Rules:**

| Version | Encoding |
|---------|----------|
| 0 | Bech32 |
| 1-15 | Bech32m |
| 16 | Bech32m (with OPNet prefix if provided) |

---

### toFutureOPNetAddress

Encodes a future SegWit output script to an OPNet address.

```typescript
function toFutureOPNetAddress(output: Uint8Array, network: Network): string
```

**Parameters:**
- `output` - Output script with version 15-16
- `network` - Network with bech32Opnet prefix

**Returns:** Bech32m-encoded OPNet address

**Throws:** `Error` if network doesn't support OPNet or invalid script

**Example:**

```typescript
import { address, networks, script, opcodes } from '@btc-vision/bitcoin';

// Create P2OP output script
const program = new Uint8Array(32); // witness program
const p2opScript = script.compile([opcodes.OP_16, program]);

// Convert to OPNet address
const opnetAddress = address.toFutureOPNetAddress(p2opScript, networks.bitcoin);
// "bcop1s..."
```

---

### isUnknownSegwitVersion

Checks if an output script is a future (unknown) SegWit version.

```typescript
function isUnknownSegwitVersion(output: Uint8Array): boolean
```

**Parameters:**
- `output` - Output script to check

**Returns:** `true` if script is SegWit v2-v16 (excluding v1/Taproot)

**Example:**

```typescript
import { address, script, opcodes } from '@btc-vision/bitcoin';

// Version 2 (future)
const v2Script = script.compile([opcodes.OP_2, new Uint8Array(32)]);
console.log(address.isUnknownSegwitVersion(v2Script)); // true

// Version 1 (Taproot - known)
const p2trScript = script.compile([opcodes.OP_1, new Uint8Array(32)]);
console.log(address.isUnknownSegwitVersion(p2trScript)); // false

// Version 0 (SegWit v0 - known)
const p2wpkhScript = script.compile([opcodes.OP_0, new Uint8Array(20)]);
console.log(address.isUnknownSegwitVersion(p2wpkhScript)); // false
```

---

## Constants

```typescript
// Future SegWit constraints
export const FUTURE_SEGWIT_MAX_SIZE: number = 40;
export const FUTURE_SEGWIT_MIN_SIZE: number = 2;
export const FUTURE_SEGWIT_MAX_VERSION: number = 15;
export const FUTURE_MAX_VERSION: number = 16;
export const FUTURE_OPNET_VERSION: number = 16;
export const FUTURE_SEGWIT_MIN_VERSION: number = 2;
export const FUTURE_SEGWIT_VERSION_DIFF: number = 0x50;
```

---

## Network Configuration

Networks define address encoding parameters:

```typescript
import { networks } from '@btc-vision/bitcoin';

// Mainnet
const bitcoin = networks.bitcoin;
// {
//   bech32: 'bc',
//   bech32Opnet: 'bcop',
//   pubKeyHash: 0x00,
//   scriptHash: 0x05,
//   ...
// }

// Testnet
const testnet = networks.testnet;
// {
//   bech32: 'tb',
//   bech32Opnet: 'tbop',
//   pubKeyHash: 0x6f,
//   scriptHash: 0xc4,
//   ...
// }

// Regtest
const regtest = networks.regtest;
// {
//   bech32: 'bcrt',
//   bech32Opnet: 'bcrtop',
//   pubKeyHash: 0x6f,
//   scriptHash: 0xc4,
//   ...
// }
```

---

## Address Format Examples

### Mainnet Addresses

| Type | Prefix | Example |
|------|--------|---------|
| P2PKH | 1 | `1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2` |
| P2SH | 3 | `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy` |
| P2WPKH | bc1q | `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4` |
| P2WSH | bc1q | `bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3` |
| P2TR | bc1p | `bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr` |
| P2OP | bcop1s | `bcop1s...` |

### Testnet Addresses

| Type | Prefix | Example |
|------|--------|---------|
| P2PKH | m/n | `mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn` |
| P2SH | 2 | `2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc` |
| P2WPKH | tb1q | `tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx` |
| P2WSH | tb1q | `tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7` |
| P2TR | tb1p | `tb1p...` |
| P2OP | tbop1s | `tbop1s...` |

---

## Complete Example

```typescript
import { address, networks, crypto, script, opcodes } from '@btc-vision/bitcoin';

// Generate addresses from public key
function generateAddresses(publicKey: Uint8Array, network = networks.bitcoin) {
    const pubKeyHash = crypto.hash160(publicKey);

    // Legacy P2PKH
    const p2pkh = address.toBase58Check(pubKeyHash, network.pubKeyHash);

    // Native SegWit P2WPKH
    const p2wpkh = address.toBech32(pubKeyHash, 0, network.bech32);

    // P2SH-wrapped P2WPKH
    const redeemScript = script.compile([opcodes.OP_0, pubKeyHash]);
    const scriptHash = crypto.hash160(redeemScript);
    const p2shP2wpkh = address.toBase58Check(scriptHash, network.scriptHash);

    return { p2pkh, p2wpkh, p2shP2wpkh };
}

// Parse any address to output script
function parseAddress(addr: string, network = networks.bitcoin) {
    try {
        const outputScript = address.toOutputScript(addr, network);
        console.log('Output script:', script.toASM(outputScript));
        return outputScript;
    } catch (e) {
        console.error('Invalid address:', e.message);
        return null;
    }
}

// Validate address for network
function validateAddress(addr: string, network = networks.bitcoin): boolean {
    try {
        // Try Base58Check
        const base58 = address.fromBase58Check(addr);
        return base58.version === network.pubKeyHash ||
               base58.version === network.scriptHash;
    } catch {
        try {
            // Try Bech32/Bech32m
            const bech32 = address.fromBech32(addr);
            return bech32.prefix === network.bech32 ||
                   bech32.prefix === network.bech32Opnet;
        } catch {
            return false;
        }
    }
}
```

---

## Types

```typescript
// 20-byte hash type
type Bytes20 = Uint8Array & { readonly length: 20 };

// Base58Check decode result
interface Base58CheckResult {
    readonly hash: Bytes20;
    readonly version: number;
}

// Bech32 decode result
interface Bech32Result {
    prefix: string;
    version: number;
    data: Uint8Array;
}

// toOutputScript options
interface ToOutputScriptOptions {
    readonly network?: Network;
    readonly onFutureSegwitWarning?: (warning: string) => void;
}
```

---

## See Also

- [Payments Documentation](./clients-bitcoin-payments.md) - Payment type implementations
- [Script Documentation](./clients-bitcoin-script.md) - Script building
- [Transaction Documentation](./clients-bitcoin-transaction.md) - Transaction building
