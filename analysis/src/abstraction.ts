// This abstraction is a simple model to evaluate potential throughput
// of a Bridging TWAMM between layer 2 chains.
//
// It creates a $1M trade over 15 minutes with a sales rate in $/second,
// assuming 2 second blocks.
//
// It is event driven, advancing each block to compute the current long
// term swap performance and arbitrage potential. If the arbitrage
// results meet a specified criteria, it performs a trade and updates
// state to allow the cycle to repeat. It captures aggregate performance
// data to show the overall performance of the trade for the given:
//   - pool liquidity
//   - trade size
//   - trade duration
//   - gas use
//   - gas price
//   - arbitrage criteria
//
import { BigNumber } from "bignumber.js"
import { createHash } from "crypto";
import fs from "fs";
import os from 'node:os';
import path from 'node:path';
import { JSONBI } from "./misc.js";

// See: https://github.com/MikeMcl/bignumber.js/
// - Increasing decimal places here will improve precision for operations such as division,
//   module, and sqrt. Setting to 18 for now to approximate Cron V1
BigNumber.set({
  DECIMAL_PLACES: 18,
  ROUNDING_MODE: BigNumber.ROUND_HALF_CEIL
})

// Data capture system:
//
const RESULTS_DIR = 'simulations/L2-USDT'
const RESULTS_SUMMARY_CSV = 'summary.csv'
//
const resultsPath = path.join(RESULTS_DIR)
const summaryFilePath = path.join(RESULTS_DIR, RESULTS_SUMMARY_CSV)
if (!fs.existsSync(resultsPath)) {
  fs.mkdirSync(resultsPath, {recursive: true})
}
//
//   Variable parameters:
//     - total liquidity
//     - lt trade size / amount
//     - lt trade duration
//     - lt trade swap fee
//     - arb cost
//     - arbitrage threshold
//     - arbitrage fee
//
const LIQUIDITY_USD = (process.env.LIQUIDITY_USD) ?
                      BigNumber(process.env.LIQUIDITY_USD) :
                      BigNumber(20_000_000)
let xUsdcReserve = LIQUIDITY_USD.div(2)
let yUsdcReserve = LIQUIDITY_USD.div(2)
//
const xAmount = (process.env.LT_TRADE_USD) ?
                BigNumber(process.env.LT_TRADE_USD) :
                BigNumber(1_000_000)
//
// TWAMM implicitly adds an interval for protection from div by 0.
// Each interval is 5 minutes.
const durationIntervals = (process.env.DURATION_INTERVALS) ?
                          BigNumber(process.env.DURATION_INTERVALS) :
                          BigNumber(2)
//
const fee = (process.env.SWAP_FEE) ?
            BigNumber(process.env.SWAP_FEE) :
            BigNumber(0.00005)   // .05%
const ltFee = (process.env.LT_SWAP_FEE) ?
              BigNumber(process.env.LT_SWAP_FEE) :
              BigNumber(0.0001)  // .1%
//
// Estimate the arbitrage gas cost (presently this is static and not
// considering EVO interval state write):
//
const estEvoGas = BigNumber(219806)     // Gas units sample from other sim: 
                                        // - avg = 41217033 / 216 = 190820 
                                        // - 219806
                                        // - 190358
                                        // - 184162
                                        // TODO: model evo state write

const usdPerEth = BigNumber(1879.75)    // $USD (from Coingecko)
const gweiPerGas = BigNumber(0.0837)    // Base fee in gwei (from https://optimistic.grafana.net/public-dashboards/c84a5a9924fe4e14b270a42a8651ceb8)
                   .plus(0.1080)        // Priority fee in gwei (fast)
const gweiPerEth = BigNumber(1e9)
const arbCostModelUsd = {
  estEvo: estEvoGas.times(gweiPerGas).times(usdPerEth).div(gweiPerEth),
  dexTrade: {
    high: BigNumber(0.237),
    avg: BigNumber(0.124),
    low: BigNumber(0.0728)
  }
}
const arbCost = (process.env.ARB_COST_USD) ?
                BigNumber(process.env.ARB_COST_USD) :
                (arbCostModelUsd.dexTrade.avg).times(1.5).times(2)    // Assume 1.5 x avg dex trade gas
//
const arbThresholdUsd = (process.env.ARB_THRESHOLD_USD) ?
                        BigNumber(process.env.ARB_THRESHOLD_USD) :
                        BigNumber(1)


// System:
//
const ZERO = BigNumber(0)
const blockLengthSec = BigNumber(2)
let blockNumber = ZERO
let blockTimeSec = ZERO


const toFixedDecimals = (value: BigNumber, decimals: number): BigNumber =>
{
  return BigNumber(value.toFixed(decimals))
}

const quadraticFormula = (a: BigNumber, b: BigNumber, c: BigNumber): { xPlus: BigNumber, xMinus: BigNumber } =>
{
  const sqrtTerm = (b.times(b).minus(BigNumber(4).times(a).times(c))).sqrt()
  const xPlus = ((b.negated()).plus(sqrtTerm)).div(BigNumber(2).times(a))
  const xMinus = ((b.negated()).minus(sqrtTerm)).div(BigNumber(2).times(a))
  return {
    xPlus,
    xMinus
  }
}

// Bridging TWAMM:
//
const xDecimals = 18 // 6
const yDecimals = 18 // 6
const blockIntervalSec = BigNumber(5).times(60)     // 5 minutes


// Trade:
//
let lastVirtualOrderTime = blockTimeSec
const lastExpiry = blockTimeSec.minus(blockTimeSec.mod(blockIntervalSec))
const orderExpiry = ((durationIntervals.plus(1)).times(blockIntervalSec)).plus(lastExpiry)
const orderLengthSec = orderExpiry.minus(lastExpiry)
const orderLengthBlocks = orderLengthSec.div(blockLengthSec)
const orderSalesRate = toFixedDecimals(xAmount.div(orderLengthSec), xDecimals)
const actualAmount = toFixedDecimals(orderSalesRate.times(orderLengthSec), xDecimals)


// Statistics aggregation
//
let stats = {
  yProceedsLT: ZERO,
  xFeesLT: ZERO,
  arbitrage: {
    swaps: ZERO,
    ySold: ZERO,
    xReceived: ZERO,
    yFees: ZERO,
    netProfitUsd: ZERO,
    gasUsd: ZERO
  }
}


// Simulate Trade:
////////////////////////////////////////////////////////////////////////////////
//
let ordersX = xAmount
let proceedsY = ZERO

let reportStr = ''
let lastArbReportStr = ''

console.log(`Pool Details:\n` +
            `---------------------------------------------------------------------------------\n` +
            `Reserve X-USDC: ${xUsdcReserve}\n` +
            `Reserve Y-USDC: ${yUsdcReserve}\n` +
            `LT Fee:         ${BigNumber(100).times(ltFee)} %\n` +
            `ST Fee:         ${BigNumber(100).times(fee)} %\n` +
            `Arb Threshold:  ${arbThresholdUsd} $USD\n` +
            `Arb Cost:       ${arbCost} $USD\n`)

console.log(`Trade Details:\n` +
            `---------------------------------------------------------------------------------\n` +
            `Specified Sell: ${xAmount} X-USDC\n` +
            `Actual Sell:    ${actualAmount} X-USDC\n` +
            `Duration:       ${orderLengthSec} seconds\n` +
            `Sales Rate:     ${orderSalesRate} X-USDC / second\n`)


// Report data
//
let reportData: any = {
  stFee: fee,
  ltfee: ltFee,
  arbThreshold: arbThresholdUsd,
  arbCost,
  initialLiquidityUsd: xUsdcReserve.plus(yUsdcReserve),
  finalLiquidityUsd: ZERO,
  ltSellSpecified: xAmount,
  ltSellActual: actualAmount,
  durationInt: durationIntervals,
  durationSec: orderLengthSec,
  salesRate: orderSalesRate,
  ltSold: ZERO,
  ltUnsold: ZERO,
  ltBought: ZERO,
  ltFeesPaid: ZERO,
  ltTradeCost: ZERO,
  arbs: ZERO,
  arbTotalSold: ZERO,
  arbTotalBought: ZERO,
  arbFees: ZERO,
  arbGas: ZERO,
  arbProfit: ZERO
}


for (;
     blockNumber.lte(orderLengthBlocks);
     blockNumber = blockNumber.plus(1)) {
  blockTimeSec = blockNumber.times(blockLengthSec)

  // Compute the amount of the LT trade up to the current block:
  //
  let k = xUsdcReserve.times(yUsdcReserve)
  const xSellAmount = toFixedDecimals(orderSalesRate.times((blockTimeSec.minus(lastVirtualOrderTime))), xDecimals)
  const xFeeAmount = toFixedDecimals(xSellAmount.times(ltFee), xDecimals)
  const xSellAmountLessFee = toFixedDecimals(xSellAmount.minus(xFeeAmount), xDecimals)
  let nextXUsdcReserve = xUsdcReserve.plus(xSellAmountLessFee)
  let nextYUsdcReserve = k.div(nextXUsdcReserve)
  const yBuyAmount = toFixedDecimals(yUsdcReserve.minus(nextYUsdcReserve), yDecimals)
  const effectivePrice = toFixedDecimals(xSellAmount.div(yBuyAmount), xDecimals)

  // Now add the fee to the LPs reserves and then compute
  // the pool price:
  nextXUsdcReserve = nextXUsdcReserve.plus(xFeeAmount)
  const poolPrice = toFixedDecimals(nextXUsdcReserve.div(nextYUsdcReserve), xDecimals)

  // Now compute the amount to arbitrage to maximize profit after the LT Swap
  // is virtually executed to the current block:
  //
  //   nextY = oldY + y * (1-fee)
  //   nextX = k / nextY
  //   x = oldX - nextX
  //     = oldX - (k / nextY)
  //     = oldX - (k / (oldY + y * (1-fee)))                       [1]
  //
  // Let m = 1 - fee:
  //   x = oldX - (k / (oldY + m * y))                             [2]
  //
  // Formulation for profit:
  //   p = x - y
  //     = (oldX - (k / (oldY + m * y))) - y
  //                        k
  //     = oldX - y - ------------
  //                  oldY + m * y
  //                oldY*y + m*y^2 + k
  //     = oldX - ( ------------------ )
  //                    oldY + m*y
  //                m*y^2 + oldY*y + k
  //     = oldX - ( ------------------ )                           [3]
  //                    oldY + m*y
  //
  // Maximize p by taking derivative wrt y and setting to zero in [3]:
  //   d          d            m*y^2 + oldY*y + k
  //  -- p = 0 = -- ( oldX - ( ------------------ )
  //  dy         dy                oldY + m*y
  //               (2*m*y + oldY)(oldY + m*y) - (m*y^2 + oldY*y + k)(m)
  //           = - ----------------------------------------------------
  //                              (oldY + m*y)^2
  //               2*oldY*m*y + 2*m*m*y*y + oldY*oldY + oldY*m*y - m*m*y*y - oldY*m*y - k*m
  //           = - ------------------------------------------------------------------------
  //                              oldY*oldY + oldY*m*y + oldY*m*y + m*m*y*y
  //               2*oldY*m*y + m*m*y*y + oldY*oldY - k*m
  //           = - --------------------------------------
  //                 oldY*oldY + 2*oldY*m*y + m*m*y*y
  //               m^2*y^2 + 2*oldY*m*y + oldY^2 - k*m
  //           = - -----------------------------------
  //                  m^2*y^2 + 2*oldY*m*y + oldY^2
  //           = - (m^2*y^2 + 2*oldY*m*y + oldY^2 - k*m)
  //           = m^2*y^2 + 2*oldY*m*y + oldY^2 - k*m              [4]
  //
  // Solve with quadratic formula:
  //   a = m^2
  //   b = 2*oldY*m
  //   c = oldY^2 - k*m
  //
  const m = BigNumber(1.0).minus(fee)
  const oldY = nextYUsdcReserve
  const oldX = nextXUsdcReserve
  k = oldX.times(oldY)
  const a = m.times(m)
  const b = BigNumber(2).times(oldY).times(m)
  const c = (oldY.times(oldY)).minus(k.times(m))
  const arbAmtsY = quadraticFormula(a, b, c)

  // Compute the arbitrage amount to maximize profit assuming like assets:
  //
  const ySellAmountArb = toFixedDecimals(BigNumber.max(arbAmtsY.xMinus, arbAmtsY.xPlus), yDecimals)

  reportStr = `Iteration Details:\n` +
              `---------------------------------------------------------------------------------\n` +
              `Block Number:      ${blockNumber}\n` +
              `Block Time:        ${blockTimeSec} seconds\n` +
              `Sell Amt:          ${xSellAmount} X-USDC\n` +
              `Fee Amt:           ${xFeeAmount} X-USDC\n` +
              `Sell Amt Aft Fee:  ${xSellAmountLessFee} X-USDC\n` +
              `Buy Amount:        ${yBuyAmount} Y-USDC\n` +
              `Purchase Price:    ${effectivePrice} X-USDC / Y-USDC\n` +
              `New Pool Price:    ${poolPrice} X-USDC / Y-USDC\n` +
              `- - - - - Arbitrage - - - - -\n`
  
  let arbReportStr = ''

  if (ySellAmountArb.gt(ZERO)) {
    // Now calculate the arbitrage profit and post-arbitrage price:
    //
    const yFeeAmountArb = toFixedDecimals(ySellAmountArb.times(fee), yDecimals)
    const ySellAmountArbLessFee = toFixedDecimals(ySellAmountArb.minus(yFeeAmountArb), yDecimals)
    nextYUsdcReserve = nextYUsdcReserve.plus(ySellAmountArbLessFee)
    nextXUsdcReserve = k.div(nextYUsdcReserve)
    const xBuyAmountArb = toFixedDecimals(oldX.minus(nextXUsdcReserve), xDecimals)
    const effectivePriceArb = toFixedDecimals(ySellAmountArb.minus(xBuyAmountArb), yDecimals)
    const grossProfit = toFixedDecimals(xBuyAmountArb.minus(ySellAmountArb), xDecimals)

    // Now add the fee to the LPs reserve and compute the new pool price:
    //
    nextYUsdcReserve = nextYUsdcReserve.plus(yFeeAmountArb)
    const poolPricePostArb = toFixedDecimals(nextXUsdcReserve.div(nextYUsdcReserve), xDecimals)

    // Now determine whether to arbitrage and reset lvot if needed:
    //
    const netProfit = grossProfit.minus(arbCost)
    if (netProfit.gt(arbThresholdUsd)) {
      // Update the statistics:
      //
      stats.yProceedsLT = stats.yProceedsLT.plus(yBuyAmount)
      stats.xFeesLT = stats.xFeesLT.plus(xFeeAmount)
      stats.arbitrage.swaps = stats.arbitrage.swaps.plus(BigNumber(1))
      stats.arbitrage.ySold = stats.arbitrage.ySold.plus(ySellAmountArb)
      stats.arbitrage.yFees = stats.arbitrage.yFees.plus(yFeeAmountArb)
      stats.arbitrage.xReceived = stats.arbitrage.xReceived.plus(xBuyAmountArb)
      stats.arbitrage.netProfitUsd = stats.arbitrage.netProfitUsd.plus(netProfit)
      stats.arbitrage.gasUsd = stats.arbitrage.gasUsd.plus(arbCost)

      // Update the model to compute numbers correctly next iteration:
      //
      lastVirtualOrderTime = blockTimeSec
      ordersX = ordersX.minus(xSellAmount)
      proceedsY = proceedsY.plus(yBuyAmount)
      xUsdcReserve = nextXUsdcReserve
      yUsdcReserve = nextYUsdcReserve

      // Generate the arbitrage report details:
      //
      arbReportStr = `Arbitrage Details:\n` +
                     `---------------------------------------------------------------------------------\n` +
                     `Block Number:      ${blockNumber}\n` +
                     `Block Time:        ${blockTimeSec} seconds\n` +
                     `ordersX:          ${ordersX} X-USDC\n` +
                     `proceedsY:        ${proceedsY} Y-USDC\n` +
                     `LT proceeds:      ${stats.yProceedsLT} Y-USDC\n` +
                     `Arbs:             ${stats.arbitrage.swaps}\n` +
                     `Arb total sold:   ${stats.arbitrage.ySold} Y-USDC\n` +
                     `Arb fees:         ${stats.arbitrage.yFees} Y-USDC\n` +
                     `Arb total bought: ${stats.arbitrage.xReceived} X-USDC\n` +
                     `Arb total profit: ${stats.arbitrage.netProfitUsd} X-USDC\n` +
                     `Arb total gas:    ${stats.arbitrage.gasUsd} USD\n`
      lastArbReportStr = arbReportStr
    } else if (blockNumber.eq(orderLengthBlocks)) {
      // Sell the remaining amount through the pool to execute virtual orders and get
      // the correct proceeds (found this issue when testing concentrated liquidity):
      //
      stats.yProceedsLT = stats.yProceedsLT.plus(yBuyAmount)
      stats.xFeesLT = stats.xFeesLT.plus(xFeeAmount)
      //
      lastVirtualOrderTime = blockTimeSec
      ordersX = ordersX.minus(xSellAmount)
      proceedsY = proceedsY.plus(yBuyAmount)
      xUsdcReserve = nextXUsdcReserve
      yUsdcReserve = nextYUsdcReserve
    }

    reportStr += `Arb+:              ${arbAmtsY.xPlus} Y-USDC\n` +
                 `Arb-:              ${arbAmtsY.xMinus} Y-USDC\n` +
                 `Sell Amt:          ${ySellAmountArb} Y-USDC\n` +
                 `Fee Amt:           ${yFeeAmountArb} Y-USDC\n` +
                 `Sell Amt Aft Fee:  ${ySellAmountArbLessFee} Y-USDC\n` +
                 `Buy Amount:        ${xBuyAmountArb} X-USDC\n` +
                 `Purchase Price     ${effectivePriceArb} Y-USDC / X-USDC\n` +
                 `Gross Profit       ${grossProfit} X-USDC\n` +
                 `Arb Cost           ${arbCost} $USD\n` +
                 `New Pool Price:    ${poolPricePostArb} X-USDC / Y-USDC\n`
  } else {
    reportStr += `No arbitrage profitable yet.\n`
  }

  // if (arbReportStr) {
  //   console.log(reportStr)
  //   console.log(arbReportStr)
  // }
}

const tradeCost = BigNumber(100).times(actualAmount.minus(proceedsY)).div(actualAmount)

reportData.finalLiquidityUsd = 0
reportData.ltSold = actualAmount
reportData.ltUnsold = ordersX
reportData.ltBought = proceedsY
reportData.ltFeesPaid = stats.xFeesLT
reportData.ltTradeCost = tradeCost
reportData.arbs = stats.arbitrage.swaps
reportData.arbTotalSold = stats.arbitrage.ySold
reportData.arbTotalBought = stats.arbitrage.xReceived
reportData.arbFees = stats.arbitrage.yFees
reportData.arbGas= stats.arbitrage.gasUsd
reportData.arbProfit = stats.arbitrage.netProfitUsd

// Get a unique name for the data report (results + configuration):
//
const hash = createHash('md5')
hash.update(JSONBI.stringify(reportData))
const dataId = hash.digest('hex')
reportData.dataId = dataId
//
if (!fs.existsSync(summaryFilePath)) {
  const csvHeader = Object.keys(reportData).join(", ") + os.EOL
  fs.writeFileSync(summaryFilePath, csvHeader, {flag: 'a'})
}
const csvData = Object.values(reportData).join(", ") + os.EOL
fs.writeFileSync(summaryFilePath, csvData, {flag: 'a'})

console.log(reportStr)
console.log(lastArbReportStr)
console.log(`Trade result\n` +
            `=================================================================================\n` +
            `Sold:         ${actualAmount} X-USDC\n` + 
            `  Remaining:  ${ordersX} X-USDC ${ordersX.lt(orderSalesRate) ? "✅" : "❌"}\n` +
            `Bought:       ${proceedsY} Y-USDC\n` +
            `Trade Cost:   ${tradeCost} %\n` +
            `Fees:         ${stats.xFeesLT}\n`)