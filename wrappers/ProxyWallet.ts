import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type ProxyWalletConfig = { id: number };

export function proxyWalletConfigToCell(config: ProxyWalletConfig): Cell {
    return beginCell().storeUint(config.id, 32).endCell();
}

export class ProxyWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new ProxyWallet(address);
    }

    static createFromConfig(config: ProxyWalletConfig, code: Cell, workchain = 0) {
        const data = proxyWalletConfigToCell(config);
        const init = { code, data };
        return new ProxyWallet(contractAddress(workchain, init), init);
    }

    static proxyPayload(msg: Cell, mode: number): Cell {
        return beginCell().storeUint(mode, 8).storeRef(msg).endCell();
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
