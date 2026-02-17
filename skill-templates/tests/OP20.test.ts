import { opnet, OPNetUnit, Assert, Blockchain } from '@btc-vision/unit-test-framework';
import { OP20 } from '@btc-vision/unit-test-framework';
import { Address, BinaryWriter } from '@btc-vision/transaction';
import { u256 } from '@btc-vision/as-bignum/assembly';

/**
 * OP20 Token Unit Tests
 *
 * This test suite demonstrates how to test OP20 token contracts.
 * Use this as a template for your own contract tests.
 */
await opnet('OP20 Token Tests', async (vm: OPNetUnit) => {
    // Test addresses
    const deployerAddress: Address = Blockchain.generateRandomAddress();
    const userAddress: Address = Blockchain.generateRandomAddress();
    const recipientAddress: Address = Blockchain.generateRandomAddress();

    // Contract instance
    let token: OP20;

    // Contract address
    const contractAddress: Address = Blockchain.generateRandomAddress();

    /**
     * Setup before each test
     */
    vm.beforeEach(async () => {
        // Clean up previous state
        Blockchain.dispose();
        Blockchain.clearContracts();

        // Initialize blockchain
        await Blockchain.init();

        // Create and register contract
        token = new OP20(deployerAddress, contractAddress);
        Blockchain.register(token);

        // Initialize the contract
        await token.init();
    });

    /**
     * Cleanup after each test
     */
    vm.afterEach(() => {
        token.dispose();
        Blockchain.dispose();
    });

    await vm.it('should return correct token name', async () => {
        const name = await token.name();
        Assert.expect(name).toBeDefined();
        Assert.expect(typeof name).toEqual('string');
    });

    await vm.it('should return correct token symbol', async () => {
        const symbol = await token.symbol();
        Assert.expect(symbol).toBeDefined();
        Assert.expect(typeof symbol).toEqual('string');
    });

    await vm.it('should return correct decimals', async () => {
        const decimals = await token.decimals();
        Assert.expect(decimals).toBeGreaterThanOrEqual(0);
        Assert.expect(decimals).toBeLessThanOrEqual(18);
    });

    await vm.it('should return zero balance for new address', async () => {
        const balance = await token.balanceOf(userAddress);
        Assert.expect(balance.toString()).toEqual('0');
    });

    await vm.it('should return correct balance after mint', async () => {
        const mintAmount = u256.fromU64(1000n);

        // Set sender as deployer
        Blockchain.setSender(deployerAddress);

        // Mint tokens
        await token.mint(userAddress, mintAmount);

        // Check balance
        const balance = await token.balanceOf(userAddress);
        Assert.expect(balance.toString()).toEqual(mintAmount.toString());
    });

    await vm.it('should transfer tokens successfully', async () => {
        const mintAmount = u256.fromU64(1000n);
        const transferAmount = u256.fromU64(100n);

        // Mint to user
        Blockchain.setSender(deployerAddress);
        await token.mint(userAddress, mintAmount);

        // Transfer from user to recipient
        Blockchain.setSender(userAddress);
        await token.transfer(recipientAddress, transferAmount);

        // Check balances
        const userBalance = await token.balanceOf(userAddress);
        const recipientBalance = await token.balanceOf(recipientAddress);

        Assert.expect(userBalance.toString()).toEqual('900');
        Assert.expect(recipientBalance.toString()).toEqual('100');
    });

    await vm.it('should revert transfer with insufficient balance', async () => {
        const transferAmount = u256.fromU64(100n);

        Blockchain.setSender(userAddress);

        await Assert.expect(async () => {
            await token.transfer(recipientAddress, transferAmount);
        }).toThrow();
    });

    await vm.it('should approve spender correctly', async () => {
        const approveAmount = u256.fromU64(500n);

        Blockchain.setSender(userAddress);
        await token.approve(recipientAddress, approveAmount);

        const allowance = await token.allowance(userAddress, recipientAddress);
        Assert.expect(allowance.toString()).toEqual(approveAmount.toString());
    });

    await vm.it('should execute transferFrom with approval', async () => {
        const mintAmount = u256.fromU64(1000n);
        const approveAmount = u256.fromU64(500n);
        const transferAmount = u256.fromU64(200n);

        // Mint to user
        Blockchain.setSender(deployerAddress);
        await token.mint(userAddress, mintAmount);

        // Approve recipient
        Blockchain.setSender(userAddress);
        await token.approve(recipientAddress, approveAmount);

        // TransferFrom as recipient
        Blockchain.setSender(recipientAddress);
        await token.transferFrom(userAddress, recipientAddress, transferAmount);

        // Check balances and allowance
        const userBalance = await token.balanceOf(userAddress);
        const recipientBalance = await token.balanceOf(recipientAddress);
        const remainingAllowance = await token.allowance(userAddress, recipientAddress);

        Assert.expect(userBalance.toString()).toEqual('800');
        Assert.expect(recipientBalance.toString()).toEqual('200');
        Assert.expect(remainingAllowance.toString()).toEqual('300');
    });

    await vm.it('should only allow deployer to mint', async () => {
        const mintAmount = u256.fromU64(100n);

        // Try to mint as non-deployer
        Blockchain.setSender(userAddress);

        await Assert.expect(async () => {
            await token.mint(userAddress, mintAmount);
        }).toThrow();
    });

    await vm.it('should emit Transfer event on transfer', async () => {
        const mintAmount = u256.fromU64(1000n);
        const transferAmount = u256.fromU64(100n);

        // Mint to user
        Blockchain.setSender(deployerAddress);
        await token.mint(userAddress, mintAmount);

        // Transfer
        Blockchain.setSender(userAddress);
        const result = await token.transfer(recipientAddress, transferAmount);

        // Check events
        const events = token.getEvents();
        Assert.expect(events.length).toBeGreaterThan(0);

        // Find Transfer event
        const transferEvent = events.find((e) => e.name === 'Transfer');
        Assert.expect(transferEvent).toBeDefined();
    });

    await vm.it('should track gas consumption', async () => {
        Blockchain.enableGasTracking();

        const mintAmount = u256.fromU64(1000n);
        Blockchain.setSender(deployerAddress);
        await token.mint(userAddress, mintAmount);

        const gasUsed = Blockchain.getGasUsed();
        Assert.expect(gasUsed).toBeGreaterThan(0n);

        Blockchain.disableGasTracking();
    });
});
