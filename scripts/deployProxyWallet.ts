import { toNano } from 'ton-core';
import { ProxyWallet } from '../wrappers/ProxyWallet';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const proxyWallet = provider.open(ProxyWallet.createFromConfig({ id: 1 }, await compile('ProxyWallet')));

    await proxyWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(proxyWallet.address);

    // run methods on `proxyWallet`
}
