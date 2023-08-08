import { Address, toNano } from 'ton-core';
import { Counter } from '../wrappers/Counter';
import { NetworkProvider, sleep } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse('EQAT6xANZ5uhNh5WORYOLpTLRuU6XCs479g02jAFdvYasQe6');

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const counter = provider.open(Counter.createFromAddress(address));

    const counterBefore = await counter.getCounter();

    await counter.sendIncrease(provider.sender(), toNano('0.002'));

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
}
