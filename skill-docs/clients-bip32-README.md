# @btc-vision/bip32
[![Github CI](https://github.com/bitcoinjs/bip32/actions/workflows/main_ci.yml/badge.svg)](https://github.com/bitcoinjs/bip32/actions/workflows/main_ci.yml) [![NPM](https://img.shields.io/npm/v/bip32.svg)](https://www.npmjs.org/package/bip32) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

A [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) compatible library written in TypeScript with transpiled JavaScript committed to git.

**Now with quantum-resistant signatures using ML-DSA (FIPS 204)** - Supports ML-DSA-44, ML-DSA-65, and ML-DSA-87. See [BIP-360](https://bip360.org/) for the quantum resistance proposal.

## Table of Contents

- [Quantum-Resistant Features](#quantum-resistant-features)
- [Traditional BIP-32 Example](#traditional-bip-32-example)
- [Quantum-Resistant Example](#quantum-resistant-example)
- [Why Quantum Resistance?](#why-quantum-resistance)
- [Documentation](#documentation)
- [License](#license)

---

## Quantum-Resistant Features

This library now supports **quantum-resistant hierarchical deterministic key derivation** using **ML-DSA** (FIPS 204), aligned with [BIP-360](https://bip360.org/)'s vision for post-quantum Bitcoin.

### What is BIP-360?

[BIP-360](https://bip360.org/) is a proposal by Hunter Beast to introduce post-quantum cryptography into Bitcoin, addressing the quantum vulnerability of current Bitcoin addresses (especially Taproot and legacy coins).

### The Quantum Threat

- **Timeline**: Industry roadmaps from IBM, Google, Microsoft, Amazon, and Intel suggest ECDSA could be broken by quantum computers within **2-5 years**
- **Government Mandates**: US federal government mandates phasing out ECDSA cryptography by **2035**
- **Recent Developments**: Google's "Willow" chip and Microsoft's Majorana 1 chip demonstrate rapid quantum computing advancement
- **Bitcoin at Risk**: Current Bitcoin addresses are not quantum-resistant and require a comprehensive transition plan

### ML-DSA (Module-Lattice Digital Signature Algorithm)

- **Standard**: FIPS 204 (NIST Post-Quantum Cryptography)
- **Type**: Lattice-based cryptography (based on CRYSTALS-Dilithium)
- **Quantum Resistant**: Secure against both classical and quantum attacks
- **Security Levels**: Three levels supported:
  - **ML-DSA-44** (LEVEL2): 128-bit classical security - **Default**
  - **ML-DSA-65** (LEVEL3): 192-bit classical security
  - **ML-DSA-87** (LEVEL5): 256-bit classical security

### Key Sizes by Security Level

| Security Level | Private Key | Public Key | Signature | Base58 Export |
|----------------|-------------|------------|-----------|---------------|
| LEVEL2 (44) - Default | 2,560 bytes | 1,312 bytes | 2,420 bytes | ~3,563 chars |
| LEVEL3 (65) | 4,032 bytes | 1,952 bytes | 3,309 bytes | ~5,589 chars |
| LEVEL5 (87) | 4,896 bytes | 2,592 bytes | 4,627 bytes | ~6,804 chars |

### Key Features

- **Full BIP-32 Compatibility**: Uses standard hierarchical derivation paths (e.g., `m/360'/0'/0'/0/0`)
- **Multiple Security Levels**: Choose between LEVEL2, LEVEL3, or LEVEL5 based on your needs
- **Network Support**: Works with any Bitcoin network (mainnet, testnet, regtest, or custom networks like Litecoin)
- **Standard Version Bytes**: Uses each network's standard BIP32 version bytes - no custom quantum versions needed
- **Type-Safe API**: Use `MLDSASecurityLevel` enum for security levels
- **Deterministic**: Same seed always generates the same quantum keys
- **Future-Proof**: Meets post-2030 and post-2035 security requirements
- **Production-Ready**: Comprehensive test coverage (142 tests)
- **Built on Standards**: Uses `@btc-vision/post-quantum` for ML-DSA implementation

### Important Note: Key Derivation Differences

Unlike traditional ECDSA BIP-32:
- **Neutered (public-only) keys CANNOT derive children** - ML-DSA does not support public key derivation
- All derivations require the private key
- This is a fundamental property of lattice-based cryptography

---

## Traditional BIP-32 Example

### TypeScript

```typescript
import BIP32Factory from '@btc-vision/bip32';
import * as ecc from 'tiny-secp256k1';
import { BIP32Interface } from '@btc-vision/bip32';

// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc);

const node: BIP32Interface = bip32.fromBase58('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi');

const child: BIP32Interface = node.derivePath('m/0/0');
// ...
```

### NodeJS (CommonJS)

```javascript
const ecc = require('tiny-secp256k1');
const { BIP32Factory } = require('@btc-vision/bip32');

// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc);

const node = bip32.fromBase58('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi');

const child = node.derivePath('m/0/0');
```

---

## Quantum-Resistant Example

### TypeScript

```typescript
import {
  QuantumBIP32Factory,
  MLDSASecurityLevel,
  QuantumDerivationPath,
  BITCOIN,
  TESTNET
} from '@btc-vision/bip32';

// No ECC library needed - ML-DSA is built-in
const seed = Buffer.from('your-seed-here', 'hex');

// Create master quantum key (default: ML-DSA-44 / LEVEL2 on mainnet)
const master = QuantumBIP32Factory.fromSeed(seed);

// Or specify network and security level
const testnetKey = QuantumBIP32Factory.fromSeed(seed, TESTNET);
const masterLevel5 = QuantumBIP32Factory.fromSeed(seed, BITCOIN, MLDSASecurityLevel.LEVEL5);
const testnetLevel3 = QuantumBIP32Factory.fromSeed(seed, TESTNET, MLDSASecurityLevel.LEVEL3);

// Derive child using standard BIP-360 path
const child = master.derivePath(QuantumDerivationPath.STANDARD);

// Sign a transaction
const txHash = Buffer.from('...transaction hash...');
const signature = child.sign(txHash);

// Verify signature
const isValid = child.verify(txHash, signature);
console.log('Signature valid:', isValid);

// Export for backup (uses network's standard BIP32 version bytes)
const exported = child.toBase58();

// Import from backup (network and security level auto-detected from version bytes and key size)
const imported = QuantumBIP32Factory.fromBase58(exported);

// Network is preserved
console.log('Network:', imported.network.bech32); // 'bc' for mainnet, 'tb' for testnet
```

### NodeJS (CommonJS)

```javascript
const {
  QuantumBIP32Factory,
  MLDSASecurityLevel,
  QuantumDerivationPath,
  BITCOIN,
  TESTNET
} = require('@btc-vision/bip32');

const seed = Buffer.from('your-seed-here', 'hex');

// Default: ML-DSA-44 (LEVEL2) on mainnet
const master = QuantumBIP32Factory.fromSeed(seed);

// Or specify network and security level
const testnetKey = QuantumBIP32Factory.fromSeed(seed, TESTNET);
const masterLevel5 = QuantumBIP32Factory.fromSeed(seed, BITCOIN, MLDSASecurityLevel.LEVEL5);

const child = master.derivePath(QuantumDerivationPath.STANDARD);

const txHash = Buffer.from('...transaction hash...');
const signature = child.sign(txHash);
const isValid = child.verify(txHash, signature);
```

### Neutered (Watch-Only) Keys

```typescript
// Create public-only key for verification
const neutered = child.neutered();

// Can verify signatures
console.log(neutered.verify(txHash, signature)); // true

// Cannot sign (will throw error)
try {
  neutered.sign(txHash);
} catch (e) {
  console.log('Cannot sign with neutered key');
}

// IMPORTANT: Cannot derive children (ML-DSA limitation)
try {
  neutered.derive(0);
} catch (e) {
  console.log('Cannot derive from neutered key'); // Unlike ECDSA!
}
```

---

## Why Quantum Resistance?

### The Problem

Current Bitcoin uses **ECDSA (secp256k1)** for signatures, which is vulnerable to quantum attacks:

| Algorithm | Quantum Safe | Key Size | Signature Size | Year Standardized |
|-----------|-------------|----------|----------------|-------------------|
| ECDSA (secp256k1) | No | 32 bytes | 64-73 bytes | 1999 |
| ML-DSA-44 | Yes | 2,560 bytes | 2,420 bytes | 2024 (FIPS 204) |
| ML-DSA-65 | Yes | 4,032 bytes | 3,309 bytes | 2024 (FIPS 204) |
| ML-DSA-87 | Yes | 4,896 bytes | 4,627 bytes | 2024 (FIPS 204) |

### The Solution

**ML-DSA** (Module-Lattice Digital Signature Algorithm) is:
- **NIST Standardized**: FIPS 204, approved August 2024
- **Lattice-Based**: Security based on hard mathematical problems resistant to quantum attacks
- **Multiple Security Levels**: Choose between 128-bit, 192-bit, or 256-bit classical security
- **Battle-Tested**: Based on CRYSTALS-Dilithium (NIST PQC competition winner)

### BIP-360 Transition Plan

As stated on [bip360.org](https://bip360.org/):

> "A smooth and effective QR transition plan for Bitcoin could take several years to execute—with more prep time inevitably leading to better security outcomes."

**This library is part of that preparation**, providing:
1. **Deterministic quantum keys** from existing BIP-39 mnemonics
2. **Hierarchical derivation** compatible with existing wallet infrastructure
3. **Drop-in replacement** for traditional BIP-32 in quantum contexts
4. **Production-ready implementation** with comprehensive testing

### When to Use Quantum Keys

Use **ML-DSA** for:
- Long-term storage (10+ years)
- High-value transactions
- Future-proofing against quantum threats
- Compliance with post-2030/2035 requirements

Continue using **ECDSA** for:
- Current Bitcoin protocol (no consensus changes yet)
- Existing wallets and addresses
- Smaller transaction sizes

**Hybrid approach**: Maintain both traditional and quantum keys during the transition period.

### Choosing a Security Level

- **ML-DSA-44 (LEVEL2)** - Default, smallest keys, 128-bit classical security
  - Best for: Most applications, mobile wallets, general use
  - Equivalent to: AES-128, SHA-256 (first 128 bits)

- **ML-DSA-65 (LEVEL3)** - Balanced, 192-bit classical security
  - Best for: Enhanced security without extreme size increase
  - Equivalent to: AES-192

- **ML-DSA-87 (LEVEL5)** - Maximum security, 256-bit classical security
  - Best for: High-value assets, long-term storage, government/military
  - Equivalent to: AES-256, full SHA-256

---

## Documentation

- **[QUANTUM.md](./QUANTUM.md)** - Complete technical documentation for quantum features
- **[BIP-360](https://bip360.org/)** - Quantum-resistant Bitcoin proposal
- **[FIPS 204](https://csrc.nist.gov/pubs/fips/204/final)** - ML-DSA standard
- **[Example Code](./examples/quantum-example.mjs)** - Working quantum BIP-32 example

### API Documentation

Both traditional and quantum APIs available:

```typescript
// Traditional (requires ECC)
import { BIP32Factory } from '@btc-vision/bip32';

// Quantum (no ECC needed, supports ML-DSA-44, ML-DSA-65, ML-DSA-87)
import { QuantumBIP32Factory, MLDSASecurityLevel } from '@btc-vision/bip32';
```

Full API documentation in [QUANTUM.md](./QUANTUM.md).

---

## LICENSE [MIT](LICENSE)
A derivation (and extraction for modularity) of the `HDWallet`/`HDNode` written and tested by [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib) contributors since 2014.
