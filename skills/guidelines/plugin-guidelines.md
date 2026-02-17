# OPNet Plugin Development Guidelines

**Read `setup-guidelines.md` FIRST for project setup and package versions.**

This document covers plugin architecture, lifecycle hooks, database access, reorg handling, and best practices.

### MANDATORY: Always Update Packages

**After `npm install`, ALWAYS run:**

```bash
npx npm-check-updates -u && npm install
```

---

## Table of Contents

1. [TypeScript Law (MANDATORY)](#typescript-law-mandatory)
2. [Mandatory Reading Order](#mandatory-reading-order)
3. [Package Versions](#package-versions)
4. [Plugin Structure](#plugin-structure)
5. [Plugin Manifest](#plugin-manifest)
6. [Lifecycle Hooks](#lifecycle-hooks)
7. [Database Access](#database-access)
8. [Reorg Handling (CRITICAL)](#reorg-handling-critical)
9. [Common Plugin Mistakes](#common-plugin-mistakes)
10. [Security Checklist](#security-checklist)

---

## TypeScript Law (MANDATORY)

**BEFORE WRITING ANY PLUGIN CODE, YOU MUST READ AND FOLLOW:**

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

**This guideline is a SUMMARY. You MUST read the following docs files IN ORDER before writing plugin code:**

| Order | File | Contains |
|-------|------|----------|
| 1 | `docs/core-typescript-law-CompleteLaw.md` | Type rules, forbidden constructs |
| 2 | `guidelines/setup-guidelines.md` | Package versions |
| 3 | `guidelines/plugin-guidelines.md` | This file - summary of patterns |
| 4 | `docs/core-OIP-OIP-0003.md` | **PLUGIN SPECIFICATION** - Full spec |
| 5 | `docs/plugins-plugin-sdk-README.md` | SDK reference |
| 6 | `docs/plugins-opnet-node-README.md` | Node integration |

**CRITICAL:** You MUST implement `onReorg()` to handle chain reorganizations or your data will be inconsistent.

**IF YOU SKIP THESE DOCS, YOUR PLUGIN WILL HAVE DATA CONSISTENCY ISSUES.**

---

## Package Versions

**NEVER GUESS PACKAGE VERSIONS.**

```json
{
    "type": "module",
    "dependencies": {
        "@btc-vision/plugin-sdk": "^1.0.0",
        "opnet": "1.8.1-beta.13",
        "@btc-vision/transaction": "1.8.0-beta.10",
        "@btc-vision/bitcoin": "7.0.0-alpha.11"
    },
    "devDependencies": {
        "typescript": "latest",
        "bytenode": "latest",
        "gulp": "latest",
        "@types/node": "latest"
    },
    "overrides": {
        "@noble/hashes": "2.0.1"
    }
}
```

---

## Plugin Structure

### Directory Layout

```
my-plugin/
├── src/
│   ├── index.ts              # Main plugin class (exports default)
│   ├── handlers/             # Event handlers (classes)
│   ├── services/             # Business logic (singleton classes)
│   └── types/                # Type definitions
├── dist/                     # Compiled output
├── plugin.json               # Plugin manifest
├── package.json
├── tsconfig.json
└── gulpfile.js               # Build config
```

### Main Plugin Class

```typescript
import {
    PluginBase,
    IPluginContext,
    IBlockProcessedData,
    IReorgData,
    IEpochData,
} from '@btc-vision/plugin-sdk';

/**
 * My OPNet plugin for indexing OP20 transfers.
 *
 * @example
 * ```typescript
 * // Plugin is loaded automatically by OPNet node
 * // Configure in opnet.toml: plugins = ["my-plugin"]
 * ```
 */
export default class MyPlugin extends PluginBase {
    private readonly blockHandler: BlockHandler;

    public constructor() {
        super();
        this.blockHandler = new BlockHandler();
    }

    /**
     * Called when plugin is loaded. Initialize resources here.
     *
     * @param context - Runtime context with logger, db, config
     */
    public override async onLoad(context: IPluginContext): Promise<void> {
        await super.onLoad(context);
        this.context.logger.info('MyPlugin loaded');

        // Initialize database indexes
        if (this.context.db) {
            await this.context.db
                .collection('transfers')
                .createIndex({ blockHeight: -1 });
        }
    }

    /**
     * Called on new confirmed block.
     *
     * @param block - Block data with OPNet transactions
     */
    public override async onBlockChange(block: IBlockProcessedData): Promise<void> {
        await this.blockHandler.processBlock(block, this.context);
    }

    /**
     * CRITICAL: Handle chain reorganization.
     * MUST delete all data for reorged blocks.
     *
     * @param reorg - Reorg data with fromBlock and toBlock
     */
    public override async onReorg(reorg: IReorgData): Promise<void> {
        this.context.logger.warn(
            `Reorg detected: blocks ${reorg.fromBlock} to ${reorg.toBlock}`
        );

        if (this.context.db) {
            await this.context.db.collection('transfers').deleteMany({
                blockHeight: { $gte: reorg.fromBlock },
            });
        }
    }

    /**
     * Called when plugin is unloaded. Cleanup resources.
     */
    public override async onUnload(): Promise<void> {
        this.context.logger.info('MyPlugin unloading');
    }
}
```

---

## Plugin Manifest

### plugin.json

```json
{
    "name": "my-plugin",
    "version": "1.0.0",
    "description": "Indexes OP20 transfers for analytics",
    "opnetVersion": "^1.0.0",
    "main": "dist/index.jsc",
    "target": "bytenode",
    "type": "plugin",
    "checksum": "sha256:abc123...",
    "author": {
        "name": "Your Name",
        "email": "you@example.com"
    },
    "pluginType": "standalone",
    "permissions": {
        "database": {
            "enabled": true,
            "collections": ["my-plugin_transfers", "my-plugin_stats"]
        },
        "blocks": {
            "preProcess": false,
            "postProcess": false,
            "onChange": true
        },
        "epochs": {
            "onChange": false,
            "onFinalized": false
        },
        "mempool": {
            "txFeed": false
        },
        "api": {
            "addEndpoints": false,
            "addWebsocket": false
        },
        "filesystem": {
            "configDir": true,
            "tempDir": true
        }
    }
}
```

### Permission Rules

| Permission | When to Enable |
|------------|----------------|
| `database.enabled` | You need persistent storage |
| `blocks.onChange` | You react to new blocks (most plugins) |
| `blocks.preProcess` | You need raw Bitcoin block data |
| `blocks.postProcess` | You need processed OPNet data before confirmation |
| `epochs.onChange` | You track epoch boundaries |
| `epochs.onFinalized` | You need finalized merkle proofs |
| `mempool.txFeed` | You need unconfirmed transactions |
| `api.addEndpoints` | You expose REST endpoints |
| `api.addWebsocket` | You expose WebSocket subscriptions |

**Request ONLY permissions you need.** Excessive permissions may cause rejection.

---

## Lifecycle Hooks

### Hook Reference

| Hook | When Called | Blocking | Use Case |
|------|-------------|----------|----------|
| `onLoad` | Plugin loaded | Yes | Initialize resources |
| `onUnload` | Plugin unloaded | Yes | Cleanup resources |
| `onEnable` | Plugin enabled | Yes | Resume operations |
| `onDisable` | Plugin disabled | Yes | Pause operations |
| `onBlockChange` | New block confirmed | No | Process confirmed data |
| `onBlockPreProcess` | Before block processing | Yes | Raw Bitcoin data |
| `onBlockPostProcess` | After block processing | Yes | Processed OPNet data |
| `onEpochChange` | Epoch number changed | No | Track epochs |
| `onEpochFinalized` | Epoch merkle complete | No | Finalization proofs |
| `onMempoolTransaction` | New mempool tx | No | Pending transactions |
| `onReorg` | Chain reorganization | **Yes (CRITICAL)** | **MUST handle** |
| `onReindexRequired` | Startup check | Yes | Verify data integrity |
| `onPurgeBlocks` | Purge block range | Yes | Delete historical data |

### Hook Implementation Pattern

```typescript
/**
 * Process new confirmed block.
 *
 * @param block - Block data including OPNet transactions
 */
public override async onBlockChange(block: IBlockProcessedData): Promise<void> {
    const { blockNumber, blockHash, transactions } = block;

    this.context.logger.debug(`Processing block ${blockNumber}`);

    for (const tx of transactions) {
        if (this.isTransferTransaction(tx)) {
            await this.indexTransfer(tx, blockNumber);
        }
    }

    // Update stats
    await this.updateBlockStats(blockNumber, transactions.length);
}

/**
 * Type guard for transfer transactions.
 */
private isTransferTransaction(tx: ITransaction): tx is ITransferTransaction {
    return tx.type === 'transfer' && tx.contract !== undefined;
}
```

---

## Database Access

### Collection Naming

**ALL collections MUST be prefixed with your plugin name:**

```typescript
// WRONG - Will be rejected
const collection = db.collection('transfers');

// CORRECT - Prefixed with plugin name
const collection = db.collection('my-plugin_transfers');
```

### Database Operations

```typescript
/**
 * Database service for transfer indexing.
 */
class TransferService {
    private readonly collectionName = 'my-plugin_transfers';

    /**
     * Index a transfer event.
     *
     * @param transfer - Transfer data to index
     * @param db - Plugin database API
     */
    public async indexTransfer(
        transfer: TransferData,
        db: IPluginDatabaseAPI
    ): Promise<void> {
        const collection = db.collection(this.collectionName);

        await collection.insertOne({
            txHash: transfer.txHash,
            from: transfer.from,
            to: transfer.to,
            amount: transfer.amount.toString(), // Store bigint as string
            blockHeight: transfer.blockHeight,
            timestamp: Date.now(),
        });
    }

    /**
     * Get transfers for an address.
     *
     * @param address - Bitcoin address
     * @param db - Plugin database API
     * @param limit - Maximum results
     * @returns Transfer records
     */
    public async getTransfers(
        address: string,
        db: IPluginDatabaseAPI,
        limit: number = 100
    ): Promise<TransferRecord[]> {
        const collection = db.collection(this.collectionName);

        return collection
            .find({
                $or: [{ from: address }, { to: address }],
            })
            .sort({ blockHeight: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * Delete transfers for reorged blocks.
     *
     * @param fromBlock - First reorged block
     * @param db - Plugin database API
     * @returns Number of deleted records
     */
    public async deleteFromBlock(
        fromBlock: number,
        db: IPluginDatabaseAPI
    ): Promise<number> {
        const collection = db.collection(this.collectionName);

        const result = await collection.deleteMany({
            blockHeight: { $gte: fromBlock },
        });

        return result.deletedCount;
    }
}
```

---

## Reorg Handling (CRITICAL)

### Why Reorgs Matter

Bitcoin undergoes chain reorganizations when competing blocks are found. When a reorg happens:

1. Blocks that were confirmed become orphaned
2. Transactions in those blocks may be re-ordered or dropped
3. **Your indexed data for those blocks is NOW INVALID**

**If you don't handle reorgs, your data will be inconsistent with the blockchain.**

### MANDATORY Reorg Implementation

```typescript
/**
 * CRITICAL: Handle chain reorganization.
 *
 * This hook MUST delete all data indexed for blocks >= fromBlock.
 * Failure to implement this correctly will cause data inconsistency.
 *
 * @param reorg - Reorg data with affected block range
 */
public override async onReorg(reorg: IReorgData): Promise<void> {
    const { fromBlock, toBlock } = reorg;

    this.context.logger.warn(
        `REORG: Reverting ${toBlock - fromBlock + 1} blocks from ${fromBlock}`
    );

    if (!this.context.db) {
        return;
    }

    // Delete ALL data for affected blocks
    const collections = ['transfers', 'stats', 'events'];

    for (const name of collections) {
        const collection = this.context.db.collection(`my-plugin_${name}`);
        const result = await collection.deleteMany({
            blockHeight: { $gte: fromBlock },
        });

        this.context.logger.info(
            `Deleted ${result.deletedCount} records from ${name}`
        );
    }

    // Reset any in-memory state
    this.resetStateToBlock(fromBlock - 1);
}

/**
 * Reset in-memory state to a specific block.
 *
 * @param blockHeight - Target block height
 */
private resetStateToBlock(blockHeight: number): void {
    // Clear caches
    this.cache.clear();

    // Reset counters
    this.lastProcessedBlock = blockHeight;

    // Reset any derived state
    this.runningTotals.clear();
}
```

### Reorg Testing

**You MUST test reorg handling:**

```typescript
// Test: Verify reorg deletes data correctly
await plugin.onBlockChange(mockBlock(100));
await plugin.onBlockChange(mockBlock(101));
await plugin.onBlockChange(mockBlock(102));

// Verify 3 blocks indexed
let count = await db.collection('my-plugin_transfers').countDocuments({});
assert.equal(count, 3);

// Simulate reorg from block 101
await plugin.onReorg({ fromBlock: 101, toBlock: 102 });

// Verify blocks 101-102 deleted
count = await db.collection('my-plugin_transfers').countDocuments({});
assert.equal(count, 1);

// Verify remaining data is for block 100
const remaining = await db.collection('my-plugin_transfers').findOne({});
assert.equal(remaining.blockHeight, 100);
```

---

## Common Plugin Mistakes

### 1. Not Handling Reorgs

**WRONG:**
```typescript
// Missing onReorg implementation
// Data becomes inconsistent after reorg
```

**CORRECT:**
```typescript
public override async onReorg(reorg: IReorgData): Promise<void> {
    await this.deleteDataFromBlock(reorg.fromBlock);
}
```

### 2. Unprefixed Collection Names

**WRONG:**
```typescript
db.collection('transfers'); // Conflicts with other plugins
```

**CORRECT:**
```typescript
db.collection('my-plugin_transfers');
```

### 3. Storing bigint as Number

**WRONG:**
```typescript
{
    amount: Number(transfer.amount) // Precision loss!
}
```

**CORRECT:**
```typescript
{
    amount: transfer.amount.toString() // Preserve precision
}
```

### 4. Blocking Hooks for Non-Critical Work

**WRONG:**
```typescript
public override async onBlockChange(block: IBlockProcessedData): Promise<void> {
    // Slow analytics in blocking hook
    await this.runExpensiveAnalytics(block);
}
```

**CORRECT:**
```typescript
public override async onBlockChange(block: IBlockProcessedData): Promise<void> {
    // Quick indexing only
    await this.indexBlock(block);

    // Queue slow work for background processing
    this.analyticsQueue.push(block.blockNumber);
}
```

### 5. Missing Type Guards

**WRONG:**
```typescript
const value = tx.data.amount; // Could be undefined
```

**CORRECT:**
```typescript
if (!this.isValidTransferData(tx.data)) {
    return;
}
const value = tx.data.amount; // Now safe
```

### 6. Using `any`

**WRONG:**
```typescript
async processData(data: any): Promise<void> {
    // No type safety
}
```

**CORRECT:**
```typescript
async processData(data: TransferEventData): Promise<void> {
    // Fully typed
}
```

---

## Security Checklist

Before deploying any plugin:

### Data Integrity
- [ ] Reorg handler deletes ALL affected data
- [ ] Database operations use proper indexes
- [ ] bigint values stored as strings (no precision loss)
- [ ] All collections prefixed with plugin name

### Type Safety
- [ ] NO `any` type anywhere
- [ ] All functions have explicit return types
- [ ] Type guards for external data
- [ ] Strict TypeScript settings enabled

### Performance
- [ ] Blocking hooks complete quickly
- [ ] Expensive operations queued for background
- [ ] Proper database indexes created
- [ ] Memory usage monitored

### Permissions
- [ ] Only required permissions requested
- [ ] Database collections match declared permissions
- [ ] No filesystem access unless needed

### Code Quality
- [ ] TSDoc for all public methods
- [ ] No section separator comments
- [ ] Classes over scattered functions
- [ ] Explicit access modifiers (public/private/readonly)

---

## Summary

1. **READ THE TYPESCRIPT LAW** - Non-negotiable
2. **Handle reorgs** - Data consistency depends on it
3. **Prefix collections** - Avoid conflicts
4. **Use proper types** - No `any`, explicit returns
5. **Test thoroughly** - Especially reorg handling
