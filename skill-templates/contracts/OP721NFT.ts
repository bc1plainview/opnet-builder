import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    OP721,
    OP721InitParameters,
    Revert,
    SafeMath,
    StoredBoolean,
    StoredString,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';

const treasuryAddressPointer: u16 = Blockchain.nextPointer;
const mintEnabledPointer: u16 = Blockchain.nextPointer;

/**
 * OP721NFT - A complete OP721 non-fungible token implementation
 *
 * Features:
 * - Standard OP721 interface (ownerOf, balanceOf, transfer, approve, etc.)
 * - Minting with access control
 * - Batch airdrop functionality
 * - Max supply enforcement
 * - Token URI support
 *
 * IMPORTANT: The constructor runs every time the contract is interacted with.
 * Use onDeployment() for one-time initialization logic.
 */
@final
export class OP721NFT extends OP721 {
    private readonly treasuryAddress: StoredString;
    private readonly mintEnabled: StoredBoolean;

    public constructor() {
        super();
        this.treasuryAddress = new StoredString(treasuryAddressPointer);
        this.mintEnabled = new StoredBoolean(mintEnabledPointer, false);
    }

    /**
     * One-time initialization when contract is deployed.
     * Configure your NFT collection parameters here.
     */
    public override onDeployment(_calldata: Calldata): void {
        // ========== CUSTOMIZE THESE VALUES ==========
        const maxSupply: u256 = u256.fromU32(10000);
        const name: string = 'My NFT Collection';
        const symbol: string = 'MNFT';
        const baseURI: string = 'https://api.example.com/metadata/';
        const collectionBanner: string = 'https://example.com/banner.jpg';
        const collectionIcon: string = 'https://example.com/icon.png';
        const collectionWebsite: string = 'https://example.com';
        const collectionDescription: string = 'An awesome NFT collection on OPNet';
        // ============================================

        this.instantiate(
            new OP721InitParameters(
                name,
                symbol,
                baseURI,
                maxSupply,
                collectionBanner,
                collectionIcon,
                collectionWebsite,
                collectionDescription,
            ),
        );

        this.treasuryAddress.value = Blockchain.tx.origin.p2tr();
        this.mintEnabled.value = false;
    }

    /**
     * Enable or disable minting.
     * Only the contract deployer can call this function.
     */
    @method({ name: 'enabled', type: ABIDataTypes.BOOL })
    @emit('MintStatusChanged')
    public setMintEnabled(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const enabled: boolean = calldata.readBoolean();
        this.mintEnabled.value = enabled;

        return new BytesWriter(0);
    }

    /**
     * Check if minting is currently enabled.
     */
    @method()
    @returns({ name: 'enabled', type: ABIDataTypes.BOOL })
    public isMintEnabled(_: Calldata): BytesWriter {
        const response: BytesWriter = new BytesWriter(1);
        response.writeBoolean(<boolean>this.mintEnabled.value);
        return response;
    }

    /**
     * Mint a single NFT to the specified address.
     * Only the contract deployer can call this function.
     */
    @method({ name: 'to', type: ABIDataTypes.ADDRESS })
    @emit('Transferred')
    @returns({ name: 'tokenId', type: ABIDataTypes.UINT256 })
    public mint(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const to: Address = calldata.readAddress();
        const tokenId: u256 = this._nextTokenId.value;

        // Check supply
        if (tokenId >= this.maxSupply) {
            throw new Revert('Max supply reached');
        }

        this._mint(to, tokenId);
        this._nextTokenId.value = SafeMath.add(tokenId, u256.One);

        const response: BytesWriter = new BytesWriter(U256_BYTE_LENGTH);
        response.writeU256(tokenId);
        return response;
    }

    /**
     * Airdrop NFTs to multiple addresses.
     * Only the contract deployer can call this function.
     */
    @method(
        { name: 'addresses', type: ABIDataTypes.ARRAY_OF_ADDRESSES },
        { name: 'amounts', type: ABIDataTypes.ARRAY_OF_UINT8 },
    )
    @emit('Transferred')
    public airdrop(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const addresses: Address[] = calldata.readAddressArray();
        const amounts: u8[] = calldata.readU8Array();

        if (addresses.length !== amounts.length || addresses.length === 0) {
            throw new Revert('Mismatched or empty arrays');
        }

        let totalToMint: u32 = 0;
        for (let i: u32 = 0; i < u32(amounts.length); i++) {
            totalToMint += amounts[i];
        }

        // Check supply
        const currentSupply: u256 = this._totalSupply.value;
        const available: u256 = SafeMath.sub(this.maxSupply, currentSupply);

        if (u256.fromU32(totalToMint) > available) {
            throw new Revert('Insufficient supply');
        }

        const startTokenId: u256 = this._nextTokenId.value;
        let mintedSoFar: u32 = 0;

        for (let i: u32 = 0; i < u32(addresses.length); i++) {
            const addr: Address = addresses[i];
            const amount: u32 = amounts[i];

            for (let j: u32 = 0; j < amount; j++) {
                const tokenId: u256 = SafeMath.add(startTokenId, u256.fromU32(mintedSoFar));
                this._mint(addr, tokenId);
                mintedSoFar++;
            }
        }

        this._nextTokenId.value = SafeMath.add(startTokenId, u256.fromU32(mintedSoFar));

        return new BytesWriter(0);
    }

    /**
     * Set the URI for a specific token.
     * Only the contract deployer can call this function.
     */
    @method(
        { name: 'tokenId', type: ABIDataTypes.UINT256 },
        { name: 'uri', type: ABIDataTypes.STRING },
    )
    @emit('URI')
    public setTokenURI(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const tokenId: u256 = calldata.readU256();
        const uri: string = calldata.readStringWithLength();

        this._setTokenURI(tokenId, uri);

        return new BytesWriter(0);
    }

    /**
     * Burn a token. Only the token owner can burn.
     */
    @method({ name: 'tokenId', type: ABIDataTypes.UINT256 })
    @emit('Transferred')
    public burn(calldata: Calldata): BytesWriter {
        const tokenId: u256 = calldata.readU256();
        const owner: Address = this._ownerOf(tokenId);

        if (owner !== Blockchain.tx.sender) {
            throw new Revert('Not token owner');
        }

        this._burn(tokenId);

        return new BytesWriter(0);
    }

    /**
     * Get collection status information.
     */
    @method()
    @returns(
        { name: 'minted', type: ABIDataTypes.UINT256 },
        { name: 'available', type: ABIDataTypes.UINT256 },
        { name: 'maxSupply', type: ABIDataTypes.UINT256 },
    )
    public getStatus(_: Calldata): BytesWriter {
        const minted: u256 = this._totalSupply.value;
        const available: u256 = SafeMath.sub(this.maxSupply, minted);

        const response: BytesWriter = new BytesWriter(U256_BYTE_LENGTH * 3);
        response.writeU256(minted);
        response.writeU256(available);
        response.writeU256(this.maxSupply);
        return response;
    }
}
