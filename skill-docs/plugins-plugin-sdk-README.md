# @btc-vision/plugin-sdk

![Bitcoin](https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![Gulp](https://img.shields.io/badge/GULP-%23CF4647.svg?style=for-the-badge&logo=gulp&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

TypeScript SDK for developing OPNet node plugins. Provides type definitions, interfaces, and base classes for plugin development.

## Installation

```bash
npm install @btc-vision/plugin-sdk
```

## Quick Start

```typescript
import { PluginBase, IPluginContext, IBlockProcessedData, IReorgData } from '@btc-vision/plugin-sdk';

export default class MyPlugin extends PluginBase {
    public async onLoad(context: IPluginContext): Promise<void> {
        await super.onLoad(context);
        this.context.logger.info('Plugin loaded!');
    }

    public async onBlockChange(block: IBlockProcessedData): Promise<void> {
        this.context.logger.info(`New block: ${block.blockNumber}`);

        // Store data in plugin database
        if (this.context.db) {
            await this.context.db.collection('blocks').insertOne({
                height: block.blockNumber.toString(),
                hash: block.blockHash,
                timestamp: Date.now(),
            });
        }
    }

    public async onReorg(reorg: IReorgData): Promise<void> {
        // CRITICAL: Handle chain reorg - delete data for reorged blocks
        if (this.context.db) {
            await this.context.db.collection('blocks').deleteMany({
                height: { $gte: reorg.fromBlock.toString() },
            });
        }
    }
}
```

## Plugin Manifest (plugin.json)

Every plugin requires a `plugin.json` manifest file:

```json
{
    "name": "my-plugin",
    "version": "1.0.0",
    "opnetVersion": "^1.0.0",
    "main": "dist/index.jsc",
    "target": "bytenode",
    "type": "plugin",
    "checksum": "sha256:...",
    "author": { "name": "Your Name" },
    "pluginType": "standalone",
    "permissions": {
        "database": {
            "enabled": true,
            "collections": ["my-plugin_blocks"]
        },
        "blocks": {
            "onChange": true
        }
    }
}
```

## API Reference

See [OIP-0003](https://github.com/btc-vision/OIPs/blob/main/OIP-0003.md) for the complete specification.

### Core Interfaces

| Interface | Description |
|-----------|-------------|
| `IPlugin` | Main plugin interface with all lifecycle hooks |
| `IPluginContext` | Runtime context provided to plugins |
| `PluginBase` | Abstract base class with no-op defaults |

### Hook Types

#### Lifecycle Hooks
- `onLoad(context)` - Called when plugin is loaded
- `onUnload()` - Called when plugin is unloaded
- `onEnable()` - Called when plugin is enabled
- `onDisable()` - Called when plugin is disabled

#### Block Hooks
- `onBlockPreProcess(block)` - Before block processing (raw Bitcoin data)
- `onBlockPostProcess(block)` - After block processing (OPNet data)
- `onBlockChange(block)` - New block confirmed

#### Epoch Hooks
- `onEpochChange(epoch)` - Epoch number changed
- `onEpochFinalized(epoch)` - Epoch merkle tree complete

#### Mempool Hooks
- `onMempoolTransaction(tx)` - New transaction in mempool

#### Critical Hooks (BLOCKING)
- `onReorg(reorg)` - Chain reorganization (MUST handle for data consistency)
- `onReindexRequired(check)` - Reindex required at startup
- `onPurgeBlocks(from, to)` - Purge data for block range

### APIs

| API | Description |
|-----|-------------|
| `IPluginDatabaseAPI` | MongoDB-like database access |
| `IPluginFilesystemAPI` | Sandboxed file system access |
| `IPluginLogger` | Logging with automatic plugin name prefix |
| `IPluginConfig` | Plugin configuration management |

### Permissions

Plugins declare required permissions in their manifest:

```typescript
interface IPluginPermissions {
    database?: {
        enabled: boolean;
        collections: string[];
    };
    blocks?: {
        preProcess: boolean;
        postProcess: boolean;
        onChange: boolean;
    };
    epochs?: {
        onChange: boolean;
        onFinalized: boolean;
    };
    mempool?: {
        txFeed: boolean;
    };
    api?: {
        addEndpoints: boolean;
        addWebsocket: boolean;
    };
    filesystem?: {
        configDir: boolean;
        tempDir: boolean;
    };
}
```

## License

Apache-2.0

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
