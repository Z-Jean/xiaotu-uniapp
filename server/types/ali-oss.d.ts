declare module 'ali-oss' {
  interface OSSOptions {
    region?: string
    accessKeyId?: string
    accessKeySecret?: string
    bucket?: string
    [key: string]: any
  }

  class OSS {
    constructor(options?: OSSOptions)
    put(name: string, file: string | Buffer | Blob, options?: any): Promise<{ url: string; name: string; [key: string]: any }>
    putStream(name: string, stream: any, options?: any): Promise<{ url: string; name: string; [key: string]: any }>
    generateSignatureUrl(name: string, options?: any): string
    [key: string]: any
  }

  export default OSS
}
