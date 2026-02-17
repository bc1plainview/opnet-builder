# OPNet Backend/API Development Guidelines

**Read `setup-guidelines.md` FIRST for project setup and package versions.**

This document covers backend architecture, required frameworks, threading, caching, and API best practices.

### MANDATORY: Always Update Packages

**After `npm install`, ALWAYS run:**

```bash
npx npm-check-updates -u && npm install
```

---

## Table of Contents

1. [TypeScript Law (MANDATORY)](#typescript-law-mandatory)
2. [Mandatory Reading Order](#mandatory-reading-order)
3. [Required Frameworks](#required-frameworks)
4. [Package Versions](#package-versions)
5. [Architecture Principles](#architecture-principles)
6. [HyperExpress Server](#hyperexpress-server)
7. [WebSocket with uWebSockets.js](#websocket-with-uwebsocketsjs)
8. [Threading (MANDATORY)](#threading-mandatory)
9. [Caching (MANDATORY)](#caching-mandatory)
10. [Provider and Contract Management](#provider-and-contract-management)
11. [Error Handling](#error-handling)
12. [Common Backend Mistakes](#common-backend-mistakes)
13. [Security Checklist](#security-checklist)

---

## TypeScript Law (MANDATORY)

**BEFORE WRITING ANY BACKEND CODE, YOU MUST READ AND FOLLOW:**

`docs/core-typescript-law-CompleteLaw.md`

**The TypeScript Law is NON-NEGOTIABLE.** Every line of code must comply. Violations lead to exploitable, broken code.

### Key Rules (Summary)

| FORBIDDEN | WHY | USE INSTEAD |
|-----------|-----|-------------|
| `any` | Runtime bugs, defeats type checking | Proper types, generics |
| `unknown` (except boundaries) | Lazy escape hatch | Model actual types |
| `object` (lowercase) | Too broad, no shape info | `Record<string, T>` or interface |
| `Function` (uppercase) | No parameter/return safety | Specific function signatures |
| `{}` | Means "any non-nullish" | `Record<string, never>` |
| `!` (non-null assertion) | Hides null bugs | Explicit checks, `?.` |
| `// @ts-ignore` | Hides errors | Fix the actual error |
| `eslint-disable` | Bypasses safety | Fix the actual issue |
| Section separator comments | Lazy, unprofessional | TSDoc for every method |
| `number` for large values | 53-bit precision loss | `bigint` for satoshis, IDs, heights |
| Floats for financial values | Rounding errors | Fixed-point `bigint` |

### Required tsconfig.json

```json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "exactOptionalPropertyTypes": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "moduleResolution": "bundler",
        "module": "ESNext",
        "target": "ESNext",
        "lib": ["ESNext"],
        "isolatedModules": true,
        "verbatimModuleSyntax": true
    }
}
```

**IF YOUR PROJECT DOES NOT MATCH THESE SETTINGS, FIX IT BEFORE WRITING CODE.**

---

## Mandatory Reading Order

**This guideline is a SUMMARY. You MUST read the following docs files IN ORDER before writing backend code:**

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules, forbidden constructs |
| 2 | `guidelines/setup-guidelines.md` | Package versions |
| 3 | `guidelines/backend-guidelines.md` | This file - summary of patterns |
| 4 | `docs/core-opnet-backend-api.md` | **REQUIRED FRAMEWORKS** - hyper-express, uWebSockets.js |
| 5 | `docs/core-opnet-providers-json-rpc-provider.md` | Provider setup |
| 6 | `docs/core-opnet-providers-threaded-http.md` | Threading (MANDATORY) |
| 7 | `docs/core-opnet-providers-internal-caching.md` | Caching (MANDATORY) |
| 8 | `docs/core-opnet-contracts-instantiating-contracts.md` | Contract instances |

**FORBIDDEN FRAMEWORKS:** Express, Fastify, Koa, Hapi, Socket.io - use hyper-express and uWebSockets.js only.

**IF YOU SKIP THESE DOCS, YOUR BACKEND WILL HAVE PERFORMANCE AND SECURITY ISSUES.**

---

## Required Frameworks

### MANDATORY

| Package | Purpose |
|---------|---------|
| `@btc-vision/hyper-express` | HTTP server (fastest Node.js framework) |
| `@btc-vision/uwebsocket.js` | WebSocket server (fastest implementation) |

### FORBIDDEN

| Package | Why Forbidden |
|---------|---------------|
| Express.js | 5-10x slower than hyper-express |
| Fastify | Slower, unnecessary abstraction |
| Koa | Slower, middleware overhead |
| Hapi | Slower, overcomplicated |
| Socket.io | Slower, unnecessary abstraction |
| ws | Slower than uWebSockets.js |

**Using forbidden frameworks will bottleneck your application.**

---

## Package Versions

**NEVER GUESS PACKAGE VERSIONS.**

```json
{
    "type": "module",
    "dependencies": {
        "@btc-vision/hyper-express": "^6.17.3",
        "@btc-vision/uwebsocket.js": "^21.2.0",
        "opnet": "1.8.1-beta.13",
        "@btc-vision/transaction": "1.8.0-beta.10",
        "@btc-vision/bitcoin": "7.0.0-alpha.11"
    },
    "devDependencies": {
        "typescript": "latest",
        "@types/node": "latest"
    },
    "overrides": {
        "@noble/hashes": "2.0.1"
    }
}
```

---

## Architecture Principles

### 1. Classes Over Functions

**Use Object-Oriented Programming.** Classes provide:
- Encapsulation of state
- Clear dependencies via constructor
- Discoverable APIs via autocomplete
- Testability through dependency injection

```typescript
// WRONG - Scattered functions
let provider: JSONRpcProvider | null = null;

function getProvider(): JSONRpcProvider {
    if (!provider) {
        provider = new JSONRpcProvider(url, network);
    }
    return provider;
}

function getBalance(address: string): Promise<bigint> {
    return getProvider().getBalance(address);
}

// CORRECT - Class with clear responsibility
class OPNetService {
    private readonly provider: JSONRpcProvider;
    private readonly contractCache: Map<string, IOP20Contract> = new Map();

    public constructor(rpcUrl: string, network: Networks) {
        this.provider = new JSONRpcProvider(rpcUrl, network);
    }

    public async getBalance(address: string): Promise<bigint> {
        return this.provider.getBalance(address);
    }

    public async getContract(address: string): Promise<IOP20Contract> {
        if (!this.contractCache.has(address)) {
            const contract = await getContract<IOP20Contract>(
                address,
                OP_20_ABI,
                this.provider
            );
            this.contractCache.set(address, contract);
        }
        return this.contractCache.get(address)!;
    }
}
```

### 2. Singleton Services

```typescript
/**
 * Singleton OPNet service. Use getInstance() to access.
 *
 * @example
 * ```typescript
 * const service = OPNetService.getInstance();
 * const balance = await service.getBalance(address);
 * ```
 */
class OPNetService {
    private static instance: OPNetService;

    private constructor() {
        // Private constructor prevents direct instantiation
    }

    /**
     * Get the singleton instance.
     *
     * @returns The OPNet service instance
     */
    public static getInstance(): OPNetService {
        if (!OPNetService.instance) {
            OPNetService.instance = new OPNetService();
        }
        return OPNetService.instance;
    }
}
```

### 3. Explicit Access Modifiers

**ALWAYS declare public/private/readonly:**

```typescript
class ApiServer {
    // Private: internal implementation
    private readonly app: HyperExpress.Server;
    private readonly provider: JSONRpcProvider;

    // Private mutable: internal state
    private currentBlock: number = 0;

    // Public: external API
    public readonly port: number;

    public constructor(port: number) {
        this.port = port;
        this.app = new HyperExpress.Server();
        this.provider = new JSONRpcProvider(/* ... */);
    }

    // Public method
    public async start(): Promise<void> {
        await this.app.listen(this.port);
    }

    // Private method
    private async fetchBlock(): Promise<void> {
        this.currentBlock = await this.provider.getBlockNumber();
    }
}
```

---

## HyperExpress Server

### Basic Setup

```typescript
import HyperExpress from '@btc-vision/hyper-express';
import { JSONRpcProvider, getContract, OP_20_ABI, IOP20Contract } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { AddressVerificator } from '@btc-vision/transaction';

/**
 * OPNet REST API server using HyperExpress.
 */
class OPNetAPI {
    private readonly app: HyperExpress.Server;
    private readonly provider: JSONRpcProvider;
    private readonly contractCache: Map<string, IOP20Contract> = new Map();

    public constructor() {
        this.app = new HyperExpress.Server({
            max_body_length: 1024 * 1024, // 1MB
        });
        this.provider = new JSONRpcProvider(
            process.env.OPNET_RPC_URL ?? 'https://api.opnet.org',
            networks.bitcoin
        );
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup global middleware.
     */
    private setupMiddleware(): void {
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.status(204).send();
                return;
            }
            next();
        });
    }

    /**
     * Setup API routes.
     */
    private setupRoutes(): void {
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: Date.now() });
        });

        this.app.get('/v1/balance/:address', async (req, res) => {
            await this.handleBalance(req, res);
        });

        this.app.get('/v1/token/:contract/balance/:address', async (req, res) => {
            await this.handleTokenBalance(req, res);
        });

        this.app.post('/v1/simulate', async (req, res) => {
            await this.handleSimulate(req, res);
        });
    }

    /**
     * Handle balance request.
     */
    private async handleBalance(
        req: HyperExpress.Request,
        res: HyperExpress.Response
    ): Promise<void> {
        const { address } = req.params;

        if (!AddressVerificator.isValidAddress(address, networks.bitcoin)) {
            res.status(400).json({ error: 'Invalid Bitcoin address' });
            return;
        }

        try {
            const balance = await this.provider.getBalance(address);
            res.json({
                address,
                balance: balance.toString(),
            });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    /**
     * Handle token balance request.
     */
    private async handleTokenBalance(
        req: HyperExpress.Request,
        res: HyperExpress.Response
    ): Promise<void> {
        const { contract: contractAddr, address } = req.params;

        if (!AddressVerificator.isValidAddress(address, networks.bitcoin)) {
            res.status(400).json({ error: 'Invalid address' });
            return;
        }

        try {
            const contract = await this.getContract(contractAddr);
            const result = await contract.balanceOf(address);

            if ('error' in result) {
                res.status(400).json({ error: result.error });
                return;
            }

            res.json({
                address,
                balance: result.properties.balance.toString(),
            });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    /**
     * Handle contract simulation request.
     */
    private async handleSimulate(
        req: HyperExpress.Request,
        res: HyperExpress.Response
    ): Promise<void> {
        try {
            const body: SimulateRequest = await req.json();
            // Validation and simulation logic
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    /**
     * Get or create cached contract instance.
     */
    private async getContract(address: string): Promise<IOP20Contract> {
        if (!this.contractCache.has(address)) {
            const contract = await getContract<IOP20Contract>(
                address,
                OP_20_ABI,
                this.provider
            );
            this.contractCache.set(address, contract);
        }
        return this.contractCache.get(address)!;
    }

    /**
     * Start the API server.
     *
     * @param port - Port to listen on
     */
    public async start(port: number): Promise<void> {
        await this.app.listen(port);
        console.log(`OPNet API listening on port ${port}`);
    }
}

// Start server
const api = new OPNetAPI();
api.start(parseInt(process.env.PORT ?? '3000', 10));
```

---

## WebSocket with uWebSockets.js

### Real-Time Subscriptions

```typescript
import uWS from '@btc-vision/uwebsocket.js';
import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

interface Subscription {
    readonly type: 'blocks' | 'token' | 'address';
    readonly filter?: string;
}

/**
 * WebSocket server for real-time OPNet updates.
 */
class OPNetWebSocket {
    private readonly app: uWS.TemplatedApp;
    private readonly provider: JSONRpcProvider;
    private readonly subscriptions: Map<uWS.WebSocket<unknown>, Subscription[]> =
        new Map();
    private currentBlock: number = 0;

    public constructor() {
        this.provider = new JSONRpcProvider(
            process.env.OPNET_RPC_URL ?? 'https://api.opnet.org',
            networks.bitcoin
        );

        this.app = uWS
            .App()
            .ws('/*', {
                open: (ws) => this.handleOpen(ws),
                message: (ws, message) => this.handleMessage(ws, message),
                close: (ws) => this.handleClose(ws),
            });

        this.startBlockWatcher();
    }

    /**
     * Handle new WebSocket connection.
     */
    private handleOpen(ws: uWS.WebSocket<unknown>): void {
        this.subscriptions.set(ws, []);
        console.log('Client connected');
    }

    /**
     * Handle WebSocket message.
     */
    private handleMessage(
        ws: uWS.WebSocket<unknown>,
        message: ArrayBuffer
    ): void {
        const data: SubscriptionMessage = JSON.parse(
            Buffer.from(message).toString()
        );

        switch (data.action) {
            case 'subscribe':
                this.subscribe(ws, data.subscription);
                break;
            case 'unsubscribe':
                this.unsubscribe(ws, data.subscription);
                break;
        }
    }

    /**
     * Handle WebSocket close.
     */
    private handleClose(ws: uWS.WebSocket<unknown>): void {
        this.subscriptions.delete(ws);
        console.log('Client disconnected');
    }

    /**
     * Add subscription for a client.
     */
    private subscribe(
        ws: uWS.WebSocket<unknown>,
        subscription: Subscription
    ): void {
        const subs = this.subscriptions.get(ws) ?? [];
        subs.push(subscription);
        this.subscriptions.set(ws, subs);

        ws.send(
            JSON.stringify({
                type: 'subscribed',
                subscription,
            })
        );
    }

    /**
     * Remove subscription for a client.
     */
    private unsubscribe(
        ws: uWS.WebSocket<unknown>,
        subscription: Subscription
    ): void {
        const subs = this.subscriptions.get(ws) ?? [];
        const filtered = subs.filter(
            (s) => s.type !== subscription.type || s.filter !== subscription.filter
        );
        this.subscriptions.set(ws, filtered);
    }

    /**
     * Start watching for new blocks.
     */
    private startBlockWatcher(): void {
        setInterval(async () => {
            try {
                const block = await this.provider.getBlockNumber();
                if (Number(block) !== this.currentBlock) {
                    this.currentBlock = Number(block);
                    this.broadcastBlockUpdate();
                }
            } catch (error) {
                console.error('Block watcher error:', error);
            }
        }, 5000);
    }

    /**
     * Broadcast block update to subscribed clients.
     */
    private broadcastBlockUpdate(): void {
        const message = JSON.stringify({
            type: 'block',
            height: this.currentBlock,
        });

        for (const [ws, subs] of this.subscriptions) {
            if (subs.some((s) => s.type === 'blocks')) {
                ws.send(message);
            }
        }
    }

    /**
     * Start the WebSocket server.
     *
     * @param port - Port to listen on
     */
    public listen(port: number): void {
        this.app.listen(port, (token) => {
            if (token) {
                console.log(`WebSocket server listening on port ${port}`);
            } else {
                console.error('Failed to start WebSocket server');
            }
        });
    }
}
```

---

## Threading (MANDATORY)

### Why Threading is Required

**Sequential processing is unacceptable performance.** CPU-intensive operations block the event loop and kill throughput.

### Worker Thread Pattern

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import HyperExpress from '@btc-vision/hyper-express';
import os from 'os';

if (isMainThread) {
    // Main thread: HTTP server only
    const app = new HyperExpress.Server();
    const workers: Worker[] = [];

    // Create worker pool
    const WORKER_COUNT = Math.max(1, os.cpus().length - 1);

    for (let i = 0; i < WORKER_COUNT; i++) {
        workers.push(new Worker(__filename));
    }

    let workerIndex = 0;

    /**
     * Get next worker in round-robin fashion.
     */
    function getWorker(): Worker {
        const worker = workers[workerIndex];
        workerIndex = (workerIndex + 1) % workers.length;
        return worker;
    }

    app.post('/simulate', async (req, res) => {
        const body = await req.json();
        const worker = getWorker();

        // Send work to worker
        worker.postMessage({ type: 'simulate', data: body });

        // Wait for result
        worker.once('message', (result) => {
            res.json(result);
        });
    });

    app.listen(3000);
    console.log('Main thread: HTTP server on port 3000');
} else {
    // Worker thread: CPU-intensive operations
    parentPort?.on('message', async (msg: WorkerMessage) => {
        if (msg.type === 'simulate') {
            const result = await simulateContract(msg.data);
            parentPort?.postMessage(result);
        }
    });

    console.log('Worker thread started');
}
```

### Thread-Safe Service Pattern

```typescript
/**
 * Thread-safe service that delegates CPU work to workers.
 */
class SimulationService {
    private readonly workers: Worker[] = [];
    private readonly pendingRequests: Map<
        string,
        { resolve: (value: SimulationResult) => void; reject: (error: Error) => void }
    > = new Map();
    private workerIndex: number = 0;

    public constructor(workerCount: number = os.cpus().length - 1) {
        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker('./simulation-worker.js');
            worker.on('message', (msg) => this.handleWorkerMessage(msg));
            worker.on('error', (err) => this.handleWorkerError(err));
            this.workers.push(worker);
        }
    }

    /**
     * Submit simulation request to worker pool.
     *
     * @param request - Simulation parameters
     * @returns Simulation result
     */
    public async simulate(request: SimulationRequest): Promise<SimulationResult> {
        const requestId = crypto.randomUUID();

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });

            const worker = this.workers[this.workerIndex];
            this.workerIndex = (this.workerIndex + 1) % this.workers.length;

            worker.postMessage({
                requestId,
                type: 'simulate',
                data: request,
            });
        });
    }

    /**
     * Handle message from worker.
     */
    private handleWorkerMessage(msg: WorkerResponse): void {
        const pending = this.pendingRequests.get(msg.requestId);
        if (pending) {
            this.pendingRequests.delete(msg.requestId);
            if (msg.error) {
                pending.reject(new Error(msg.error));
            } else {
                pending.resolve(msg.result);
            }
        }
    }

    /**
     * Handle worker error.
     */
    private handleWorkerError(error: Error): void {
        console.error('Worker error:', error);
    }
}
```

---

## RPC Call Optimization

### Use `.metadata()` Instead of Multiple Calls

**WRONG - 4+ separate RPC calls:**
```typescript
// ❌ BAD - 4 RPC calls for basic token info (slow)
const [name, symbol, decimals, totalSupply] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.totalSupply()
]);
```

**CORRECT - 1 RPC call:**
```typescript
// ✅ GOOD - 1 RPC call returns ALL token info (fast)
const metadata = (await contract.metadata()).properties;
const { name, symbol, decimals, totalSupply, owner } = metadata;
```

**Why this matters for backend:**
- Each RPC call = network latency + processing time
- 4 calls × 100 requests/sec = 400 RPC calls/sec
- 1 call × 100 requests/sec = 100 RPC calls/sec
- **4x reduction in RPC load**
- Lower latency for API consumers

---

## Caching (MANDATORY)

### Cache Everything

```typescript
interface CacheEntry<T> {
    readonly data: T;
    readonly block: number;
    readonly expiresAt: number;
}

/**
 * Multi-level cache with block-aware invalidation.
 */
class ApiCache {
    private readonly memory: Map<string, CacheEntry<unknown>> = new Map();
    private currentBlock: number = 0;

    public constructor() {
        // Cleanup expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Get cached value or fetch fresh.
     *
     * @param key - Cache key
     * @param fetcher - Function to fetch fresh data
     * @param options - Cache options
     * @returns Cached or fresh data
     */
    public async get<T>(
        key: string,
        fetcher: () => Promise<T>,
        options: {
            ttl: number;
            blockSensitive: boolean;
        }
    ): Promise<T> {
        // Check memory cache
        const cached = this.memory.get(key) as CacheEntry<T> | undefined;

        if (cached) {
            const blockValid =
                !options.blockSensitive || cached.block === this.currentBlock;
            const timeValid = Date.now() < cached.expiresAt;

            if (blockValid && timeValid) {
                return cached.data;
            }
        }

        // Fetch fresh data
        const data = await fetcher();
        const entry: CacheEntry<T> = {
            data,
            block: this.currentBlock,
            expiresAt: Date.now() + options.ttl,
        };

        this.memory.set(key, entry);
        return data;
    }

    /**
     * Update current block number.
     */
    public setCurrentBlock(block: number): void {
        if (block !== this.currentBlock) {
            this.currentBlock = block;
            this.invalidateBlockSensitive();
        }
    }

    /**
     * Invalidate all block-sensitive entries.
     */
    private invalidateBlockSensitive(): void {
        for (const [key, entry] of this.memory) {
            if (entry.block !== this.currentBlock) {
                this.memory.delete(key);
            }
        }
    }

    /**
     * Cleanup expired entries.
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.memory) {
            if (entry.expiresAt < now) {
                this.memory.delete(key);
            }
        }
    }
}
```

### Cache Usage Pattern

```typescript
class TokenService {
    private readonly cache: ApiCache;
    private readonly provider: JSONRpcProvider;

    public constructor(cache: ApiCache, provider: JSONRpcProvider) {
        this.cache = cache;
        this.provider = provider;
    }

    /**
     * Get token info (cached forever - immutable).
     */
    public async getTokenInfo(address: string): Promise<TokenInfo> {
        return this.cache.get(
            `token:info:${address}`,
            async () => {
                const contract = await getContract(address, OP_20_ABI, this.provider);
                const [name, symbol, decimals] = await Promise.all([
                    contract.name(),
                    contract.symbol(),
                    contract.decimals(),
                ]);
                return {
                    address,
                    name: name.properties.name,
                    symbol: symbol.properties.symbol,
                    decimals: decimals.properties.decimals,
                };
            },
            { ttl: Infinity, blockSensitive: false }
        );
    }

    /**
     * Get token balance (cached until block change).
     */
    public async getBalance(
        contractAddr: string,
        userAddr: string
    ): Promise<bigint> {
        return this.cache.get(
            `token:balance:${contractAddr}:${userAddr}`,
            async () => {
                const contract = await getContract(contractAddr, OP_20_ABI, this.provider);
                const result = await contract.balanceOf(userAddr);
                return result.properties.balance;
            },
            { ttl: 30000, blockSensitive: true }
        );
    }
}
```

---

## Provider and Contract Management

### Provider Note

**WebSocketProvider is EXPERIMENTAL.** Use `JSONRpcProvider` for production backend code until WebSocket support is stable.

### Singleton Provider (JSONRpcProvider)

```typescript
/**
 * Singleton provider manager.
 */
class ProviderManager {
    private static instance: ProviderManager;
    private readonly providers: Map<Networks, JSONRpcProvider> = new Map();

    private constructor() {}

    public static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    /**
     * Get or create provider for network.
     *
     * @param network - Target network
     * @returns Provider instance
     */
    public getProvider(network: Networks): JSONRpcProvider {
        if (!this.providers.has(network)) {
            const url = this.getRpcUrl(network);
            this.providers.set(network, new JSONRpcProvider(url, network));
        }
        return this.providers.get(network)!;
    }

    private getRpcUrl(network: Networks): string {
        switch (network) {
            case Networks.Mainnet:
                return process.env.MAINNET_RPC_URL ?? 'https://api.opnet.org';
            case Networks.Regtest:
                return process.env.REGTEST_RPC_URL ?? 'http://localhost:9001';
            default:
                throw new Error(`Unsupported network: ${network}`);
        }
    }
}
```

### Contract Cache

```typescript
/**
 * Contract instance cache.
 */
class ContractCache {
    private readonly contracts: Map<string, IOP20Contract> = new Map();
    private readonly providerManager: ProviderManager;

    public constructor() {
        this.providerManager = ProviderManager.getInstance();
    }

    /**
     * Get or create contract instance.
     *
     * @param address - Contract address
     * @param network - Target network
     * @returns Contract instance
     */
    public async getContract(
        address: string,
        network: Networks
    ): Promise<IOP20Contract> {
        const key = `${network}:${address}`;

        if (!this.contracts.has(key)) {
            const provider = this.providerManager.getProvider(network);
            const contract = await getContract<IOP20Contract>(
                address,
                OP_20_ABI,
                provider
            );
            this.contracts.set(key, contract);
        }

        return this.contracts.get(key)!;
    }

    /**
     * Clear cache (on network switch, etc.).
     */
    public clear(): void {
        this.contracts.clear();
    }
}
```

### Address and Public Key Handling (CRITICAL)

**Contract addresses**: Both `op1...` and `0x...` formats are valid for `getContract()`.

**Public keys for operations**: MUST be hexadecimal format (`0x...`).

### AddressVerificator (ALWAYS USE)

**Use `AddressVerificator` from `@btc-vision/transaction` for ALL address validation:**

```typescript
import { AddressVerificator } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

// Validate any Bitcoin address
const isValid = AddressVerificator.isValidAddress(address, networks.bitcoin);

// Validate specific address types
const isP2TR = AddressVerificator.isValidP2TRAddress(address, networks.bitcoin);
const isP2WPKH = AddressVerificator.isP2WPKHAddress(address, networks.bitcoin);
const isLegacy = AddressVerificator.isP2PKHOrP2SH(address, networks.bitcoin);

// Validate OPNet contract address (op1...)
const isOPNetContract = AddressVerificator.isValidP2OPAddress(address, networks.bitcoin);

// Validate public key (hex format)
const isPubKeyValid = AddressVerificator.isValidPublicKey(pubKey, networks.bitcoin);

// Detect address type
const addressType = AddressVerificator.detectAddressType(address, networks.bitcoin);
// Returns: AddressTypes.P2TR, AddressTypes.P2WPKH, AddressTypes.P2PKH, null (invalid)
```

**API Validation Example:**

```typescript
import { AddressVerificator } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

app.post('/api/transfer', async (req, res) => {
    const { to, amount } = req.body;

    // Validate address format first
    if (!AddressVerificator.isValidAddress(to, networks.bitcoin) &&
        !AddressVerificator.isValidPublicKey(to, networks.bitcoin) &&
        !AddressVerificator.isValidP2OPAddress(to, networks.bitcoin)) {
        res.status(400).json({ error: 'Invalid address format' });
        return;
    }

    // Continue with public key resolution...
});
```

### Public Key Resolution

```typescript
import { AddressVerificator } from '@btc-vision/transaction';

/**
 * Public key resolver service.
 * Converts Bitcoin addresses to public keys for contract operations.
 * Uses AddressVerificator for validation.
 */
class PublicKeyResolver {
    private readonly cache: Map<string, string> = new Map();
    private readonly providerManager: ProviderManager;

    public constructor() {
        this.providerManager = ProviderManager.getInstance();
    }

    /**
     * Resolve Bitcoin address to public key.
     * Returns null if not found - caller MUST handle this case.
     *
     * @param address - Bitcoin address (bc1q...) or public key (0x...)
     * @param network - Target network
     * @returns Public key in hex format, or null if not found
     */
    public async resolve(
        address: string,
        network: Networks
    ): Promise<string | null> {
        // Already a public key - validate it
        if (address.startsWith('0x')) {
            if (!AddressVerificator.isValidPublicKey(address, network)) {
                return null; // Invalid public key
            }
            return address;
        }

        // Validate address format first
        if (!AddressVerificator.isValidAddress(address, network)) {
            return null; // Invalid address format
        }

        const cacheKey = `${network}:${address}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const provider = this.providerManager.getProvider(network);
        const info = await provider.getPublicKeyInfo(address);

        if (!info || !info.publicKey) {
            return null; // Not found - caller must require manual input
        }

        this.cache.set(cacheKey, info.publicKey);
        return info.publicKey;
    }

    /**
     * Resolve or throw if not found.
     * Use when public key is required.
     */
    public async resolveOrThrow(
        address: string,
        network: Networks
    ): Promise<string> {
        const pubKey = await this.resolve(address, network);

        if (!pubKey) {
            throw new Error(
                `Public key not found for address: ${address}. ` +
                `User must provide the destination public key manually.`
            );
        }

        return pubKey;
    }
}
```

**API Endpoint Example:**

```typescript
// Transfer endpoint that properly handles public keys
app.post('/api/transfer', async (req, res) => {
    const { to, amount } = req.body;

    // Try to resolve public key
    const resolver = new PublicKeyResolver();
    const pubKey = await resolver.resolve(to, network);

    if (!pubKey) {
        // Return error - client must provide public key
        res.status(400).json({
            error: 'PUBLIC_KEY_REQUIRED',
            message: 'Public key not found for destination address. Please provide the recipient public key.',
            requiresPublicKey: true,
        });
        return;
    }

    // Now safe to use hex public key
    const result = await contract.transfer(pubKey, BigInt(amount));
    res.json({ success: true, txId: result.txId });
});
```

**Address Format Rules:**

| Context | op1 Address | 0x Address | bc1q/tb1q Address |
|---------|-------------|------------|-------------------|
| `getContract()` | ✅ Valid | ✅ Valid | ❌ Invalid |
| `transfer()` / operations | ❌ Must convert | ✅ Valid | ❌ Must convert |

---

## Error Handling

### Consistent Error Responses

```typescript
interface ApiError {
    readonly error: string;
    readonly code: string;
    readonly details?: unknown;
}

/**
 * API error handler.
 */
class ErrorHandler {
    /**
     * Handle and format error response.
     */
    public static handle(
        error: unknown,
        res: HyperExpress.Response
    ): void {
        if (error instanceof ValidationError) {
            res.status(400).json({
                error: error.message,
                code: 'VALIDATION_ERROR',
                details: error.details,
            });
            return;
        }

        if (error instanceof NotFoundError) {
            res.status(404).json({
                error: error.message,
                code: 'NOT_FOUND',
            });
            return;
        }

        // Log unexpected errors
        console.error('Unexpected error:', error);

        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
        });
    }
}

// Usage in routes
this.app.get('/v1/token/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const token = await this.tokenService.getToken(address);
        res.json(token);
    } catch (error) {
        ErrorHandler.handle(error, res);
    }
});
```

---

## Common Backend Mistakes

### 1. Using Express/Fastify

**WRONG:**
```typescript
import express from 'express';
const app = express();
```

**CORRECT:**
```typescript
import HyperExpress from '@btc-vision/hyper-express';
const app = new HyperExpress.Server();
```

### 2. Sequential Processing

**WRONG:**
```typescript
// All CPU work on main thread
app.post('/simulate', async (req, res) => {
    const result = await heavySimulation(req.body); // Blocks event loop!
});
```

**CORRECT:**
```typescript
// Delegate to worker
app.post('/simulate', async (req, res) => {
    const result = await simulationService.simulate(req.body);
    res.json(result);
});
```

### 3. Creating Multiple Provider Instances

**WRONG:**
```typescript
app.get('/balance/:address', async (req, res) => {
    const provider = new JSONRpcProvider(url, network); // New instance per request!
});
```

**CORRECT:**
```typescript
const provider = ProviderManager.getInstance().getProvider(network);
```

### 4. No Caching

**WRONG:**
```typescript
// Fetches from RPC every request
app.get('/token/:address', async (req, res) => {
    const info = await fetchTokenInfo(req.params.address);
});
```

**CORRECT:**
```typescript
// Cached
app.get('/token/:address', async (req, res) => {
    const info = await cache.get(
        `token:${req.params.address}`,
        () => fetchTokenInfo(req.params.address),
        { ttl: Infinity, blockSensitive: false }
    );
});
```

### 5. Missing Input Validation

**WRONG:**
```typescript
app.get('/balance/:address', async (req, res) => {
    const balance = await getBalance(req.params.address); // No validation!
});
```

**CORRECT:**
```typescript
app.get('/balance/:address', async (req, res) => {
    const { address } = req.params;
    if (!AddressVerificator.isValidAddress(address, networks.bitcoin)) {
        res.status(400).json({ error: 'Invalid address' });
        return;
    }
    const balance = await getBalance(address);
});
```

### 6. Using `any`

**WRONG:**
```typescript
app.post('/data', async (req, res) => {
    const body: any = await req.json();
});
```

**CORRECT:**
```typescript
interface RequestBody {
    readonly address: string;
    readonly amount: string;
}

app.post('/data', async (req, res) => {
    const body: RequestBody = await req.json();
});
```

---

## Security Checklist

### Input Validation
- [ ] All addresses validated with AddressVerificator
- [ ] All numeric inputs validated and bounded
- [ ] Request body size limited
- [ ] Rate limiting implemented

### Type Safety
- [ ] NO `any` type anywhere
- [ ] All functions have explicit return types
- [ ] Request/response types defined
- [ ] Strict TypeScript settings enabled

### Performance
- [ ] Threading for CPU-intensive work
- [ ] Provider and contracts cached
- [ ] API responses cached with TTL
- [ ] Block-sensitive cache invalidation

### Code Quality
- [ ] TSDoc for all public methods
- [ ] No section separator comments
- [ ] Classes over scattered functions
- [ ] Singleton pattern for shared resources

### Operational
- [ ] Health check endpoint
- [ ] Error responses consistent
- [ ] Logging for errors and important events
- [ ] CORS configured properly

---

## Summary

1. **READ THE TYPESCRIPT LAW** - Non-negotiable
2. **Use HyperExpress/uWebSockets.js** - No Express/Fastify
3. **Threading is mandatory** - No blocking the event loop
4. **Cache everything** - Providers, contracts, responses
5. **Validate all input** - Never trust user data
6. **Use classes** - No scattered functions
