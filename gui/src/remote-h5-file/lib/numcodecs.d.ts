declare module "numcodecs" {
  export class Blosc {
    decode: (data: ArrayBuffer) => Promise<ArrayBuffer>;
  }
}
