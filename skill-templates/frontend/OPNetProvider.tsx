import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { JSONRpcProvider } from 'opnet';
import { networks, Network } from '@btc-vision/bitcoin';

/**
 * Available OPNet networks with their configurations.
 */
export const OPNetNetworks = {
    mainnet: {
        url: 'https://mainnet.opnet.org',
        network: networks.bitcoin,
    },
    regtest: {
        url: 'https://regtest.opnet.org',
        network: networks.regtest,
    },
} as const;

export type OPNetNetworkId = keyof typeof OPNetNetworks;

interface OPNetContextType {
    provider: JSONRpcProvider | null;
    network: Network;
    networkId: OPNetNetworkId;
    isConnected: boolean;
    error: Error | null;
    switchNetwork: (networkId: OPNetNetworkId) => void;
}

interface OPNetProviderProps {
    children: ReactNode;
    defaultNetwork?: OPNetNetworkId;
}

const OPNetContext = createContext<OPNetContextType | undefined>(undefined);

/**
 * Provider component for OPNet connectivity.
 * Wraps your app to provide OPNet provider access throughout the component tree.
 *
 * @param children - Child components
 * @param defaultNetwork - Initial network to connect to
 *
 * @example
 * ```tsx
 * <OPNetProvider defaultNetwork="mainnet">
 *   <App />
 * </OPNetProvider>
 * ```
 */
export function OPNetProvider({ children, defaultNetwork = 'mainnet' }: OPNetProviderProps) {
    const [networkId, setNetworkId] = useState<OPNetNetworkId>(defaultNetwork);
    const [provider, setProvider] = useState<JSONRpcProvider | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const providerRef = useRef<JSONRpcProvider | null>(null);

    const config = OPNetNetworks[networkId];
    const network = config.network;

    useEffect(() => {
        const initProvider = async () => {
            setError(null);
            try {
                const rpcProvider = new JSONRpcProvider(config.url, config.network);
                providerRef.current = rpcProvider;
                setProvider(rpcProvider);

                await rpcProvider.getBlockNumber();
                setIsConnected(true);
            } catch (err) {
                const initError = err instanceof Error ? err : new Error(String(err));
                setError(initError);
                setIsConnected(false);
            }
        };

        initProvider();

        return () => {
            providerRef.current?.close();
        };
    }, [config]);

    const switchNetwork = (newNetworkId: OPNetNetworkId) => {
        if (newNetworkId !== networkId) {
            setIsConnected(false);
            setNetworkId(newNetworkId);
        }
    };

    const value: OPNetContextType = {
        provider,
        network,
        networkId,
        isConnected,
        error,
        switchNetwork,
    };

    return <OPNetContext.Provider value={value}>{children}</OPNetContext.Provider>;
}

/**
 * Hook to access the OPNet provider context.
 *
 * @returns The OPNet context containing provider, network, and connection state
 * @throws Error if used outside of OPNetProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { provider, isConnected, networkId } = useOPNet();
 *   // ...
 * }
 * ```
 */
export function useOPNet(): OPNetContextType {
    const context = useContext(OPNetContext);
    if (context === undefined) {
        throw new Error('useOPNet must be used within an OPNetProvider');
    }
    return context;
}
