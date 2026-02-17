# WalletConnect - Wallet Integration Guide

This guide is for developers who want to add support for new wallets to the WalletConnect library.

## Architecture Overview

```
src/
├── index.ts                    # Main exports
├── types.ts                    # Shared type definitions
├── context/
│   └── WalletConnectContext.ts # React context definition
├── provider/
│   └── WalletConnectProvider.tsx # Main provider component
├── hooks/
│   └── WalletConnectHook.tsx   # useWalletConnect hook
├── wallets/
│   ├── index.ts                # Wallet registration
│   ├── controller.ts           # WalletController singleton
│   ├── supported-wallets.ts    # SupportedWallets enum
│   ├── types.ts                # Wallet interfaces
│   ├── opwallet/               # OP_WALLET implementation (official)
│   │   ├── controller.ts
│   │   └── interface.ts
│   └── unisat/                 # UniSat implementation
│       ├── controller.ts
│       └── interface.ts
└── utils/
    ├── style.css               # Modal styles
    ├── theme.css               # Theme definitions
    └── accessibility/
        └── errorDecoder.ts     # Error message handling
```

## Official Wallet: OP_WALLET

**OP_WALLET is the main and official wallet supporting OPNet.** When adding new wallet support, OP_WALLET should be used as the reference implementation as it provides the most complete feature set including MLDSA quantum-resistant signatures.

## WalletBase Interface

All wallet implementations must implement the `WalletBase` interface:

```typescript
interface WalletBase {
  // Connection state
  isInstalled(): boolean;
  isConnected(): boolean;
  canAutoConnect(): Promise<boolean>;

  // Wallet instance
  getWalletInstance(): Unisat | null;
  getProvider(): Promise<AbstractRpcProvider | null>;
  getSigner(): Promise<UnisatSigner | null>;

  // Connection lifecycle
  connect(): Promise<string[] | undefined>;
  disconnect(): Promise<void>;

  // Account info
  getPublicKey(): Promise<string | null>;
  getNetwork(): Promise<UnisatChainType>;
  getChainId(): void;

  // Event hooks
  setAccountsChangedHook(fn: (accounts: string[]) => void): void;
  removeAccountsChangedHook(): void;
  setDisconnectHook(fn: () => void): void;
  removeDisconnectHook(): void;
  setChainChangedHook(fn: (network: UnisatChainType) => void): void;
  removeChainChangedHook(): void;

  // MLDSA (quantum-resistant signatures) - OP_WALLET reference
  getMLDSAPublicKey(): Promise<string | null>;
  getHashedMLDSAKey(): Promise<string | null>;
  signMLDSAMessage(message: string): Promise<MLDSASignature | null>;
  verifyMLDSASignature(message: string, signature: MLDSASignature): Promise<boolean>;
}
```

## Adding a New Wallet

### Step 1: Create Wallet Directory

```bash
mkdir src/wallets/mywallet
touch src/wallets/mywallet/controller.ts
touch src/wallets/mywallet/interface.ts
```

### Step 2: Define the Interface

Create `interface.ts` with your wallet's browser API types:

```typescript
// src/wallets/mywallet/interface.ts
import type { Unisat, UnisatChainInfo } from '@btc-vision/transaction';

export interface MyWalletInterface extends Unisat {
  // Standard methods (inherited from Unisat)
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  getChain(): Promise<UnisatChainInfo>;
  disconnect(): Promise<void>;
  getBalance(): Promise<object>;
  signMessage(message: string): Promise<string>;
  signPsbt(psbtHex: string): Promise<string>;

  // Event methods
  on(event: 'accountsChanged', callback: (accounts: string[]) => void): void;
  on(event: 'chainChanged', callback: (chain: UnisatChainInfo) => void): void;
  on(event: 'disconnect', callback: () => void): void;
  removeListener(event: string, callback: Function): void;

  // Custom methods specific to your wallet
  customMethod?(): Promise<string>;
}

// Export wallet icon as base64 or data URL
export const logo = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...';
```

### Step 3: Implement the Controller

Create `controller.ts` implementing `WalletBase`:

```typescript
// src/wallets/mywallet/controller.ts
import { networks } from '@btc-vision/bitcoin';
import {
  type MLDSASignature,
  type Unisat,
  type UnisatChainInfo,
  UnisatChainType,
  UnisatSigner,
} from '@btc-vision/transaction';
import { AbstractRpcProvider, JSONRpcProvider } from 'opnet';
import { type WalletBase } from '../types';
import { type MyWalletInterface } from './interface';

interface MyWalletWindow extends Window {
  myWallet?: MyWalletInterface;
}

const notInstalledError = 'MY_WALLET is not installed';

class MyWallet implements WalletBase {
  private walletBase: MyWalletWindow['myWallet'];
  private accountsChangedHookWrapper?: (accounts: Array<string>) => void;
  private chainChangedHookWrapper?: (network: UnisatChainInfo) => void;
  private disconnectHookWrapper?: () => void;
  private _isConnected: boolean = false;

  isInstalled(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    this.walletBase = (window as unknown as MyWalletWindow).myWallet;
    return !!this.walletBase;
  }

  isConnected(): boolean {
    return !!this.walletBase && this._isConnected;
  }

  async canAutoConnect(): Promise<boolean> {
    const accounts = (await this.walletBase?.getAccounts()) || [];
    return accounts.length > 0;
  }

  getWalletInstance(): Unisat | null {
    return (this._isConnected && this.walletBase) || null;
  }

  async getProvider(): Promise<AbstractRpcProvider | null> {
    if (!this._isConnected || !this.walletBase) return null;

    const chain = await this.walletBase.getChain();
    switch (chain.enum) {
      case UnisatChainType.BITCOIN_MAINNET:
        return new JSONRpcProvider('https://mainnet.opnet.org', networks.bitcoin);
      case UnisatChainType.BITCOIN_TESTNET:
        return new JSONRpcProvider('https://testnet.opnet.org', networks.testnet);
      case UnisatChainType.BITCOIN_REGTEST:
        return new JSONRpcProvider('https://regtest.opnet.org', networks.regtest);
      default:
        return null;
    }
  }

  async getSigner(): Promise<UnisatSigner | null> {
    const signer = new UnisatSigner();
    await signer.init();
    return signer;
  }

  getChainId(): void {
    throw new Error('Method not implemented.');
  }

  async connect(): Promise<string[]> {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    return this.walletBase.requestAccounts().then((accounts: string[]) => {
      this._isConnected = accounts.length > 0;
      return accounts;
    });
  }

  async disconnect(): Promise<void> {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    return this._isConnected
      ? await this.walletBase.disconnect().then(() => {
          this._isConnected = false;
        })
      : undefined;
  }

  async getPublicKey(): Promise<string> {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    return this.walletBase.getPublicKey();
  }

  async getNetwork(): Promise<UnisatChainType> {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    const chainInfo = await this.walletBase.getChain();
    return chainInfo?.enum || UnisatChainType.BITCOIN_MAINNET;
  }

  setAccountsChangedHook(fn: (accounts: string[]) => void): void {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }

    this.accountsChangedHookWrapper = (accounts: string[]) => {
      if (accounts.length > 0) {
        fn(accounts);
      } else {
        this._isConnected = false;
        this.disconnectHookWrapper?.();
      }
    };

    this.walletBase.on('accountsChanged', this.accountsChangedHookWrapper);
  }

  removeAccountsChangedHook(): void {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    if (this.accountsChangedHookWrapper) {
      this.walletBase.removeListener('accountsChanged', this.accountsChangedHookWrapper);
      this.accountsChangedHookWrapper = undefined;
    }
  }

  setDisconnectHook(fn: () => void): void {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    this.disconnectHookWrapper = fn;
    this.walletBase.on('disconnect', this.disconnectHookWrapper);
  }

  removeDisconnectHook(): void {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    if (this.disconnectHookWrapper) {
      this.walletBase.removeListener('disconnect', this.disconnectHookWrapper);
      this.disconnectHookWrapper = undefined;
    }
  }

  setChainChangedHook(fn: (chainType: UnisatChainType) => void): void {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    this.chainChangedHookWrapper = (chainInfo: UnisatChainInfo) => {
      fn(chainInfo.enum);
    };
    this.walletBase.on('chainChanged', this.chainChangedHookWrapper);
  }

  removeChainChangedHook(): void {
    if (!this.isInstalled() || !this.walletBase) {
      throw new Error(notInstalledError);
    }
    if (this.chainChangedHookWrapper) {
      this.walletBase.removeListener('chainChanged', this.chainChangedHookWrapper);
      this.chainChangedHookWrapper = undefined;
    }
  }

  // MLDSA methods - implement if your wallet supports quantum-resistant signatures
  // See OP_WALLET implementation for reference
  async getMLDSAPublicKey(): Promise<string | null> {
    return null; // Return null if not supported
  }

  async getHashedMLDSAKey(): Promise<string | null> {
    return null;
  }

  async signMLDSAMessage(_message: string): Promise<MLDSASignature | null> {
    return null;
  }

  async verifyMLDSASignature(_message: string, _signature: MLDSASignature): Promise<boolean> {
    return false;
  }
}

export default MyWallet;
```

### Step 4: Add to SupportedWallets Enum

Update `src/wallets/supported-wallets.ts`:

```typescript
export enum SupportedWallets {
  OP_WALLET = 'OP_WALLET',  // Official wallet - reference implementation
  UNISAT = 'UNISAT',
  MY_WALLET = 'MY_WALLET',  // Add your wallet
}
```

### Step 5: Register the Wallet

Update `src/wallets/index.ts`:

```typescript
import { WalletController } from './controller';
import OPWallet from './opwallet/controller';
import { logo as OPWalletLogo } from './opwallet/interface';
import { SupportedWallets } from './supported-wallets';
import UniSatWallet from './unisat/controller';
import { logo as UnisatLogo } from './unisat/interface';
import MyWallet from './mywallet/controller';
import { logo as MyWalletLogo } from './mywallet/interface';

// OP_WALLET is registered first as the official wallet
WalletController.registerWallet({
  name: SupportedWallets.OP_WALLET,
  icon: OPWalletLogo,
  controller: new OPWallet(),
});

WalletController.registerWallet({
  name: SupportedWallets.UNISAT,
  icon: UnisatLogo,
  controller: new UniSatWallet(),
});

WalletController.registerWallet({
  name: SupportedWallets.MY_WALLET,
  icon: MyWalletLogo,
  controller: new MyWallet(),
});

export { WalletController, SupportedWallets };
```

## Event Handling Requirements

Wallets must properly handle these events:

### accountsChanged

Triggered when the user switches accounts in the wallet.

- Update the connected account
- Trigger disconnect if no accounts remain

### chainChanged

Triggered when the user switches networks.

- Update the network state
- Reconfigure providers if needed

### disconnect

Triggered when the wallet disconnects.

- Clean up state
- Remove all event listeners

## MLDSA Support

ML-DSA (Module-Lattice Digital Signature Algorithm) provides quantum-resistant signatures.

**OP_WALLET is the only wallet currently supporting MLDSA.** If your wallet supports MLDSA:

1. Implement `getMLDSAPublicKey()` to return the raw ML-DSA public key (~2500 bytes, 0x hex). This is the full-size key used for signing/verification.
2. Implement `getHashedMLDSAKey()` to return the 32-byte SHA256 hash of the ML-DSA public key (0x hex). **This is the value used as the first parameter of `Address.fromString()`** — NOT the raw key.
3. Implement `signMLDSAMessage()` for signing
4. Implement `verifyMLDSASignature()` for verification

**IMPORTANT:** `getMLDSAPublicKey()` returns the raw key (~2500 bytes). `getHashedMLDSAKey()` returns the 32-byte hash. For `Address.fromString(hashedMLDSAKey, bitcoinPubKey)`, always use the **hashed** key, never the raw key.

Reference the OP_WALLET implementation at `src/wallets/opwallet/controller.ts` for the complete MLDSA implementation.

## Testing Your Wallet

1. Build the library: `npm run build`
2. Link locally: `npm link`
3. In a test project: `npm link @btc-vision/walletconnect`
4. Test:
   - Connection and disconnection
   - Account switching
   - Network changes
   - Balance retrieval
   - MLDSA signatures (if supported)

## Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Run `npm run lint` before committing
- Check for circular dependencies: `npm run check:circular`

## Wallet Comparison Table

When adding a wallet, document its capabilities:

| Feature | OP_WALLET | UniSat | Your Wallet |
|---------|-----------|--------|-------------|
| OPNet Official | Yes | No | ? |
| MLDSA Signatures | Yes | No | ? |
| Network Switching | Yes | Yes | ? |
| Account Management | Yes | Yes | ? |
| Transaction Signing | Yes | Yes | ? |
| First-Party Support | Yes | No | ? |
