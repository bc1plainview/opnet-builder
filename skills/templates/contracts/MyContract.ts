import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    NetEvent,
    OP_NET,
    Revert,
    SafeMath,
    StoredBoolean,
    StoredString,
    StoredU256,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';

// Storage pointers - each must be unique
const ownerPointer: u16 = Blockchain.nextPointer;
const valuePointer: u16 = Blockchain.nextPointer;
const pausedPointer: u16 = Blockchain.nextPointer;

/**
 * Custom event example
 */
@final
export class ValueChangedEvent extends NetEvent {
    constructor(oldValue: u256, newValue: u256, changedBy: Address) {
        const data: BytesWriter = new BytesWriter(U256_BYTE_LENGTH * 2 + 32);
        data.writeU256(oldValue);
        data.writeU256(newValue);
        data.writeAddress(changedBy);
        super('ValueChanged', data);
    }
}

/**
 * MyContract - A generic OPNet smart contract template
 *
 * This template demonstrates:
 * - Storage patterns (StoredU256, StoredString, StoredBoolean)
 * - Access control (owner-only functions)
 * - Custom events
 * - Pausable pattern
 * - Method decorators (@method, @returns, @emit)
 *
 * IMPORTANT:
 * - Constructor runs on EVERY interaction
 * - Use onDeployment() for one-time initialization
 * - Contracts CANNOT hold BTC (verify-don't-custody pattern)
 */
@final
export class MyContract extends OP_NET {
    private readonly owner: StoredString;
    private readonly storedValue: StoredU256;
    private readonly paused: StoredBoolean;

    public constructor() {
        super();
        this.owner = new StoredString(ownerPointer);
        this.storedValue = new StoredU256(valuePointer, u256.Zero);
        this.paused = new StoredBoolean(pausedPointer, false);
    }

    /**
     * One-time initialization on deployment
     */
    public override onDeployment(_calldata: Calldata): void {
        // Set deployer as owner
        this.owner.value = Blockchain.tx.origin.p2tr();

        // Initialize with default value
        this.storedValue.value = u256.fromU32(100);
    }

    /**
     * Ensures the caller is the contract owner.
     * @throws {Revert} If caller is not the owner
     */
    private ensureOwner(): void {
        if (Blockchain.tx.sender.p2tr() !== this.owner.value) {
            throw new Revert('Not owner');
        }
    }

    /**
     * Ensure contract is not paused
     */
    private ensureNotPaused(): void {
        if (this.paused.value) {
            throw new Revert('Contract paused');
        }
    }

    /**
     * Returns the current owner address.
     * @returns The owner's P2TR address as a string
     */
    @method()
    @returns({ name: 'owner', type: ABIDataTypes.STRING })
    public getOwner(_: Calldata): BytesWriter {
        const owner: string = this.owner.value;
        const response: BytesWriter = new BytesWriter(4 + owner.length);
        response.writeStringWithLength(owner);
        return response;
    }

    /**
     * Get the current stored value
     */
    @method()
    @returns({ name: 'value', type: ABIDataTypes.UINT256 })
    public getValue(_: Calldata): BytesWriter {
        const response: BytesWriter = new BytesWriter(U256_BYTE_LENGTH);
        response.writeU256(this.storedValue.value);
        return response;
    }

    /**
     * Check if contract is paused
     */
    @method()
    @returns({ name: 'isPaused', type: ABIDataTypes.BOOL })
    public isPaused(_: Calldata): BytesWriter {
        const response: BytesWriter = new BytesWriter(1);
        response.writeBoolean(<boolean>this.paused.value);
        return response;
    }

    /**
     * Sets a new stored value (when contract is not paused).
     * @param calldata - Contains the new u256 value to store
     * @emits ValueChanged
     */
    @method({ name: 'newValue', type: ABIDataTypes.UINT256 })
    @emit('ValueChanged')
    public setValue(calldata: Calldata): BytesWriter {
        this.ensureNotPaused();

        const oldValue: u256 = this.storedValue.value;
        const newValue: u256 = calldata.readU256();

        this.storedValue.value = newValue;

        // Emit event
        this.emitEvent(new ValueChangedEvent(oldValue, newValue, Blockchain.tx.sender));

        return new BytesWriter(0);
    }

    /**
     * Increment the stored value
     */
    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @emit('ValueChanged')
    @returns({ name: 'newValue', type: ABIDataTypes.UINT256 })
    public increment(calldata: Calldata): BytesWriter {
        this.ensureNotPaused();

        const amount: u256 = calldata.readU256();
        const oldValue: u256 = this.storedValue.value;
        const newValue: u256 = SafeMath.add(oldValue, amount);

        this.storedValue.value = newValue;

        this.emitEvent(new ValueChangedEvent(oldValue, newValue, Blockchain.tx.sender));

        const response: BytesWriter = new BytesWriter(U256_BYTE_LENGTH);
        response.writeU256(newValue);
        return response;
    }

    /**
     * Pauses the contract, preventing state-changing operations.
     * @throws {Revert} If caller is not the owner
     */
    @method()
    public pause(_: Calldata): BytesWriter {
        this.ensureOwner();
        this.paused.value = true;
        return new BytesWriter(0);
    }

    /**
     * Unpause the contract (owner only)
     */
    @method()
    public unpause(_: Calldata): BytesWriter {
        this.ensureOwner();
        this.paused.value = false;
        return new BytesWriter(0);
    }

    /**
     * Transfer ownership (owner only)
     */
    @method({ name: 'newOwner', type: ABIDataTypes.ADDRESS })
    public transferOwnership(calldata: Calldata): BytesWriter {
        this.ensureOwner();

        const newOwner: Address = calldata.readAddress();
        this.owner.value = newOwner.p2tr();

        return new BytesWriter(0);
    }
}
