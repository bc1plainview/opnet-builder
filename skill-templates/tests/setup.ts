/**
 * Test Setup and Utilities
 *
 * Common utilities and setup functions for contract tests.
 */

import { Blockchain } from '@btc-vision/unit-test-framework';
import { Address } from '@btc-vision/transaction';

/**
 * Generate multiple random addresses
 */
export function generateAddresses(count: number): Address[] {
    const addresses: Address[] = [];
    for (let i = 0; i < count; i++) {
        addresses.push(Blockchain.generateRandomAddress());
    }
    return addresses;
}

/**
 * Setup blockchain for testing
 */
export async function setupBlockchain(): Promise<void> {
    Blockchain.dispose();
    Blockchain.clearContracts();
    await Blockchain.init();
}

/**
 * Cleanup blockchain after tests
 */
export function cleanupBlockchain(): void {
    Blockchain.dispose();
}

/**
 * Advance blockchain by specified number of blocks
 */
export function advanceBlocks(count: number): void {
    for (let i = 0; i < count; i++) {
        Blockchain.mineBlock();
    }
}

/**
 * Set block timestamp
 */
export function setBlockTimestamp(timestamp: number): void {
    Blockchain.setBlockTimestamp(timestamp);
}

/**
 * Test configuration
 */
export const TEST_CONFIG = {
    DEFAULT_GAS_LIMIT: 100_000_000_000_000n,
    DEFAULT_DECIMALS: 18,
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
};
