/**
 * Utility for PNG metadata manipulation in the backend
 * Specifically for extracting tEXt chunks from PNG buffers
 */

/**
 * Extracts a tEXt chunk from a PNG buffer by key
 * @param buffer - The PNG buffer
 * @param key - The metadata key to look for
 * @returns The metadata value string or null if not found
 */
export function extractPngMetadata(buffer: Buffer, key: string): string | null {
    // Check PNG signature
    if (buffer.readUint32BE(0) !== 0x89504e47 || buffer.readUint32BE(4) !== 0x0d0a1a0a) {
        throw new Error('Invalid PNG signature');
    }

    let pos = 8; // Skip signature

    while (pos < buffer.length) {
        if (pos + 8 > buffer.length) break; // End of buffer

        const length = buffer.readUint32BE(pos);
        const type = buffer.readUint32BE(pos + 4);

        if (type === 0x74455874) { // tEXt
            if (pos + 8 + length > buffer.length) break;

            const data = buffer.subarray(pos + 8, pos + 8 + length);

            // tEXt format: key + null + value
            let nullPos = -1;
            for (let i = 0; i < data.length; i++) {
                if (data[i] === 0) {
                    nullPos = i;
                    break;
                }
            }

            if (nullPos !== -1) {
                const chunkKey = data.subarray(0, nullPos).toString('utf-8');
                if (chunkKey === key) {
                    return data.subarray(nullPos + 1).toString('utf-8');
                }
            }
        }

        if (type === 0x49454e44) break; // IEND
        pos += length + 12; // Length + Type + Data + CRC
    }

    return null;
}
