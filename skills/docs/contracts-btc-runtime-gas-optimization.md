# Smart Contract Gas Optimization

Gas optimization in OPNet contracts is critical for usability and cost-effectiveness. This guide covers patterns, anti-patterns, and strategies for writing gas-efficient contracts.

## Core Principles

1. **Computation costs gas** - Every operation has a cost
2. **Storage is expensive** - Reading/writing state costs more than computation
3. **Loops are dangerous** - Unbounded iteration can exceed gas limits
4. **Complexity grows** - O(n) operations become unusable as n grows

## FORBIDDEN Patterns

### 1. Unbounded Loops

```typescript
// FORBIDDEN - while loops
while (condition) {
    // This can run forever and consume infinite gas
}

// FORBIDDEN - Loops that grow with state
for (let i = 0; i < this.holders.length; i++) {
    // If holders grows to 10,000, this becomes unusable
}
```

### 2. Iterating All Keys/Elements

```typescript
// FORBIDDEN - Iterating all map entries
const keys = this.balances.keys(); // O(n) just to get keys!
for (let i = 0; i < keys.length; i++) {
    const balance = this.balances.get(keys[i]);
    total = SafeMath.add(total, balance);
}

// FORBIDDEN - Checking all array elements
for (let i = 0; i < this.whitelist.length; i++) {
    if (this.whitelist[i] === address) {
        return true;
    }
}
```

### 3. Growing Arrays Without Bounds

```typescript
// FORBIDDEN - Unbounded array growth
class BadContract extends OP_NET {
    private holders: Address[] = []; // Grows forever!

    transfer(to: Address, amount: u256): void {
        if (!this.holders.includes(to)) {
            this.holders.push(to); // Eventually makes transfer unusable
        }
    }
}
```

## Gas-Efficient Patterns

### 1. Store Running Totals

Instead of computing aggregates, track them incrementally:

```typescript
// Gas-efficient total supply tracking
class EfficientToken extends OP20 {
    private totalSupplyStorage: StoredU256;

    constructor() {
        super();
        this.totalSupplyStorage = new StoredU256(TOTAL_SUPPLY_POINTER);
    }

    // O(1) - Just read stored value
    public totalSupply(): u256 {
        return this.totalSupplyStorage.get();
    }

    protected _mint(to: Address, amount: u256): void {
        // Update running total - O(1)
        const current = this.totalSupplyStorage.get();
        this.totalSupplyStorage.set(SafeMath.add(current, amount));

        // Update balance - O(1)
        const balance = this.balanceOfMap.get(to);
        this.balanceOfMap.set(to, SafeMath.add(balance, amount));
    }
}
```

### 2. Use Maps Instead of Arrays for Lookups

```typescript
// WRONG - O(n) lookup
class BadWhitelist {
    private whitelist: Address[] = [];

    isWhitelisted(addr: Address): bool {
        for (let i = 0; i < this.whitelist.length; i++) {
            if (this.whitelist[i].equals(addr)) return true;
        }
        return false;
    }
}

// CORRECT - O(1) lookup
class GoodWhitelist {
    private whitelistMap: StoredMapU256;

    constructor() {
        this.whitelistMap = new StoredMapU256(WHITELIST_POINTER);
    }

    isWhitelisted(addr: Address): bool {
        return this.whitelistMap.get(addr) === u256.One;
    }

    addToWhitelist(addr: Address): void {
        this.whitelistMap.set(addr, u256.One);
    }

    removeFromWhitelist(addr: Address): void {
        this.whitelistMap.set(addr, u256.Zero);
    }
}
```

### 3. Pagination for Large Data Sets

```typescript
// When you MUST iterate, use pagination
class PaginatedContract extends OP_NET {
    private readonly PAGE_SIZE: i32 = 100;

    // Return paginated results
    @method(
        { name: 'page', type: ABIDataTypes.UINT256 }
    )
    @returns(
        { name: 'data', type: ABIDataTypes.TUPLE_ARRAY },
        { name: 'hasMore', type: ABIDataTypes.BOOL }
    )
    public getHolders(calldata: Calldata): BytesWriter {
        const page = calldata.readU256().toI32();
        const start = page * this.PAGE_SIZE;
        const end = min(start + this.PAGE_SIZE, this.holderCount);

        const writer = new BytesWriter(1024);

        for (let i = start; i < end; i++) {
            const holder = this.holderAtIndex.get(u256.fromI32(i));
            writer.writeAddress(holder);
        }

        writer.writeBool(end < this.holderCount);
        return writer;
    }
}
```

### 4. Indexed Storage

```typescript
// Efficient indexed storage pattern
class IndexedStorage extends OP_NET {
    // Count of items
    private itemCount: StoredU256;

    // index -> item mapping
    private itemAtIndex: StoredMapAddress;

    // item -> index mapping (for removal)
    private indexOfItem: StoredMapU256;

    // Add item - O(1)
    addItem(item: Address): void {
        if (this.indexOfItem.get(item) !== u256.Zero) {
            return; // Already exists
        }

        const index = this.itemCount.get();
        this.itemAtIndex.set(index, item);
        this.indexOfItem.set(item, SafeMath.add(index, u256.One)); // +1 so 0 means "not found"
        this.itemCount.set(SafeMath.add(index, u256.One));
    }

    // Check exists - O(1)
    hasItem(item: Address): bool {
        return this.indexOfItem.get(item) !== u256.Zero;
    }

    // Get by index - O(1)
    getItem(index: u256): Address {
        return this.itemAtIndex.get(index);
    }
}
```

### 5. Batch Operations with Limits

```typescript
// Safe batch operation with gas protection
class SafeBatch extends OP_NET {
    private readonly MAX_BATCH_SIZE: i32 = 50;

    @method({
        name: 'recipients',
        type: ABIDataTypes.ADDRESS_UINT256_TUPLE
    })
    public batchTransfer(calldata: Calldata): BytesWriter {
        const recipients = calldata.readAddressMapU256();
        const addresses = recipients.keys();

        // CRITICAL: Enforce batch size limit
        if (addresses.length > this.MAX_BATCH_SIZE) {
            throw new Error('Batch size exceeds maximum');
        }

        for (let i: i32 = 0; i < addresses.length; i++) {
            const to = addresses[i];
            const amount = recipients.get(to);
            this._transfer(Blockchain.tx.sender, to, amount);
        }

        return new BytesWriter(0);
    }
}
```

## Storage Optimization

### Pointer Management

```typescript
// Efficient pointer allocation
const BASE_POINTER: u16 = 0;

// Group related data
const TOKEN_INFO_POINTER: u16 = BASE_POINTER;      // 0
const BALANCES_POINTER: u16 = BASE_POINTER + 1;    // 1
const ALLOWANCES_POINTER: u16 = BASE_POINTER + 2;  // 2
const TOTAL_SUPPLY_POINTER: u16 = BASE_POINTER + 3; // 3

// Leave gaps for future expansion
const EXTENSION_POINTER: u16 = 100;
```

### Packing Small Values

```typescript
// Pack multiple small values into single storage slot
class PackedStorage extends OP_NET {
    private packedConfig: StoredU256;

    // Store multiple values in one u256
    setConfig(decimals: u8, paused: bool, version: u16): void {
        let packed = u256.Zero;
        packed = packed.or(u256.fromU32(decimals));           // bits 0-7
        packed = packed.or(u256.fromU32(paused ? 1 : 0).shl(8)); // bit 8
        packed = packed.or(u256.fromU32(version).shl(16));    // bits 16-31
        this.packedConfig.set(packed);
    }

    // Read individual values
    getDecimals(): u8 {
        return this.packedConfig.get().and(u256.fromU32(0xFF)).toU32() as u8;
    }

    isPaused(): bool {
        return this.packedConfig.get().shr(8).and(u256.One) === u256.One;
    }
}
```

## Computation Optimization

### Avoid Redundant Reads

```typescript
// WRONG - Multiple storage reads
function badTransfer(from: Address, to: Address, amount: u256): void {
    if (this.balances.get(from) < amount) throw new Error('Insufficient');
    this.balances.set(from, this.balances.get(from).sub(amount)); // Read again!
    this.balances.set(to, this.balances.get(to).add(amount));
}

// CORRECT - Cache reads
function goodTransfer(from: Address, to: Address, amount: u256): void {
    const fromBalance = this.balances.get(from);
    if (fromBalance < amount) throw new Error('Insufficient');

    const toBalance = this.balances.get(to);

    this.balances.set(from, SafeMath.sub(fromBalance, amount));
    this.balances.set(to, SafeMath.add(toBalance, amount));
}
```

### Early Exit

```typescript
// Check cheapest conditions first
function efficientCheck(addr: Address, amount: u256): void {
    // 1. Check zero amount (free)
    if (amount === u256.Zero) {
        throw new Error('Zero amount');
    }

    // 2. Check paused flag (single storage read)
    if (this.paused.get()) {
        throw new Error('Contract paused');
    }

    // 3. Check balance (storage read + comparison)
    const balance = this.balances.get(addr);
    if (balance < amount) {
        throw new Error('Insufficient balance');
    }

    // Proceed with expensive operations only if all checks pass
}
```

## Security vs Gas Trade-offs

### NEVER Compromise Security for Gas

```typescript
// WRONG - Removed bounds check for gas savings
function unsafeTransfer(to: Address, amount: u256): void {
    // Skipping validation to save gas - DANGEROUS!
    this.balances.set(Blockchain.tx.sender,
        this.balances.get(Blockchain.tx.sender).sub(amount)
    );
}

// CORRECT - Always validate
function safeTransfer(to: Address, amount: u256): void {
    const sender = Blockchain.tx.sender;
    const balance = this.balances.get(sender);

    // These checks are worth the gas
    if (amount === u256.Zero) throw new Error('Zero amount');
    if (balance < amount) throw new Error('Insufficient balance');
    if (to.equals(Address.dead())) throw new Error('Dead address');

    this.balances.set(sender, SafeMath.sub(balance, amount));
    this.balances.set(to, SafeMath.add(this.balances.get(to), amount));
}
```

### Security Checklist for Optimized Code

After optimizing, verify:

- [ ] Access control still enforced
- [ ] Integer overflow/underflow handled (use SafeMath)
- [ ] Bounds checking preserved
- [ ] Reentrancy protection maintained
- [ ] State consistency guaranteed
- [ ] No new attack vectors introduced

## Gas Estimation

### Testing Gas Usage

```typescript
// In unit tests, measure gas consumption
await opnet('Gas Tests', async (vm: OPNetUnit) => {
    await vm.it('should have efficient transfer', async () => {
        const gasUsed = await contract.transfer(recipient, amount);

        // Set gas budget based on expected complexity
        Assert.expect(gasUsed).toBeLessThan(50000n);
    });

    await vm.it('should scale linearly for batch ops', async () => {
        const gas1 = await contract.batchTransfer(10);
        const gas10 = await contract.batchTransfer(100);

        // Should be roughly 10x, not exponential
        Assert.expect(gas10 / gas1).toBeLessThan(15n);
    });
});
```

## Summary

| Pattern | Avoid | Use Instead |
|---------|-------|-------------|
| Totals | Iterate & sum | Running total storage |
| Lookups | Array search | Map with O(1) access |
| Iterations | Unbounded loops | Pagination with limits |
| State reads | Multiple reads | Cache in variables |
| Batch ops | Unlimited batches | Enforce max batch size |
| Checks | Skip for "gas savings" | Always validate (security first) |

## Related Documentation

- [Storage System](./core-concepts/storage-system.md)
- [SafeMath](./api-reference/safe-math.md)
- [Security](./core-concepts/security.md)
- [OP20 Token](./contracts/op20-token.md)
