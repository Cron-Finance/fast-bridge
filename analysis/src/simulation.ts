class Token {
  constructor(_symbol: string,
              _description: string,
              _decimals: bigint)
  {
    this.symbol = _symbol
    this.description = _description
    this.decimals = _decimals
  }

  public symbol: string
  public description: string
  public decimals: bigint
}

class OrderPool {
  constructor()
  {
  }

  public orders: bigint
  public proceeds: bigint
  public salesrate: bigint
}

class Twamm {
  constructor()
  {
  }

  mint()
  {
  }

  burn()
  {
  }

  swap()
  {
  }

  ltswap()
  {
  }

  ltwithdraw()
  {
  }

  ltcancel()
  {
  }

  executeVirtualOrders()
  {
  }
}

const USDC_X = new Token('USDC-X', 'USDC on Chain X', 6n)
const USDC_Y = new Token('USDC-Y', 'USDC on Chain Y', 6n)