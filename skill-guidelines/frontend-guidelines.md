# OPNet Frontend Development Guidelines

**Read `setup-guidelines.md` FIRST for project setup and package versions.**

This document covers frontend architecture, code organization, caching, network handling, and best practices.

### MANDATORY: Always Update Packages

**After `npm install`, ALWAYS run:**

```bash
npx npm-check-updates -u && npm install
```

**Never skip this step.** This ensures all tooling packages are at their latest versions.

---

## Table of Contents

1. [TypeScript Law (MANDATORY)](#typescript-law-mandatory)
2. [Mandatory Reading Order](#mandatory-reading-order)
3. [Code Architecture](#code-architecture)
4. [Project Structure](#project-structure)
5. [Caching and Reuse](#caching-and-reuse)
6. [Network Configuration](#network-configuration)
7. [Wallet Integration](#wallet-integration)
8. [Address and Public Key Handling (CRITICAL)](#address-and-public-key-handling-critical)
9. [Utility Patterns](#utility-patterns)
10. [Component Patterns](#component-patterns)
11. [TypeScript Standards](#typescript-standards)
12. [Common Frontend Mistakes](#common-frontend-mistakes)
13. [Theming with CSS Variables](#theming-with-css-variables)

---

## TypeScript Law (MANDATORY)

**BEFORE WRITING ANY FRONTEND CODE, YOU MUST READ AND FOLLOW:**

`docs/core-typescript-law-CompleteLaw.md`

**The TypeScript Law is NON-NEGOTIABLE.** Every line of code must comply. Violations lead to exploitable, broken code.

### Key Rules for Frontend

| FORBIDDEN | WHY | USE INSTEAD |
|-----------|-----|-------------|
| `any` | Runtime bugs, defeats type checking | Proper types, generics |
| `unknown` (except boundaries) | Lazy escape hatch | Model actual types |
| `object` (lowercase) | Too broad, no shape info | `Record<string, T>` or interface |
| `Function` (uppercase) | No parameter/return safety | Specific function signatures |
| `!` (non-null assertion) | Hides null bugs | Explicit checks, `?.` |
| `// @ts-ignore` | Hides errors | Fix the actual error |
| `eslint-disable` | Bypasses safety | Fix the actual issue |
| Section separator comments | Lazy, unprofessional | TSDoc for every method |
| `number` for large values | 53-bit precision loss | `bigint` for satoshis, token amounts |
| Floats for financial values | Rounding errors | Fixed-point `bigint` |
| **Inline CSS (`style={{ }}`)** | Unmaintainable, no reuse, no theming | CSS modules, styled-components, Tailwind, or external CSS |

**Read the full TypeScript Law before proceeding.**

---

## Mandatory Reading Order

**This guideline is a SUMMARY. You MUST read the following docs files IN ORDER before writing frontend code:**

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules, forbidden constructs |
| 2 | `guidelines/setup-guidelines.md` | Package versions, vite config |
| 3 | `guidelines/frontend-guidelines.md` | This file - summary of patterns |
| 4 | `docs/core-opnet-README.md` | Client library overview |
| 5 | `docs/core-opnet-getting-started-installation.md` | Installation |
| 6 | `docs/core-opnet-getting-started-quick-start.md` | Quick start |
| 7 | `docs/core-opnet-providers-json-rpc-provider.md` | Provider setup |
| 8 | `docs/core-opnet-providers-internal-caching.md` | Caching (MANDATORY) |
| 9 | `docs/core-opnet-contracts-instantiating-contracts.md` | Contract instances |
| 10 | `docs/core-opnet-contracts-simulating-calls.md` | Read operations |
| 11 | `docs/core-opnet-contracts-sending-transactions.md` | Write operations |
| 12 | `docs/clients-walletconnect-README.md` | Wallet connection |
| 13 | `docs/frontend-motoswap-ui-README.md` | **THE STANDARD** - Reference implementation |

**IF YOU SKIP THESE DOCS, YOUR FRONTEND WILL HAVE BUGS.**

---

## Code Architecture

### OOP WHERE SENSIBLE

**Use Object-Oriented Programming where it makes sense.** Classes are preferred over scattered functions for:

- Services (ProviderService, ContractService, WalletService)
- Utilities with related methods (FormatUtils, ValidationUtils)
- State management with encapsulation
- Complex components with internal logic

**NOT everything needs to be a class.** Simple pure functions, React hooks, and small utilities can remain functional.

### NO SPAGHETTI CODE

**Classes are preferred over scattered functions.** Organize code properly:

| Bad | Good |
|-----|------|
| Functions scattered across files | Classes with clear responsibilities |
| Duplicate code everywhere | Utility classes, shared functions |
| No structure | Feature-based organization |
| Inline logic in components | Logic extracted to hooks/services |

### Single Responsibility Principle

Each class/function/component should do ONE thing:

```typescript
// BAD - Component does everything
function TokenPage() {
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [balance, setBalance] = useState(0n);
    // ... 500 lines of mixed logic
}

// GOOD - Separated concerns
function TokenPage() {
    const { provider } = useOPNetProvider();
    const { contract } = useTokenContract();
    const { balance, refreshBalance } = useTokenBalance();
    // Clean, focused component
}
```

---

## Project Structure

```
src/
├── main.tsx                      # Entry point
├── App.tsx                       # Root component
├── config/
│   ├── index.ts                  # Config exports
│   ├── networks.ts               # Network configs (mainnet, regtest)
│   └── contracts.ts              # Contract addresses per network
├── components/
│   ├── common/                   # Shared components (Button, Modal, etc.)
│   ├── wallet/                   # Wallet-related components
│   └── token/                    # Token-specific components
├── hooks/
│   ├── useOPNetProvider.ts       # Provider hook (cached)
│   ├── useWallet.ts              # Wallet connection hook
│   ├── useContract.ts            # Contract instance hook (cached)
│   └── useTokenBalance.ts        # Specific data hooks
├── services/
│   ├── ProviderService.ts        # Provider singleton
│   ├── ContractService.ts        # Contract instance cache
│   └── WalletService.ts          # Wallet interaction service
├── utils/
│   ├── formatting.ts             # Format utils (addresses, amounts)
│   ├── validation.ts             # Validation utils
│   └── network.ts                # Network detection utils
├── types/
│   ├── index.ts                  # Type exports
│   ├── contracts.ts              # Contract types
│   └── wallet.ts                 # Wallet types
├── abi/
│   └── TokenABI.ts               # Contract ABIs
└── styles/
    └── index.css                 # Global styles
```

---

## Caching and Reuse

### Provider Note

**WebSocketProvider is EXPERIMENTAL.** Use `JSONRpcProvider` for production frontend code until WebSocket support is stable.

---

### ALWAYS CACHE. ALWAYS REUSE.

**Provider, contract instances, and API responses MUST be cached.**

### Provider Singleton (JSONRpcProvider)

```typescript
// services/ProviderService.ts
import { JSONRpcProvider } from 'opnet';
import { Networks } from '@btc-vision/bitcoin';

/**
 * Singleton provider service. Never create multiple provider instances.
 */
class ProviderService {
    private static instance: ProviderService;
    private providers: Map<Networks, JSONRpcProvider> = new Map();

    private constructor() {}

    public static getInstance(): ProviderService {
        if (!ProviderService.instance) {
            ProviderService.instance = new ProviderService();
        }
        return ProviderService.instance;
    }

    /**
     * Get or create provider for network.
     * Provider is created ONCE and reused.
     */
    public getProvider(network: Networks): JSONRpcProvider {
        if (!this.providers.has(network)) {
            const rpcUrl = this.getRpcUrl(network);
            const provider = new JSONRpcProvider(rpcUrl, network);
            this.providers.set(network, provider);
        }
        return this.providers.get(network)!;
    }

    private getRpcUrl(network: Networks): string {
        switch (network) {
            case Networks.Mainnet:
                return 'https://api.opnet.org';
            case Networks.Regtest:
                return 'http://localhost:9001';
            default:
                throw new Error(`Unsupported network: ${network}`);
        }
    }
}

export const providerService = ProviderService.getInstance();
```

### Contract Instance Cache

```typescript
// services/ContractService.ts
import { IOP20Contract, getContract, OP20_ABI } from 'opnet';
import { Networks } from '@btc-vision/bitcoin';
import { providerService } from './ProviderService';

/**
 * Contract instance cache. getContract is called ONCE per address.
 */
class ContractService {
    private static instance: ContractService;
    private contracts: Map<string, IOP20Contract> = new Map();

    private constructor() {}

    public static getInstance(): ContractService {
        if (!ContractService.instance) {
            ContractService.instance = new ContractService();
        }
        return ContractService.instance;
    }

    /**
     * Get or create contract instance.
     * Contract is created ONCE and reused.
     */
    public getTokenContract(address: string, network: Networks): IOP20Contract {
        const key = `${network}:${address}`;

        if (!this.contracts.has(key)) {
            const provider = providerService.getProvider(network);
            const contract = getContract<IOP20Contract>(address, OP20_ABI, provider);
            this.contracts.set(key, contract);
        }

        return this.contracts.get(key)!;
    }

    /**
     * Clear cache on network change.
     */
    public clearCache(): void {
        this.contracts.clear();
    }
}

export const contractService = ContractService.getInstance();
```

### Hook with Caching

```typescript
// hooks/useContract.ts
import { useMemo } from 'react';
import { IOP20Contract } from 'opnet';
import { Networks } from '@btc-vision/bitcoin';
import { contractService } from '../services/ContractService';
import { useNetwork } from './useNetwork';

export function useTokenContract(address: string): IOP20Contract | null {
    const { network } = useNetwork();

    // useMemo ensures we don't recreate on every render
    // But the REAL caching is in ContractService
    return useMemo(() => {
        if (!address || !network) return null;
        return contractService.getTokenContract(address, network);
    }, [address, network]);
}
```

---

## RPC Call Optimization (CRITICAL)

### Use `.metadata()` Instead of Multiple Calls

**WRONG - 4+ separate RPC calls:**
```typescript
// ❌ BAD - 4 RPC calls for basic token info
const [nameResult, symbolResult, decimalsResult, totalSupplyResult] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.totalSupply()
]);

const name = nameResult.decoded;
const symbol = symbolResult.decoded;
const decimals = decimalsResult.decoded;
const totalSupply = totalSupplyResult.decoded;
```

**CORRECT - 1 RPC call with `.metadata()`:**
```typescript
// ✅ GOOD - 1 RPC call returns ALL token info
const metadataResult = await contract.metadata();
const metadata = metadataResult.properties;

// metadata contains:
// - name: string
// - symbol: string
// - decimals: number
// - totalSupply: bigint
// - owner: Address (if applicable)
// - and more...

const { name, symbol, decimals, totalSupply } = metadata;
```

**Why this matters:**
- Each RPC call has network latency (50-500ms)
- 4 calls = 200-2000ms total wait time
- 1 call = 50-500ms total wait time
- **4x-10x faster with `.metadata()`**

### Other Batch Optimizations

```typescript
// ❌ BAD - Multiple calls for same data
const balance1 = await contract.balanceOf(user1);
const balance2 = await contract.balanceOf(user2);
const balance3 = await contract.balanceOf(user3);

// ✅ GOOD - Use Promise.all for independent calls
const [balance1, balance2, balance3] = await Promise.all([
    contract.balanceOf(user1),
    contract.balanceOf(user2),
    contract.balanceOf(user3),
]);

// ✅ BEST - If the contract has a batch method, use it
const balances = await contract.balanceOfBatch([user1, user2, user3]);
```

### Cache RPC Results

```typescript
// ❌ BAD - Fetching metadata on every render
function TokenInfo({ address }: { address: string }) {
    const [metadata, setMetadata] = useState(null);

    useEffect(() => {
        contract.metadata().then(r => setMetadata(r.properties));
    }, [address]); // Fetches every time address changes
}

// ✅ GOOD - Cache metadata, invalidate on block change
const metadataCache = new Map<string, TokenMetadata>();

async function getTokenMetadata(address: string): Promise<TokenMetadata> {
    if (metadataCache.has(address)) {
        return metadataCache.get(address)!;
    }

    const result = await contract.metadata();
    metadataCache.set(address, result.properties);
    return result.properties;
}
```

---

## Network Configuration

### ALWAYS Use Enums from @btc-vision/bitcoin

**NEVER hardcode network strings.** Use the official enums:

```typescript
import { Networks } from '@btc-vision/bitcoin';
import { ChainId } from '@btc-vision/transaction';

// WRONG - Hardcoded strings
const network = 'mainnet';
const network = 'regtest';

// CORRECT - Use enums
const network = Networks.Mainnet;
const network = Networks.Regtest;
```

### Network Config File

```typescript
// config/networks.ts
import { Networks } from '@btc-vision/bitcoin';

export interface NetworkConfig {
    name: string;
    rpcUrl: string;
    explorerUrl: string;
}

export const NETWORK_CONFIGS: Record<Networks, NetworkConfig> = {
    [Networks.Mainnet]: {
        name: 'Mainnet',
        rpcUrl: 'https://api.opnet.org',
        explorerUrl: 'https://explorer.opnet.org',
    },
    [Networks.Testnet]: {
        name: 'Testnet',
        rpcUrl: 'https://testnet.opnet.org',
        explorerUrl: 'https://testnet-explorer.opnet.org',
    },
    [Networks.Regtest]: {
        name: 'Regtest',
        rpcUrl: 'http://localhost:9001',
        explorerUrl: 'http://localhost:3000',
    },
};
```

### Contract Addresses Per Network

```typescript
// config/contracts.ts
import { Networks } from '@btc-vision/bitcoin';

export interface ContractAddresses {
    token: string;
    staking?: string;
    // Add other contracts
}

export const CONTRACT_ADDRESSES: Record<Networks, ContractAddresses> = {
    [Networks.Mainnet]: {
        token: 'bcrt1q...mainnet-address',
        staking: 'bcrt1q...mainnet-staking',
    },
    [Networks.Testnet]: {
        token: 'bcrt1q...testnet-address',
    },
    [Networks.Regtest]: {
        token: 'bcrt1q...regtest-address',
    },
};

/**
 * Get contract address for current network.
 */
export function getContractAddress(
    contract: keyof ContractAddresses,
    network: Networks
): string {
    const addresses = CONTRACT_ADDRESSES[network];
    const address = addresses[contract];

    if (!address) {
        throw new Error(`No ${contract} address configured for ${network}`);
    }

    return address;
}
```

---

## Wallet Integration

### Auto-Detect Network Switch (NO PAGE REFRESH)

The website must handle network changes WITHOUT requiring page refresh:

```typescript
// hooks/useNetwork.ts
import { useState, useEffect, useCallback } from 'react';
import { Networks } from '@btc-vision/bitcoin';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { contractService } from '../services/ContractService';

export function useNetwork() {
    const { network: walletNetwork, isConnected } = useWalletConnect();
    const [network, setNetwork] = useState<Networks>(Networks.Mainnet);

    // Auto-detect wallet network change
    useEffect(() => {
        if (isConnected && walletNetwork) {
            if (walletNetwork !== network) {
                // Network changed - clear caches
                contractService.clearCache();
                setNetwork(walletNetwork);
            }
        }
    }, [walletNetwork, isConnected, network]);

    // Manual network switch (when not connected)
    const switchNetwork = useCallback((newNetwork: Networks) => {
        contractService.clearCache();
        setNetwork(newNetwork);
    }, []);

    return {
        network,
        switchNetwork,
        isConnected,
    };
}
```

### Wallet Connection Component

```typescript
// components/wallet/WalletConnect.tsx
import { useWalletConnect, SupportedWallets } from '@btc-vision/walletconnect';
import { Networks } from '@btc-vision/bitcoin';
import { formatAddress } from '../../utils/formatting';

export function WalletConnect() {
    const {
        isConnected,
        address,
        network,
        connectToWallet,
        disconnect,
    } = useWalletConnect();

    const handleConnect = async () => {
        await connectToWallet(SupportedWallets.OP_WALLET);
    };

    if (isConnected && address) {
        return (
            <div className="wallet-info">
                <span className="network-badge">
                    {network === Networks.Mainnet ? 'Mainnet' : 'Regtest'}
                </span>
                <span className="address">{formatAddress(address)}</span>
                <button onClick={disconnect}>Disconnect</button>
            </div>
        );
    }

    return (
        <button onClick={handleConnect}>
            Connect Wallet
        </button>
    );
}
```

### Network-Aware Data Fetching

```typescript
// hooks/useTokenData.ts
import { useState, useEffect } from 'react';
import { useNetwork } from './useNetwork';
import { useTokenContract } from './useContract';
import { getContractAddress } from '../config/contracts';

export function useTokenData() {
    const { network } = useNetwork();
    const tokenAddress = getContractAddress('token', network);
    const contract = useTokenContract(tokenAddress);

    const [balance, setBalance] = useState<bigint>(0n);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Refetch when network changes
        if (contract) {
            fetchBalance();
        }
    }, [contract, network]);

    const fetchBalance = async () => {
        if (!contract) return;
        setLoading(true);
        try {
            const result = await contract.balanceOf(userAddress);
            setBalance(result.properties.balance);
        } finally {
            setLoading(false);
        }
    };

    return { balance, loading, refreshBalance: fetchBalance };
}
```

---

## Address and Public Key Handling (CRITICAL)

### Contract Addresses: op1 and 0x Both Valid

**For contract addresses**, both formats are valid when using `getContract`:

```typescript
// ✅ BOTH are valid for contract addresses
const contract1 = getContract<IOP20Contract>('op1qwerty...', OP20_ABI, provider);
const contract2 = getContract<IOP20Contract>('0x1234abcd...', OP20_ABI, provider);
```

### AddressVerificator (ALWAYS USE)

**Use `AddressVerificator` from `@btc-vision/transaction` for ALL address validation:**

```typescript
import { AddressVerificator } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

// Validate any Bitcoin address
const isValid = AddressVerificator.isValidAddress('bc1q...', networks.bitcoin);

// Validate specific address types
const isP2TR = AddressVerificator.isValidP2TRAddress('bc1p...', networks.bitcoin);
const isP2WPKH = AddressVerificator.isP2WPKHAddress('bc1q...', networks.bitcoin);
const isLegacy = AddressVerificator.isP2PKHOrP2SH('1A1z...', networks.bitcoin);

// Validate OPNet contract address (op1...)
const isOPNetContract = AddressVerificator.isValidP2OPAddress('op1...', networks.bitcoin);

// Validate public key (hex format)
const isPubKeyValid = AddressVerificator.isValidPublicKey('0x02...', networks.bitcoin);

// Detect address type
const addressType = AddressVerificator.detectAddressType('bc1q...', networks.bitcoin);
// Returns: AddressTypes.P2TR, AddressTypes.P2WPKH, AddressTypes.P2PKH, etc.
```

**Validation Hook Example:**

```typescript
// hooks/useAddressValidation.ts
import { useMemo } from 'react';
import { AddressVerificator } from '@btc-vision/transaction';
import { Networks } from '@btc-vision/bitcoin';

export function useAddressValidation(address: string, network: Networks) {
    return useMemo(() => {
        if (!address) {
            return { isValid: false, type: null, error: 'Address required' };
        }

        // Check if it's a public key (0x...)
        if (address.startsWith('0x')) {
            const isValid = AddressVerificator.isValidPublicKey(address, network);
            return { isValid, type: 'publicKey', error: isValid ? null : 'Invalid public key' };
        }

        // Check if it's an OPNet contract address (op1...)
        if (address.startsWith('op1')) {
            const isValid = AddressVerificator.isValidP2OPAddress(address, network);
            return { isValid, type: 'contract', error: isValid ? null : 'Invalid contract address' };
        }

        // Check Bitcoin address
        const isValid = AddressVerificator.isValidAddress(address, network);
        const type = AddressVerificator.detectAddressType(address, network);

        return {
            isValid,
            type,
            error: isValid ? null : 'Invalid Bitcoin address',
        };
    }, [address, network]);
}
```

### Public Keys: MUST Be Hexadecimal

**For transfers and operations requiring public keys, you MUST use hexadecimal format (0x...).**

If you have a Bitcoin address (bc1q..., tb1q..., bcrt1q...), you MUST convert it to a public key first:

```typescript
// ❌ WRONG - Cannot use Bitcoin address directly for transfers
const result = await contract.transfer('bc1q...recipient', amount);

// ✅ CORRECT - Convert address to public key first
const pubKeyInfo = await provider.getPublicKeyInfo('bc1q...recipient');

if (!pubKeyInfo || !pubKeyInfo.publicKey) {
    // Public key not found - FORCE user to enter it manually
    throw new Error('Public key not found for address. Please provide the recipient public key.');
}

const recipientPubKey = pubKeyInfo.publicKey; // 0x020373626d317ae8788ce3280b491068610d840c23ecb64c14075bbb9f670af52c
const result = await contract.transfer(recipientPubKey, amount);
```

### Public Key Lookup Service

```typescript
// services/PublicKeyService.ts
import { JSONRpcProvider } from 'opnet';
import { AddressVerificator } from '@btc-vision/transaction';
import { Networks } from '@btc-vision/bitcoin';

/**
 * Service for resolving Bitcoin addresses to public keys.
 * Uses AddressVerificator for validation.
 */
class PublicKeyService {
    private static instance: PublicKeyService;
    private cache: Map<string, string> = new Map();

    private constructor() {}

    public static getInstance(): PublicKeyService {
        if (!PublicKeyService.instance) {
            PublicKeyService.instance = new PublicKeyService();
        }
        return PublicKeyService.instance;
    }

    /**
     * Get public key for a Bitcoin address.
     * Returns null if not found - caller MUST handle this case.
     */
    public async getPublicKey(
        address: string,
        provider: JSONRpcProvider,
        network: Networks
    ): Promise<string | null> {
        // Already a public key - validate it
        if (address.startsWith('0x')) {
            if (!AddressVerificator.isValidPublicKey(address, network)) {
                return null; // Invalid public key
            }
            return address;
        }

        // Validate Bitcoin address format first
        if (!AddressVerificator.isValidAddress(address, network)) {
            return null; // Invalid address format
        }

        // Check cache
        if (this.cache.has(address)) {
            return this.cache.get(address)!;
        }

        // Lookup from provider
        const info = await provider.getPublicKeyInfo(address);

        if (!info || !info.publicKey) {
            return null; // Not found - caller must handle
        }

        // Cache and return
        this.cache.set(address, info.publicKey);
        return info.publicKey;
    }

    /**
     * Clear cache on network change.
     */
    public clearCache(): void {
        this.cache.clear();
    }
}

export const publicKeyService = PublicKeyService.getInstance();
```

### Hook for Public Key Resolution

```typescript
// hooks/usePublicKey.ts
import { useState, useCallback } from 'react';
import { useOPNetProvider } from './useOPNetProvider';
import { publicKeyService } from '../services/PublicKeyService';

interface PublicKeyResult {
    publicKey: string | null;
    loading: boolean;
    error: string | null;
    requiresManualInput: boolean;
}

export function usePublicKey() {
    const { provider } = useOPNetProvider();
    const [result, setResult] = useState<PublicKeyResult>({
        publicKey: null,
        loading: false,
        error: null,
        requiresManualInput: false,
    });

    const resolvePublicKey = useCallback(async (address: string) => {
        if (!provider) {
            setResult({
                publicKey: null,
                loading: false,
                error: 'Provider not available',
                requiresManualInput: false,
            });
            return;
        }

        // Already a public key
        if (address.startsWith('0x')) {
            setResult({
                publicKey: address,
                loading: false,
                error: null,
                requiresManualInput: false,
            });
            return;
        }

        setResult((prev) => ({ ...prev, loading: true, error: null }));

        const pubKey = await publicKeyService.getPublicKey(address, provider);

        if (pubKey) {
            setResult({
                publicKey: pubKey,
                loading: false,
                error: null,
                requiresManualInput: false,
            });
        } else {
            // NOT FOUND - Force user to enter manually
            setResult({
                publicKey: null,
                loading: false,
                error: 'Public key not found for this address',
                requiresManualInput: true,
            });
        }
    }, [provider]);

    return { ...result, resolvePublicKey };
}
```

### Transfer Component Example

```typescript
// components/TransferForm.tsx
import { useState } from 'react';
import { usePublicKey } from '../hooks/usePublicKey';

function TransferForm() {
    const [recipient, setRecipient] = useState('');
    const [manualPubKey, setManualPubKey] = useState('');
    const { publicKey, loading, error, requiresManualInput, resolvePublicKey } = usePublicKey();

    const handleRecipientChange = async (address: string) => {
        setRecipient(address);
        setManualPubKey(''); // Reset manual input
        await resolvePublicKey(address);
    };

    const getEffectivePublicKey = (): string | null => {
        if (requiresManualInput) {
            return manualPubKey.startsWith('0x') ? manualPubKey : null;
        }
        return publicKey;
    };

    const handleTransfer = async () => {
        const pubKey = getEffectivePublicKey();
        if (!pubKey) {
            alert('Valid public key required');
            return;
        }

        // Now safe to transfer with hex public key
        await contract.transfer(pubKey, amount);
    };

    return (
        <form>
            <input
                value={recipient}
                onChange={(e) => handleRecipientChange(e.target.value)}
                placeholder="Recipient address (bc1q...) or public key (0x...)"
            />

            {requiresManualInput && (
                <div className="manual-pubkey-input">
                    <p className="warning">
                        Public key not found for this address.
                        Please enter the recipient's public key:
                    </p>
                    <input
                        value={manualPubKey}
                        onChange={(e) => setManualPubKey(e.target.value)}
                        placeholder="0x020373626d317ae8788ce3280b491068610d840c23ecb64c14075bbb9f670af52c"
                    />
                </div>
            )}

            {error && !requiresManualInput && (
                <p className="error">{error}</p>
            )}

            <button
                disabled={loading || !getEffectivePublicKey()}
                onClick={handleTransfer}
            >
                Transfer
            </button>
        </form>
    );
}
```

### Summary: Address Formats

| Context | op1 Address | 0x Address | bc1q/tb1q Address |
|---------|-------------|------------|-------------------|
| `getContract()` | ✅ Valid | ✅ Valid | ❌ Invalid |
| `transfer()` / operations | ❌ Must convert | ✅ Valid | ❌ Must convert |
| Public key parameter | ❌ Must convert | ✅ Valid | ❌ Must convert |

**Key Rules:**
1. **Contract addresses**: `op1...` and `0x...` both work directly
2. **Public keys for operations**: MUST be `0x...` hexadecimal format
3. **Bitcoin addresses** (`bc1q...`): Use `provider.getPublicKeyInfo()` to convert
4. **If public key not found**: FORCE user to provide it manually - never guess

---

## Utility Patterns

### Create Utility Classes for Reusable Logic

**NO duplicate code.** Extract to utilities:

```typescript
// utils/formatting.ts

/**
 * Format utilities for consistent display.
 */
export class FormatUtils {
    /**
     * Truncate address for display.
     */
    public static formatAddress(address: string, chars: number = 6): string {
        if (address.length <= chars * 2 + 3) return address;
        return `${address.slice(0, chars)}...${address.slice(-chars)}`;
    }

    /**
     * Format token amount with decimals.
     */
    public static formatTokenAmount(
        amount: bigint,
        decimals: number = 18,
        displayDecimals: number = 4
    ): string {
        const divisor = 10n ** BigInt(decimals);
        const whole = amount / divisor;
        const fraction = amount % divisor;

        const fractionStr = fraction.toString().padStart(decimals, '0');
        const displayFraction = fractionStr.slice(0, displayDecimals);

        return `${whole.toLocaleString()}.${displayFraction}`;
    }

    /**
     * Parse token amount from user input.
     */
    public static parseTokenAmount(input: string, decimals: number = 18): bigint {
        const [whole, fraction = ''] = input.split('.');
        const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
        return BigInt(whole + paddedFraction);
    }
}
```

```typescript
// utils/validation.ts

/**
 * Validation utilities.
 */
export class ValidationUtils {
    /**
     * Validate Bitcoin address format.
     */
    public static isValidAddress(address: string): boolean {
        // Basic validation - starts with expected prefix
        return /^(bc1|bcrt1|tb1)[a-z0-9]{39,87}$/i.test(address);
    }

    /**
     * Validate positive amount.
     */
    public static isValidAmount(amount: string): boolean {
        if (!amount) return false;
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0;
    }
}
```

### Using Utilities in Components

```typescript
import { FormatUtils } from '../utils/formatting';
import { ValidationUtils } from '../utils/validation';

function TransferForm() {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');

    const isValid = ValidationUtils.isValidAddress(recipient)
        && ValidationUtils.isValidAmount(amount);

    const handleSubmit = () => {
        const parsedAmount = FormatUtils.parseTokenAmount(amount, 18);
        // Submit transfer
    };

    return (
        <form>
            <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient address"
            />
            <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
            />
            <button disabled={!isValid} onClick={handleSubmit}>
                Transfer
            </button>
        </form>
    );
}
```

---

## Component Patterns

### Clean, Focused Components

```typescript
// WRONG - Component does too much
function TokenPage() {
    // 50 lines of state
    // 100 lines of effects
    // 200 lines of handlers
    // 150 lines of JSX
}

// CORRECT - Separated concerns
function TokenPage() {
    return (
        <div className="token-page">
            <TokenHeader />
            <TokenBalance />
            <TokenActions />
            <TokenHistory />
        </div>
    );
}

function TokenBalance() {
    const { balance, loading } = useTokenBalance();

    if (loading) return <Spinner />;

    return (
        <div className="balance">
            {FormatUtils.formatTokenAmount(balance)}
        </div>
    );
}
```

### Props Interfaces

```typescript
// Always define props interfaces
interface TokenCardProps {
    address: string;
    name: string;
    symbol: string;
    balance: bigint;
    onTransfer: (amount: bigint) => void;
}

function TokenCard({ address, name, symbol, balance, onTransfer }: TokenCardProps) {
    // ...
}
```

---

## TypeScript Standards

### ESLint + Strict TypeScript (ESNext Always)

```json
// tsconfig.json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "jsx": "react-jsx"
    }
}
```

### NO `any` Type

```typescript
// WRONG
const data: any = response.data;
function process(input: any): any { }

// CORRECT
interface TokenData {
    name: string;
    symbol: string;
    balance: bigint;
}
const data: TokenData = response.data;
function process(input: TokenData): ProcessedData { }
```

---

## Common Frontend Mistakes

### 1. Creating Multiple Provider Instances

**WRONG:**
```typescript
function Component1() {
    const provider = new JSONRpcProvider(url, network);  // New instance
}
function Component2() {
    const provider = new JSONRpcProvider(url, network);  // Another instance!
}
```

**CORRECT:**
```typescript
// Use singleton service
const provider = providerService.getProvider(network);  // Same instance
```

### 2. Calling getContract Every Render

**WRONG:**
```typescript
function TokenBalance() {
    // Creates new contract instance on EVERY render!
    const contract = getContract(address, abi, provider);
}
```

**CORRECT:**
```typescript
function TokenBalance() {
    // Cached in service, useMemo prevents unnecessary calls
    const contract = useTokenContract(address);
}
```

### 3. Hardcoding Network Strings

**WRONG:**
```typescript
if (network === 'mainnet') { }
const config = configs['regtest'];
```

**CORRECT:**
```typescript
import { Networks } from '@btc-vision/bitcoin';
if (network === Networks.Mainnet) { }
const config = configs[Networks.Regtest];
```

### 4. Not Handling Network Switch

**WRONG:**
```typescript
// Page refresh required when wallet changes network
```

**CORRECT:**
```typescript
useEffect(() => {
    if (walletNetwork !== currentNetwork) {
        contractService.clearCache();
        setNetwork(walletNetwork);
        // Data refetches automatically due to dependency
    }
}, [walletNetwork]);
```

### 5. Duplicate Utility Code

**WRONG:**
```typescript
// In Component1.tsx
const formatted = `${address.slice(0, 6)}...${address.slice(-4)}`;

// In Component2.tsx (same logic duplicated)
const formatted = `${address.slice(0, 6)}...${address.slice(-4)}`;
```

**CORRECT:**
```typescript
// In utils/formatting.ts
export function formatAddress(address: string): string { }

// In any component
import { formatAddress } from '../utils/formatting';
const formatted = formatAddress(address);
```

### 6. Missing Loading States

**WRONG:**
```typescript
function Balance() {
    const [balance, setBalance] = useState(0n);
    // No loading state - shows 0 while fetching
    return <div>{balance}</div>;
}
```

**CORRECT:**
```typescript
function Balance() {
    const { balance, loading } = useTokenBalance();

    if (loading) return <Skeleton />;
    return <div>{formatTokenAmount(balance)}</div>;
}
```

### 7. Vite Version Incompatibility

**WRONG - Never use specific versions for tooling:**
```json
{
    "vite": "^6.0.0",
    "vite-plugin-node-polyfills": "^0.22.0"
}
```

**CORRECT - Always use "latest" for tooling:**
```json
{
    "vite": "latest",
    "vite-plugin-dts": "latest",
    "vite-plugin-node-polyfills": "latest",
    "vite-plugin-eslint2": "latest"
}
```

### 8. Incomplete Vite Config

**WRONG - Missing critical settings:**
```typescript
// Minimal config breaks OPNet apps
export default defineConfig({
    plugins: [react(), nodePolyfills()]
});
```

**CORRECT - Use the complete config from `guidelines/setup-guidelines.md`**

Key settings you MUST include:

| Setting | Why Required |
|---------|--------------|
| `nodePolyfills` before `react()` | Plugin order matters |
| `crypto: 'crypto-browserify'` | Browser crypto for signing |
| `undici` alias to browser fetch | opnet uses undici internally |
| `dedupe` for noble/scure libs | Multiple copies break signatures |
| `manualChunks` | Proper code splitting |
| `external` for node: modules | Can't run in browser |
| `exclude: ['crypto-browserify']` | Circular deps break pre-bundling |

### 9. Missing Browser Shims

**WRONG - Crypto operations fail:**
```typescript
// No crypto-browserify override
nodePolyfills({
    globals: { Buffer: true }
})
```

**CORRECT:**
```typescript
nodePolyfills({
    globals: {
        Buffer: true,
        global: true,
        process: true
    },
    overrides: {
        crypto: 'crypto-browserify'  // REQUIRED for signing
    }
})
```

### 10. Missing undici Alias

**WRONG - Network requests fail:**
```typescript
resolve: {
    alias: {
        buffer: 'buffer/'
    }
}
```

**CORRECT:**
```typescript
resolve: {
    alias: {
        global: 'global',
        // opnet uses undici for fetch - needs browser shim
        undici: resolve(__dirname, 'node_modules/opnet/src/fetch/fetch-browser.js')
    },
    dedupe: ['@noble/curves', '@noble/hashes', '@scure/base', 'buffer', 'react', 'react-dom']
}
```

---

## Styling Rules (MANDATORY)

### NO INLINE CSS - EVER

**Inline CSS is FORBIDDEN. No exceptions.**

```tsx
// ❌ WRONG - NEVER DO THIS
<div style={{ padding: '16px', backgroundColor: '#fff' }}>
    <span style={{ color: 'red', fontSize: '14px' }}>Error</span>
</div>

// ❌ WRONG - Even with variables
const styles = { padding: 16, margin: 8 };
<div style={styles}>Content</div>

// ✅ CORRECT - CSS Modules
import styles from './Component.module.css';
<div className={styles.container}>
    <span className={styles.error}>Error</span>
</div>

// ✅ CORRECT - Tailwind CSS
<div className="p-4 bg-white">
    <span className="text-red-500 text-sm">Error</span>
</div>

// ✅ CORRECT - styled-components
const Container = styled.div`
    padding: var(--spacing-md);
    background: var(--color-bg-primary);
`;

// ✅ CORRECT - External CSS with CSS variables
<div className="card">
    <span className="error-text">Error</span>
</div>
```

**Why inline CSS is forbidden:**
- No reusability - same styles repeated everywhere
- No theming support - can't use CSS variables properly
- No responsive design - can't use media queries
- No pseudo-selectors - can't do `:hover`, `:focus`, etc.
- Harder to maintain - styles scattered across components
- Worse performance - styles recalculated on every render

---

## Theming with CSS Variables

### ALWAYS Use CSS Variables for Colors

**Never hardcode colors.** Use CSS variables for dark/light theme support:

```css
/* styles/variables.css */

:root {
    /* Light theme (default) */
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f5f5f5;
    --color-bg-tertiary: #e0e0e0;

    --color-text-primary: #1a1a1a;
    --color-text-secondary: #666666;
    --color-text-muted: #999999;

    --color-border: #e0e0e0;
    --color-border-hover: #cccccc;

    --color-accent: #0066cc;
    --color-accent-hover: #0052a3;
    --color-accent-text: #ffffff;

    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-error: #ef4444;

    --color-card-bg: #ffffff;
    --color-card-shadow: rgba(0, 0, 0, 0.1);

    /* Spacing */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    /* Border radius */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-full: 9999px;

    /* Font sizes */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-md: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;

    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-normal: 250ms ease;
}

/* Dark theme */
[data-theme="dark"] {
    --color-bg-primary: #0a0a0a;
    --color-bg-secondary: #1a1a1a;
    --color-bg-tertiary: #2a2a2a;

    --color-text-primary: #f5f5f5;
    --color-text-secondary: #a0a0a0;
    --color-text-muted: #666666;

    --color-border: #333333;
    --color-border-hover: #444444;

    --color-accent: #3b82f6;
    --color-accent-hover: #60a5fa;
    --color-accent-text: #ffffff;

    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-error: #ef4444;

    --color-card-bg: #1a1a1a;
    --color-card-shadow: rgba(0, 0, 0, 0.3);
}
```

### Using CSS Variables in Components

```css
/* styles/components.css */

.card {
    background: var(--color-card-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    box-shadow: 0 2px 8px var(--color-card-shadow);
    transition: border-color var(--transition-fast);
}

.card:hover {
    border-color: var(--color-border-hover);
}

.button-primary {
    background: var(--color-accent);
    color: var(--color-accent-text);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-md);
    cursor: pointer;
    transition: background var(--transition-fast);
}

.button-primary:hover {
    background: var(--color-accent-hover);
}

.text-primary {
    color: var(--color-text-primary);
}

.text-secondary {
    color: var(--color-text-secondary);
}

.text-muted {
    color: var(--color-text-muted);
}
```

### Theme Toggle Hook

```typescript
// hooks/useTheme.ts
import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check localStorage first
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored) return stored;

        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    return { theme, setTheme, toggleTheme };
}
```

### Theme Toggle Component

```typescript
// components/common/ThemeToggle.tsx
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
    );
}
```

### Theme Rules

| Rule | Why |
|------|-----|
| **NEVER hardcode colors** | Breaks theming |
| **Use CSS variables** | Single source of truth |
| **Define both themes** | `:root` for light, `[data-theme="dark"]` for dark |
| **Use semantic names** | `--color-text-primary` not `--color-black` |
| **Include spacing/radius** | Consistent design system |
| **Store preference** | localStorage persists user choice |
| **Respect system preference** | `prefers-color-scheme` media query |

---

## Summary Checklist

### Architecture
- [ ] OOP where sensible (services, utilities with related methods)
- [ ] Use classes for services (ProviderService, ContractService)
- [ ] Extract duplicate code to utility classes
- [ ] Components are small and focused
- [ ] Logic extracted to hooks/services

### Caching
- [ ] Provider is singleton - NEVER create multiple instances
- [ ] Contract instances are cached - getContract called ONCE per address
- [ ] Clear caches on network change

### Network
- [ ] Use `Networks` enum from @btc-vision/bitcoin
- [ ] Config file has addresses for all networks (mainnet, regtest)
- [ ] Auto-detect wallet network switch (no page refresh)
- [ ] NO hardcoded network strings

### TypeScript
- [ ] ESNext + strict TypeScript
- [ ] NO `any` type anywhere

### Theming
- [ ] Use CSS variables for ALL colors
- [ ] Define both light and dark themes
- [ ] Use semantic variable names (--color-text-primary, not --color-black)
- [ ] Store theme preference in localStorage
- [ ] Respect system preference (prefers-color-scheme)
