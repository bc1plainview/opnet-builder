# Distributed DKG for Threshold ML-DSA

## Goal

Eliminate the trusted dealer from threshold ML-DSA key generation.
Achieve all four properties simultaneously:

1. **No trusted dealer**
2. **Structural secrecy** — no single party ever has material to reconstruct
   the full secret, even temporarily
3. **Forced randomness** — no party can bias, equivocate, or sabotage shares
   (given honest minority in each bitmask subgroup)
4. **Minimal public leakage** — public transcript reveals only the aggregate
   public key, matching standard ML-DSA

The resulting public key and signatures are standard FIPS 204 ML-DSA —
indistinguishable from non-threshold usage.

---

## Design Decisions

### Why not a global seed?

An alternative ("DKG for a seed S") was considered: all parties coin-flip a
global `S`, then derive all shares deterministically. **Rejected** because
every party can compute every share from `S` — structural secrecy requires
trusted deletion, a behavioral guarantee.

### Why not per-generator local randomness?

Our previous revision had each generator sample shares with local randomness.
This gives structural secrecy but allows a malicious generator to:
- Bias shares within `[-eta, eta]` undetectably
- Equivocate (send different shares to different holders)
- Sabotage (commit to garbage that passes norm checks but causes signing issues)

While Theorem 6 (below) shows LeqEta bias has no known exploit, equivocation
and sabotage are practical concerns that can be eliminated.

### The hybrid: per-bitmask seed derivation

**Core idea**: For each bitmask `b`, the holders of `b` jointly derive
`seed_b` via a mini coin-flip. Shares are then deterministically derived
from `seed_b`.

This gives:
- **Structural secrecy**: Non-holders never learn `seed_b` (reveals are
  private to the subgroup)
- **Forced randomness**: Shares are deterministic from `seed_b`, which is
  unbiased if at least one holder is honest
- **No equivocation**: All holders independently compute the same share
  from `seed_b` — there is nothing to "send wrong"
- **No sabotage**: Shares are forced by the jointly-determined seed

| Property | Global seed | Per-generator local | Per-bitmask seed (this plan) |
|---|---|---|---|
| Structural secrecy | No (all know S) | **Yes** | **Yes** |
| Unbiased shares | Yes | No | **Yes** (honest minority) |
| No equivocation | Yes (deterministic) | No (needs complaints) | **Yes** (deterministic) |
| No sabotage | Yes | No | **Yes** |
| Honest-party req for bias defense | 1 of N | N/A | 1 per bitmask subgroup |

### Bias defense threshold

Per-bitmask coin-flips require at least one honest holder per bitmask for
unbiased seed derivation. Each bitmask has `k = N - T + 1` holders. If
there are `f` malicious parties, a bitmask is fully compromised only if all
`k` holders are malicious, requiring `f >= k = N - T + 1`.

Since the threshold scheme already assumes `f < T` (otherwise the adversary
holds enough shares to sign), we need `N - T + 1 > T - 1`, i.e., `N >= 2T - 1`.

For supported parameters:

| (T, N) | N >= 2T-1? | Guaranteed honest holder per bitmask? |
|---|---|---|
| (2, 3) | 3 >= 3 ✅ | Yes |
| (2, 4) | 4 >= 3 ✅ | Yes |
| (2, 5) | 5 >= 3 ✅ | Yes |
| (2, 6) | 6 >= 3 ✅ | Yes |
| (3, 4) | 4 >= 5 ❌ | Not always — see note |
| (3, 5) | 5 >= 5 ✅ | Yes |
| (3, 6) | 6 >= 5 ✅ | Yes |
| (4, 5) | 5 >= 7 ❌ | Not always — see note |
| (4, 6) | 6 >= 7 ❌ | Not always — see note |
| (5, 6) | 6 >= 9 ❌ | Not always — see note |

**Note for cases where N < 2T-1:** When `T` malicious parties could control
an entire bitmask subgroup, they can bias that bitmask's share. However:
- This requires `T-1` colluding parties (the max allowed), all placed in the
  same bitmask — a worst-case collusion
- Even then, bias is constrained to `[-eta, eta]` (norm checks still apply)
- Per Theorem 6, bias within LeqEta bounds has no known security impact
- This is still **strictly better** than per-generator local randomness,
  where a SINGLE malicious party can bias any share they generate

---

## Hard Invariants

**I1. Global `rho` is used ONLY for matrix A expansion and generator assignment.**
No share material is ever derived from global `rho`. All shares come exclusively
from holder-private `seed_b` values.

**I2. Every share `(s1^b, s2^b)` is derived from `seed_b`, which is known ONLY to holders of `b`.**
Non-holders never see `seed_b`, its inputs `{r_{i,b}}`, or the resulting share.
This is a structural guarantee — it does not depend on any party deleting data.

---

## Prerequisites

**P1. Authenticated confidential channels — REQUIRED.**
Pairwise authenticated + encrypted channels between all parties are a **MUST**
for the DKG protocol. Without confidential channels, the protocol provides
**no security guarantees**.

The DKG API **MUST** accept a `ConfidentialChannel` primitive (or equivalent
transport abstraction) as a required parameter. Implementations **MUST NOT**
fall back to plaintext delivery.

Required for: bitmask seed reveals (Phase 2), mask piece delivery (Phase 3).
Both carry secret material that, if intercepted, destroys structural secrecy.

**P2. Broadcast channel.**
Reliable broadcast visible to all parties.
Required for: commitments (Phase 1), rho reveals (Phase 2), aggregates
(Phase 4).

**P3. Liveness.**
All N parties must complete all phases. Abort → restart with new session ID.

---

## Protocol: 4-Phase Distributed DKG

### Phase 0 — Setup (offline, deterministic)

All parties agree on `(T, N, securityLevel, session_id)`.

`session_id`: unique 32-byte identifier for this DKG instance (domain
separation, cross-session replay prevention).

Derive:
- Bitmask set `B`: all `C(N, N-T+1)` bitmasks with `(N-T+1)` bits set
  (enumerated via Gosper's hack)
- Sharing pattern via `getSharingPattern(T, N)` (for signing, not DKG)


### Phase 1 — Commit (1 broadcast per party)

Each party `i` independently:

1. Samples `rho_i <- {0,1}^{256}` (entropy for public matrix seed)
2. For each bitmask `b` where bit `i` is set (i.e., `i` is a holder of `b`):
   - Samples `r_{i,b} <- {0,1}^{256}` (entropy contribution for bitmask seed)
3. Computes and **broadcasts** a single message:
   ```
   {
     C_i^rho = SHAKE256("DKG-RHO-COMMIT" || sid || encode_u8(i) || rho_i, dkLen=32),
     { b -> C_{i,b} = SHAKE256("DKG-BSEED-COMMIT" || sid || encode_u16le(b) || encode_u8(i) || r_{i,b}, dkLen=32)
       for each b where i in b }
   }
   ```

All parties collect all Phase 1 broadcasts before proceeding.


### Phase 2 — Reveal & Derive (1 broadcast + private messages per party)

**Step 2a: Broadcast rho reveal**

Each party `i` **broadcasts** `rho_i`.
All parties verify: `SHAKE256("DKG-RHO-COMMIT" || sid || encode_u8(i) || rho_i, dkLen=32) == C_i^rho`.
Abort if any check fails.

**Step 2b: Private bitmask seed reveals**

For each bitmask `b` where bit `i` is set:
- Party `i` sends `r_{i,b}` to each fellow holder `j in b, j != i`
  via **confidential channel**

Non-holders of `b` never see any `r_{*,b}` values.

**Step 2c: Verify bitmask seed commitments**

Each holder `j` of bitmask `b`, upon receiving `{r_{i,b} : i in b, i != j}`:
- Verifies each: `SHAKE256("DKG-BSEED-COMMIT" || sid || encode_u16le(b) || encode_u8(i) || r_{i,b}, dkLen=32) == C_{i,b}`
- If any check fails for party `i`: **abort** (party `i` equivocated on
  their bitmask entropy). Restart with new session ID excluding `i`.

**Step 2d: Derive joint rho, A, and generator assignment**

All parties compute:
```
rho = SHAKE256("DKG-RHO-AGG" || sid || rho_0 || rho_1 || ... || rho_{N-1}, dkLen=32)
```
Expand matrix `A` from `rho` via `XOF128`.

For each bitmask `b`, deterministic balanced generator assignment:
```
g_raw = SHAKE256("DKG-GEN-ASSIGN" || sid || rho || encode_u16le(b), dkLen=1)
parties_in_b = sorted [i : bit i set in b]
gen(b) = parties_in_b[g_raw[0] mod |parties_in_b|]
```

**Step 2e: Derive bitmask seeds and shares**

Each holder `j` of bitmask `b` independently computes:
```
seed_b = SHAKE256("DKG-BSEED" || sid || encode_u16le(b) || r_{p0,b} || r_{p1,b} || ... || r_{pk,b}, dkLen=64)
```
where `p0 < p1 < ... < pk` are the holders of `b` in sorted order, and
`dkLen=64` because `deriveUniformLeqEta` requires a 64-byte seed.

**Serialization convention for all hash inputs:**
- `b` (bitmask): 2 bytes, unsigned 16-bit little-endian (`encode_u16le`)
- `i` (party index): 1 byte, unsigned 8-bit (`encode_u8`)
- `sid`: 32 bytes, raw
- `r_{i,b}`, `rho_i`: 32 bytes, raw
- Domain tags: UTF-8 encoded, no length prefix (fixed-length per tag)

Then deterministically derives the share:
```
for j = 0..L-1: s1^b[j] = deriveUniformLeqEta(seed_b, j)
for j = 0..K-1: s2^b[j] = deriveUniformLeqEta(seed_b, j + L)
s1Hat^b[j] = NTT(s1^b[j]) for each j
s2Hat^b[j] = NTT(s2^b[j]) for each j
```

All holders of `b` arrive at the **identical** share — no distribution needed.

**Hygiene (nice-to-have, NOT a security requirement):** After deriving shares,
parties SHOULD zero `seed_b` and all `r_{*,b}` values from memory. This is
defense-in-depth against memory dumps but is NOT load-bearing — the security
model (Invariant I2) provides structural secrecy without relying on deletion.
Shares themselves are retained for signing.


### Phase 3 — Masked Aggregation Distribution (private messages)

For each bitmask `b`, the designated generator `gen(b)`:

1. Computes the partial public key contribution:
   ```
   w^b = InvNTT(A * s1Hat^b) + s2^b    (vector of K polynomials in R_q^K)
   ```

2. Normalizes `w^b` coefficients to `[0, Q)`: `coeff = ((coeff % Q) + Q) % Q`

3. Splits `w^b` into N info-theoretic masks via `splitVectorK(w^b, N, Q, gen(b))`:
   - Sample `r_{b,j}` uniformly from `R_q^K` for all `j != gen(b)`
   - Compute `r_{b,gen(b)} = w^b - sum_{j != gen(b)} r_{b,j}  (mod q)`
     (residual stays with generator — no wire transmission of the non-random piece)
   - Send `r_{b,j}` to party `j` via **confidential channel** (for j != gen(b))
   - Keep `r_{b,gen(b)}` locally

**Note on mask verification:** Individual holders cannot verify their mask
piece `r_{b,h}` in isolation — they would need all N pieces to reconstruct
`w^b` and compare. Instead, **test signing** (after Phase 4) serves as the
aggregate verification: if a generator distributed inconsistent masks, the
public key will be wrong and signing will fail. This is sufficient because
mask corruption is detectable (wrong signatures) even if not attributable
to a specific generator.


### Phase 4 — Aggregate & Finalize (1 broadcast per party)

Each party `j`:

1. Computes local aggregate:
   ```
   R_j = sum over all b in B of r_{b,j}   (mod q, vector in R_q^K)
   ```
2. **Broadcasts** `R_j`

**Finalization (all parties, deterministic):**

```
t = sum_{j=0}^{N-1} R_j   (mod q)
```

Correctness (masks cancel):
```
t = sum_j R_j
  = sum_j sum_b r_{b,j}
  = sum_b sum_j r_{b,j}         (swap finite sums)
  = sum_b w^b                    (mask reconstruction)
  = sum_b (A * s1^b + s2^b)
  = A * (sum_b s1^b) + (sum_b s2^b)
  = A * s1_total + s2_total
```

Then:
- `(t0, t1) = Power2Round(t)`
- `publicKey = Encode(rho, t1)`
- `tr = SHAKE256(publicKey, dkLen=TR_BYTES)`

Each party constructs their `ThresholdKeyShare`:
```typescript
{
  id: j,
  rho: rho,
  key: randomBytes(32),   // per-party, locally generated
  tr: tr,
  shares: Map<bitmask, SecretShare>  // only for bitmasks where bit j is set
}
```

**Post-DKG verification (recommended):**
Parties perform a test threshold signing of a known message. If the
resulting signature verifies against the public key, the DKG succeeded.
If not, a party cheated during mask distribution — restart.

---

## Complaint / Abort Protocol

The per-bitmask seed design eliminates most complaint scenarios:

| Attack | Per-generator local (old plan) | Per-bitmask seed (this plan) |
|---|---|---|
| Biased share | Undetectable (within LeqEta) | **Impossible** (forced by seed) |
| Equivocated share | Detected by commitment check | **Impossible** (all holders compute independently) |
| Wrong share sent | Detected by commitment check | **Impossible** (no share sending needed) |
| Withheld bitmask reveal | N/A | Detected → abort + restart |
| Wrong mask pieces | Signing fails | Detected by test sign → restart |
| Withheld mask piece | Protocol stuck | Detected → abort + restart |

**Remaining abort scenarios:**

1. **Withheld reveal (Phase 2):** Party commits in Phase 1 but doesn't
   reveal `r_{i,b}` in Phase 2. Fellow holders detect the timeout.
   → Abort, restart excluding the non-responsive party.

2. **Wrong commitment reveal (Phase 2):** Party reveals `r_{i,b}` that
   doesn't match `C_{i,b}`. Fellow holders detect immediately.
   → Abort, restart excluding the cheater.

3. **Withheld mask piece (Phase 3):** Generator doesn't send `r_{b,j}` to
   some party. Party `j` detects missing mask piece.
   → Abort, restart.

4. **Corrupt mask pieces (Phase 3):** Generator sends masks that don't
   sum to `w^b`. Detected by test signing (wrong public key).
   → Abort, restart.

All abort scenarios lead to restart with a new `session_id`. Per Theorem 5,
this is safe.

---

## Theorems and Proofs

### Theorem 1 (Correctness)

**Statement.** The distributed DKG produces a valid ML-DSA public key
`(rho, t1)`, and the resulting `ThresholdKeyShare` values are compatible
with the existing threshold signing protocol.

**Proof.**

The total secret: `s1 = sum_{b in B} s1^b`, `s2 = sum_{b in B} s2^b`.

Each `(s1^b, s2^b)` is derived via `deriveUniformLeqEta(seed_b, ...)`,
which produces polynomials with coefficients in `[-eta, eta]` — identical
to the trusted dealer's derivation method.

```
t = A * s1 + s2
  = sum_b (A * s1^b + s2^b)    [linearity]
  = sum_b w^b                   [definition]
  = sum_b sum_j r_{b,j}         [mask reconstruction]
  = sum_j R_j                   [swap, definition]
```

Mask cancellation: `sum_j r_{b,j} = w^b` by construction.

`Power2Round(t)` yields `(t0, t1)`, `publicKey = Encode(rho, t1)` is a
valid FIPS 204 public key.

For signing: `#recoverShare` selects shares by bitmask and sums them.
It depends only on share values and the sharing pattern. Shares from the
distributed DKG are functionally identical to trusted dealer shares. QED.


### Theorem 2 (No single party can reconstruct the full secret)

**Statement.** For every party `i`, there exists at least one bitmask
`b* in B` such that `i not in b*`. Party `i` never learns `seed_{b*}` or
`(s1^{b*}, s2^{b*})`, and therefore cannot reconstruct `(s1, s2)`.

**Proof.**

*Existence of b*:* Bitmasks have `(N-T+1)` bits set. The number NOT
containing bit `i` is `C(N-1, N-T+1) > 0` for `T >= 2`. ✓

*Structural separation:* `seed_{b*}` is derived from `{r_{i,b*} : i in b*}`.
Since `i not in b*`, party `i`:
- Did not contribute any `r_{i,b*}` (they're not a holder)
- Never received any `r_{k,b*}` (reveals are private to holders of `b*`)
- Cannot compute `seed_{b*}` (missing all inputs except the broadcast
  commitments, which are SHAKE256 hashes)

Therefore party `i` cannot derive `(s1^{b*}, s2^{b*})`.

*Computational residual:* The public transcript reveals only
`t = A * s1 + s2`. Party `i` can subtract their known shares' contributions
to get `A * s1^{b*} + s2^{b*} + [other unknown terms]`. In the best case
for the adversary (only one unknown bitmask), this is a single Module-LWE
sample. Recovery requires solving MLWE. QED.


### Theorem 3 (Forced randomness — no adaptive or a priori bias)

**Statement.** If at least one holder of bitmask `b` is honest, then
`seed_b` is computationally indistinguishable from uniform, and the derived
share `(s1^b, s2^b)` has the canonical LeqEta distribution.

**Proof.**

*Commit-before-reveal prevents adaptive choice:*
All parties commit to `r_{i,b}` in Phase 1 before any reveals in Phase 2.
Changing `r_{i,b}` after committing requires a SHAKE256 second preimage.

*Honest contribution forces uniformity:*
Let party `h` be the honest holder. After all commitments are broadcast,
`r_{h,b}` is uniformly random and independent of all other `r_{i,b}` values
(which were committed before `r_{h,b}` was chosen — actually, all are
committed simultaneously, but the binding property ensures no party can
adapt after committing).

`seed_b = SHAKE256("DKG-BSEED" || sid || encode_u16le(b) || r_{p0,b} || ... || r_{pk,b}, dkLen=64)`

In the random oracle model, if `r_{h,b}` is uniform and independent of the
other inputs (given the binding of their commitments), then `seed_b` is
indistinguishable from uniform.

*Deterministic derivation preserves distribution:*
`deriveUniformLeqEta(seed_b, nonce)` uses SHAKE256 as a PRF to produce
coefficients with the uniform LeqEta distribution. If `seed_b` is
pseudorandom, the output distribution is computationally indistinguishable
from the canonical LeqEta distribution.

*No equivocation:* All holders independently compute `seed_b` from the
same inputs, arriving at the same share. There is no "distribution" of
shares between holders — each computes locally. QED.


### Theorem 4 (Public-key transcript equivalence)

**Statement.** The public transcript reveals only information equivalent
to the standard ML-DSA public key `(rho, t1)`. No per-bitmask MLWE samples
are leaked.

**Proof.**

Public transcript consists of:
1. `{C_i^rho}` — SHAKE256 hashes (preimage-resistant)
2. `{C_{i,b}}` — SHAKE256 hashes (preimage-resistant)
3. `{rho_i}` — random nonces, aggregate determines `rho` (already public)
4. `{R_j}` — per-party masked aggregates

*R_j values are statistically uniform:*

`R_j = sum_b r_{b,j}`. For at least one bitmask `b'` where `gen(b') != j`,
the term `r_{b',j}` was sampled uniformly by the generator. A sum including
at least one uniform independent term is itself uniform.

*Only the sum carries signal:*

`(R_0, ..., R_{N-1})` is constrained by `sum_j R_j = t`. Any strict subset
`{R_j : j in S, |S| < N}` is independent of individual `w^b` values. This
is the standard property of additive N-out-of-N secret sharing.

The extractable information equals one MLWE sample `(A, t)` — matching
standard ML-DSA key generation exactly. QED.


### Theorem 5 (Abort safety and session isolation)

**Statement.** Abort at any phase is safe. Restarting with a fresh
`session_id` produces an independent DKG instance. No cross-session
information leakage.

**Proof.**

*Domain separation:* `session_id` is incorporated into every hash/commitment.
Cross-session replay requires SHAKE256 collision.

*Phase 1 abort:* Only hash commitments broadcast — no secret material.

*Phase 2 abort:* Revealed `rho_i` are non-sensitive random nonces. Revealed
`r_{i,b}` values (to fellow holders) belong to an aborted session's seed.
The new session samples fresh `r_{i,b}'` values from independent randomness.
Even if an adversary learns some `r_{i,b}` from the old session, these are
uncorrelated with the new session's values.

*Phase 3 abort:* Mask pieces `r_{b,j}` are uniform random (statistically
independent of secrets without the full set).

*Phase 4 abort:* `R_j` values are uniform (Theorem 4). QED.


### Theorem 6 (LeqEta bias within range is not exploitable)

**Statement.** In the edge case where ALL holders of some bitmask `b` are
malicious (possible when `N < 2T - 1`), they can bias `seed_b` and hence
`(s1^b, s2^b)`. This does not compromise:
(a) signature unforgeability,
(b) secret recovery hardness, or
(c) overall MLWE security.

**Proof.**

Even with adversarial choice of `seed_b`, the derived shares satisfy
`coeff in [-eta, eta]` (enforced by `deriveUniformLeqEta`'s rejection
sampling, which always produces valid LeqEta coefficients regardless of
seed — there is no seed that produces out-of-range coefficients).

*(a)* Rejection sampling bounds (`r`, `rPrime`, `K_iter`) assume worst-case
`[-eta, eta]` norms. Biased distribution can only reduce norms below worst
case, improving (not degrading) rejection sampling success rate.
Unforgeability follows from the same Module-SIS/LWE reduction.

*(b)* The adversary's own biased shares don't help recover non-held shares.
Non-held shares are generated by subgroups containing at least one honest
party (different bitmask). The residual is still MLWE-hard.

*(c)* The public key `t = A * sum_b s1^b + sum_b s2^b` has `l_infinity`
norm at most `|B| * eta` per coefficient. MLWE hardness depends on the norm
bound, not the distribution within it. QED.

---

## Assumption Summary

| Assumption | Used in | New to this DKG? |
|---|---|---|
| SHAKE256 collision/preimage resistance | Theorems 3, 5 (commitments) | No (ML-DSA requires) |
| SHAKE256 as PRF/XOF (RO model) | Theorem 3 (seed uniformity) | No (ML-DSA requires) |
| Module-LWE hardness | Theorem 2 (secret recovery) | No (ML-DSA requires) |
| Authenticated confidential channels (**MUST**) | Seed reveals + mask delivery | Standard for all DKGs |

**No new cryptographic assumption beyond what ML-DSA already requires.**

---

## What This DKG Does NOT Provide

1. **Full malicious robustness when N < 2T-1.** If `T-1` colluders all land
   in the same bitmask, they can bias that share. Proven non-exploitable
   (Theorem 6), but not "provably random."

2. **Robustness against corrupt mask distribution.** A malicious `gen(b)` can
   send wrong mask pieces. Detected only by test signing (wrong public key →
   restart). Individual mask pieces cannot be verified in isolation — only
   the aggregate `t = sum R_j` is testable.

3. **Proactive security / share refresh.** Shares are static.

4. **Abort tolerance during DKG.** Liveness requires all N parties.

5. **Constant-time JS guarantees.** TypeScript implementation is best-effort
   for side channels. Custody-grade: use native constant-time code for DKG
   and signing, TypeScript for orchestration only.

---

## Comparison to MuSig2 / FROST

| Property | MuSig2 | FROST | This DKG |
|---|---|---|---|
| Threshold | n-of-n | t-of-n | t-of-n |
| DKG rounds | 0 | 2 | 4 phases |
| Trusted dealer | No | No | No |
| Share structure | None | Shamir | Additive (bitmask) |
| Rogue-key defense | Key agg coefficients | Feldman VSS | Per-bitmask coin-flip |
| Public transcript | Aggregate PK only | Aggregate PK only | Aggregate PK only |
| Secret exposure | Structural | Structural | Structural |
| Equivocation | N/A | VSS detects | **Impossible** (local derivation) |
| Signing rounds | 2 | 2 | 3 |

---

## Message Complexity

For a DKG with parameters `(T, N)`, let `|B| = C(N, N-T+1)` bitmask count
and `k = N-T+1` holders per bitmask.

| Phase | Broadcasts | Private messages |
|---|---|---|
| 1 (Commit) | N messages, each containing 1 + (bitmasks where i is holder) hashes | 0 |
| 2 (Reveal) | N messages (rho_i) | `|B| * k * (k-1)` messages of 32 bytes (each holder reveals to each fellow holder per bitmask) |
| 3 (Mask) | 0 | `|B| * (N-1)` mask pieces (K*256*23/8 bytes each) |
| 4 (Aggregate) | N messages (R_j, K*256*23/8 bytes each) | 0 |

Worst case (T=4, N=6): |B|=20, k=3
- Phase 2: 20 * 3 * 2 = 120 private messages of 32 bytes = 3.8 KB
- Phase 3: 20 * 5 = 100 mask pieces of ~3 KB each = ~300 KB
- Total: ~304 KB, well within practical limits for a one-time DKG

---

## Implementation Plan

### New types

```typescript
type SessionId = Uint8Array; // 32 bytes

interface DKGPhase1Broadcast {
  readonly partyId: number;
  readonly rhoCommitment: Uint8Array;
  readonly bitmaskCommitments: ReadonlyMap<number, Uint8Array>;  // bitmask -> H(r_{i,b})
}

interface DKGPhase1State {
  readonly rho: Uint8Array;                                // party's rho_i
  readonly bitmaskEntropy: ReadonlyMap<number, Uint8Array>; // bitmask -> r_{i,b}
}

interface DKGPhase2Broadcast {
  readonly partyId: number;
  readonly rho: Uint8Array;
}

interface DKGPhase2Private {
  readonly fromPartyId: number;
  readonly bitmaskReveals: ReadonlyMap<number, Uint8Array>;  // bitmask -> r_{from,b}
}

interface DKGPhase3Private {
  readonly fromGeneratorId: number;
  readonly maskPieces: ReadonlyMap<number, Int32Array[]>;  // bitmask -> r_{b,j} (K polys)
}

interface DKGPhase4Broadcast {
  readonly partyId: number;
  readonly aggregate: Int32Array[];  // R_j, K polynomials in R_q^K
}

interface DKGResult {
  readonly publicKey: Uint8Array;
  readonly share: ThresholdKeyShare;
}
```

### New methods on ThresholdMLDSA

```
// Phase 0: Deterministic setup
dkgSetup(sessionId: SessionId): {
  bitmasks: number[];
  holdersOf: Map<number, number[]>;    // bitmask -> sorted party indices
}

// Phase 1: Commit all entropy
dkgPhase1(partyId: number, sessionId: SessionId): {
  broadcast: DKGPhase1Broadcast;
  state: DKGPhase1State;
}

// Phase 2: Reveal entropy, derive seeds + shares
dkgPhase2(
  partyId: number,
  sessionId: SessionId,
  state: DKGPhase1State,
  allPhase1: readonly DKGPhase1Broadcast[]
): {
  broadcast: DKGPhase2Broadcast;
  privateToHolders: Map<number, DKGPhase2Private>;  // fellow-holder partyId -> their reveals
}

// Phase 2 continued: verify reveals, derive seeds, compute shares, prepare masks
dkgPhase2Finalize(
  partyId: number,
  sessionId: SessionId,
  state: DKGPhase1State,
  allPhase1: readonly DKGPhase1Broadcast[],
  allPhase2Broadcasts: readonly DKGPhase2Broadcast[],
  receivedReveals: readonly DKGPhase2Private[]
): {
  shares: Map<number, SecretShare>;          // bitmask -> derived share (for held bitmasks)
  generatorAssignment: Map<number, number>;  // bitmask -> gen(b)
  privateToAll: Map<number, DKGPhase3Private>;  // partyId -> mask pieces for them
}

// Phase 4: Accumulate masks, broadcast aggregate, finalize
dkgPhase4(
  partyId: number,
  sessionId: SessionId,
  allPhase2Broadcasts: readonly DKGPhase2Broadcast[],
  receivedMasks: readonly DKGPhase3Private[],
  ownMaskPieces: Map<number, Int32Array[]>,   // bitmask -> r_{b,partyId} (from own generation)
  shares: Map<number, SecretShare>
): {
  broadcast: DKGPhase4Broadcast;
}

// Finalize: compute t, derive public key, build ThresholdKeyShare
dkgFinalize(
  partyId: number,
  sessionId: SessionId,
  allPhase2Broadcasts: readonly DKGPhase2Broadcast[],
  allPhase4: readonly DKGPhase4Broadcast[],
  shares: Map<number, SecretShare>
): DKGResult
```

### Helper: splitVectorK

```typescript
/**
 * Additively split a vector of K polynomials into N shares
 * such that sum of all shares equals the input (mod Q).
 * N-1 shares are uniform random; the residual goes to index `residualIdx`
 * (which should be gen(b) — the generator who knows w^b and keeps the
 * non-random piece locally, avoiding sending it over the wire).
 *
 * IMPORTANT: wb coefficients MUST be normalized to [0, Q) before calling.
 * Use ((coeff % Q) + Q) % Q if needed.
 */
function splitVectorK(
  wb: Int32Array[], N: number, Q: number, residualIdx: number
): Int32Array[][] {
  const K = wb.length;
  const result: Int32Array[][] = new Array(N);

  // Sample N-1 uniform random masks
  for (let j = 0; j < N; j++) {
    if (j === residualIdx) continue;
    const mask: Int32Array[] = [];
    for (let k = 0; k < K; k++) {
      const poly = new Int32Array(256);
      for (let c = 0; c < 256; c++) poly[c] = uniformModQ(Q);
      mask.push(poly);
    }
    result[j] = mask;
  }

  // Compute residual: wb - sum of all other masks (mod Q)
  const residual: Int32Array[] = [];
  for (let k = 0; k < K; k++) {
    const poly = new Int32Array(256);
    for (let c = 0; c < 256; c++) {
      let val = wb[k][c];
      for (let j = 0; j < N; j++) {
        if (j === residualIdx) continue;
        val -= result[j][k][c];
      }
      poly[c] = ((val % Q) + Q) % Q;
    }
    residual.push(poly);
  }
  result[residualIdx] = residual;
  return result;
}
```

### Test plan

1. **Correctness**: Full 4-phase DKG for all (T,N) pairs, verify public key
   is valid ML-DSA key, verify `sum_j R_j` matches expected `t`

2. **Signing compatibility**: DKG shares produce valid signatures via both
   `sign()` and interactive `round1()`-`round3()`, verified by ML-DSA `verify()`

3. **Seed consistency**: All holders of bitmask `b` derive identical
   `seed_b` and hence identical `(s1^b, s2^b)` — test byte-level equality

4. **Mask cancellation**: `sum_j R_j == sum_b w^b` (compute both independently)

5. **Structural secrecy**: For each party `i`, verify there exists at least
   one bitmask they don't hold shares for

6. **Commitment binding**: Attempt to reveal different `r_{i,b}` than
   committed — verify detection by fellow holders

7. **Session isolation**: Commitments from session A don't validate in session B

8. **Generator balance**: No party assigned more than `ceil(|B| / k)` bitmasks

9. **Non-holder exclusion**: Verify non-holders cannot compute `seed_b` even
   with access to the full public transcript

10. **Post-DKG test sign**: Verify that a successful DKG always produces
    shares capable of threshold signing
