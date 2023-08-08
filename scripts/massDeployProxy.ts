import { toNano } from 'ton-core';
import { NetworkProvider, compile, sleep } from '@ton-community/blueprint';
import { MessageToSend, PWallet } from '../wrappers/PWallet';
import { mnemonicToPrivateKey } from 'ton-crypto';
import { ProxyWallet } from '../wrappers/ProxyWallet';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const mnemonic = process.env.PW_MNEMONIC?.split(' ')!;
    const keypair = await mnemonicToPrivateKey(mnemonic);

    const pwallet = provider.open(PWallet.createFromPublicKey(keypair.publicKey));

    if (!(await provider.isContractDeployed(pwallet.address))) {
        ui.write(`Error: preprocessed wallet at address ${pwallet.address} is not deployed!`);
        return;
    }

    const proxyCode = await compile('ProxyWallet');

    const messages = Array.from({ length: 30 }, (_, id): MessageToSend => {
        const proxy = ProxyWallet.createFromConfig({ id }, proxyCode);
        console.log(`Proxy ${id}: ${proxy.address}`);
        return {
            recipient: proxy.address,
            value: toNano('0.02'),
            init: proxy.init,
        };
    });

    await pwallet.sendTransfers(keypair, messages);
}
