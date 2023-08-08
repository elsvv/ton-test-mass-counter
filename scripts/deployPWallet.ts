import { toNano } from 'ton-core';
import { Counter } from '../wrappers/Counter';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { PWallet } from '../wrappers/PWallet';
import { mnemonicNew, mnemonicToPrivateKey } from 'ton-crypto';

export async function run(provider: NetworkProvider) {
    const mnemonic = process.env.PW_MNEMONIC?.split(' ')!;
    const keys = await mnemonicToPrivateKey(mnemonic);
    const pwallet = provider.open(PWallet.createFromPublicKey(keys.publicKey));

    await pwallet.sendDeploy(provider.sender(), toNano('5'));

    await provider.waitForDeploy(pwallet.address);

    console.log('pwallet', await pwallet.getSeqno());
}
