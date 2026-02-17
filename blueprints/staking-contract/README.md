# Staking Contract Blueprint

Scaffold a complete staking contract on Bitcoin Layer 1 with OP_NET.

## What You Get

| Component | Description |
|-----------|-------------|
| **Smart Contract** | AssemblyScript staking contract with stake, unstake, claimRewards, getStakerInfo |
| **Unit Tests** | Full test suite with Blockchain mocking |
| **React Frontend** | Vite + TypeScript dApp with stake/unstake/claim UI and OP_WALLET integration |

## Features
- `stake(amount)` — lock OP20 tokens
- `unstake(amount)` — withdraw tokens + earned rewards
- `claimRewards()` — claim rewards without unstaking
- `getStakerInfo(address)` — view staked amount and pending rewards
- Reward calculation based on time staked and pool share
- SafeMath for all arithmetic
