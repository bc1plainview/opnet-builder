# OPNet Audit Checklists & Vulnerability Patterns

This file contains the detailed audit checklists and vulnerability pattern tables extracted from the main SKILL.md for progressive disclosure. Read this file COMPLETELY before starting any security audit.

---

## DISCLAIMER (MANDATORY IN EVERY REPORT)

```
IMPORTANT DISCLAIMER: This audit is AI-assisted and may contain errors,
false positives, or miss critical vulnerabilities. This is NOT a substitute
for a professional security audit by experienced human auditors.
Do NOT deploy to production based solely on this review.
Always engage professional auditors for contracts handling real value.
```

---

## Mandatory Reading Order for Audits

**Read ALL of these IN ORDER before starting ANY audit:**

| Order | File | Why Required |
|-------|------|--------------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules that define secure code |
| 2 | `guidelines/audit-guidelines.md` | **COMPLETE AUDIT GUIDE** - vulnerability patterns, checklists, detection methods |

**Then read based on code type:**

| Code Type | Additional Required Reading |
|-----------|----------------------------|
| Smart Contracts | `docs/contracts-btc-runtime-core-concepts-security.md`, `docs/contracts-btc-runtime-gas-optimization.md`, `docs/contracts-btc-runtime-api-reference-safe-math.md`, `docs/contracts-btc-runtime-types-bytes-writer-reader.md` |
| DEX/Swap Code | SKILL.md - CSV, NativeSwap, Slashing sections |
| Frontend | `guidelines/frontend-guidelines.md` |
| Backend | `guidelines/backend-guidelines.md` |
| Plugins | `guidelines/plugin-guidelines.md` - Reorg Handling section |

---

## AUDIT VERIFICATION CHECKPOINT

**BEFORE writing ANY audit findings, confirm:**

- [ ] I have read `guidelines/audit-guidelines.md` completely
- [ ] I have read `docs/core-typescript-law-CompleteLaw.md` completely
- [ ] I have read ALL additional docs for this code type
- [ ] I understand the Critical Runtime Vulnerability Patterns section
- [ ] I understand serialization/deserialization consistency requirements
- [ ] I understand storage system cache coherence issues
- [ ] I understand Bitcoin-specific attack vectors (CSV, pinning, reorgs)

**If you cannot check ALL boxes, GO BACK AND READ THE DOCS.**

---

## Smart Contract Audit Checklist

**See `guidelines/audit-guidelines.md` for COMPLETE checklists with detection patterns.**

| Category | Check For |
|----------|-----------|
| **Arithmetic** | All u256 operations use SafeMath (no raw `+`, `-`, `*`, `/`) |
| **Overflow/Underflow** | SafeMath.add(), SafeMath.sub(), SafeMath.mul(), SafeMath.div() |
| **Access Control** | onlyOwner checks, authorization on sensitive methods |
| **Reentrancy** | State changes BEFORE external calls (checks-effects-interactions) |
| **Gas/Loops** | No `while` loops, all `for` loops bounded, no unbounded iterations |
| **Storage** | No iterating all map keys, stored aggregates for totals |
| **Input Validation** | All user inputs validated, bounds checked |
| **Integer Handling** | u256 created via fromString() for large values, not arithmetic |
| **Serialization** | Write/read type consistency, sizeof<T>() mapping correct |
| **Cache Coherence** | Setters load from storage before comparison |
| **Deletion Markers** | Storage deletion uses 32-byte EMPTY_BUFFER |
| **Bounds Checking** | `>=` not `>` for max index checks |

## TypeScript/Frontend/Backend Audit Checklist

| Category | Check For |
|----------|-----------|
| **Type Safety** | No `any`, no non-null assertions (the ! operator), no `@ts-ignore` |
| **Null Safety** | Explicit null checks, optional chaining used correctly |
| **BigInt** | All satoshi/token amounts use `bigint`, not `number` |
| **No Floats** | No floating point for financial calculations |
| **Caching** | Provider/contract instances cached, not recreated |
| **Input Validation** | Address validation, amount validation, bounds checking |
| **Error Handling** | Errors caught and handled, no silent failures |
| **Provider Type** | Use JSONRpcProvider (WebSocketProvider is experimental) |

## Bitcoin-Specific Audit Checklist

| Category | Check For |
|----------|-----------|
| **CSV Timelocks** | All swap recipient addresses use CSV (anti-pinning) |
| **UTXO Handling** | Proper UTXO selection, dust outputs avoided |
| **Transaction Malleability** | Signatures not assumed immutable before confirmation |
| **Fee Sniping** | Proper locktime handling |
| **Reorg Handling** | Data deleted/reverted for reorged blocks |
| **P2WPKH** | Only compressed pubkeys (33 bytes), reject uncompressed |
| **Witness Script Size** | Validate against 3,600 byte standard limit |

## DEX/Swap Audit Checklist

| Category | Check For |
|----------|-----------|
| **Reservation System** | Prices locked at reservation, not execution |
| **Slippage Protection** | Maximum slippage enforced |
| **Front-Running** | Reservation system prevents front-running |
| **Queue Manipulation** | Slashing penalties for queue abuse |
| **Partial Fills** | Atomic coordination of multi-provider payments |

## Critical Runtime Vulnerability Patterns

**See `guidelines/audit-guidelines.md` for COMPLETE patterns with code examples.**

| ID | Vulnerability | Impact |
|----|---------------|--------|
| C-07 | Serialization Mismatch (write u16, read u32) | Data corruption |
| C-08 | sizeof<T>() bytes treated as bits | Truncated data |
| C-09 | Signed/unsigned type confusion (i8 → u8) | Sign loss |
| C-10 | Cache coherence (setter compares to unloaded cache) | Silent state corruption |
| C-11 | Wrong deletion marker size | has() returns wrong result |
| C-12 | Generic integer truncation (only reading first byte) | Data loss |
| H-06 | Index out of bounds | Memory corruption |
| H-07 | Off-by-one (`>` instead of `>=`) | Buffer overflow |
| H-08 | Pointer collision (truncate without hash) | Storage overwrites |
| M-05 | Taylor series divergence | Incorrect math |

## All Code Must Be Checked For

### Cryptographic
- [ ] Key generation entropy
- [ ] Nonce reuse
- [ ] Signature malleability
- [ ] Timing attacks
- [ ] Replay attacks

### Smart Contract
- [ ] Reentrancy
- [ ] Integer overflow/underflow
- [ ] Access control bypass
- [ ] Authorization flaws
- [ ] State manipulation
- [ ] Race conditions

### Bitcoin-specific
- [ ] Transaction malleability
- [ ] UTXO selection vulnerabilities
- [ ] Fee sniping
- [ ] Dust attacks
- [ ] **Transaction pinning attacks** - MUST use CSV timelocks
- [ ] **Unconfirmed transaction chains** - Verify CSV enforcement

### DEX/Swap-specific
- [ ] Front-running / MEV attacks
- [ ] Price manipulation via queue flooding
- [ ] Reservation expiry edge cases
- [ ] Partial fill coordination
- [ ] Slashing mechanism bypass attempts

---

**ALWAYS end audit reports with the disclaimer. NEVER claim the audit is complete or guarantees security.**
