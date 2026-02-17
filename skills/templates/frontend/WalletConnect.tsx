import type { ReactNode } from 'react';
import { useWallet } from '../hooks/useWallet';

/**
 * Truncates an address for display.
 */
function truncateAddress(addr: string): string {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

/**
 * WalletConnect Component
 *
 * Displays wallet connection button and connected wallet info.
 */
export function WalletConnect() {
    const { address, isConnected, isConnecting, error, walletType, openConnectModal, disconnect } =
        useWallet();

    if (isConnected && address) {
        return (
            <div className="wallet-connect connected">
                <div className="wallet-info">
                    <span className="wallet-name">{walletType}</span>
                    <span className="wallet-address">{truncateAddress(address)}</span>
                </div>
                <button className="btn btn-disconnect" onClick={disconnect}>
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="wallet-connect">
            <button className="btn btn-connect" onClick={openConnectModal} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            {error && <p className="error">{error.message}</p>}
        </div>
    );
}

/**
 * Wallet Required Wrapper
 *
 * Wraps content that requires a connected wallet.
 */
interface WalletRequiredProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function WalletRequired({ children, fallback }: WalletRequiredProps) {
    const { isConnected } = useWallet();

    if (!isConnected) {
        return (
            fallback ?? (
                <div className="wallet-required">
                    <p>Please connect your wallet to continue.</p>
                    <WalletConnect />
                </div>
            )
        );
    }

    return <>{children}</>;
}
