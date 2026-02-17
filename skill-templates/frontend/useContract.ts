import { useState, useCallback, useMemo } from 'react';
import { getContract, IOP20Contract, OP_20_ABI, BitcoinInterfaceAbi } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { useOPNet } from '../providers/OPNetProvider';

/**
 * Hook for interacting with OPNet smart contracts.
 *
 * @param contractAddress - The contract address (P2OP format or hex)
 * @param abi - Contract ABI definition
 * @returns Contract instance and helper methods
 */
export function useContract<T>(contractAddress: string, abi: BitcoinInterfaceAbi) {
    const { provider, network, isConnected } = useOPNet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const contract = useMemo(() => {
        if (!provider || !isConnected) {
            return null;
        }
        try {
            return getContract<T>(contractAddress, abi, provider, network);
        } catch {
            return null;
        }
    }, [provider, isConnected, contractAddress, abi, network]);

    return {
        contract,
        loading,
        setLoading,
        error,
        setError,
        isConnected,
    };
}

/**
 * Hook for interacting with OP20 token contracts.
 * Provides type-safe methods for all standard OP20 operations.
 *
 * @param contractAddress - The token contract address
 * @returns Token methods and state
 */
export function useOP20(contractAddress: string) {
    const { provider, network, isConnected } = useOPNet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const contract = useMemo(() => {
        if (!provider || !isConnected) {
            return null;
        }
        try {
            return getContract<IOP20Contract>(contractAddress, OP_20_ABI, provider, network);
        } catch {
            return null;
        }
    }, [provider, isConnected, contractAddress, network]);

    const getName = useCallback(async (): Promise<string | null> => {
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const result = await contract.name();
            return result.properties.name;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            return null;
        } finally {
            setLoading(false);
        }
    }, [contract]);

    const getSymbol = useCallback(async (): Promise<string | null> => {
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const result = await contract.symbol();
            return result.properties.symbol;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            return null;
        } finally {
            setLoading(false);
        }
    }, [contract]);

    const getDecimals = useCallback(async (): Promise<number | null> => {
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const result = await contract.decimals();
            return result.properties.decimals;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            return null;
        } finally {
            setLoading(false);
        }
    }, [contract]);

    const getTotalSupply = useCallback(async (): Promise<bigint | null> => {
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const result = await contract.totalSupply();
            return result.properties.totalSupply;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            return null;
        } finally {
            setLoading(false);
        }
    }, [contract]);

    const getBalanceOf = useCallback(
        async (address: Address): Promise<bigint | null> => {
            if (!contract) return null;
            setLoading(true);
            setError(null);
            try {
                const result = await contract.balanceOf(address);
                return result.properties.balance;
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
                return null;
            } finally {
                setLoading(false);
            }
        },
        [contract]
    );

    const getAllowance = useCallback(
        async (owner: Address, spender: Address): Promise<bigint | null> => {
            if (!contract) return null;
            setLoading(true);
            setError(null);
            try {
                const result = await contract.allowance(owner, spender);
                return result.properties.remaining;
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
                return null;
            } finally {
                setLoading(false);
            }
        },
        [contract]
    );

    return {
        contract,
        loading,
        error,
        isConnected,
        getName,
        getSymbol,
        getDecimals,
        getTotalSupply,
        getBalanceOf,
        getAllowance,
    };
}
