import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {pipeline} from 'stream/promises';

const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
    const ENCRYPT_KEY = process.env.ENCRYPT_KEY;
    if (!ENCRYPT_KEY) {
        throw new Error('ENCRYPT_KEY is required in environment variables');
    }
    return Buffer.from(ENCRYPT_KEY, 'hex');
}

export interface EncryptionResult {
    encryptedPath: string;
    iv: string;
}

/**
 * Encrypt a file using streaming to avoid loading entire file into memory
 */
export async function encryptFile(inputPath: string, outputPath: string): Promise<EncryptionResult> {
    const iv = crypto.randomBytes(16);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.promises.mkdir(outputDir, {recursive: true});

    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);

    // Write IV at the beginning of the encrypted file
    writeStream.write(iv);

    try {
        await pipeline(
            readStream,
            cipher,
            writeStream
        );

        return {
            encryptedPath: outputPath,
            iv: iv.toString('hex')
        };
    } catch (error) {
        // Clean up partial file on error
        try {
            await fs.promises.unlink(outputPath);
        } catch (unlinkError) {
            // Ignore unlink errors
        }
        throw error;
    }
}

/**
 * Decrypt a file using streaming to avoid loading entire file into memory
 */
export async function decryptFile(inputPath: string, outputPath: string): Promise<void> {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.promises.mkdir(outputDir, {recursive: true});

    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);

    // Read IV from the beginning of the encrypted file
    const ivBuffer = Buffer.alloc(16);
    const firstChunk = await new Promise<Buffer>((resolve, reject) => {
        readStream.once('data', (chunk: string | Buffer) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            if (buffer.length < 16) {
                reject(new Error('Invalid encrypted file: too short'));
                return;
            }
            buffer.copy(ivBuffer, 0, 0, 16);
            resolve(buffer.slice(16));
        });
        readStream.once('error', reject);
    });

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), ivBuffer);

    try {
        // Write the remaining data from first chunk
        if (firstChunk.length > 0) {
            writeStream.write(decipher.update(firstChunk));
        }

        await pipeline(
            readStream,
            decipher,
            writeStream
        );
    } catch (error) {
        // Clean up partial file on error
        try {
            await fs.promises.unlink(outputPath);
        } catch (unlinkError) {
            // Ignore unlink errors
        }
        throw error;
    }
}

/**
 * Create a decrypt stream for direct streaming to response
 */
export function createDecryptStream(inputPath: string): NodeJS.ReadableStream {
    const readStream = fs.createReadStream(inputPath);
    let iv: Buffer | null = null;
    let decipher: crypto.Decipheriv | null = null;

    const decryptStream = new (require('stream').Transform)({
        transform(chunk: Buffer, encoding: BufferEncoding, callback: Function) {
            try {
                if (!iv) {
                    // Extract IV from first chunk
                    if (chunk.length < 16) {
                        callback(new Error('Invalid encrypted file: too short'));
                        return;
                    }
                    iv = chunk.slice(0, 16);
                    decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

                    // Process remaining data from first chunk
                    const remainingData = chunk.slice(16);
                    if (remainingData.length > 0) {
                        const decrypted = decipher.update(remainingData);
                        callback(null, decrypted);
                    } else {
                        callback();
                    }
                } else if (decipher) {
                    const decrypted = decipher.update(chunk);
                    callback(null, decrypted);
                }
            } catch (error) {
                callback(error);
            }
        },

        flush(callback: Function) {
            try {
                if (decipher) {
                    const final = decipher.final();
                    callback(null, final);
                } else {
                    callback();
                }
            } catch (error) {
                callback(error);
            }
        }
    });

    return readStream.pipe(decryptStream);
}

/**
 * Generate a unique filename for encrypted files
 */
export function generateEncryptedFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');

    return `${baseName}_${timestamp}_${random}${ext}.enc`;
}