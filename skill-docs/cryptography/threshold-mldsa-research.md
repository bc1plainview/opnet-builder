# ML-DSA Threshold Signing Schemes -- Research Report Summary

## Status: Active Research (February 2026)
## Source: OPNet Research Division internal paper, 17 pages, 29 references

---

## Overview

Threshold signatures distribute a signing key among N parties such that any t-of-N can produce a valid signature, while fewer than t learn nothing about the key. This provides fault tolerance and enhanced security (no single point of compromise).

For pre-quantum schemes (ECDSA, Schnorr), threshold signing is mature -- FROST, GG18/GG20, CGGMP are in production. The algebraic linearity of Schnorr makes thresholdization natural: Shamir secret sharing + Lagrange interpolation + linear partial signature aggregation.

For ML-DSA (CRYSTALS-Dilithium, FIPS 204), threshold signing is fundamentally harder due to structural differences in lattice-based cryptography.

---

## Core Challenges

### 1. Rejection Sampling and Abort Probability
ML-DSA uses "Fiat-Shamir with Aborts" -- the signing algorithm may reject and restart (~4-7 iterations expected). In threshold setting:
- **Correlated aborts**: If each of t parties aborts independently with probability p, combined success is (1-p)^t -- exponentially worse
- **Selective abort attacks**: Malicious party can deliberately cause aborts to extract secret share information over many sessions
- **Pre-computation incompatibility**: Unlike Schnorr, pre-computed nonces may be wasted due to aborts

### 2. Noise Flooding Requirements
In lattice crypto, partial signatures are "noisy" vectors that carry information about secrets. Noise flooding adds extra randomness (magnitude 2^lambda * B) to drown out natural noise. Cost: signature sizes blow up from KB to potentially MB.

### 3. No Linear Secret Sharing
Schnorr: Shamir shares + Lagrange interpolation = linear, commutes with group operations. Elegant.
ML-DSA: Secret key s = (s1, s2) are SHORT vectors over polynomial rings. Lagrange coefficients in Rq are NOT +/-1 -- multiplying short shares by large coefficients produces LONG vectors, violating norm bounds and leaking secrets.

### 4. Distributed Key Generation (DKG) Complexity
Lattice-based DKG requires: verifiable secret sharing with large proofs, short share maintenance, robustness against malicious parties. Much harder than DL-based DKG (Pedersen).

---

## Research Timeline

### 2018-2021: Foundations
- **Boneh et al. (CRYPTO 2018)**: First lattice threshold sig from standard assumptions. Impractical -- signatures Omega(lambda^3) bits.
- **Cozzo & Smart (2019)**: First systematic study of threshold PQ signatures. Highlighted fundamental difficulties.
- **Damgard et al. (PKC 2021)**: Two-round n-of-n threshold lattice sig. Limited to full-threshold case, signatures ~100KB.
- **Agrawal, Stehle, Yadav (2021)**: Reduced noise flooding to sqrt(Qs). ~3KB signatures but limited to 256 signatures per key.

### 2022-2024: Two-Party and FHE Approaches
- **DiLizium 2.0 (2023)**: Two-party Dilithium (phone + server). Practical for 2-of-2.
- **Gur-Katz-Silde (PQCrypto 2024)**: Breakthrough -- threshold homomorphic encryption for rejection sampling in encrypted form. ~46.6KB sigs, ~13.6KB pubkeys for 3-of-5.
- **Espitau-Katsumata-Takemure (CRYPTO 2024)**: Improved via Algebraic One-More LWE assumption.
- **Threshold Raccoon (Eurocrypt 2024)**: New scheme DESIGNED for threshold operation. ~13KB sigs, 3-round protocol, arbitrary t-of-N. Avoids rejection sampling entirely via masking technique.

### 2024-2026: ML-DSA Compatible (the breakthrough)
- **del Pino et al. (CRYPTO 2024)**: sDKG -- Distributed Key Generation with Short Shares. "Signature shares double as valid signatures." 4.4KB signature shares. Identifiable abort.
- **Trilithium (2025)**: 2-of-2 producing standard FIPS 204 signatures. UC-secure.
- **Efficient Threshold ML-DSA (2025)**: t-of-n for n<=6 producing standard ML-DSA signatures. Go implementation (CIRCL-based).
- **Threshold Signatures Reloaded (2025-2026)**: Full design space exploration. Both T-ML-DSA and enhanced T-Raccoon with ID abort.
- **Quorus (2025-2026)**: Generic MPC approach -- treats ML-DSA signing as black-box function evaluation. Any threshold, standard signatures, but higher communication costs.
- **Olingo (2025)**: Framework combining Raccoon + sDKG. First to offer ALL properties: small keys/sigs, low rounds, non-interactive online signing, DKG, identifiable abort.

---

## Comparison Table

| Scheme | Year | Threshold | Rounds | Sig Size | ML-DSA Compatible | ID Abort | DKG | Impl |
|--------|------|-----------|--------|----------|-------------------|----------|-----|------|
| Boneh et al. | 2018 | t-of-n | 1 | Huge | No | No | No | No |
| Damgard et al. | 2021 | n-of-n | 2 | ~100KB | No | No | No | No |
| DiLizium 2.0 | 2023 | 2-of-2 | 3-4 | ~2.4KB | Partial | N/A | Yes | PoC |
| Gur-Katz-Silde | 2024 | t-of-n | 2 | ~46.6KB | No | No | No | No |
| T-Raccoon | 2024 | t-of-n | 3 | ~13KB | No | Yes* | Yes | Go |
| del Pino sDKG | 2024 | t-of-n | 2 | ~4.4KB | No (Raccoon) | Yes | Yes | No |
| Trilithium | 2025 | 2-of-2+CRP | 2-3 | ~2.4KB | YES | N/A | Yes | PoC |
| Efficient T-ML-DSA | 2025 | t-of-n (<=6) | 2-3 | ~2.4KB | YES | Yes | Yes | Go (CIRCL) |
| T-Sigs Reloaded | 2025-26 | t-of-n | 2-3 | ~2.4KB | YES | Yes | Yes | Go |
| Quorus (MPC) | 2025-26 | t-of-n | Many | ~2.4KB | YES | Via MPC | Via MPC | Research |
| Olingo | 2025 | t-of-n | 2 (1 online) | ~13KB | No (Raccoon) | Yes | Yes | Research |

*Added in subsequent Unmasking TRaccoon work.

---

## Feasibility for OPNet

### 2-of-2 (client-server): FEASIBLE TODAY
Trilithium produces standard FIPS 204 signatures. Suitable for phone+server custody.

### t-of-n (small groups, n<=6): FEASIBLE WITH CAVEATS
"Efficient Threshold ML-DSA" has Go implementation. No production audit yet.

### t-of-n (large groups, n>6): RESEARCH STAGE
Requires Raccoon (non-standard sigs) or MPC approach (high communication).

### MPC-based: THEORETICALLY POSSIBLE
Quorus shows generic MPC can compute ML-DSA signing for any threshold. High comm costs, acceptable for low-frequency custody ops.

---

## OPNet's Current Options

1. **On-chain multisig (opMultisig)**: Already built and deployed on regtest. Each signer has own full ML-DSA key, contract verifies all M-of-N signatures on-chain. Gas scales linearly with M. **Pragmatic immediate solution.**

2. **P2MR script-path multisig**: With BIP-360's P2MR, multi-party auth encoded in Bitcoin script tree (Merkle tree of ML-DSA key checks). Most Bitcoin-native approach. Requires BIP-360 activation (Q4 2026-Q1 2027).

3. **Hybrid**: FROST threshold Schnorr for Bitcoin UTXO layer (P2TR key-path) + on-chain multisig for OPNet contract layer. Proven tech, different security models per layer.

4. **Social recovery**: Single ML-DSA key with time-locked recovery via smart contract. Simpler but weaker real-time security.

---

## Timeline Estimates

| Milestone | Date | Notes |
|-----------|------|-------|
| 2-of-2 threshold ML-DSA (audited) | Q3-Q4 2026 | Trilithium/TOPCOAT implementations |
| t-of-n (n<=6, audited) | Q1-Q2 2027 | CIRCL-based implementations |
| NIST threshold PQC standard draft | 2027-2028 | Per NIST MPTC timeline |
| Production threshold ML-DSA for OPNet | 2027-2028 | After audit + BIP-360 + VM integration |
| NIST final standard | 2028-2029 | Full standardization |

---

## Key Insight for OPNet

OPNet's early ML-DSA adoption positions it to integrate threshold signing as it matures, rather than retrofitting. The combination of BIP-360 P2MR addresses + threshold ML-DSA signing = quantum-safe distributed custody native to Bitcoin, no bridges, no external trust.

**MuSig3 concept**: N-of-N ML-DSA signature aggregation where the output is a single standard ML-DSA signature indistinguishable from single-signer. Account-level multisig with zero on-chain overhead. Every OPNet account could BE a multisig without any contract logic.

---

## References

29 citations covering ePrint archive, NIST publications, and major cryptography conferences (CRYPTO, EUROCRYPT, PQCrypto, PKC, ACM CCS, SAC) through February 2026. Full bibliography in source paper.
