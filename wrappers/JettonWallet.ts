import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from 'ton-core';

const codeBOC =
    'te6cckECDwEAA9QAART/APSkE/S88sgLAQIBYgMCABug9gXaiaH0AfSB9IGoYQICzgUEABFPpEMMAA8uFNgEs0IMcAkl8E4AHQ0wMBcbCOhRNfA9s84PpA+kAx+gAxcdch+gAx+gAwc6m0AALTHwEgghAPin6luo6FMDRZ2zzgIIIQF41FGbqOhjBERAPbPOA1JIIQWV8HvLqA4MCQYC1I6ENFnbPOBsIu1E0PoA+kD6QNQwECNfAyOCEG2OXjy6jjczUiLHBfLiwYIImJaAcPsCyIAQAcsFWM8WcPoCcAHLaoIQ1TJ22wHLHwHTPwExAcs/yYEAgvsA4AOCEHaKULK64wJfA4QP8vAIBwCWUiLHBfLiwdM/AQH6QPoA9AQwyIAYAcsFUAPPFnD6AnDIghAPin6lAcsfUAUByz9Y+gIkzxZQBM8W9ABw+gLKAMlxWMtqzMmAQPsAAObtRND6APpA+kDUMAfTPwEB+gD6QDBRUaFSSccF8uLBJ8L/8uLCBYIJqz8AoBa88uLDyIIQe92X3gHLH1AFAcs/UAP6AiLPFgHPFsnIgBgBywUjzxZw+gIBcVjLaszJgED7AEATyFAE+gJYzxYBzxbMye1UAvbtRND6APpA+kDUMAjTPwEB+gBRUaAF+kD6QFNbxwVUc21wVCATVBQDyFAE+gJYzxYBzxbMySLIywES9AD0AMsAyfkAcHTIywLKB8v/ydBQDccFHLHy4sMK+gBRqKEhlRBKOV8E4w0EggiYloC2CXL7AiXXCwHDAAPCABMLCgB8sI4myIAQAcsFUAXPFnD6AnABy2qCENUydtsByx9QAwHLP8mBAIL7ABKSMzPiUAPIUAT6AljPFgHPFszJ7VQAclIaoBihyIIQc2LQnAHLHyQByz9QA/oCAc8WUAjPFsnIgBABywUkzxZQBvoCUAVxWMtqzMlx+wAQNQH2A9M/AQH6APpAIfAC7UTQ+gD6QPpA1DBRNqFSKscF8uLBKML/8uLCVDRCcFQgE1QUA8hQBPoCWM8WAc8WzMkiyMsBEvQA9ADLAMkg+QBwdMjLAsoHy//J0AT6QPQEMfoAINdJwgDy4sTIghAXjUUZAcsfUAoByz9QCPoCDQCiI88WAc8WJvoCUAfPFsnIgBgBywVQBM8WcPoCQGN3UAPLa8zMI5FykXHiUAioE6CCCkPVgKAUvPLixQTJgED7AEATyFAE+gJYzxYBzxbMye1UAIqAINch7UTQ+gD6QPpA1DAE0x8BggD/8CGCEBeNRRm6AoIQe92X3roSsfL00z8BMPoAMBOgUCPIUAT6AljPFgHPFszJ7VQcn2Qv';
const jwallet_code = Cell.fromBase64(codeBOC);

type BaseTransferParams = {
    amount: bigint;
    to: Address;
    responseAddress?: Address;
    customPayload?: Cell;
};

type ForwardTransferParams =
    | { forward_ton_amount: bigint; forwardPayload: Cell }
    | { forward_ton_amount?: bigint; forwardPayload?: Cell };

type TransferParams = BaseTransferParams & ForwardTransferParams;

type BurnParams = { amount: bigint; responseAddress: Address; customPayload?: Cell };

export type JettonWalletConfig = {};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell().endCell();
}

export class JettonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell = jwallet_code, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = { code, data };
        return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getJettonBalance(provider: ContractProvider) {
        let state = await provider.getState();
        if (state.state.type !== 'active') {
            return 0n;
        }
        let res = await provider.get('get_wallet_data', []);
        return res.stack.readBigNumber();
    }
    static transferMessage(params: TransferParams) {
        return beginCell()
            .storeUint(0xf8a7ea5, 32)
            .storeUint(0, 64) // op, queryId
            .storeCoins(params.amount)
            .storeAddress(params.to)
            .storeAddress(params.responseAddress)
            .storeMaybeRef(params.customPayload)
            .storeCoins(params.forward_ton_amount ?? toNano('0.001')) // notify message
            .storeMaybeRef(params.forwardPayload)
            .endCell();
    }
    async sendTransfer(provider: ContractProvider, via: Sender, value: bigint, params: TransferParams) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            value,
            body: JettonWallet.transferMessage(params),
        });
    }
    /*
    burn#595f07bc query_id:uint64 amount:(VarUInteger 16)
                  response_destination:MsgAddress custom_payload:(Maybe ^Cell)
                  = InternalMsgBody;
  */
    static burnMessage(params: BurnParams) {
        return beginCell()
            .storeUint(0x595f07bc, 32)
            .storeUint(0, 64) // op, queryId
            .storeCoins(params.amount)
            .storeAddress(params.responseAddress)
            .storeMaybeRef(params.customPayload)
            .endCell();
    }

    async sendBurn(provider: ContractProvider, via: Sender, value: bigint, params: BurnParams) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonWallet.burnMessage(params),
            value: value,
        });
    }
    /*
    withdraw_tons#107c49ef query_id:uint64 = InternalMsgBody;
  */
    static withdrawTonsMessage() {
        return beginCell()
            .storeUint(0x6d8e5e3c, 32)
            .storeUint(0, 64) // op, queryId
            .endCell();
    }

    async sendWithdrawTons(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonWallet.withdrawTonsMessage(),
            value: toNano('0.1'),
        });
    }
    /*
    withdraw_jettons#10 query_id:uint64 wallet:MsgAddressInt amount:Coins = InternalMsgBody;
  */
    static withdrawJettonsMessage(from: Address, amount: bigint) {
        return beginCell()
            .storeUint(0x768a50b2, 32)
            .storeUint(0, 64) // op, queryId
            .storeAddress(from)
            .storeCoins(amount)
            .storeMaybeRef(null)
            .endCell();
    }

    async sendWithdrawJettons(provider: ContractProvider, via: Sender, from: Address, amount: bigint) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: JettonWallet.withdrawJettonsMessage(from, amount),
            value: toNano('0.1'),
        });
    }
}
