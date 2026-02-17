# OIP-20: OP_NET Token Standard

## Preamble

```
OIP: 0020
Title: OP_NET Token Standard
Author: OP_NET
Status: Active
Type: Standards Track
Category: Token
Created: 2025-07-01
Requires: OP_NET Core Protocol
```

## Abstract

The OP_20 standard defines a comprehensive interface for fungible tokens on OP_NET, incorporating lessons learned from years of ERC-20 usage and billions of dollars in lost tokens. This standard introduces mandatory safe transfers with receiver validation, signature-based gasless approvals using Schnorr signatures, cryptographically enforced maximum supply limits, and unified metadata retrieval. Unlike ERC-20's minimalist approach, OP_20 prioritizes user safety and developer experience through built-in protection mechanisms while maintaining high performance and composability.

## Motivation

The ERC-20 standard revolutionized blockchain tokens but revealed critical weaknesses through real-world usage:

1. **Billions in Lost Tokens**: Users accidentally sending tokens to contracts that cannot process them
2. **Front-Running Vulnerabilities**: The approval race condition enabling double-spend attacks
3. **Inefficient Data Retrieval**: Multiple RPC calls needed for basic token information
4. **Lack of Native Safety**: No built-in mechanisms to prevent common user errors
5. **Missing Features**: No native burn, no gasless operations, no receiver notifications

OP_20 addresses these issues while introducing OP_NET-specific optimizations:
- Schnorr signature integration for efficient cryptographic operations
- Native support for the OP_NET memory model and storage pointers
- Built-in domain separation using OP_NET's chain and protocol identifiers
- Optimized for AssemblyScript/WebAssembly execution environment

## Specification

### Token Information Methods

#### name - Get Token Name
```typescript
@method('name')
@returns({ name: 'name', type: ABIDataTypes.STRING })
function name(): string
```
Returns the full token name with proper length encoding.

#### symbol - Get Trading Symbol
```typescript
@method('symbol')
@returns({ name: 'symbol', type: ABIDataTypes.STRING })
function symbol(): string
```
Returns the token's trading symbol.

#### icon - Get Token Icon
```typescript
@method('icon')
@returns({ name: 'icon', type: ABIDataTypes.STRING })
function icon(): string
```
Returns the token's icon URI or identifier for wallet/UI display.

#### decimals - Get Decimal Places
```typescript
@method('decimals')
@returns({ name: 'decimals', type: ABIDataTypes.UINT8 })
function decimals(): uint8
```
Returns decimal places (0-32). Zero decimals creates non-divisible tokens.

#### totalSupply - Current Circulating Supply
```typescript
@method('totalSupply')
@returns({ name: 'totalSupply', type: ABIDataTypes.UINT256 })
function totalSupply(): uint256
```
Returns the current total supply of tokens in circulation.

#### metadata - Unified Information Retrieval
```typescript
@method()
@returns(
    { name: 'name', type: ABIDataTypes.STRING },
    { name: 'symbol', type: ABIDataTypes.STRING },
    { name: 'icon', type: ABIDataTypes.STRING },
    { name: 'decimals', type: ABIDataTypes.UINT8 },
    { name: 'totalSupply', type: ABIDataTypes.UINT256 },
    { name: 'domainSeparator', type: ABIDataTypes.BYTES32 }
)
function metadata(): BytesWriter
```
Returns all token metadata in a single call - eliminates multiple RPC roundtrips.

### Balance and State Queries

#### balanceOf - Query Token Balance
```typescript
@method({ name: 'owner', type: ABIDataTypes.ADDRESS })
@returns({ name: 'balance', type: ABIDataTypes.UINT256 })
function balanceOf(owner: Address): uint256
```
Returns the token balance for any address. Non-existent addresses return zero.

#### allowance - Query Spending Permission
```typescript
@method(
    { name: 'owner', type: ABIDataTypes.ADDRESS },
    { name: 'spender', type: ABIDataTypes.ADDRESS }
)
@returns({ name: 'remaining', type: ABIDataTypes.UINT256 })
function allowance(owner: Address, spender: Address): uint256
```
Returns remaining tokens that spender can transfer from owner's account.

#### nonceOf - Query Signature Nonce
```typescript
@method({ name: 'owner', type: ABIDataTypes.ADDRESS })
@returns({ name: 'nonce', type: ABIDataTypes.UINT256 })
function nonceOf(owner: Address): uint256
```
Returns the current nonce for signature verification - prevents replay attacks.

### Safe Transfer System

#### safeTransfer - Protected Token Transfer
```typescript
@method(
    { name: 'to', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 },
    { name: 'data', type: ABIDataTypes.BYTES }
)
@emit('Transferred')
function safeTransfer(to: Address, amount: uint256, data: bytes): void
```

**Transfer Process:**
1. Validates sender has sufficient balance
2. Updates balances atomically
3. If recipient is a contract:
    - Calls `onOP20Received` on the recipient
    - Recipient must return selector `0xd83e7dbc`
    - Transfer reverts if recipient rejects
4. Emits `Transferred` event

**Safety Features:**
- Prevents transfers to zero address (`0x0000...0000`)
- Prevents transfers to dead address (genesis block)
- Ensures contracts explicitly accept tokens
- Includes arbitrary data payload for composability

#### safeTransferFrom - Delegated Transfer
```typescript
@method(
    { name: 'from', type: ABIDataTypes.ADDRESS },
    { name: 'to', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 },
    { name: 'data', type: ABIDataTypes.BYTES }
)
@emit('Transferred')
function safeTransferFrom(
    from: Address,
    to: Address,
    amount: uint256,
    data: bytes
): void
```

**Process:**
1. Verifies and spends allowance (unless sender equals from)
2. Executes transfer with same safety checks as `safeTransfer`
3. Handles infinite allowance (uint256.max) without decrementing

### Simple Transfer

#### transfer - Simple Token Transfer
```typescript
@method(
    { name: 'to', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 }
)
@emit('Transferred')
function transfer(to: Address, amount: uint256): void
```

**Transfer Process:**
1. Validates sender has sufficient balance
2. Updates balances atomically
3. Emits `Transferred` event

**Safety Features:**
- Prevents transfers to zero address (`0x0000...0000`)
- Prevents transfers to dead address (genesis block)

#### transferFrom - Delegated Transfer
```typescript
@method(
    { name: 'from', type: ABIDataTypes.ADDRESS },
    { name: 'to', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 }
)
@emit('Transferred')
function transferFrom(
    from: Address,
    to: Address,
    amount: uint256
): void
```

**Process:**
1. Verifies and spends allowance (unless sender equals from)
2. Executes transfer with same safety checks as `transfer`
3. Handles infinite allowance (uint256.max) without decrementing


### Advanced Allowance Management

#### increaseAllowance - Safely Increase Spending Permission
```typescript
@method(
    { name: 'spender', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 }
)
@emit('Approved')
function increaseAllowance(spender: Address, amount: uint256): void
```

**Features:**
- Eliminates approval race condition vulnerability
- Overflow protection (caps at uint256.max)
- Validates spender address (not zero/dead)
- Emits `Approved` with new total allowance

#### decreaseAllowance - Safely Reduce Spending Permission
```typescript
@method(
    { name: 'spender', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 }
)
@emit('Approved')
function decreaseAllowance(spender: Address, amount: uint256): void
```

**Features:**
- Underflow protection (floors at zero)
- Cannot create negative allowances
- Atomic operation prevents race conditions

### Signature-Based Operations (Gasless Approvals)

#### increaseAllowanceBySignature - Gasless Allowance Increase
```typescript
@method(
    { name: 'owner', type: ABIDataTypes.ADDRESS },
    { name: 'spender', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 },
    { name: 'deadline', type: ABIDataTypes.UINT64 },
    { name: 'signature', type: ABIDataTypes.BYTES }
)
@emit('Approved')
function increaseAllowanceBySignature(
    owner: Address,
    spender: Address,
    amount: uint256,
    deadline: uint64,
    signature: bytes
): void
```

**Signature Structure:**
```
OP20AllowanceIncrease(
    address owner,
    address spender,
    uint256 amount,
    uint256 nonce,
    uint64 deadline
)
```

**Verification Process:**
1. Check signature length (must be 64 bytes for Schnorr)
2. Verify deadline hasn't passed
3. Retrieve and include current nonce
4. Build structured hash with domain separator
5. Verify Schnorr signature using `Blockchain.verifySchnorrSignature`
6. Increment nonce to prevent replay
7. Execute allowance increase

#### decreaseAllowanceBySignature - Gasless Allowance Decrease
```typescript
@method(
    { name: 'owner', type: ABIDataTypes.ADDRESS },
    { name: 'spender', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 },
    { name: 'deadline', type: ABIDataTypes.UINT64 },
    { name: 'signature', type: ABIDataTypes.BYTES }
)
@emit('Approved')
function decreaseAllowanceBySignature(
    owner: Address,
    spender: Address,
    amount: uint256,
    deadline: uint64,
    signature: bytes
): void
```

**Signature Structure:**
```
OP20AllowanceDecrease(
    address owner,
    address spender,
    uint256 amount,
    uint256 nonce,
    uint64 deadline
)
```

Uses same verification process as `increaseAllowanceBySignature`.

### Token Supply Management

#### burn - Destroy Tokens
```typescript
@method({ name: 'amount', type: ABIDataTypes.UINT256 })
@emit('Burned')
function burn(amount: uint256): void
```

**Process:**
1. Verifies sender has sufficient balance
2. Reduces sender's balance using SafeMath
3. Decreases total supply
4. Emits `Burned` event

**Safety:**
- Cannot burn from zero/dead addresses
- Underflow protection on balance and supply

### Domain Separation and EIP-712 Compatibility

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

**Components:**
- `name`: Token name for human identification
- `version`: Fixed to "1" (hash: `0x6b86b273...`)
- `chainId`: OP_NET chain identifier
- `protocolId`: OP_NET protocol identifier
- `verifyingContract`: Token contract address

### Cryptographic Constants

```typescript
// Domain type hash for OP_NET
const OP712_DOMAIN_TYPE_HASH = sha256(
    "OP712Domain(string name,string version,bytes32 chainId,bytes32 protocolId,address verifyingContract)"
);

// Version "1" hash
const OP712_VERSION_HASH = sha256("1");

// Allowance increase type hash
const ALLOWANCE_INCREASE_TYPE_HASH = sha256(
    "OP20AllowanceIncrease(address owner,address spender,uint256 amount,uint256 nonce,uint64 deadline)"
);

// Allowance decrease type hash
const ALLOWANCE_DECREASE_TYPE_HASH = sha256(
    "OP20AllowanceDecrease(address owner,address spender,uint256 amount,uint256 nonce,uint64 deadline)"
);

// Receiver hook selector
const ON_OP20_RECEIVED_SELECTOR: u32 = 0xd83e7dbc;
```

## Events

### Transferred Event
```typescript
event Transferred(
    operator: Address,  // Who initiated the transfer
    from: Address,      // Source of tokens
    to: Address,        // Destination of tokens
    amount: uint256     // Number of tokens transferred
)
```
Emitted on all successful transfers including mints (from = zero) and burns (to = zero).

### Approved Event
```typescript
event Approved(
    owner: Address,     // Token owner
    spender: Address,   // Authorized spender
    amount: uint256     // New total allowance (not delta)
)
```
Emitted when allowance is modified through any method.

### Minted Event
```typescript
event Minted(
    to: Address,        // Recipient of new tokens
    amount: uint256     // Number of tokens created
)
```
Emitted when new tokens are created, increasing total supply.

### Burned Event
```typescript
event Burned(
    from: Address,      // Address losing tokens
    amount: uint256     // Number of tokens destroyed
)
```
Emitted when tokens are permanently removed from circulation.

## Receiver Interface

Contracts accepting OP_20 tokens must implement:

```typescript
interface IOP20Receiver {
    function onOP20Received(
        operator: Address,  // Who initiated the transfer
        from: Address,      // Original token owner
        amount: uint256,    // Number of tokens received
        data: bytes         // Additional data payload
    ): bytes4;
}
```

**Requirements:**
- Must return selector `0xd83e7dbc` to accept transfer
- Any other return value or revert causes transfer to fail
- Enables automatic processing of received tokens
- Data parameter allows complex interactions

## Security Considerations

### Mathematical Safety
- **Balance Invariants**: Sum of all balances always equals total supply
- **Allowance Boundaries**: Allowances properly handle max and zero values

### Address Validation
- **Zero Address Protection**: Prevents transfers to `0x0000...0000`
- **Dead Address Protection**: Prevents transfers to `0xdead...dead`
- **Contract Detection**: Uses `Blockchain.isContract()` for receiver validation
- **Signature Validation**: Only accepts properly formatted Schnorr signatures

### Replay Attack Prevention
- **Nonce Tracking**: Each address has incrementing nonce for signatures
- **Deadline Enforcement**: Signatures expire at specified block number
- **Domain Separation**: Signatures bound to specific chain and contract
- **Structured Hashing**: EIP-712 style prevents signature malleability

### Front-Running Mitigation
- **Incremental Allowances**: No approval replacement race condition
- **Atomic Operations**: All state changes happen atomically
- **Signature Ordering**: Nonce system enforces operation ordering

## Comparison with ERC-20

| Feature | ERC-20 | OP_20 |
|---------|--------|------|
| Basic Transfers | ✓ | ✓ |
| Safe Transfers | ✗ | ✓ |
| Transfer Hooks | ✗ | ✓ |
| Approval Race Fix | ✗ | ✓ |
| Gasless Approvals | ✗ | ✓ |
| Native Burn | ✗ | ✓ |
| Max Supply Enforcement | ✗ | ✓ |
| Unified Metadata | ✗ | ✓ |
| Signature Type | ECDSA | Schnorr |
| Replay Protection | External | Built-in |
| Zero Address Protection | External | Built-in |

## Implementation Requirements

### For Token Developers
1. Extend the `OP20` abstract class
2. Call `instantiate()` in constructor or initialization
3. Implement any additional features using protected methods
4. Cannot override core safety mechanisms
5. Must respect maximum supply in custom minting logic

### For Wallet Developers
1. Implement Schnorr signature generation
2. Support incremental allowance model
3. Handle metadata endpoint for efficient data retrieval
4. Display icon from metadata
5. Track nonces for signature-based operations

### For Exchange Integration
1. Implement `IOP20Receiver` interface
2. Return correct selector from `onOP20Received`
3. Process data parameter for order matching
4. Support signature-based deposits
5. Handle safe transfer notifications

### For DeFi Protocols
1. Use signature-based approvals for gasless onboarding
2. Implement receiver hooks for automatic processing
3. Leverage data parameter for complex operations
4. Support incremental allowance adjustments
5. Validate maximum supply for lending/borrowing

## Reference Implementation

The complete reference implementation is available in the OP_NET framework repository. Key files:
- `OP20.ts`: Abstract base class
- `IOP20.ts`: Interface definition
- `OP20InitParameters.ts`: Initialization structure
- Event definitions in `/events/predefined`

## Migration Guide

### From ERC-20 to OP_20

1. **Approval Pattern Changes**
   ```typescript
   // ERC-20 (vulnerable to race condition)
   approve(spender, 0);
   approve(spender, 100);
   
   // OP_20 (safe)
   decreaseAllowance(spender, currentAllowance);
   increaseAllowance(spender, 100);
   ```

2. **Transfer Pattern Changes**
   ```typescript
   // ERC-20 (tokens can be lost)
   transfer(contractAddress, amount);
   
   // OP_20 (safe with confirmation)
   safeTransfer(contractAddress, amount, data);
   ```

3. **Gasless Operations**
   ```typescript
   // ERC-20 (requires gas)
   approve(exchange, amount); // Costs gas
   
   // OP_20 (gasless)
   // Sign message offline
   // Exchange submits with transaction
   ```
