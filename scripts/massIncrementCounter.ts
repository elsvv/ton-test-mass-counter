import { Address, toNano } from 'ton-core';
import { Counter } from '../wrappers/Counter';
import { NetworkProvider, sleep } from '@ton-community/blueprint';
import { PWallet } from '../wrappers/PWallet';
import { mnemonicToPrivateKey } from 'ton-crypto';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
    const counterAddress = Address.parse('EQAT6xANZ5uhNh5WORYOLpTLRuU6XCs479g02jAFdvYasQe6');

    const mnemonic = process.env.PW_MNEMONIC?.split(' ')!;

    const keypair = await mnemonicToPrivateKey(mnemonic);
    const pwallet = provider.open(PWallet.createFromPublicKey(keypair.publicKey));

    if (!(await provider.isContractDeployed(counterAddress))) {
        ui.write(`Error: Contract at address ${counterAddress} is not deployed!`);
        return;
    }

    if (!(await provider.isContractDeployed(pwallet.address))) {
        ui.write(`Error: preprocessed wallet at address ${pwallet.address} is not deployed!`);
        return;
    }

    const messages = Array.from({ length: 255 }, () => ({ recipient: counterAddress, value: toNano('0.0014') }));

    const counter = provider.open(Counter.createFromAddress(counterAddress));
    const counterBefore = await counter.getCounter();

    await pwallet.sendTransfers(keypair, messages);

    ui.write('Waiting for counter to increase...');

    let counterAfter = await counter.getCounter();
    let attempt = 1;
    while (counterAfter === counterBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        counterAfter = await counter.getCounter();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Counter increased successfully!');
    ui.write(`New counter: ${counterAfter}`);
}
