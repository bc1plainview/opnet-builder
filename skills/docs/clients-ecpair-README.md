# @btc-vision/ecpair

![Bitcoin](https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Overview

Universal Bitcoin signer library with branded types and a pluggable `CryptoBackend`. Written in TypeScript with zero CommonJS. Ships with a pure-JS backend (`@noble/curves`) and a legacy adapter for `tiny-secp256k1`.

> **What is ecpair?**
>
> `@btc-vision/ecpair` provides secp256k1 key management, ECDSA signing, BIP-340 Schnorr signing, Taproot-style key tweaking, and WIF import/export. It is designed for use with [`@btc-vision/bitcoin`](https://github.com/btc-vision/bitcoin) and the broader OPNet ecosystem, but works with any Bitcoin library that consumes standard key types.

> **Why branded types?**
>
> `PrivateKey`, `PublicKey`, `XOnlyPublicKey`, `Signature`, and other key types are nominal (branded) `Uint8Array` subtypes. This prevents accidentally passing a raw hash where a private key is expected, or mixing up compressed and x-only public keys. Mistakes are caught at compile time, not at runtime in production.

> **Why pluggable backends?**
>
> `CryptoBackend` is an interface. The library ships two implementations:
> - **`NobleBackend`**: pure JavaScript via `@noble/curves/secp256k1`, zero native dependencies
> - **`LegacyBackend`**: adapter for existing `tiny-secp256k1` installations (WASM or ASM.js)
>
> Swap backends without changing application code.

> **No hardcoded networks**
>
> The library does not ship Bitcoin, testnet, or regtest constants. Consumers must provide a `Network` object to every factory method. This keeps the library network-agnostic and avoids accidental mainnet usage in test environments.

## Installation

```bash
npm install @btc-vision/ecpair
```

Requires **Node.js >= 24.0.0**. The package is ESM-only (`"type": "module"`).

## Quick Start

```typescript
import {
  ECPairSigner,
  createNobleBackend,
  createPrivateKey,
  createMessageHash,
  verifyCryptoBackend,
} from '@btc-vision/ecpair';
import type { Network } from '@btc-vision/ecpair';

// Define your network
const bitcoin: Network = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bech32Opnet: 'op',
  bip32: { public: 0x0488b21e, private: 0x0488ade4 },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};

// Create backend and verify integrity
const backend = createNobleBackend();
verifyCryptoBackend(backend);

// Generate a random signer (FIPS 186-5 B.4.2 key generation)
const signer = ECPairSigner.makeRandom(backend, bitcoin);
console.log(signer.toWIF());

// Sign and verify
const hash = createMessageHash(new Uint8Array(32));
const sig = signer.sign(hash);
console.log(signer.verify(hash, sig)); // true

// Schnorr (BIP-340)
const schnorrSig = signer.signSchnorr(hash);
console.log(signer.verifySchnorr(hash, schnorrSig)); // true
```

## API Comparison

| Old API (v3)                        | New API (v4)                                                    |
|-------------------------------------|-----------------------------------------------------------------|
| `ECPairFactory(tinysecp)`           | `createNobleBackend()` or `createLegacyBackend(tinysecp)`       |
| `ECPair.makeRandom()`              | `ECPairSigner.makeRandom(backend, network)`                     |
| `ECPair.fromPrivateKey(buf, opts)` | `ECPairSigner.fromPrivateKey(backend, privateKey, network)`     |
| `ECPair.fromPublicKey(buf, opts)`  | `ECPairSigner.fromPublicKey(backend, publicKey, network)`       |
| `ECPair.fromWIF(str, network)`     | `ECPairSigner.fromWIF(backend, str, network)`                   |
| `keyPair.network` (optional)        | `signer.network` (always set, required parameter)               |
| `{ network }` in options            | Separate `network` parameter on every factory method             |
| `Set<SignerCapability>`             | `number` bitmask of `SignerCapability` flags                     |

## Usage

### Import from WIF

```typescript
const signer = ECPairSigner.fromWIF(backend, 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn', bitcoin);
console.log(signer.compressed); // true
console.log(signer.toWIF());
```

### From raw private key

```typescript
const signer = ECPairSigner.fromPrivateKey(
  backend,
  createPrivateKey(new Uint8Array(32).fill(1)),
  bitcoin,
);
```

### Public-key-only signer (verify only, cannot sign)

```typescript
import { createPublicKey } from '@btc-vision/ecpair';

const pubOnly = ECPairSigner.fromPublicKey(backend, createPublicKey(pubKeyBytes), bitcoin);
console.log(pubOnly.privateKey); // undefined
console.log(pubOnly.verify(hash, sig)); // true
```

### Taproot-style tweaking

```typescript
import type { Bytes32 } from '@btc-vision/ecpair';

const tweakScalar = new Uint8Array(32).fill(2) as Bytes32;
const tweaked = signer.tweak(tweakScalar);
console.log(tweaked.toWIF());
```

### Legacy backend (tiny-secp256k1)

```typescript
import { createLegacyBackend } from '@btc-vision/ecpair';
import type { TinySecp256k1Interface } from '@btc-vision/ecpair';
import * as tinysecp from 'tiny-secp256k1';

const legacy = createLegacyBackend(tinysecp as unknown as TinySecp256k1Interface);
const kp = ECPairSigner.makeRandom(legacy, bitcoin);
```

### Custom RNG

```typescript
import { randomBytes } from 'node:crypto';

const kp = ECPairSigner.makeRandom(backend, bitcoin, {
  rng: (size: number) => new Uint8Array(randomBytes(size).buffer),
});
```

The `rng` function receives 48 bytes (FIPS 186-5 seed length) and must return exactly `size` bytes.

### Multiple networks

```typescript
const testnet: Network = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'tb',
  bech32Opnet: 'opt',
  bip32: { public: 0x043587cf, private: 0x04358394 },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

// fromWIF accepts an array of candidate networks
const kp = ECPairSigner.fromWIF(backend, wifString, [bitcoin, testnet]);
console.log(kp.network === bitcoin); // true if mainnet WIF
```

### Capabilities

```typescript
import { SignerCapability } from '@btc-vision/ecpair';

const kp = ECPairSigner.makeRandom(backend, bitcoin);

if (kp.capabilities & SignerCapability.SchnorrSign) {
  console.log('Schnorr signing available');
}

// Or use the convenience method
kp.hasCapability(SignerCapability.EcdsaSign);      // true
kp.hasCapability(SignerCapability.PrivateKeyExport); // true
```

### WIF encode/decode (standalone)

```typescript
import { encodeWIF, decodeWIF, createPrivateKey } from '@btc-vision/ecpair';

const wif = encodeWIF(createPrivateKey(keyBytes), true, bitcoin);
const decoded = decodeWIF(wif, bitcoin);
// decoded.privateKey, decoded.compressed, decoded.network
```

## Documentation

Visit our [API documentation](https://btc-vision.github.io/ecpair/) generated by TypeDoc.

## Running Tests

```bash
npm test
npm run lint
npm run lint:tests
npm run format:ci
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Reporting Issues

- **Bugs**: Open an [issue](https://github.com/btc-vision/ecpair/issues)
- **Security**: See [SECURITY.md](./SECURITY.md) - do not open public issues for vulnerabilities

## License

[MIT](./LICENSE)

## Links

- [GitHub](https://github.com/btc-vision/ecpair)
- [npm](https://www.npmjs.com/package/@btc-vision/ecpair)
- [OPNet](https://opnet.org)
- [@btc-vision/bitcoin](https://github.com/btc-vision/bitcoin)
