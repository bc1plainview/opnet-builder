# Blueprint: Build a React Frontend dApp with WalletConnect

Complete guide to building an OPNet frontend that connects to Bitcoin wallets and interacts with smart contracts.

---

## Prerequisites

- Node.js 20+
- React 18+ (Vite recommended)
- An OPNet contract already deployed (see `blueprints/op20-token.md`)

---

## Step 1: Create React Project

```bash
npm create vite@latest my-dapp -- --template react-ts
cd my-dapp
```

---

## Step 2: Install Dependencies (EXACT versions)

```bash
npm install opnet@1.8.1-beta.13
npm install @btc-vision/transaction@1.8.0-beta.10
npm install @btc-vision/bitcoin@7.0.0-alpha.11
npm install @btc-vision/walletconnect@latest
```

**NEVER guess versions.** These are the compatible set.

**NEVER install:**
- `bitcoinjs-lib` → already included as `@btc-vision/bitcoin`
- `ecpair` → use `@btc-vision/ecpair` if needed
- `tiny-secp256k1` → use `@noble/curves`
- `express` / `fastify` → this is a frontend, but if you add a backend, use `hyper-express`

---

## Step 3: WalletConnect CSS Fix (MANDATORY)

Create `src/walletconnect-fix.css`:

```css
/* Fix WalletConnect modal — renders broken at page bottom without this */
.wallet-connect-modal,
[class*="walletconnect"] [class*="modal"],
[class*="WalletConnect"] [class*="Modal"] {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 99999 !important;
    background: rgba(0, 0, 0, 0.7) !important;
}

.wallet-connect-modal > div,
[class*="walletconnect"] [class*="modal"] > div,
[class*="WalletConnect"] [class*="Modal"] > div {
    position: relative !important;
    max-width: 420px !important;
    max-height: 80vh !important;
    overflow-y: auto !important;
    border-radius: 16px !important;
}
```

Import in `src/main.tsx`:
```typescript
import './walletconnect-fix.css';
```

**Without this fix, the wallet popup is invisible/broken.** Do not skip this step.

---

## Step 4: Create Provider Context

```typescript
// src/contexts/OPNetContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

interface OPNetContextValue {
    provider: JSONRpcProvider | null;
    walletAddress: string | null;
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
}

const OPNetContext = createContext<OPNetContextValue | null>(null);

// IMPORTANT: Create your OWN JSONRpcProvider for RPC calls
// NEVER use walletconnect's provider for queries
const RPC_URL = 'https://mainnet.opnet.org';
const NETWORK = networks.bitcoin;

export function OPNetProvider({ children }: { children: React.ReactNode }) {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const providerRef = useRef<JSONRpcProvider | null>(null);

    useEffect(() => {
        // Initialize provider on mount
        providerRef.current = new JSONRpcProvider(RPC_URL, NETWORK);
        return () => {
            providerRef.current?.close();
        };
    }, []);

    const connect = useCallback(async () => {
        // Use @btc-vision/walletconnect for connection
        // The wallet extension (OPWallet) handles the signing
        // See wallet-integration.md for full WalletConnect setup
        
        // After connection, set the address
        // setWalletAddress(connectedAddress);
        // setIsConnected(true);
    }, []);

    const disconnect = useCallback(() => {
        setWalletAddress(null);
        setIsConnected(false);
    }, []);

    return (
        <OPNetContext.Provider value={{
            provider: providerRef.current,
            walletAddress,
            isConnected,
            connect,
            disconnect,
        }}>
            {children}
        </OPNetContext.Provider>
    );
}

export function useOPNet() {
    const ctx = useContext(OPNetContext);
    if (!ctx) throw new Error('useOPNet must be inside OPNetProvider');
    return ctx;
}
```

---

## Step 5: Contract Interaction Hook

```typescript
// src/hooks/useOP20.ts
import { useCallback, useState } from 'react';
import { getContract, IOP20Contract, OP_20_ABI } from 'opnet';
import { Address, networks } from '@btc-vision/bitcoin';
import { useOPNet } from '../contexts/OPNetContext';

export function useOP20(contractAddr: string) {
    const { provider, walletAddress } = useOPNet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getTokenContract = useCallback(() => {
        if (!provider || !walletAddress) throw new Error('Not connected');

        // getContract takes exactly 5 params
        return getContract<IOP20Contract>(
            Address.fromString(contractAddr),
            OP_20_ABI,
            provider,
            networks.bitcoin,  // or networks.regtest for regtest
            Address.fromString(walletAddress)
        );
    }, [provider, walletAddress, contractAddr]);

    const getBalance = useCallback(async (address?: string) => {
        const contract = getTokenContract();
        const target = address || walletAddress!;
        const balance = await contract.balanceOf(Address.fromString(target));
        return balance;
    }, [getTokenContract, walletAddress]);

    const transfer = useCallback(async (to: string, amount: bigint) => {
        setLoading(true);
        setError(null);

        try {
            const contract = getTokenContract();

            // 1. ALWAYS simulate first
            const simulation = await contract.transfer(
                Address.fromString(to),
                amount
            );

            // 2. Check for revert
            if ('error' in simulation) {
                throw new Error(`Simulation failed: ${simulation.error}`);
            }

            // 3. Send — signer=null on frontend, wallet extension signs
            const receipt = await simulation.sendTransaction({
                signer: null,           // NULL on frontend
                mldsaSigner: null,      // NULL on frontend
                refundTo: walletAddress!,
            });

            return receipt;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getTokenContract, walletAddress]);

    const increaseAllowance = useCallback(async (spender: string, amount: bigint) => {
        setLoading(true);
        setError(null);

        try {
            const contract = getTokenContract();

            // NOTE: increaseAllowance(), NOT approve()
            const simulation = await contract.increaseAllowance(
                Address.fromString(spender),
                amount
            );

            if ('error' in simulation) {
                throw new Error(`Simulation failed: ${simulation.error}`);
            }

            const receipt = await simulation.sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: walletAddress!,
            });

            return receipt;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getTokenContract, walletAddress]);

    return { getBalance, transfer, increaseAllowance, loading, error };
}
```

---

## Step 6: UTXO / Balance Hook

```typescript
// src/hooks/useBalance.ts
import { useCallback, useState, useEffect } from 'react';
import { useOPNet } from '../contexts/OPNetContext';

export function useBTCBalance() {
    const { provider, walletAddress } = useOPNet();
    const [balance, setBalance] = useState<bigint>(0n);

    const fetchBalance = useCallback(async () => {
        if (!provider || !walletAddress) return;

        // ALWAYS optimize: false for unfiltered results
        const utxos = await provider.utxoManager.getUTXOs({
            address: walletAddress,
            optimize: false,
        });

        const total = utxos.reduce((sum, utxo) => sum + utxo.value, 0n);
        setBalance(total);
    }, [provider, walletAddress]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    return { balance, refresh: fetchBalance };
}
```

---

## Step 7: Basic UI Component

```tsx
// src/components/TokenDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useOPNet } from '../contexts/OPNetContext';
import { useOP20 } from '../hooks/useOP20';
import { useBTCBalance } from '../hooks/useBalance';

const TOKEN_ADDRESS = 'your-contract-address-here';

export function TokenDashboard() {
    const { isConnected, connect, disconnect, walletAddress } = useOPNet();
    const { getBalance, transfer, loading, error } = useOP20(TOKEN_ADDRESS);
    const { balance: btcBalance } = useBTCBalance();
    const [tokenBalance, setTokenBalance] = useState<string>('0');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (isConnected) {
            getBalance().then(b => setTokenBalance(b.toString()));
        }
    }, [isConnected, getBalance]);

    if (!isConnected) {
        return <button onClick={connect}>Connect Wallet</button>;
    }

    return (
        <div>
            <p>Address: {walletAddress}</p>
            <p>BTC Balance: {(Number(btcBalance) / 1e8).toFixed(8)} BTC</p>
            <p>Token Balance: {tokenBalance}</p>

            <h3>Transfer</h3>
            <input placeholder="Recipient" value={recipient} onChange={e => setRecipient(e.target.value)} />
            <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={() => transfer(recipient, BigInt(amount))} disabled={loading}>
                {loading ? 'Sending...' : 'Transfer'}
            </button>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <button onClick={disconnect}>Disconnect</button>
        </div>
    );
}
```

---

## Critical Reminders

1. **WalletConnect CSS fix is MANDATORY** — without it the modal is invisible
2. **Create your OWN JSONRpcProvider** — never use walletconnect's provider for RPC queries
3. **signer: null, mldsaSigner: null on frontend** — wallet extension signs
4. **getContract takes 5 params** — address, abi, provider, network, sender
5. **increaseAllowance(), not approve()** — OP20 design choice
6. **Always simulate before sendTransaction()** — check for 'error' in result
7. **optimize: false for getUTXOs** — optimize: true silently drops UTXOs
8. **NEVER import bitcoinjs-lib** — use @btc-vision/bitcoin
9. **NEVER use mempool.space/blockstream APIs** — use opnet package
10. **provider.getBlock() needs Number, not BigInt** — convert with Number()
