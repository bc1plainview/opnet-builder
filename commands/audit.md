# /audit — Security Audit Workflow

Run a comprehensive security audit against OPNet-specific vulnerability patterns.

## Workflow

### Step 1: Read Mandatory Audit Docs

You MUST read ALL of these before auditing ANY code:

1. `skills/docs/core-typescript-law-CompleteLaw.md` — Type rules that define secure code
2. `skills/guidelines/audit-guidelines.md` — Complete audit guide with vulnerability patterns, checklists, detection methods

Then read based on code type:

| Code Type | Additional Required Reading |
|-----------|----------------------------|
| Smart Contracts | `skills/docs/contracts-btc-runtime-core-concepts-security.md`, `skills/docs/contracts-btc-runtime-gas-optimization.md`, `skills/docs/contracts-btc-runtime-api-reference-safe-math.md`, `skills/docs/contracts-btc-runtime-types-bytes-writer-reader.md` |
| Frontend | `skills/guidelines/frontend-guidelines.md` |
| Backend | `skills/guidelines/backend-guidelines.md` |
| Plugins | `skills/guidelines/plugin-guidelines.md` |

### Step 2: Verification Checkpoint

Before writing ANY findings, confirm:

- [ ] Read `guidelines/audit-guidelines.md` completely
- [ ] Read `core-typescript-law-CompleteLaw.md` completely
- [ ] Read ALL additional docs for this code type
- [ ] Understand Critical Runtime Vulnerability Patterns
- [ ] Understand serialization/deserialization consistency
- [ ] Understand storage system cache coherence issues
- [ ] Understand Bitcoin-specific attack vectors (CSV, pinning, reorgs)

### Step 3: Run Checklists

#### Smart Contract Checklist
| Category | Check For |
|----------|-----------|
| Arithmetic | All u256 operations use SafeMath |
| Overflow/Underflow | SafeMath.add(), sub(), mul(), div() |
| Access Control | onlyOwner checks on sensitive methods |
| Reentrancy | State changes BEFORE external calls |
| Gas/Loops | No `while` loops, all `for` loops bounded |
| Storage | No iterating all map keys, stored aggregates |
| Input Validation | All user inputs validated, bounds checked |
| Serialization | Write/read type consistency |
| Cache Coherence | Setters load from storage before comparison |

#### TypeScript/Frontend/Backend Checklist
| Category | Check For |
|----------|-----------|
| Type Safety | No `any`, no non-null assertions, no `@ts-ignore` |
| BigInt | All satoshi/token amounts use `bigint` |
| Caching | Provider/contract instances cached |
| Input Validation | Address validation, amount validation |
| Error Handling | Errors caught, no silent failures |

#### Bitcoin-Specific Checklist
| Category | Check For |
|----------|-----------|
| CSV Timelocks | All swap recipient addresses use CSV |
| UTXO Handling | Proper selection, no dust outputs |
| Reorg Handling | Data reverted for reorged blocks |

### Step 4: Report

Generate a structured audit report with:
- Executive summary
- Severity ratings (Critical / High / Medium / Low / Informational)
- Detailed findings with code references
- Recommended fixes

### Step 5: Mandatory Disclaimer

ALWAYS end every audit report with:

```
IMPORTANT DISCLAIMER: This audit is AI-assisted and may contain errors,
false positives, or miss critical vulnerabilities. This is NOT a substitute
for a professional security audit by experienced human auditors.
Do NOT deploy to production based solely on this review.
Always engage professional auditors for contracts handling real value.
```
