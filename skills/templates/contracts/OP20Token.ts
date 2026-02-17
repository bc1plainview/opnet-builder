import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    AddressMap,
    Blockchain,
    BytesWriter,
    Calldata,
    OP20,
    OP20InitParameters,
    SafeMath,
} from '@btc-vision/btc-runtime/runtime';

/**
 * OP20Token - A complete OP20 fungible token implementation
 *
 * Features:
 * - Standard OP20 interface (balanceOf, transfer, approve, transferFrom, etc.)
 * - Minting with access control (onlyDeployer)
 * - Batch airdrop functionality
 * - Max supply enforcement
 *
 * IMPORTANT: The constructor runs every time the contract is interacted with.
 * Use onDeployment() for one-time initialization logic.
 */
@final
export class OP20Token extends OP20 {
    public constructor() {
        super();
        // DO NOT add initialization logic here - use onDeployment() instead
    }

    /**
     * One-time initialization when contract is deployed.
     * Configure your token parameters here.
     */
    public override onDeployment(_calldata: Calldata): void {
        // ========== CUSTOMIZE THESE VALUES ==========
        const maxSupply: u256 = u256.fromString('1000000000000000000000000000'); // 1 billion tokens with 18 decimals
        const decimals: u8 = 18;
        const name: string = 'My Token';
        const symbol: string = 'MTK';
        // ============================================

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        // Optional: Mint initial supply to deployer
        // this._mint(Blockchain.tx.origin, maxSupply);
    }

    /**
     * Mint tokens to a specific address.
     * Only the contract deployer can call this function.
     *
     * @param calldata Contains: address (recipient), uint256 (amount)
     */
    @method(
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @emit('Minted')
    public mint(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const to: Address = calldata.readAddress();
        const amount: u256 = calldata.readU256();

        this._mint(to, amount);

        return new BytesWriter(0);
    }

    /**
     * Airdrop tokens to multiple addresses in a single transaction.
     * Only the contract deployer can call this function.
     *
     * @param calldata Contains: AddressMap<u256> (address -> amount mapping)
     */
    @method({
        name: 'recipients',
        type: ABIDataTypes.ADDRESS_UINT256_TUPLE,
    })
    @emit('Minted')
    public airdrop(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const recipients: AddressMap<u256> = calldata.readAddressMapU256();
        const addresses: Address[] = recipients.keys();

        let totalAirdropped: u256 = u256.Zero;

        for (let i: i32 = 0; i < addresses.length; i++) {
            const address: Address = addresses[i];
            const amount: u256 = recipients.get(address);

            const currentBalance: u256 = this.balanceOfMap.get(address);

            if (currentBalance) {
                this.balanceOfMap.set(address, SafeMath.add(currentBalance, amount));
            } else {
                this.balanceOfMap.set(address, amount);
            }

            totalAirdropped = SafeMath.add(totalAirdropped, amount);
            this.createMintedEvent(address, amount);
        }

        this._totalSupply.set(SafeMath.add(this._totalSupply.value, totalAirdropped));

        return new BytesWriter(0);
    }

    /**
     * Burn tokens from the caller's balance.
     *
     * @param calldata Contains: uint256 (amount to burn)
     */
    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @emit('Burned')
    public burn(calldata: Calldata): BytesWriter {
        const amount: u256 = calldata.readU256();
        this._burn(Blockchain.tx.sender, amount);
        return new BytesWriter(0);
    }
}
