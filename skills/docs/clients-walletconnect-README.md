# OP_NET - WalletConnect

![Bitcoin](https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NodeJS](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Introduction

The OP_NET WalletConnect library is a React-based TypeScript library that provides a unified interface for connecting Bitcoin wallets to your decentralized applications (dApps). It enables seamless wallet connections, transaction signing, balance retrieval, and network management through a simple React context and hooks API.

Built specifically for the OP_NET Bitcoin L1 smart contract ecosystem, this library supports quantum-resistant MLDSA signatures and provides automatic RPC provider configuration for OP_NET networks.

## Official Wallet: OP_WALLET

**OP_WALLET is the main and official wallet supporting OPNet.** It is developed by the OPNet team and provides the most complete feature set including:

- **MLDSA Signatures**: Quantum-resistant ML-DSA signature support
- **Full OPNet Integration**: Native support for all OPNet features
- **Two Address Systems**: Proper handling of Bitcoin addresses (tweaked public keys) and OPNet addresses (ML-DSA hashes)
- **First-Party Support**: Direct support from the OPNet development team

For the best experience with OPNet dApps, we strongly recommend using OP_WALLET.

## Features

- **Multi-Wallet Support**: Connect to OP_WALLET and UniSat wallets with a unified API
- **React Integration**: Easy-to-use React Provider and Hook pattern
- **Auto-Reconnect**: Automatically reconnects to previously connected wallets
- **Theme Support**: Built-in light, dark, and moto themes for the connection modal
- **Network Detection**: Automatic network detection and switching support
- **MLDSA Signatures**: Quantum-resistant ML-DSA signature support (OP_WALLET only)
- **Balance Tracking**: Real-time wallet balance updates including CSV-locked amounts
- **TypeScript**: Full TypeScript support with comprehensive type definitions

## Installation

### Prerequisites

- Node.js version 24.x or higher
- React 19+
- npm or yarn

### Install

```bash
npm install @btc-vision/walletconnect
```

### Peer Dependencies

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

The main provider component that wraps your application.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `'light' \| 'dark' \| 'moto'` | `'light'` | Theme for the connection modal |
| `children` | `ReactNode` | required | Child components to render |

### useWalletConnect Hook

The primary hook for accessing wallet state and methods.

#### Returns

```typescript
const {
  // State
  allWallets,          // WalletInformation[] - All supported wallets with status
  walletType,          // string | null - Current wallet type
  walletAddress,       // string | null - Connected wallet's Bitcoin address
  walletInstance,      // Unisat | null - Raw wallet instance
  network,             // WalletConnectNetwork | null - Current network
  publicKey,           // string | null - Connected wallet's Bitcoin tweaked public key (33 bytes compressed, 0x hex)
  address,             // Address | null - Address object with MLDSA support
  connecting,          // boolean - Connection in progress
  provider,            // AbstractRpcProvider | null - OP_NET RPC provider
  signer,              // UnisatSigner | null - Transaction signer
  walletBalance,       // WalletBalance | null - Detailed balance info
  mldsaPublicKey,      // string | null - Raw ML-DSA public key (~2500 bytes, 0x hex) (OP_WALLET only). NOT for Address.fromString().
  hashedMLDSAKey,      // string | null - 32-byte SHA256 hash of ML-DSA public key (0x hex). USE THIS for Address.fromString() first param.

  // Methods
  openConnectModal,    // () => void - Opens wallet selection modal
  connectToWallet,     // (wallet: SupportedWallets) => void - Connect to specific wallet
  disconnect,          // () => void - Disconnect from current wallet
  signMLDSAMessage,    // (message: string) => Promise<MLDSASignature | null>
  verifyMLDSASignature // (message: string, signature: MLDSASignature) => Promise<boolean>
} = useWalletConnect();
```

## CRITICAL: Using WalletConnect Values with Address.fromString()

**`Address.fromString()` requires TWO specific parameters. Getting them wrong is the #1 frontend bug.**

```typescript
const {
  publicKey,       // Bitcoin tweaked public key (33 bytes, 0x hex)
  mldsaPublicKey,  // Raw ML-DSA public key (~2500 bytes) — DO NOT use for Address.fromString()
  hashedMLDSAKey,  // 32-byte SHA256 hash of ML-DSA key — USE THIS for Address.fromString()
  walletAddress,   // Bitcoin address (bc1q.../bc1p...) — ONLY for display and refundTo
} = useWalletConnect();

// CORRECT — Address.fromString(hashedMLDSAKey, publicKey)
const senderAddress = Address.fromString(hashedMLDSAKey, publicKey);
const contract = getContract<IMyContract>(addr, abi, provider, network, senderAddress);

// WRONG — mldsaPublicKey is the RAW key (~2500 bytes), not the 32-byte hash
const bad1 = Address.fromString(mldsaPublicKey, publicKey); // ❌

// WRONG — walletAddress is a bech32 string, not a public key
const bad2 = Address.fromString(walletAddress); // ❌

// WRONG — only one parameter
const bad3 = Address.fromString(publicKey); // ❌
```

**Summary:**
| WalletConnect value | What it is | Use for |
|---|---|---|
| `walletAddress` | Bitcoin bech32 address (bc1q/bc1p) | Display to user, `refundTo` in sendTransaction |
| `publicKey` | Bitcoin tweaked pubkey (33 bytes hex) | `Address.fromString()` **second** param |
| `mldsaPublicKey` | Raw ML-DSA public key (~2500 bytes hex) | MLDSA signing/verification ONLY |
| `hashedMLDSAKey` | 32-byte SHA256 hash of ML-DSA key | `Address.fromString()` **first** param |

## Types

### WalletConnectNetwork

```typescript
interface WalletConnectNetwork extends Network {
  chainType: UnisatChainType;  // BITCOIN_MAINNET, BITCOIN_TESTNET, BITCOIN_REGTEST
  network: string;              // 'mainnet', 'testnet', 'regtest'
}
```

### WalletInformation

```typescript
interface WalletInformation {
  name: SupportedWallets;  // Wallet identifier
  icon: string;            // Base64 or URL of wallet icon
  isInstalled: boolean;    // Whether wallet extension is detected
  isConnected: boolean;    // Whether wallet is currently connected
}
```

### WalletBalance

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
  p2wda_total_amount: number; // Total P2WDA amount
  p2wda_pending_amount: number; // Pending P2WDA amount
  usd_value: string;          // USD value as string
}
```

### SupportedWallets

```typescript
enum SupportedWallets {
  OP_WALLET = 'OP_WALLET',  // Official OPNet wallet (recommended)
  UNISAT = 'UNISAT',        // Third-party wallet
}
```

## Supported Wallets

### OP_WALLET (Recommended)

The native OP_NET wallet with full feature support.

| Feature | Supported |
|---------|-----------|
| OPNet Official | Yes |
| MLDSA Signatures | Yes |
| Network Switching | Yes |
| Account Management | Yes |
| Transaction Signing | Yes |
| First-Party Support | Yes |

### UniSat

Popular Bitcoin wallet with partial OPNet support.

| Feature | Supported |
|---------|-----------|
| MLDSA Signatures | No |
| Network Switching | Yes |
| Account Management | Yes |
| Transaction Signing | Yes |

## Network Configuration

The library automatically configures OP_NET RPC providers:

| Chain Type | Network | RPC Endpoint |
|------------|---------|--------------|
| `BITCOIN_MAINNET` | mainnet | `https://mainnet.opnet.org` |
| `BITCOIN_TESTNET` | testnet | `https://testnet.opnet.org` |
| `BITCOIN_REGTEST` | regtest | `https://regtest.opnet.org` |

## Theme Customization

### Available Themes

| Theme | Description |
|-------|-------------|
| `light` | Light background with dark text |
| `dark` | Dark background with light text |
| `moto` | MotoSwap branded theme |

### CSS Classes

Override these classes for custom styling:

```css
.wallet-connect-modal-backdrop { }
.wallet-connect-modal { }
.wallet-connect-header { }
.wallet-list { }
.wallet-button { }
.wallet-icon { }
.wallet-connect-error { }
```

## MLDSA Signatures (OP_WALLET Only)

ML-DSA provides quantum-resistant cryptographic signatures.

### Check Support

```typescript
const { mldsaPublicKey, walletType } = useWalletConnect();
const hasMLDSASupport = walletType === 'OP_WALLET' && mldsaPublicKey !== null;
```

### Sign Message

```typescript
const { signMLDSAMessage, mldsaPublicKey } = useWalletConnect();

async function signMessage(message: string) {
  if (!mldsaPublicKey) {
    console.error('MLDSA not supported');
    return;
  }
  const signature = await signMLDSAMessage(message);
}
```

### Verify Signature

```typescript
const { verifyMLDSASignature } = useWalletConnect();

async function verify(message: string, signature: MLDSASignature) {
  const isValid = await verifyMLDSASignature(message, signature);
}
```

## Complete Example

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
    mldsaPublicKey,
    signMLDSAMessage,
  } = useWalletConnect();

  const installedWallets = allWallets.filter(w => w.isInstalled);
  const hasMLDSA = mldsaPublicKey !== null;

  if (connecting) {
    return <div>Connecting to wallet...</div>;
  }

  if (!walletAddress) {
    return (
      <div>
        <h2>Connect Your Wallet</h2>
        <button onClick={openConnectModal}>Choose Wallet</button>

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
      <p><strong>MLDSA Support:</strong> {hasMLDSA ? 'Yes' : 'No'}</p>

      {hasMLDSA && (
        <button onClick={() => signMLDSAMessage('Test message')}>
          Sign with MLDSA
        </button>
      )}

      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

## Migration from V1 to V2

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
      - address                     address
                                    publicKey
                                    walletAddress
      - network                     network
      - provider                    provider
                                    connecting
} = useWallet()                 } = useWalletConnect()
```

## Development

```bash
git clone https://github.com/btc-vision/walletconnect.git
cd walletconnect
npm install
npm run build        # Build for Node.js
npm run browserBuild # Build for browser
npm run setup        # Build both
npm run watch        # Development mode
npm run lint         # Linting
```

## License

This project is open source and available under the [Apache-2.0 License](LICENSE).
