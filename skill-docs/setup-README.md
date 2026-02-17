# OPNet Project Setup Templates

This folder contains shared configuration templates for OPNet projects. Copy the relevant files to your project root.

## Configuration Files

| File | Use For | Copy To |
|------|---------|---------|
| `.prettierrc` | All OPNet projects | Project root |
| `eslint-contract.json` | Smart contracts (btc-runtime) | `.eslintrc.json` |
| `eslint-generic.json` | TypeScript libs (opnet, transaction) | `.eslintrc.json` |
| `eslint-react.json` | React/Next.js frontends | `.eslintrc.json` |
| `tsconfig-generic.json` | TypeScript projects (NOT contracts) | `tsconfig.json` |
| `asconfig.json` | AssemblyScript contracts | Project root |

## Quick Setup

### Smart Contract Project (btc-runtime)

```bash
cp setup/.prettierrc .prettierrc
cp setup/eslint-contract.json .eslintrc.json
cp setup/asconfig.json asconfig.json
```

### TypeScript Library (opnet, transaction, bitcoin)

```bash
cp setup/.prettierrc .prettierrc
cp setup/eslint-generic.json .eslintrc.json
cp setup/tsconfig-generic.json tsconfig.json
```

### React/Next.js Frontend (motoswap-ui)

```bash
cp setup/.prettierrc .prettierrc
cp setup/eslint-react.json .eslintrc.json
```

## Notes

- **Contracts**: Use `asconfig.json` for AssemblyScript. Do NOT use `tsconfig-generic.json` for contracts.
- **ESLint**: Rename the eslint file to `.eslintrc.json` when copying.
- **All configs**: Use ESNext target and strict TypeScript settings.
