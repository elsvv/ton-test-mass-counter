import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { ProxyWallet } from '../wrappers/ProxyWallet';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('ProxyWallet', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('ProxyWallet');
    });

    let blockchain: Blockchain;
    let proxyWallet: SandboxContract<ProxyWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        proxyWallet = blockchain.openContract(ProxyWallet.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await proxyWallet.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: proxyWallet.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and proxyWallet are ready to use
    });
});
