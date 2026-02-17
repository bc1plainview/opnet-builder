# Smart Contract Patterns

Patterns for writing correct, secure OPNet smart contracts in AssemblyScript.

---

## Storage Types

OPNet contracts use typed storage primitives. Each has a specific constructor signature.

### StoredU256
```typescript
import { EMPTY_POINTER } from '@btc-vision/btc-runtime/runtime/math/bytes';

// Constructor: (pointer: u16, subPointer: Uint8Array)
// subPointer = EMPTY_POINTER, NOT u256.Zero
protected _balance: StoredU256 = new StoredU256(BALANCE_POINTER, EMPTY_POINTER);

// Get/Set
const val: u256 = this._balance.get();
this._balance.set(newVal);
```

### StoredAddress
```typescript
// Constructor: (pointer: u16) — ONE param only, NO default value
protected _owner: StoredAddress = new StoredAddress(OWNER_POINTER);

// Get/Set
const addr: Address = this._owner.get();
this._owner.set(newAddr);
```

### StoredBoolean
```typescript
// Constructor: (pointer: u16, defaultValue: bool) — TWO params
protected _paused: StoredBoolean = new StoredBoolean(PAUSED_POINTER, false);

// Get/Set
const isPaused: bool = this._paused.get();
this._paused.set(true);
```

### StoredString
```typescript
// Constructor: (pointer: u16, defaultValue: string)
protected _name: StoredString = new StoredString(NAME_POINTER, 'Default');
```

### StoredU64
```typescript
// Constructor: (pointer: u16, defaultValue: u64)
protected _counter: StoredU64 = new StoredU64(COUNTER_POINTER, 0);
```

### AddressMap (Key-Value Mapping)
```typescript
// For address → u256 mappings (like balances)
// Constructor: (pointer: u16)
protected _balances: AddressMap<StoredU256> = new AddressMap(BALANCES_MAP_POINTER);

// Usage:
const balance = this._balances.get(address);
this._balances.set(address, newBalance);
```

---

## Pointer Management

**Every pointer must be unique across the entire contract.** Collision = silent data corruption.

```typescript
// Convention: group pointers by category with gaps for future additions
// Token metadata: 0-9
const NAME_POINTER: u16 = 0;
const SYMBOL_POINTER: u16 = 1;
const DECIMALS_POINTER: u16 = 2;
const TOTAL_SUPPLY_POINTER: u16 = 3;
const MAX_SUPPLY_POINTER: u16 = 4;

// Access control: 10-19
const OWNER_POINTER: u16 = 10;
const PAUSED_POINTER: u16 = 11;
const INITIALIZED_POINTER: u16 = 12;

// Maps: 100+
const BALANCES_MAP_POINTER: u16 = 100;
const ALLOWANCES_MAP_POINTER: u16 = 101;

// Custom: 200+
const MY_CUSTOM_POINTER: u16 = 200;
```

---

## Field Initialization

**ALWAYS initialize Stored* fields at declaration, not in the constructor body.**

```typescript
// ✅ CORRECT — at declaration
class MyContract extends OP20 {
    protected _supply: StoredU256 = new StoredU256(0, EMPTY_POINTER);
    protected _owner: StoredAddress = new StoredAddress(10);
}

// ❌ WRONG — in constructor body (causes TS2564)
class MyContract extends OP20 {
    protected _supply: StoredU256;
    
    constructor() {
        super();
        this._supply = new StoredU256(0, EMPTY_POINTER); // TS2564 error
    }
}
```

---

## SafeMath

**ALL u256 arithmetic MUST use SafeMath.** Raw operators on u256 silently overflow/underflow.

```typescript
import { SafeMath } from '@btc-vision/btc-runtime/runtime';

// ✅ CORRECT
const sum = SafeMath.add(a, b);
const diff = SafeMath.sub(a, b);  // Reverts on underflow
const prod = SafeMath.mul(a, b);
const quot = SafeMath.div(a, b);  // Reverts on div-by-zero

// ❌ WRONG — silent overflow
const sum = a + b;
const prod = a * b;
```

SafeMath violations are **critical security bugs**. Treat them like buffer overflows in C.

---

## Constructor vs onDeployment

```typescript
class MyToken extends OP20 {
    // Storage fields — initialized at declaration
    protected _totalSupply: StoredU256 = new StoredU256(0, EMPTY_POINTER);
    protected _owner: StoredAddress = new StoredAddress(10);

    constructor() {
        super();
        // ⚠️ This runs on EVERY contract call
        // Only set up storage references here
        // NO: minting, state changes, initialization
    }

    public override onDeployment(calldata: Calldata): void {
        // ✅ This runs ONCE at deployment
        // YES: minting, owner setup, initial state
        this._owner.set(Blockchain.tx.sender);
        this._mint(Blockchain.tx.sender, u256.fromString('1000000'));
    }

    public override onUpdate(calldata: Calldata): void {
        // ✅ This runs when the contract is upgraded
        // YES: migration logic, state transformations
        this.onlyOwner(Blockchain.tx.sender);
    }
}
```

---

## Selector Registration

OPNet uses SHA-256 first 4 bytes for selectors (NOT keccak-256).

```typescript
public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
    switch (method) {
        case encodeSelector('mint'): {
            const to = calldata.readAddress();
            const amount = calldata.readU256();
            this.mint(to, amount);
            const writer = new BytesWriter(1);
            writer.writeBoolean(true);
            return writer;
        }
        case encodeSelector('burn'): {
            const amount = calldata.readU256();
            this.burn(amount);
            return new BytesWriter(1);
        }
        default:
            return super.callMethod(method, calldata);
    }
}
```

---

## Events

```typescript
import { NetEvent } from '@btc-vision/btc-runtime/runtime';

// Emit events for indexers and frontends
class MyToken extends OP20 {
    public transfer(from: Address, to: Address, amount: u256): void {
        // ... transfer logic ...

        // Emit event
        const event = new NetEvent('Transfer', [
            from.toBytes(),
            to.toBytes(),
            amount.toBytes(),
        ]);
        this.emitEvent(event);
    }
}
```

---

## Access Control Pattern

```typescript
private onlyOwner(caller: Address): void {
    const owner = this._owner.get();
    if (!caller.equals(owner)) {
        throw new Error('Caller is not owner');
    }
}

// Usage in any function
public setPrice(newPrice: u256): void {
    this.onlyOwner(Blockchain.tx.sender);
    this._price.set(newPrice);
}
```

---

## No While Loops

```typescript
// ❌ WRONG — unbounded loop
while (i < items.length) {
    process(items[i]);
    i++;
}

// ✅ CORRECT — bounded for loop
const MAX_ITEMS: u32 = 100;
const len = Math.min(items.length, MAX_ITEMS);
for (let i: u32 = 0; i < len; i++) {
    process(items[i]);
}
```

---

## Contract Upgradeability

Every contract MUST implement `onUpdate`:

```typescript
public override onUpdate(calldata: Calldata): void {
    // Auth check
    this.onlyOwner(Blockchain.tx.sender);
    
    // Migration logic (if needed)
    // e.g., add new storage fields, transform data
}
```

To trigger an upgrade from another contract:
```typescript
Blockchain.updateContractFromExisting(sourceAddress, calldata);
```

---

## u256 Big Number Handling

```typescript
// Small numbers — fromU64 is fine
const small = u256.fromU64(1000);

// Large numbers — MUST use fromString (fromU64 overflows silently)
const large = u256.fromString('21000000000000000000000000');

// Comparisons
const isGreater = u256.gt(a, b);
const isEqual = u256.eq(a, b);
const isZero = u256.eq(a, u256.Zero);

// Constants
u256.Zero  // 0
u256.One   // 1
```

---

## Calldata Reading

```typescript
public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
    // Read in ORDER — calldata is sequential, not random access
    const addr = calldata.readAddress();      // Address
    const amount = calldata.readU256();        // u256
    const flag = calldata.readBoolean();       // bool
    const data = calldata.readBytes();         // Uint8Array
    const text = calldata.readStringWithLength(); // string

    // Write response
    const writer = new BytesWriter(32);
    writer.writeU256(result);
    writer.writeBoolean(true);
    writer.writeAddress(addr);
    return writer;
}
```

---

## Complete Token Template

```typescript
import { u256 } from 'as-bignum/assembly';
import {
    Address, Blockchain, BytesWriter, Calldata, encodeSelector,
    OP20, SafeMath, Selector, StoredU256, StoredAddress, StoredBoolean,
} from '@btc-vision/btc-runtime/runtime';
import { EMPTY_POINTER } from '@btc-vision/btc-runtime/runtime/math/bytes';

const TOTAL_SUPPLY_POINTER: u16 = 0;
const MAX_SUPPLY_POINTER: u16 = 1;
const OWNER_POINTER: u16 = 10;

export class Token extends OP20 {
    protected _totalSupply: StoredU256 = new StoredU256(TOTAL_SUPPLY_POINTER, EMPTY_POINTER);
    protected _maxSupply: StoredU256 = new StoredU256(MAX_SUPPLY_POINTER, EMPTY_POINTER);
    protected _owner: StoredAddress = new StoredAddress(OWNER_POINTER);

    constructor() { super(); }

    public override onDeployment(calldata: Calldata): void {
        this._maxSupply.set(u256.fromString('21000000000000000000000000'));
        this._owner.set(Blockchain.tx.sender);
        this._mint(Blockchain.tx.sender, u256.fromString('10000000000000000000000000'));
    }

    public override onUpdate(calldata: Calldata): void {
        this.onlyOwner(Blockchain.tx.sender);
    }

    public override get decimals(): u8 { return 18; }
    public override get name(): string { return 'My Token'; }
    public override get symbol(): string { return 'MTK'; }

    public mint(to: Address, amount: u256): void {
        this.onlyOwner(Blockchain.tx.sender);
        const supply = this._totalSupply.get();
        const newSupply = SafeMath.add(supply, amount);
        if (u256.gt(newSupply, this._maxSupply.get())) throw new Error('Max supply');
        this._mint(to, amount);
    }

    private onlyOwner(caller: Address): void {
        if (!caller.equals(this._owner.get())) throw new Error('Not owner');
    }

    public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('mint'): {
                this.mint(calldata.readAddress(), calldata.readU256());
                const w = new BytesWriter(1);
                w.writeBoolean(true);
                return w;
            }
            default: return super.callMethod(method, calldata);
        }
    }
}
```
