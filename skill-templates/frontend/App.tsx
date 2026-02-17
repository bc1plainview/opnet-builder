import { OPNetProvider } from './providers/OPNetProvider';
import { WalletConnect, WalletRequired } from './components/WalletConnect';
import { ContractInteraction } from './components/ContractInteraction';
import './App.css';

// Example contract address (replace with your contract)
const EXAMPLE_TOKEN_ADDRESS = 'bcrt1p...'; // Your contract address here

function App() {
    return (
        <OPNetProvider defaultNetwork="regtest">
            <div className="app">
                <header className="app-header">
                    <h1>OPNet dApp</h1>
                    <WalletConnect />
                </header>

                <main className="app-main">
                    <section className="section">
                        <h2>Welcome to OPNet</h2>
                        <p>
                            This is a template dApp for interacting with OPNet smart contracts on
                            Bitcoin.
                        </p>
                    </section>

                    <section className="section">
                        <WalletRequired>
                            <ContractInteraction contractAddress={EXAMPLE_TOKEN_ADDRESS} />
                        </WalletRequired>
                    </section>
                </main>

                <footer className="app-footer">
                    <p>Built on Bitcoin Layer 1 with OP_NET</p>
                </footer>
            </div>
        </OPNetProvider>
    );
}

export default App;
