import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getEnv } from '../../config/env.js';

export interface StorageUploadResult {
  storageKey: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  uploadPrivateFile(buffer: Buffer, mimeType: string, originalFilename: string): Promise<StorageUploadResult>;
  getPrivateFileBuffer(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  deletePrivateFile(storageKey: string): Promise<boolean>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private metadataMap: Map<string, { mimeType: string }> = new Map();

  constructor() {
    const env = getEnv();
    this.baseDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // ignore if exists
    }
  }

  async uploadPrivateFile(buffer: Buffer, mimeType: string, originalFilename: string): Promise<StorageUploadResult> {
    await this.ensureDirectory();
    const ext = path.extname(originalFilename) || '.bin';
    const storageKey = `doc_${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.baseDir, storageKey);

    await fs.writeFile(filePath, buffer);
    this.metadataMap.set(storageKey, { mimeType });

    return {
      storageKey,
      size: buffer.length,
      mimeType,
    };
  }

  private getMimeFromExtension(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.webp':
        return 'image/webp';
      case '.pdf':
        return 'application/pdf';
      case '.svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }

  async getPrivateFileBuffer(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const candidates = [
      path.join(this.baseDir, storageKey),
      path.resolve(process.cwd(), 'uploads/private', storageKey),
      path.resolve(process.cwd(), 'backend/uploads/private', storageKey),
      path.resolve(process.cwd(), '../backend/uploads/private', storageKey),
      path.resolve(process.cwd(), '../uploads/private', storageKey),
    ];

    for (const filePath of candidates) {
      try {
        const buffer = await fs.readFile(filePath);
        const meta = this.metadataMap.get(storageKey);
        const mimeType = meta?.mimeType || this.getMimeFromExtension(storageKey);
        return {
          buffer,
          mimeType,
        };
      } catch {
        // try next candidate path
      }
    }

    return null;
  }

  async deletePrivateFile(storageKey: string): Promise<boolean> {
    const candidates = [
      path.join(this.baseDir, storageKey),
      path.resolve(process.cwd(), 'uploads/private', storageKey),
      path.resolve(process.cwd(), 'backend/uploads/private', storageKey),
      path.resolve(process.cwd(), '../backend/uploads/private', storageKey),
    ];

    let deleted = false;
    for (const filePath of candidates) {
      try {
        await fs.unlink(filePath);
        deleted = true;
      } catch {
        // continue
      }
    }
    this.metadataMap.delete(storageKey);
    return deleted;
  }
}

let storageProviderInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageProviderInstance) {
    storageProviderInstance = new LocalStorageProvider();
  }
  return storageProviderInstance;
}

export function setStorageProvider(provider: StorageProvider): void {
  storageProviderInstance = provider;
}
