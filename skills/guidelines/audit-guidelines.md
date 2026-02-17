# OPNet Security Audit Guidelines

**Read `setup-guidelines.md` FIRST for project setup and package versions.**

This document covers security auditing patterns, checklists, and common vulnerabilities for OPNet code.

---

# STOP - MANDATORY READING BEFORE ANY AUDIT

**IF YOU AUDIT CODE WITHOUT READING THE REQUIRED DOCS, YOU WILL MISS CRITICAL VULNERABILITIES.**

OPNet smart contracts have:
- **AssemblyScript-specific patterns** that differ from TypeScript/Solidity
- **Runtime internals** with subtle but critical behaviors
- **Bitcoin-specific requirements** that most auditors don't know
- **Serialization patterns** where type mismatches cause silent data corruption

**You MUST read the files listed in "Mandatory Reading Order" IN ORDER before auditing ANY code.**

**If you skip the docs, you WILL miss vulnerabilities. There are no shortcuts.**

---

## Provider Note

**WebSocketProvider is EXPERIMENTAL.** Use `JSONRpcProvider` for production code until WebSocket support is stable.

---

## Table of Contents

1. [Disclaimer (MANDATORY)](#disclaimer-mandatory)
2. [TypeScript Law (MANDATORY)](#typescript-law-mandatory)
3. [Mandatory Reading Order](#mandatory-reading-order)
4. [Smart Contract Audit Checklist](#smart-contract-audit-checklist)
5. [Critical Runtime Vulnerability Patterns](#critical-runtime-vulnerability-patterns)
6. [Serialization/Deserialization Audit](#serializationdeserialization-audit)
7. [Storage System Audit](#storage-system-audit)
8. [Mathematical Operations Audit](#mathematical-operations-audit)
9. [Bitcoin Script Validation Audit](#bitcoin-script-validation-audit)
10. [TypeScript/Frontend/Backend Audit Checklist](#typescriptfrontendbackend-audit-checklist)
11. [Bitcoin-Specific Audit Checklist](#bitcoin-specific-audit-checklist)
12. [DEX/Swap Audit Checklist](#dexswap-audit-checklist)
13. [Common Vulnerabilities by Category](#common-vulnerabilities-by-category)
14. [Audit Report Template](#audit-report-template)

---

## Disclaimer (MANDATORY)

**EVERY audit report MUST include this disclaimer. No exceptions.**

```
IMPORTANT DISCLAIMER: This audit is AI-assisted and may contain errors,
false positives, or miss critical vulnerabilities. This is NOT a substitute
for a professional security audit by experienced human auditors.
Do NOT deploy to production based solely on this review.
Always engage professional auditors for contracts handling real value.
```

**Why this matters:**
- AI can miss subtle vulnerabilities
- AI can produce false positives
- AI lacks full context of the deployment environment
- Security is too critical to rely on AI alone

**NEVER claim an audit is complete or guarantees security.**

---

## TypeScript Law (MANDATORY)

**BEFORE AUDITING ANY CODE, YOU MUST READ AND FOLLOW:**

`docs/core-typescript-law-CompleteLaw.md`

**The TypeScript Law is NON-NEGOTIABLE.** It defines what secure OPNet code looks like. You cannot audit code without knowing the rules.

### Key Rules to Check During Audit

| FORBIDDEN | WHY | Severity |
|-----------|-----|----------|
| `any` | Type safety disabled, runtime bugs | CRITICAL |
| `!` (non-null assertion) | Hides null bugs | HIGH |
| `// @ts-ignore` | Hides errors | HIGH |
| `eslint-disable` | Bypasses safety | HIGH |
| Raw arithmetic on u256 | Overflow/underflow | CRITICAL |
| `while` loops in contracts | Unbounded gas | CRITICAL |
| `number` for satoshis/amounts | Precision loss | CRITICAL |
| Floats for financial values | Rounding errors | CRITICAL |

---

## Mandatory Reading Order

**Before auditing, read based on code type:**

### For Smart Contract Audits

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules |
| 2 | `guidelines/audit-guidelines.md` | This file |
| 3 | `docs/contracts-btc-runtime-core-concepts-security.md` | Contract security patterns |
| 4 | `docs/contracts-btc-runtime-gas-optimization.md` | Gas vulnerabilities |
| 5 | `docs/contracts-btc-runtime-api-reference-safe-math.md` | SafeMath requirements |
| 6 | `docs/contracts-btc-runtime-types-bytes-writer-reader.md` | Serialization patterns |

### For Frontend/Backend Audits

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules |
| 2 | `guidelines/audit-guidelines.md` | This file |
| 3 | `guidelines/frontend-guidelines.md` or `guidelines/backend-guidelines.md` | Platform-specific patterns |

### For DEX/Swap Audits

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules |
| 2 | `guidelines/audit-guidelines.md` | This file |
| 3 | SKILL.md - "CSV: The Critical Anti-Pinning Mechanism" section | Transaction pinning |
| 4 | SKILL.md - "NativeSwap" section | DEX architecture |

### For Plugin Audits

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules |
| 2 | `guidelines/audit-guidelines.md` | This file |
| 3 | `guidelines/plugin-guidelines.md` | Plugin patterns, reorg handling |

---

## Smart Contract Audit Checklist

### Arithmetic Safety

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| SafeMath for addition | All `u256` additions use `SafeMath.add()` | CRITICAL |
| SafeMath for subtraction | All `u256` subtractions use `SafeMath.sub()` | CRITICAL |
| SafeMath for multiplication | All `u256` multiplications use `SafeMath.mul()` | CRITICAL |
| SafeMath for division | All `u256` divisions use `SafeMath.div()` | CRITICAL |
| No raw operators | No `+`, `-`, `*`, `/` on u256 types | CRITICAL |
| Large number creation | Use `u256.fromString()` not arithmetic for large values | HIGH |
| Signed/unsigned awareness | Operations that can go negative use signed types or checked subtraction | CRITICAL |

### Access Control

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Owner-only functions | Sensitive methods check `Blockchain.tx.sender` | CRITICAL |
| Authorization checks | All state-changing methods verify caller | CRITICAL |
| No public mint without limits | Minting has caps, deadlines, or authorization | CRITICAL |

### Reentrancy

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Checks-Effects-Interactions | State changes BEFORE external calls | CRITICAL |
| Reentrancy guards | ReentrancyGuard used for vulnerable methods | HIGH |

### Gas and Loops

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| No while loops | Zero `while` statements in contract | CRITICAL |
| Bounded for loops | All `for` loops have maximum iteration limit | CRITICAL |
| No map iteration | No iterating all keys in a map | CRITICAL |
| No unbounded arrays | Arrays have maximum size or pagination | HIGH |
| Stored aggregates | Totals stored, not computed by iteration | HIGH |

### Storage

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Unique pointers | All storage pointers are unique | CRITICAL |
| Pointer allocation | Uses `Blockchain.nextPointer` or manual unique values | HIGH |
| Proper storage types | Correct StoredU256, StoredBoolean, etc. for data | MEDIUM |

### Input Validation

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Address validation | Addresses validated before use | HIGH |
| Amount validation | Amounts checked for zero, bounds | HIGH |
| Calldata validation | Calldata length and format validated | HIGH |

---

## Critical Runtime Vulnerability Patterns

**These are sophisticated vulnerability patterns that require deep understanding of AssemblyScript runtime internals. Standard security audits often miss these issues.**

**YOU MUST check for ALL of these patterns in every smart contract audit.**

### 1. Serialization Format Inconsistency [CRITICAL]

**Pattern:** Writer uses one type for length/value, reader uses different type.

**Example:**
```typescript
// BytesWriter.ts - writes u16 length (2 bytes)
public writeU256Array(value: u256[]): void {
    this.writeU16(u16(value.length));  // Writes 2 bytes
}

// BytesReader.ts - reads u32 length (4 bytes) - WRONG!
public readU256Array(): u256[] {
    const length = this.readU32();  // Reads 4 bytes - MISMATCH!
}
```

**Detection:** Compare ALL write/read method pairs for type consistency:
- `writeU8` ↔ `readU8`
- `writeU16` ↔ `readU16`
- `writeU32` ↔ `readU32`
- `writeU64` ↔ `readU64`
- Array length serialization consistency

**Impact:** Data corruption, buffer overflow, incorrect data interpretation.

---

### 2. Signed/Unsigned Type Confusion in Generic Methods [CRITICAL]

**Pattern:** Generic method treats signed types (i8, i16, i32) as unsigned.

**Example:**
```typescript
public write<T>(value: T): void {
    if (isInteger<T>()) {
        const size = sizeof<T>();
        if (size === 1) {
            this.writeU8(<u8>value);  // BUG: Casts i8 to u8, loses sign
            return;
        }
    }
}
```

**Detection:**
- Search for generic methods that handle integers
- Verify `isSigned<T>()` checks exist before casting
- Ensure dedicated signed methods exist (`writeI8`, `readI8`, etc.)

**Impact:** Sign extension vulnerabilities, silent data corruption.

---

### 3. sizeof<T>() Misinterpretation [CRITICAL]

**Pattern:** `sizeof<T>()` returns bytes, but code treats result as bits.

**Example:**
```typescript
switch (size) {
    case 8:   // sizeof returns 8 BYTES for u64
        return this.readU8() as T;  // WRONG - reads 8 BITS (1 byte)
    case 16:  // sizeof returns 16 BYTES for u128
        return this.readI16() as T; // WRONG - reads 16 BITS (2 bytes)
}
```

**Correct mapping:**
| Type | sizeof<T>() | Correct Read Method |
|------|-------------|---------------------|
| u8/i8 | 1 | readU8/readI8 |
| u16/i16 | 2 | readU16/readI16 |
| u32/i32 | 4 | readU32/readI32 |
| u64/i64 | 8 | readU64/readI64 |

**Detection:** Verify ALL switch statements on `sizeof<T>()` use correct byte values (1, 2, 4, 8), not bit values (8, 16, 32, 64).

---

### 4. Integer Underflow in Mathematical Operations [CRITICAL]

**Pattern:** Using unsigned types (u256) for values that can become negative during computation.

**Example:**
```typescript
// modInverse() uses Extended Euclidean Algorithm
// Variable 's' can become negative during calculation
public static modInverse(k: u256, p: u256): u256 {
    // ...
    s = u256.sub(old_s, u256.mul(quotient, s));  // Can underflow!
}
```

**Detection:**
- Review all mathematical algorithms (GCD, modular inverse, etc.)
- Identify variables that can go negative mathematically
- Verify signed arithmetic or conditional handling

**Impact:** Incorrect cryptographic results, signature verification failures.

---

### 5. Incorrect Deletion Marker Size [CRITICAL]

**Pattern:** Storage deletion uses wrong buffer size.

**Example:**
```typescript
public delete(key: K): bool {
    // WRONG: Should be 32 bytes to match EMPTY_BUFFER
    Blockchain.setStorageAt(storageKey, new Uint8Array(0));
}

// Elsewhere: EMPTY_BUFFER is 32 bytes
export const EMPTY_BUFFER: Uint8Array = new Uint8Array(32);
```

**Detection:**
- Find all deletion operations in storage classes
- Verify deleted marker matches `EMPTY_BUFFER` size (32 bytes)
- Check `hasStorageAt()` comparison logic

**Impact:** `has()` checks return incorrect results, data integrity issues.

---

### 6. Cache Coherence in Lazy-Loaded Storage [CRITICAL]

**Pattern:** Comparing against uninitialized cache instead of actual storage value.

**Example:**
```typescript
public set value(value: u256) {
    // BUG: Compares with unloaded cache (defaults to 0)
    if (u256.eq(value, this._value)) {
        return;  // Skips write even if storage has different value!
    }
    this._value = value;
    Blockchain.setStorageAt(this.pointerBuffer, this.__value);
}
```

**Correct pattern:**
```typescript
public set value(value: u256) {
    // Call getter which loads from storage first
    if (u256.eq(value, this.value)) {  // this.value calls ensureValue()
        return;
    }
    // ...
}
```

**Detection:**
- Find all setter methods in Stored* classes
- Verify they load from storage before comparison
- Check for `ensureValue()` or equivalent calls

---

### 7. Integer Truncation in Generic toValue() [CRITICAL]

**Pattern:** Generic value deserialization only reads first byte for multi-byte integers.

**Example:**
```typescript
private toValue(value: Uint8Array): T {
    // ...
    } else if (isInteger<T>()) {
        return value[0] as T;  // BUG: Only reads first byte!
    }
}
```

**Detection:**
- Find generic toValue/fromValue method pairs
- Verify integer handling uses BytesReader with sizeof<T>()
- Ensure round-trip consistency: `toValue(from(x)) === x`

---

### 8. Index Out of Bounds [HIGH]

**Pattern:** Array allocated with size N but accessed at index >= N.

**Example:**
```typescript
public add(value: T): void {
    const flag = new Uint8Array(1);  // Size 1
    flag[31] = 1;  // BUG: Accessing index 31!
}
```

**Detection:**
- Search for `new Uint8Array(N)` followed by index access
- Verify all index access is within bounds
- Check array initialization matches intended size

---

### 9. Off-by-One in Bounds Checking [HIGH]

**Pattern:** Using `>` instead of `>=` allows access to boundary index.

**Example:**
```typescript
if (index > this.MAX_LENGTH) {  // BUG: Allows index === MAX_LENGTH
    throw new Revert('out of range');
}
```

**Detection:**
- Find all bounds checking conditions
- Verify `>` vs `>=` is correct for the use case
- Remember: arrays are 0-indexed, so max valid index is length-1

---

### 10. Pointer Collision Risk [HIGH]

**Pattern:** Truncating address/key without hashing creates collision risk.

**Example:**
```typescript
private encodePointer(key: Address): Uint8Array {
    // BUG: Truncates without hashing - collision possible
    return encodePointer(this.pointer, key.slice(0, 30), true);
}
```

**Detection:**
- Find all pointer encoding that truncates input
- Verify hash is applied before truncation
- Calculate collision probability: 2^(bits_remaining)

---

### 11. Missing Offset Bounds Validation [MEDIUM]

**Pattern:** setOffset() allows arbitrary values without validation.

**Example:**
```typescript
public setOffset(offset: i32): void {
    this.currentOffset = offset;  // No validation!
}
```

**Detection:**
- Find all setOffset methods in buffer classes
- Verify bounds checking: 0 <= offset <= buffer.length
- Check for negative offset handling in signed types

---

## Serialization/Deserialization Audit

**This section provides a systematic approach to auditing BytesReader/BytesWriter and similar serialization code.**

### Type Consistency Matrix

For EVERY data type, verify read/write methods match:

| Data Type | Write Method | Read Method | Length (bytes) |
|-----------|--------------|-------------|----------------|
| u8 | writeU8 | readU8 | 1 |
| i8 | writeI8 | readI8 | 1 |
| u16 | writeU16 | readU16 | 2 |
| i16 | writeI16 | readI16 | 2 |
| u32 | writeU32 | readU32 | 4 |
| i32 | writeI32 | readI32 | 4 |
| u64 | writeU64 | readU64 | 8 |
| i64 | writeI64 | readI64 | 8 |
| u128 | writeU128 | readU128 | 16 |
| u256 | writeU256 | readU256 | 32 |
| Address | writeAddress | readAddress | varies |
| bytes | writeBytes | readBytes | varies |
| string | writeString | readString | varies |

### Array Serialization Checklist

| Check | Criteria | Severity |
|-------|----------|----------|
| Length field type | Same type in write and read | CRITICAL |
| Element type | Same type in write and read | CRITICAL |
| Endianness | Consistent between write/read | CRITICAL |
| Maximum length | Enforced on write AND read | HIGH |
| Empty array handling | Properly handles length=0 | MEDIUM |

### Generic Method Audit

| Check | Criteria | Severity |
|-------|----------|----------|
| Type detection | Uses `isInteger<T>()`, `isSigned<T>()` correctly | CRITICAL |
| Size mapping | `sizeof<T>()` values mapped to bytes, not bits | CRITICAL |
| Signed handling | Signed types have dedicated code path | CRITICAL |
| Reference types | `isReference<T>()` handles objects correctly | HIGH |
| Unsupported types | Throws error for unknown types | MEDIUM |

---

## Storage System Audit

### Pointer Allocation

| Check | Criteria | Severity |
|-------|----------|----------|
| Unique pointers | All storage classes have unique pointer values | CRITICAL |
| No hardcoded collisions | Pointers don't accidentally match | CRITICAL |
| Sub-pointer encoding | Keys properly hashed before encoding | HIGH |
| Truncation handling | Hash applied BEFORE any truncation | HIGH |

### Stored* Class Checklist

| Check | Criteria | Severity |
|-------|----------|----------|
| Lazy loading | `ensureValue()` called before read | CRITICAL |
| Cache consistency | Setter loads value before comparison | CRITICAL |
| Change detection | `_isChanged` flag updated correctly | HIGH |
| Deletion marker | Uses correct buffer size (32 bytes) | CRITICAL |

### StoredMap/StoredSet Checklist

| Check | Criteria | Severity |
|-------|----------|----------|
| Key encoding | Keys properly serialized and hashed | CRITICAL |
| Value encoding | Values match storage format | CRITICAL |
| Has() consistency | Returns correct result after delete | CRITICAL |
| Iteration safety | No unbounded iteration | HIGH |

### Nested Storage Checklist

| Check | Criteria | Severity |
|-------|----------|----------|
| Dynamic allocation | Codec encoding consistent | HIGH |
| Type handling | All supported types handled in toValue/from | CRITICAL |
| Integer precision | Multi-byte integers fully serialized | CRITICAL |

---

## Mathematical Operations Audit

### SafeMath Checklist

| Check | Criteria | Severity |
|-------|----------|----------|
| Overflow protection | add(), mul() check for overflow | CRITICAL |
| Underflow protection | sub() checks for underflow | CRITICAL |
| Division by zero | div(), mod() check divisor != 0 | CRITICAL |
| Signed operations | Operations that can go negative use correct types | CRITICAL |

### Algorithm-Specific Checks

| Algorithm | Specific Checks | Severity |
|-----------|-----------------|----------|
| modInverse | Uses signed arithmetic or conditional subtraction | CRITICAL |
| sqrt | Handles edge cases (0, 1, large values) | HIGH |
| log | Reverts on zero input (log(0) is undefined) | MEDIUM |
| pow | Checks for overflow in intermediate results | CRITICAL |

### Precision and Approximation

| Check | Criteria | Severity |
|-------|----------|----------|
| Taylor series convergence | Series valid for input range | CRITICAL |
| Input range validation | Rejects inputs outside valid domain | HIGH |
| Precision specification | Error bounds documented and acceptable | MEDIUM |
| Edge cases | 0, 1, MAX_VALUE handled correctly | HIGH |

**Taylor Series Audit:**
- `ln(1+x)` Taylor series only converges for |x| < 1
- For ratios approaching 2, use alternative methods (hyperbolic arctangent)
- Check `preciseLogRatio`, `calculateLnOnePlusFraction` for convergence issues

---

## Bitcoin Script Validation Audit

### P2WPKH (Pay-to-Witness-Public-Key-Hash)

| Check | Criteria | Severity |
|-------|----------|----------|
| Compressed pubkey only | Reject 65-byte uncompressed keys | CRITICAL |
| Key length validation | Accept only 33 bytes | CRITICAL |
| Hash function | Uses HASH160 (SHA256 + RIPEMD160) | CRITICAL |

**Note:** Uncompressed public keys in P2WPKH are non-standard and will not be relayed by nodes, even though technically valid.

### P2WSH (Pay-to-Witness-Script-Hash)

| Check | Criteria | Severity |
|-------|----------|----------|
| Script size limit | Reject scripts > 10,000 bytes (BIP141) | HIGH |
| Standard size warning | Warn if > 3,600 bytes (non-standard) | MEDIUM |
| Hash function | Uses SHA256 (not HASH160) | CRITICAL |

### Witness Script Validation

| Check | Criteria | Severity |
|-------|----------|----------|
| Maximum size (consensus) | 10,000 bytes per BIP141 | HIGH |
| Maximum size (standard) | 3,600 bytes for relay | MEDIUM |
| Documentation | Size limitations documented | LOW |

---

## TypeScript/Frontend/Backend Audit Checklist

### Type Safety

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| No `any` type | Zero instances of `any` | CRITICAL |
| No non-null assertion | Zero instances of `!` operator | HIGH |
| No ts-ignore | Zero instances of `@ts-ignore` | HIGH |
| No eslint-disable | Zero instances of `eslint-disable` | HIGH |
| Explicit return types | All functions have explicit return types | MEDIUM |
| Strict tsconfig | All strict options enabled | HIGH |

### Numeric Safety

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| BigInt for amounts | All satoshi/token amounts use `bigint` | CRITICAL |
| No floats for money | No floating point for financial values | CRITICAL |
| Safe number usage | `number` only for small, controlled values | HIGH |

### Caching and Performance

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Provider singleton | Single provider instance per network | HIGH |
| Contract caching | Contract instances cached by address | HIGH |
| No per-request creation | Resources not recreated on each request | HIGH |
| Cache invalidation | Cache cleared appropriately (e.g., on block change) | MEDIUM |

### Input Validation

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Address validation | `AddressVerificator.isValidAddress()` used | HIGH |
| Amount validation | User input validated before parsing | HIGH |
| Bounds checking | Numeric inputs checked for reasonable bounds | MEDIUM |

### Error Handling

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| No silent failures | Errors caught and handled/logged | HIGH |
| Proper error types | Typed errors, not generic `Error` | MEDIUM |
| User feedback | Errors communicated to users appropriately | MEDIUM |
| Consistent error types | Use `Revert` consistently in contracts, not mixed with `Error` | LOW |

---

## Bitcoin-Specific Audit Checklist

### CSV Timelocks (CRITICAL for Swaps)

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| CSV on swap recipients | All swap recipient addresses use CSV timelock | CRITICAL |
| Timelock verification | Contract verifies CSV in output scripts | CRITICAL |
| No CSV bypass | No way to receive swap funds without CSV | CRITICAL |

### UTXO Handling

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Proper UTXO selection | UTXOs selected appropriately for transaction | HIGH |
| Dust avoidance | No outputs below dust threshold | MEDIUM |
| Change handling | Change outputs handled correctly | MEDIUM |

### Transaction Security

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Malleability awareness | Code doesn't assume txid immutable before confirmation | HIGH |
| Fee sniping protection | Proper locktime handling | MEDIUM |
| RBF awareness | Replace-by-fee considered in logic | MEDIUM |

### Reorg Handling

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Reorg detection | System detects chain reorganizations | CRITICAL |
| Data reversion | Data for reorged blocks deleted/reverted | CRITICAL |
| State consistency | State remains consistent after reorg | CRITICAL |

---

## DEX/Swap Audit Checklist

### Reservation System

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Price locking | Price locked at reservation, not execution | CRITICAL |
| Reservation expiry | Reservations expire after timeout | HIGH |
| No double-spend reservations | Same UTXOs can't back multiple reservations | CRITICAL |

### Slippage and Front-Running

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Slippage protection | Maximum slippage enforced | HIGH |
| Front-running prevention | Reservation system prevents front-running | CRITICAL |
| MEV resistance | No profitable MEV extraction possible | HIGH |

### Queue and Liquidity

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Queue manipulation resistance | Slashing penalties for queue abuse | HIGH |
| Slashing implementation | Proper penalty calculation and enforcement | HIGH |
| Liquidity accounting | Virtual reserves tracked accurately | CRITICAL |

### Atomic Operations

| Check | Pass Criteria | Severity |
|-------|---------------|----------|
| Partial fill coordination | Multi-provider payments atomic | CRITICAL |
| All-or-nothing execution | Swap either completes fully or reverts | CRITICAL |

---

## Common Vulnerabilities by Category

### CRITICAL Severity

| ID | Vulnerability | Detection Pattern | Impact |
|----|---------------|-------------------|--------|
| C-01 | Integer Overflow | Raw `+`, `*` on u256 without SafeMath | Fund loss, state corruption |
| C-02 | Integer Underflow | u256.sub() without checking a >= b | State corruption, infinite balances |
| C-03 | Missing CSV | Swap addresses without timelock | Transaction pinning attacks |
| C-04 | Unbounded Loop | `while` loop or `for` without max | Contract halt, gas drain |
| C-05 | Reentrancy | State change after external call | Fund drain |
| C-06 | Missing Reorg Handling | Plugin without `onReorg()` | Data inconsistency |
| C-07 | Serialization Mismatch | Write type != Read type | Data corruption |
| C-08 | Type Size Confusion | sizeof<T>() bytes treated as bits | Truncated data |
| C-09 | Signed/Unsigned Confusion | i8 cast to u8 | Sign loss, wrong values |
| C-10 | Cache Coherence | Setter compares to unloaded cache | Silent state corruption |
| C-11 | Storage Deletion Bug | Wrong deletion marker size | has() returns wrong result |
| C-12 | Generic Integer Truncation | Only reading first byte of integers | Data loss |

### HIGH Severity

| ID | Vulnerability | Detection Pattern | Impact |
|----|---------------|-------------------|--------|
| H-01 | Type Coercion | `any` type in codebase | Runtime errors, exploits |
| H-02 | Precision Loss | `number` for satoshis | Incorrect amounts |
| H-03 | Non-Null Assertion | `!` operator usage | Null reference crashes |
| H-04 | Multiple Instances | Provider/contract per-request | Performance, state issues |
| H-05 | Missing Authorization | No sender check on sensitive methods | Unauthorized access |
| H-06 | Index Out of Bounds | Array access beyond allocated size | Memory corruption |
| H-07 | Off-by-One Bounds | `>` instead of `>=` in bounds check | Buffer overflow |
| H-08 | Pointer Collision | Truncating without hashing | Storage overwrites |
| H-09 | Missing Offset Validation | setOffset() accepts any value | Buffer over/underflow |
| H-10 | P2WPKH Uncompressed Key | Accepting 65-byte public keys | Non-relayable transactions |

### MEDIUM Severity

| ID | Vulnerability | Detection Pattern | Impact |
|----|---------------|-------------------|--------|
| M-01 | Missing Input Validation | User input used directly | Invalid state, errors |
| M-02 | Silent Failures | Empty catch blocks | Hidden bugs |
| M-03 | Improper Error Handling | Generic errors thrown | Poor debugging |
| M-04 | Inconsistent Error Types | Mixed Revert/Error usage | Confusing error handling |
| M-05 | Taylor Series Divergence | Using approximation outside valid range | Incorrect math results |
| M-06 | Log of Zero | log(0) returns 0 instead of reverting | Collision with log(1) |
| M-07 | Witness Script Size | No validation against 3,600 byte standard | Non-relayable scripts |

### LOW/INFO Severity

| ID | Vulnerability | Detection Pattern | Impact |
|----|---------------|-------------------|--------|
| L-01 | Inconsistent Length Checks | `<=` vs `==` for expected length | Potential edge cases |
| L-02 | Missing Cache Optimization | delete() not using cache lookup | Performance |
| L-03 | Immutability Bypass | Inherited methods bypass protection | Unexpected mutations |
| L-04 | Hash Truncation | Reducing hash from 32 to 30 bytes | Reduced collision resistance |
| L-05 | Incorrect Generic Type | Wrong type parameter in generic class | Compilation/runtime issues |

---

## Audit Report Template

```markdown
# Security Audit Report

## Project: [Project Name]
## Date: [Date]
## Auditor: AI-Assisted Review

---

## DISCLAIMER

IMPORTANT DISCLAIMER: This audit is AI-assisted and may contain errors,
false positives, or miss critical vulnerabilities. This is NOT a substitute
for a professional security audit by experienced human auditors.
Do NOT deploy to production based solely on this review.
Always engage professional auditors for contracts handling real value.

---

## Executive Summary

[Brief overview of findings]

### Severity Summary

| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |
| Informational | X |

---

## Scope

### Files Audited

| File | Lines | Description |
|------|-------|-------------|
| [file.ts] | [N] | [Description] |

### Commit

- Repository: [repo URL]
- Commit: [hash]

---

## Findings

### [CRITICAL]-001: [Title]

**Severity:** Critical
**Location:** `file.ts:line`
**Category:** [Serialization/Storage/Math/Bitcoin/Access Control/etc.]

**Description:**
[What the issue is - be specific]

**Code:**
```typescript
// Vulnerable code
```

**Impact:**
[What could happen if exploited]

**Recommendation:**
[How to fix - include code example]

**References:**
- [Link to similar vulnerability or documentation]

---

## Checklist Results

### Serialization/Deserialization
- [ ] Write/read type consistency verified
- [ ] Array length serialization matches
- [ ] Generic methods handle all integer sizes
- [ ] Signed/unsigned types handled correctly

### Storage System
- [ ] All pointers unique
- [ ] Cache coherence in setters
- [ ] Deletion markers correct size
- [ ] has() returns correct results after delete

### Mathematical Operations
- [ ] SafeMath used for all u256 arithmetic
- [ ] Signed operations use correct types
- [ ] log/sqrt/pow handle edge cases
- [ ] Approximation functions valid for input range

### Bitcoin-Specific
- [ ] CSV timelocks on swap addresses
- [ ] P2WPKH rejects uncompressed keys
- [ ] Witness script size validated
- [ ] Reorg handling implemented

### Type Safety
- [ ] No `any` type
- [ ] No non-null assertions
- [ ] BigInt for amounts
- [ ] Explicit return types

---

## Recommendations

### Critical (Fix Immediately)
1. [Recommendation]

### High (Fix Before Deployment)
1. [Recommendation]

### Medium (Fix When Possible)
1. [Recommendation]

### Low (Consider Fixing)
1. [Recommendation]

---

## REMINDER

This audit is AI-assisted and has limitations. Always engage professional
human auditors before deploying contracts that handle real value.
```

---

## Summary

1. **ALWAYS include the disclaimer** - every audit, no exceptions
2. **Read the security docs first** - know what secure code looks like
3. **Use the checklists** - systematic review catches more issues
4. **Check btc-runtime specific patterns** - serialization, storage, math
5. **Verify type consistency** - write/read pairs, sizeof mapping
6. **Check cache coherence** - lazy loading + comparison = bugs
7. **Audit mathematical algorithms** - signed arithmetic, convergence
8. **Validate Bitcoin-specific code** - P2WPKH/P2WSH, witness scripts
9. **Never claim completeness** - AI audits have inherent limitations
