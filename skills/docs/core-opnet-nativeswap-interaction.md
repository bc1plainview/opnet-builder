# NativeSwap Interaction Patterns

NativeSwap is OPNet's BTC-to-OP20 swap primitive. It uses virtual reserves (AMM that doesn't physically hold assets) with a two-phase commit system (reservation + execution).

## Key Concepts

- **Virtual reserves**: The AMM tracks economic effect without physically holding BTC or tokens
- **Two-phase commit**: Reservation locks the price, execution sends BTC to sellers atomically
- **CSV timelocks**: ALL recipient addresses MUST use CSV (mandatory anti-pinning)
- **Queue impact**: Pending sell orders affect effective reserves via logarithmic scaling
- **Up to 200 providers** can be coordinated in a single atomic Bitcoin transaction

## Creating a Pool

```typescript
import { getContract, JSONRpcProvider } from 'opnet';
import { Address, networks } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider({
    url: 'https://regtest.opnet.org',
    network: networks.regtest,
});

// 1. First approve the NativeSwap contract to spend your tokens
const tokenContract = getContract<IOP20Contract>(
    tokenAddress,
    OP_20_ABI,
    provider,
    networks.regtest,
    senderAddress,
);

const approvalSim = await tokenContract.increaseAllowance(nativeSwapAddress, amount);
// Send approval transaction and WAIT FOR CONFIRMATION before next step

// 2. Create the pool (must be in a DIFFERENT block than approval)
// Pool creation requires a CSV P2WSH receiver address
const csvAddress = Address.fromString(pubkey).toCSV(1n); // 1-block timelock

// Use NativeSwap contract to create pool with:
// - token address
// - initial token amount
// - initial BTC amount (virtual)
// - CSV receiver address
// - maxReservesIn5BlocksPercent (0-100, direct percentage)
```

## Executing a Swap (Buy tokens with BTC)

```typescript
// 1. Get a quote / simulate the reservation
// 2. Create reservation (locks price for N blocks)
// 3. Build Bitcoin transaction sending BTC to seller CSV addresses
// 4. Execute the swap (confirms reservation + BTC transfer)
```

## Important Rules

1. **increaseAllowance(), NOT approve()** — OP20 uses increaseAllowance
2. **Approval and pool creation must be in DIFFERENT blocks** — approval needs confirmation first
3. **CSV addresses are MANDATORY** — `Address.fromString(pubkey).toCSV(1n)` for 1-block timelock
4. **maxReservesIn5BlocksPercent is direct percentage (0-100)**, not basis points
5. **Original (untweaked) pubkey required for CSV** address generation
6. **setTransactionDetails() required before simulation**, not maximumAllowedSatToSpend
