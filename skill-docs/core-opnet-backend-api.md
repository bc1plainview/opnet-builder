# OPNet Backend API Development

This guide covers building high-performance backend APIs for OPNet applications using the mandatory OPNet frameworks.

## Required Frameworks

**MANDATORY** - Use these OPNet-optimized libraries:

| Package | Purpose | Performance |
|---------|---------|-------------|
| `@btc-vision/hyper-express` | HTTP server | Fastest Node.js HTTP framework |
| `@btc-vision/uwebsocket.js` | WebSocket server | Fastest WebSocket implementation |

**FORBIDDEN** - Do NOT use:
- Express.js
- Fastify
- Koa
- Hapi
- Any other HTTP framework

These alternatives are significantly slower and will bottleneck your application.

## Installation

```bash
npm install @btc-vision/hyper-express @btc-vision/uwebsocket.js
npm install opnet @btc-vision/transaction @btc-vision/bitcoin
```

## Architecture Principles

### 1. Use Classes (Not Functions)

```typescript
// WRONG - Function-based handlers
app.get('/balance/:address', async (req, res) => {
    // ... logic
});

// CORRECT - Class-based architecture
class BalanceController {
    private readonly provider: JSONRpcProvider;
    private readonly cache: Map<string, CachedBalance> = new Map();

    constructor(provider: JSONRpcProvider) {
        this.provider = provider;
    }

    async getBalance(address: string): Promise<bigint> {
        // Cached, optimized logic
    }
}
```

### 2. Threading (MANDATORY)

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import HyperExpress from '@btc-vision/hyper-express';

if (isMainThread) {
    // Main thread: HTTP server
    const app = new HyperExpress.Server();
    const workers: Worker[] = [];

    // Create worker pool
    const WORKER_COUNT = Math.max(1, require('os').cpus().length - 1);
    for (let i = 0; i < WORKER_COUNT; i++) {
        workers.push(new Worker(__filename));
    }

    let workerIndex = 0;
    function getWorker(): Worker {
        const worker = workers[workerIndex];
        workerIndex = (workerIndex + 1) % workers.length;
        return worker;
    }

    app.post('/simulate', async (req, res) => {
        const body = await req.json();
        const worker = getWorker();

        worker.postMessage({ type: 'simulate', data: body });
        worker.once('message', (result) => {
            res.json(result);
        });
    });

    app.listen(3000);
} else {
    // Worker thread: CPU-intensive operations
    parentPort?.on('message', async (msg) => {
        if (msg.type === 'simulate') {
            const result = await simulateContract(msg.data);
            parentPort?.postMessage(result);
        }
    });
}
```

### 3. Provider Singleton

```typescript
class OPNetService {
    private static instance: OPNetService;
    private readonly provider: JSONRpcProvider;
    private readonly contractCache: Map<string, IOP20Contract> = new Map();

    private constructor() {
        this.provider = new JSONRpcProvider(
            process.env.OPNET_RPC_URL!,
            networks.bitcoin
        );
    }

    static getInstance(): OPNetService {
        if (!OPNetService.instance) {
            OPNetService.instance = new OPNetService();
        }
        return OPNetService.instance;
    }

    async getContract(address: string): Promise<IOP20Contract> {
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

## HyperExpress Server Setup

### Basic Server

```typescript
import HyperExpress from '@btc-vision/hyper-express';
import { JSONRpcProvider, getContract, OP_20_ABI } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

class OPNetAPI {
    private readonly app: HyperExpress.Server;
    private readonly provider: JSONRpcProvider;

    constructor() {
        this.app = new HyperExpress.Server();
        this.provider = new JSONRpcProvider(
            'https://mainnet.opnet.org/v1/json-rpc',
            networks.bitcoin
        );
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });

        // Get token balance
        this.app.get('/token/:contract/balance/:address', async (req, res) => {
            try {
                const { contract: contractAddr, address } = req.params;
                const balance = await this.getTokenBalance(contractAddr, address);
                res.json({ balance: balance.toString() });
            } catch (error) {
                res.status(500).json({ error: String(error) });
            }
        });

        // Simulate contract call
        this.app.post('/simulate', async (req, res) => {
            try {
                const body = await req.json();
                const result = await this.simulateCall(body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: String(error) });
            }
        });
    }

    private async getTokenBalance(contractAddr: string, address: string): Promise<bigint> {
        const contract = await getContract(contractAddr, OP_20_ABI, this.provider);
        const result = await contract.balanceOf(address);
        if ('error' in result) throw new Error(result.error);
        return result.decoded[0] as bigint;
    }

    private async simulateCall(params: SimulateParams): Promise<SimulateResult> {
        // Simulation logic
    }

    async start(port: number): Promise<void> {
        await this.app.listen(port);
        console.log(`OPNet API listening on port ${port}`);
    }
}

// Start server
const api = new OPNetAPI();
api.start(3000);
```

### With Request Validation

```typescript
import HyperExpress from '@btc-vision/hyper-express';
import { AddressVerificator } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

class ValidatedAPI {
    private readonly app: HyperExpress.Server;

    constructor() {
        this.app = new HyperExpress.Server();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        // Rate limiting
        const requestCounts = new Map<string, number>();

        this.app.use((req, res, next) => {
            const ip = req.ip;
            const count = (requestCounts.get(ip) || 0) + 1;
            requestCounts.set(ip, count);

            if (count > 100) { // 100 req/min
                res.status(429).json({ error: 'Rate limited' });
                return;
            }

            next();
        });

        // Reset counts every minute
        setInterval(() => requestCounts.clear(), 60000);
    }

    private setupRoutes(): void {
        this.app.get('/balance/:address', async (req, res) => {
            const { address } = req.params;

            // Validate address
            if (!AddressVerificator.isValidAddress(address, networks.bitcoin)) {
                res.status(400).json({ error: 'Invalid Bitcoin address' });
                return;
            }

            // Process request
            const balance = await this.getBalance(address);
            res.json({ address, balance: balance.toString() });
        });
    }
}
```

## WebSocket Server with uWebSockets.js

### Real-Time Updates

```typescript
import uWS from '@btc-vision/uwebsocket.js';
import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

interface Subscription {
    type: 'blocks' | 'token' | 'address';
    filter?: string;
}

class OPNetWebSocket {
    private readonly app: uWS.TemplatedApp;
    private readonly provider: JSONRpcProvider;
    private readonly subscriptions: Map<uWS.WebSocket, Subscription[]> = new Map();
    private currentBlock: number = 0;

    constructor() {
        this.provider = new JSONRpcProvider(
            'https://mainnet.opnet.org/v1/json-rpc',
            networks.bitcoin
        );

        this.app = uWS.App()
            .ws('/*', {
                open: (ws) => {
                    this.subscriptions.set(ws, []);
                    console.log('Client connected');
                },
                message: (ws, message, isBinary) => {
                    this.handleMessage(ws, message);
                },
                close: (ws) => {
                    this.subscriptions.delete(ws);
                    console.log('Client disconnected');
                }
            });

        this.startBlockWatcher();
    }

    private handleMessage(ws: uWS.WebSocket, message: ArrayBuffer): void {
        const data = JSON.parse(Buffer.from(message).toString());

        switch (data.action) {
            case 'subscribe':
                this.subscribe(ws, data.subscription);
                break;
            case 'unsubscribe':
                this.unsubscribe(ws, data.subscription);
                break;
        }
    }

    private subscribe(ws: uWS.WebSocket, sub: Subscription): void {
        const subs = this.subscriptions.get(ws) || [];
        subs.push(sub);
        this.subscriptions.set(ws, subs);

        ws.send(JSON.stringify({ type: 'subscribed', subscription: sub }));
    }

    private unsubscribe(ws: uWS.WebSocket, sub: Subscription): void {
        const subs = this.subscriptions.get(ws) || [];
        const filtered = subs.filter(s => s.type !== sub.type || s.filter !== sub.filter);
        this.subscriptions.set(ws, filtered);
    }

    private async startBlockWatcher(): Promise<void> {
        setInterval(async () => {
            const block = await this.provider.getBlockNumber();
            if (block !== this.currentBlock) {
                this.currentBlock = Number(block);
                this.broadcastBlockUpdate(this.currentBlock);
            }
        }, 5000);
    }

    private broadcastBlockUpdate(block: number): void {
        const message = JSON.stringify({ type: 'block', height: block });

        this.subscriptions.forEach((subs, ws) => {
            if (subs.some(s => s.type === 'blocks')) {
                ws.send(message);
            }
        });
    }

    listen(port: number): void {
        this.app.listen(port, (token) => {
            if (token) {
                console.log(`WebSocket server listening on port ${port}`);
            }
        });
    }
}

const wsServer = new OPNetWebSocket();
wsServer.listen(3001);
```

## Caching Layer

### Multi-Level Cache

```typescript
interface CacheEntry<T> {
    data: T;
    block: number;
    expiresAt: number;
}

class APICache {
    private readonly memory: Map<string, CacheEntry<unknown>> = new Map();
    private readonly redis?: Redis; // Optional Redis for distributed caching

    constructor(redisUrl?: string) {
        if (redisUrl) {
            // this.redis = new Redis(redisUrl);
        }

        // Cleanup expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    async get<T>(
        key: string,
        fetcher: () => Promise<T>,
        options: { ttl: number; blockSensitive: boolean; currentBlock?: number }
    ): Promise<T> {
        // Check memory cache
        const memCached = this.memory.get(key) as CacheEntry<T> | undefined;
        if (memCached) {
            const blockValid = !options.blockSensitive ||
                memCached.block === options.currentBlock;
            const timeValid = Date.now() < memCached.expiresAt;

            if (blockValid && timeValid) {
                return memCached.data;
            }
        }

        // Fetch fresh data
        const data = await fetcher();
        const entry: CacheEntry<T> = {
            data,
            block: options.currentBlock || 0,
            expiresAt: Date.now() + options.ttl
        };

        this.memory.set(key, entry);
        return data;
    }

    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        for (const key of this.memory.keys()) {
            if (regex.test(key)) {
                this.memory.delete(key);
            }
        }
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.memory.entries()) {
            if (entry.expiresAt < now) {
                this.memory.delete(key);
            }
        }
    }
}
```

## Full Example: Production API

```typescript
import HyperExpress from '@btc-vision/hyper-express';
import uWS from '@btc-vision/uwebsocket.js';
import { Worker, isMainThread, parentPort } from 'worker_threads';
import { JSONRpcProvider, getContract, OP_20_ABI, IOP20Contract } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { AddressVerificator } from '@btc-vision/transaction';

class OPNetProductionAPI {
    private readonly httpApp: HyperExpress.Server;
    private readonly provider: JSONRpcProvider;
    private readonly contractCache: Map<string, IOP20Contract> = new Map();
    private readonly dataCache: Map<string, { data: unknown; expires: number }> = new Map();
    private currentBlock: number = 0;

    constructor() {
        this.httpApp = new HyperExpress.Server({
            max_body_length: 1024 * 1024 // 1MB
        });

        this.provider = new JSONRpcProvider(
            process.env.OPNET_RPC_URL || 'https://mainnet.opnet.org/v1/json-rpc',
            networks.bitcoin
        );

        this.setupRoutes();
        this.startBlockWatcher();
    }

    private setupRoutes(): void {
        // CORS
        this.httpApp.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
                res.status(204).send();
                return;
            }
            next();
        });

        // Routes
        this.httpApp.get('/v1/block', (req, res) => {
            res.json({ height: this.currentBlock });
        });

        this.httpApp.get('/v1/token/:contract', async (req, res) => {
            await this.handleTokenInfo(req, res);
        });

        this.httpApp.get('/v1/token/:contract/balance/:address', async (req, res) => {
            await this.handleTokenBalance(req, res);
        });
    }

    private async handleTokenInfo(req: HyperExpress.Request, res: HyperExpress.Response): Promise<void> {
        const { contract: addr } = req.params;
        const cacheKey = `token:${addr}`;

        try {
            // Token info is immutable - cache forever
            const cached = this.dataCache.get(cacheKey);
            if (cached) {
                res.json(cached.data);
                return;
            }

            const contract = await this.getContract(addr);
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals(),
                contract.totalSupply()
            ]);

            const data = {
                address: addr,
                name: name.decoded[0],
                symbol: symbol.decoded[0],
                decimals: Number(decimals.decoded[0]),
                totalSupply: (totalSupply.decoded[0] as bigint).toString()
            };

            this.dataCache.set(cacheKey, { data, expires: Infinity });
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    private async handleTokenBalance(req: HyperExpress.Request, res: HyperExpress.Response): Promise<void> {
        const { contract: contractAddr, address } = req.params;

        // Validate
        if (!AddressVerificator.isValidAddress(address, networks.bitcoin)) {
            res.status(400).json({ error: 'Invalid address' });
            return;
        }

        const cacheKey = `balance:${contractAddr}:${address}:${this.currentBlock}`;

        try {
            const cached = this.dataCache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                res.json(cached.data);
                return;
            }

            const contract = await this.getContract(contractAddr);
            const result = await contract.balanceOf(address);

            if ('error' in result) {
                res.status(400).json({ error: result.error });
                return;
            }

            const data = {
                address,
                balance: (result.decoded[0] as bigint).toString(),
                block: this.currentBlock
            };

            // Cache for 30 seconds or until block change
            this.dataCache.set(cacheKey, { data, expires: Date.now() + 30000 });
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    private async getContract(address: string): Promise<IOP20Contract> {
        if (!this.contractCache.has(address)) {
            const contract = await getContract<IOP20Contract>(address, OP_20_ABI, this.provider);
            this.contractCache.set(address, contract);
        }
        return this.contractCache.get(address)!;
    }

    private startBlockWatcher(): void {
        setInterval(async () => {
            try {
                const block = await this.provider.getBlockNumber();
                if (Number(block) !== this.currentBlock) {
                    this.currentBlock = Number(block);
                    // Invalidate block-sensitive caches
                    for (const key of this.dataCache.keys()) {
                        if (key.startsWith('balance:')) {
                            this.dataCache.delete(key);
                        }
                    }
                }
            } catch (error) {
                console.error('Block watcher error:', error);
            }
        }, 5000);
    }

    async start(port: number): Promise<void> {
        await this.httpApp.listen(port);
        console.log(`OPNet API running on port ${port}`);
    }
}

// Start
const api = new OPNetProductionAPI();
api.start(parseInt(process.env.PORT || '3000'));
```

## Related Documentation

- [OPNet Providers](./providers/json-rpc-provider.md)
- [Threading](./providers/threaded-http.md)
- [Contract Interaction](./contracts/overview.md)
- [TypeScript Law](../typescript-law/readme.md)
