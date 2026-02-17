# OPNet Builder

**The definitive AI development toolkit for building on Bitcoin Layer 1 with OP_NET.**

## What This Is

OPNet Builder is an AI persona that turns your coding assistant into an expert OPNet developer. It carries 3MB+ of documentation, templates, guidelines, and battle-tested patterns — everything needed to build smart contracts, frontends, backends, and plugins on Bitcoin Layer 1.

## What It Does

- **Scaffolds complete projects** — OP20 tokens, OP721 NFTs, React frontends, Node.js backends, node plugins
- **Enforces correct patterns** — SafeMath, CSV timelocks, verify-don't-custody, TypeScript Law
- **Audits your code** — OPNet-specific vulnerability detection including serialization mismatches, cache coherence, and Bitcoin-specific attack vectors
- **Knows the full API** — 151 documentation files covering every OPNet package, type, and interface
- **Ships production code** — lint, typecheck, build, and test verification built into the workflow

## Install

See [SETUP.md](SETUP.md) for installation instructions for Claude Code, Cursor, and Windsurf.

## Compatible With

| Platform | Status |
|----------|--------|
| Claude Code | Fully supported |
| Cursor | Fully supported |
| Windsurf | Fully supported |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/new-token` | Scaffold a complete OP20 token project (contract + tests + frontend) |
| `/new-nft` | Scaffold a complete OP721 NFT project (contract + tests + frontend) |
| `/audit` | Run a security audit against OPNet audit guidelines |
| `/deploy` | Build, lint, typecheck, test, and deploy workflow |

## Blueprints

| Blueprint | Description |
|-----------|-------------|
| `op20-token` | Complete OP20 fungible token — AssemblyScript contract, unit tests, React frontend |
| `op721-nft` | Complete OP721 NFT collection — AssemblyScript contract, unit tests, React frontend |
| `staking-contract` | OP20 staking with time-based rewards — contract, tests, React frontend |
| `swap-ui` | MotoSwap swap interface — React frontend connecting to the Router |
| `portfolio-tracker` | Multi-token portfolio dashboard — React frontend with balance tracking |

## What's Inside

```
opnet-builder/
├── persona.yaml          # Package metadata
├── PERSONA.md            # AI identity and behavioral rules
├── SETUP.md              # Installation instructions
├── commands/             # 4 slash commands
├── skills/
│   ├── SKILL.md          # Master orchestrator (mandatory reading lists, workflow rules)
│   ├── guidelines/       # 8 development guideline files
│   ├── docs/             # 153 API reference and documentation files
│   └── templates/        # 20 working code templates
├── memory/               # Project state tracking templates
├── examples/             # Sample interactions
└── blueprints/           # Project scaffolding blueprints
```

## Built With OPNet Builder

Real projects built using this toolkit:

| Project | What It Does | Stack |
|---------|-------------|-------|
| **OP_Scribe** | File proof-of-existence on Bitcoin L1 | Contract + IPFS backend + React frontend |
| **OpSea** | OP721 NFT marketplace (Magic Eden style) | Contract + React frontend |
| **opSwitch** | Dead man's switch for Bitcoin inheritance | Contract + React frontend |
| **Beacon Oracle** | Chainlink price feed relay to Bitcoin L1 | Contract + off-chain relayer + React frontend |
| **$SKIZO** | Bipolar memecoin with mood-based tokenomics | OP20 contract with custom mechanics |
| **OPNet Punks** | OP721 NFT collection | Contract + deploy script |

These were all built by community developers using the OPNet Builder skill in AI coding assistants.

## Key Features

- **TypeScript-only** — No raw JavaScript, ever. Strict mode enforced.
- **AssemblyScript contracts** — Compile to WebAssembly, run deterministically on Bitcoin L1
- **OP_WALLET integration** — ML-DSA quantum-resistant signatures, full OPNet support
- **hyper-express backends** — Fastest Node.js HTTP server, mandatory for all APIs
- **Comprehensive testing** — Unit test framework with Blockchain mocking
- **Security-first** — Audit checklists, vulnerability patterns, mandatory SafeMath

## Author

Danny Plainview

## License

MIT
