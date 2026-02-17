import { PluginBase, IPluginContext } from '@btc-vision/plugin-sdk';
import { OP20Indexer } from './OP20Indexer';

/**
 * Plugin Entry Point
 *
 * This is the main entry point for your OPNet node plugin.
 * Export a default instance of your plugin class.
 */
export default new OP20Indexer();
