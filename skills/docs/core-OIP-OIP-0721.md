# OIP-721: OP_NET Non-Fungible Token Standard

## Preamble

```
OIP: 0721
Title: OP_NET Non-Fungible Token Standard
Author: OP_NET
Status: Pending Adoption
Type: Standards Track
Category: Token
Created: 2025-08-22
Requires: OP_NET Core Protocol
```

## Abstract

The OP721 standard defines a comprehensive interface for non-fungible tokens (NFTs) on OP_NET, incorporating critical improvements over ERC-721 through mandatory safe transfers, signature-based gasless operations using Schnorr signatures, built-in enumeration capabilities, flexible URI management, and enhanced security features. Unlike ERC-721's minimalist approach that led to billions in lost NFTs and poor user experience, OP721 prioritizes safety and developer experience through built-in protection mechanisms, efficient storage architecture optimized for WebAssembly execution, and native support for complex NFT operations.

## Motivation

While ERC-721 pioneered NFTs on blockchain, real-world usage exposed critical weaknesses:

1. **Lost NFTs**: Users accidentally sending NFTs to contracts unable to handle them, resulting in permanent loss
2. **Poor Enumeration**: No standard way to enumerate tokens owned by addresses, requiring expensive external indexing
3. **Inefficient Approvals**: Single-token approval model creates friction for marketplaces and wallets
4. **No Gasless Operations**: Every approval and transfer requires gas from the token owner
5. **Missing Safety Features**: No built-in burn mechanism, no receiver validation, no batch operations
6. **URI Inflexibility**: Immutable URIs prevent fixing metadata issues or upgrading to new standards

OP721 addresses these fundamental issues while introducing OP_NET-specific optimizations:
- Schnorr signature integration enabling efficient cryptographic operations with smaller signatures
- Native enumeration using OP_NET's storage pointer system for O(1) token discovery
- Dual-nonce system separating transfer and approval operations for better security
- Built-in domain separation using OP_NET's chain and protocol identifiers
- Optimized storage layout for AssemblyScript/WebAssembly execution environment
- Flexible URI system supporting both base URIs and per-token custom URIs

## Specification

### Core Architecture

The OP721 standard extends `ReentrancyGuard` and implements the `IOP721` interface. It uses a sophisticated storage pointer system optimized for NFT operations:

```typescript
// Primary Storage Pointers
const namePointer: u16 = Blockchain.nextPointer;              // Collection name
const symbolPointer: u16 = Blockchain.nextPointer;            // Collection symbol
const baseURIPointer: u16 = Blockchain.nextPointer;           // Base URI for metadata
const totalSupplyPointer: u16 = Blockchain.nextPointer;       // Total tokens minted
const maxSupplyPointer: u16 = Blockchain.nextPointer;         // Maximum supply cap
const ownerOfMapPointer: u16 = Blockchain.nextPointer;        // tokenId -> owner
const tokenApprovalMapPointer: u16 = Blockchain.nextPointer;  // tokenId -> approved
const operatorApprovalMapPointer: u16 = Blockchain.nextPointer; // owner -> operator -> bool
const balanceOfMapPointer: u16 = Blockchain.nextPointer;      // owner -> balance
const tokenURIMapPointer: u16 = Blockchain.nextPointer;       // tokenId -> URI index
const nextTokenIdPointer: u16 = Blockchain.nextPointer;       // Next token ID to mint
const ownerTokensMapPointer: u16 = Blockchain.nextPointer;    // owner -> token array
const tokenIndexMapPointer: u16 = Blockchain.nextPointer;     // tokenId -> array index
const initializedPointer: u16 = Blockchain.nextPointer;       // Initialization flag
const tokenURICounterPointer: u16 = Blockchain.nextPointer;   // URI storage counter
const transferNonceMapPointer: u16 = Blockchain.nextPointer;  // Transfer signature nonces
const approveNonceMapPointer: u16 = Blockchain.nextPointer;   // Approval signature nonces
```

### Initialization System

#### instantiate - One-Time Collection Configuration

```typescript
function instantiate(
    params: OP721InitParameters,
    skipDeployerVerification: boolean = false
): void
```

**Parameters Structure:**
```typescript
interface OP721InitParameters {
    name: string        // Collection name (e.g., "CryptoPunks on OP_NET")
    symbol: string      // Collection symbol (e.g., "PUNK.op")
    baseURI: string     // Base URI for token metadata
    maxSupply: u256     // Maximum tokens that can ever exist
}
```

**Initialization Rules:**
- Can only be called once per contract deployment
- Name and symbol cannot be empty strings
- Maximum supply must be greater than zero
- Base URI can be empty (set later) but recommended at initialization
- All parameters become immutable after setting (except baseURI)

### Collection Information Methods

#### name - Get Collection Name
```typescript
@method('name')
@returns({ name: 'name', type: ABIDataTypes.STRING })
function name(): string
```
Returns the full collection name with proper length encoding.

#### symbol - Get Collection Symbol
```typescript
@method('symbol')
@returns({ name: 'symbol', type: ABIDataTypes.STRING })
function symbol(): string
```
Returns the collection's symbol identifier.

#### totalSupply - Current Number of Tokens
```typescript
@method('totalSupply')
@returns({ name: 'totalSupply', type: ABIDataTypes.UINT256 })
function totalSupply(): u256
```
Returns total number of tokens currently in existence (minted minus burned).

#### maxSupply - Maximum Possible Supply
```typescript
@method('maxSupply')
@returns({ name: 'maxSupply', type: ABIDataTypes.UINT256 })
function maxSupply(): u256
```
Returns the maximum number of tokens that can ever exist - cryptographically enforced.

### Token Metadata System

#### tokenURI - Get Token Metadata URI
```typescript
@method({ name: 'tokenId', type: ABIDataTypes.UINT256 })
@returns({ name: 'uri', type: ABIDataTypes.STRING })
function tokenURI(tokenId: u256): string
```

**URI Resolution Process:**
1. Checks if token exists (reverts if not)
2. Looks for custom URI set via `_setTokenURI`
3. If custom URI exists, returns it
4. Otherwise returns `baseURI + tokenId`

This dual system provides flexibility - collections can use efficient base URIs for most tokens while setting custom URIs for special editions or updated metadata.

#### setBaseURI - Update Base URI (Protected)
```typescript
@method({ name: 'baseURI', type: ABIDataTypes.STRING })
@emit('URI')
function setBaseURI(baseURI: string): void
```

**Features:**
- Only callable by contract deployer
- Cannot be empty string
- Maximum length of 1024 characters
- Emits URI event for indexers
- Affects all tokens without custom URIs

### Ownership and Balance Queries

#### balanceOf - Query Token Balance
```typescript
@method({ name: 'owner', type: ABIDataTypes.ADDRESS })
@returns({ name: 'balance', type: ABIDataTypes.UINT256 })
function balanceOf(owner: Address): u256
```
Returns number of tokens owned by address. Reverts for zero/dead addresses.

#### ownerOf - Query Token Owner
```typescript
@method({ name: 'tokenId', type: ABIDataTypes.UINT256 })
@returns({ name: 'owner', type: ABIDataTypes.ADDRESS })
function ownerOf(tokenId: u256): Address
```
Returns the current owner of a token. Reverts if token doesn't exist.

### Enumeration Extensions

#### tokenOfOwnerByIndex - Get Token by Index
```typescript
@method(
    { name: 'owner', type: ABIDataTypes.ADDRESS },
    { name: 'index', type: ABIDataTypes.UINT256 }
)
@returns({ name: 'tokenId', type: ABIDataTypes.UINT256 })
function tokenOfOwnerByIndex(owner: Address, index: u256): u256
```

**Enumeration Features:**
- O(1) access to any token by index
- Enables efficient iteration through owner's tokens
- Automatically maintained during transfers
- Critical for wallets and marketplaces

This solves a major ERC-721 limitation where discovering which tokens an address owns requires expensive event scanning or external indexing services.

### Safe Transfer System

#### safeTransferFrom - Protected NFT Transfer
```typescript
@method(
    { name: 'from', type: ABIDataTypes.ADDRESS },
    { name: 'to', type: ABIDataTypes.ADDRESS },
    { name: 'tokenId', type: ABIDataTypes.UINT256 },
    { name: 'data', type: ABIDataTypes.BYTES }
)
@emit('Transferred')
function safeTransferFrom(
    from: Address,
    to: Address,
    tokenId: u256,
    data: bytes
): void
```

**Transfer Process:**
1. Validates ownership and authorization
2. Prevents transfers to zero/dead addresses
3. Updates ownership and balances atomically
4. Clears any existing approval
5. If recipient is a contract:
    - Calls `onOP721Received` on recipient
    - Recipient must return selector `0xd83e7dbc`
    - Transfer reverts if recipient rejects
6. Emits `Transferred` event

**Safety Improvements over ERC-721:**
- Mandatory receiver validation (not optional)
- Includes operator in receiver callback
- Atomic state changes before external calls
- Built-in reentrancy protection

#### transferFrom - Basic Transfer (Use Cautiously)
```typescript
@method(
    { name: 'from', type: ABIDataTypes.ADDRESS },
    { name: 'to', type: ABIDataTypes.ADDRESS },
    { name: 'tokenId', type: ABIDataTypes.UINT256 }
)
@emit('Transferred')
function transferFrom(from: Address, to: Address, tokenId: u256): void
```

Performs transfer without receiver validation. Only use when certain the recipient can handle NFTs.

### Approval Management

#### approve - Grant Single Token Permission
```typescript
@method(
    { name: 'to', type: ABIDataTypes.ADDRESS },
    { name: 'tokenId', type: ABIDataTypes.UINT256 }
)
@emit('Approved')
function approve(to: Address, tokenId: u256): void
```

**Authorization Rules:**
- Only token owner or approved operator can approve
- Cannot approve to zero address
- Cannot approve to current owner
- Approval cleared on transfer

#### getApproved - Query Token Approval
```typescript
@method({ name: 'tokenId', type: ABIDataTypes.UINT256 })
@returns({ name: 'approved', type: ABIDataTypes.ADDRESS })
function getApproved(tokenId: u256): Address
```
Returns currently approved address for a token (zero if none).

#### setApprovalForAll - Grant Operator Permission
```typescript
@method(
    { name: 'operator', type: ABIDataTypes.ADDRESS },
    { name: 'approved', type: ABIDataTypes.BOOL }
)
@emit('ApprovedForAll')
function setApprovalForAll(operator: Address, approved: bool): void
```

Grants or revokes permission for operator to manage all caller's tokens. Essential for marketplace integration.

#### isApprovedForAll - Query Operator Status
```typescript
@method(
    { name: 'owner', type: ABIDataTypes.ADDRESS },
    { name: 'operator', type: ABIDataTypes.ADDRESS }
)
@returns({ name: 'approved', type: ABIDataTypes.BOOL })
function isApprovedForAll(owner: Address, operator: Address): bool
```
Checks if operator can manage all of owner's tokens.

### Signature-Based Operations (Gasless Transfers)

#### transferBySignature - Gasless Token Transfer
```typescript
@method(
    { name: 'owner', type: ABIDataTypes.ADDRESS },
    { name: 'to', type: ABIDataTypes.ADDRESS },
    { name: 'tokenId', type: ABIDataTypes.UINT256 },
    { name: 'deadline', type: ABIDataTypes.UINT64 },
    { name: 'signature', type: ABIDataTypes.BYTES }
)
@emit('Transferred')
function transferBySignature(
    owner: Address,
    to: Address,
    tokenId: u256,
    deadline: u64,
    signature: bytes
): void
```

**Signature Structure:**
```
OP721Transfer(
    address owner,
    address to,
    uint256 tokenId,
    uint256 nonce,
    uint64 deadline
)
```

**Verification Process:**
1. Validates 64-byte Schnorr signature
2. Checks deadline hasn't passed
3. Retrieves transfer nonce (separate from approval nonce)
4. Builds EIP-712 style structured hash
5. Verifies signature using `Blockchain.verifySchnorrSignature`
6. Increments transfer nonce
7. Executes transfer

#### approveBySignature - Gasless Approval
```typescript
@method(
    { name: 'owner', type: ABIDataTypes.ADDRESS },
    { name: 'spender', type: ABIDataTypes.ADDRESS },
    { name: 'tokenId', type: ABIDataTypes.UINT256 },
    { name: 'deadline', type: ABIDataTypes.UINT64 },
    { name: 'signature', type: ABIDataTypes.BYTES }
)
@emit('Approved')
function approveBySignature(
    owner: Address,
    spender: Address,
    tokenId: u256,
    deadline: u64,
    signature: bytes
): void
```

Uses separate approval nonce to prevent interference with transfer signatures.

### Nonce Management

#### getTransferNonce - Query Transfer Nonce
```typescript
@method({ name: 'owner', type: ABIDataTypes.ADDRESS })
@returns({ name: 'nonce', type: ABIDataTypes.UINT256 })
function getTransferNonce(owner: Address): u256
```

#### getApproveNonce - Query Approval Nonce
```typescript
@method({ name: 'owner', type: ABIDataTypes.ADDRESS })
@returns({ name: 'nonce', type: ABIDataTypes.UINT256 })
function getApproveNonce(owner: Address): u256
```

The dual-nonce system prevents replay attacks while allowing parallel processing of transfers and approvals.

### Token Management

#### burn - Destroy Token
```typescript
@method({ name: 'tokenId', type: ABIDataTypes.UINT256 })
@emit('Transferred')
function burn(tokenId: u256): void
```

**Burn Authorization:**
- Token owner can always burn
- Approved address can burn
- Approved operator can burn

**Burn Process:**
1. Validates authorization
2. Clears all approvals
3. Removes from enumeration
4. Updates balances and supply
5. Deletes custom URI if exists
6. Emits transfer to zero address

### Domain Separation

#### domainSeparator - Get Unique Domain Hash
```typescript
@method()
@returns({ name: 'domainSeparator', type: ABIDataTypes.BYTES32 })
function domainSeparator(): bytes32
```

**Domain Structure:**
```
OP712Domain(
    string name,
    string version,
    bytes32 chainId,
    bytes32 protocolId,
    address verifyingContract
)
```

Prevents signature replay across chains and contracts.

## Protected Methods for Inheritance

### _mint - Create New Token
```typescript
protected _mint(to: Address, tokenId: u256): void
```
- Validates recipient address
- Checks token doesn't exist
- Enforces maximum supply
- Updates enumeration and balances
- Emits Transferred event from zero address

### _burn - Internal Burn Implementation
```typescript
protected _burn(tokenId: u256): void
```
- Handles all cleanup and state updates
- Maintains enumeration integrity
- Clears custom URIs

### _transfer - Core Transfer Logic
```typescript
protected _transfer(from: Address, to: Address, tokenId: u256): void
```
- Validates all participants
- Updates enumeration for both parties
- Clears approvals
- Handles balance updates

### _setTokenURI - Set Custom Token URI
```typescript
protected _setTokenURI(tokenId: u256, uri: string): void
```
- Validates token exists
- Enforces 1024 character limit
- Uses efficient storage indexing
- Emits URI event

## Receiver Interface

Contracts accepting OP721 tokens must implement:

```typescript
interface IOP721Receiver {
    function onOP721Received(
        operator: Address,  // Who initiated the transfer
        from: Address,      // Previous owner
        tokenId: u256,      // Token being transferred
        data: bytes         // Additional data
    ): bytes4;
}
```

Must return `0xd83e7dbc` to accept transfer.

## Events

### Transferred Event
```typescript
event Transferred(
    operator: Address,  // Who initiated transfer
    from: Address,      // Previous owner (zero for mint)
    to: Address,        // New owner (zero for burn)
    tokenId: u256       // Token transferred
)
```

### Approved Event
```typescript
event Approved(
    owner: Address,     // Token owner
    approved: Address,  // Approved address
    tokenId: u256       // Token approved
)
```

### ApprovedForAll Event
```typescript
event ApprovedForAll(
    owner: Address,     // Token owner
    operator: Address,  // Operator address
    approved: bool      // Approval status
)
```

### URI Event
```typescript
event URI(
    value: string,      // New URI
    tokenId: u256       // Affected token (or zero for baseURI)
)
```

## Storage Architecture

### Efficient Enumeration Design

The enumeration system uses a sophisticated array-based approach:

```typescript
// Per-owner token arrays
ownerTokensMap: Map<Address, StoredU256Array>  // Owner -> [tokenIds]
tokenIndexMap: StoredMapU256                    // TokenId -> array index
```

When transferring a token:
1. Remove from sender's array (swap with last element, pop)
2. Add to receiver's array (push)
3. Update index mappings

This provides O(1) operations for all enumeration needs while maintaining array integrity.

### Address Storage Optimization

OP_NET uses 32-byte addresses (tweaked public keys), stored efficiently as u256 values:
- Direct conversion between Address and u256
- No truncation or padding needed
- Cryptographically secure due to elliptic curve properties

## Security Considerations

### Mathematical Safety
- All arithmetic uses SafeMath to prevent overflows
- Balance invariants maintained across all operations
- Supply constraints cryptographically enforced

### Reentrancy Protection
- Inherits from ReentrancyGuard base class
- State changes complete before external calls
- Check-effects-interactions pattern enforced

### Signature Security
- Schnorr signatures (more efficient than ECDSA)
- Dual-nonce system prevents operation interference
- Domain separation prevents cross-chain replay
- Deadline enforcement prevents indefinite validity

### Transfer Safety
- Mandatory receiver validation in safe transfers
- Zero/dead address protection
- Approval clearing on transfer
- Atomic state updates

## Comparison with ERC-721 and Bitcoin Ordinals

### Feature Comparison Table

| Feature | ERC-721 | Bitcoin Ordinals | OP721 |
|---------|---------|-----------------|-------|
| **Architecture** | Smart contracts on EVM | Inscription | Smart contracts on Bitcoin |
| **Basic Transfers** | ✓ | ✓ (as Bitcoin tx) | ✓ |
| **Safe Transfers** | Optional | ✗ | Mandatory |
| **Transfer Hooks** | ✓ | ✗ | ✓ |
| **Built-in Enumeration** | ✗ | ✗ | ✓ |
| **Gasless Operations** | ✗ | ✗ | ✓ |
| **Native Burn** | ✗ | ✗ | ✓ |
| **Max Supply Enforcement** | ✗ | ✗ | ✓ |
| **Flexible URI System** | ✗ | ✗ | ✓ |
| **Dual Nonce System** | ✗ | ✗ | ✓ |
| **Signature Type** | ECDSA | N/A | Schnorr |
| **Storage Optimization** | External | On-chain (expensive) | Built-in |
| **Operator in Callbacks** | ✗ | ✗ | ✓ |
| **Programmability** | Full | None | Full |
| **Metadata Storage** | Off-chain URI | On-chain inscription | Flexible URI |
| **Approval System** | ✓ | ✗ | ✓ |
| **Royalty Support** | Extensions | ✗ | Programmable |
| **Update Capability** | ✗ | ✗ | ✓ (URIs) |

### Cost Analysis for Different Use Cases

Consider creating a 10,000 NFT collection:

**ERC-721 on Ethereum:**
- Deploy contract: ~$50-200 (depending on gas prices)
- Minting cost: ~$2-10 per NFT during normal conditions
- Metadata: Stored off-chain (IPFS/Arweave)
- Enumeration: Requires external indexing

**Bitcoin Ordinals:**
- Each inscription: 50-100KB for image data
- Cost at $0.50/KB: ~$25-50 per NFT
- Total: ~$250,000-500,000 in Bitcoin fees
- Blockchain bloat: 500MB-1GB permanently
- No smart contract deployment needed
- Metadata: Entirely on-chain (expensive but immutable)

**OP721 on OP_NET:**
- Deploy contract: Minimal OP_NET fees
- State updates: Few bytes per mint
- Metadata: Flexible (IPFS/Arweave/custom)
- Enumeration: Built-in, no external services needed

### User Experience Implications

The user experience differs significantly based on which standard is used:

**ERC-721 Users** need Ethereum wallets, must pay gas for every operation, and risk losing NFTs to contracts that can't handle them. They rely on external services to see their full NFT portfolio and must manage ETH for gas fees.

**Ordinals Users** need specialized Bitcoin wallets that understand ordinal theory, must carefully manage UTXOs to avoid accidentally spending inscribed satoshis, and have no standard way to discover their ordinals without external indexers. Every transfer is a simple Bitcoin transaction with no additional features.

**OP721 Users** operations through signature-based transfers, mandatory safety checks preventing accidental loss, built-in enumeration for easy portfolio viewing, and familiar approval patterns for marketplace interactions. The experience combines Ethereum's UX innovations with Bitcoin's security.

### Security Model Comparison

Each approach has distinct security characteristics:

**ERC-721** relies on Ethereum's security model with smart contract risks but benefits from battle-tested code and extensive auditing. The optional safety features mean user mistakes can lead to permanent loss.

**Ordinals** inherit Bitcoin's maximum security but offer no recovery mechanisms or safety features. The simplicity eliminates smart contract risk but provides no protection against user errors.

**OP721** leverages Bitcoin's security through OP_NET while adding multiple safety layers: mandatory receiver validation, reentrancy protection, dual-nonce systems for replay protection, and safe mathematical operations. This provides the most comprehensive security model.

### Future Evolution Potential

**ERC-721** evolution is limited by backward compatibility requirements and the established ecosystem. New features come through extension standards like ERC-2981 for royalties.

**Ordinals** are intentionally static with evolution happening at the social layer through indexing standards and marketplace conventions rather than protocol changes.

**OP721** can evolve with OP_NET's capabilities, potentially adding cross-chain bridges, advanced cryptographic proofs, or ownership models without breaking existing implementations.
