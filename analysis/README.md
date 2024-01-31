# Bridging-TWAMM-Simulations:
Simulations at various levels of abstraction for a Bridging TWAMM
* ./src/simulation.ts is incomplete and not yet supported.
* ./src/abstraction.ts is what has been used to generate the numbers in the ./simulations directory.

## To Run A Single Simulation
1. Edit the defaults for constants in ./src/abstraction.ts to specify the simulation parameters.
2. Ensure none of the envrionment variables that would prevent defaults specified in the previous step are defined (otherwise they'll override your settings).
3. npm run calculate

## To Run A Suite of Simulations
1. Edit the values in ./runSimSweep.sh to specify the simulation sweep.
2. npm run build
3. ./runSimSweep.sh
4. Results will appear in ./simulations/summary.csv
