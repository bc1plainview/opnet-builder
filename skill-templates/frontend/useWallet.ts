import { useState, useCallback } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';

/**
 * Hook for wallet connection and management.
 * Provides methods for connecting, disconnecting, and signing with OPNet-compatible wallets.
 *
 * @returns Wallet state and action methods
 */
export function useWallet() {
    const walletConnect = useWalletConnect();
    const [error, setError] = useState<Error | null>(null);

    /**
     * Open the wallet connection modal.
     */
    const openConnectModal = useCallback(() => {
        setError(null);
        try {
            walletConnect.openConnectModal();
        } catch (err) {
            const connectError = err instanceof Error ? err : new Error(String(err));
            setError(connectError);
        }
    }, [walletConnect]);

    /**
     * Disconnect the current wallet.
     */
    const disconnect = useCallback(() => {
        setError(null);
        try {
            walletConnect.disconnect();
        } catch (err) {
            const disconnectError = err instanceof Error ? err : new Error(String(err));
            setError(disconnectError);
        }
    }, [walletConnect]);

    /**
     * Sign a message with ML-DSA (quantum-resistant signature).
     *
     * @param message - The message to sign
     * @returns The ML-DSA signature or null if signing failed
     */
    const signMessage = useCallback(
        async (message: string) => {
            setError(null);
            try {
                const signature = await walletConnect.signMLDSAMessage(message);
                return signature;
            } catch (err) {
                const signError = err instanceof Error ? err : new Error(String(err));
                setError(signError);
                return null;
            }
        },
        [walletConnect]
    );

    /**
     * Verify an ML-DSA signature.
     *
     * @param message - The original message
     * @param signature - The signature to verify
     * @returns True if valid, false otherwise
     */
    const verifySignature = useCallback(
        async (message: string, signature: Parameters<typeof walletConnect.verifyMLDSASignature>[1]) => {
            setError(null);
            try {
                return await walletConnect.verifyMLDSASignature(message, signature);
            } catch (err) {
                const verifyError = err instanceof Error ? err : new Error(String(err));
                setError(verifyError);
                return false;
            }
        },
        [walletConnect]
    );

    const isConnected = walletConnect.address !== null;

    return {
        address: walletConnect.walletAddress,
        addressObject: walletConnect.address,
        publicKey: walletConnect.publicKey,
        mldsaPublicKey: walletConnect.mldsaPublicKey,
        isConnected,
        isConnecting: walletConnect.connecting,
        error,
        walletType: walletConnect.walletType,
        provider: walletConnect.provider,
        signer: walletConnect.signer,
        balance: walletConnect.walletBalance,
        openConnectModal,
        disconnect,
        signMessage,
        verifySignature,
    };
}
