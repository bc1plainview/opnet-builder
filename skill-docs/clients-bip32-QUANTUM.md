# Quantum-Resistant BIP32 with ML-DSA

This library provides quantum-resistant hierarchical deterministic key derivation using **ML-DSA** (FIPS 204) - a lattice-based digital signature algorithm. Supports three security levels:
- **ML-DSA-44** (LEVEL2): 128-bit classical security - **Default**
- **ML-DSA-65** (LEVEL3): 192-bit classical security
- **ML-DSA-87** (LEVEL5): 256-bit classical security

## Overview

### The Challenge with ML-DSA and BIP-32

Traditional BIP-32 uses HMAC-SHA512 to derive 256-bit private keys for elliptic curve cryptography (like secp256k1). However, ML-DSA doesn't use simple 256-bit scalars as private keys. Instead, ML-DSA private keys contain polynomial vectors and matrices in the Dilithium lattice structure (size varies by security level: 2560-4896 bytes).

### Our Solution

We use BIP-32 for **hierarchical seed derivation**, then use that seed for ML-DSA's native key generation:

```
1. Standard BIP-32: mnemonic → seed → HMAC-SHA512 chain → child seeds
2. At derivation path: Take the 256-bit output (IL)
3. Use as entropy for ML-DSA: ml_dsa.keygen(IL)
4. Produces proper ML-DSA keypair (sizes vary by security level)
```

This maintains the critical property that **the same mnemonic always generates the same quantum keys** while respecting ML-DSA's mathematical requirements.

## Features

- ✅ **Quantum-Resistant**: ML-DSA provides post-quantum security
- ✅ **Multiple Security Levels**: Choose between LEVEL2 (44), LEVEL3 (65), or LEVEL5 (87)
- ✅ **Network Support**: Works with any Bitcoin network (mainnet, testnet, regtest, Litecoin, Dogecoin, custom networks)
- ✅ **Standard Version Bytes**: Uses each network's standard BIP32 version bytes - quantum keys distinguished by size, not version
- ✅ **Type-Safe Enums**: Use `MLDSASecurityLevel` enum for security levels
- ✅ **Standard Derivation Paths**: Use `QuantumDerivationPath` enum for paths
- ✅ **BIP-32 Compatible**: Uses standard BIP-32 hierarchical derivation paths
- ✅ **Deterministic**: Same seed always produces same keys
- ✅ **Full API**: keygen, sign, verify, derive, export/import
- ✅ **142 Tests**: Comprehensive test coverage including network support

## Installation

```bash
npm install @btc-vision/bip32
```

## Usage

### Basic Example

```typescript
import {
  QuantumBIP32Factory,
  MLDSASecurityLevel,
  QuantumDerivationPath,
  BITCOIN,
  TESTNET,
  Network,
} from '@btc-vision/bip32';
import { randomBytes } from 'crypto';

// 1. Create master key from seed (use BIP39 mnemonic in production)
const seed = randomBytes(32);

// Default: ML-DSA-44 (LEVEL2) on mainnet
const master = QuantumBIP32Factory.fromSeed(seed);

// Or specify network and/or security level
const testnetKey = QuantumBIP32Factory.fromSeed(seed, TESTNET);
const mainnetHighSec = QuantumBIP32Factory.fromSeed(seed, BITCOIN, MLDSASecurityLevel.LEVEL5);
const testnetLevel3 = QuantumBIP32Factory.fromSeed(seed, TESTNET, MLDSASecurityLevel.LEVEL3);

// 2. Derive child key using standard path enum
const child = master.derivePath(QuantumDerivationPath.STANDARD);

// 3. Sign a message
const message = new TextEncoder().encode('Hello, quantum world!');
const signature = child.sign(message);

// 4. Verify signature
const isValid = child.verify(message, signature);
console.log('Valid:', isValid); // true
```

### Key Derivation

```typescript
// Hardened derivation (recommended for quantum keys)
const account = master.deriveHardened(360);
const chain = account.deriveHardened(0);
const address = chain.deriveHardened(0);

// Or use path notation with enum
const key = master.derivePath(QuantumDerivationPath.STANDARD);

// Or use a custom path
const customKey = master.derivePath("m/360'/0'/0'/0/0");
```

### Network Support

Quantum keys work with **any Bitcoin-compatible network** using standard BIP32 version bytes:

```typescript
import { BITCOIN, TESTNET, REGTEST, Network } from '@btc-vision/bip32';

// Mainnet (default)
const mainnet = QuantumBIP32Factory.fromSeed(seed, BITCOIN);
console.log(mainnet.network.bech32); // 'bc'

// Testnet
const testnet = QuantumBIP32Factory.fromSeed(seed, TESTNET);
console.log(testnet.network.bech32); // 'tb'

// Regtest
const regtest = QuantumBIP32Factory.fromSeed(seed, REGTEST);
console.log(regtest.network.bech32); // 'bcrt'

// Custom network (e.g., Litecoin)
const LITECOIN: Network = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

const ltcKey = QuantumBIP32Factory.fromSeed(seed, LITECOIN);
console.log(ltcKey.network.bech32); // 'ltc'

// Network is preserved through derivation
const child = ltcKey.derivePath(QuantumDerivationPath.STANDARD);
console.log(child.network.bech32); // Still 'ltc'
```

**Key Points:**
- Quantum keys use the **network's standard BIP32 version bytes** (e.g., `xprv`/`xpub` for Bitcoin mainnet)
- Security level is detected from the **key size** when importing
- Network is **preserved** through child key derivation
- Works with **any network** that follows the BIP32 `Network` interface

### Export/Import Keys

```typescript
// Export to base58 (uses network's version bytes)
const exported = child.toBase58();
console.log('Exported:', exported); // ~3563-6804 chars depending on security level

// Import from base58 (network and security level auto-detected)
const imported = QuantumBIP32Factory.fromBase58(exported);
console.log('Network:', imported.network.bech32); // Preserved
console.log('Security:', imported.securityLevel); // Auto-detected from key size

// Verify it works
const sig = imported.sign(message);
console.log('Works:', child.verify(message, sig)); // true
```

### Neutered (Public-Only) Keys

```typescript
// Create public-only key (cannot sign)
const publicOnly = child.neutered();

console.log('Is neutered:', publicOnly.isNeutered()); // true
console.log('Can verify:', publicOnly.verify(message, signature)); // true

try {
  publicOnly.sign(message); // Throws error
} catch (e) {
  console.log('Cannot sign with neutered key');
}
```

## API Reference

### `QuantumBIP32Factory`

Factory for creating quantum-resistant BIP32 keys.

#### Methods

##### `fromSeed(seed: Uint8Array, network?: Network, securityLevel?: MLDSASecurityLevel): QuantumBIP32Interface`

Create master key from seed (16-64 bytes).

**Parameters:**
- `seed`: Seed bytes (16-64 bytes, typically 32 from BIP39)
- `network`: Optional network (defaults to Bitcoin mainnet)
- `securityLevel`: Optional security level (defaults to LEVEL2/ML-DSA-44)

```typescript
const seed = randomBytes(32);

// Default: mainnet, LEVEL2
const master = QuantumBIP32Factory.fromSeed(seed);

// Specify network
const testnet = QuantumBIP32Factory.fromSeed(seed, TESTNET);

// Specify both network and security level
const secure = QuantumBIP32Factory.fromSeed(seed, BITCOIN, MLDSASecurityLevel.LEVEL5);
```

##### `fromBase58(encoded: string): QuantumBIP32Interface`

Import key from base58-encoded string.

```typescript
const imported = QuantumBIP32Factory.fromBase58(exported);
```

##### `fromPublicKey(publicKey: Uint8Array, chainCode: Uint8Array): QuantumBIP32Interface`

Create key from public key (2592 bytes) and chain code (32 bytes).

```typescript
const key = QuantumBIP32Factory.fromPublicKey(publicKey, chainCode);
```

##### `fromPrivateKey(privateKey: Uint8Array, chainCode: Uint8Array): QuantumBIP32Interface`

Create key from private key (4896 bytes) and chain code (32 bytes).

```typescript
const key = QuantumBIP32Factory.fromPrivateKey(privateKey, chainCode);
```

### `QuantumBIP32Interface`

Quantum-resistant hierarchical deterministic key.

#### Properties

- `publicKey: Uint8Array` - Public key (2592 bytes)
- `privateKey?: Uint8Array` - Private key (4896 bytes, undefined if neutered)
- `chainCode: Uint8Array` - Chain code for derivation (32 bytes)
- `depth: number` - Depth in derivation hierarchy
- `index: number` - Child index
- `parentFingerprint: number` - Parent key fingerprint
- `identifier: Uint8Array` - Key identifier (hash160 of public key)
- `fingerprint: Uint8Array` - First 4 bytes of identifier

#### Methods

##### `sign(message: Uint8Array): Uint8Array`

Sign a message using ML-DSA-87. Returns signature (4627 bytes).

```typescript
const signature = key.sign(message);
```

##### `verify(message: Uint8Array, signature: Uint8Array): boolean`

Verify an ML-DSA-87 signature.

```typescript
const isValid = key.verify(message, signature);
```

##### `derive(index: number): QuantumBIP32Interface`

Derive child key at index (use >= 0x80000000 for hardened).

```typescript
const child = key.derive(0x80000000); // Hardened
const normal = key.derive(0); // Normal
```

##### `deriveHardened(index: number): QuantumBIP32Interface`

Derive hardened child key.

```typescript
const child = key.deriveHardened(360);
```

##### `derivePath(path: string): QuantumBIP32Interface`

Derive using BIP32 path notation. Use `QuantumDerivationPath` enum for standard paths.

```typescript
// Using enum (recommended)
const child = key.derivePath(QuantumDerivationPath.STANDARD);

// Or custom path
const customChild = key.derivePath("m/360'/0'/0'/0/0");
```

##### `isNeutered(): boolean`

Check if key is neutered (public-only).

```typescript
const isPublicOnly = key.isNeutered();
```

##### `neutered(): QuantumBIP32Interface`

Create neutered version (removes private key).

```typescript
const publicKey = key.neutered();
```

##### `toBase58(): string`

Export to base58-encoded string (~6753 chars).

```typescript
const exported = key.toBase58();
```

## Security Levels and Key Sizes

ML-DSA supports three NIST security levels, selectable via the `MLDSASecurityLevel` enum:

```typescript
enum MLDSASecurityLevel {
  LEVEL2 = 44,  // ML-DSA-44 (default)
  LEVEL3 = 65,  // ML-DSA-65
  LEVEL5 = 87,  // ML-DSA-87
}
```

### Key Sizes by Security Level

| Security Level | Private Key | Public Key | Signature | Base58 Export |
|----------------|-------------|------------|-----------|---------------|
| LEVEL2 (44) **Default** | 2,560 bytes | 1,312 bytes | 2,420 bytes | ~3,563 chars |
| LEVEL3 (65) | 4,032 bytes | 1,952 bytes | 3,309 bytes | ~5,589 chars |
| LEVEL5 (87) | 4,896 bytes | 2,592 bytes | 4,627 bytes | ~6,804 chars |

**Common Components:**
- Chain Code: 32 bytes (all levels)
- Seed: 32 bytes (all levels)

### Choosing a Security Level

- **LEVEL2 (ML-DSA-44)** - Default, smallest keys, 128-bit classical security
  - Best for: Most applications, mobile wallets, general use
  - Equivalent to: AES-128, SHA-256 (first 128 bits)

- **LEVEL3 (ML-DSA-65)** - Balanced, 192-bit classical security
  - Best for: Enhanced security without extreme size increase
  - Equivalent to: AES-192

- **LEVEL5 (ML-DSA-87)** - Maximum security, 256-bit classical security
  - Best for: High-value assets, long-term storage, government/military
  - Equivalent to: AES-256, full SHA-256

## Security Considerations

### Level 5 Security

ML-DSA-87 provides **Category 5 security** according to NIST, which is equivalent to:
- 256-bit classical security
- AES-256 strength
- Quantum security against Grover's algorithm

### Recommended Derivation Path

We recommend using the `QuantumDerivationPath` enum for quantum keys:

```typescript
// Using the standard quantum path (recommended)
const quantum = master.derivePath(QuantumDerivationPath.STANDARD);

// Available enum values:
// - QuantumDerivationPath.STANDARD (m/360'/0'/0'/0/0)
// - QuantumDerivationPath.CHANGE (m/360'/0'/0'/1/0)
// - QuantumDerivationPath.ACCOUNT_0_ADDRESS_0 (m/360'/0'/0'/0/0)
// - QuantumDerivationPath.ACCOUNT_0_ADDRESS_1 (m/360'/0'/0'/0/1)
// - QuantumDerivationPath.ACCOUNT_1_ADDRESS_0 (m/360'/1'/0'/0/0)
```

The `360'` coin type is chosen to avoid conflicts with existing BIP-44 coin types while being memorable.

### Hardened Derivation

**Always use hardened derivation** for quantum keys to prevent chain code attacks:

```typescript
// Good: All hardened (using enum)
const good = master.derivePath(QuantumDerivationPath.STANDARD);

// Or manually with all hardened indices
const goodManual = master.derivePath("m/360'/0'/0'/0'");

// Risky: Non-hardened at end
const risky = master.derivePath("m/360'/0'/0'/0");
```

### Entropy Requirements

The @btc-vision/post-quantum library has enhanced security:
- Requires 32 bytes of seed for key generation
- Validates entropy quality during signing
- Uses `extraEntropy` parameter for additional randomness

## Implementation Details

### Key Generation Flow

1. **Seed → HMAC-SHA512**:
   ```
   I = HMAC-SHA512("Bitcoin seed", seed)
   IL = I[0:32]   // 256-bit entropy
   IR = I[32:64]  // Chain code
   ```

2. **ML-DSA-87 KeyGen**:
   ```
   keypair = ml_dsa87.keygen(IL)
   privateKey = keypair.secretKey  // 4896 bytes
   publicKey = keypair.publicKey    // 2592 bytes
   ```

3. **Child Derivation**:
   ```
   For hardened: data = 0x00 || hash256(privateKey) || index
   For normal:   data = hash256(publicKey) || index

   I = HMAC-SHA512(chainCode, data)
   IL = I[0:32]   // New seed
   IR = I[32:64]  // New chain code

   child_keypair = ml_dsa87.keygen(IL)
   ```

### Why Hash the Keys for Derivation?

ML-DSA-87 keys are too large to use directly in HMAC-SHA512:
- Private key: 4896 bytes
- Public key: 2592 bytes

We hash them to 32 bytes before using in the HMAC chain. This maintains security while enabling BIP-32 compatibility.

## Comparison with Traditional BIP-32

| Feature | Traditional BIP-32 | Quantum BIP-32 |
|---------|-------------------|----------------|
| Algorithm | ECDSA (secp256k1) | ML-DSA-87 |
| Private Key | 32 bytes | 4896 bytes |
| Public Key | 33 bytes | 2592 bytes |
| Signature | 64-73 bytes | 4627 bytes |
| Quantum Safe | ❌ No | ✅ Yes |
| Security Level | ~128-bit | 256-bit |
| Speed | Very Fast | Normal |

## Example: Complete Workflow

```typescript
import {
  QuantumBIP32Factory,
  MLDSASecurityLevel,
  QuantumDerivationPath
} from '@btc-vision/bip32';
import { randomBytes } from 'crypto';

// 1. Generate seed (in production, use BIP39)
const seed = randomBytes(32);

// 2. Create master key (default: ML-DSA-44 / LEVEL2)
const master = QuantumBIP32Factory.fromSeed(seed);
console.log('Master created');
console.log('  Public key:', master.publicKey.length, 'bytes');
console.log('  Private key:', master.privateKey.length, 'bytes');

// 3. Derive account key using enum
const account = master.derivePath(QuantumDerivationPath.STANDARD);
console.log('\nAccount key derived');
console.log('  Depth:', account.depth);
console.log('  Index:', account.index);

// 4. Sign transaction
const txHash = randomBytes(32);
const signature = account.sign(txHash);
console.log('\nTransaction signed');
console.log('  Signature size:', signature.length, 'bytes');

// 5. Verify signature
const isValid = account.verify(txHash, signature);
console.log('  Valid:', isValid);

// 6. Export for backup
const exported = account.toBase58();
console.log('\nExported for backup');
console.log('  Length:', exported.length, 'chars');

// 7. Import from backup
const imported = QuantumBIP32Factory.fromBase58(exported);
const sig2 = imported.sign(txHash);
console.log('\nImported and verified');
console.log('  Still works:', account.verify(txHash, sig2));

// 8. Create public-only key for verification
const publicOnly = account.neutered();
console.log('\nPublic-only key created');
console.log('  Can verify:', publicOnly.verify(txHash, signature));
console.log('  Is neutered:', publicOnly.isNeutered());
```

## Running the Example

```bash
node examples/quantum-example.mjs
```

## Technical Background

### ML-DSA-87 (FIPS 204)

ML-DSA-87 (Module-Lattice-Based Digital Signature Algorithm) is the standardized version of CRYSTALS-Dilithium, one of the NIST Post-Quantum Cryptography competition winners.

**Security basis**: Hardness of lattice problems (LWE, SIS)
**Parameter set**: 87 (Level 5 security)
**Standard**: FIPS 204
**Quantum resistance**: Yes, secure against both classical and quantum attacks

### Why Level 5?

NIST defines security categories:
- **Category 1**: ~AES-128 (~128-bit)
- **Category 3**: ~AES-192 (~192-bit)
- **Category 5**: ~AES-256 (~256-bit)

We use ML-DSA-87 (Category 5) to match the security level of:
- SHA-256
- AES-256
- Modern security requirements

Australian ASD requires Category 5 for government use after 2030.

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions welcome! Please ensure:
- All tests pass: `npm test`
- Code is formatted: `npm run format`
- Build succeeds: `npm run build`

## Acknowledgments

Built on top of:
- [@btc-vision/post-quantum](https://www.npmjs.com/package/@btc-vision/post-quantum) - ML-DSA-87 implementation
- [noble-hashes](https://github.com/paulmillr/noble-hashes) - Cryptographic hashing
- Original BIP-32 library by Daniel Cousens

## References

- [FIPS 204: ML-DSA](https://csrc.nist.gov/pubs/fips/204/final)
- [BIP-32: Hierarchical Deterministic Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [NIST IR 8547: Transition to Post-Quantum Cryptography](https://nvlpubs.nist.gov/nistpubs/ir/2024/NIST.IR.8547.ipd.pdf)
- [CRYSTALS-Dilithium](https://www.pq-crystals.org/dilithium/)
