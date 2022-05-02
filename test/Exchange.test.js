import Web3 from 'web3'
import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from './helpers'
const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Exchange', ([deployer, feeAccount, user1]) => {
    let token
    let exchange
    const feePercent = 10

    beforeEach(async () => {
        // fetch token from blockchain
        token = await Token.new()
        token.transfer(user1, tokens(100), { from: deployer })
        exchange = await Exchange.new(feeAccount, feePercent)
    })

    describe('deployment', () => {
        it('tracks feeAccount', async () => {
            const result = await exchange.feeAccount()
            result.should.equal(feeAccount)
        })

        it('tracks feePercent', async () => {
            const result = await exchange.feePercent()
            result.toString().should.equal(feePercent.toString())
        })
    })

    describe('fallback', () => {
        it('reverts whenever ether is sent', async () => {
            await exchange.sendTransaction({value: 1, from: user1}).should.be.rejectedWith(EVM_REVERT)
        })
    })

    describe('depositting ether', async () => {
        let result
        let amount

        beforeEach(async () => {
            amount = ether(1)
            result = await exchange.depositEther({from: user1, value: amount})
        })

        it('tracks the ether deposit', async () => {
            const balance = await exchange.tokens(ETHER_ADDRESS, user1)
            balance.toString().should.equal(amount.toString())
        })

        it('emits a Deposit event', async () => {
            const log = result.logs[0]
            log.event.should.eq('Deposit')
            const event = log.args
            event.token.should.equal(ETHER_ADDRESS, "token is correct")
            event.user.should.equal(user1, "user is correct")
            event.amount.toString().should.equal(amount.toString(), "amount is correct")
            event.balance.toString().should.equal(amount.toString(), "balance is correct")
        })
    })

    describe('depositting tokens', () => {
        let result
        let amount

        describe('success', () => {
            beforeEach(async () => {
                amount = tokens(10)
                await token.approve(exchange.address, amount, { from: user1 } )
                result = await exchange.depositToken(token.address, amount, { from: user1 })
            })

            it('tracks the deposit', async () => {
                let balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal(amount.toString())
            })

            it('emits a Deposit event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Deposit')
                const event = log.args
                event.token.should.equal(token.address, "token is correct")
                event.user.should.equal(user1, "user is correct")
                event.amount.toString().should.equal(amount.toString(), "amount is correct")
                event.balance.toString().should.equal(amount.toString(), "balance is correct")
            })
        })

        describe('failure', () => {
            it('rejects ether deposits', async () => {
                await exchange.depositToken(ETHER_ADDRESS, tokens(10)).should.be.rejectedWith(EVM_REVERT)
            })

            it('fails when no tokens are approved', async () => {
                await exchange.depositToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })

    })
})