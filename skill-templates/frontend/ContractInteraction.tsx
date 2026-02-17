import { useState, useEffect } from 'react';
import { useOP20 } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { formatUnits } from 'opnet';

interface ContractInteractionProps {
    contractAddress: string;
}

/**
 * ContractInteraction Component
 *
 * Example component for interacting with an OP20 token contract.
 */
export function ContractInteraction({ contractAddress }: ContractInteractionProps) {
    const { addressObject, isConnected } = useWallet();
    const { getName, getSymbol, getDecimals, getTotalSupply, getBalanceOf, loading, error } =
        useOP20(contractAddress);

    const [tokenInfo, setTokenInfo] = useState<{
        name: string | null;
        symbol: string | null;
        decimals: number | null;
        totalSupply: bigint | null;
    }>({
        name: null,
        symbol: null,
        decimals: null,
        totalSupply: null,
    });

    const [balance, setBalance] = useState<bigint | null>(null);

    useEffect(() => {
        const loadTokenInfo = async () => {
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                getName(),
                getSymbol(),
                getDecimals(),
                getTotalSupply(),
            ]);

            setTokenInfo({ name, symbol, decimals, totalSupply });
        };

        loadTokenInfo();
    }, [getName, getSymbol, getDecimals, getTotalSupply]);

    useEffect(() => {
        const loadBalance = async () => {
            if (isConnected && addressObject) {
                const bal = await getBalanceOf(addressObject);
                setBalance(bal);
            } else {
                setBalance(null);
            }
        };

        loadBalance();
    }, [isConnected, addressObject, getBalanceOf]);

    const formatBalance = (bal: bigint | null, decimals: number | null): string => {
        if (bal === null || decimals === null) return '0';
        return formatUnits(bal, decimals);
    };

    return (
        <div className="contract-interaction">
            <h2>Token Information</h2>

            {loading && <p className="loading">Loading...</p>}
            {error && <p className="error">{error.message}</p>}

            <div className="token-info">
                <div className="info-row">
                    <span className="label">Name:</span>
                    <span className="value">{tokenInfo.name ?? '-'}</span>
                </div>
                <div className="info-row">
                    <span className="label">Symbol:</span>
                    <span className="value">{tokenInfo.symbol ?? '-'}</span>
                </div>
                <div className="info-row">
                    <span className="label">Decimals:</span>
                    <span className="value">{tokenInfo.decimals ?? '-'}</span>
                </div>
                <div className="info-row">
                    <span className="label">Total Supply:</span>
                    <span className="value">
                        {formatBalance(tokenInfo.totalSupply, tokenInfo.decimals)}{' '}
                        {tokenInfo.symbol}
                    </span>
                </div>
            </div>

            {isConnected && (
                <div className="user-info">
                    <h3>Your Balance</h3>
                    <p className="balance">
                        {formatBalance(balance, tokenInfo.decimals)} {tokenInfo.symbol}
                    </p>
                </div>
            )}
        </div>
    );
}
