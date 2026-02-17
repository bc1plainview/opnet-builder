/**
 * Type definitions for the OP20 Indexer plugin
 */

export interface TokenInfo {
    address: string;
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupply?: string;
    firstSeen: number;
}

export interface TokenBalance {
    tokenAddress: string;
    holderAddress: string;
    balance: string;
    lastUpdated: number;
}

export interface TransferRecord {
    tokenAddress: string;
    txHash: string;
    blockHeight: number;
    from: string;
    to: string;
    amount: string;
    timestamp: number;
}

export interface HolderInfo {
    address: string;
    balance: string;
    percentage?: number;
}
