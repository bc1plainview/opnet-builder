# OPNet Generic Questions Guidelines

**For questions NOT tied to building a specific project type.**

This document covers how to handle questions about OPNet architecture, concepts, how things work, and best practices.

---

## Table of Contents

1. [How to Handle Generic Questions](#how-to-handle-generic-questions)
2. [Example Questions and What to Read](#example-questions-and-what-to-read)
3. [OPNet Architecture Topics](#opnet-architecture-topics)
4. [Address Systems and Identity](#address-systems-and-identity)
5. [Token Standards](#token-standards)
6. [Bitcoin Integration](#bitcoin-integration)
7. [Security Topics](#security-topics)
8. [DEX and Swap Topics](#dex-and-swap-topics)
9. [Choosing Between Approaches](#choosing-between-approaches)

---

## How to Handle Generic Questions

**IMPORTANT: For conceptual questions, read the relevant docs/sections BEFORE answering. Do not guess or make assumptions about how OPNet works.**

### Process

1. **Identify the topic** - What is the user asking about?
2. **Find the relevant docs** - Use the tables below
3. **Read the docs first** - Before formulating an answer
4. **Answer from the docs** - Not from assumptions
5. **Reference the source** - Point user to relevant docs for details

### What NOT to Do

- Do NOT guess how OPNet works
- Do NOT assume OPNet works like Ethereum or other platforms
- Do NOT make up technical details
- Do NOT answer without reading relevant docs first

---

## Example Questions and What to Read

| Example Question | Read These First |
|------------------|------------------|
| "How does OPNet work?" | `docs/core-opnet-getting-started-overview.md`, SKILL.md "What is OPNet" section |
| "Can OPNet survive 51% attacks?" | SKILL.md "Security Model" section, `docs/core-opnet-epochs-overview.md` |
| "How does airdrop work on OPNet?" | `docs/core-opnet-address-systems-airdrop-pattern.md`, SKILL.md "The Two Address Systems" section |
| "Why can't I just loop and transfer tokens?" | SKILL.md "WHY YOU CANNOT JUST LOOP AND TRANSFER" section |
| "What's the difference between OPNet and Runes/Ordinals?" | SKILL.md "Why OPNet Requires Consensus" section |
| "How do epochs work?" | `docs/core-opnet-epochs-overview.md`, `docs/core-OIP-OIP-0004.md` |
| "What is transaction pinning?" | SKILL.md "CSV: The Critical Anti-Pinning Mechanism" section |
| "Why do I need CSV timelocks?" | SKILL.md "CSV: The Critical Anti-Pinning Mechanism" section |
| "How do Bitcoin addresses relate to OPNet addresses?" | `docs/core-opnet-address-systems-airdrop-pattern.md` |
| "What is ML-DSA / quantum resistance?" | `docs/core-transaction-quantum-support-README.md` |
| "How do I handle chain reorgs?" | `docs/core-opnet-blocks-reorg-detection.md` |
| "Why can't contracts hold BTC?" | SKILL.md "Key Principles" section, "NativeSwap" section |
| "What is verify-don't-custody?" | SKILL.md "Key Principles" section |
| "How does NativeSwap work?" | SKILL.md "NativeSwap: How to Build a Real DEX on Bitcoin" section |
| "Why do swaps need reservations?" | SKILL.md "Two-Phase Commit" section |
| "What is queue impact / slashing?" | SKILL.md "Queue Impact" and "Slashing" sections |
| "Is OPNet decentralized?" | SKILL.md "What is OPNet" section |
| "How is OPNet different from a sidechain?" | SKILL.md "What is OPNet" section - it's L1, not a sidechain |
| "What happens if my transaction reverts?" | SKILL.md "Key Principles" - partial reverts section |
| "Does OPNet have a gas token?" | SKILL.md "Key Principles" - no gas token, uses Bitcoin |

---

## OPNet Architecture Topics

| Topic | Files to Read |
|-------|---------------|
| How OPNet works | `docs/core-opnet-getting-started-overview.md` |
| What is OPNet | SKILL.md - "What is OPNet" section |
| Security model | SKILL.md - "Security Model" section |
| Consensus vs indexing | SKILL.md - "Why OPNet Requires Consensus" section |
| Epochs and mining | `docs/core-opnet-epochs-overview.md`, `docs/core-OIP-OIP-0004.md` |
| Epoch operations | `docs/core-opnet-epochs-epoch-operations.md` |
| Mining template | `docs/core-opnet-epochs-mining-template.md` |
| Submitting epochs | `docs/core-opnet-epochs-submitting-epochs.md` |
| Transaction flow | `docs/core-opnet-transactions-broadcasting.md` |
| Transaction receipts | `docs/core-opnet-transactions-transaction-receipts.md` |
| Block processing | `docs/core-opnet-blocks-block-operations.md` |
| Block witnesses | `docs/core-opnet-blocks-block-witnesses.md` |
| Gas parameters | `docs/core-opnet-blocks-gas-parameters.md` |
| Reorg handling | `docs/core-opnet-blocks-reorg-detection.md` |

---

## Address Systems and Identity

| Topic | Files to Read |
|-------|---------------|
| Two address systems (Bitcoin vs OPNet) | `docs/core-opnet-address-systems-airdrop-pattern.md` |
| Why airdrops need claims | `docs/core-opnet-address-systems-airdrop-pattern.md` |
| Airdrop contract pattern | SKILL.md - "The Two Address Systems" section |
| ML-DSA quantum signatures | `docs/core-transaction-quantum-support-README.md` |
| Quantum introduction | `docs/core-transaction-quantum-support-01-introduction.md` |
| Quantum mnemonic/wallet | `docs/core-transaction-quantum-support-02-mnemonic-and-wallet.md` |
| Quantum address generation | `docs/core-transaction-quantum-support-03-address-generation.md` |
| Quantum message signing | `docs/core-transaction-quantum-support-04-message-signing.md` |
| Quantum address verification | `docs/core-transaction-quantum-support-05-address-verification.md` |
| Public key operations | `docs/core-opnet-public-keys-public-key-operations.md` |

---

## Token Standards

| Topic | Files to Read |
|-------|---------------|
| OP20 standard (fungible tokens) | `docs/core-OIP-OIP-0020.md` |
| OP20 ABI | `docs/core-opnet-abi-reference-op20-abi.md` |
| OP20 examples | `docs/core-opnet-examples-op20-examples.md` |
| OP721 standard (NFTs) | `docs/core-OIP-OIP-0721.md` |
| OP721 ABI | `docs/core-opnet-abi-reference-op721-abi.md` |
| OP721 examples | `docs/core-opnet-examples-op721-examples.md` |
| OP20S (signatures) | `docs/core-opnet-abi-reference-op20s-abi.md` |
| Custom ABIs | `docs/core-opnet-abi-reference-custom-abis.md` |
| ABI data types | `docs/core-opnet-abi-reference-data-types.md` |

---

## Bitcoin Integration

| Topic | Files to Read |
|-------|---------------|
| UTXO handling | `docs/core-opnet-bitcoin-utxos.md` |
| UTXO optimization | `docs/core-opnet-bitcoin-utxo-optimization.md` |
| Balance queries | `docs/core-opnet-bitcoin-balances.md` |
| Sending Bitcoin | `docs/core-opnet-bitcoin-sending-bitcoin.md` |
| PSBT class and signing | `docs/clients-bitcoin-psbt.md` |
| Payment types | `docs/clients-bitcoin-payments.md` |
| Script building | `docs/clients-bitcoin-script.md` |
| Address encoding | `docs/clients-bitcoin-address.md` |
| Transaction class | `docs/clients-bitcoin-transaction.md` |
| Transaction pinning and CSV | SKILL.md - "CSV: The Critical Anti-Pinning Mechanism" section |
| BIP32 HD derivation | `docs/clients-bip32-README.md` |
| EC key pairs | `docs/clients-ecpair-README.md` |

---

## Security Topics

| Topic | Files to Read |
|-------|---------------|
| TypeScript security rules | `docs/core-typescript-law-CompleteLaw.md` |
| Contract security | `docs/contracts-btc-runtime-core-concepts-security.md` |
| Gas optimization | `docs/contracts-btc-runtime-gas-optimization.md` |
| Signature verification | `docs/contracts-btc-runtime-advanced-signature-verification.md` |
| Reentrancy guard | `docs/contracts-btc-runtime-contracts-reentrancy-guard.md` |
| Transaction pinning attacks | SKILL.md - "What is Transaction Pinning?" section |
| CSV protection | SKILL.md - "The CSV Solution" section |
| Why CSV is mandatory | SKILL.md - "Why Pinning Destroys DEXs Without Protection" section |

---

## DEX and Swap Topics

| Topic | Files to Read |
|-------|---------------|
| How to build a DEX on Bitcoin | SKILL.md - "NativeSwap: How to Build a Real DEX on Bitcoin" section |
| The fundamental problem | SKILL.md - "The Fundamental Problem" section |
| Virtual reserves | SKILL.md - "Virtual Reserves: The Solution" section |
| Two-phase commit (reservations) | SKILL.md - "Two-Phase Commit" section |
| Why reservations are necessary | SKILL.md - "Two-Phase Commit" section |
| Queue impact | SKILL.md - "Queue Impact" section |
| Slashing mechanism | SKILL.md - "Slashing" section |
| Why each component is necessary | SKILL.md - "Summary: Why Each Component Is Necessary" section |
| Advanced swap examples | `docs/core-opnet-examples-advanced-swaps.md` |

---

## Choosing Between Approaches

| Decision | Read |
|----------|------|
| Contract vs off-chain logic | `docs/contracts-btc-runtime-README.md` |
| JSON-RPC vs WebSocket provider | `docs/core-opnet-providers-understanding-providers.md` |
| JSON-RPC provider details | `docs/core-opnet-providers-json-rpc-provider.md` |
| WebSocket provider details | `docs/core-opnet-providers-websocket-provider.md` |
| Provider caching | `docs/core-opnet-providers-internal-caching.md` |
| Threaded HTTP | `docs/core-opnet-providers-threaded-http.md` |
| Advanced provider config | `docs/core-opnet-providers-advanced-configuration.md` |
| Storage types in contracts | `docs/contracts-btc-runtime-core-concepts-storage-system.md` |
| When to use plugins | `docs/core-OIP-OIP-0003.md` |
| Upgradeable contracts | `docs/contracts-btc-runtime-contracts-upgradeable.md` |
| Contract upgrades | `docs/contracts-btc-runtime-advanced-contract-upgrades.md` |

---

## OIP Specifications

| OIP | Topic | File |
|-----|-------|------|
| OIP-0001 | OIP process | `docs/core-OIP-OIP-0001.md` |
| OIP-0002 | Contract standards | `docs/core-OIP-OIP-0002.md` |
| OIP-0003 | Plugin system | `docs/core-OIP-OIP-0003.md` |
| OIP-0004 | Epoch system | `docs/core-OIP-OIP-0004.md` |
| OIP-0020 | OP20 token standard | `docs/core-OIP-OIP-0020.md` |
| OIP-0721 | OP721 NFT standard | `docs/core-OIP-OIP-0721.md` |

---

## Summary

1. **Identify the topic** from the user's question
2. **Find the relevant docs** using the tables above
3. **Read before answering** - don't guess
4. **Answer from documentation** - not assumptions
5. **OPNet is NOT Ethereum** - don't assume similar behavior
