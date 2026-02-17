# Blueprint: Build and Deploy an OP721 NFT Collection

End-to-end guide to creating a non-fungible token collection on OPNet (Bitcoin L1).

---

## Overview

OP721 is OPNet's NFT standard. Key differences from ERC-721:
- **Reservation-based minting** — users reserve a mint slot, then claim
- **AssemblyScript contracts** compiled to WebAssembly
- **Bitcoin L1** — not a sidechain, costs real BTC for transactions
- **No ECDSA in contract VM** — use ML-DSA for signature verification
- **Verify-don't-custody** — contract tracks ownership, doesn't hold assets

---

## Prerequisites

- Node.js 20+
- OPNet CLI installed
- Wallet with BTC for deployment

---

## Step 1: Scaffold the Project

```bash
node /root/opnet-cli/build/index.js init my-nft
cd my-nft
```

---

## Step 2: Define Storage Pointers

```typescript
// src/contracts/MyNFT.ts

import { u256 } from 'as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    OP721,
    Selector,
    StoredU256,
    StoredAddress,
    StoredBoolean,
    StoredString,
    AddressMap,
} from '@btc-vision/btc-runtime/runtime';
import { EMPTY_POINTER } from '@btc-vision/btc-runtime/runtime/math/bytes';

// Unique storage pointers
const TOTAL_SUPPLY_POINTER: u16 = 0;
const MAX_SUPPLY_POINTER: u16 = 1;
const NEXT_TOKEN_ID_POINTER: u16 = 2;
const OWNER_POINTER: u16 = 3;
const BASE_URI_POINTER: u16 = 4;
const MINT_PRICE_POINTER: u16 = 5;
const MINT_ACTIVE_POINTER: u16 = 6;
// Token ownership map starts at pointer 100
const OWNERS_MAP_POINTER: u16 = 100;
```

---

## Step 3: Implement the NFT Contract

```typescript
export class MyNFT extends OP721 {
    // Initialize at DECLARATION (TS2564 fix)
    protected _totalSupply: StoredU256 = new StoredU256(TOTAL_SUPPLY_POINTER, EMPTY_POINTER);
    protected _maxSupply: StoredU256 = new StoredU256(MAX_SUPPLY_POINTER, EMPTY_POINTER);
    protected _nextTokenId: StoredU256 = new StoredU256(NEXT_TOKEN_ID_POINTER, EMPTY_POINTER);
    protected _owner: StoredAddress = new StoredAddress(OWNER_POINTER);
    protected _mintActive: StoredBoolean = new StoredBoolean(MINT_ACTIVE_POINTER, false);
    protected _mintPrice: StoredU256 = new StoredU256(MINT_PRICE_POINTER, EMPTY_POINTER);

    constructor() {
        super();
        // Only storage setup — no initialization logic
    }

    public override onDeployment(calldata: Calldata): void {
        const maxSupply = u256.fromString('10000'); // 10k collection
        this._maxSupply.set(maxSupply);
        this._nextTokenId.set(u256.One);
        this._owner.set(Blockchain.tx.sender);
        this._mintActive.set(false);
        
        // Mint price in satoshis (e.g., 10000 sats = 0.0001 BTC)
        this._mintPrice.set(u256.fromString('10000'));
    }

    // MANDATORY for upgradeability
    public override onUpdate(calldata: Calldata): void {
        this.onlyOwner(Blockchain.tx.sender);
    }

    public override get name(): string {
        return 'My NFT Collection';
    }

    public override get symbol(): string {
        return 'MNFT';
    }

    // Reservation-based minting
    public mint(to: Address): u256 {
        // Check mint is active
        if (!this._mintActive.get()) {
            throw new Error('Minting is not active');
        }

        // Check supply
        const currentSupply = this._totalSupply.get();
        const maxSupply = this._maxSupply.get();
        if (u256.ge(currentSupply, maxSupply)) {
            throw new Error('Max supply reached');
        }

        // Get next token ID
        const tokenId = this._nextTokenId.get();

        // Mint the token
        this._mint(to, tokenId);

        // Update state — SafeMath mandatory
        this._totalSupply.set(SafeMath.add(currentSupply, u256.One));
        this._nextTokenId.set(SafeMath.add(tokenId, u256.One));

        return tokenId;
    }

    // Owner functions
    public setMintActive(active: bool): void {
        this.onlyOwner(Blockchain.tx.sender);
        this._mintActive.set(active);
    }

    public setMintPrice(price: u256): void {
        this.onlyOwner(Blockchain.tx.sender);
        this._mintPrice.set(price);
    }

    private onlyOwner(caller: Address): void {
        if (!caller.equals(this._owner.get())) {
            throw new Error('Not owner');
        }
    }

    // Register selectors
    public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('mint'): {
                const to = calldata.readAddress();
                const tokenId = this.mint(to);
                const writer = new BytesWriter(32);
                writer.writeU256(tokenId);
                return writer;
            }
            case encodeSelector('setMintActive'): {
                const active = calldata.readBoolean();
                this.setMintActive(active);
                return new BytesWriter(1);
            }
            case encodeSelector('setMintPrice'): {
                const price = calldata.readU256();
                this.setMintPrice(price);
                return new BytesWriter(1);
            }
            default:
                return super.callMethod(method, calldata);
        }
    }
}
```

---

## Step 4: Compile and Deploy

```bash
# Compile
node /root/opnet-cli/build/index.js compile

# Deploy to regtest
node /root/opnet-cli/build/index.js login --network regtest
node /root/opnet-cli/build/index.js deploy build/MyNFT.opnet --network regtest
```

---

## Step 5: Frontend Minting

```typescript
import { getContract, JSONRpcProvider, BitcoinInterfaceAbi } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';
import { Address, networks } from '@btc-vision/bitcoin';

// Custom ABI for the NFT contract
const MY_NFT_ABI: BitcoinInterfaceAbi = [
    {
        name: 'mint',
        inputs: [
            { name: 'to', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [
            { name: 'tokenId', type: ABIDataTypes.UINT256 },
        ],
        type: 'function',
    },
    {
        name: 'setMintActive',
        inputs: [
            { name: 'active', type: ABIDataTypes.BOOL },
        ],
        outputs: [],
        type: 'function',
    },
    {
        name: 'totalSupply',
        inputs: [],
        outputs: [
            { name: 'supply', type: ABIDataTypes.UINT256 },
        ],
        type: 'function',
    },
];

// Get contract instance (5 params)
const provider = new JSONRpcProvider('https://mainnet.opnet.org', networks.bitcoin);

const nft = getContract<any>(
    Address.fromString(nftContractAddress),
    MY_NFT_ABI,
    provider,
    networks.bitcoin,
    Address.fromString(userAddress)
);

// Simulate mint
const mintSim = await nft.mint(Address.fromString(userAddress));

if ('error' in mintSim) {
    throw new Error(`Mint simulation failed: ${mintSim.error}`);
}

// Send — null signers on frontend
const receipt = await mintSim.sendTransaction({
    signer: null,
    mldsaSigner: null,
    refundTo: userAddress,
});

console.log('Minted! TX:', receipt);
```

---

## Step 6: Read NFT Data

```typescript
// Get total supply
const totalSupply = await nft.totalSupply();
console.log('Minted:', totalSupply.toString());

// Get owner of token
const owner = await nft.ownerOf(tokenId);
console.log('Owner:', owner.toString());

// Get user's NFTs (if contract supports enumeration)
const balance = await nft.balanceOf(Address.fromString(userAddress));
console.log('User owns:', balance.toString(), 'NFTs');
```

---

## Critical Reminders

1. **Reservation-based minting** — OP721 uses reservations, not direct mints like ERC-721
2. **SafeMath for ALL u256 operations** — even simple increment
3. **StoredU256 at declaration** — not in constructor body
4. **EMPTY_POINTER for subPointer** — not u256.Zero
5. **Unique storage pointers** — map pointers need their own range
6. **onDeployment() for init** — constructor runs every call
7. **onUpdate() mandatory** — for upgradeability
8. **No while loops** — bounded for loops only
9. **Selectors use SHA-256** — not keccak-256
10. **No ECDSA in contract VM** — use ML-DSA for signature verification
