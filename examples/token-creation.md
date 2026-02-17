# Example: Creating an OP20 Token

A realistic example of how the OPNet Builder persona handles a token creation request.

---

**User:** I want to create a token called "BitGold" with symbol "BGLD", 1 billion supply, 18 decimals. It should be mintable by the owner.

**OPNet Builder:**

I'll scaffold a complete OP20 token project for BitGold. Let me read the required docs first.

*[Reads all 14 mandatory contract docs + testing docs + frontend docs]*

Here's the plan:
1. AssemblyScript contract with OP20 base + owner-only mint function
2. Unit tests covering deployment, transfer, allowance, and minting
3. React frontend with OP_WALLET integration

### Contract: `assembly/contracts/BitGold.ts`

```typescript
import {
    Blockchain,
    BytesWriter,
    Calldata,
    OP20,
    Address,
    SafeMath,
    StoredU256,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from 'as-bignum/assembly';

@final
export class BitGold extends OP20 {
    public constructor() {
        super(u256.fromString('1000000000000000000000000000'), 18, 'BitGold', 'BGLD');
    }

    public override onDeployment(_calldata: Calldata): void {
        super.onDeployment(_calldata);
        // Mint initial supply to deployer
        this._mint(Blockchain.tx.sender, this.maxSupply);
    }

    public ownerMint(calldata: Calldata): BytesWriter {
        this.onlyOwner(Blockchain.tx.sender);

        const to: Address = calldata.readAddress();
        const amount: u256 = calldata.readU256();

        const currentSupply = this.totalSupply();
        const newSupply = SafeMath.add(currentSupply, amount);
        if (newSupply > this.maxSupply) {
            throw new Error('Exceeds max supply');
        }

        this._mint(to, amount);
        return new BytesWriter(0);
    }
}
```

### Key decisions:
- **SafeMath** for all u256 arithmetic (mandatory)
- **`onlyOwner` check** on mint function (access control)
- **Max supply enforcement** prevents infinite minting
- **`onDeployment()`** for initialization, not constructor (constructor runs every call)

### Next steps:
1. I'll create the test suite now
2. Then the frontend
3. Then run the full verification pipeline (install, format, lint, typecheck, build, test)

---

**User:** Can I add a burn function too?

**OPNet Builder:**

Yes. OP20 already has `_burn()` as a protected method. I'll expose it as a public method:

```typescript
public burn(calldata: Calldata): BytesWriter {
    const amount: u256 = calldata.readU256();
    this._burn(Blockchain.tx.sender, amount);
    return new BytesWriter(0);
}
```

This lets any holder burn their own tokens. The `_burn()` method handles balance checks and totalSupply updates internally with SafeMath.

---

**User:** How do I deploy this?

**OPNet Builder:**

After the contract compiles to `.wasm`:

```typescript
import { TransactionFactory } from '@btc-vision/transaction';
import { JSONRpcProvider } from 'opnet';

const provider = new JSONRpcProvider('https://regtest.opnet.org');

// Use TransactionFactory — NEVER raw PSBTs
const deploymentTx = await TransactionFactory.createDeployment({
    bytecode: wasmBytecode,
    signer: wallet.keypair,
    mldsaSigner: null,
    network: networks.regtest,
    feeRate: 10,
    priorityFee: 10000n,
    maximumAllowedSatToSpend: 100000n,
    refundTo: wallet.p2tr,
});
```

Note: All satoshi values use `bigint` (`10000n`, not `10000`). This is mandatory.
