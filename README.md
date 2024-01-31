# Bridging Assets Cross-Chain via TWAMMs

### Table of Contents

- [Overview](#overview)
  - [Highlights](#highlights)
  - [Advantages](#advantages)
  - [Competition](#competition)
- [Technical Analysis](#technical-analysis)
  - [Trade Cost](#trade-cost-passive-vs-concentrated-liquidity)
  - [Arbitrage Frequency](#arbitrage-frequency-passive-vs-concentrated-liquidity)
  - [Maximum TVL @ Risk](#maximum-tvl--risk)
- [Protocol Security](#protocol-security)
  - [Internal Mitigations](#internal-mitigations)
  - [External Mitigations](#external-mitigations)
    - [EigenLayer: Economic Security](#eigenlayer-economic-security)
    - [ZK-Proofs: Trustless Security](#zk-proofs-trustless-security)

We are entering a future of modular blockchain technology where deploying a new rollup is as easy as deploying a new ERC-20 token. Rollup infra services enable developers to plug and play their preferred settlement, execution, data availability, and consensus protocols.

In this new paradigm, withdrawal delays imposed by the canonical bridges add huge inertia for capital that’s ever-seeking new yield opportunities. Therefore, increasing the velocity and availability of capital is vital for these new ecosystems to survive and thrive.

We present an innovative solution for ultra-fast bridging that leverages *concentrated liquidity, TWAMMs, and cross-chain liquidity pools* to efficiently and transparently move `$100M of stablecoins in less than an hour with $20M liquidity and 1.5bps of slippage`!

## Overview

Current bridging solutions force users to make tradeoffs between *centralized vs. decentralized, permissioned vs. permissionless, and off-chain vs. on-chain*. Our design provides a step-change improvement in performance and ease of use without compromising the ethos of decentralized finance, similar to what Uniswap did for decentralized exchanges.

| | CronFi Bridge | Uniswap DEX |
|----|----|----|
| `Assets` | OP_USDC <-> ARB_USDC | USDC <-> WETH |
| `Connector` | Cross-chain Liquidity Pool | Liquidity Pool |
| `Action` | Bridge | Swap |
| `Optimization` | Minimize slippage to bridge | Minimize slippage to swap |

Our goal was to decrease complexity, increase transparency, and facilitate efficient transfers with minimal slippage in a low liquidity environment between any EVM-compatible L1/L2 <> L1/L2 chains. The animation below illustrates the seamless experience of bridging USDC from Arbitrum to Optimism.

https://github.com/Cron-Finance/streaming-bridge/assets/99218061/f8370017-9d3d-40d1-9717-6fb631baa370

### Highlights
- ***100% On-Chain & Composable***: the entire protocol lives on-chain and is composable with other protocols interested in bridging assets, arbitraging, or providing liquidity to earn fees. We have designed the interface to be extremely simple, think Uniswap V2/V3, so the learning curve is minimal.
- ***Liquidity Network Bridge***: only canonical assets are used for bridging in this design instead of "representative or trusted" assets like lock/burn mint bridges. Relying on a trusted third party is extremely risky (see major bridge hacks), therefore we leverage LPs and arbitrageurs to exchange ownership of native assets with traders for a small fee.
- ***Time-Weighted Average Market Makers***: to better serve whales, market makers, protocols, and institutions, we leverage TWAMMs to swap large orders transparently on-chain by smoothly executing them virtually over multiple blocks. Smaller orders can use the atomic AMM route to bridge nearly instantaneously.
- ***Single Cross-Chain LP Pool***: to avoid using a `bridging` asset, there are two inter-dependent TWAMMs that share a single liquidity pool so LPs add native assets on the respective AMM i.e. OP_USDC, ARB_USDC.
  - Primary AMM: chain X’s AMM is read + write and acts as the single source of truth for the TWAMM calculations, thus no need to worry about state synchronization issues between the two layers’ accounting of assets
  - Secondary AMM: chain Y’s AMM does not do any computation but instead simply acts as a proxy contract to capture user interactions and manage user funds based on the primary AMM accounting of assets
- ***Concentrated Liquidity***: since the protocol will be used to transmit assets in a potentially liquidity-constrained environment, concentrated liquidity is leveraged in conjunction with TWAMMs to boost liquidity depth and enable active LPs to express their liquidity preferences.
- ***Transparent Pricing/Execution***: a major benefit of an AMM-based design is the price discovery and transaction execution is fully on-chain and transparent. Small to medium-sized orders that execute immediately can be viewed on block explorers, and the progress of large orders executed over multiple blocks can be aggregated on an open-source dashboard.
- ***Easy Arbitrage***: unlike other bridging protocols that require large outlays of funds/technical resources or access to esoteric tokens, arbitrage in our system involves a party going in the opposite direction to back-run the trade. It can be easily done by any incentivized party, third-party aggregators, protocols, etc.

### Advantages

The below animations break down the advantages of our design for the different personas *long-term trader, liquidity provider, and arbitrageur/retail*. 

#### Long-Term Trader (Non-Atomic)
    - Lower risk than bridging all assets in 1 swap, TWAMM executes over multiple blocks
    - Full control to pause, cancel, withdraw, and transparent execution -- no black boxes
    - Transfer in size with minimal slippage, time delays, gas, or MEV extraction

https://github.com/Cron-Finance/streaming-bridge/assets/99218061/b1768a25-4914-4111-afde-a32b10104769

#### Liquidity Provider
    - Use native assets (USDC), not 3rd party wrapped illiquid tokens (ex. hopUSDC, USDC_L0, etc)
    - Low TVL needed for execution, so less risk and a higher share of swap fees
    - Dynamic & differential fees to meet demand surges

https://github.com/Cron-Finance/streaming-bridge/assets/99218061/6c19491e-c9bd-4273-8168-162eb17643d5

#### Arbitrageur/Retail (Atomic)
    - No need to source arbitrary tokens to correct pool prices
    - Easy to arbitrage, simply back-run long-term trade for profit by going in the opposite direction
    - PFoF fee structure for dedicated parties

https://github.com/Cron-Finance/streaming-bridge/assets/99218061/8bc2bf19-4842-4d5b-8ad2-e6898971bfeb

### Competition

Various bridge designs have been used to transmit assets quickly (< 7 days) between chains. However, these designs suffer from hacks (see [Poly](https://rekt.news/polynetwork-rekt/), [BNB](https://rekt.news/bnb-bridge-rekt/) & [Wormhole](https://rekt.news/wormhole-rekt/)), throughput and extensibility limitations (see [Circle $1M limit](https://etherscan.io/tx/0x08b635c88808ad8f125a66e8f399da64c91b5d06fb05b992d5357393a2d66b49#eventlog)), or lack of liquidity + high slippage to service users moving in size.

There is a new market of intent & relayer/solver-based solutions that leverage off-chain liquidity sources. Although these solutions can quickly fill small and medium-sized orders for blue chip tokens, they are unable to support large orders, new L2s, or low liquidity tokens. Additionally, the UX for these solutions has low to no visibility on order status and opaque pricing.

|| Bridging Token | Representative, Minting | Stablecoin | Intent |
|----|----|----|----|----|
| `Advantage` | Permissionless | Extensible | Canonical Token | Fast Transfer |
| `Disadvantage` | Slippage, Capital Efficiency | Honeypot, Multiple Token Versions | No Extensibility, Centralized | No Visibility, No Composability |
| `Technology` | AMM | Lock/Burn + Mint | Proof of Authority | Relayers, Solvers |
| `Example` | bridgeUSDC | wrappedUSDC | Circle CCTP | Uni X, Across |

ZK proofs have long been touted as the panacea to eliminate long withdrawal delays for canonical bridges. However, ZK proofs are still limited by proving time, verification costs, EVM compatibility, and L1 finality requirements. Most of all, ZK proofs on chain X cannot verify re-org on chain Y, ensure censorship resistance, or provide security for bridging between ZK and optimistic chains.

___

## Technical Analysis

We built a typescript model with concentrated liquidity and arbitrage to understand how fast we can move assets cross-chain with extremely limited liquidity and low slippage. For this simulation, we assumed that `soft guarantee` is a good enough metric and can scale our design to use `L2 Finality` as our transaction finality. 

### Trade Cost: Passive vs. Concentrated Liquidity
First, we analyzed how concentrated liquidity enhances capital efficiency and trade fill. As shown in the results below, regular liquidity (in red) costs increase linearly after trade size moves past ~$10M. However, concentrated liquidity (in blue) costs stay asymptotic and grow inconsequential. 

  >🤯🤯 $100M can be theoretically swapped in less than an hour for ~1.5 BPs price impact in our design!

![trade_cost.png](https://github.com/Cron-Finance/streaming-bridge/blob/main/assets/Trade%20Cost.png)

Then, we swept the different liquidity multipliers showing narrower liquidity ranges -- a realistic scenario for high-cap stablecoin liquidity pools. **`If the ~$25m were concentrated into the 0.999 - 1.001 range it would provide the same depth as $50b in Uniswap v2 ~ 2000x.`**

![concentrated_sweep.png](https://github.com/Cron-Finance/streaming-bridge/blob/main/assets/Concentrated%20Liquidity%20Sweep.png)

### Arbitrage Frequency: Passive vs Concentrated Liquidity

Also, we wanted to understand how frequently the TWAMM trade needs to be arbitraged for an optimal fill in a concentrated liquidity domain. The frequency jumps up to every block for regular liquidity pools as soon as the trade size moves past ~$10M. However, the concentrated liquidity pool can execute the $100M trade while arbitraging 50% less. 

![arb_cl.png](https://github.com/Cron-Finance/streaming-bridge/blob/main/assets/Concentrated%20Liquidity%20Arbitrage.png)

Finally, below is a sweep of how the arbitrage is affected by different tick spacing and liquidity depths of narrower LP ranges. As you can see, there's an inverse correlation between liquidity depth and frequency of arbitrage necessary for optimal trade fills.

![concentrated_sweep_arbs.png](https://github.com/Cron-Finance/streaming-bridge/blob/main/assets/Concentrated%20Liquidity%20Arbitrage%20Sweeps.png)

### Maximum TVL @ Risk

It’s important to understand the capital at risk in this bridging design and which party is taking on the risk. We separate the two types of capital in our design as `liquidity at rest` which is sourced by liquidity providers and `liquidity in flight` which is sourced by arbitrageurs. For a $100M to move from A → B, arbitrageurs have to move roughly $100M from B → A — in the absence of other trades, and activity.

#### *Long Term vs Short Term*
Most large trades will go through the long-term (non-atomic) interface thus giving the LPs and arbitrageurs time to react accordingly. There will be a *******cap******* on the amount that can be swapped via the short-term (atomic) interface for LP safety.

#### *Liquidity at Rest*
LP TVL is minimal and acts as the “grease” to start the trades. As shown in the simulations above, this amounts to `$10M on each chain` — a reasonable upper bound to move $100s of millions in volume.
  - Concentrated Liquidity: other than amplifying liquidity, CL provides another safety in the case of an attack. If a malicious trader tries to move a large amount quickly, it will push the trade out of the “active tick zone” and the trade `pauses` thus giving LPs and arbitrageurs time to react.

#### *Liquidity at Flight*
Arbitrageurs are the party sourcing the majority of the capital in our system and also the more sophisticated actors. For our simulation, we arbitraged the trade immediately. However, arbitrageurs can take longer to be sure the long-term trader is not malicious and their trade has settled.
    
***"The relayer can assume all finality risk and fill the "user intent" on the destination chain as soon as they are confident the user's deposit transaction is valid."*** [Hart Lambur, UMA on X](https://x.com/hal2001/status/1723840414262980972?s=61&t=89lonhyCPh3uqGVQ52Sujg)

As the above quote expresses, relayer (arbitrageur in our case) takes the risk of filling (back-run) a user's order. We expect more risk-averse arbitrageurs to be slower to fill at the start of the order. This would either `pause` the trade when it pushes the trade out of the active tick zone or allow a risk-seeking arbitrageur to back-run sooner.
___

## Protocol Security

We have made thoughtful decisions on the design trade-offs given our customer base and underlying algorithm (CL + TWAMM) used to move assets across chains. Common MEV attacks are mitigated because the trade happens for deep liquidity tokens over a long time horizon. Also, because we don’t have a bridging token, infinite mint, double spend, malicious multi-sig, etc are not a concern either. 

💡 Note that the below attack vector is not unique to our design, and every bridging solution needs to resolve this issue.

***Standard Cross Chain Attack Vector***

```
1. trader deposits funds in secondary chain Y
2. trade executes on primary chain X
3. trader withdraws funds on chain X
```
> *TX #1 is invalidated, or chain Y goes down and loses TX: #1, funds for TX: #1 are reverted*

LPs have lost money because they have given money to the trader on chain X without receiving anything on chain Y! Additionally, our design has two inter-dependent TWAMMs spanning two blockchains, and non-atomic trade execution which introduces sequential transaction ordering dependencies.

### Internal Mitigations

Since our design depends on the liveness of potentially three chains (source: X, destination: Y, and settlement: ETH), lacks a `normalizing account of transfer` (bridging token), and can be used to transport large sums cross-chain, we have to take additional precautions against the loss of funds via re-org or finality risks. 

![Layer 2 Bridging Configurations-Queue Finalize.png](https://github.com/Cron-Finance/streaming-bridge/blob/main/assets/Layer%202%20Bridging%20Configurations-Queue%20Finalize.png)

We can simply add a delay (L1 Finality) before trade execution and thus ensure transactions/funds are settled before interacting with the protocol. Long-term traders are time-insensitive as TWAMMs are non-atomic and designed to move funds over time, so unaffected. Arbitrageurs can get around this issue by pre-loading their funds before the trade and have it ready for immediate execution. We also provide a `Trusted Party` for dedicated arbitrageurs to bypass the delay and immediately execute their transactions.

![TWAMM Bridge Schematic](https://github.com/Cron-Finance/streaming-bridge/blob/main/assets/Layer%202%20Bridging%20Configurations-Bridging%20TWAMM.png)

### External Mitigations

However, the L1 finality delay is a huge UX degradation for `organic` (retail, aggregator, etc) traffic intending to trade in the opposite direction of the long-term trader. It increases the barrier to entry, reliance on arbitrage to back-run trades, and potential for centralization while reducing the capital efficiency of the protocol. 

Building mitigations `in-protocol` has the drawback of adding latency, complexity, gas costs, and centralization amongst other issues. Solving this issue via economic and/or ZK would allow for near-instantaneous settlement of atomic transactions and lower price impact for non-atomic transactions.

#### *EigenLayer: Economic Security*

EigenLayer's Active Validation Service (AVS) gives us the most flexibility and control in the design space i.e. L2 support, latency, economic security, validator size, or slashing criteria. LPs can choose between `max short-term trade cap size` to `1/2 of the liquidity pool size` in economic security to give them the economic security for taking on the risk of near-instant execution of bridging value. Additionally, tools like [Hyperlane's ISM](https://twitter.com/Hyperlane_xyz/status/1733220047336944090) (interchain security model) have built-in support to leverage EigenLayer AVS for validating cross-chain messages.

https://github.com/Cron-Finance/streaming-bridge/assets/99218061/aef1e770-a663-47ef-b15a-00dfc00aacab

#### *ZK-Proofs: Trustless Security*

Although ZK-proofs can't guarantee re-org or censorship resistance, using them for ensuring deposits is a perfect add-on to the system. Higher fidelity of deposits reduces the risk for both EigenLayer validators and Arbitrageurs back-running the trade. As the cost of proving decreases, the latency of `atomic` bridging transactions via our design will decrease dramatically -- outcompeting off-chain designs. This creates a snowball effect that helps make the systems extremely capital-efficient and not solely reliant on arbitrageurs.
