# Blueprint: Build and Deploy an OP20 Token

End-to-end guide to creating a fungible token on OPNet (Bitcoin L1).

---

## Prerequisites

- Node.js 20+
- OPNet CLI installed (`node /root/opnet-cli/build/index.js`)
- Wallet with BTC for deployment (regtest: use faucet)

---

## Step 1: Scaffold the Project

```bash
node /root/opnet-cli/build/index.js init my-token
cd my-token
```

This creates an AssemblyScript contract project with the `@btc-vision/assemblyscript` compiler fork and the `@btc-vision/btc-runtime` package.

---

## Step 2: Define Storage Pointers

Create or edit your token contract. Storage pointers MUST be unique.

```typescript
// src/contracts/MyToken.ts

import { u256 } from 'as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    OP20,
    Selector,
    StoredU256,
    StoredString,
    StoredBoolean,
    StoredAddress,
} from '@btc-vision/btc-runtime/runtime';
import { EMPTY_POINTER } from '@btc-vision/btc-runtime/runtime/math/bytes';

// Unique storage pointers — NEVER duplicate these
const TOTAL_SUPPLY_POINTER: u16 = 0;
const MAX_SUPPLY_POINTER: u16 = 1;
const DECIMALS_POINTER: u16 = 2;
const NAME_POINTER: u16 = 3;
const SYMBOL_POINTER: u16 = 4;
const OWNER_POINTER: u16 = 5;
const INITIALIZED_POINTER: u16 = 6;
```

---

## Step 3: Implement the Token Contract

```typescript
export class MyToken extends OP20 {
    // Initialize at DECLARATION — not in constructor (TS2564 fix)
    protected _totalSupply: StoredU256 = new StoredU256(TOTAL_SUPPLY_POINTER, EMPTY_POINTER);
    protected _maxSupply: StoredU256 = new StoredU256(MAX_SUPPLY_POINTER, EMPTY_POINTER);
    protected _owner: StoredAddress = new StoredAddress(OWNER_POINTER);
    protected _initialized: StoredBoolean = new StoredBoolean(INITIALIZED_POINTER, false);

    constructor() {
        super();
        // Constructor runs EVERY interaction
        // Only set up storage references here — no initialization logic
    }

    // One-time deployment logic
    public override onDeployment(calldata: Calldata): void {
        // Guard against regtest calldata bug (BUG-002)
        const maxSupply = u256.fromString('21000000000000000000000000'); // 21M with 18 decimals
        const decimals: u8 = 18;

        this._maxSupply.set(maxSupply);
        this._owner.set(Blockchain.tx.sender);
        this._initialized.set(true);

        // Mint initial supply to deployer
        const initialSupply = u256.fromString('10000000000000000000000000'); // 10M
        this._mint(Blockchain.tx.sender, initialSupply);
    }

    // MANDATORY for upgradeability
    public override onUpdate(calldata: Calldata): void {
        // Only owner can upgrade
        this.onlyOwner(Blockchain.tx.sender);
    }

    // Override decimals
    public override get decimals(): u8 {
        return 18;
    }

    public override get name(): string {
        return 'My Token';
    }

    public override get symbol(): string {
        return 'MTK';
    }

    // Custom: mint function (owner only)
    public mint(to: Address, amount: u256): void {
        this.onlyOwner(Blockchain.tx.sender);

        const currentSupply = this._totalSupply.get();
        const maxSupply = this._maxSupply.get();

        // SafeMath — MANDATORY
        const newSupply = SafeMath.add(currentSupply, amount);
        if (u256.gt(newSupply, maxSupply)) {
            throw new Error('Exceeds max supply');
        }

        this._mint(to, amount);
    }

    private onlyOwner(caller: Address): void {
        if (!caller.equals(this._owner.get())) {
            throw new Error('Not owner');
        }
    }

    // Register custom selectors
    public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('mint'):
                const to = calldata.readAddress();
                const amount = calldata.readU256();
                this.mint(to, amount);
                return new BytesWriter(1);
            default:
                return super.callMethod(method, calldata);
        }
    }
}
```

---

## Step 4: Compile

```bash
node /root/opnet-cli/build/index.js compile
```

This produces a `.opnet` binary in the `build/` directory.

---

## Step 5: Deploy to Regtest

```bash
# Login to regtest
node /root/opnet-cli/build/index.js login --network regtest

# Deploy
node /root/opnet-cli/build/index.js deploy build/MyToken.opnet --network regtest
```

Or deploy programmatically (see `docs/deployment.md` for the full script).

---

## Step 6: Verify Deployment

```typescript
import { JSONRpcProvider, getContract, IOP20Contract, OP_20_ABI } from 'opnet';
import { networks, Address } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider('https://regtest.opnet.org', networks.regtest);

const contract = getContract<IOP20Contract>(
    Address.fromString(contractAddress),
    OP_20_ABI,
    provider,
    networks.regtest,
    Address.fromString(myAddress)
);

// Read name, symbol, totalSupply
const name = await contract.name();
console.log('Name:', name);

const totalSupply = await contract.totalSupply();
console.log('Total Supply:', totalSupply.toString());

await provider.close();
```

---

## Critical Reminders

1. **SafeMath for ALL u256 operations** — raw arithmetic is a critical bug
2. **Initialize StoredU256 at declaration** — not in constructor body
3. **StoredU256 subPointer = EMPTY_POINTER** — not u256.Zero
4. **StoredAddress takes 1 param** — no default value
5. **onDeployment() for init** — constructor runs every call
6. **onUpdate() is mandatory** — even if empty
7. **Unique pointers** — collision = silent corruption
8. **u256.fromString() for big numbers** — fromU64 overflows silently
9. **ABIDataTypes is global in contracts** — never import it in AssemblyScript
10. **increaseAllowance(), not approve()** — OP20 design choice
