# OP_NET - WalletConnect

![Bitcoin](https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NodeJS](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [WalletConnectProvider](#walletconnectprovider)
  - [useWalletConnect Hook](#usewalletconnect-hook)
  - [WalletConnectContext](#walletconnectcontext)
- [Types](#types)
- [Supported Wallets](#supported-wallets)
- [Network Configuration](#network-configuration)
- [Theme Customization](#theme-customization)
- [MLDSA Signatures](#mldsa-signatures)
- [Event Handling](#event-handling)
- [Examples](#examples)
- [Adding Custom Wallets](#adding-custom-wallets)
- [Error Handling](#error-handling)
- [Migration Guide](#migration-guide)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Introduction

The OP_NET WalletConnect library is a React-based TypeScript library that provides a unified interface for connecting Bitcoin wallets to your decentralized applications (dApps). It enables seamless wallet connections, transaction signing, balance retrieval, and network management through a simple React context and hooks API.

Built specifically for the OP_NET Bitcoin L1 smart contract ecosystem, this library supports quantum-resistant MLDSA signatures and provides automatic RPC provider configuration for OP_NET networks.

## Features

- **Multi-Wallet Support**: Connect to OP_WALLET and UniSat wallets with a unified API
- **React Integration**: Easy-to-use React Provider and Hook pattern
- **Auto-Reconnect**: Automatically reconnects to previously connected wallets
- **Theme Support**: Built-in light, dark, and moto themes for the connection modal
- **Network Detection**: Automatic network detection and switching support
- **MLDSA Signatures**: Quantum-resistant ML-DSA signature support (OP_WALLET only)
- **Balance Tracking**: Real-time wallet balance updates including CSV-locked amounts
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Browser & Node**: Works in both browser and Node.js environments

## Installation

### Prerequisites

- Node.js version 24.x or higher
- React 19+
- npm or yarn

### Install via npm

```bash
npm install @btc-vision/walletconnect
```

### Install via yarn

```bash
yarn add @btc-vision/walletconnect
```

### Peer Dependencies

This library requires React 19+ as a peer dependency:

```bash
npm install react@^19 react-dom@^19
```

## Quick Start

### 1. Wrap Your App with the Provider

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletConnectProvider theme="dark">
      <App />
    </WalletConnectProvider>
  </StrictMode>
);
```

### 2. Use the Hook in Your Components

```tsx
import { useWalletConnect } from '@btc-vision/walletconnect';

function WalletButton() {
  const {
    openConnectModal,
    disconnect,
    walletAddress,
    publicKey,
    connecting,
    network,
  } = useWalletConnect();

  if (connecting) {
    return <button disabled>Connecting...</button>;
  }

  if (walletAddress) {
    return (
      <div>
        <p>Connected: {walletAddress}</p>
        <p>Network: {network?.network}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return <button onClick={openConnectModal}>Connect Wallet</button>;
}
```

## API Reference

### WalletConnectProvider

The main provider component that wraps your application and provides wallet context to all child components.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `'light' \| 'dark' \| 'moto'` | `'light'` | Theme for the connection modal |
| `children` | `ReactNode` | required | Child components to render |

#### Example

```tsx
<WalletConnectProvider theme="dark">
  <App />
</WalletConnectProvider>
```

### useWalletConnect Hook

The primary hook for accessing wallet state and methods. Must be used within a `WalletConnectProvider`.

#### Returns: `WalletConnectContextType`

```typescript
const {
  // State
  allWallets,          // List of all supported wallets with installation status
  walletType,          // Current wallet type (e.g., 'OP_WALLET', 'UNISAT')
  walletAddress,       // Connected wallet's Bitcoin address
  walletInstance,      // Raw wallet instance for advanced operations
  network,             // Current network configuration
  publicKey,           // Connected wallet's public key (hex)
  address,             // Address object with MLDSA support
  connecting,          // Boolean indicating connection in progress
  provider,            // OP_NET RPC provider for blockchain queries
  signer,              // Transaction signer (UnisatSigner)
  walletBalance,       // Detailed wallet balance information
  mldsaPublicKey,      // MLDSA public key (OP_WALLET only)
  hashedMLDSAKey,      // SHA256 hash of MLDSA public key

  // Methods
  openConnectModal,    // Opens the wallet selection modal
  connectToWallet,     // Connects to a specific wallet
  disconnect,          // Disconnects from current wallet
  signMLDSAMessage,    // Signs a message with MLDSA (quantum-resistant)
  verifyMLDSASignature // Verifies an MLDSA signature
} = useWalletConnect();
```

#### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `allWallets` | `WalletInformation[]` | Array of all supported wallets with their status |
| `walletType` | `string \| null` | Identifier of the connected wallet type |
| `walletAddress` | `string \| null` | Bitcoin address of the connected wallet |
| `walletInstance` | `Unisat \| null` | Raw wallet instance for direct API calls |
| `network` | `WalletConnectNetwork \| null` | Current network with chain type |
| `publicKey` | `string \| null` | Public key of connected account (hex string) |
| `address` | `Address \| null` | Address object combining publicKey and MLDSA key |
| `connecting` | `boolean` | True while connection is in progress |
| `provider` | `AbstractRpcProvider \| null` | OP_NET JSON-RPC provider |
| `signer` | `UnisatSigner \| null` | Signer for transaction signing |
| `walletBalance` | `WalletBalance \| null` | Detailed balance breakdown |
| `mldsaPublicKey` | `string \| null` | MLDSA public key for quantum-resistant signatures |
| `hashedMLDSAKey` | `string \| null` | SHA256 hash of MLDSA public key |

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `openConnectModal` | `() => void` | Opens the wallet selection modal |
| `connectToWallet` | `(wallet: SupportedWallets) => void` | Connects directly to a specific wallet |
| `disconnect` | `() => void` | Disconnects from the current wallet |
| `signMLDSAMessage` | `(message: string) => Promise<MLDSASignature \| null>` | Signs a message using MLDSA |
| `verifyMLDSASignature` | `(message: string, signature: MLDSASignature) => Promise<boolean>` | Verifies an MLDSA signature |

### WalletConnectContext

The raw React context for advanced use cases. Prefer using the `useWalletConnect` hook.

```typescript
import { WalletConnectContext } from '@btc-vision/walletconnect';
import { useContext } from 'react';

const context = useContext(WalletConnectContext);
```

## Types

### WalletConnectNetwork

Extended network configuration with chain type information.

```typescript
interface WalletConnectNetwork extends Network {
  chainType: UnisatChainType;  // Enum: BITCOIN_MAINNET, BITCOIN_TESTNET, BITCOIN_REGTEST
  network: string;              // Human-readable: 'mainnet', 'testnet', 'regtest'
}
```

### WalletInformation

Information about a supported wallet.

```typescript
interface WalletInformation {
  name: SupportedWallets;  // Wallet identifier
  icon: string;            // Base64 or URL of wallet icon
  isInstalled: boolean;    // Whether wallet extension is detected
  isConnected: boolean;    // Whether wallet is currently connected
}
```

### WalletBalance

Detailed breakdown of wallet balance.

```typescript
interface WalletBalance {
  total: number;              // Total balance in satoshis
  confirmed: number;          // Confirmed balance
  unconfirmed: number;        // Unconfirmed/pending balance
  csv75_total: number;        // Total CSV-75 locked amount
  csv75_unlocked: number;     // Unlocked CSV-75 amount
  csv75_locked: number;       // Currently locked CSV-75 amount
  csv1_total: number;         // Total CSV-1 locked amount
  csv1_unlocked: number;      // Unlocked CSV-1 amount
  csv1_locked: number;        // Currently locked CSV-1 amount

  usd_value: string;          // USD value as string
}
```

### SupportedWallets

Enum of supported wallet types.

```typescript
enum SupportedWallets {
  OP_WALLET = 'OP_WALLET',
  UNISAT = 'UNISAT',
}
```

## Supported Wallets

### OP_WALLET

The native OP_NET wallet with full feature support including MLDSA signatures.

**Features:**
- Full OP_NET integration
- MLDSA (quantum-resistant) signature support
- Network switching
- Account change detection

**Installation:** [Chrome Web Store](https://chromewebstore.google.com/search/OP_WALLET)

### UniSat

Popular Bitcoin wallet with broad ecosystem support.

**Features:**
- Wide adoption
- Network switching
- Account change detection
- Transaction signing via UnisatSigner

**Limitations:**
- No MLDSA signature support

**Installation:** [Chrome Web Store](https://chromewebstore.google.com/search/UNISAT)

## Network Configuration

The library automatically configures OP_NET RPC providers based on the connected network:

| Chain Type | Network | RPC Endpoint |
|------------|---------|--------------|
| `BITCOIN_MAINNET` | mainnet | `https://mainnet.opnet.org` |
| `BITCOIN_TESTNET` | testnet | `https://testnet.opnet.org` |
| `BITCOIN_REGTEST` | regtest | `https://regtest.opnet.org` |

### Using the Provider

```typescript
const { provider, network } = useWalletConnect();

// Check current network
console.log(`Connected to: ${network?.network}`);

// Use provider for blockchain queries
if (provider) {
  const balance = await provider.getBalance('bc1q...');
  const blockNumber = await provider.getBlockNumber();
}
```

## Theme Customization

The library includes three built-in themes for the connection modal:

### Available Themes

| Theme | Description |
|-------|-------------|
| `light` | Light background with dark text |
| `dark` | Dark background with light text |
| `moto` | MotoSwap branded theme |

### Usage

```tsx
// Light theme (default)
<WalletConnectProvider theme="light">

// Dark theme
<WalletConnectProvider theme="dark">

// Moto theme
<WalletConnectProvider theme="moto">
```

### Custom Styling

The modal uses CSS classes that can be overridden:

```css
/* Modal backdrop */
.wallet-connect-modal-backdrop { }

/* Modal container */
.wallet-connect-modal { }

/* Header */
.wallet-connect-header { }

/* Wallet list */
.wallet-list { }

/* Individual wallet button */
.wallet-button { }

/* Wallet icon */
.wallet-icon { }

/* Error message */
.wallet-connect-error { }
```

## MLDSA Signatures

ML-DSA (Module-Lattice Digital Signature Algorithm) provides quantum-resistant cryptographic signatures. This feature is currently only available with OP_WALLET.

### Checking MLDSA Support

```typescript
const { mldsaPublicKey, walletType } = useWalletConnect();

const hasMLDSASupport = walletType === 'OP_WALLET' && mldsaPublicKey !== null;
```

### Signing Messages

```typescript
const { signMLDSAMessage, mldsaPublicKey } = useWalletConnect();

async function signMessage(message: string) {
  if (!mldsaPublicKey) {
    console.error('MLDSA not supported by current wallet');
    return;
  }

  const signature = await signMLDSAMessage(message);
  if (signature) {
    console.log('Signature:', signature);
  }
}
```

### Verifying Signatures

```typescript
const { verifyMLDSASignature } = useWalletConnect();

async function verify(message: string, signature: MLDSASignature) {
  const isValid = await verifyMLDSASignature(message, signature);
  console.log('Signature valid:', isValid);
}
```

### Address with MLDSA

The `address` property combines both traditional public key and MLDSA public key:

```typescript
const { address, publicKey, mldsaPublicKey } = useWalletConnect();

// address is created as:
// Address.fromString(mldsaPublicKey, publicKey)
```

## Event Handling

The library automatically handles wallet events:

### Account Changes

When the user switches accounts in their wallet, the library automatically updates:
- `walletAddress`
- `publicKey`
- `walletBalance`

### Network Changes

When the user switches networks:
- `network` is updated
- `provider` is reconfigured for the new network
- Balance is refreshed

### Disconnect

When the wallet disconnects:
- All state is cleared
- Local storage is cleaned
- UI updates to disconnected state

## Examples

### Complete Connection Flow

```tsx
import { useWalletConnect, SupportedWallets } from '@btc-vision/walletconnect';
import { useEffect, useState } from 'react';

function WalletManager() {
  const {
    openConnectModal,
    connectToWallet,
    disconnect,
    walletAddress,
    publicKey,
    network,
    walletBalance,
    provider,
    connecting,
    allWallets,
  } = useWalletConnect();

  // Check which wallets are installed
  const installedWallets = allWallets.filter(w => w.isInstalled);

  // Connect directly to a specific wallet
  const connectOP = () => connectToWallet(SupportedWallets.OP_WALLET);
  const connectUnisat = () => connectToWallet(SupportedWallets.UNISAT);

  if (connecting) {
    return <div>Connecting to wallet...</div>;
  }

  if (!walletAddress) {
    return (
      <div>
        <h2>Connect Your Wallet</h2>

        {/* Option 1: Open modal to choose */}
        <button onClick={openConnectModal}>
          Choose Wallet
        </button>

        {/* Option 2: Direct connection buttons */}
        <div>
          {installedWallets.map(wallet => (
            <button
              key={wallet.name}
              onClick={() => connectToWallet(wallet.name)}
            >
              Connect {wallet.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Wallet Connected</h2>
      <p><strong>Address:</strong> {walletAddress}</p>
      <p><strong>Public Key:</strong> {publicKey}</p>
      <p><strong>Network:</strong> {network?.network}</p>
      <p><strong>Balance:</strong> {walletBalance?.total} sats</p>
      <p><strong>USD Value:</strong> ${walletBalance?.usd_value}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

### Using the Provider for Blockchain Queries

```tsx
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useEffect, useState } from 'react';

function BlockchainInfo() {
  const { provider, network } = useWalletConnect();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!provider) return;

    const fetchBlockNumber = async () => {
      try {
        const block = await provider.getBlockNumber();
        setBlockNumber(block);
      } catch (error) {
        console.error('Failed to fetch block number:', error);
      }
    };

    fetchBlockNumber();

    // Poll for updates
    const interval = setInterval(fetchBlockNumber, 10000);
    return () => clearInterval(interval);
  }, [provider]);

  if (!provider) {
    return <p>Connect wallet to view blockchain info</p>;
  }

  return (
    <div>
      <p>Network: {network?.network}</p>
      <p>Current Block: {blockNumber}</p>
    </div>
  );
}
```

### Transaction Signing

```tsx
import { useWalletConnect } from '@btc-vision/walletconnect';

function TransactionSigner() {
  const { signer, walletInstance, publicKey } = useWalletConnect();

  const signTransaction = async () => {
    if (!signer || !walletInstance) {
      console.error('Wallet not connected');
      return;
    }

    try {
      // Use the signer for OP_NET transactions
      // The signer handles interaction with the wallet
      console.log('Signer ready for transactions');
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  const signMessage = async (message: string) => {
    if (!walletInstance) return;

    try {
      const signature = await walletInstance.signMessage(message);
      console.log('Message signed:', signature);
      return signature;
    } catch (error) {
      console.error('Signing failed:', error);
    }
  };

  return (
    <div>
      <button onClick={() => signMessage('Hello OP_NET!')}>
        Sign Message
      </button>
    </div>
  );
}
```

### MLDSA Quantum-Resistant Signing

```tsx
import { useWalletConnect } from '@btc-vision/walletconnect';

function QuantumSafeSigning() {
  const {
    mldsaPublicKey,
    hashedMLDSAKey,
    signMLDSAMessage,
    verifyMLDSASignature,
    walletType,
  } = useWalletConnect();

  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState<MLDSASignature | null>(null);

  const isMLDSASupported = walletType === 'OP_WALLET' && mldsaPublicKey;

  const handleSign = async () => {
    if (!message) return;

    const sig = await signMLDSAMessage(message);
    if (sig) {
      setSignature(sig);
      console.log('MLDSA Signature created');
    }
  };

  const handleVerify = async () => {
    if (!signature || !message) return;

    const isValid = await verifyMLDSASignature(message, signature);
    alert(isValid ? 'Signature is valid!' : 'Signature is invalid!');
  };

  if (!isMLDSASupported) {
    return <p>MLDSA signatures require OP_WALLET</p>;
  }

  return (
    <div>
      <p>MLDSA Public Key: {mldsaPublicKey?.slice(0, 20)}...</p>
      <p>Hashed Key: {hashedMLDSAKey}</p>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message to sign"
      />

      <button onClick={handleSign}>Sign with MLDSA</button>

      {signature && (
        <button onClick={handleVerify}>Verify Signature</button>
      )}
    </div>
  );
}
```

## Adding Custom Wallets

To add support for a new wallet, follow these steps:

### 1. Create Wallet Directory

Create a new directory in `src/wallets/` for your wallet:

```
src/wallets/mywallet/
  ├── controller.ts
  └── interface.ts
```

### 2. Define the Interface

Create `interface.ts` with your wallet's browser API types:

```typescript
// src/wallets/mywallet/interface.ts
import type { Unisat } from '@btc-vision/transaction';

export interface MyWalletInterface extends Unisat {
  // Add any wallet-specific methods
  customMethod(): Promise<string>;
}

// Export wallet icon (base64 or URL)
export const logo = 'data:image/svg+xml;base64,...';
```

### 3. Implement the Controller

Create `controller.ts` implementing the `WalletBase` interface:

```typescript
// src/wallets/mywallet/controller.ts
import type { MLDSASignature, Unisat, UnisatChainType } from '@btc-vision/transaction';
import { AbstractRpcProvider, JSONRpcProvider } from 'opnet';
import type { WalletBase } from '../types';
import type { MyWalletInterface } from './interface';

interface MyWalletWindow extends Window {
  myWallet?: MyWalletInterface;
}

class MyWallet implements WalletBase {
  private walletBase: MyWalletWindow['myWallet'];
  private _isConnected: boolean = false;

  isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    this.walletBase = (window as unknown as MyWalletWindow).myWallet;
    return !!this.walletBase;
  }

  isConnected(): boolean {
    return !!this.walletBase && this._isConnected;
  }

  async canAutoConnect(): Promise<boolean> {
    const accounts = await this.walletBase?.getAccounts() || [];
    return accounts.length > 0;
  }

  getWalletInstance(): Unisat | null {
    return this._isConnected && this.walletBase || null;
  }

  async getProvider(): Promise<AbstractRpcProvider | null> {
    // Return appropriate provider based on network
    return new JSONRpcProvider('https://mainnet.opnet.org', networks.bitcoin);
  }

  async getSigner(): Promise<UnisatSigner | null> {
    // Return signer if supported
    return null;
  }

  async connect(): Promise<string[]> {
    if (!this.walletBase) throw new Error('Wallet not installed');
    const accounts = await this.walletBase.requestAccounts();
    this._isConnected = accounts.length > 0;
    return accounts;
  }

  async disconnect(): Promise<void> {
    await this.walletBase?.disconnect();
    this._isConnected = false;
  }

  async getPublicKey(): Promise<string | null> {
    return this.walletBase?.getPublicKey() || null;
  }

  async getNetwork(): Promise<UnisatChainType> {
    const chain = await this.walletBase?.getChain();
    return chain?.enum || UnisatChainType.BITCOIN_MAINNET;
  }

  // Implement event hooks
  setAccountsChangedHook(fn: (accounts: string[]) => void): void {
    this.walletBase?.on('accountsChanged', fn);
  }

  removeAccountsChangedHook(): void {
    // Remove listener
  }

  setDisconnectHook(fn: () => void): void {
    this.walletBase?.on('disconnect', fn);
  }

  removeDisconnectHook(): void {
    // Remove listener
  }

  setChainChangedHook(fn: (network: UnisatChainType) => void): void {
    this.walletBase?.on('chainChanged', (info) => fn(info.enum));
  }

  removeChainChangedHook(): void {
    // Remove listener
  }

  getChainId(): void {
    throw new Error('Method not implemented.');
  }

  // MLDSA methods (implement if supported)
  async getMLDSAPublicKey(): Promise<string | null> {
    return null;
  }

  async getHashedMLDSAKey(): Promise<string | null> {
    return null;
  }

  async signMLDSAMessage(message: string): Promise<MLDSASignature | null> {
    return null;
  }

  async verifyMLDSASignature(message: string, signature: MLDSASignature): Promise<boolean> {
    return false;
  }
}

export default MyWallet;
```

### 4. Add to Supported Wallets Enum

Update `src/wallets/supported-wallets.ts`:

```typescript
export enum SupportedWallets {
  OP_WALLET = 'OP_WALLET',
  UNISAT = 'UNISAT',
  MY_WALLET = 'MY_WALLET',  // Add your wallet
}
```

### 5. Register the Wallet

Update `src/wallets/index.ts`:

```typescript
import { WalletController } from './controller';
import MyWallet from './mywallet/controller';
import { logo as MyWalletLogo } from './mywallet/interface';
import { SupportedWallets } from './supported-wallets';

// ... existing registrations ...

WalletController.registerWallet({
  name: SupportedWallets.MY_WALLET,
  icon: MyWalletLogo,
  controller: new MyWallet(),
});
```

## Error Handling

The library includes built-in error handling with internationalization support.

### Connection Errors

Connection errors are displayed in the modal and can be accessed via error state:

```typescript
// Errors are automatically displayed in the connection modal
// They auto-clear after 5 seconds
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Wallet not found" | Wallet extension not detected | Install the wallet extension |
| "UNISAT is not installed" | UniSat extension missing | Install UniSat from Chrome Web Store |
| "OP_WALLET is not installed" | OP_WALLET extension missing | Install OP_WALLET from Chrome Web Store |
| "Failed to retrieve chain information" | Network query failed | Check wallet connection |

### Handling Errors in Code

```typescript
const { connectToWallet } = useWalletConnect();

const handleConnect = async (wallet: SupportedWallets) => {
  try {
    await connectToWallet(wallet);
  } catch (error) {
    console.error('Connection failed:', error);
    // Handle error appropriately
  }
};
```

## Migration Guide

### Migrating from V1 to V2

```
Old version            -->      New version
{                               {
                                    allWallets
                                    openConnectModal
    connect                         connectToWallet
    disconnect                      disconnect
    walletType                      walletType
    walletWindowInstance            walletInstance
    account                         -
      - isConnected                 publicKey != null
      - signer                      signer
      - address                     address (Address.fromString(publicKey))
                                    publicKey (account publicKey)
                                    walletAddress (account address)
      - addressTyped
      - network                     network
      - provider                    provider
                                    connecting
} = useWallet()                 } = useWalletConnect()
```

### Key Changes

1. **Hook rename**: `useWallet()` → `useWalletConnect()`
2. **Provider rename**: `WalletProvider` → `WalletConnectProvider`
3. **Flattened state**: Account properties moved to top level
4. **New features**: `allWallets`, `openConnectModal`, `connecting`, theme support
5. **MLDSA support**: New quantum-resistant signature methods

## Development

### Clone and Install

```bash
git clone https://github.com/btc-vision/walletconnect.git
cd walletconnect
npm install
```

### Build

```bash
# Build for Node.js
npm run build

# Build for browser
npm run browserBuild

# Build both
npm run setup
```

### Development Mode

```bash
npm run watch
```

### Linting

```bash
npm run lint
```

### Check Circular Dependencies

```bash
npm run check:circular
```

## Contributing

Contributions are welcome! Please read through the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to submit issues, feature requests, and pull requests.

## License

This project is open source and available under the [Apache-2.0 License](LICENSE).

---

For more information, visit [docs.opnet.org](https://docs.opnet.org) or the [OP_NET GitHub organization](https://github.com/btc-vision).
