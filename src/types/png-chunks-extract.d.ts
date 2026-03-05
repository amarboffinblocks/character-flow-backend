declare module 'png-chunks-extract' {
  interface PngChunk {
    name: string;
    data: Uint8Array;
  }

  function extract(data: Buffer | Uint8Array): PngChunk[];
  export default extract;
}
