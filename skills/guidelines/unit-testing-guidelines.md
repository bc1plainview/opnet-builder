# OPNet Unit Testing Guidelines

**Read `setup-guidelines.md` FIRST for project setup and package versions.**

**CRITICAL: Unit tests are TypeScript, NOT AssemblyScript.** They have their own separate setup.

### MANDATORY: Always Update Packages

**After `npm install`, ALWAYS run:**

```bash
npx npm-check-updates -u && npm install
```

---

# STOP - MANDATORY SECURITY TESTING

**Unit tests MUST cover security vulnerability patterns, not just happy paths.**

AssemblyScript smart contracts are vulnerable to subtle issues that standard tests miss:
- **Serialization consistency** - write/read type mismatches cause silent data corruption
- **Integer handling** - overflow, underflow, truncation, signed/unsigned confusion
- **Storage operations** - cache coherence, deletion markers, bounds checking
- **Mathematical functions** - edge cases, precision loss, convergence failures

**If your tests don't cover these patterns, your contract may have exploitable vulnerabilities.**

**See "Security-Focused Test Patterns" section for MANDATORY test categories.**

---

## Table of Contents

1. [TypeScript Law (MANDATORY)](#typescript-law-mandatory)
2. [Mandatory Reading Order](#mandatory-reading-order)
3. [Test Environment Overview](#test-environment-overview)
4. [Project Structure](#project-structure)
5. [Test Dependencies](#test-dependencies)
6. [Test Configuration](#test-configuration)
7. [Test Patterns](#test-patterns)
8. [ContractRuntime Wrapper](#contractruntime-wrapper)
9. [Blockchain Mocking](#blockchain-mocking)
10. [Security-Focused Test Patterns (CRITICAL)](#security-focused-test-patterns-critical)
11. [Common Test Mistakes](#common-test-mistakes)

---

## TypeScript Law (MANDATORY)

**BEFORE WRITING ANY TEST CODE, YOU MUST READ AND FOLLOW:**

`docs/core-typescript-law-CompleteLaw.md`

**The TypeScript Law is NON-NEGOTIABLE.** Every line of code must comply. Violations lead to exploitable, broken code.

### Key Rules for Tests

| FORBIDDEN | WHY | USE INSTEAD |
|-----------|-----|-------------|
| `any` | Runtime bugs, defeats type checking | Proper types, generics |
| `unknown` (except boundaries) | Lazy escape hatch | Model actual types |
| `!` (non-null assertion) | Hides null bugs | Explicit checks, `?.` |
| `// @ts-ignore` | Hides errors | Fix the actual error |
| `eslint-disable` | Bypasses safety | Fix the actual issue |
| Section separator comments | Lazy, unprofessional | TSDoc for every method |
| `number` for large values | 53-bit precision loss | `bigint` for satoshis, IDs, heights |

**Read the full TypeScript Law before proceeding.**

---

## Mandatory Reading Order

**This guideline is a SUMMARY. You MUST read the following docs files IN ORDER before writing test code:**

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules |
| 2 | `guidelines/setup-guidelines.md` | Package versions |
| 3 | `guidelines/unit-testing-guidelines.md` | This file - summary of patterns |
| 4 | `docs/testing-unit-test-framework-README.md` | Framework overview |
| 5 | `docs/testing-opnet-unit-test-README.md` | Test setup |
| 6 | `docs/testing-opnet-unit-test-docs-Blockchain.md` | Blockchain mocking |
| 7 | `docs/testing-opnet-unit-test-docs-ContractRuntime.md` | Contract runtime |

**CRITICAL:** Unit tests are TypeScript (NOT AssemblyScript). They have a SEPARATE package.json.

**IF YOU SKIP THESE DOCS, YOUR TESTS WILL NOT WORK.**

---

## Test Environment Overview

| Aspect | Contract | Unit Tests |
|--------|----------|------------|
| **Language** | AssemblyScript | TypeScript |
| **Runtime** | WASM | Node.js |
| **Package manager** | Separate package.json | Separate package.json |
| **Compiler** | asc (AssemblyScript) | tsc / ts-node |
| **ESLint config** | eslint-contract.json | eslint-generic.json |

**Unit tests do NOT use as-pect.** They use `@btc-vision/unit-test-framework`.

---

## Project Structure

```
my-contract/
├── src/                          # Contract (AssemblyScript)
│   ├── index.ts
│   └── MyContract.ts
├── build/                        # Compiled WASM
│   └── MyContract.wasm
├── tests/                        # Unit tests (TypeScript)
│   ├── MyContract.test.ts        # Test file
│   ├── MyContractRuntime.ts      # Runtime wrapper (optional)
│   ├── tsconfig.json             # Test-specific tsconfig
│   └── package.json              # Test-specific dependencies (optional)
├── package.json                  # Contract dependencies
└── asconfig.json
```

---

## Test Dependencies

Tests can share the contract's package.json or have their own. Either way, include:

```json
{
    "type": "module",
    "dependencies": {
        "@btc-vision/unit-test-framework": "0.4.10",
        "@btc-vision/transaction": "1.8.0-beta.10"
    },
    "devDependencies": {
        "typescript": "latest",
        "ts-node": "latest",
        "@types/node": "latest"
    },
    "overrides": {
        "@noble/hashes": "2.0.1"
    }
}
```

**Run tests with:**
```bash
npx ts-node --esm tests/MyContract.test.ts
```

---

## Test Configuration

### tsconfig.json (for tests/)

```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "outDir": "./build",
        "rootDir": "."
    },
    "include": ["*.ts"],
    "exclude": ["node_modules"]
}
```

### ESLint (use eslint-generic.json)

Tests are TypeScript, so use the generic TypeScript ESLint config, NOT the AssemblyScript contract config.

---

## Test Patterns

### Basic Test Structure

```typescript
import { opnet, OPNetUnit, Assert, Blockchain } from '@btc-vision/unit-test-framework';
import { ContractRuntime, BytecodeManager } from '@btc-vision/unit-test-framework';
import { Address, BinaryWriter, BinaryReader } from '@btc-vision/transaction';
import * as fs from 'fs';
import * as path from 'path';

await opnet('MyContract Tests', async (vm: OPNetUnit) => {
    // Test addresses
    const deployerAddress: Address = Blockchain.generateRandomAddress();
    const userAddress: Address = Blockchain.generateRandomAddress();
    const contractAddress: Address = Blockchain.generateRandomAddress();

    // Contract instance
    let contract: MyContractRuntime;

    // Setup before each test
    vm.beforeEach(async () => {
        // ALWAYS dispose and reinitialize
        Blockchain.dispose();
        Blockchain.clearContracts();
        await Blockchain.init();

        // Create and register contract
        contract = new MyContractRuntime(deployerAddress, contractAddress);
        Blockchain.register(contract);
        await contract.init();
    });

    // Cleanup after each test
    vm.afterEach(() => {
        contract.dispose();
        Blockchain.dispose();
    });

    // Test cases
    await vm.it('should do something', async () => {
        Blockchain.setSender(userAddress);
        const result = await contract.someMethod();
        Assert.expect(result).toEqual(expectedValue);
    });
});
```

### Assertion Patterns

```typescript
// Equality
Assert.expect(value).toEqual(expected);
Assert.expect(value.toString()).toEqual('123');

// Boolean
Assert.expect(result).toEqual(true);
Assert.expect(result).toEqual(false);

// BigInt comparison (convert to string)
Assert.expect(balance.toString()).toEqual('1000000000000000000000');

// Throws (async)
await Assert.expect(async () => {
    await contract.methodThatShouldFail();
}).toThrow();

// Throws with message
await Assert.expect(async () => {
    await contract.methodThatShouldFail();
}).toThrow('Expected error message');
```

### Block Manipulation

```typescript
// Mine a single block
Blockchain.mineBlock();

// Mine multiple blocks (e.g., advance past deadline)
for (let i = 0; i < 1025; i++) {
    Blockchain.mineBlock();
}

// Set sender for next call
Blockchain.setSender(userAddress);

// Generate random address for testing
const randomUser = Blockchain.generateRandomAddress();
```

---

## ContractRuntime Wrapper

Create a wrapper class to interact with your contract:

```typescript
import { ContractRuntime } from '@btc-vision/unit-test-framework';
import { Address, BinaryWriter, BinaryReader } from '@btc-vision/transaction';

export class MyContractRuntime extends ContractRuntime {
    // Define selectors
    private readonly myMethodSelector: number = this.getSelector('myMethod(address,uint256)');
    private readonly balanceOfSelector: number = this.getSelector('balanceOf(address)');

    public constructor(deployer: Address, address: Address, gasLimit: bigint = 150_000_000_000n) {
        super({
            address: address,
            deployer: deployer,
            gasLimit,
        });
    }

    /**
     * Call a method that returns a boolean.
     */
    public async myMethod(to: Address, amount: bigint): Promise<boolean> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.myMethodSelector);
        calldata.writeAddress(to);
        calldata.writeU256(amount);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        const reader = new BinaryReader(response.response);
        return reader.readBoolean();
    }

    /**
     * Call a view method that returns a u256.
     */
    public async balanceOf(address: Address): Promise<bigint> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.balanceOfSelector);
        calldata.writeAddress(address);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        const reader = new BinaryReader(response.response);
        return reader.readU256();
    }

    /**
     * Call a method that returns multiple values.
     */
    public async getStatus(): Promise<{
        isClosed: boolean;
        total: bigint;
        remaining: bigint;
    }> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.getStatusSelector);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        const reader = new BinaryReader(response.response);
        return {
            isClosed: reader.readBoolean(),
            total: reader.readU256(),
            remaining: reader.readU64(),
        };
    }
}
```

### Selector Format

Use `this.getSelector()` with the method signature:

```typescript
// Method with no params
this.getSelector('myMethod()');

// Method with address param
this.getSelector('balanceOf(address)');

// Method with multiple params
this.getSelector('transfer(address,uint256)');

// Standard OP20 methods
this.getSelector('name()');
this.getSelector('symbol()');
this.getSelector('decimals()');
this.getSelector('totalSupply()');
this.getSelector('balanceOf(address)');
this.getSelector('transfer(address,uint256)');
this.getSelector('approve(address,uint256)');
this.getSelector('allowance(address,address)');
this.getSelector('transferFrom(address,address,uint256)');
```

---

## Blockchain Mocking

### Available Methods

```typescript
// Initialize/cleanup
await Blockchain.init();
Blockchain.dispose();
Blockchain.clearContracts();

// Register contracts
Blockchain.register(contractRuntime);

// Set transaction sender
Blockchain.setSender(address);

// Generate addresses
const addr = Blockchain.generateRandomAddress();

// Mine blocks
Blockchain.mineBlock();

// Access block info (inside contract)
// Blockchain.block.number
// Blockchain.block.timestamp
```

### Testing Multiple Users

```typescript
await vm.it('should handle multiple users', async () => {
    const user1 = Blockchain.generateRandomAddress();
    const user2 = Blockchain.generateRandomAddress();

    // User 1 action
    Blockchain.setSender(user1);
    await contract.mint();

    // User 2 action
    Blockchain.setSender(user2);
    await contract.mint();

    // Verify both
    const balance1 = await contract.balanceOf(user1);
    const balance2 = await contract.balanceOf(user2);

    Assert.expect(balance1.toString()).toEqual('1000');
    Assert.expect(balance2.toString()).toEqual('1000');
});
```

### Testing Time-Based Logic

```typescript
await vm.it('should fail after deadline', async () => {
    // Advance past 1024 block deadline
    for (let i = 0; i < 1025; i++) {
        Blockchain.mineBlock();
    }

    Blockchain.setSender(userAddress);

    // Should throw because deadline passed
    await Assert.expect(async () => {
        await contract.freeMint();
    }).toThrow();
});
```

---

## Security-Focused Test Patterns (CRITICAL)

**These test patterns are MANDATORY for any contract handling value. They cover common vulnerability classes in AssemblyScript smart contracts.**

---

### 1. Serialization Consistency Tests

**Vulnerability:** Write uses one type (e.g., u16), read uses different type (e.g., u32).

**Test Pattern:** Round-trip all serialized data and verify exact match.

```typescript
await vm.it('should serialize/deserialize arrays correctly', async () => {
    // Test with various array sizes
    const testCases = [
        [],                                    // Empty array
        [1n],                                  // Single element
        Array.from({ length: 65535 }, (_, i) => BigInt(i)),  // Max u16 length
    ];

    for (const original of testCases) {
        // Write array via contract
        Blockchain.setSender(owner);
        await contract.storeArray(original);

        // Read back and verify exact match
        const retrieved = await contract.getArray();
        Assert.expect(retrieved.length).toEqual(original.length);
        for (let i = 0; i < original.length; i++) {
            Assert.expect(retrieved[i].toString()).toEqual(original[i].toString());
        }
    }
});

await vm.it('should handle all integer types correctly', async () => {
    // Test each integer type at boundaries
    const tests = [
        { type: 'u8', min: 0n, max: 255n },
        { type: 'i8', min: -128n, max: 127n },
        { type: 'u16', min: 0n, max: 65535n },
        { type: 'i16', min: -32768n, max: 32767n },
        { type: 'u32', min: 0n, max: 4294967295n },
        { type: 'i32', min: -2147483648n, max: 2147483647n },
        { type: 'u64', min: 0n, max: 18446744073709551615n },
    ];

    for (const { type, min, max } of tests) {
        // Store and retrieve minimum
        await contract.storeValue(type, min);
        const retrievedMin = await contract.getValue(type);
        Assert.expect(retrievedMin.toString()).toEqual(min.toString());

        // Store and retrieve maximum
        await contract.storeValue(type, max);
        const retrievedMax = await contract.getValue(type);
        Assert.expect(retrievedMax.toString()).toEqual(max.toString());
    }
});
```

---

### 2. Signed/Unsigned Type Tests

**Vulnerability:** Signed values (i8, i16, i32) cast to unsigned, losing sign.

**Test Pattern:** Verify negative values survive round-trip.

```typescript
await vm.it('should preserve negative values', async () => {
    const negativeTests = [
        -1n,
        -128n,      // i8 min
        -32768n,    // i16 min
        -2147483648n,  // i32 min
    ];

    for (const value of negativeTests) {
        await contract.storeSignedValue(value);
        const retrieved = await contract.getSignedValue();
        Assert.expect(retrieved.toString()).toEqual(value.toString());
    }
});

await vm.it('should not confuse signed and unsigned', async () => {
    // Store -1 as signed i8
    await contract.storeI8(-1n);
    const asI8 = await contract.getI8();
    Assert.expect(asI8.toString()).toEqual('-1');

    // Verify it's NOT 255 (what you'd get if treated as u8)
    Assert.expect(asI8.toString()).not.toEqual('255');
});
```

---

### 3. Integer Overflow/Underflow Tests

**Vulnerability:** Arithmetic operations without SafeMath overflow or underflow silently.

**Test Pattern:** Verify operations at boundaries revert or handle correctly.

```typescript
await vm.it('should revert on overflow', async () => {
    const maxU256 = 2n ** 256n - 1n;

    // Set balance to max
    Blockchain.setSender(owner);
    await contract.setBalance(user, maxU256);

    // Adding 1 should revert
    await Assert.expect(async () => {
        await contract.addToBalance(user, 1n);
    }).toThrow();
});

await vm.it('should revert on underflow', async () => {
    // Set balance to 0
    Blockchain.setSender(owner);
    await contract.setBalance(user, 0n);

    // Subtracting 1 should revert
    await Assert.expect(async () => {
        await contract.subtractFromBalance(user, 1n);
    }).toThrow();
});

await vm.it('should handle multiplication overflow', async () => {
    const largeValue = 2n ** 200n;

    await Assert.expect(async () => {
        await contract.multiply(largeValue, largeValue);
    }).toThrow();
});
```

---

### 4. Bounds Checking Tests

**Vulnerability:** Off-by-one errors (using `>` instead of `>=`), index out of bounds.

**Test Pattern:** Test at exact boundaries and one past.

```typescript
await vm.it('should reject index at exact boundary', async () => {
    const maxIndex = 100;  // If array has max length 100

    // Index 99 should work (0-indexed, max valid = length - 1)
    const valid = await contract.getAt(99);
    Assert.expect(valid).toBeDefined();

    // Index 100 should fail (out of bounds)
    await Assert.expect(async () => {
        await contract.getAt(100);
    }).toThrow();
});

await vm.it('should reject negative index', async () => {
    await Assert.expect(async () => {
        await contract.getAt(-1);
    }).toThrow();
});

await vm.it('should handle empty array correctly', async () => {
    // Even index 0 should fail on empty array
    await Assert.expect(async () => {
        await contract.getAt(0);
    }).toThrow();
});
```

---

### 5. Storage Cache Coherence Tests

**Vulnerability:** Setter compares to uninitialized cache instead of storage value.

**Test Pattern:** Verify storage updates work correctly regardless of cache state.

```typescript
await vm.it('should update storage even when cache is uninitialized', async () => {
    // In a fresh contract, cache is likely 0/default
    // Setting to 0 should still work if storage has different value

    // First, set a non-zero value
    Blockchain.setSender(owner);
    await contract.setValue(100n);

    // Create a NEW runtime instance (simulating fresh cache)
    const freshContract = new MyContractRuntime(owner, contractAddr);
    Blockchain.register(freshContract);
    await freshContract.init();

    // Setting to 0 should update storage, not skip due to cache match
    await freshContract.setValue(0n);

    // Verify it's actually 0
    const value = await freshContract.getValue();
    Assert.expect(value.toString()).toEqual('0');

    freshContract.dispose();
});

await vm.it('should detect changes correctly after reload', async () => {
    // Set value
    await contract.setValue(42n);

    // Simulate reload (new instance)
    const reloaded = new MyContractRuntime(owner, contractAddr);
    Blockchain.register(reloaded);
    await reloaded.init();

    // Read should get 42
    const value = await reloaded.getValue();
    Assert.expect(value.toString()).toEqual('42');

    // Update should work
    await reloaded.setValue(43n);
    const updated = await reloaded.getValue();
    Assert.expect(updated.toString()).toEqual('43');

    reloaded.dispose();
});
```

---

### 6. Storage Deletion Tests

**Vulnerability:** Wrong deletion marker size causes `has()` to return incorrect results.

**Test Pattern:** Verify delete + has consistency.

```typescript
await vm.it('should return false for has() after delete', async () => {
    const key = Blockchain.generateRandomAddress();

    // Add item
    Blockchain.setSender(owner);
    await contract.mapSet(key, 100n);

    // Verify exists
    const exists = await contract.mapHas(key);
    Assert.expect(exists).toEqual(true);

    // Delete
    await contract.mapDelete(key);

    // Verify NOT exists
    const existsAfter = await contract.mapHas(key);
    Assert.expect(existsAfter).toEqual(false);
});

await vm.it('should return zero/default for get() after delete', async () => {
    const key = Blockchain.generateRandomAddress();

    // Add item
    await contract.mapSet(key, 100n);

    // Delete
    await contract.mapDelete(key);

    // Get should return 0 or throw
    const value = await contract.mapGet(key);
    Assert.expect(value.toString()).toEqual('0');
});

await vm.it('should allow re-adding after delete', async () => {
    const key = Blockchain.generateRandomAddress();

    // Add -> Delete -> Re-add
    await contract.mapSet(key, 100n);
    await contract.mapDelete(key);
    await contract.mapSet(key, 200n);

    // Should have new value
    const value = await contract.mapGet(key);
    Assert.expect(value.toString()).toEqual('200');

    const exists = await contract.mapHas(key);
    Assert.expect(exists).toEqual(true);
});
```

---

### 7. Integer Truncation Tests

**Vulnerability:** Generic methods only read first byte of multi-byte integers.

**Test Pattern:** Test values that require all bytes.

```typescript
await vm.it('should preserve large u32 values', async () => {
    // Values that need all 4 bytes
    const tests = [
        256n,           // Needs 2 bytes
        65536n,         // Needs 3 bytes
        16777216n,      // Needs 4 bytes
        4294967295n,    // Max u32
    ];

    for (const value of tests) {
        await contract.storeU32(value);
        const retrieved = await contract.getU32();
        Assert.expect(retrieved.toString()).toEqual(value.toString());
    }
});

await vm.it('should preserve large u64 values', async () => {
    const tests = [
        4294967296n,               // Just above u32 max
        1099511627776n,            // 2^40
        18446744073709551615n,     // Max u64
    ];

    for (const value of tests) {
        await contract.storeU64(value);
        const retrieved = await contract.getU64();
        Assert.expect(retrieved.toString()).toEqual(value.toString());
    }
});
```

---

### 8. Mathematical Edge Case Tests

**Vulnerability:** log(0) returns 0 instead of reverting, Taylor series diverges for certain inputs.

**Test Pattern:** Test mathematical functions at edge cases.

```typescript
await vm.it('should revert on log(0)', async () => {
    await Assert.expect(async () => {
        await contract.calculateLog(0n);
    }).toThrow();
});

await vm.it('should handle log(1) correctly', async () => {
    // log(1) = 0
    const result = await contract.calculateLog(1n);
    Assert.expect(result.toString()).toEqual('0');
});

await vm.it('should handle sqrt(0) correctly', async () => {
    const result = await contract.calculateSqrt(0n);
    Assert.expect(result.toString()).toEqual('0');
});

await vm.it('should handle sqrt(1) correctly', async () => {
    const result = await contract.calculateSqrt(1n);
    Assert.expect(result.toString()).toEqual('1');
});

await vm.it('should revert on division by zero', async () => {
    await Assert.expect(async () => {
        await contract.divide(100n, 0n);
    }).toThrow();
});

await vm.it('should handle modulo edge cases', async () => {
    // mod(0, x) = 0
    const result = await contract.mod(0n, 100n);
    Assert.expect(result.toString()).toEqual('0');

    // mod(x, 0) should revert
    await Assert.expect(async () => {
        await contract.mod(100n, 0n);
    }).toThrow();
});
```

---

### 9. Access Control Tests

**Vulnerability:** Missing authorization checks on sensitive methods.

**Test Pattern:** Verify unauthorized callers are rejected.

```typescript
await vm.it('should reject non-owner for admin functions', async () => {
    const attacker = Blockchain.generateRandomAddress();

    Blockchain.setSender(attacker);

    await Assert.expect(async () => {
        await contract.adminMint(attacker, 1000000n);
    }).toThrow();

    await Assert.expect(async () => {
        await contract.setOwner(attacker);
    }).toThrow();

    await Assert.expect(async () => {
        await contract.pause();
    }).toThrow();
});

await vm.it('should allow owner for admin functions', async () => {
    Blockchain.setSender(owner);

    // These should NOT throw
    await contract.adminMint(user, 1000n);
    await contract.pause();
    await contract.unpause();
});
```

---

### 10. Reentrancy Tests

**Vulnerability:** State modified after external call allows reentrancy attack.

**Test Pattern:** Verify state is updated before external interactions.

```typescript
await vm.it('should update balance before transfer', async () => {
    // Setup: user has 1000 tokens
    Blockchain.setSender(owner);
    await contract.mint(user, 1000n);

    // Transfer 500
    Blockchain.setSender(user);
    await contract.transfer(recipient, 500n);

    // User balance should be 500 (updated BEFORE any callbacks)
    const userBalance = await contract.balanceOf(user);
    Assert.expect(userBalance.toString()).toEqual('500');
});

await vm.it('should prevent double-spend via reentrancy', async () => {
    // If contract has callbacks, test that balance is deducted first
    Blockchain.setSender(user);

    // First transfer uses all balance
    await contract.transfer(recipient, 1000n);

    // Second transfer should fail (even if called in same "transaction")
    await Assert.expect(async () => {
        await contract.transfer(recipient, 1n);
    }).toThrow();
});
```

---

### 11. Bitcoin Address Validation Tests

**Vulnerability:** P2WPKH accepts uncompressed keys (65 bytes), witness scripts exceed size limits.

**Test Pattern:** Verify Bitcoin-specific validation.

```typescript
await vm.it('should reject uncompressed public keys for P2WPKH', async () => {
    // Uncompressed key is 65 bytes (04 prefix + 64 bytes)
    const uncompressedKey = new Uint8Array(65);
    uncompressedKey[0] = 0x04;

    await Assert.expect(async () => {
        await contract.createP2WPKH(uncompressedKey);
    }).toThrow();
});

await vm.it('should accept compressed public keys for P2WPKH', async () => {
    // Compressed key is 33 bytes (02 or 03 prefix + 32 bytes)
    const compressedKey = new Uint8Array(33);
    compressedKey[0] = 0x02;

    // Should NOT throw
    const result = await contract.createP2WPKH(compressedKey);
    Assert.expect(result).toBeDefined();
});

await vm.it('should reject oversized witness scripts', async () => {
    // Witness scripts > 10,000 bytes violate BIP141
    const oversizedScript = new Uint8Array(10001);

    await Assert.expect(async () => {
        await contract.createP2WSH(oversizedScript);
    }).toThrow();
});
```

---

### 12. Gas and Loop Boundary Tests

**Vulnerability:** Unbounded loops cause gas exhaustion.

**Test Pattern:** Verify loops have enforced limits.

```typescript
await vm.it('should limit array processing', async () => {
    // Try to process more than allowed maximum
    const tooMany = Array.from({ length: 1001 }, (_, i) => BigInt(i));

    await Assert.expect(async () => {
        await contract.processArray(tooMany);
    }).toThrow();
});

await vm.it('should handle maximum allowed iterations', async () => {
    // Process exactly the maximum (should succeed)
    const maxAllowed = Array.from({ length: 1000 }, (_, i) => BigInt(i));

    // Should NOT throw
    const result = await contract.processArray(maxAllowed);
    Assert.expect(result).toBeDefined();
});
```

---

### Security Test Checklist

**Before considering tests complete, verify:**

- [ ] **Serialization:** All data types round-trip correctly
- [ ] **Signed values:** Negative numbers preserve sign
- [ ] **Overflow:** Addition/multiplication at max values revert
- [ ] **Underflow:** Subtraction below zero reverts
- [ ] **Bounds:** Array access at and past boundaries tested
- [ ] **Cache coherence:** Storage updates work with fresh instances
- [ ] **Deletion:** has() returns false after delete
- [ ] **Truncation:** Large values in all integer types preserved
- [ ] **Math edge cases:** log(0), sqrt(0), div(x,0) handled
- [ ] **Access control:** Non-owners rejected from admin functions
- [ ] **Reentrancy:** State updated before external calls
- [ ] **Bitcoin validation:** P2WPKH/P2WSH size limits enforced
- [ ] **Loop limits:** Maximum iterations enforced

---

## Common Test Mistakes

### 1. Using as-pect Instead of unit-test-framework

**WRONG:**
```typescript
/// <reference types="@as-pect/assembly/types/as-pect" />

describe('MyContract', () => {  // ERROR: Cannot find name 'describe'
    it('should work', () => {
        expect(true).toBe(true);
    });
});
```

**CORRECT:**
```typescript
import { opnet, OPNetUnit, Assert, Blockchain } from '@btc-vision/unit-test-framework';

await opnet('MyContract', async (vm: OPNetUnit) => {
    await vm.it('should work', async () => {
        Assert.expect(true).toEqual(true);
    });
});
```

### 2. Forgetting to Initialize Blockchain

**WRONG:**
```typescript
vm.beforeEach(async () => {
    contract = new MyContractRuntime(deployer, address);
    // Missing: Blockchain.init()
});
```

**CORRECT:**
```typescript
vm.beforeEach(async () => {
    Blockchain.dispose();
    Blockchain.clearContracts();
    await Blockchain.init();

    contract = new MyContractRuntime(deployer, address);
    Blockchain.register(contract);
    await contract.init();
});
```

### 3. Forgetting to Dispose

**WRONG:**
```typescript
vm.afterEach(() => {
    // Missing cleanup
});
```

**CORRECT:**
```typescript
vm.afterEach(() => {
    contract.dispose();
    Blockchain.dispose();
});
```

### 4. Comparing BigInt Directly

**WRONG:**
```typescript
// May not work as expected
Assert.expect(balance).toEqual(1000n);
```

**CORRECT:**
```typescript
// Convert to string for reliable comparison
Assert.expect(balance.toString()).toEqual('1000');
```

### 5. Not Setting Sender

**WRONG:**
```typescript
// Who is calling?
await contract.mint();
```

**CORRECT:**
```typescript
Blockchain.setSender(userAddress);
await contract.mint();
```

### 6. Wrong Package Versions

**WRONG:**
```json
{
    "@btc-vision/unit-test-framework": "^1.0.0"  // Does not exist
}
```

**CORRECT:**
```json
{
    "@btc-vision/unit-test-framework": "0.4.10"
}
```

### 7. Missing --esm Flag

**WRONG:**
```bash
npx ts-node tests/MyContract.test.ts
# Error: Cannot use import statement outside a module
```

**CORRECT:**
```bash
npx ts-node --esm tests/MyContract.test.ts
```

---

## Example: Complete Test File

```typescript
import { opnet, OPNetUnit, Assert, Blockchain } from '@btc-vision/unit-test-framework';
import { ContractRuntime } from '@btc-vision/unit-test-framework';
import { Address, BinaryWriter, BinaryReader } from '@btc-vision/transaction';

/**
 * Contract runtime wrapper.
 */
class MyTokenRuntime extends ContractRuntime {
    private readonly freeMintSelector: number = this.getSelector('freeMint()');
    private readonly balanceOfSelector: number = this.getSelector('balanceOf(address)');

    public constructor(deployer: Address, address: Address) {
        super({ address, deployer, gasLimit: 150_000_000_000n });
    }

    public async freeMint(): Promise<boolean> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.freeMintSelector);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        return new BinaryReader(response.response).readBoolean();
    }

    public async balanceOf(address: Address): Promise<bigint> {
        const calldata = new BinaryWriter();
        calldata.writeSelector(this.balanceOfSelector);
        calldata.writeAddress(address);

        const response = await this.execute({ calldata: calldata.getBuffer() });
        this.handleResponse(response);

        return new BinaryReader(response.response).readU256();
    }
}

/**
 * Unit tests.
 */
await opnet('MyToken Tests', async (vm: OPNetUnit) => {
    const deployer = Blockchain.generateRandomAddress();
    const user = Blockchain.generateRandomAddress();
    const contractAddr = Blockchain.generateRandomAddress();

    let token: MyTokenRuntime;

    vm.beforeEach(async () => {
        Blockchain.dispose();
        Blockchain.clearContracts();
        await Blockchain.init();

        token = new MyTokenRuntime(deployer, contractAddr);
        Blockchain.register(token);
        await token.init();
    });

    vm.afterEach(() => {
        token.dispose();
        Blockchain.dispose();
    });

    await vm.it('should mint tokens', async () => {
        Blockchain.setSender(user);
        const result = await token.freeMint();
        Assert.expect(result).toEqual(true);
    });

    await vm.it('should update balance after mint', async () => {
        Blockchain.setSender(user);
        await token.freeMint();

        const balance = await token.balanceOf(user);
        Assert.expect(balance.toString()).toEqual('1000000000000000000000');
    });

    await vm.it('should fail on 6th mint', async () => {
        Blockchain.setSender(user);

        // Mint 5 times successfully
        for (let i = 0; i < 5; i++) {
            await token.freeMint();
        }

        // 6th should fail
        await Assert.expect(async () => {
            await token.freeMint();
        }).toThrow();
    });
});
```
