# Efficient Balance Sheet Management

## Problem

During times of volatility or high trading volumes, exchange (CEX) balance sheets become severely imbalanced. Assets are not available for trading, withdrawing, or margining, thus causing monetary and reputational damage.

<img width="942" alt="image" src="https://github.com/Cron-Finance/fast-bridge/assets/99218061/b02ad0c4-a28f-40f3-b6b2-52b813370494">

To resolve this issue, exchanges can move liquidity from cold wallet stores (***low float + high risk***), source external liquidity from trading desks at (***extremely high fees***), or bridge internal assets (***1-7 day delays***) parked in alternate blockchain eco-systems like ETH, Solana, Arbitrum, etc.

### Operational Complexity

All these potential routes involve a vast amount of ***operational complexity*** and costs. When sourcing liquidity from external sources, you’re forced to run a manual auction with a few select partners, which has very inefficient price discovery and overhead.
<img width="1085" alt="image" src="https://github.com/Cron-Finance/fast-bridge/assets/99218061/56eabb40-31f7-4843-b9b4-243ee1c71b8c">
*Source: DefiLlama CEX Transparency (Binance)*

Source: DefiLlama CEX Transparency (Binance)

Alternatively, bridging offers its own set of risk tradeoffs i.e. finality, re-org, bridge, validation, and time delays to name a few. Therefore, exchanges end up paying high fees for external liquidity instead of relying on nascent and slow bridging solutions.

## Solution

We offer a seamless on-chain enterprise-grade solution tailor-made to help exchanges re-balance their assets across different blockchains (L1s, L2s) on-demand at extremely efficiently (price, time) while having full control, transparency, and auditability.

![Bridge Time.png](https://github.com/Cron-Finance/fast-bridge/blob/main/assets/Bridge%20Time.png)

### Nuts & Bolts

- ***100% On-Chain & Composable***: the entire protocol lives on-chain and is composable with other protocols interested in bridging assets, arbitraging, or providing liquidity
- ***Gasless TWAP***: large orders are split into infinitesimal (order size / # of blocks) sub-orders and smoothly executed virtually over multiple blocks
- ***Transparent Execution***: a major benefit of an AMM-based design is the price discovery and transaction execution is fully on-chain and transparent.
- ***Extreme Capital Efficiency***: the combination of TWAMM (temporal) and concentrated liquidity (depth) offers unparalleled efficiency

<aside>
💡 The below animation showcases how the different parts of the design interplay to provide an extremely capital-efficient and highly secure bridge.

</aside>

https://github.com/Cron-Finance/fast-bridge/assets/99218061/ebb6792f-6d19-4370-b322-5df2339ccf63

### Advantages

- Low Risk: unlike other bridges that move assets in a single block, we leverage TWAMMs to ***stream infinitesimal pieces*** across chains thus reducing the risk of losses
- Minimal fees: instead of relying on a select few trading desks with poor discovery, the trades on our protocol attract a significantly larger audience of counter-parties thus drastically reducing the fees
- Extremely fast: early simulations of our design show that we can move `$100M of stablecoins in less than an hour with $20M liquidity and 1.5bps of slippage`
- Full Control: since the transaction executes over multiple blocks and transparently on-chain, the trader has time to react accordingly. A few key features:
    - Extend/Curtail: streams can be setup beforehand to respond to changing market dynamics rather than reacting suddenly during volatile market conditions
    - Pause: if the execution price is not satisfactory, the transaction can be paused till the market has digested the trading intent (i.e more liquidity or pool prices arbitraged)
    - Cancel: at any time during the transaction, the trader can cancel it and be refunded the un-bridged assets and bridged assets
    - Withdraw: as the transaction is streamed across chains, the trader can withdraw as soon as proceeds are available instead of waiting for the entire transaction to complete

## Risks

There are tradeoffs to be aware of when using a fully automated and on-chain protocol for executing large trades. We group them in the following three major categories:

### Smart Contract

- As with any software solution, there is potential for bugs in the system. However, in pre-production, the code will be audited by multiple reputed partners and battle-tested with trades.
- Additionally, due to the `extend` feature described above, the initial transaction size can be minimal (ex: $1M) and extended as many times as needed.

### Execution

- Unlike off-chain services like RFQ, OTC desks, and other opaque counterparties, the entire trade is executed on-chain and over multiple blocks (hours, days, weeks). This gives the trader (exchange) ample amount of time to react to price fills and take action (pause or cancel).
- Additionally, in extreme conditions (low liquidity or no arbitrage), the system has a built-in circuit breaker that pauses the trade on behalf of the trader — no liquidity ticks = paused trade

### Validation

- Given the complexity of transmitting and validating messages across different blockchains, we use a variety of solutions to mitigate risks.
- N of M validation: for routes between different L1s, we use Wormhole messaging that offers a set of well-known and reputable set (13 of 19 for quorum) validators to ensure messages are valid.
- Economic: for routes between Ethereum and rollups (OP, Arbitrum, Polygon), we use EigenLayer and re-staking powered validation to guarantee the validity of messaging.
- Redundant Full Node: additionally, for high-traffic routes, we plan on running independent full nodes to add redundancy and fault tolerance to our validation infrastructure
