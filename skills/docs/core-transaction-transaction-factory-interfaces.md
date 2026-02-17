# Transaction Factory Interfaces

This guide documents the low-level transaction factory interfaces from `@btc-vision/transaction`. These interfaces provide fine-grained control over transaction construction for deployments, interactions, and funding transactions.

## Table of Contents

- [Overview](#overview)
- [Interface Hierarchy](#interface-hierarchy)
- [ITweakedTransactionData](#itweakedtransactiondata)
- [ITransactionParameters](#itransactionparameters)
- [IFundingTransactionParameters](#ifundingtransactionparameters)
- [IInteractionParameters](#iinteractionparameters)
- [IDeploymentParameters](#ideploymentparameters)
- [CallResult Transaction Methods](#callresult-transaction-methods)
- [Common Use Cases](#common-use-cases)
  - [Custom Fee Rate](#custom-fee-rate)
  - [Priority Fee](#priority-fee)
  - [Transaction Note/Memo](#transaction-notememo)
  - [Anchor Outputs](#anchor-outputs)
  - [Extra Outputs (Multiple Recipients)](#extra-outputs-multiple-recipients)
  - [Send-Max (Auto Adjust Amount)](#send-max-auto-adjust-amount)
  - [Separate Fee UTXOs](#separate-fee-utxos)
  - [Offline Signing](#offline-signing)
- [Best Practices](#best-practices)

---

## Overview

The `TransactionFactory` class in `@btc-vision/transaction` provides low-level transaction construction. While the high-level `TransactionParameters` interface in `opnet` covers most use cases, understanding these interfaces is essential for:

- Adding transaction notes/memos
- Using anchor outputs for CPFP
- Implementing send-max functionality
- Paying fees from separate UTXOs
- Advanced UTXO management
- Offline signing workflows

---

## Interface Hierarchy

```
ITweakedTransactionData (base)
    │
    ├── ITransactionParameters (adds fees, gas, note, anchor)
    │       │
    │       ├── IFundingTransactionParameters (adds amount, autoAdjustAmount, feeUtxos)
    │       │
    │       └── SharedInteractionParameters (adds calldata, challenge)
    │               │
    │               ├── IInteractionParameters (adds to, contract)
    │               │
    │               └── IDeploymentParameters (adds bytecode)
```

---

## ITweakedTransactionData

Base interface for all transaction types. Defines signing and network configuration.

```typescript
import type { QuantumBIP32Interface } from '@btc-vision/bip32';
import type { Network, Signer } from '@btc-vision/bitcoin';
import type { UniversalSigner } from '@btc-vision/ecpair';

interface ITweakedTransactionData {
    /** ML-DSA quantum-resistant signer (optional) */
    readonly mldsaSigner: QuantumBIP32Interface | null;

    /** ECDSA signer (required for most operations) */
    readonly signer: Signer | UniversalSigner;

    /** Bitcoin network (mainnet, testnet, regtest) */
    readonly network: Network;

    /** OPNet chain ID (optional) */
    readonly chainId?: ChainId;

    /** Non-witness UTXO data for legacy inputs */
    readonly nonWitnessUtxo?: Uint8Array;

    /** Skip signing (for unsigned PSBTs) */
    readonly noSignatures?: boolean;

    /** Custom unlock script */
    readonly unlockScript?: Uint8Array[];

    /** Transaction version (1, 2, or 3) */
    readonly txVersion?: SupportedTransactionVersion;

    /** Address rotation for per-UTXO signing */
    readonly addressRotation?: AddressRotationConfigBase;

    /** Parallel signing using worker threads */
    readonly parallelSigning?: SigningPoolLike | WorkerPoolConfig;
}

type SupportedTransactionVersion = 1 | 2 | 3;
```

---

## ITransactionParameters

Extends `ITweakedTransactionData` with fee, gas, and transaction options.

```typescript
import type { UTXO } from '@btc-vision/transaction';
import type { PsbtOutputExtended } from '@btc-vision/bitcoin';

interface ITransactionParameters extends ITweakedTransactionData {
    /** Sender address (optional override) */
    readonly from?: string;

    /** Recipient address */
    readonly to?: string;

    /** Enable fee debugging output */
    readonly debugFees?: boolean;

    /** Reveal ML-DSA public key in transaction features */
    readonly revealMLDSAPublicKey?: boolean;

    /** Link ML-DSA public key to legacy public key */
    readonly linkMLDSAPublicKeyToAddress?: boolean;

    /** UTXOs to spend */
    utxos: UTXO[];

    /** Non-witness UTXO data */
    nonWitnessUtxo?: Uint8Array;

    /** Pre-calculated estimated fees */
    estimatedFees?: bigint;

    /** Additional input UTXOs */
    optionalInputs?: UTXO[];

    /** Additional output addresses/values */
    optionalOutputs?: PsbtOutputExtended[];

    /** OPNet chain ID */
    chainId?: ChainId;

    /** Skip signing */
    noSignatures?: boolean;

    /** Transaction note/memo (OP_RETURN data) */
    readonly note?: string | Uint8Array;

    /** Create anchor output for CPFP */
    readonly anchor?: boolean;

    /** Bitcoin fee rate in sat/vB */
    readonly feeRate: number;

    /** Priority fee in satoshis */
    readonly priorityFee: bigint;

    /** Gas fee in satoshis */
    readonly gasSatFee: bigint;

    /** Pre-compiled target script */
    readonly compiledTargetScript?: Uint8Array | string;

    /** Address rotation configuration */
    readonly addressRotation?: AddressRotationConfigBase;
}
```

### Key Parameters Explained

| Parameter | Type | Description |
|-----------|------|-------------|
| `feeRate` | `number` | Bitcoin mining fee rate in satoshis per virtual byte (sat/vB) |
| `priorityFee` | `bigint` | Additional satoshis added to prioritize the transaction |
| `gasSatFee` | `bigint` | OPNet gas fee in satoshis |
| `note` | `string \| Uint8Array` | Arbitrary data embedded as OP_RETURN output |
| `anchor` | `boolean` | Creates an anchor output for Child-Pays-For-Parent (CPFP) |
| `optionalInputs` | `UTXO[]` | Extra UTXOs to include as inputs |
| `optionalOutputs` | `PsbtOutputExtended[]` | Extra outputs (e.g., paying multiple recipients) |

---

## IFundingTransactionParameters

For funding transactions (sending BTC). Extends `ITransactionParameters`.

```typescript
interface IFundingTransactionParameters extends ITransactionParameters {
    /** Amount to send in satoshis */
    amount: bigint;

    /** Split output into multiple UTXOs */
    splitInputsInto?: number;

    /**
     * Auto-deduct fees from amount (send-max).
     * When true, fees are subtracted from the output amount.
     * Useful for consolidation or sending entire balance.
     */
    autoAdjustAmount?: boolean;

    /**
     * Separate UTXOs used exclusively for fees.
     * When provided, the output amount stays exact and
     * fees are paid from these UTXOs instead.
     */
    feeUtxos?: UTXO[];
}
```

### Use Cases

| Parameter | Use Case |
|-----------|----------|
| `autoAdjustAmount: true` | Send entire balance (fees deducted from amount) |
| `feeUtxos` | Keep output amount exact by paying fees from separate UTXOs |
| `splitInputsInto` | Create multiple smaller UTXOs from one large one |

---

## IInteractionParameters

For contract interactions (calling methods). Extends `SharedInteractionParameters`.

```typescript
interface SharedInteractionParameters extends ITransactionParameters {
    /** Encoded method calldata */
    calldata?: Uint8Array;

    /** Disable automatic refund output */
    disableAutoRefund?: boolean;

    /** Challenge solution for epoch mining */
    readonly challenge: IChallengeSolution;

    /** Random bytes for deterministic operations */
    readonly randomBytes?: Uint8Array;

    /** Pre-loaded storage slots */
    readonly loadedStorage?: LoadedStorage;

    /** Mark as cancellation transaction */
    readonly isCancellation?: boolean;
}

interface IInteractionParameters extends SharedInteractionParameters {
    /** Encoded calldata (required) */
    readonly calldata: Uint8Array;

    /** Contract address (P2OP format) */
    readonly to: string;

    /** Contract address (hex format) */
    readonly contract?: string;
}
```

---

## IDeploymentParameters

For contract deployments. Similar to interaction but with bytecode.

```typescript
interface IDeploymentParameters extends Omit<ITransactionParameters, 'to'> {
    /** Contract bytecode (WASM) */
    readonly bytecode: Uint8Array;

    /** Constructor calldata */
    readonly calldata?: Uint8Array;

    /** Random bytes for deterministic deployment */
    readonly randomBytes?: Uint8Array;

    /** Challenge solution */
    readonly challenge: IChallengeSolution;
}
```

---

## CallResult Transaction Methods

The `CallResult` class provides high-level methods for signing and sending transactions:

```typescript
class CallResult<T, U> {
    /**
     * Sign transaction without broadcasting.
     * @param params - Transaction parameters
     * @param amountAddition - Extra satoshis for fee buffer
     * @returns Signed transaction data
     */
    async signTransaction(
        params: TransactionParameters,
        amountAddition?: bigint
    ): Promise<SignedInteractionTransactionReceipt>;

    /**
     * Sign and broadcast transaction.
     * @param params - Transaction parameters
     * @param amountAddition - Extra satoshis for fee buffer
     * @returns Transaction receipt with TX ID
     */
    async sendTransaction(
        params: TransactionParameters,
        amountAddition?: bigint
    ): Promise<InteractionTransactionReceipt>;

    /**
     * Broadcast a pre-signed transaction.
     * @param signedTx - Previously signed transaction
     * @returns Transaction receipt
     */
    async sendPresignedTransaction(
        signedTx: SignedInteractionTransactionReceipt
    ): Promise<InteractionTransactionReceipt>;

    /**
     * Serialize for offline signing.
     * @param refundAddress - Address to fetch UTXOs from
     * @param amount - Amount needed for transaction
     * @returns Buffer for transfer to offline device
     */
    async toOfflineBuffer(
        refundAddress: string,
        amount: bigint
    ): Promise<Buffer>;

    /**
     * Reconstruct from offline buffer.
     * @param input - Serialized buffer or hex string
     * @returns CallResult ready for offline signing
     */
    static fromOfflineBuffer(input: Buffer | string): CallResult;
}
```

---

## Common Use Cases

### Custom Fee Rate

```typescript
const simulation = await token.transfer(recipient, amount, new Uint8Array(0));

await simulation.sendTransaction({
    signer: wallet.keypair,
    mldsaSigner: wallet.mldsaKeypair,
    refundTo: wallet.p2tr,
    network: networks.regtest,
    maximumAllowedSatToSpend: 100000n,
    feeRate: 15,  // 15 sat/vB
});
```

### Priority Fee

```typescript
await simulation.sendTransaction({
    // ...base params
    feeRate: 10,
    priorityFee: 5000n,  // Additional 5,000 sats for faster confirmation
});
```

### Transaction Note/Memo

```typescript
await simulation.sendTransaction({
    // ...base params
    note: "Payment for invoice #12345",
});

// Or with binary data
await simulation.sendTransaction({
    // ...base params
    note: new Uint8Array([0x01, 0x02, 0x03]),
});
```

### Anchor Outputs

For Child-Pays-For-Parent (CPFP) scenarios:

```typescript
await simulation.sendTransaction({
    // ...base params
    anchor: true,  // Creates anchor output for fee bumping
});
```

### Extra Outputs (Multiple Recipients)

Pay multiple addresses in a single transaction:

```typescript
import { PsbtOutputExtended } from '@btc-vision/bitcoin';

const extraOutputs: PsbtOutputExtended[] = [
    { address: 'bcrt1q...recipient1', value: 5000 },
    { address: 'bcrt1q...recipient2', value: 3000 },
    { address: 'bcrt1q...treasury', value: 1000 },
];

await simulation.sendTransaction({
    // ...base params
    extraOutputs,
});
```

### Send-Max (Auto Adjust Amount)

Send entire balance by deducting fees from the amount:

```typescript
import { TransactionFactory, IFundingTransactionParameters } from '@btc-vision/transaction';

const factory = new TransactionFactory();

const params: IFundingTransactionParameters = {
    signer: wallet.keypair,
    mldsaSigner: null,
    network: networks.regtest,
    utxos: allUtxos,
    feeRate: 10,
    priorityFee: 0n,
    gasSatFee: 0n,
    amount: totalUtxoValue,  // Send everything
    autoAdjustAmount: true,  // Fees deducted from amount
    // ...other params
};

const tx = await factory.signFunding(params);
```

### Separate Fee UTXOs

Keep the output amount exact by paying fees from separate UTXOs:

```typescript
const params: IFundingTransactionParameters = {
    // ...base params
    amount: 100000n,  // Exact 100,000 sats
    feeUtxos: feeOnlyUtxos,  // These UTXOs pay the fees
};
```

### Offline Signing

```typescript
// ONLINE DEVICE: Prepare transaction
const simulation = await contract.transfer(recipient, amount, new Uint8Array(0));
const offlineBuffer = await simulation.toOfflineBuffer(wallet.p2tr, 50000n);

// Transfer buffer to offline device (file, QR code, etc.)
fs.writeFileSync('offline-tx.bin', offlineBuffer);

// OFFLINE DEVICE: Sign transaction
const buffer = fs.readFileSync('offline-tx.bin');
const reconstructed = CallResult.fromOfflineBuffer(buffer);

const signedTx = await reconstructed.signTransaction({
    signer: offlineWallet.keypair,
    mldsaSigner: offlineWallet.mldsaKeypair,
    refundTo: offlineWallet.p2tr,
    network: networks.regtest,
    maximumAllowedSatToSpend: 50000n,
});

// Transfer signedTx back to online device...

// ONLINE DEVICE: Broadcast
const receipt = await simulation.sendPresignedTransaction(signedTx);
console.log('TX ID:', receipt.transactionId);
```

---

## Best Practices

1. **Always Simulate First**: Check `simulation.revert` before sending

2. **Set Spending Limits**: Always set `maximumAllowedSatToSpend` to prevent accidents

3. **Use Priority Fee Sparingly**: Only add priority fee when time-sensitive

4. **Track UTXOs**: Update UTXO list after each transaction using `receipt.newUTXOs`

5. **Handle Congestion**: Check `provider.gasParameters()` for current fee recommendations

6. **Test on Regtest**: Verify all configurations on regtest before mainnet

---

## Next Steps

- [Sending Transactions](./core-opnet-contracts-sending-transactions.md) - High-level transaction guide
- [Transaction Configuration](./core-opnet-contracts-transaction-configuration.md) - TransactionParameters reference
- [Offline Signing](./core-opnet-contracts-offline-signing.md) - Detailed offline signing guide

---

[← Previous: Transaction Building](./core-transaction-transaction-building.md) | [Next: Offline Signing →](./core-transaction-offline-transaction-signing.md)
