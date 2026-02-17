import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@noble/hashes/sha256': '@noble/hashes/sha2.js',
            '@noble/hashes/sha512': '@noble/hashes/sha2.js',
            '@noble/hashes/ripemd160': '@noble/hashes/legacy.js',
        },
        dedupe: [
            '@noble/curves',
            '@noble/hashes',
            'buffer',
            'react',
            'react-dom',
        ],
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    crypto: ['@noble/curves', '@noble/hashes'],
                    btcvision: [
                        '@btc-vision/transaction',
                        '@btc-vision/bitcoin',
                        '@btc-vision/bip32',
                        '@btc-vision/ecpair',
                    ],
                    opnet: ['opnet'],
                    react: ['react', 'react-dom', 'react-router-dom'],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'buffer', 'process'],
    },
});
