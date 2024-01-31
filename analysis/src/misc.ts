export class JSONBI {
  static stringify = (value: any, 
               replacer?: ((this: any, key: string, value: any) => any) | undefined | null,
               space?: string | number | undefined): string =>
  {
    return JSON.stringify(value, JSONBI._replacerBI, space)
  }
  
  static parse(text: string,
        reviver?: ((this: any, key: string, value: any) => any) | undefined): any
  {
    return JSON.parse(text, JSONBI._reviverBI)
  }

  private static _replacerBI = (key: string, value: any): string => 
  {
    if (typeof value === 'bigint') {
      return value.toString() + 'n'
    }
    return value
  }

  private static _reviverBI = (key: string, value: any): any =>
  {
    // Adapted from: https://dev.to/benlesh/bigint-and-json-stringify-json-parse-2m8p
    if (typeof value === "string" && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, value.length - 1));
    }
    return value
  }
}