#!/bin/bash

# TWAMM order interval in simulation is 5 minutes. TWAMM adds one interval to
# prevent div by 0, hence - 1 below:
let "minutesPerHour = 60"
let "minutesPerDay = 24 * $minutesPerHour"
let "minutesPerInterval = 5"
#
# SWITCH #######################################################################
# Duration of 1 full day:
# ----------------------------------------
let "durationIntervals = ($minutesPerDay / $minutesPerInterval) - 1"
#
# Duration of 1 full hour:
# ----------------------------------------
# let "durationIntervals = ($minutesPerHour / $minutesPerInterval) - 1"
################################################################################


# From Avg Dex Numbers in https://optimistic.grafana.net/public-dashboards/c84a5a9924fe4e14b270a42a8651ceb8
avgDexTrade="0.124"
twammGasCoef="1.5"
xChainGasCoef="2"
#
# SWITCH #######################################################################
# Simulate regular liquidity (not CL):
# ----------------------------------------
let "liquidity = 20000000"
arbCostUsd=`echo "$avgDexTrade * $twammGasCoef * $xChainGasCoef" | bc`
#
# Simulate concentrated liquidity with 200x multiplier and double gas
# ----------------------------------------
# for clFactor in 200 400 600 800 1000
# do
#   let "liquidity = 20000000 * $clFactor"
#   concLiquidityGasCoef="2"
#   arbCostUsd=`echo "$avgDexTrade * $twammGasCoef * $xChainGasCoef * $concLiquidityGasCoef" | bc`
  ################################################################################


  # Trade Size vs. Trade Cost: L2 USDC --> L2 USDC
  #
  export LIQUIDITY_USD="$liquidity"
  export DURATION_INTERVALS="$durationIntervals"
  export SWAP_FEE="0.0001"        # 0.01%
  export LT_SWAP_FEE="0.000025"   # 0.0025%
  export ARB_COST_USD="$arbCostUsd"
  export ARB_THRESHOLD_USD="1"

  let "iteration = 0"

  #for ltTradeAmtUsd in $(seq 5000000 5000000 50000000)
  # for ltTradeAmtUsd in $(seq 75000000 1000000 225000000)
  #for ltTradeAmtUsd in $(seq 5000000 5000000 125000000)
  for ltTradeAmtUsd in 100000000
  #for ltTradeAmtUsd in 50000000 100000000 150000000 200000000 250000000 300000000 350000000 400000000 450000000 500000000
  do
    export LT_TRADE_USD="$ltTradeAmtUsd"

    let "iteration++"
    echo "iteration $iteration:"
    echo "    LIQUIDITY_USD =          $LIQUIDITY_USD"
    echo "    LT_TRADE_USD =           $LT_TRADE_USD"
    echo "    DURATION_INTERVALS =     $DURATION_INTERVALS"
    echo "    SWAP_FEE =               $SWAP_FEE"
    echo "    LT_SWAP_FEE =            $LT_SWAP_FEE"
    echo "    ARB_COST_USD =           $ARB_COST_USD"
    echo "    ARB_THRESHOLD_USD =      $ARB_THRESHOLD_USD"
    
    npm run calculate 
  done

#   for ltTradeAmtUsd in $(seq 5000000 5000000 50000000)
#   do
#     export LT_TRADE_USD="$ltTradeAmtUsd"

#     let "iteration++"
#     echo "iteration $iteration:"
#     echo "    LIQUIDITY_USD =          $LIQUIDITY_USD"
#     echo "    LT_TRADE_USD =           $LT_TRADE_USD"
#     echo "    DURATION_INTERVALS =     $DURATION_INTERVALS"
#     echo "    SWAP_FEE =               $SWAP_FEE"
#     echo "    LT_SWAP_FEE =            $LT_SWAP_FEE"
#     echo "    ARB_COST_USD =           $ARB_COST_USD"
#     echo "    ARB_THRESHOLD_USD =      $ARB_THRESHOLD_USD"
    
#     npm run calculate 
#   done

#   for ltTradeAmtUsd in $(seq 60000000 10000000 100000000)
#   do
#     export LT_TRADE_USD="$ltTradeAmtUsd"

#     let "iteration++"
#     echo "iteration $iteration:"
#     echo "    LIQUIDITY_USD =          $LIQUIDITY_USD"
#     echo "    LT_TRADE_USD =           $LT_TRADE_USD"
#     echo "    DURATION_INTERVALS =     $DURATION_INTERVALS"
#     echo "    SWAP_FEE =               $SWAP_FEE"
#     echo "    LT_SWAP_FEE =            $LT_SWAP_FEE"
#     echo "    ARB_COST_USD =           $ARB_COST_USD"
#     echo "    ARB_THRESHOLD_USD =      $ARB_THRESHOLD_USD"
    
#     npm run calculate 
#   done

#   for ltTradeAmtUsd in $(seq 125000000 25000000 500000000)
#   do
#     export LT_TRADE_USD="$ltTradeAmtUsd"

#     let "iteration++"
#     echo "iteration $iteration:"
#     echo "    LIQUIDITY_USD =          $LIQUIDITY_USD"
#     echo "    LT_TRADE_USD =           $LT_TRADE_USD"
#     echo "    DURATION_INTERVALS =     $DURATION_INTERVALS"
#     echo "    SWAP_FEE =               $SWAP_FEE"
#     echo "    LT_SWAP_FEE =            $LT_SWAP_FEE"
#     echo "    ARB_COST_USD =           $ARB_COST_USD"
#     echo "    ARB_THRESHOLD_USD =      $ARB_THRESHOLD_USD"
    
#     npm run calculate 
#   done
# done