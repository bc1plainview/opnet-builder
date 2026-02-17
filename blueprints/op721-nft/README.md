# OP721 NFT Blueprint

A complete OP721 NFT collection project scaffold for Bitcoin Layer 1 with OP_NET.

## What You Get

| Component | Description |
|-----------|-------------|
| **Smart Contract** | AssemblyScript OP721 NFT with mint, transfer, metadata |
| **Unit Tests** | Full test suite with Blockchain mocking |
| **React Frontend** | Vite + TypeScript dApp with gallery view and OP_WALLET integration |

## Quick Start

1. Tell your AI assistant: "Use the op721-nft blueprint to create an NFT collection called [NAME] with symbol [SYMBOL] and max supply [NUMBER]"
2. The assistant will scaffold all three components using the correct templates and patterns
3. Verify with the build pipeline: `npm install && npm run lint && npm run typecheck && npm run build && npm run test`

## Project Structure

```
my-nft/
├── contract/
│   ├── assembly/
│   │   ├── index.ts              # Contract entry point
│   │   └── contracts/
│   │       └── MyNFT.ts          # OP721 NFT implementation
│   ├── asconfig.json             # AssemblyScript compiler config
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── MyNFT.test.ts             # NFT test suite
│   ├── setup.ts                  # Test configuration
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── App.tsx               # Main app component
    │   ├── main.tsx              # Entry point
    │   ├── abi/
    │   │   └── MyNFTABI.ts       # NFT ABI definition
    │   ├── hooks/
    │   │   ├── useWallet.ts      # Wallet connection hook
    │   │   └── useContract.ts    # Contract interaction hook
    │   └── components/
    │       ├── MintInterface.tsx  # Mint button + price display
    │       ├── NFTGallery.tsx    # Grid view of owned NFTs
    │       └── NFTCard.tsx       # Individual NFT display
    ├── vite.config.ts
    ├── package.json
    ├── tsconfig.json
    └── index.html
```

## Key Patterns

- **SafeMath** for token ID incrementing and supply checks
- **Verify-don't-custody** for paid minting — check payment in tx outputs
- **`onDeployment()`** for initialization
- **OP_WALLET** via `@btc-vision/opwallet`
- **Singleton provider** — one `JSONRpcProvider` per network
- **`bigint`** for all token IDs, mint prices, and satoshi values
- **Off-chain metadata** — store URI hashes on-chain, resolve content from IPFS
