# MotoSwap Router Interaction Patterns

MotoSwap Router handles OP20-to-OP20 token swaps. Unlike NativeSwap (BTC-to-OP20), the Router swaps between two OP20 tokens using liquidity pools.

## Key Concepts

- **OP20-to-OP20 swaps**: Router routes through liquidity pools
- **LP tokens**: MotoSwap Router pools HAVE LP tokens (unlike NativeSwap which has none)
- **Factory**: Creates new trading pairs
- **getContract pattern**: Same 5-param pattern as all OPNet contract interactions

## Swapping OP20 Tokens

```typescript
import { getContract, IMotoswapRouterContract, MOTOSWAP_ROUTER_ABI, JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider({
    url: 'https://regtest.opnet.org',
    network: networks.regtest,
});

// Get typed Router contract instance
const router = getContract<IMotoswapRouterContract>(
    routerAddress,
    MOTOSWAP_ROUTER_ABI,
    provider,
    networks.regtest,
    senderAddress,
);

// 1. Approve Router to spend your input token
const tokenIn = getContract<IOP20Contract>(
    tokenInAddress,
    OP_20_ABI,
    provider,
    networks.regtest,
    senderAddress,
);

try {
    const approval = await tokenIn.increaseAllowance(routerAddress, amountIn);
    // Send approval and wait for confirmation
} catch (error) {
    console.error('Approval failed:', error);
}

// 2. Execute swap (after approval confirms)
try {
    const swap = await router.swapExactTokensForTokens(
        amountIn,           // exact input amount (u256)
        amountOutMin,       // minimum output (slippage protection)
        [tokenInAddress, tokenOutAddress],  // path
        recipientAddress,   // who receives output tokens
        deadline,           // block height deadline
    );
    
    // Send the swap transaction
    const receipt = await swap.sendTransaction({
        signer: null,       // null on frontend (wallet signs)
        mldsaSigner: null,  // null on frontend
        refundTo: senderAddress,
    });
} catch (error) {
    console.error('Swap reverted:', error);
}
```

## Adding Liquidity

```typescript
try {
    const addLiq = await router.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        recipientAddress,   // receives LP tokens
        deadline,
    );
    
    const receipt = await addLiq.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: senderAddress,
    });
} catch (error) {
    console.error('Add liquidity failed:', error);
}
```

## Important Rules

1. **Use built-in ABIs**: `MOTOSWAP_ROUTER_ABI`, `OP_20_ABI` from the `opnet` package
2. **Use built-in interfaces**: `IMotoswapRouterContract`, `IOP20Contract`
3. **increaseAllowance(), NOT approve()** for token approvals
4. **Try/catch all contract calls** — they throw on revert in opnet 1.8.1+
5. **signer and mldsaSigner are null on frontend** — wallet extension handles signing
6. **MotoSwap Factory has no poolCount()/allPools()** — must scan blocks for PoolCreated events
7. **LP tokens are standard OP20** — can be transferred, staked, etc.
