# P2OP Addresses (Pay-to-OPNet)

P2OP (Pay-to-OPNet) addresses are quantum-resistant addresses used in the OPNet ecosystem for identifying contracts and users with ML-DSA (Module-Lattice-based Digital Signature Algorithm) key support.

## Overview

P2OP addresses are designed for:

- **Quantum resistance**: Derived from ML-DSA public keys
- **OPNet contract identification**: Standard address format for deployed contracts
- **User identification**: Alternative to P2TR for quantum-safe user addresses
- **Future-proofing**: Prepared for post-quantum cryptographic migration

## Technical Specification

### Address Structure

P2OP addresses use:

| Component | Value | Description |
|-----------|-------|-------------|
| Witness Version | 16 (OP_16) | Custom OPNet witness version |
| Witness Program | 21 bytes | Version byte + HASH160(ML-DSA pubkey hash) |
| Encoding | Bech32m | Standard Bitcoin address encoding |

### Derivation Process

```
ML-DSA Public Key (2592 bytes for ML-DSA-65)
         ↓
    SHA256 hash
         ↓
   32-byte address (internal representation)
         ↓
    HASH160
         ↓
   20-byte hash
         ↓
   Prepend version byte (0x00)
         ↓
   21-byte witness program
         ↓
   OP_16 + witness program
         ↓
   Bech32m encode
         ↓
   P2OP address (e.g., bc1s...)
```

### Implementation

```typescript
import { script, opcodes, payments } from '@btc-vision/bitcoin';
import { hash160 } from '@btc-vision/bitcoin/crypto';

function generateP2OP(
    mldsaPublicKeyHash: Uint8Array,  // 32-byte SHA256 of ML-DSA pubkey
    network: Network,
    deploymentVersion: number = 0
): string {
    // Create witness program: version byte + HASH160
    const witnessProgram = Buffer.concat([
        Buffer.from([deploymentVersion]),
        hash160(Buffer.from(mldsaPublicKeyHash))
    ]);

    // Validate length (must be 2-40 bytes per BIP-141)
    if (witnessProgram.length < 2 || witnessProgram.length > 40) {
        throw new Error('Witness program must be 2-40 bytes');
    }

    // Create output script: OP_16 <witnessProgram>
    const scriptData = script.compile([
        opcodes.OP_16,
        witnessProgram
    ]);

    // Encode as bech32m address
    return payments.fromOutputScript(scriptData, network);
}
```

## Usage

### Generating P2OP Address from Wallet

```typescript
import { Mnemonic, MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks } from '@btc-vision/bitcoin';

// Create wallet from mnemonic with ML-DSA support
const mnemonic = new Mnemonic(
    'your twelve word mnemonic phrase here',
    '',  // passphrase
    MLDSASecurityLevel.MLDSA65  // Security level
);

// Derive account
const wallet = mnemonic.derive(0);

// Get P2OP address
const p2opAddress = wallet.address.p2op(networks.bitcoin);
// Example: bc1s...
```

### Address Class Method

```typescript
import { Address } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

// From existing Address object
const address = Address.fromString(mldsaPublicKeyHex, legacyPublicKeyHex);
const p2op = address.p2op(networks.bitcoin);
```

### Contract Addresses

Contract addresses in OPNet are also P2OP addresses derived from the deployment parameters:

```typescript
import { ContractAddress } from '@btc-vision/transaction';

// Generate contract address from deployment
const contractAddress = ContractAddress.fromDeployment(
    deployerAddress,
    bytecodeHash,
    salt,
    network
);

const p2opContractAddress = contractAddress.p2op(network);
```

## Address Validation

### Checking Valid P2OP Address

```typescript
import { AddressVerificator } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

const isValid = AddressVerificator.isValidP2OPAddress(
    'bc1s...',  // address to validate
    networks.bitcoin
);
```

### Validation Rules

A valid P2OP address must:

1. Use bech32m encoding
2. Have witness version 16 (prefix varies by network)
3. Have witness program length of 21 bytes
4. Start with correct prefix for network:
   - Mainnet: `bc1s...`
   - Testnet: `tb1s...`
   - Regtest: `bcrt1s...`

## Network Prefixes

| Network | Prefix | Example |
|---------|--------|---------|
| Mainnet | `bc1s` | `bc1sqwerty...` |
| Testnet | `tb1s` | `tb1sqwerty...` |
| Regtest | `bcrt1s` | `bcrt1sqwerty...` |

## Comparison with Other Address Types

| Feature | P2OP | P2TR | P2WDA |
|---------|------|------|-------|
| Witness Version | 16 | 1 | 0 |
| Quantum Resistant | Yes | No | Yes |
| Key Type | ML-DSA | Schnorr | ML-DSA |
| Purpose | OPNet identity | Standard Taproot | Delayed spending |
| Address Size | ~62 chars | ~62 chars | ~62 chars |

## Security Considerations

### Quantum Resistance

P2OP addresses derive from ML-DSA public keys, which are believed to be resistant to quantum computer attacks. The underlying ML-DSA algorithm is:

- NIST standardized (FIPS 204)
- Based on module lattice problems
- Security levels: ML-DSA-44, ML-DSA-65, ML-DSA-87

### Key Management

1. **Store ML-DSA keys securely**: They are larger than classical keys
2. **Backup seed phrases**: Same mnemonic can regenerate ML-DSA keys
3. **Use appropriate security level**: ML-DSA-65 recommended for most uses

### Address Reuse

Like all Bitcoin addresses, P2OP addresses should ideally not be reused to maximize privacy. However, for contract addresses, reuse is inherent to the protocol.

## Integration Examples

### Frontend: Display User's P2OP Address

```typescript
import { Address } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

function UserAddress({ publicKey }: { publicKey: string }) {
    const address = Address.fromString(publicKey);
    const p2opAddress = address.p2op(networks.bitcoin);
    const p2trAddress = address.p2tr(networks.bitcoin);

    return (
        <div>
            <p>P2OP (Quantum): {p2opAddress}</p>
            <p>P2TR (Classical): {p2trAddress}</p>
        </div>
    );
}
```

### Backend: Validate Contract Target

```typescript
import { AddressVerificator } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

function validateContractAddress(address: string): boolean {
    // OPNet contracts use P2OP addresses
    return AddressVerificator.isValidP2OPAddress(address, networks.bitcoin);
}
```

## Related Documentation

- [P2WDA Addresses](./P2WDA.md) - Time-locked quantum addresses
- [Quantum Support](../quantum-support/README.md) - Full quantum cryptography guide
- [Address Generation](../quantum-support/03-address-generation.md) - Complete address derivation
- [BIP32 Library](../../../clients/bip32/README.md) - Key derivation with ML-DSA
