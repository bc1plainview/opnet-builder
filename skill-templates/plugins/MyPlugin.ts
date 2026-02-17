import {
    PluginBase,
    IPluginContext,
    IBlockProcessedData,
    IReorgData,
} from '@btc-vision/plugin-sdk';

/**
 * Generic OPNet Node Plugin Template
 *
 * This is a minimal plugin template demonstrating the core plugin lifecycle.
 * Implement the hooks you need for your use case.
 */
export class MyPlugin extends PluginBase {
    /**
     * Called when the plugin is loaded
     */
    public async onLoad(context: IPluginContext): Promise<void> {
        await super.onLoad(context);
        this.context.logger.info('MyPlugin loaded');
    }

    /**
     * Called when the plugin is unloaded
     */
    public async onUnload(): Promise<void> {
        this.context.logger.info('MyPlugin unloading');
        await super.onUnload();
    }

    /**
     * Called on first installation - one-time setup
     */
    public async onFirstInstall(): Promise<void> {
        this.context.logger.info('First install - performing initial setup');
        // Create database indexes, initialize state, etc.
    }

    /**
     * Called on every load with network information
     */
    public async onNetworkInit(networkId: string): Promise<void> {
        this.context.logger.info(`Network: ${networkId}`);
    }

    /**
     * Process new blocks (live mode)
     */
    public async onBlockChange(block: IBlockProcessedData): Promise<void> {
        this.context.logger.debug(`Block ${block.blockNumber} processed`);
        // Process block data...
    }

    /**
     * Handle chain reorganization - CRITICAL
     * You MUST revert any state changes from reorged blocks
     */
    public async onReorg(reorg: IReorgData): Promise<void> {
        this.context.logger.warn(
            `Reorg: reverting blocks ${reorg.fromBlock} to ${reorg.toBlock}`
        );

        // Delete data from reorged blocks
        // Reset sync state
        // Recalculate affected state
    }
}
