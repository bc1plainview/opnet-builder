# OPNet Frontend Integration Guide

This guide covers how to integrate OPNet into frontend applications, including wallet management, transaction signing, contract interaction, and state management. The patterns shown here are derived from production implementations.

## Required Dependencies

```bash
npm install opnet @btc-vision/bitcoin @btc-vision/transaction @btc-vision/bip32 @btc-vision/ecpair
```

```json
{
  "@btc-vision/bip32": "^7.0.2",
  "@btc-vision/bitcoin": "^7.0.0-alpha.11",
  "@btc-vision/ecpair": "^4.0.2",
  "@btc-vision/transaction": "^1.8.0-beta.10",
  "opnet": "^1.8.1-beta.13"
}
```

---

## Wallet Management

### Supported Wallets

OPNet supports multiple Bitcoin wallets:

| Wallet | Detection | Features |
|--------|-----------|----------|
| Unisat | `window.unisat` | PSBT signing, message signing |
| Xverse | `window.XverseProviders` | PSBT signing |
| OKX | `window.okxwallet` | PSBT signing |

### Wallet Detection

```typescript
interface CustomWindow extends Window {
    unisat?: UnisatProvider;
    XverseProviders?: XverseProvider;
    okxwallet?: OKXProvider;
}

const detectWallets = (): string[] => {
    const available: string[] = [];
    const win = window as CustomWindow;

    if (win.unisat) available.push('unisat');
    if (win.XverseProviders) available.push('xverse');
    if (win.okxwallet) available.push('okx');

    return available;
};
```

### Wallet Connection (Unisat Example)

```typescript
import { Network } from '@btc-vision/bitcoin';
import { Address, UnisatSigner, Unisat } from '@btc-vision/transaction';

interface WalletState {
    isConnected: boolean;
    address: string | null;
    opAddress: Address | null;
    signer: UnisatSigner | undefined;
    network: Network;
}

async function connectUnisat(network: Network): Promise<WalletState> {
    const unisat = window.unisat as Unisat;

    if (!unisat) {
        throw new Error('Unisat wallet not installed');
    }

    // Request connection
    const accounts = await unisat.requestAccounts();
    if (!accounts.length) {
        throw new Error('No accounts returned');
    }

    // Get public key
    const publicKey = await unisat.getPublicKey();

    // Create Address object from public key
    const opAddress = Address.fromString(publicKey);

    // Create signer for transaction signing
    const signer = new UnisatSigner(unisat, opAddress, network);

    return {
        isConnected: true,
        address: accounts[0],
        opAddress,
        signer,
        network
    };
}
```

### Network Switching

```typescript
async function switchNetwork(targetNetwork: 'livenet' | 'testnet'): Promise<void> {
    const unisat = window.unisat as Unisat;

    const currentNetwork = await unisat.getNetwork();
    if (currentNetwork !== targetNetwork) {
        await unisat.switchNetwork(targetNetwork);
    }
}
```

### Persisting Wallet Connection

```typescript
// Store wallet preference
function saveWalletPreference(wallet: string): void {
    localStorage.setItem('walletProviderOPNet', wallet);
}

// Restore on page load
async function restoreConnection(): Promise<WalletState | null> {
    const savedWallet = localStorage.getItem('walletProviderOPNet');
    if (!savedWallet) return null;

    try {
        switch (savedWallet) {
            case 'unisat':
                return await connectUnisat(network);
            // ... other wallets
            default:
                return null;
        }
    } catch {
        localStorage.removeItem('walletProviderOPNet');
        return null;
    }
}
```

---

## Authorization Context

Create a React context to manage wallet state across your application:

```typescript
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Network } from '@btc-vision/bitcoin';
import { Address, UnisatSigner } from '@btc-vision/transaction';

interface AuthContextType {
    // Connection state
    isConnected: boolean;
    attemptingConnection: boolean;

    // Wallet data
    address: string | null;
    opAddress: Address | null;
    signer: UnisatSigner | undefined;
    balance: bigint | null;

    // Network
    network: Network;
    setNetwork: (network: Network) => void;

    // Actions
    connect: (walletType: string) => Promise<void>;
    disconnect: () => void;
    refreshBalance: () => Promise<void>;

    // Blockchain state
    currentBlock: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [attemptingConnection, setAttemptingConnection] = useState(true);
    const [address, setAddress] = useState<string | null>(null);
    const [opAddress, setOpAddress] = useState<Address | null>(null);
    const [signer, setSigner] = useState<UnisatSigner | undefined>();
    const [balance, setBalance] = useState<bigint | null>(null);
    const [network, setNetwork] = useState<Network>(networks.bitcoin);
    const [currentBlock, setCurrentBlock] = useState<number | null>(null);

    const connect = useCallback(async (walletType: string) => {
        setAttemptingConnection(true);
        try {
            const state = await connectWallet(walletType, network);
            setIsConnected(true);
            setAddress(state.address);
            setOpAddress(state.opAddress);
            setSigner(state.signer);
            saveWalletPreference(walletType);
        } finally {
            setAttemptingConnection(false);
        }
    }, [network]);

    const disconnect = useCallback(() => {
        setIsConnected(false);
        setAddress(null);
        setOpAddress(null);
        setSigner(undefined);
        setBalance(null);
        localStorage.removeItem('walletProviderOPNet');
    }, []);

    // Auto-reconnect on mount
    useEffect(() => {
        restoreConnection().then((state) => {
            if (state) {
                setIsConnected(true);
                setAddress(state.address);
                setOpAddress(state.opAddress);
                setSigner(state.signer);
            }
            setAttemptingConnection(false);
        });
    }, []);

    // Track block height
    useEffect(() => {
        const interval = setInterval(async () => {
            const block = await provider.getBlockNumber();
            setCurrentBlock(Number(block));
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <AuthContext.Provider value={{
            isConnected,
            attemptingConnection,
            address,
            opAddress,
            signer,
            balance,
            network,
            setNetwork,
            connect,
            disconnect,
            refreshBalance,
            currentBlock
        }}>
            {children}
        </AuthContext.Provider>
    );
};
```

---

## Provider Setup

### Creating an OPNet Provider

```typescript
import { JSONRpcProvider, WebsocketProvider } from 'opnet';
import { Network, networks } from '@btc-vision/bitcoin';

// JSON-RPC Provider (recommended for most use cases)
const createProvider = (network: Network): JSONRpcProvider => {
    const rpcUrl = network === networks.bitcoin
        ? 'https://mainnet.opnet.org/v1/json-rpc'
        : 'https://testnet.opnet.org/v1/json-rpc';

    return new JSONRpcProvider(rpcUrl, network);
};

// WebSocket Provider (for real-time updates)
const createWsProvider = (network: Network): WebsocketProvider => {
    const wsUrl = network === networks.bitcoin
        ? 'wss://mainnet.opnet.org/v1/ws'
        : 'wss://testnet.opnet.org/v1/ws';

    return new WebsocketProvider(wsUrl, network);
};
```

### Provider Context

```typescript
import React, { createContext, useContext, useMemo } from 'react';
import { JSONRpcProvider } from 'opnet';
import { Network } from '@btc-vision/bitcoin';

interface ProviderContextType {
    provider: JSONRpcProvider;
    network: Network;
}

const ProviderContext = createContext<ProviderContextType | null>(null);

export const useProvider = (): ProviderContextType => {
    const context = useContext(ProviderContext);
    if (!context) {
        throw new Error('useProvider must be used within ProviderProvider');
    }
    return context;
};

export const ProviderProvider: React.FC<{
    network: Network;
    children: React.ReactNode;
}> = ({ network, children }) => {
    const provider = useMemo(() => createProvider(network), [network]);

    return (
        <ProviderContext.Provider value={{ provider, network }}>
            {children}
        </ProviderContext.Provider>
    );
};
```

---

## Contract Interaction

### Instantiating Contracts

```typescript
import { getContract, IOP20Contract, OP_20_ABI } from 'opnet';
import { Address } from '@btc-vision/transaction';

async function getTokenContract(
    contractAddress: string,
    provider: JSONRpcProvider
): Promise<IOP20Contract> {
    return getContract<IOP20Contract>(
        contractAddress,
        OP_20_ABI,
        provider
    );
}

// Usage
const contract = await getTokenContract('bc1p...', provider);
const balance = await contract.balanceOf(userAddress);
```

### Calling Read Methods (Simulations)

```typescript
// Read methods don't require signing
async function getTokenBalance(
    contract: IOP20Contract,
    address: Address
): Promise<bigint> {
    const result = await contract.balanceOf(address);

    if ('error' in result) {
        throw new Error(result.error);
    }

    return result.decoded[0] as bigint;
}

async function getTokenInfo(contract: IOP20Contract): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
}> {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
    ]);

    return {
        name: name.decoded[0] as string,
        symbol: symbol.decoded[0] as string,
        decimals: Number(decimals.decoded[0]),
        totalSupply: totalSupply.decoded[0] as bigint
    };
}
```

### Building Write Transactions

```typescript
import { IInteractionParameters, TransactionFactory } from 'opnet';
import { Address, UnisatSigner } from '@btc-vision/transaction';

async function buildTransferTransaction(
    contract: IOP20Contract,
    from: Address,
    to: Address,
    amount: bigint,
    signer: UnisatSigner,
    provider: JSONRpcProvider
): Promise<string> {
    // 1. Encode the call
    const calldata = contract.encodeCalldata('transfer', [to, amount]);

    // 2. Get UTXOs for the sender
    const utxos = await provider.getUTXOs(from.p2tr(network));

    // 3. Build interaction parameters
    const interactionParams: IInteractionParameters = {
        from: from,
        to: Address.fromString(contract.address),
        calldata,
        utxos,
        feeRate: await provider.estimateSmartFeeRate(),
        network
    };

    // 4. Create the transaction
    const factory = new TransactionFactory();
    const { transaction, psbt } = await factory.createInteraction(interactionParams);

    // 5. Sign with wallet
    const signedPsbt = await signer.signPsbt(psbt);

    // 6. Finalize and extract
    signedPsbt.finalizeAllInputs();
    const txHex = signedPsbt.extractTransaction().toHex();

    return txHex;
}
```

---

## Sending Transactions

### Complete Transaction Flow

```typescript
async function sendTransaction(
    contract: IOP20Contract,
    method: string,
    args: unknown[],
    auth: AuthContextType,
    provider: JSONRpcProvider
): Promise<{ txId: string; receipt: TransactionReceipt }> {
    if (!auth.opAddress || !auth.signer) {
        throw new Error('Wallet not connected');
    }

    // 1. Simulate first to check for errors
    const simulation = await contract[method](...args);
    if ('error' in simulation) {
        throw new Error(`Simulation failed: ${simulation.error}`);
    }

    // 2. Get current UTXOs
    const utxos = await provider.getUTXOs(auth.address!);
    if (utxos.length === 0) {
        throw new Error('No UTXOs available');
    }

    // 3. Estimate gas
    const gasEstimate = simulation.gasUsed;

    // 4. Build transaction
    const calldata = contract.encodeCalldata(method, args);
    const txHex = await buildTransaction(
        auth.opAddress,
        contract.address,
        calldata,
        utxos,
        auth.signer,
        provider
    );

    // 5. Broadcast
    const txId = await provider.broadcastTransaction(txHex);

    // 6. Wait for confirmation
    const receipt = await waitForConfirmation(txId, provider);

    return { txId, receipt };
}

async function waitForConfirmation(
    txId: string,
    provider: JSONRpcProvider,
    maxAttempts: number = 60
): Promise<TransactionReceipt> {
    // Poll every 15 seconds for transaction confirmation
    const POLL_INTERVAL = 15000; // 15 seconds - optimal for Bitcoin block times

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const receipt = await provider.getTransactionReceipt(txId);
            if (receipt && receipt.blockNumber) {
                return receipt;
            }
        } catch {
            // Not yet confirmed - continue polling
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
    throw new Error('Transaction confirmation timeout');
}
```

---

## UTXO Management

### Fetching UTXOs

```typescript
import { UTXO } from 'opnet';

async function getSpendableUTXOs(
    address: string,
    provider: JSONRpcProvider
): Promise<UTXO[]> {
    const utxos = await provider.getUTXOs(address);

    // Filter for confirmed UTXOs only
    return utxos.filter(utxo => utxo.confirmations > 0);
}
```

### UTXO Selection

```typescript
function selectUTXOs(
    utxos: UTXO[],
    targetAmount: bigint,
    feeRate: number
): { selected: UTXO[]; fee: bigint } {
    // Sort by value descending
    const sorted = [...utxos].sort((a, b) =>
        Number(b.value - a.value)
    );

    const selected: UTXO[] = [];
    let total = 0n;

    // Estimate base tx size
    const baseTxSize = 10n; // vbytes
    const inputSize = 68n;  // vbytes per input
    const outputSize = 34n; // vbytes per output

    for (const utxo of sorted) {
        selected.push(utxo);
        total += utxo.value;

        const txSize = baseTxSize +
            BigInt(selected.length) * inputSize +
            2n * outputSize; // 2 outputs (recipient + change)

        const fee = txSize * BigInt(feeRate);

        if (total >= targetAmount + fee) {
            return { selected, fee };
        }
    }

    throw new Error('Insufficient funds');
}
```

### Pending UTXO Tracking

```typescript
// Track UTXOs that are pending in unconfirmed transactions
const pendingUTXOs = new Set<string>();

function markUTXOPending(utxo: UTXO): void {
    const key = `${utxo.txId}:${utxo.outputIndex}`;
    pendingUTXOs.add(key);
}

function releaseUTXO(utxo: UTXO): void {
    const key = `${utxo.txId}:${utxo.outputIndex}`;
    pendingUTXOs.delete(key);
}

function getAvailableUTXOs(utxos: UTXO[]): UTXO[] {
    return utxos.filter(utxo => {
        const key = `${utxo.txId}:${utxo.outputIndex}`;
        return !pendingUTXOs.has(key);
    });
}
```

---

## Block State Management

### Block Tracking Hook

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface BlockDetails {
    height: number;
    medianTime: number;
    time: number;
}

/**
 * Block tracking hook with optimized polling intervals.
 *
 * Polling intervals:
 * - Block height: 15-30 seconds (Bitcoin ~10min blocks, 15s gives good responsiveness)
 * - Use 15s for time-sensitive apps (trading, swaps)
 * - Use 30s for less time-sensitive apps (portfolio viewing)
 */
function useBlockTracker(
    provider: JSONRpcProvider,
    pollIntervalMs: number = 15000 // 15 seconds default
) {
    const [currentBlock, setCurrentBlock] = useState<number | null>(null);
    const [blockDetails, setBlockDetails] = useState<BlockDetails | null>(null);
    const previousBlockRef = useRef<number | null>(null);

    const refreshBlock = useCallback(async () => {
        const blockNumber = await provider.getBlockNumber();

        if (blockNumber !== previousBlockRef.current) {
            // Block changed - clear caches
            clearAllCaches();
            previousBlockRef.current = blockNumber;
        }

        const block = await provider.getBlock(blockNumber);
        setBlockDetails({
            height: Number(block.height),
            medianTime: block.medianTime,
            time: block.time
        });
        setCurrentBlock(Number(blockNumber));
    }, [provider]);

    useEffect(() => {
        refreshBlock();
        // Poll for new blocks - 15s is optimal for responsiveness vs load
        const interval = setInterval(refreshBlock, pollIntervalMs);
        return () => clearInterval(interval);
    }, [refreshBlock, pollIntervalMs]);

    return { currentBlock, blockDetails, refreshBlock };
}
```

### Cache Invalidation

```typescript
// Clear caches when block changes
const fetchCache = new Map<string, { data: unknown; block: number }>();

function cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    currentBlock: number
): Promise<T> {
    const cached = fetchCache.get(key);

    if (cached && cached.block === currentBlock) {
        return Promise.resolve(cached.data as T);
    }

    return fetcher().then(data => {
        fetchCache.set(key, { data, block: currentBlock });
        return data;
    });
}

function clearAllCaches(): void {
    fetchCache.clear();
}
```

---

## Caching Best Practices (CRITICAL)

**Caching is ALWAYS the best approach for OPNet frontends.**

### Provider Singleton

**NEVER create multiple provider instances for the same network:**

```typescript
// WRONG - Creating new provider each time
function getBalance(address: string) {
    const provider = new JSONRpcProvider(rpcUrl, network); // BAD!
    return provider.getBalance(address);
}

// CORRECT - Singleton provider
class ProviderManager {
    private static providers: Map<string, JSONRpcProvider> = new Map();

    static getProvider(network: Network): JSONRpcProvider {
        const key = network === networks.bitcoin ? 'mainnet' : 'testnet';

        if (!this.providers.has(key)) {
            const rpcUrl = key === 'mainnet'
                ? 'https://mainnet.opnet.org/v1/json-rpc'
                : 'https://testnet.opnet.org/v1/json-rpc';
            this.providers.set(key, new JSONRpcProvider(rpcUrl, network));
        }

        return this.providers.get(key)!;
    }
}
```

### Contract Instance Caching

**Reuse contract instances - they are expensive to create:**

```typescript
// Contract cache
const contractCache = new Map<string, IOP20Contract>();

async function getContract(address: string): Promise<IOP20Contract> {
    if (!contractCache.has(address)) {
        const provider = ProviderManager.getProvider(currentNetwork);
        const contract = await getContract<IOP20Contract>(address, OP_20_ABI, provider);
        contractCache.set(address, contract);
    }
    return contractCache.get(address)!;
}

// Clear on network change
function onNetworkChange(): void {
    contractCache.clear();
}
```

### Multi-Level Caching Strategy

```typescript
interface CacheEntry<T> {
    data: T;
    block: number;
    timestamp: number;
}

class MultiLevelCache {
    private memory: Map<string, CacheEntry<unknown>> = new Map();
    private readonly TTL = 30000; // 30 seconds

    async get<T>(
        key: string,
        fetcher: () => Promise<T>,
        currentBlock: number
    ): Promise<T> {
        // Level 1: Memory cache (fastest)
        const memCached = this.memory.get(key) as CacheEntry<T> | undefined;
        if (memCached && memCached.block === currentBlock) {
            return memCached.data;
        }

        // Level 2: LocalStorage (persists across refreshes)
        const stored = localStorage.getItem(`cache:${key}`);
        if (stored) {
            const parsed = JSON.parse(stored) as CacheEntry<T>;
            if (parsed.block === currentBlock && Date.now() - parsed.timestamp < this.TTL) {
                this.memory.set(key, parsed);
                return parsed.data;
            }
        }

        // Level 3: Fetch from network
        const data = await fetcher();
        const entry: CacheEntry<T> = { data, block: currentBlock, timestamp: Date.now() };

        this.memory.set(key, entry);
        localStorage.setItem(`cache:${key}`, JSON.stringify(entry));

        return data;
    }

    invalidateAll(): void {
        this.memory.clear();
        // Clear localStorage cache entries
        Object.keys(localStorage)
            .filter(k => k.startsWith('cache:'))
            .forEach(k => localStorage.removeItem(k));
    }
}
```

### What to Cache

| Data | Cache Duration | Invalidation |
|------|----------------|--------------|
| Token metadata (name, symbol, decimals) | Forever | Never (immutable) |
| User balances | Per block | On new block |
| Contract state | Per block | On new block |
| UTXO list | Per block | On new block or tx |
| Fee estimates | 30 seconds | Time-based |
| Block number | 15 seconds | Time-based |

### Recommended Polling Intervals

| Operation | Interval | Rationale |
|-----------|----------|-----------|
| Block height check | 15 seconds | Responsive to new blocks, low overhead |
| Transaction confirmation | 15 seconds | Balance between responsiveness and API load |
| Fee rate estimation | 30 seconds | Fees don't change rapidly |
| Balance refresh | On block change | Only when blockchain state updates |
| UTXO refresh | On block change or after tx | Ensures accurate UTXO set |

**Context-dependent adjustments:**
- **Trading/Swaps**: Use 15s polling for better UX
- **Portfolio viewing**: 30s is sufficient
- **After submitting tx**: Poll every 15s until confirmed

---

## Error Handling

### Decoding Contract Errors

```typescript
import { RevertDecoder } from 'opnet';

function decodeError(error: unknown): string {
    if (error instanceof Error) {
        // Try to decode revert reason
        const decoded = RevertDecoder.decode(error.message);
        if (decoded) {
            return decoded;
        }
        return error.message;
    }
    return String(error);
}
```

### User-Friendly Error Messages

```typescript
const ERROR_MESSAGES: Record<string, string> = {
    'insufficient balance': 'You do not have enough tokens for this transaction',
    'insufficient allowance': 'You need to approve tokens before transferring',
    'transfer amount exceeds balance': 'Transfer amount is greater than your balance',
    'ERC20: transfer to zero address': 'Cannot transfer to zero address',
};

function getUserFriendlyError(error: string): string {
    const lowerError = error.toLowerCase();

    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
        if (lowerError.includes(key)) {
            return message;
        }
    }

    return error;
}
```

---

## Best Practices

### 1. Always Use bigint for Financial Values

```typescript
// CORRECT
const balance: bigint = 1000000000n;
const amount: bigint = BigInt(userInput);

// WRONG - Never use number for satoshis
const balance: number = 1000000000; // Precision loss possible
```

### 2. Handle Network Changes

```typescript
useEffect(() => {
    const handleNetworkChange = (network: string) => {
        // Refresh all state when network changes
        disconnect();
        clearAllCaches();
    };

    window.unisat?.on('networkChanged', handleNetworkChange);
    return () => {
        window.unisat?.removeListener('networkChanged', handleNetworkChange);
    };
}, []);
```

### 3. Validate Before Signing

```typescript
async function safeSign(params: TransactionParams): Promise<string> {
    // Validate address format
    if (!AddressVerificator.isValidAddress(params.to)) {
        throw new Error('Invalid recipient address');
    }

    // Validate amount
    if (params.amount <= 0n) {
        throw new Error('Amount must be positive');
    }

    // Check balance
    const balance = await getBalance(params.from);
    if (balance < params.amount + params.fee) {
        throw new Error('Insufficient balance');
    }

    // Proceed with signing
    return sign(params);
}
```

### 4. Implement Loading States

```typescript
function useTransaction() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txId, setTxId] = useState<string | null>(null);

    const execute = async (fn: () => Promise<string>) => {
        setLoading(true);
        setError(null);
        setTxId(null);

        try {
            const result = await fn();
            setTxId(result);
            return result;
        } catch (e) {
            setError(decodeError(e));
            throw e;
        } finally {
            setLoading(false);
        }
    };

    return { loading, error, txId, execute };
}
```

---

## Configuration Requirements

Copy config templates from `setup/` folder:

```bash
cp setup/.prettierrc .prettierrc
cp setup/eslint-react.json .eslintrc.json
cp setup/tsconfig-generic.json tsconfig.json
```

See `setup/README.md` for details.

### Required Vite Polyfills

```typescript
// vite.config.ts
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ['buffer', 'crypto', 'stream']
        })
    ]
});
```

---

## Related Documentation

- [OPNet Client Library](../../core/opnet/README.md) - Provider and contract APIs
- [Transaction Building](../../core/transaction/README.md) - PSBT construction
- [Wallet Connect](../../clients/walletconnect/README.md) - Wallet integration library
- [TypeScript Law](../../core/typescript-law/readme.md) - Coding standards
