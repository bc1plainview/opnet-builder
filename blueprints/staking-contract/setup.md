# Staking Contract Blueprint — Setup

Scaffold a complete staking contract where users lock OP20 tokens to earn rewards over time.

## What You Get
- AssemblyScript staking contract with:
  - `stake(amount)` — lock tokens
  - `unstake(amount)` — withdraw tokens + rewards
  - `claimRewards()` — claim without unstaking
  - `getStakerInfo(address)` — view staked amount and pending rewards
- Reward calculation based on time staked and pool share
- SafeMath for all arithmetic
- Unit tests
- React frontend with stake/unstake/claim UI

## Setup
1. Create a new directory for your project
2. Ask the AI: "Scaffold a staking contract using the staking-contract blueprint"
3. The AI will read the required docs and generate the full project

## Required Docs (AI reads these automatically)
- All contract docs (see SKILL.md contract section)
- OP20 token docs (staking contract wraps an OP20)
- Frontend docs (for the UI)
