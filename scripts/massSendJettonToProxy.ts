import { Address, internal, toNano } from 'ton-core';
import { NetworkProvider, compile, sleep } from '@ton-community/blueprint';
import { MessageToSend, PWallet } from '../wrappers/PWallet';
import { mnemonicToPrivateKey } from 'ton-crypto';
import { ProxyWallet } from '../wrappers/ProxyWallet';
import { JettonMaster } from 'ton';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const mnemonic = process.env.PW_MNEMONIC?.split(' ')!;
    const keypair = await mnemonicToPrivateKey(mnemonic);
    const pwallet = provider.open(PWallet.createFromPublicKey(keypair.publicKey));
    if (!(await provider.isContractDeployed(pwallet.address))) {
        ui.write(`Error: preprocessed wallet at address ${pwallet.address} is not deployed!`);
        return;
    }

    const jettonMasterAddress = Address.parse('EQDnRHbK5vJBLQyAnS6V8XNoRerCebnn9A2FlVlHtFVLFGZ-');
    function getWalletAddress(traderAddress: Address): Promise<Address> {
        const jettonMaster = provider.open(JettonMaster.create(jettonMasterAddress));
        return jettonMaster.getWalletAddress(traderAddress);
    }
    const pwalletJetton = await getWalletAddress(pwallet.address);

    const proxyCode = await compile('ProxyWallet');

    const messages = await Promise.all(
        Array.from({ length: 30 }, async (_, id): Promise<MessageToSend> => {
            const proxy = ProxyWallet.createFromConfig({ id }, proxyCode);
            console.log(`Proxy ${id}: ${proxy.address}`);

            const proxyJetton = await getWalletAddress(pwallet.address);

            const body = JettonWallet.transferMessage({
                to: proxy.address,
                amount: 10n * 10n ** 6n,
                forward_ton_amount: toNano('0'),
                responseAddress: pwallet.address,
            });
            return {
                recipient: pwalletJetton,
                value: toNano('0.1'),
                // init: proxy.init,
                body,
            };
        })
    );

    await pwallet.sendTransfers(keypair, messages);
}
