# OPNet Contract Development Guidelines

**Read `setup-guidelines.md` FIRST for project setup and package versions.**

This document covers contract code patterns, storage, SafeMath, and common mistakes.

---

## Table of Contents

1. [TypeScript Law (MANDATORY)](#typescript-law-mandatory)
2. [Mandatory Reading Order](#mandatory-reading-order)
3. [Contract Entry Point](#contract-entry-point)
4. [Contract Class Patterns](#contract-class-patterns)
5. [Storage and Pointers](#storage-and-pointers)
6. [u256 and SafeMath](#u256-and-safemath)
7. [Common Imports](#common-imports)
8. [Gas Optimization](#gas-optimization)
9. [Common Contract Mistakes](#common-contract-mistakes)

---

## TypeScript Law (MANDATORY)

**BEFORE WRITING ANY CONTRACT CODE, YOU MUST READ AND FOLLOW:**

`docs/core-typescript-law-CompleteLaw.md`

**The TypeScript Law is NON-NEGOTIABLE.** Every line of code must comply. Violations lead to exploitable, broken code.

### Key Rules for Contracts

| FORBIDDEN | WHY | USE INSTEAD |
|-----------|-----|-------------|
| `any` | Runtime bugs, defeats type checking | Proper types, generics |
| Raw arithmetic (`+`, `-`, `*`) on u256 | Overflow/underflow | `SafeMath.add()`, `SafeMath.sub()`, etc. |
| `while` loops | Unbounded gas consumption | Bounded `for` loops |
| Iterating all map keys | O(n) gas explosion | Indexed lookups, stored aggregates |
| Unbounded arrays | Grows forever | Cap size, use pagination |
| Section separator comments | Lazy, unprofessional | TSDoc for every method |

**Read the full TypeScript Law before proceeding.**

---

## Mandatory Reading Order

**This guideline is a SUMMARY. You MUST read the following docs files IN ORDER before writing contract code:**

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules (applies to AssemblyScript too) |
| 2 | `guidelines/setup-guidelines.md` | Package versions, asconfig.json |
| 3 | `guidelines/contracts-guidelines.md` | This file - summary of patterns |
| 4 | `docs/contracts-btc-runtime-README.md` | Runtime overview |
| 5 | `docs/contracts-btc-runtime-getting-started-installation.md` | Setup |
| 6 | `docs/contracts-btc-runtime-getting-started-first-contract.md` | Entry point, factory pattern |
| 7 | `docs/contracts-btc-runtime-getting-started-project-structure.md` | Directory layout |
| 8 | `docs/contracts-btc-runtime-core-concepts-storage-system.md` | Storage types, pointers |
| 9 | `docs/contracts-btc-runtime-core-concepts-pointers.md` | Pointer allocation |
| 10 | `docs/contracts-btc-runtime-api-reference-safe-math.md` | SafeMath (MANDATORY for u256) |
| 11 | `docs/contracts-btc-runtime-gas-optimization.md` | Gas patterns, forbidden loops |
| 12 | `docs/contracts-btc-runtime-core-concepts-security.md` | Security checklist |

**For OP20 tokens, also read:**
- `docs/contracts-btc-runtime-api-reference-op20.md`
- `docs/contracts-btc-runtime-contracts-op20-token.md`

**For OP721 NFTs, also read:**
- `docs/contracts-btc-runtime-api-reference-op721.md`
- `docs/contracts-btc-runtime-contracts-op721-nft.md`

**IF YOU SKIP THESE DOCS, YOUR CONTRACT WILL HAVE BUGS.**

---

## Contract Entry Point

Every contract needs an `index.ts` entry point with THREE required elements:

### Required Structure

```typescript
import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { MyContract } from './MyContract';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';

// 1. Factory function - REQUIRED
// Must return a NEW instance, not assign an instance directly
Blockchain.contract = (): MyContract => {
    return new MyContract();
};

// 2. Runtime exports - REQUIRED
export * from '@btc-vision/btc-runtime/runtime/exports';

// 3. Abort handler - REQUIRED
export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}
```

### Common Entry Point Mistakes

**WRONG - Direct instance assignment:**
```typescript
// Type error: 'MyContract' is not assignable to '() => OP_NET'
Blockchain.contract = new MyContract();
```

**WRONG - Wrong export path:**
```typescript
// Path does not exist
export * from '@btc-vision/btc-runtime/runtime/exports/abort';
```

**WRONG - Missing abort function:**
```typescript
// Contract will crash without abort handler
Blockchain.contract = (): MyContract => new MyContract();
export * from '@btc-vision/btc-runtime/runtime/exports';
// Missing: export function abort(...)
```

---

## Contract Class Patterns

### Extending OP20

```typescript
import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    OP20,
    OP20InitParameters,
    Revert,
    Selector,
    StoredU256,
    AddressMemoryMap,
    SafeMath
} from '@btc-vision/btc-runtime/runtime';

export class MyToken extends OP20 {
    public constructor() {
        const params: OP20InitParameters = {
            name: 'My Token',
            symbol: 'MTK',
            decimals: 18,
            maxSupply: u256.fromString('100000000000000000000000000'), // 100M with 18 decimals
        };
        super(params);
    }
}
```

### Method Decorators

```typescript
import { method, returns } from '@btc-vision/btc-runtime/runtime';
import { ABIDataTypes } from '@btc-vision/btc-runtime/runtime/universal/ABIDataTypes';

@method({ name: 'to', type: ABIDataTypes.ADDRESS }, { name: 'amount', type: ABIDataTypes.UINT256 })
@returns({ type: ABIDataTypes.BOOL })
public transfer(calldata: Calldata): BytesWriter {
    // Implementation
}
```

### Selectors

```typescript
export class MyContract extends OP_NET {
    // Define selectors as class properties
    private readonly myMethodSelector: Selector = encodeSelector('myMethod(address,uint256)');

    public callMethod(calldata: Calldata): BytesWriter {
        const selector = calldata.readSelector();

        switch (selector) {
            case this.myMethodSelector:
                return this.myMethod(calldata);
            default:
                return super.callMethod(calldata);
        }
    }
}
```

### onDeployment vs Constructor

- **Constructor**: Runs on EVERY contract interaction
- **onDeployment**: Runs ONLY on first deployment

```typescript
export class MyContract extends OP_NET {
    public constructor() {
        super();
        // This runs every time - use for setting up selectors, etc.
    }

    public override onDeployment(_calldata: Calldata): void {
        // This runs ONCE on deployment - use for initializing storage
        const currentBlock = Blockchain.block.number;
        this.deploymentBlock.set(currentBlock);
    }
}
```

---

## Storage and Pointers

### Pointer Allocation

Pointers must be unique. Use `Blockchain.nextPointer` for automatic allocation:

```typescript
export class MyContract extends OP_NET {
    // Automatic pointer allocation (recommended)
    private readonly myValuePointer: u16 = Blockchain.nextPointer;
    private readonly myMapPointer: u16 = Blockchain.nextPointer;

    // Storage instances using pointers
    private readonly myValue: StoredU256 = new StoredU256(this.myValuePointer, u256.Zero);
    private readonly myMap: AddressMemoryMap<Address, StoredU256> = new AddressMemoryMap(
        this.myMapPointer,
        Address.dead()
    );
}
```

### Storage Types

| Type | Use Case | Example |
|------|----------|---------|
| `StoredU256` | Single u256 value | Total supply, deployment block |
| `StoredBoolean` | Boolean flag | Mint closed, paused |
| `StoredString` | String value | Name, symbol |
| `StoredU64` | Single u64 value | Block numbers, timestamps |
| `AddressMemoryMap` | Address → value mapping | Balances, mints per address |
| `StoredMapU256` | u256 → u256 mapping | Generic key-value |

### Reading and Writing Storage

```typescript
// StoredU256
const value = this.myValue.get();           // Read
this.myValue.set(newValue);                 // Write

// AddressMemoryMap
const balance = this.balances.get(address); // Read (returns StoredU256)
const balanceValue = balance.get();         // Get actual value
balance.set(newBalance);                    // Write
```

---

## u256 and SafeMath

### ALWAYS Use SafeMath

**SafeMath is MANDATORY for ALL u256 operations.** Raw operations can overflow/underflow.

```typescript
import { u256 } from '@btc-vision/as-bignum/assembly';
import { SafeMath } from '@btc-vision/btc-runtime/runtime';

// WRONG - Raw operations (FORBIDDEN)
const result = a + b;           // Can overflow
const result = a - b;           // Can underflow
const result = a * b;           // Can overflow

// CORRECT - SafeMath operations
const result = SafeMath.add(a, b);      // Reverts on overflow
const result = SafeMath.sub(a, b);      // Reverts on underflow
const result = SafeMath.mul(a, b);      // Reverts on overflow
const result = SafeMath.div(a, b);      // Reverts on divide by zero
```

### Creating u256 Values

**WRONG - pow() may not exist:**
```typescript
// This may fail - pow() doesn't exist on u256 in AssemblyScript
const amount = u256.fromU64(1000).mul(u256.fromU64(10).pow(18));
```

**CORRECT - Use fromString for large numbers:**
```typescript
// Calculate the full value offline, use string
const TOKENS_PER_MINT: u256 = u256.fromString('1000000000000000000000');      // 1000 * 10^18
const MAX_SUPPLY: u256 = u256.fromString('100000000000000000000000000');      // 100M * 10^18

// For small values, fromU32/fromU64 is fine
const MAX_MINTS: u256 = u256.fromU32(5);
const ONE: u256 = u256.One;
const ZERO: u256 = u256.Zero;
```

### Comparison Operations

```typescript
// Equality
if (u256.eq(a, b)) { }
if (a == b) { }  // Also works

// Greater than
if (u256.gt(a, b)) { }
if (a > b) { }   // Also works

// Less than
if (u256.lt(a, b)) { }
if (a < b) { }   // Also works

// Greater than or equal
if (u256.gte(a, b)) { }
if (a >= b) { }  // Also works
```

---

## Common Imports

### From btc-runtime

```typescript
import {
    // Core
    Blockchain,
    OP_NET,
    OP20,
    OP721,

    // Types
    Address,
    Calldata,
    BytesWriter,
    Selector,

    // Storage
    StoredU256,
    StoredBoolean,
    StoredString,
    StoredU64,
    AddressMemoryMap,
    StoredMapU256,
    EMPTY_POINTER,

    // Utilities
    encodeSelector,
    SafeMath,
    Revert,

    // Decorators
    method,
    returns
} from '@btc-vision/btc-runtime/runtime';
```

### From as-bignum

```typescript
import { u256, u128 } from '@btc-vision/as-bignum/assembly';
```

### Abort Handler

```typescript
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';
```

---

## Gas Optimization

### FORBIDDEN Patterns

| Pattern | Why | Alternative |
|---------|-----|-------------|
| `while` loops | Unbounded gas | Bounded `for` loops |
| Infinite loops | Contract halts | Always have exit condition |
| Iterating all map keys | O(n) explosion | Indexed lookups |
| Unbounded arrays | Grows forever | Cap size, pagination |

### Gas-Efficient Patterns

**WRONG - Iterating all holders:**
```typescript
let total: u256 = u256.Zero;
for (let i = 0; i < holders.length; i++) {
    total = SafeMath.add(total, balances.get(holders[i]).get());
}
```

**CORRECT - Store running total:**
```typescript
// Update totalSupply on every mint/burn, read in O(1)
const supply = this.totalSupply.get();
```

**WRONG - Unbounded loop:**
```typescript
while (condition) {
    // Might never exit
}
```

**CORRECT - Bounded loop:**
```typescript
const MAX_ITERATIONS: u32 = 100;
for (let i: u32 = 0; i < MAX_ITERATIONS; i++) {
    if (!condition) break;
    // Process
}
```

---

## Common Contract Mistakes

### 1. Forgetting to extend parent callMethod

```typescript
// WRONG - Breaks inherited functionality
public callMethod(calldata: Calldata): BytesWriter {
    switch (calldata.readSelector()) {
        case this.mySelector:
            return this.myMethod(calldata);
    }
    // Missing: return super.callMethod(calldata);
}

// CORRECT
public callMethod(calldata: Calldata): BytesWriter {
    const selector = calldata.readSelector();
    switch (selector) {
        case this.mySelector:
            return this.myMethod(calldata);
        default:
            return super.callMethod(calldata);  // Handle inherited methods
    }
}
```

### 2. Not checking conditions before operations

```typescript
// WRONG - No validation
public freeMint(calldata: Calldata): BytesWriter {
    this._mint(Blockchain.tx.sender, MINT_AMOUNT);
    return new BytesWriter(1).writeBoolean(true);
}

// CORRECT - Full validation
public freeMint(calldata: Calldata): BytesWriter {
    // Check mint is open
    if (this.mintClosed.get()) {
        throw new Revert('Mint is closed');
    }

    // Check block deadline
    const deadline = SafeMath.add(this.deploymentBlock.get(), MINT_PERIOD);
    if (Blockchain.block.number >= deadline) {
        throw new Revert('Mint period ended');
    }

    // Check per-address limit
    const sender = Blockchain.tx.sender;
    const currentMints = this.mintsPerAddress.get(sender).get();
    if (u256.gte(currentMints, MAX_MINTS)) {
        throw new Revert('Max mints reached');
    }

    // Update state BEFORE minting (checks-effects-interactions)
    this.mintsPerAddress.get(sender).set(SafeMath.add(currentMints, u256.One));

    // Mint
    this._mint(sender, MINT_AMOUNT);

    return new BytesWriter(1).writeBoolean(true);
}
```

### 3. Using raw arithmetic instead of SafeMath

**WRONG:**
```typescript
const newBalance = currentBalance - amount;  // Can underflow!
```

**CORRECT:**
```typescript
const newBalance = SafeMath.sub(currentBalance, amount);  // Reverts on underflow
```

### 4. Incorrect BytesWriter size

```typescript
// WRONG - Size mismatch
const writer = new BytesWriter(1);  // Only 1 byte
writer.writeU256(value);            // Needs 32 bytes!

// CORRECT - Proper size
const writer = new BytesWriter(32);
writer.writeU256(value);

// For boolean
const writer = new BytesWriter(1);
writer.writeBoolean(true);

// For multiple values
const writer = new BytesWriter(1 + 32 + 8 + 8);  // bool + u256 + u64 + u64
writer.writeBoolean(isClosed);
writer.writeU256(totalMinted);
writer.writeU64(remainingBlocks);
writer.writeU64(deploymentBlock);
```

### 5. Contracts CANNOT hold BTC

**Remember:** OPNet contracts are calculators, not custodians. They verify transaction outputs, they don't hold funds.

```typescript
// WRONG mental model
contract.deposit(btcAmount);  // Contracts don't hold BTC

// CORRECT - Verify outputs exist
const outputs = Blockchain.tx.outputs;
// Verify expected outputs are present in the transaction
```

---

## Security Checklist

Before deploying any contract:

- [ ] All u256 operations use SafeMath
- [ ] All loops are bounded
- [ ] No unbounded arrays or maps iterations
- [ ] State changes happen BEFORE external calls (checks-effects-interactions)
- [ ] All user inputs are validated
- [ ] Access control is properly implemented
- [ ] Reentrancy guards where needed
- [ ] No integer overflow/underflow possible
