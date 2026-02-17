import {
    PluginBase,
    IPluginContext,
    IBlockProcessedData,
    IReorgData,
    ITransactionData,
} from '@btc-vision/plugin-sdk';

/**
 * OP20 Token Indexer Plugin
 *
 * This plugin indexes all OP20 token transfers and maintains
 * a database of token holders and their balances.
 *
 * OPNet nodes are like Minecraft servers - they support plugins!
 * This plugin demonstrates how to:
 * - Process blocks and transactions
 * - Store data in the plugin database
 * - Handle chain reorganizations
 * - Expose custom API endpoints
 */
export class OP20Indexer extends PluginBase {
    // Collection names for our data
    private readonly TRANSFERS_COLLECTION = 'op20_transfers';
    private readonly BALANCES_COLLECTION = 'op20_balances';
    private readonly TOKENS_COLLECTION = 'op20_tokens';

    /**
     * Called when the plugin is loaded
     */
    public async onLoad(context: IPluginContext): Promise<void> {
        await super.onLoad(context);
        this.context.logger.info('OP20 Indexer plugin loaded');
    }

    /**
     * Called on first installation - set up database indexes
     */
    public async onFirstInstall(): Promise<void> {
        this.context.logger.info('First install - creating database indexes');

        if (this.context.db) {
            // Create indexes for efficient queries
            await this.context.db.collection(this.TRANSFERS_COLLECTION).createIndex({
                blockHeight: 1,
                txHash: 1,
            });

            await this.context.db.collection(this.BALANCES_COLLECTION).createIndex({
                tokenAddress: 1,
                holderAddress: 1,
            });

            await this.context.db.collection(this.TOKENS_COLLECTION).createIndex({
                address: 1,
            });
        }
    }

    /**
     * Called when network is initialized
     */
    public async onNetworkInit(networkId: string): Promise<void> {
        this.context.logger.info(`Network initialized: ${networkId}`);
    }

    /**
     * Check if sync is required
     */
    public async onSyncRequired(): Promise<boolean> {
        // Check our last synced block vs current chain tip
        const lastSynced = await this.context.getLastSyncedBlock();
        const chainTip = await this.context.getCurrentBlockHeight();

        return lastSynced < chainTip;
    }

    /**
     * Process a block during sync/catch-up
     */
    public async onSyncBlock(block: IBlockProcessedData): Promise<void> {
        await this.processBlock(block);
    }

    /**
     * Called when sync is complete
     */
    public async onSyncComplete(): Promise<void> {
        this.context.logger.info('Sync complete!');
        await this.context.markSyncCompleted();
    }

    /**
     * Process a new confirmed block (live mode)
     */
    public async onBlockChange(block: IBlockProcessedData): Promise<void> {
        await this.processBlock(block);
        await this.context.updateLastSyncedBlock(block.blockNumber);
    }

    /**
     * Handle chain reorganization - CRITICAL for data consistency
     *
     * When a reorg occurs, we MUST delete all data from the reorged blocks
     * to maintain consistency with the canonical chain.
     */
    public async onReorg(reorg: IReorgData): Promise<void> {
        this.context.logger.warn(
            `Reorg detected! Reverting blocks ${reorg.fromBlock} to ${reorg.toBlock}`
        );

        if (this.context.db) {
            // Delete all transfers from reorged blocks
            await this.context.db.collection(this.TRANSFERS_COLLECTION).deleteMany({
                blockHeight: { $gte: reorg.fromBlock },
            });

            // Recalculate balances - in a real implementation you'd want
            // to store balance deltas per block for efficient reorg handling
            await this.recalculateBalances(reorg.fromBlock);
        }

        // Reset sync state
        await this.context.resetSyncStateToBlock(reorg.fromBlock - 1);
    }

    /**
     * Handle purge blocks request
     */
    public async onPurgeBlocks(fromBlock: number, toBlock: number): Promise<void> {
        this.context.logger.info(`Purging blocks ${fromBlock} to ${toBlock}`);

        if (this.context.db) {
            await this.context.db.collection(this.TRANSFERS_COLLECTION).deleteMany({
                blockHeight: { $gte: fromBlock, $lte: toBlock },
            });
        }
    }

    /**
     * Register custom API routes
     */
    public async registerRoutes(): Promise<void> {
        // GET /api/plugins/op20-indexer/tokens
        this.context.api?.get('/tokens', async (req, res) => {
            const tokens = await this.context.db
                ?.collection(this.TOKENS_COLLECTION)
                .find({})
                .limit(100);

            res.json({ tokens: tokens ?? [] });
        });

        // GET /api/plugins/op20-indexer/holders/:tokenAddress
        this.context.api?.get('/holders/:tokenAddress', async (req, res) => {
            const { tokenAddress } = req.params;

            const holders = await this.context.db
                ?.collection(this.BALANCES_COLLECTION)
                .find({ tokenAddress })
                .sort({ balance: -1 })
                .limit(100);

            res.json({ holders: holders ?? [] });
        });

        // GET /api/plugins/op20-indexer/balance/:tokenAddress/:holderAddress
        this.context.api?.get('/balance/:tokenAddress/:holderAddress', async (req, res) => {
            const { tokenAddress, holderAddress } = req.params;

            const balance = await this.context.db
                ?.collection(this.BALANCES_COLLECTION)
                .findOne({ tokenAddress, holderAddress });

            res.json({ balance: balance?.balance ?? '0' });
        });

        // GET /api/plugins/op20-indexer/transfers/:tokenAddress
        this.context.api?.get('/transfers/:tokenAddress', async (req, res) => {
            const { tokenAddress } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;

            const transfers = await this.context.db
                ?.collection(this.TRANSFERS_COLLECTION)
                .find({ tokenAddress })
                .sort({ blockHeight: -1 })
                .limit(limit);

            res.json({ transfers: transfers ?? [] });
        });
    }

    /**
     * Processes a block and extracts OP20 transfer events from all transactions.
     * @param block - The block data to process
     */
    private async processBlock(block: IBlockProcessedData): Promise<void> {
        for (const tx of block.transactions) {
            await this.processTransaction(tx, block.blockNumber);
        }
    }

    /**
     * Process a transaction for OP20 events
     */
    private async processTransaction(tx: ITransactionData, blockHeight: number): Promise<void> {
        // Check if this is an OPNet interaction transaction
        if (!tx.contractAddress || !tx.events) {
            return;
        }

        // Look for Transfer events
        for (const event of tx.events) {
            if (event.name === 'Transfer') {
                await this.handleTransferEvent(
                    tx.contractAddress,
                    tx.hash,
                    blockHeight,
                    event.data
                );
            }
        }
    }

    /**
     * Handle a Transfer event
     */
    private async handleTransferEvent(
        tokenAddress: string,
        txHash: string,
        blockHeight: number,
        eventData: unknown
    ): Promise<void> {
        if (!this.context.db) return;

        // Parse event data (structure depends on your event encoding)
        const { from, to, amount } = eventData as {
            from: string;
            to: string;
            amount: string;
        };

        // Store transfer record
        await this.context.db.collection(this.TRANSFERS_COLLECTION).insertOne({
            tokenAddress,
            txHash,
            blockHeight,
            from,
            to,
            amount,
            timestamp: Date.now(),
        });

        // Update balances
        await this.updateBalance(tokenAddress, from, `-${amount}`);
        await this.updateBalance(tokenAddress, to, amount);

        // Ensure token is tracked
        await this.ensureTokenTracked(tokenAddress);
    }

    /**
     * Update a holder's balance
     */
    private async updateBalance(
        tokenAddress: string,
        holderAddress: string,
        delta: string
    ): Promise<void> {
        if (!this.context.db) return;

        // In a real implementation, use BigInt for proper balance handling
        await this.context.db.collection(this.BALANCES_COLLECTION).updateOne(
            { tokenAddress, holderAddress },
            {
                $inc: { balance: parseFloat(delta) },
                $set: { lastUpdated: Date.now() },
            },
            { upsert: true }
        );
    }

    /**
     * Ensure a token is tracked in our tokens collection
     */
    private async ensureTokenTracked(tokenAddress: string): Promise<void> {
        if (!this.context.db) return;

        await this.context.db.collection(this.TOKENS_COLLECTION).updateOne(
            { address: tokenAddress },
            {
                $setOnInsert: {
                    address: tokenAddress,
                    firstSeen: Date.now(),
                },
            },
            { upsert: true }
        );
    }

    /**
     * Recalculate balances from scratch (used after reorg)
     */
    private async recalculateBalances(fromBlock: number): Promise<void> {
        this.context.logger.info(`Recalculating balances from block ${fromBlock}`);

        // In a production implementation, you would:
        // 1. Store balance deltas per block
        // 2. Apply deltas in reverse to revert state
        // 3. Or replay all transfers from genesis (expensive)

        // For now, just log the action
        this.context.logger.warn('Balance recalculation not fully implemented');
    }
}
