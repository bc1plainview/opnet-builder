# OPNet Builder Persona

A battle-tested AI persona for building on OPNet — Bitcoin L1 smart contracts, tokens, NFTs, DEX pools, and full-stack dApps.

## What This Is

This is NOT documentation. It's an **operating identity** for AI agents. Load this persona and the agent becomes a competent OPNet developer who:

- Writes working AssemblyScript smart contracts
- Builds React frontends with WalletConnect
- Deploys to regtest and mainnet
- Knows every gotcha, bug, and workaround from 10+ real deployments
- Warns about footguns BEFORE you hit them

## Installation

### For personas.sh
```bash
personas install bob-persona
```

### Manual Installation
Copy this directory to your AI agent's context/persona directory. Load `PERSONA.md` as the primary identity file.

### For Cursor / Claude Projects
1. Copy all files into your project's `.cursor/` or context directory
2. Reference `PERSONA.md` in your system prompt or rules file
3. The agent will automatically pick up patterns and blueprints

### For ChatGPT Custom Instructions
Copy the contents of `PERSONA.md` and `memory/patterns.md` into your custom instructions. Add specific blueprints as needed for the task.

## File Structure

```
PERSONA.md                    — Core identity, rules, communication style
README.md                     — This file

memory/
  patterns.md                 — Hard-won development patterns (35+ gotchas)
  bugs.md                     — Known bugs with workarounds (18+ entries)

blueprints/
  op20-token.md               — Build and deploy an OP20 fungible token
  frontend-dapp.md            — React frontend with WalletConnect
  nativeswap-pool.md          — Create a NativeSwap liquidity pool
  op721-nft.md                — Build an OP721 NFT collection

docs/
  architecture.md             — OPNet architecture (consensus, epochs, verify-don't-custody)
  contract-patterns.md        — Smart contract patterns (storage, SafeMath, events, selectors)
  wallet-integration.md       — Wallet integration (OPWallet, WalletConnect, signing)
  deployment.md               — Deployment guide (regtest, mainnet, IPFS, .btc domains)
```

## What Makes This Different

Most AI coding assistants generate **plausible-looking** code. This persona generates **working** code because it encodes:

1. **Exact package versions** — `opnet@1.8.1-beta.13`, not "latest"
2. **Constructor signatures** — `StoredU256(pointer, EMPTY_POINTER)`, not `StoredU256(pointer, u256.Zero)`
3. **API quirks** — `increaseAllowance()` not `approve()`, `response.result` not `response.txid`
4. **Mandatory CSS fixes** — WalletConnect modal positioning
5. **Library substitutions** — `@btc-vision/bitcoin` not `bitcoinjs-lib`
6. **Signing rules** — `null` on frontend, actual keypairs on backend
7. **Storage gotchas** — unique pointers, field-level initialization, EMPTY_POINTER
8. **Transaction sequencing** — approve must confirm before pool creation
9. **BigInt limitations** — `Number()` for getBlock, `fromString()` for large u256
10. **18 documented bugs** with exact workarounds

## Quick Reference — Top 10 Gotchas

| # | Gotcha | Fix |
|---|--------|-----|
| 1 | StoredU256 subPointer | Use `EMPTY_POINTER`, not `u256.Zero` |
| 2 | StoredAddress params | 1 param only `(pointer)`, no default |
| 3 | ABIDataTypes in contracts | Globally injected, never import |
| 4 | OP20 allowance | `increaseAllowance()`, not `approve()` |
| 5 | getBlock() BigInt | Convert to `Number()` first |
| 6 | Frontend signing | `signer: null, mldsaSigner: null` |
| 7 | WalletConnect modal | Add CSS fix (position: fixed overlay) |
| 8 | Package imports | `@btc-vision/bitcoin`, never `bitcoinjs-lib` |
| 9 | UTXO queries | Always `optimize: false` |
| 10 | u256 big numbers | `u256.fromString()`, not `fromU64()` |

## Tech Stack

- **Smart Contracts:** AssemblyScript → WebAssembly (via @btc-vision/assemblyscript)
- **Runtime:** @btc-vision/btc-runtime
- **Frontend:** React + TypeScript + opnet + @btc-vision/walletconnect
- **Backend:** hyper-express + opnet + @btc-vision/transaction
- **Network:** Bitcoin L1 via OPNet consensus layer
- **RPC:** JSONRpcProvider from opnet package

## Package Versions (Mandatory)

```
opnet: 1.8.1-beta.13
@btc-vision/transaction: 1.8.0-beta.10
@btc-vision/bitcoin: 7.0.0-alpha.11
@btc-vision/walletconnect: latest
```

## RPC Endpoints

- **Regtest:** https://regtest.opnet.org
- **Mainnet:** https://mainnet.opnet.org

## License

This persona package is provided as-is for AI agent configuration. Use it to build on OPNet.
