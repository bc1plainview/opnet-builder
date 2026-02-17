# Ethereum to OPNet Migration Guidelines

**This is a conceptual guide, NOT a code transpiler.** You cannot port Solidity to OPNet line-by-line. OPNet uses a fundamentally different execution model (Bitcoin UTXO + WASM), different language (AssemblyScript), and different cryptographic primitives (ML-DSA + Schnorr). You must re-think designs from Bitcoin-first principles.

**How to use this guide:** Each section maps an Ethereum concept to its OPNet equivalent, explains WHY they differ, and flags common misconceptions. When a user says "I want to do X like on Ethereum," find the equivalent section and guide them to the OPNet approach.

---

## Table of Contents

1. [The Big Picture -- Platform Differences](#1-the-big-picture----platform-differences)
2. [Identity and Addresses](#2-identity-and-addresses)
3. [The Quantum-Safe Migration](#3-the-quantum-safe-migration)
4. [Token Standards](#4-token-standards)
5. [Airdrops -- The Claim Pattern](#5-airdrops----the-claim-pattern)
6. [Frontend / Wallet Integration](#6-frontend--wallet-integration)
7. [Transaction Model](#7-transaction-model)
8. [Contract Design Patterns](#8-contract-design-patterns)
9. [DEX / DeFi Patterns](#9-dex--defi-patterns)
10. [Quick Reference Cheat Sheet](#10-quick-reference-cheat-sheet)

---

## 1. The Big Picture -- Platform Differences

| Aspect | Ethereum | OPNet |
|--------|----------|-------|
| State model | Account-based | UTXO-based (Bitcoin L1) |
| Smart contract language | Solidity + EVM bytecode | AssemblyScript + WASM |
| Native currency | ETH (gas token) | BTC (directly on Bitcoin L1) |
| Consensus | PoS validators | Bitcoin PoW + OPNet epoch miners |
| Revert behavior | Atomic all-or-nothing | **Partial**: contract state reverts, BTC transfers do NOT |
| Address system | Single (20-byte hash from ECDSA) | Dual (Bitcoin P2TR + ML-DSA hash) |
| Contract storage | Implicit `mapping(k => v)` | Explicit `StoredU256`, `AddressMemoryMap` with pointers |
| Gas token | ETH itself | No gas token -- uses Bitcoin fee rate + priority fee |
| Contract holds funds | Yes (`payable`, `msg.value`) | **IMPOSSIBLE** -- verify-don't-custody pattern |

**Analogy:** Ethereum is a managed apartment building -- the building holds your assets, manages your utilities, and handles everything atomically. OPNet is building on raw land with Bitcoin as the foundation -- you own your BTC directly, the contract is a notary that witnesses and records agreements, but never holds your money.

**Key implication:** Every Ethereum pattern that assumes "the contract holds assets" must be redesigned. There is no `payable`, no `msg.value`, no contract balance of native currency. Contracts verify that Bitcoin outputs exist in the transaction, they never custody BTC.

---

## 2. Identity and Addresses

### Ethereum Model
- Single `address` type (20 bytes) derived from ECDSA public key
- `msg.sender` gives you the caller's address
- One address format for everything

### OPNet Model
- **Two address types** operating simultaneously:
  - `Address` (32 bytes): ML-DSA public key hash -- used for contract state, balances, internal logic
  - `ExtendedAddress`: Contains BOTH the Bitcoin tweaked public key (32 bytes) AND the ML-DSA public key hash (32 bytes)
- `Blockchain.tx.sender` returns an `Address` (ML-DSA address of the caller)
- `Blockchain.tx.origin` returns an `ExtendedAddress` (both keys)

### Why Two Systems?
Quantum safety requires two independent cryptographic systems. Bitcoin's existing Schnorr/ECDSA signatures are quantum-vulnerable. ML-DSA (a lattice-based algorithm) is quantum-resistant. During the transition period, both must coexist.

### Address Construction
```
// Ethereum: single param
address user = msg.sender;

// OPNet: dual system
Address sender = Blockchain.tx.sender;          // ML-DSA address (32 bytes)
ExtendedAddress origin = Blockchain.tx.origin;  // Both keys
```

### Dead/Burn Addresses
```
// Ethereum
address(0)        // zero address
0x...dEaD         // burn address

// OPNet
Address.zero()              // zero ML-DSA address
ExtendedAddress.dead()      // dead extended address (both keys zeroed)
```

**Analogy:** Passport (Bitcoin P2TR address for "international travel" / on-chain Bitcoin) + Driver's License (ML-DSA address for "local activities" / contract state). The wallet provides both; use the right one for the right purpose.

### Common Misconceptions
- **"I can use `bc1p...` addresses in contract storage"** -- No. Contract balances and state are keyed by ML-DSA addresses. Bitcoin addresses are for Bitcoin-level operations.
- **"`Address.fromString('bc1p...')` will work"** -- No. `Address.fromString()` takes hex-encoded ML-DSA key data, not bech32 Bitcoin addresses.
- **"Wallet address and contract address are the same format"** -- They use different cryptographic systems. The wallet provides both, but they serve different purposes.

---

## 3. The Quantum-Safe Migration

This is the single biggest conceptual difference from Ethereum. OPNet has a built-in migration path from classical to quantum-safe cryptography. Ethereum has none.

### Ethereum: `ecrecover` -- Forever Quantum-Vulnerable
```solidity
// Ethereum: recover address from signature
address signer = ecrecover(hash, v, r, s);
require(signer == expectedAddress, "Invalid signature");
```
- Uses ECDSA only -- no migration path
- Returns the **recovered address** (you compare it to expected)
- Fails silently by returning `address(0)` on invalid signatures
- Vulnerable to signature malleability
- Will be broken by quantum computers

### OPNet: `Blockchain.verifySignature` -- Consensus-Aware

```typescript
// OPNet: verify directly, no address recovery needed
const isValid: bool = Blockchain.verifySignature(
    Blockchain.tx.origin,       // ExtendedAddress (signer)
    signature,                   // Signature bytes
    messageHash,                 // 32-byte hash
    SignaturesMethods.Schnorr    // Signature type (default)
);
```

**Why no `ecrecover` equivalent?** OPNet's design is fundamentally different:
- You already KNOW the signer's address (it's `Blockchain.tx.origin` or provided as a parameter)
- The method takes the address as INPUT and returns a boolean
- No need to "recover" an address from the signature -- you verify AGAINST a known address
- This is more secure: no risk of accidentally accepting a valid signature from the wrong signer

### The Three Phases of Quantum Migration

| Phase | Schnorr/ECDSA | ML-DSA | `unsafeSignaturesAllowed()` |
|-------|---------------|--------|-----------------------------|
| Phase 1 (Current) | Accepted | Accepted | `true` |
| Phase 2 (Warning) | Deprecated warnings | Accepted | `true` with warnings |
| Phase 3 (Quantum-Safe) | **REJECTED** | Required | `false` |

**What this means for your code:**
- `Blockchain.verifySignature()` auto-selects the correct algorithm based on consensus phase
- Your contract code does NOT need to change when the network transitions between phases
- Consensus handles the switch transparently -- the same `verifySignature()` call works across all phases
- If you want to enforce quantum safety NOW: use `SignaturesMethods.MLDSA` explicitly

### ECDSA: Supported But WILL Break -- DO NOT USE

**IMPORTANT: When a user asks about ecrecover or ECDSA on OPNet, ALWAYS show `Blockchain.verifySignature()` with ML-DSA/Schnorr FIRST. Only mention ECDSA as a last resort if the user specifically insists after being warned. ECDSA is not just deprecated -- it is on a countdown to being permanently disabled. When the `UNSAFE_QUANTUM_SIGNATURES_ALLOWED` consensus flag is turned off, every contract using ECDSA will start reverting with no grace period. Users who use ECDSA because they are lazy will have their contracts break. There is no migration path once the flag flips -- the contract must be redeployed.**

If a user still insists on using ECDSA after being warned (e.g., for legacy compatibility), OPNet does support it today:

```typescript
// ECDSA -- Ethereum ecrecover model (DEPRECATED)
const isValid: bool = Blockchain.verifyECDSASignature(
    publicKey,      // 33, 64, or 65-byte secp256k1 public key
    signature,      // 65-byte signature: r(32) || s(32) || v(1)
    messageHash     // 32-byte message hash (typically keccak256)
);

// ECDSA -- Bitcoin direct verify model (DEPRECATED)
const isValid: bool = Blockchain.verifyBitcoinECDSASignature(
    publicKey,      // 33, 64, or 65-byte secp256k1 public key
    signature,      // 64-byte compact signature: r(32) || s(32)
    messageHash     // 32-byte message hash (typically SHA-256 double hash)
);
```

**These work today. They WILL stop working.** Understand:
- They are deprecated and WILL revert when the network moves to Phase 3 (no grace period)
- They do NOT go through `verifySignature()` -- they are separate methods that bypass consensus-aware selection
- They return boolean (like OPNet's model), not a recovered address (like Ethereum's model)
- There is ZERO reason to use them. Using ECDSA because you are too lazy to adapt is building a contract with an expiration date. When the flag flips, your contract is dead and must be redeployed
- The correct approach is `Blockchain.verifySignature()` with `SignaturesMethods.MLDSA` or `SignaturesMethods.Schnorr`, plus `MessageSigner` on the client side
- **The `@btc-vision/transaction` library does NOT support ECDSA signing.** `MessageSigner` has no ECDSA methods. There is no supported client-side tooling to produce ECDSA signatures — users would have to roll their own with raw secp256k1, which is unsupported and untested

### Client-Side Signing Comparison

| Ethereum | OPNet |
|----------|-------|
| `wallet.signMessage()` (always ECDSA) | `MessageSigner.signMLDSAMessageAuto()` (quantum-safe, recommended) |
| N/A | `MessageSigner.signMessageAuto()` (Schnorr, general signing) |
| N/A | `MessageSigner.tweakAndSignMessageAuto()` (Taproot ownership proofs) |

**Use the `Auto` methods.** They automatically use OP_WALLET in the browser (omit keypair) or fall back to local keypair signing on the backend (pass keypair). See `docs/core-transaction-quantum-support-04-message-signing.md` for full API details.

### API Comparison

| Aspect | Solidity `ecrecover` | OPNet `verifySignature` |
|--------|---------------------|------------------------|
| Returns | Recovered address | Boolean |
| Failure mode | Returns `address(0)` silently | Returns `false` |
| Parameters | `(hash, v, r, s)` split signature | `(address, signature, hash)` single blob |
| Quantum safe | Never | Yes via ML-DSA |
| Signature malleability | Vulnerable | Not vulnerable |
| Address recovery | Yes (that's its purpose) | No (you provide the address) |

**Analogy:** Building codes transition -- old wood-frame buildings (ECDSA) still pass inspection today, but the code is changing to require steel frames (ML-DSA). Build with steel now and you won't need to retrofit later.

### Common Misconceptions
- **"Deprecated means it doesn't work"** -- It works TODAY. It will stop working when the consensus flag changes to Phase 3.
- **"I need migration code in my contract"** -- No. Consensus handles the switch transparently. Your `verifySignature()` call adapts automatically.
- **"ML-DSA signatures are just bigger ECDSA"** -- Completely different math. ECDSA uses elliptic curves; ML-DSA uses lattice-based cryptography. They are not interchangeable.
- **"I need ecrecover to get the signer's address"** -- No. In OPNet you already have the signer's address from `Blockchain.tx.origin`. You verify AGAINST it, not recover FROM the signature. This is a more secure model.

---

## 4. Token Standards (ERC-20 -> OP-20, ERC-721 -> OP-721)

### Method Mapping: ERC-20 -> OP-20

| ERC-20 (Solidity) | OP-20 (AssemblyScript) | Notes |
|--------------------|----------------------|-------|
| `name()` | `name()` | Same |
| `symbol()` | `symbol()` | Same |
| `decimals()` | `decimals()` | Same |
| `totalSupply()` | `totalSupply()` | Returns `u256` |
| `balanceOf(address)` | `balanceOf(address)` | Uses ML-DSA address |
| `transfer(to, amount)` | `transfer(to, amount)` | `u256` SafeMath mandatory |
| `approve(spender, amount)` | `approve(spender, amount)` | Same concept |
| `allowance(owner, spender)` | `allowance(owner, spender)` | Same concept |
| `transferFrom(from, to, amount)` | `transferFrom(from, to, amount)` | Same concept |
| N/A | `increaseAllowanceBySig(...)` | Signature-based approval (OP-20S) |
| N/A | `decreaseAllowanceBySig(...)` | Signature-based approval (OP-20S) |

### Key Differences

1. **`u256` SafeMath is mandatory** -- AssemblyScript does not have built-in overflow checks. Use `SafeMath.add()`, `SafeMath.sub()`, etc. for ALL arithmetic.

2. **Explicit storage pointers** -- Ethereum uses implicit `mapping(address => uint256)`. OPNet requires explicit storage:
   ```typescript
   // Ethereum: implicit
   mapping(address => uint256) public balances;

   // OPNet: explicit pointers
   private balancesPointer: u16 = Blockchain.nextPointer;
   private balances: AddressMemoryMap;
   // Must initialize in constructor:
   this.balances = new AddressMemoryMap(this.balancesPointer);
   ```

3. **`onDeployment()` instead of constructor** -- The constructor in AssemblyScript runs on EVERY interaction (it initializes storage pointers). One-time initialization logic (like setting the owner, minting initial supply) goes in `onDeployment()`:
   ```typescript
   // Ethereum: constructor runs once at deploy
   constructor() { owner = msg.sender; totalSupply = 1000000; }

   // OPNet: constructor runs every time, onDeployment runs once
   constructor() { super(); this._owner = new StoredAddress(this.ownerPointer); }
   public override onDeployment(_calldata: Calldata): void {
       this._owner.value = Blockchain.tx.origin;
   }
   ```

4. **No `payable` keyword** -- Contracts never hold BTC. There is no equivalent to `msg.value`.

5. **No unbounded iteration** -- You cannot iterate over all keys of a mapping. Use stored aggregates (running totals, counters) instead.

### ERC-721 -> OP-721

The mapping follows the same pattern. Key additions in OP-721:
- Reservation system for NFT minting (prevents front-running)
- Two-phase commit for transfers involving BTC

For full ABI details, see: `docs/core-opnet-abi-reference-op20-abi.md` and `docs/core-opnet-abi-reference-op721-abi.md`

---

## 5. Airdrops -- The Claim Pattern

### Ethereum Approach
```solidity
// Loop and transfer (works on Ethereum)
for (uint i = 0; i < recipients.length; i++) {
    token.transfer(recipients[i], amounts[i]);
}
```

### OPNet: Claim-Based is the ONLY Option

You **cannot** loop through addresses and transfer tokens on OPNet. Two reasons:

1. **Dual address system**: You know users by their Bitcoin address (tweaked public key), but token balances are keyed by ML-DSA address. These are different cryptographic systems with no inherent link.

2. **No unbounded iteration**: OPNet contracts cannot iterate over mappings.

### The Claim Pattern

1. Deploy contract with allocations keyed by **tweaked public key** (Bitcoin address)
2. Users call `claim()` providing their signature as proof they own the Bitcoin address
3. Contract verifies the signature, looks up allocation by the tweaked key, and mints to the caller's ML-DSA address

The user's wallet provides both keys. The contract links them at claim time.

**Analogy (from existing docs):** The Banana Locker -- 300 monkeys known by face (Bitcoin address), lockers open with secret handshake (ML-DSA key). Each monkey must come to the locker, prove their face matches (signature verification), and then the locker opens using their handshake (ML-DSA key receives the tokens).

### Common Misconceptions
- **"Just loop and send like Uniswap"** -- Impossible on OPNet. No unbounded iteration, and the dual address system prevents direct transfers to unknown ML-DSA addresses.
- **"Users lose unclaimed tokens"** -- Yes, by design. Tokens allocated but never claimed remain locked. Set reasonable claim deadlines.
- **"I can airdrop to ML-DSA addresses directly"** -- Only if you already have them from prior wallet connection. For most airdrops, you know users by Bitcoin address only.

For complete implementation details, see: `docs/core-opnet-address-systems-airdrop-pattern.md`

---

## 6. Frontend / Wallet Integration

### Ethereum Model
```typescript
// Ethereum: one provider, one address
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const address = await signer.getAddress(); // 1 value
const contract = new ethers.Contract(addr, abi, signer);
```

### OPNet Model
```typescript
// OPNet: wallet context, FOUR identity values
// Uses @btc-vision/opwallet + @btc-vision/walletconnect
const { walletAddress, publicKey, hashedMLDSAKey, mldsaPublicKey } = useWalletConnect();
// Read operations use JSONRpcProvider (separate from wallet)
const provider = new JSONRpcProvider(rpcUrl, network);
// Contract instantiation needs 5 params
const contract = getContract<TokenABI>(contractAddress, abi, provider, network, senderAddress);
```

### Mapping Table

| Ethereum | OPNet |
|----------|-------|
| `window.ethereum` | OP_WALLET browser extension |
| `new ethers.BrowserProvider()` | `<WalletConnectProvider>` React context |
| `provider.getSigner()` | `useWalletConnect().signer` |
| `signer.getAddress()` (1 value) | `walletAddress` + `publicKey` + `hashedMLDSAKey` + `mldsaPublicKey` (4 values) |
| `new ethers.Contract(addr, abi, signer)` | `getContract(addr, abi, provider, network, senderAddress)` (5 params) |
| MetaMask `eth_sign` | `MessageSigner.signMLDSAMessageAuto()` (via OP_WALLET) |
| `contract.method()` (read) | `contract.method()` via ABI simulation |
| `contract.method()` (write) | Simulate first, then `sendTransaction(params)` |

### Critical Differences
- **Provider caching is MANDATORY** -- Unlike ethers.js where you can create providers freely, OPNet providers must be cached and reused. Creating new providers per request causes memory leaks and connection issues.
- **Read operations use `JSONRpcProvider`** -- Not the wallet provider. Separate concerns: wallet signs, provider reads.
- **ML-DSA signing is OP_WALLET only** -- UniSat and other Bitcoin wallets do not support ML-DSA signatures. OP_WALLET is the only wallet with full OPNet support.
- **Four identity values** -- Ethereum gives you one address. OPNet wallet provides four: `walletAddress` (Bitcoin), `publicKey` (Schnorr), `hashedMLDSAKey` (ML-DSA hash), `mldsaPublicKey` (full ML-DSA public key).

For full wallet integration details, see: `docs/clients-walletconnect-README.md` and `docs/clients-walletconnect-wallet-integration.md`

---

## 7. Transaction Model

### Ethereum Model
```typescript
// Ethereum: call method, atomic result
const tx = await contract.transfer(to, amount, { gasPrice, gasLimit });
const receipt = await tx.wait();
// If reverts: entire transaction undone, gas spent, ETH returned
```

### OPNet Model: Simulate-Then-Send

```typescript
// OPNet: MUST simulate first, then build/sign/broadcast
// Step 1: Simulate (free, instant, off-chain)
const result = await contract.transfer(to, amount);
if ('error' in result) throw new Error(result.error);

// Step 2: Send transaction (on-chain, costs BTC)
const txResult = await result.sendTransaction({
    signer,
    refundTo: walletAddress,
    maximumAllowedSatToSpend: 1_000_000n,
    feeRate: 10,
    priorityFee: 1000n,
    network
});
```

### Why Simulate First?
On Ethereum, if a transaction reverts, everything is atomic -- your ETH (minus gas) comes back. On OPNet, **BTC transfers are irreversible**. If the contract state reverts, any BTC you included in the transaction is gone. Simulation catches errors before you commit real BTC.

### Fee Model Differences

| Ethereum | OPNet |
|----------|-------|
| `gasPrice * gasUsed` (single fee) | Bitcoin fee rate (sat/vB) + priority fee (satoshis) + contract gas (separate) |
| Gas protects against infinite loops | Gas protects against infinite loops AND prioritizes execution |
| Gas refund on early completion | No gas refund -- fixed cost model |

### Partial Reverts (THE CRITICAL DIFFERENCE)

| Scenario | Ethereum | OPNet |
|----------|----------|-------|
| Contract logic fails | Entire TX reverts, ETH returned (minus gas) | Contract state reverts, **BTC transfers DO NOT revert** |
| Implications | Safe to send ETH with contract calls | NEVER send BTC expecting conditional logic to protect you |

**Analogy:** Ethereum is a wire transfer -- the bank reverses it on failure. OPNet is a cash handoff with a notary -- the cash changes hands immediately, the notary records whether the deal was valid, but the cash is gone regardless.

### Common Misconceptions
- **"If my contract reverts, I get my BTC back"** -- **NO.** BTC transfers in a transaction complete regardless of contract state. This is the most dangerous misconception for Ethereum developers.
- **"I just call the method and wait"** -- No. You must simulate -> verify result -> build transaction -> sign -> broadcast. The simulate step is not optional.
- **"Gas protects me from losing money"** -- Gas protects against infinite execution. It does NOT protect against losing BTC when contract logic reverts.

---

## 8. Contract Design Patterns

### Verify-Don't-Custody (No `payable`)

| Ethereum | OPNet |
|----------|-------|
| Contract holds ETH/tokens via `payable` | Contract NEVER holds BTC |
| `msg.value` gives amount sent | No equivalent -- contracts verify Bitcoin outputs exist |
| `address(this).balance` | Not possible -- contracts have no BTC balance |

Contracts on OPNet verify that specific Bitcoin outputs exist in the transaction (e.g., "user sent 0.1 BTC to address X"), then update state accordingly. They are witnesses, not custodians.

### Storage Model

```typescript
// Ethereum: implicit, no pointers
mapping(address => uint256) public balances;
uint256 public totalSupply;

// OPNet: explicit pointers, explicit types
private balancesPointer: u16 = Blockchain.nextPointer;
private totalSupplyPointer: u16 = Blockchain.nextPointer;
private balances: AddressMemoryMap;
private _totalSupply: StoredU256;

constructor() {
    super();
    this.balances = new AddressMemoryMap(this.balancesPointer);
    this._totalSupply = new StoredU256(this.totalSupplyPointer);
}
```

Every storage variable needs a unique pointer from `Blockchain.nextPointer`. Pointer assignments MUST be class field initializers (not inside methods), and their order MUST be stable across contract versions.

### Access Control

```typescript
// Ethereum: OpenZeppelin Ownable
import "@openzeppelin/contracts/access/Ownable.sol";
contract MyToken is Ownable { ... }

// OPNet: manual pattern
private ownerPointer: u16 = Blockchain.nextPointer;
private _owner: StoredAddress;

private onlyOwner(): void {
    if (Blockchain.tx.sender != this._owner.value) {
        throw new Revert('Not owner');
    }
}
```

The `Address` class has operator overloading (`@operator('==')` / `@operator('!=')`) so you use `==`/`!=` directly -- no `.equals()` call needed. There is no OpenZeppelin equivalent. Access control is implemented manually.

### Events

```typescript
// Ethereum: event declaration + emit
event Transfer(address indexed from, address indexed to, uint256 value);
emit Transfer(from, to, value);

// OPNet: @emit decorator on the method
@emit('Transfer')
public transfer(calldata: Calldata): BytesWriter { ... }
```

### The Constructor Trap

**This catches every Ethereum developer.** In Solidity, the constructor runs once at deployment. In OPNet:

- The **constructor** runs on EVERY contract interaction (it sets up storage pointers)
- **`onDeployment()`** runs once at deployment (this is where one-time init goes)

```typescript
// WRONG -- this mints tokens on every call!
constructor() {
    super();
    this._totalSupply.value = u256.fromU64(1000000);
}

// CORRECT -- mint only at deployment
public override onDeployment(_calldata: Calldata): void {
    this._totalSupply.value = u256.fromU64(1000000);
    this._owner.value = Blockchain.tx.origin;
}
```

---

## 9. DEX / DeFi Patterns

### Ethereum AMMs
- Contracts hold both assets (ETH + tokens) in liquidity pools
- Atomic swaps: send ETH, receive tokens in same transaction
- If swap fails, everything reverts cleanly

### OPNet: NativeSwap Pattern
- Contracts **cannot hold BTC** -- virtual reserves track value
- Two-phase commit: reserve first, execute after Bitcoin confirmation
- CSV timelocks prevent transaction pinning attacks
- Anti-pinning mechanisms protect against MEV-style attacks

| Ethereum AMM | OPNet NativeSwap |
|-------------|-----------------|
| `swap(tokenIn, amountIn)` with ETH value | Reserve -> wait for confirmation -> execute |
| Atomic (instant) | Two-phase (reservation + execution) |
| Contract holds both assets | Virtual reserves, contract holds only tokens |
| Revert protects user | **BTC is gone on revert** -- reservations prevent this |

**Why so different?** Three fundamental constraints:
1. Contracts can't hold BTC (verify-don't-custody)
2. Bitcoin transfers are irreversible (even if contract state reverts)
3. Bitcoin's 10-minute block time creates front-running windows that don't exist on Ethereum's ~12-second blocks

For full NativeSwap architecture, see: SKILL.md "NativeSwap: How to Build a Real DEX on Bitcoin" section and `docs/core-opnet-examples-advanced-swaps.md`

---

## 10. Quick Reference Cheat Sheet

| You Want To... | Ethereum | OPNet |
|----------------|----------|-------|
| Get sender | `msg.sender` | `Blockchain.tx.sender` |
| Get origin | `tx.origin` | `Blockchain.tx.origin` |
| Check owner | `require(msg.sender == owner)` | Manual `onlyOwner()` with `Blockchain.tx.sender != this._owner.value` |
| Zero address | `address(0)` | `Address.zero()` |
| Burn address | `0x...dEaD` | `ExtendedAddress.dead()` |
| Verify signature | `ecrecover(h,v,r,s)` | `Blockchain.verifySignature(addr, sig, hash)` |
| ECDSA (deprecated) | `ecrecover(h,v,r,s)` | `Blockchain.verifyECDSASignature(pubkey, sig, hash)` |
| Token standard | ERC-20 | OP-20 (OIP-0020) |
| NFT standard | ERC-721 | OP-721 (OIP-0721) |
| Safe math | Default checked (0.8+) | `SafeMath.add/sub/mul/div` (mandatory) |
| Connect wallet | `window.ethereum` + MetaMask | OP_WALLET + `@btc-vision/walletconnect` |
| Create contract instance | `new ethers.Contract(a, abi, s)` | `getContract(a, abi, p, net, sender)` |
| Read state | `contract.method()` | `contract.method()` (via ABI simulation) |
| Write state | `contract.method({value})` | Simulate then `sendTransaction(params)` |
| Airdrop tokens | Loop `transfer()` or Merkle distributor | Claim-based contract (ONLY option) |
| Hold native currency | `payable` + `msg.value` | **IMPOSSIBLE** (verify-don't-custody) |
| Iterate accounts | `for` over mapping | **FORBIDDEN** (use stored aggregates) |
| Deploy-time init | `constructor()` | `onDeployment()` (constructor runs every time!) |
| Storage variable | `uint256 public x;` | `StoredU256` with `Blockchain.nextPointer` |
| Mapping | `mapping(address => uint256)` | `AddressMemoryMap` with pointer |
| Access control | OpenZeppelin `Ownable` | Manual `onlyOwner()` pattern |
| Events | `event X(); emit X();` | `@emit('X')` decorator |
| Revert | `require()` / `revert()` | `throw new Revert('message')` |
| Constructor | Runs once at deploy | `onDeployment()` runs once; constructor runs EVERY time |

---

## Cross-References

For detailed implementation of each concept, refer to these skill docs:

| Topic | Primary Doc |
|-------|-------------|
| Address types | `docs/contracts-btc-runtime-types-address.md` |
| Signature verification | `docs/contracts-btc-runtime-advanced-signature-verification.md` |
| Quantum migration | `docs/core-transaction-quantum-support-README.md` |
| OP-20 ABI | `docs/core-opnet-abi-reference-op20-abi.md` |
| OP-721 ABI | `docs/core-opnet-abi-reference-op721-abi.md` |
| Airdrop pattern | `docs/core-opnet-address-systems-airdrop-pattern.md` |
| Wallet integration | `docs/clients-walletconnect-README.md` |
| Sending transactions | `docs/core-opnet-contracts-sending-transactions.md` |
| Simulating calls | `docs/core-opnet-contracts-simulating-calls.md` |
| Storage system | `docs/contracts-btc-runtime-core-concepts-storage-system.md` |
| Decorators/Events | `docs/contracts-btc-runtime-core-concepts-decorators.md` |
| NativeSwap/DEX | SKILL.md "NativeSwap" section |
| Security patterns | `docs/contracts-btc-runtime-core-concepts-security.md` |
