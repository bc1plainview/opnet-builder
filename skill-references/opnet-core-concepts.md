## CSV: The Critical Anti-Pinning Mechanism (MANDATORY)

### What is Transaction Pinning?

Transaction pinning is a **catastrophic attack vector** that most Bitcoin protocols ignore. Here's how it works:

1. When you send Bitcoin to someone, they can immediately create a transaction spending that Bitcoin, **even before the first transaction is confirmed**
2. An attacker creates massive chains of unconfirmed transactions, all dependent on each other
3. This makes it **impossible for miners to include your legitimate transaction** in a block
4. Your transaction is stuck in mempool limbo while the attacker manipulates contract state

### Why Pinning Destroys DEXs Without Protection

**Attack scenario on an unprotected DEX:**

1. Attacker pins your swap transaction, preventing confirmation
2. Your reservation expires, but your BTC is stuck in mempool
3. Attacker cancels their sell orders or manipulates pool state
4. When your transaction finally confirms (if ever), no tokens remain
5. **Result**: Attacker gets free money, you lose everything

This vulnerability exists in **every Bitcoin protocol** that doesn't mandate CSV:
- Multisig bridges can be frozen entirely with one malicious unwrap request
- Ordinals marketplaces are vulnerable
- Runes trading platforms are vulnerable
- BRC-20 exchanges are vulnerable

### The CSV Solution

**CSV (CheckSequenceVerify, BIP 112)** completely eliminates pinning attacks:

```
Without CSV: Maximum unconfirmed chain length = UNLIMITED (attackers can pin forever)
With CSV:    Maximum unconfirmed chain length = ZERO (must wait for confirmation)
```

By requiring all seller addresses to have a **1-block CSV timelock**, once Bitcoin arrives at those addresses, it **cannot be spent again for at least one block**. This is mathematically provable and completely closes the attack vector.

### Implementation Requirement

**ALL addresses receiving BTC in OPNet swaps MUST use CSV timelocks.**

This is enforced at the protocol level in NativeSwap. If you're building any application that coordinates BTC transfers with smart contract state, you MUST implement CSV protection.

---

## The Two Address Systems (CRITICAL for Airdrops)

### Why OPNet Airdrops Work Differently Than Ethereum

On **Ethereum**, there's one address format. You can loop through addresses and call `transfer(to, amount)` because ERC20 contracts just decrement sender balance and increment recipient balance using the same address type.

On **OPNet**, contract balances are keyed by **ML-DSA public key hashes** (32-byte quantum-resistant addresses), but users are typically known externally by their **Bitcoin addresses** (Taproot P2TR, tweaked public keys). These are **completely different cryptographic systems** with no inherent link between them.

| Address System | Format | Used For |
|---------------|--------|----------|
| **Bitcoin Address** | Taproot P2TR (`bc1p...`) | External identity, what you have in your airdrop list |
| **OPNet Address** | ML-DSA public key hash (32 bytes) | Contract balances, internal state |

### WHY YOU CANNOT JUST LOOP AND TRANSFER

If you have a list of Bitcoin addresses from token holders or snapshot participants:

```typescript
// WRONG - THIS DOES NOT WORK
for (const btcAddress of airdropList) {
    await token.transfer(btcAddress, amount);  // IMPOSSIBLE
}
```

**The contract literally cannot credit tokens to a Bitcoin address directly.** The contract storage uses ML-DSA addresses, not Bitcoin addresses. The mapping between them only exists once a user explicitly proves ownership of both keys together.

### THE CORRECT SOLUTION: Claim-Based Airdrop Contract

Airdrops on OPNet are done via a **smart contract** with a claim pattern:

**1. Deploy an airdrop contract** that stores allocations keyed by tweaked public key:
```typescript
// Contract storage
mapping(tweakedPubKey => amount)  // Store: which Bitcoin addresses get how much
mapping(tweakedPubKey => claimed) // Track: has this allocation been claimed
```

**2. Users call `claim()`** providing a signature that proves they control that Bitcoin address:
```typescript
// User's frontend (browser) - OP_WALLET signs automatically
const message = `Claim airdrop for ${contractAddress}`;
const signed = await MessageSigner.tweakAndSignMessageAuto(message);

// Submit to contract with signature in calldata
await airdropContract.claim(signature, messageHash);
```

**3. Contract verifies and transfers:**
```typescript
// Contract logic
public claim(calldata: Calldata): BytesWriter {
    const signature = calldata.readBytes(64);
    const messageHash = calldata.readBytes(32);

    // Verify signature proves caller owns the tweaked public key
    if (!Blockchain.verifySignature(Blockchain.tx.origin, signature, messageHash, false)) {
        throw new Revert('Invalid signature');
    }

    // Get allocation for this tweaked public key
    const tweakedKey = Blockchain.tx.origin.tweakedPublicKey;
    const amount = this.allocations.get(tweakedKey);

    // Transfer to caller's ML-DSA address (now linked!)
    this._mint(Blockchain.tx.sender, amount);
    this.claimed.set(tweakedKey, true);
}
```

**This is the "unlock transaction"** - the moment where the user proves ownership of both identities (Bitcoin address AND ML-DSA address), allowing the contract to link them and credit the tokens.

### The Banana Locker Analogy

- You know 300 monkeys by their **face** (Bitcoin address)
- Lockers open with a **secret handshake** (ML-DSA key)
- You label lockers with faces and put bananas inside
- When a monkey shows up, they show face AND do handshake
- System learns: "this face = this handshake" and gives them their banana
- **The banana was always "theirs" but they couldn't access it until they linked face to handshake**

---

## NativeSwap: How to Build a Real DEX on Bitcoin

NativeSwap answers the biggest unanswered question in BitcoinFi: **How do you build an actual AMM that trades native BTC for tokens, trustlessly, without custody?**

### The Fundamental Problem

Traditional AMMs (like Uniswap) hold both assets in a pool and use math to set prices. **Bitcoin cannot do this** - you literally cannot have a smart contract hold and programmatically transfer BTC.

**Why common "solutions" fail:**
- **Multisig wallets**: Trusted parties can collude or disappear
- **Wrapped BTC**: Bridges become honeypots (billions stolen from bridges)
- **Pure order books**: Terrible liquidity without market makers holding inventory

### Virtual Reserves: The Solution

NativeSwap realizes that an AMM doesn't need to physically hold assets - it just needs to **track the economic effect of trades**. This is similar to:
- Banks updating ledger entries without moving physical cash
- Futures markets trading billions in commodities without touching a barrel of oil
- Clearinghouses settling trillions without holding underlying assets

**How it works:**
1. The contract maintains two numbers: `bitcoinReserve` and `tokenReserve`
2. When someone buys tokens with BTC, the system records that bitcoin reserve increased and token reserve decreased
3. The actual BTC goes **directly to sellers**, not to the contract
4. AMM pricing only depends on the **ratio** between reserves
5. The constant product formula (`bitcoinReserve × tokenReserve = k`) works identically whether reserves are physical or virtual

### Two-Phase Commit: Why Reservations Are Necessary

**Problem**: OPNet can revert smart contract execution, but it **cannot reverse Bitcoin transfers**. Once you send BTC, that transfer is governed by Bitcoin's consensus rules, not OPNet's.

**Catastrophic scenario without reservations:**
1. You see token price is 0.01 BTC/token
2. You create a transaction sending 1 BTC to buy 100 tokens
3. During 10-20 minute confirmation time, other trades push price to 0.02 BTC/token
4. On Ethereum, your transaction would revert and return your ETH
5. On Bitcoin, **your BTC transfer already happened** - the contract can't send it back
6. You lose your BTC and get zero tokens

**The reservation system (two-phase commit):**

| Phase | What Happens |
|-------|--------------|
| **Phase 1: Reserve** | Prove you control BTC (UTXOs as inputs, sent back to yourself), pay small fee, **price is locked in consensus state** |
| **Phase 2: Execute** | Send exact BTC amount to providers (up to 200 addresses atomically), guaranteed execution at locked price |

**Benefits:**
- **No slippage risk**: Price locked at reservation time
- **No front-running**: Once price is locked in OPNet state, no one can change it
- **Partial fills**: Automatically coordinate payments to up to 200 providers in single atomic transaction (impossible on any other Bitcoin protocol)

### Queue Impact: Accounting for Pending Sells

Sellers queue tokens at the prevailing AMM price. The Queue Impact mechanism adjusts effective token reserve using **logarithmic scaling**:

**Why logarithmic?**
- Markets process information multiplicatively
- Doubling queue from 100→200 tokens has same psychological impact as 1000→2000
- First sellers signal strong selling pressure; additional sellers have diminishing marginal impact
- Matches empirical observations from market microstructure research

### Slashing: Making Queue Manipulation Economically Irrational

Without penalties, Queue Impact would be worthless:
1. Attacker adds massive fake sell orders → crashes price via Queue Impact
2. Attacker buys cheap tokens
3. Attacker cancels their sells
4. Profit from manipulation

**The slashing mechanism:**
- **Immediate cancellation**: 50% penalty (exceeds any realistic manipulation profit)
- **Extended squatting**: Escalates to 90% penalty
- **Slashed tokens return to pool**: Attempted attacks actually improve liquidity

This makes manipulation economically irrational and ensures queue depth is a reliable market signal.

### Summary: Why Each Component Is Necessary

| Component | Constraint It Addresses |
|-----------|------------------------|
| Virtual reserves | Smart contracts can't custody BTC on Bitcoin |
| Reservations (two-phase commit) | OPNet controls contract state, not Bitcoin transfers |
| Queue Impact | Pending orders affect market psychology and pricing |
| Slashing | Queue Impact would be manipulable without penalties |
| CSV timelocks | UTXO chains are vulnerable to transaction pinning |
| OPNet consensus | Indexers can't provide binding state consistency |

**Remove any component and the system either becomes exploitable or stops functioning as an AMM.**

---

